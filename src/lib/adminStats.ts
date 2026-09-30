import prisma from './prisma';
import { PLANS, freeTrialDaysLeft, getEffectivePlan } from './plans';
import { istDateString } from './ist';
import { TEST_EMAIL_PREFIX } from './adminEmail';
import { PlanId } from './types';

const DAY_MS = 86400000;
const CHART_DAYS = 14;
const CALL_WINDOW_DAYS = 30;
const CUSTOMER_LIMIT = 200;

// Read-only: nothing in this file writes to the database.
const realUser = { NOT: { email: { startsWith: TEST_EMAIL_PREFIX } } };

export type PlanBucket = 'free_active' | 'free_ended' | 'family' | 'extended';

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  planBucket: PlanBucket;
  planLabel: string;
  subscriptionStatus: string;
  trialDaysLeft: number | null;
  parents: number;
  calls7d: number;
  lastCallAt: string | null;
}

export interface AdminDay {
  date: string; // IST YYYY-MM-DD
  label: string;
  answered: number;
  notAnswered: number;
  pending: number;
  total: number;
}

export interface AdminAlert {
  id: string;
  level: number;
  title: string;
  parentName: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
}

export interface AdminStats {
  generatedAt: string;
  customers: { total: number; new7d: number; new30d: number };
  plans: {
    buckets: Record<PlanBucket, number>;
    payingActive: number;
    onPaidTrial: number;
    pastDue: number;
    cancelling: number;
    estimatedMrr: number;
  };
  parents: { active: number; paused: number; archived: number };
  calls: {
    today: number;
    last30: number;
    answered30: number;
    answerRatePct: number | null;
    byStatus30: Record<string, number>;
    days: AdminDay[];
  };
  customerList: AdminCustomer[];
  alerts: AdminAlert[];
}

function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function bucketFor(planId: PlanId, expired: boolean): PlanBucket {
  if (planId === 'family') return 'family';
  if (planId === 'extended') return 'extended';
  return expired ? 'free_ended' : 'free_active';
}

