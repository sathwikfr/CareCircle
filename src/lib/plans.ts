import { Plan, PlanId } from './types';

/**
 * Pricing rationale (2026-09-30). Sarvam Voice Agents pricing is not published;
 * estimates: ~₹3/min all-in (worst case ₹5), ~2 min per call, ~2.4% payment fee.
 *   Family   ₹1,299: cost ₹540 typical / ₹1,080 at the 3-calls-a-day cap  -> ~56% / ~14% margin
 *   Extended ₹2,999: cost ₹1,350 typical / ₹2,700 at the cap               -> ~53% / ~8% margin
 * Going lower leaves no cushion at the cap.
 * Loses money only if Sarvam charges ~₹5/min AND every parent uses every call.
 * Free costs about ₹180 per user per month at 1 call/day. Re-check once Sarvam quotes real prices.
 * Changing a price also needs a new Razorpay plan (RAZORPAY_PLAN_ID_FAMILY / _EXTENDED).
 */
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free Starter',
    tagline: 'A daily check-in call for one parent',
    priceMonthly: 0,
    currency: '₹',
    hasTrial: false,
    trialDays: 0,
    parentsIncluded: 1,
    callsPerDay: 1,
    features: [
      '1 parent',
      '1 check-in call a day',
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

/**
 * The plan whose limits apply right now. Users without a subscription, and
 * cancelled subscriptions whose paid period has ended, fall back to Free.
 */
export function getEffectivePlan(subscription?: { planId: PlanId; status: string; currentPeriodEnd: string } | null): Plan {
  if (!subscription) return PLANS.free;
  const periodOver = new Date(subscription.currentPeriodEnd).getTime() < Date.now();
  if (subscription.status === 'cancelled' && periodOver) return PLANS.free;
  return PLANS[subscription.planId] || PLANS.free;
}
