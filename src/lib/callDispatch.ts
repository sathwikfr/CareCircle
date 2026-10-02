/**
 * Call dispatcher: decides which Saathi calls are due and places them through
 * Sarvam. Driven by an external cron hitting /api/cron/dispatch every ~5 minutes.
 *
 * Guarantees:
 *  - A call is only placed after its CallLog row is created; a unique index on
 *    (parent, slot, IST date, attempt) makes double-dialling impossible, even
 *    with overlapping cron runs.
 *  - Nothing happens (and nothing is logged) when Sarvam isn't configured.
 *  - Each plan's calls-per-day cap applies, controlling call cost.
 */
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { newId } from './db';
import { getEffectivePlan } from './plans';
import { normalizePhone } from './phone';
import { generateMedicineCheckinQuestion } from './scheduleGenerator';
import { istDateString, istMinutesOfDay, isSlotDue, parseClockTime } from './ist';
import { SarvamConfig, getSarvamConfig, createOutboundCall, SarvamApiError, OutboundCallInput } from './sarvam';
import { LinkedMedicineDetail, PlanId } from './types';
import { MAX_CALL_ATTEMPTS, RETRY_DELAY_MINUTES, RESULT_NOT_RECEIVED } from './callResults';
import { raiseUnreachableAlert, AlertDeps } from './alerts';

/** A slot stays "due" for this long after its scheduled time (covers cron gaps and outages). */
export const DUE_WINDOW_MINUTES = 90;
/** A call with no end-of-call result after this long is closed as "result not received". */
export const STALE_PLACED_MINUTES = 45;

export interface DispatchDeps {
  now?: Date;
  fetchImpl?: typeof fetch;
  config?: SarvamConfig | null;
  alertDeps?: AlertDeps;
  /** Restrict the run to these parents (used by tests so they never touch real data). */
  parentIds?: string[];
}

export interface DispatchSummary {
  configured: boolean;
  parentsChecked: number;
  placed: number;
  retried: number;
  failedToPlace: number;
  alreadyCalled: number;
  cappedByPlan: number;
  staleClosed: number;
  autoResumed: number;
  errors: string[];
}

