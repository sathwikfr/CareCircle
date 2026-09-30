import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, ContactLine } from '@/components/LegalPage';
import { PLANS, FREE_TRIAL_DAYS } from '@/lib/plans';

export const metadata: Metadata = {
  title: 'Terms of Service — CareCircle',
  description: 'The rules for using CareCircle and Saathi AI check-in calls.'
};

/*
 * Plain-language draft. It is not legal advice: have a lawyer review it (especially the refund,
 * liability and governing-law clauses, which are business decisions) before launch.
 */
export default function TermsPage() {
  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  return (
    <LegalPage
      title="Terms of Service"
      intro="These are the ground rules for using CareCircle. By creating an account you agree to them and to our Privacy Policy."
    >
      <div className="callout">
        <b>CareCircle is not a medical or emergency service.</b> Saathi is an AI that checks in and passes information to
        you. It cannot examine anyone, give medical advice, or send help. In an emergency call <b>112</b>.
      </div>

      <h2>1. What CareCircle does</h2>
      <p>
        We phone the parent or relative you add, on the schedule you set, using an AI voice called Saathi. It asks whether
        medicines were taken and how they are feeling, then shows you the result and alerts you if something needs
        attention. Calls are made in the language you choose.
      </p>

      <h2>2. Who can use it</h2>
      <ul>
        <li>You must be at least 18 and able to enter a contract.</li>
        <li>
          You may add only someone who <b>knows about the calls and has agreed to them</b>. You confirm this when you add
          them, and you must stop the calls if they change their mind.
        </li>
        <li>Give us correct phone numbers. We are not responsible for calls that reach the wrong person because a number was wrong.</li>
      </ul>

      <h2>3. Please understand the limits</h2>
      <ul>
        <li>Calls can go unanswered, fail, or be blocked by the network or phone settings such as Do Not Disturb. We try again and tell you when we cannot reach your parent, but we cannot promise every call connects.</li>
        <li>The AI can mishear or misunderstand, especially on a poor line. Treat the summaries as helpful information, not as medical records or advice.</li>
        <li>Medicine lists read from a prescription photo are only a draft. You must check and confirm them, and we are not responsible for errors you did not correct.</li>
        <li>Never rely on CareCircle to notice an emergency. It is an extra pair of ears, not a replacement for a carer, doctor or emergency services.</li>
      </ul>

      <h2>4. Plans and payment</h2>
      <ul>
        <li>
          <b>{PLANS.free.name}:</b> {FREE_TRIAL_DAYS} days from when you sign up, one parent, one call a day, no card needed.
          When it ends the calls stop until you choose a plan. Your parent&apos;s details and history stay in your account.
        </li>
        <li>
          <b>{PLANS.family.name}:</b> {inr(PLANS.family.priceMonthly)} a month for up to {PLANS.family.parentsIncluded} parents
          and up to {PLANS.family.callsPerDay} calls a day each, with a {PLANS.family.trialDays}-day free trial.
        </li>
        <li>
          <b>{PLANS.extended.name}:</b> {inr(PLANS.extended.priceMonthly)} a month for up to {PLANS.extended.parentsIncluded} parents
          and up to {PLANS.extended.callsPerDay} calls a day each, with a {PLANS.extended.trialDays}-day free trial.
        </li>
        <li>Prices are in Indian rupees per month. Taxes such as GST are charged where they apply and shown at checkout.</li>
        <li>Paid plans renew monthly through Razorpay AutoPay. You will not be charged during a free trial if you cancel before it ends.</li>
        <li>You can cancel any time from the billing page. You keep access until the end of the period you have paid for, and we do not refund part-months unless the law requires it.</li>
        <li>We may change prices with at least 30 days&apos; notice. The change applies from your next renewal.</li>
      </ul>

      <h2>5. Using the service properly</h2>
      <p>
        Do not use CareCircle to harass anyone, to call people who have not agreed, to try to break or overload the service,
        or for anything unlawful. We may pause or close an account that does.
      </p>

      <h2>6. Our responsibility</h2>
      <p>
        We work hard to keep CareCircle reliable, but it is provided as is, and outages and errors can happen. To the fullest
        extent the law allows, we are not liable for indirect or consequential loss, or for harm arising from a missed,
        failed or misunderstood call. Nothing here limits any right you have under law that cannot be excluded, and our
        total liability for any claim is limited to what you paid us in the three months before it arose.
      </p>

      <h2>7. Ending your account</h2>
      <p>
        You can stop the calls, delete a parent profile, or close your account at any time. We may suspend or end the service
        if these terms are broken or the law requires it. Your data is handled as described in the{' '}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>8. Changes, law and contact</h2>
      <p>
        We may update these terms and will tell you about material changes before they apply; continuing to use CareCircle
        afterwards means you accept them. These terms are governed by the laws of India, and the courts of competent
        jurisdiction in India will decide disputes. Questions or complaints: write to <ContactLine />.
      </p>
    </LegalPage>
  );
}
