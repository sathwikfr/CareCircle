import { Plan, PlanId } from './types';

export const FREE_TRIAL_DAYS = 7;
const DAY_MS = 86400000;

/**
 * Pricing rationale (2026-09-30). Sarvam Voice Agents pricing is not published;
 * estimates: ~₹3/min all-in (worst case ₹5), ~2 min per call, ~2.4% payment fee.
 *   Family   ₹1,299: cost ₹540 typical / ₹1,080 at the 3-calls-a-day cap  -> ~56% / ~14% margin
 *   Extended ₹2,999: cost ₹1,350 typical / ₹2,700 at the cap               -> ~53% / ~8% margin
 * Going lower leaves no cushion at the cap.
 * Loses money only if Sarvam charges ~₹5/min AND every parent uses every call.
 * Free is a 7-day trial (about ₹40-60 of calls per user), not an open-ended plan: it would cost about ₹180 a month.
 * Re-check once Sarvam quotes real prices.
 * Changing a price also needs a new Razorpay plan (RAZORPAY_PLAN_ID_FAMILY / _EXTENDED).
 */
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free Trial',
    tagline: `${FREE_TRIAL_DAYS} days of daily check-in calls, no card needed`,
    priceMonthly: 0,
    currency: '₹',
    hasTrial: false,
    trialDays: 0,
    parentsIncluded: 1,
    callsPerDay: 1,
    expiresAfterDays: FREE_TRIAL_DAYS,
    features: [
      '1 parent',
      `1 check-in call a day for ${FREE_TRIAL_DAYS} days`,
      'Medicine confirmation on every call',
      'Call history on your dashboard',
      'Works on any phone, no app needed'
    ]
  },
  family: {
    id: 'family',
    name: 'Family Care',
    tagline: 'Check-ins for both parents, at the times that suit them',
    priceMonthly: 1299,
    currency: '₹',
    hasTrial: true,
    trialDays: 14,
    popular: true,
    parentsIncluded: 2,
    callsPerDay: 3,
    razorpayPlanId: 'plan_carecircle_family_1299',
    features: [
      'Up to 2 parents or elder relatives',
      'Up to 3 check-in calls a day per parent, timed to their medicines',
      '9 Indian languages, including Hindi, Tamil, Telugu and Bengali',
      'Medicine and mood trends on your dashboard',
      'Alerts when something needs your attention',
      'Pause calls anytime (travel, hospital stay)'
    ]
  },
  extended: {
    id: 'extended',
    name: 'Extended Family',
    tagline: 'For larger families caring for several elders',
    priceMonthly: 2999,
    currency: '₹',
    hasTrial: true,
    trialDays: 14,
    parentsIncluded: 5,
    callsPerDay: 3,
    razorpayPlanId: 'plan_carecircle_extended_2999',
    features: [
      'Up to 5 parents or elder relatives',
      'Everything in Family Care (up to 3 calls a day per parent)',
      'Invite siblings to share the care',
      'Priority support'
    ]
  }
};

export function getPlan(planId: string | null | undefined): Plan {
  if (planId === 'family' || planId === 'extended' || planId === 'free') {
    return PLANS[planId];
  }
  return PLANS.family; // Default to popular plan
}

/** When an account's free trial ends: FREE_TRIAL_DAYS after the account was created (it can't be restarted). */
export function freeTrialEnd(accountCreatedAt: string | Date): Date {
  return new Date(new Date(accountCreatedAt).getTime() + FREE_TRIAL_DAYS * DAY_MS);
}

/** Whole days left in the free trial (0 when over or when the date is unknown). */
export function freeTrialDaysLeft(accountCreatedAt: string | Date | undefined, now: Date = new Date()): number {
  if (!accountCreatedAt) return 0;
  return Math.max(0, Math.ceil((freeTrialEnd(accountCreatedAt).getTime() - now.getTime()) / DAY_MS));
}

function expiredFreePlan(): Plan {
  return {
    ...PLANS.free,
    name: 'Free trial ended',
    tagline: 'Choose a plan to restart the daily check-in calls',
    callsPerDay: 0,
    expired: true
  };
}

function freeTierPlan(accountCreatedAt: string | Date | undefined, now: Date): Plan {
  if (accountCreatedAt && now.getTime() > freeTrialEnd(accountCreatedAt).getTime()) return expiredFreePlan();
  return PLANS.free;
}

/**
 * The plan whose limits apply right now.
 *  - Free is a 7-day trial from account creation; afterwards no calls are placed (`expired`).
 *  - Cancelled subscriptions whose paid period has ended fall back to the free tier (usually expired).
 * Pass the account's createdAt so the trial window is known.
 */
export function getEffectivePlan(
  subscription?: { planId: PlanId; status: string; currentPeriodEnd: string } | null,
  accountCreatedAt?: string | Date,
  now: Date = new Date()
): Plan {
  if (!subscription) return freeTierPlan(accountCreatedAt, now);
  const periodOver = new Date(subscription.currentPeriodEnd).getTime() < now.getTime();
  if (subscription.planId === 'free') {
    return periodOver ? expiredFreePlan() : freeTierPlan(accountCreatedAt, now);
  }
  if (subscription.status === 'cancelled' && periodOver) return freeTierPlan(accountCreatedAt, now);
  return PLANS[subscription.planId] || freeTierPlan(accountCreatedAt, now);
}
