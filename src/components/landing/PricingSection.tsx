import React from 'react';
import Link from 'next/link';
import { Check, Users, PhoneCall, Sparkles, BadgeIndianRupee } from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { WordReveal } from '@/components/motion/WordReveal';
import { PLANS, FREE_TRIAL_DAYS } from '@/lib/plans';
import { PlanId } from '@/lib/types';
import s from './home.module.css';
import x from './pricing.module.css';

/**
 * Plans. Each card leads with what differs between plans (how many parents,
 * calls a day, a rough daily cost); what every plan shares is listed once
 * under the cards instead of being repeated three times. Prices, limits and
 * trial lengths all come from lib/plans.ts.
 */

const PAID: PlanId[] = ['solo', 'family', 'extended'];

/** What every paid plan includes (shown once, under the cards). */
const EVERY_PLAN = [
  'Works on any phone, even a landline',
  '9 Indian languages',
  'Medicine and mood trends on your dashboard',
  'Alerts when something needs you',
  'Pause anytime (travel, hospital stay)',
  'Cancel anytime',
];

/** Features that differ between plans beyond parents and calls: sibling invites, support (from lib/plans.ts). */
const extrasFor = (id: PlanId) => PLANS[id].features.filter((f) => /sibling|support/i.test(f));

/** Rough cost of a day: per parent when the plan covers several. */
function perDay(id: PlanId) {
  const p = PLANS[id];
  const day = Math.round(p.priceMonthly / 30 / p.parentsIncluded);
  return p.parentsIncluded > 1 ? `From ₹${day} a day per parent` : `About ₹${day} a day`;
}

export function PricingSection({ planHref }: { planHref: (id: PlanId) => string }) {
  return (
    <section id="plans" className="section">
      <div className="wrap">
        <Reveal className={s.head}>
          <span className={s.pill}><BadgeIndianRupee size={14} /> Pricing</span>
          <WordReveal>Simple plans. <span className={s.grad}>Cancel anytime.</span></WordReveal>
          <p>Every plan starts with {FREE_TRIAL_DAYS} days free. Set up AutoPay to begin; nothing is charged until the trial ends, and you can cancel any time.</p>
        </Reveal>

        <div className={x.plans}>
          {PAID.map((id, i) => {
            const plan = PLANS[id];
            const featured = !!plan.popular;
            const many = plan.parentsIncluded > 1;
            return (
              <Reveal key={id} delay={i * 100} className={`${x.plan} ${featured ? x.featured : ''}`}>
                {featured && <span className={x.badge}><Sparkles size={12} /> Most popular</span>}
                <h3>{plan.name}</h3>
                <p className={x.tagline}>{plan.tagline}</p>

                <div className={x.price}>
                  <b>₹{plan.priceMonthly.toLocaleString('en-IN')}</b>
                  <span>/ month</span>
                </div>
                <p className={x.perDay}>{perDay(id)}</p>

                <ul className={x.facts}>
                  <li><span className={x.factIcon}><Users size={15} /></span>{many ? `Up to ${plan.parentsIncluded} parents` : '1 parent'}</li>
                  <li><span className={x.factIcon}><PhoneCall size={15} /></span>Up to {plan.callsPerDay} calls a day{many ? ' each' : ''}</li>
                  {extrasFor(id).map((f) => (
                    <li key={f}><span className={x.factIcon}><Check size={15} /></span>{f}</li>
                  ))}
                </ul>

                <Link href={planHref(id)} className={`btn btn-block ${featured ? 'btn-primary' : 'btn-ghost'} ${x.cta}`}>
                  Start {plan.trialDays}-day free trial
                </Link>
              </Reveal>
            );
          })}
        </div>

        <Reveal className={x.every}>
          <span className={x.everyTitle}>Every plan includes</span>
          <ul>
            {EVERY_PLAN.map((f) => (
              <li key={f}><Check size={15} strokeWidth={2.5} /> {f}</li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
