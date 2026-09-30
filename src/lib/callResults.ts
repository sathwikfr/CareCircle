/**
 * Applies Sarvam's end-of-call webhook to the database: updates the CallLog,
 * schedules retries, and raises alerts. Safe to call twice for the same call
 * (Sarvam's webhook retry behaviour is undocumented).
 */
import { prisma } from './prisma';
import { istDateString, formatIstClock } from './ist';
import { LinkedMedicineDetail } from './types';
import {
  SarvamWebhookPayload,
  SARVAM_STATUSES,
  SarvamStatus,
  interpretCallResult,
  decideAlerts,
  parseTranscript
} from './callInterpretation';
import { raiseAlert, raiseUnreachableAlert, RaiseAlertResult, AlertDeps } from './alerts';
import { ALERT_TITLES } from './callInterpretation';

export const MAX_CALL_ATTEMPTS = 3;
export const RETRY_DELAY_MINUTES = 15;

/** Marker set when a call was given up on because no result ever arrived. */
export const RESULT_NOT_RECEIVED = 'result_not_received';

export type WebhookOutcome =
  | { status: 'processed'; callLogId: string; alertsRaised: number; retryAt: string | null }
  | { status: 'duplicate'; callLogId: string }
  | { status: 'unknown_attempt' }
  | { status: 'invalid'; reason: string };

/** The medicines asked about, stored on the CallLog when the call was placed. */
export function readMedicineSnapshot(resultJson: string | null): LinkedMedicineDetail[] {
  if (!resultJson) return [];
  try {
    const parsed = JSON.parse(resultJson);
    return Array.isArray(parsed?.medicines) ? parsed.medicines : [];
  } catch {
    return [];
  }
}

function metadataCallLogId(webhookConfig: unknown): string | null {
  if (!webhookConfig || typeof webhookConfig !== 'object') return null;
  const meta = (webhookConfig as Record<string, unknown>).metadata;
  if (!meta || typeof meta !== 'object') return null;
  const id = (meta as Record<string, unknown>).callLogId;
  return typeof id === 'string' && id ? id : null;
}