export async function getAdminStats(now: Date = new Date()): Promise<AdminStats> {
  const since30 = new Date(now.getTime() - CALL_WINDOW_DAYS * DAY_MS);

  const [users, calls, alertRows] = await Promise.all([
    prisma.user.findMany({
      where: realUser,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        subscription: { select: { planId: true, status: true, currentPeriodEnd: true, trialEndsAt: true } },
        parents: { select: { id: true, isDeleted: true, isPaused: true } }
      }
    }),
    prisma.callLog.findMany({
      where: { createdAt: { gte: since30 }, parent: { user: realUser } },
      select: { status: true, callDate: true, createdAt: true, parentId: true, parent: { select: { userId: true } } }
    }),
    prisma.alertRecord.findMany({
      where: { parent: { user: realUser } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        level: true,
        title: true,
        createdAt: true,
        parent: { select: { name: true, user: { select: { name: true, email: true } } } }
      }
    })
  ]);

  // ---- calls -------------------------------------------------------------
  const today = istDateString(now);
  const dayKeys: string[] = [];
  for (let i = CHART_DAYS - 1; i >= 0; i--) dayKeys.push(istDateString(new Date(now.getTime() - i * DAY_MS)));
  const days = new Map<string, AdminDay>(
    dayKeys.map((date) => [date, { date, label: dayLabel(date), answered: 0, notAnswered: 0, pending: 0, total: 0 }])
  );

  const byStatus30: Record<string, number> = {};
  const callsByUser7d = new Map<string, number>();
  const lastCallByUser = new Map<string, Date>();
  const since7 = istDateString(new Date(now.getTime() - 6 * DAY_MS));
  let callsToday = 0;
  let answered30 = 0;
  let finished30 = 0;

  for (const c of calls) {
    const date = c.callDate || istDateString(c.createdAt);
    byStatus30[c.status] = (byStatus30[c.status] || 0) + 1;
    if (c.status === 'answered') answered30++;
    if (['answered', 'unanswered', 'busy', 'failed'].includes(c.status)) finished30++;
    if (date === today) callsToday++;

    const day = days.get(date);
    if (day) {
      day.total++;
      if (c.status === 'answered') day.answered++;
      else if (['unanswered', 'busy', 'failed'].includes(c.status)) day.notAnswered++;
      else day.pending++;
    }

    const userId = c.parent.userId;
    if (date >= since7) callsByUser7d.set(userId, (callsByUser7d.get(userId) || 0) + 1);
    const prev = lastCallByUser.get(userId);
    if (!prev || c.createdAt > prev) lastCallByUser.set(userId, c.createdAt);
  }

  // ---- customers, plans, parents ----------------------------------------
  const buckets: Record<PlanBucket, number> = { free_active: 0, free_ended: 0, family: 0, extended: 0 };
  let payingActive = 0;
  let onPaidTrial = 0;
  let pastDue = 0;
  let cancelling = 0;
  let estimatedMrr = 0;
  const parents = { active: 0, paused: 0, archived: 0 };
  const customerList: AdminCustomer[] = [];

  for (const u of users) {
    const sub = u.subscription
      ? {
          planId: u.subscription.planId as PlanId,
          status: u.subscription.status,
          currentPeriodEnd: u.subscription.currentPeriodEnd.toISOString()
        }
      : null;
    const plan = getEffectivePlan(sub, u.createdAt, now);
    const bucket = bucketFor(plan.id, !!plan.expired);
    buckets[bucket]++;

    const status = plan.id === 'free' ? (plan.expired ? 'ended' : 'trial') : sub?.status || 'active';
    if (plan.id !== 'free') {
      if (status === 'active') {
        payingActive++;
        estimatedMrr += PLANS[plan.id].priceMonthly;
      } else if (status === 'trialing') onPaidTrial++;
      else if (status === 'past_due') pastDue++;
      else if (status === 'cancelled') cancelling++;
    }

    let trialDaysLeft: number | null = null;
    if (plan.id === 'free' && !plan.expired) trialDaysLeft = freeTrialDaysLeft(u.createdAt, now);
    else if (status === 'trialing' && u.subscription?.trialEndsAt) {
      trialDaysLeft = Math.max(0, Math.ceil((u.subscription.trialEndsAt.getTime() - now.getTime()) / DAY_MS));
    }

    const liveParents = u.parents.filter((p) => !p.isDeleted);
    for (const p of u.parents) {
      if (p.isDeleted) parents.archived++;
      else if (p.isPaused) parents.paused++;
      else parents.active++;
    }

    if (customerList.length < CUSTOMER_LIMIT) {
      customerList.push({
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt.toISOString(),
        planBucket: bucket,
        planLabel: plan.name,
        subscriptionStatus: status,
        trialDaysLeft,
        parents: liveParents.length,
        calls7d: callsByUser7d.get(u.id) || 0,
        lastCallAt: lastCallByUser.get(u.id)?.toISOString() || null
      });
    }
  }

  const ms7 = now.getTime() - 7 * DAY_MS;
  const ms30 = now.getTime() - 30 * DAY_MS;

  return {
    generatedAt: now.toISOString(),
    customers: {
      total: users.length,
      new7d: users.filter((u) => u.createdAt.getTime() >= ms7).length,
      new30d: users.filter((u) => u.createdAt.getTime() >= ms30).length
    },
    plans: { buckets, payingActive, onPaidTrial, pastDue, cancelling, estimatedMrr },
    parents,
    calls: {
      today: callsToday,
      last30: calls.length,
      answered30,
      answerRatePct: finished30 ? Math.round((answered30 / finished30) * 100) : null,
      byStatus30,
      days: dayKeys.map((k) => days.get(k)!)
    },
    customerList,
    alerts: alertRows.map((a) => ({
      id: a.id,
      level: a.level,
      title: a.title,
      parentName: a.parent.name,
      customerName: a.parent.user.name,
      customerEmail: a.parent.user.email,
      createdAt: a.createdAt.toISOString()
    }))
  };
}
