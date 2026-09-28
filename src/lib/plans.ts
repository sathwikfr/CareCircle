import { Plan, PlanId } from './types';

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free Starter',
    tagline: 'Essential peace of mind for one parent',
    priceMonthly: 0,
    currency: '₹',
    hasTrial: false,
    trialDays: 0,
    parentsIncluded: 1,
    features: [
      '1 parent profile',
      '1 daily medicine reminder call',
      'Basic SMS alerts for missed check-ins',
      'Missed medication warnings to family',
      'Standard telephone calling (no app needed)'
    ]
  },
  family: {
    id: 'family',
    name: 'Family Care',
    tagline: 'Complete holistic check-ins for both parents',
    priceMonthly: 399,
    currency: '₹',
    hasTrial: true,
    trialDays: 14,
    popular: true,
    parentsIncluded: 2,
    razorpayPlanId: 'plan_carecircle_family_399',
    features: [
      'Up to 2 parents / elder relatives',
      'Natural conversational voice check-ins',
      'Regional Indian language support (Hindi, Tamil, Telugu, Kannada, Bengali, etc.)',
      'Weekly health & mood trend reports',
      'Instant WhatsApp caregiver notifications & summaries',
      'Custom call timings (morning, evening, bedtime)'
    ]
  },
  extended: {
    id: 'extended',
    name: 'Extended Family',
    tagline: 'For large or multi-generational households',
    priceMonthly: 699,
    currency: '₹',
    hasTrial: true,
    trialDays: 14,
    parentsIncluded: 5,
    razorpayPlanId: 'plan_carecircle_extended_699',
    features: [
      'Up to 5 parents / elder relatives',
      'Everything included in Family Care',
      'Multiple siblings & caregivers notified concurrently',
      'Priority emergency response escalation',
      'Dedicated relationship concierge',
      'Doctor appointment reminder coordination'
    ]
  }
};

export function getPlan(planId: string | null | undefined): Plan {
  if (planId === 'family' || planId === 'extended' || planId === 'free') {
    return PLANS[planId];
  }
  return PLANS.family; // Default to popular plan
}
