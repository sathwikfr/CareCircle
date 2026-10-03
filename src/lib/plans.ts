import { Plan, PlanId } from './types';

export const FREE_TRIAL_DAYS = 7;
const DAY_MS = 86400000;

/**
 * Pricing rationale (2026-10-01, from real Sarvam bills): ₹4.50/min agent + ₹0.40/min telephony = ₹4.90/min,
 * billed per started minute. Calls last ~25 s, so ~₹4.90 per call (voicemail pickups cost the same).
 * Costs below add 10% for retries/voicemail/long calls and take off the ~2.4% payment fee (GST not included).
 *   Solo     ₹799:   ₹323 at 2 calls/day / ₹485 at the 3-calls-a-day cap -> ~57% / ~37% margin
 *   Family   ₹1,299: ₹647 at 2 calls/day / ₹970 at the cap                -> ~48% / ~23% margin
 *   Extended ₹3,499: ₹1,617 at 2 calls/day / ₹2,426 at the cap            -> ~51% / ~28% margin
 * (Extended was ₹2,999: only ~17% at the cap.) Target: ~50% at typical use, 20%+ at the cap.
 * Free is a 7-day trial (about ₹35-50 of calls per user), not an open-ended plan.
 * Changing a price also needs a new Razorpay plan (RAZORPAY_PLAN_ID_SOLO / _FAMILY / _EXTENDED).
 */
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free Trial',
    // Since 2026-10-03 a parent can only be added on a paid plan (its 7-day trial needs AutoPay set up
    // first). Accounts that already added a parent on this plan keep their calls until day 7.
    tagline: `Choose a plan to start your ${FREE_TRIAL_DAYS}-day free trial`,
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
  solo: {
    id: 'solo',
    name: 'Solo Care',
    tagline: 'Daily check-ins for one parent, timed to their medicines',
    priceMonthly: 799,
    currency: '₹',
    hasTrial: true,
    trialDays: 7,
    parentsIncluded: 1,
    callsPerDay: 3,
    razorpayPlanId: 'plan_carecircle_solo_799',
    features: [
      '1 parent or elder relative',
      'Up to 3 check-in calls a day, timed to their medicines',
      '9 Indian languages, including Hindi, Tamil, Telugu and Bengali',
      'Medicine and mood trends on your dashboard',
      'Alerts when something needs your attention',
      'Pause calls anytime (travel, hospital stay)'
    ]
  },
  family: {
    id: 'family',
    name: 'Family Care',
    tagline: 'Check-ins for both parents, at the times that suit them',
    priceMonthly: 1299,
    currency: '₹',
    hasTrial: true,
    trialDays: 7,
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
      'Pause calls anytime (travel, hospital stay)',
      'Invite 1 sibling to share the care'
    ]
  },
  extended: {
    id: 'extended',
    name: 'Extended Family',
    tagline: 'For larger families caring for several elders',
    priceMonthly: 3499,
    currency: '₹',
    hasTrial: true,
    trialDays: 7,
    parentsIncluded: 5,
    callsPerDay: 3,
    razorpayPlanId: 'plan_carecircle_extended_3499',
    features: [
      'Up to 5 parents or elder relatives',
      'Everything in Family Care (up to 3 calls a day per parent)',
      'Invite up to 3 siblings to share the care',
      'Priority support'
    ]
  }
};

export function getPlan(planId: string | null | undefined): Plan {
  if (planId === 'solo' || planId === 'family' || planId === 'extended' || planId === 'free') {
    return PLANS[planId];
  }
  return PLANS.family; // Default to popular plan
}

/**
 * Adding a parent needs payment details on file: a paid plan (trialing counts, its AutoPay is set up).
 * Free / ended-trial accounts are sent to checkout first.
 */
export function canAddParents(plan: Plan): boolean {
  return plan.priceMonthly > 0 && !plan.expired;
}

/** Cheapest paid plan that covers this many parents (null when none does). */
export function smallestPlanFor(parentCount: number): Plan | null {
  return (['solo', 'family', 'extended'] as PlanId[]).map(id => PLANS[id]).find(p => p.parentsIncluded >= parentCount) || null;
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