interface SlotRow {
  id: string;
  slot: string;
  time: string;
  label: string;
  linkedMedicineNames: string[];
  linkedMedicinesJson: string | null;
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/** Medicines Saathi should ask about on this slot (skips ones the family has since paused). */
export function slotMedicines(slot: SlotRow, inactiveNames: Set<string>): LinkedMedicineDetail[] {
  let linked: LinkedMedicineDetail[] = [];
  if (slot.linkedMedicinesJson) {
    try {
      const parsed = JSON.parse(slot.linkedMedicinesJson);
      if (Array.isArray(parsed)) linked = parsed;
    } catch {
      linked = [];
    }
  }
  if (linked.length === 0) {
    linked = (slot.linkedMedicineNames || []).map(name => ({
      name,
      foodRelation: 'not_specified' as const,
      questionScript: generateMedicineCheckinQuestion(name, 'not_specified', slot.slot)
    }));
  }
  return linked.filter(m => !inactiveNames.has(m.name));
}

interface ParentForCall {
  id: string;
  name: string;
  phone: string;
  language: string;
  relationship: string;
  user: { name: string };
}

interface ClaimData {
  parentId: string;
  slotId: string | null;
  slot: string;
  callDate: string;
  attemptNumber: number;
  medicines: LinkedMedicineDetail[];
  now: Date;
}

/** Creates the CallLog that reserves this attempt; null when another run already holds it. */
async function claimAttempt(data: ClaimData) {
  // Cheap check first so the routine "already called today" case doesn't hit the
  // unique index (and log a database error) on every cron run. The index stays
  // as the backstop against two runs racing each other.
  if (data.slotId) {
    const existing = await prisma.callLog.findFirst({
      where: { parentId: data.parentId, slotId: data.slotId, callDate: data.callDate, attemptNumber: data.attemptNumber },
      select: { id: true }
    });
    if (existing) return null;
  }
  try {
    return await prisma.callLog.create({
      data: {
        id: newId('call'),
        parentId: data.parentId,
        slotId: data.slotId,
        slot: data.slot,
        callDate: data.callDate,
        attemptNumber: data.attemptNumber,
        scheduledTime: data.now.toISOString(),
        status: 'scheduled',
        durationSeconds: 0,
        medicationConfirmed: false,
        mood: 'neutral',
        summary: 'Call is being placed.',
        // Snapshot of what Saathi is asked to check, so the result can be matched later.
        resultJson: JSON.stringify({ medicines: data.medicines })
      }
    });
  } catch (err) {
    if (isUniqueViolation(err)) return null;
    throw err;
  }
}

/** 'provider_account' = our own Sarvam account can't place calls (bad key, no access, out of credits). */
type PlaceOutcome = 'placed' | 'failed' | 'provider_account';

/**
 * Sarvam refused because of OUR account, not the parent's phone: 401/403 = key or access,
 * 402 = Payment Required (credits used up). Retrying or alerting the family won't help.
 */
function isProviderAccountProblem(httpStatus: number | undefined): boolean {
  return httpStatus === 401 || httpStatus === 402 || httpStatus === 403;
}

async function placeClaimedCall(
  cfg: SarvamConfig,
  log: { id: string; parentId: string; slotId: string | null; slot: string | null; attemptNumber: number },
  parent: ParentForCall,
  slotLabel: string,
  medicines: LinkedMedicineDetail[],
  deps: DispatchDeps,
  now: Date,
  summary: DispatchSummary
): Promise<PlaceOutcome> {
  const input: OutboundCallInput = {
    callLogId: log.id,
    parentId: parent.id,
    slotId: log.slotId,
    slot: log.slot || 'check-in',
    slotLabel,
    parentName: parent.name,
    parentPhone: parent.phone,
    language: parent.language,
    caregiverName: parent.user.name,
    relationship: parent.relationship,
    medicines
  };

  try {
    const { attemptId } = await createOutboundCall(cfg, input, deps.fetchImpl);
    await prisma.callLog.update({
      where: { id: log.id },
      data: { status: 'placed', providerAttemptId: attemptId, startedAt: now, summary: 'Call placed. Waiting for the result.' }
    });
    return 'placed';
  } catch (err) {
    const httpStatus = err instanceof SarvamApiError ? err.status : undefined;
    const message = err instanceof Error ? err.message : 'unknown error';
    const configProblem = isProviderAccountProblem(httpStatus);
    if (configProblem) {
      console.error(
        httpStatus === 402
          ? '[calls] Sarvam returned 402 Payment Required: the Sarvam account is out of credits. Top up in the Sarvam dashboard; no calls can be placed until then.'
          : `[calls] Sarvam returned ${httpStatus}: check SARVAM_API_KEY and the agent/workspace ids. No calls can be placed until this is fixed.`
      );
    }
    const retryable = !configProblem && (httpStatus === undefined || httpStatus >= 500 || httpStatus === 429);
    const canRetry = retryable && !!log.slotId && log.attemptNumber < MAX_CALL_ATTEMPTS;
    const retryAt = canRetry ? new Date(now.getTime() + RETRY_DELAY_MINUTES * 60000) : null;

    await prisma.callLog.update({
      where: { id: log.id },
      data: {
        status: 'failed',
        failureReason: `api_error: ${message}`.slice(0, 300),
        processedAt: now,
        endedAt: now,
        nextRetryAt: retryAt,
        summary: retryAt ? 'The call could not be placed. We will retry shortly.' : 'The call could not be placed.'
      }
    });
    summary.failedToPlace += 1;
    summary.errors.push(`${parent.id}: ${message}`);

    // Only scheduled calls alert the family; a failed test call is just reported back to the user.
    if (!retryAt && !configProblem && log.slotId) {
      await raiseUnreachableAlert(
        { id: log.id, parentId: parent.id, attemptNumber: log.attemptNumber, slot: log.slot },
        parent.name,
        'failed',
        'the calling service was unavailable',
        deps.alertDeps
      );
    }
    return configProblem ? 'provider_account' : 'failed';
  }
}

/** Places every call that is due right now, plus retries. */
export async function runDispatch(deps: DispatchDeps = {}): Promise<DispatchSummary> {
  const now = deps.now || new Date();
  const cfg = deps.config !== undefined ? deps.config : getSarvamConfig();
  const summary: DispatchSummary = {
    configured: !!cfg,
    parentsChecked: 0,
    placed: 0,
    retried: 0,
    failedToPlace: 0,
    alreadyCalled: 0,
    cappedByPlan: 0,
    staleClosed: 0,
    autoResumed: 0,
    errors: []
  };
  if (!cfg) return summary;

  const today = istDateString(now);

  // 1. Close calls whose result never arrived.
  const scope = deps.parentIds ? { in: deps.parentIds } : undefined;
  const stale = await prisma.callLog.updateMany({
    where: {
      ...(scope ? { parentId: scope } : {}),
      status: 'placed',
      processedAt: null,
      startedAt: { lt: new Date(now.getTime() - STALE_PLACED_MINUTES * 60000) }
    },
    data: {
      status: 'failed',
      failureReason: RESULT_NOT_RECEIVED,
      processedAt: now,
      endedAt: now,
      summary: 'No result was received from the calling service for this call.'
    }
  });
  summary.staleClosed = stale.count;

  // 2. Scheduled slots that are due.
  const parents = await prisma.parentProfile.findMany({
    where: { isDeleted: false, consentGiven: true, ...(scope ? { id: scope } : {}) },
    include: {
      callSchedule: { where: { isActive: true } },
      medicines: true,
      user: { include: { subscription: true } }
    }
  });

  for (const parent of parents) {
    summary.parentsChecked += 1;
    try {
      if (parent.isPaused) {
        if (parent.pauseUntil && parent.pauseUntil.getTime() <= now.getTime()) {
          await prisma.parentProfile.update({
            where: { id: parent.id },
            data: { isPaused: false, pauseReason: null, pauseUntil: null }
          });
          summary.autoResumed += 1;
        } else {
          continue;
        }
      }

      const phone = normalizePhone(parent.phone);
      if (!phone.ok) continue;

      const sub = parent.user.subscription;
      const plan = getEffectivePlan(
        sub ? { planId: sub.planId as PlanId, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd.toISOString() } : null,
        parent.user.createdAt,
        now
      );
      if (plan.expired) continue; // free trial over: no calls until a plan is chosen

      const slots = [...parent.callSchedule]
        .filter(s => parseClockTime(s.time) !== null)
        .sort((a, b) => (parseClockTime(a.time) as number) - (parseClockTime(b.time) as number));
      if (slots.length > plan.callsPerDay) summary.cappedByPlan += slots.length - plan.callsPerDay;

      const inactiveNames = new Set(parent.medicines.filter(m => !m.isActive).map(m => m.name));
      const createdToday = istDateString(parent.createdAt) === today;
      const createdMinutes = istMinutesOfDay(parent.createdAt);

      for (const slot of slots.slice(0, plan.callsPerDay)) {
        if (!isSlotDue(slot.time, now, DUE_WINDOW_MINUTES)) continue;
        // A newly added parent is first called the next day, not about a slot that already passed.
        if (createdToday && (parseClockTime(slot.time) as number) <= createdMinutes) continue;

        const medicines = slotMedicines(slot, inactiveNames);
        const log = await claimAttempt({
          parentId: parent.id,
          slotId: slot.id,
          slot: slot.slot,
          callDate: today,
          attemptNumber: 1,
          medicines,
          now
        });
        if (!log) {
          summary.alreadyCalled += 1;
          continue;
        }
        const outcome = await placeClaimedCall(
          cfg, log, { ...parent, phone: phone.e164, user: parent.user }, slot.label, medicines, deps, now, summary
        );
        if (outcome === 'placed') summary.placed += 1;
      }
    } catch (err) {
      summary.errors.push(`${parent.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 3. Retries for unanswered / busy / temporarily failed calls (same IST day only).
  const retries = await prisma.callLog.findMany({
    where: {
      ...(scope ? { parentId: scope } : {}),
      nextRetryAt: { lte: now },
      callDate: today,
      attemptNumber: { lt: MAX_CALL_ATTEMPTS },
      slotId: { not: null }
    },
    orderBy: { nextRetryAt: 'asc' },
    take: 100
  });

  for (const prev of retries) {
    try {
      // Claim the retry so overlapping runs cannot both pick it up.
      const claimedRetry = await prisma.callLog.updateMany({
        where: { id: prev.id, nextRetryAt: { not: null } },
        data: { nextRetryAt: null }
      });
      if (claimedRetry.count !== 1) continue;

      const parent = await prisma.parentProfile.findUnique({
        where: { id: prev.parentId },
        include: { callSchedule: true, medicines: true, user: true }
      });
      if (!parent || parent.isDeleted || parent.isPaused) continue;
      const phone = normalizePhone(parent.phone);
      if (!phone.ok) continue;

      const slot = parent.callSchedule.find(s => s.id === prev.slotId && s.isActive);
      const inactiveNames = new Set(parent.medicines.filter(m => !m.isActive).map(m => m.name));
      const medicines = slot ? slotMedicines(slot, inactiveNames) : [];

      const log = await claimAttempt({
        parentId: parent.id,
        slotId: prev.slotId,
        slot: prev.slot || 'check-in',
        callDate: today,
        attemptNumber: prev.attemptNumber + 1,
        medicines,
        now
      });
      if (!log) continue;

      const outcome = await placeClaimedCall(
        cfg, log, { ...parent, phone: phone.e164 }, slot?.label || prev.slot || 'check-in', medicines, deps, now, summary
      );
      if (outcome === 'placed') summary.retried += 1;
    } catch (err) {
      summary.errors.push(`retry ${prev.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;
}

export type ManualCallResult =
  | { ok: true; callLogId: string; attemptId: string }
  | { ok: false; status: number; code: string; error: string };

const MAX_MANUAL_PER_HOUR = 2;
const MAX_MANUAL_PER_DAY = 5;

/**
 * A call requested by the parent's owner ("test call" / "call now"). Never
 * retried, and rate-limited because every call costs money.
 */
export async function placeManualCall(
  input: { parentId: string; ownerId: string; kind: 'test' | 'manual'; slotType?: string },
  deps: DispatchDeps = {}
): Promise<ManualCallResult> {
  const cfg = deps.config !== undefined ? deps.config : getSarvamConfig();
  if (!cfg) {
    return {
      ok: false,
      status: 503,
      code: 'CALLING_NOT_CONNECTED',
      error: 'Saathi voice calling is being connected. No call was placed yet — test calls will be enabled as soon as it is live.'
    };
  }
  const now = deps.now || new Date();

  const parent = await prisma.parentProfile.findUnique({
    where: { id: input.parentId },
    include: { callSchedule: { where: { isActive: true } }, medicines: true, user: { include: { subscription: true } } }
  });
  if (!parent || parent.isDeleted || parent.userId !== input.ownerId) {
    return { ok: false, status: 404, code: 'NOT_FOUND', error: 'Parent profile not found.' };
  }
  const sub = parent.user.subscription;
  const plan = getEffectivePlan(
    sub ? { planId: sub.planId as PlanId, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd.toISOString() } : null,
    parent.user.createdAt,
    now
  );
  if (plan.expired) {
    return { ok: false, status: 402, code: 'TRIAL_ENDED', error: 'Your free trial has ended. Choose a plan to place calls again.' };
  }
  if (!parent.consentGiven) {
    return { ok: false, status: 409, code: 'NO_CONSENT', error: 'Parent consent is required before calls can be placed.' };
  }
  if (parent.isPaused) {
    return { ok: false, status: 409, code: 'PAUSED', error: 'Calls are paused for this parent. Resume calls first.' };
  }
  const phone = normalizePhone(parent.phone);
  if (!phone.ok) {
    return { ok: false, status: 422, code: 'BAD_PHONE', error: phone.reason };
  }

  const hourAgo = new Date(now.getTime() - 60 * 60000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60000);
  // Attempts Sarvam refused (no attempt id, the phone never rang) don't use up the limit.
  const manualCalls = {
    parentId: parent.id,
    slot: { in: ['test', 'manual'] },
    NOT: { status: 'failed', providerAttemptId: null }
  };
  const [lastHour, lastDay] = await Promise.all([
    prisma.callLog.count({ where: { ...manualCalls, createdAt: { gte: hourAgo } } }),
    prisma.callLog.count({ where: { ...manualCalls, createdAt: { gte: dayAgo } } })
  ]);
  if (lastHour >= MAX_MANUAL_PER_HOUR || lastDay >= MAX_MANUAL_PER_DAY) {
    return {
      ok: false,
      status: 429,
      code: 'RATE_LIMITED',
      error: 'Too many test calls to this number recently. Please try again later.'
    };
  }

  const slots = [...parent.callSchedule]
    .filter(s => parseClockTime(s.time) !== null)
    .sort((a, b) => (parseClockTime(a.time) as number) - (parseClockTime(b.time) as number));
  const chosen =
    (input.slotType ? slots.find(s => s.slot === input.slotType) : undefined) ||
    slots.find(s => s.linkedMedicineNames.length > 0) ||
    slots[0];

  const inactiveNames = new Set(parent.medicines.filter(m => !m.isActive).map(m => m.name));
  const medicines = chosen ? slotMedicines(chosen, inactiveNames) : [];

  const log = await claimAttempt({
    parentId: parent.id,
    slotId: null,
    slot: input.kind,
    callDate: istDateString(now),
    attemptNumber: 1,
    medicines,
    now
  });
  if (!log) {
    return { ok: false, status: 409, code: 'DUPLICATE', error: 'A call is already being placed.' };
  }

  const summary: DispatchSummary = {
    configured: true, parentsChecked: 1, placed: 0, retried: 0, failedToPlace: 0,
    alreadyCalled: 0, cappedByPlan: 0, staleClosed: 0, autoResumed: 0, errors: []
  };
  const outcome = await placeClaimedCall(
    cfg, log, { ...parent, phone: phone.e164 }, chosen?.label || 'check-in', medicines, deps, now, summary
  );
  if (outcome === 'provider_account') {
    return {
      ok: false,
      status: 503,
      code: 'CALLING_UNAVAILABLE',
      error: "Saathi can't place calls right now because of a problem on our side. No call was made. Please try again later."
    };
  }
  if (outcome === 'failed') {
    return { ok: false, status: 502, code: 'PLACE_FAILED', error: 'The call could not be placed. Please try again in a few minutes.' };
  }

  const placed = await prisma.callLog.findUnique({ where: { id: log.id } });
  return { ok: true, callLogId: log.id, attemptId: placed?.providerAttemptId || '' };
}