export async function processSarvamWebhook(
  payload: SarvamWebhookPayload,
  opts: { now?: Date; deps?: AlertDeps } = {}
): Promise<WebhookOutcome> {
  const now = opts.now || new Date();
  const deps = opts.deps || {};

  const attemptId = typeof payload.attempt_id === 'string' ? payload.attempt_id : '';
  const status = payload.status as SarvamStatus;
  if (!attemptId) return { status: 'invalid', reason: 'attempt_id is required' };
  if (!SARVAM_STATUSES.includes(status)) return { status: 'invalid', reason: 'unknown status' };

  let log = await prisma.callLog.findUnique({ where: { providerAttemptId: attemptId } });
  if (!log) {
    const fallbackId = metadataCallLogId(payload.webhook_config);
    if (fallbackId) {
      const byId = await prisma.callLog.findUnique({ where: { id: fallbackId } });
      if (byId && (!byId.providerAttemptId || byId.providerAttemptId === attemptId)) log = byId;
    }
  }
  if (!log) return { status: 'unknown_attempt' };

  // Atomic claim: only one delivery applies the result. A late result may
  // replace a call that was previously given up on as "no result received".
  const claimed = await prisma.callLog.updateMany({
    where: { id: log.id, OR: [{ processedAt: null }, { failureReason: RESULT_NOT_RECEIVED }] },
    data: { processedAt: now, providerAttemptId: attemptId }
  });
  if (claimed.count !== 1) return { status: 'duplicate', callLogId: log.id };

  const parent = await prisma.parentProfile.findUnique({ where: { id: log.parentId } });
  if (!parent) return { status: 'invalid', reason: 'parent not found' };

  const slotLabel = log.slot ? `${log.slot}` : 'check-in';
  const duration = typeof payload.duration === 'number' && payload.duration > 0 ? Math.round(payload.duration) : 0;
  const interactionId = typeof payload.interaction_id === 'string' ? payload.interaction_id : null;
  const failureReason =
    typeof payload.failure_reason === 'string' && payload.failure_reason.trim()
      ? payload.failure_reason.trim().slice(0, 300)
      : null;

  const alertResults: RaiseAlertResult[] = [];

  // ---------------------------------------------------------------- answered
  const connectedMedicines = status === 'connected' ? readMedicineSnapshot(log.resultJson) : [];
  const connectedInterp = status === 'connected' ? interpretCallResult(payload, connectedMedicines, parent.name) : null;
  // Picked up but never replied (the agent nudged and hung up): handled like an unanswered call below.
  const silentPickup = !!connectedInterp?.noResponse;

  if (status === 'connected' && connectedInterp && !silentPickup) {
    const medicines = connectedMedicines;
    const interp = connectedInterp;

    await prisma.callLog.update({
      where: { id: log.id },
      data: {
        status: 'answered',
        durationSeconds: duration,
        actualAnswerTime: formatIstClock(now),
        medicationConfirmed: interp.medicationConfirmed,
        mood: interp.mood,
        summary: interp.summary,
        notes: interp.feedback,
        interactionId,
        failureReason: null,
        nextRetryAt: null,
        endedAt: now,
        transcriptJson: interp.transcript.length ? JSON.stringify(interp.transcript) : null,
        resultJson: JSON.stringify({
          medicines,
          medicineResults: interp.medicineResults,
          healthConcern: interp.healthConcern,
          emergencyFlag: interp.emergencyFlag
        })
      }
    });

    for (const decision of decideAlerts(interp, parent.name, slotLabel)) {
      alertResults.push(await raiseAlert({ parentId: parent.id, callLogId: log.id, ...decision }, deps));
    }

    return {
      status: 'processed',
      callLogId: log.id,
      alertsRaised: alertResults.filter(r => r.created).length,
      retryAt: null
    };
  }

  // ------------------------------------------------------------------ failed
  if (status === 'failed') {
    await prisma.callLog.update({
      where: { id: log.id },
      data: {
        status: 'failed',
        durationSeconds: 0,
        interactionId,
        failureReason: failureReason || 'call_failed',
        nextRetryAt: null,
        endedAt: now,
        summary: `The ${slotLabel} call could not be placed${failureReason ? ` (${failureReason})` : ''}.`
      }
    });
    alertResults.push(await raiseUnreachableAlert(
      { id: log.id, parentId: parent.id, attemptNumber: log.attemptNumber, slot: log.slot },
      parent.name,
      'failed',
      failureReason,
      deps
    ));
    return { status: 'processed', callLogId: log.id, alertsRaised: alertResults.filter(r => r.created).length, retryAt: null };
  }

  // ------------------------------------------------- no answer / busy: retry
  const finalStatus = status === 'busy' ? 'busy' : 'unanswered';
  const sameDay = log.callDate === istDateString(now);
  const parentCallable = !parent.isDeleted && !parent.isPaused;
  const canRetry = !!log.slotId && sameDay && parentCallable && log.attemptNumber < MAX_CALL_ATTEMPTS;
  const retryAt = canRetry ? new Date(now.getTime() + RETRY_DELAY_MINUTES * 60000) : null;

  await prisma.callLog.update({
    where: { id: log.id },
    data: {
      status: finalStatus,
      durationSeconds: silentPickup ? duration : 0,
      interactionId,
      failureReason: silentPickup ? 'no_response' : failureReason,
      nextRetryAt: retryAt,
      endedAt: now,
      summary: silentPickup
        ? `${parent.name} picked up the ${slotLabel} call but did not reply.${retryAt ? ' We will try again shortly.' : ''}`
        : `${parent.name} did not pick up the ${slotLabel} call (${finalStatus === 'busy' ? 'line busy' : 'no answer'}).${retryAt ? ' We will try again shortly.' : ''}`
    }
  });

  if (!retryAt) {
    alertResults.push(await raiseUnreachableAlert(
      { id: log.id, parentId: parent.id, attemptNumber: log.attemptNumber, slot: log.slot },
      parent.name,
      status === 'busy' ? 'busy' : 'no_answer',
      failureReason,
      deps
    ));
  }

  return {
    status: 'processed',
    callLogId: log.id,
    alertsRaised: alertResults.filter(r => r.created).length,
    retryAt: retryAt ? retryAt.toISOString() : null
  };
}

/**
 * Called by the agent's mid-call "escalate" tool when the parent describes an
 * emergency. Raises the level-4 alert immediately (the end-of-call result will
 * not duplicate it: alerts are unique per call and title).
 */
export async function raiseToolEscalation(
  callLogId: string,
  reason: string,
  deps: AlertDeps = {}
): Promise<{ status: 'raised' | 'already_raised' | 'unknown_call' }> {
  const log = await prisma.callLog.findUnique({ where: { id: callLogId } });
  if (!log) return { status: 'unknown_call' };

  const parent = await prisma.parentProfile.findUnique({ where: { id: log.parentId } });
  if (!parent) return { status: 'unknown_call' };

  const cleanReason = reason.replace(/\s+/g, ' ').trim().slice(0, 300);
  const res = await raiseAlert(
    {
      parentId: parent.id,
      callLogId: log.id,
      level: 4,
      title: ALERT_TITLES.emergency,
      message: `During a check-in call, ${parent.name} may have described an emergency${cleanReason ? `: "${cleanReason}"` : ''}. Please call ${parent.name} right away, and contact their doctor or emergency services if needed.`
    },
    deps
  );
  return { status: res.created ? 'raised' : 'already_raised' };
}

export { parseTranscript };
