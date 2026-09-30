import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, ContactLine } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy — CareCircle',
  description: 'What CareCircle collects, why, who helps us process it, and the choices you have.'
};

/*
 * Plain-language draft written from how the product actually works. It is not legal advice:
 * have a lawyer review it against India's Digital Personal Data Protection Act, 2023 before launch.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="CareCircle phones your parents for a short daily check-in and tells you how it went. That means we handle personal and health information, so we keep to what we need and explain it plainly."
    >
      <h2>1. Who is who</h2>
      <p>
        <b>You</b> are the family member who creates the account and adds a parent. <b>Your parent</b> receives the check-in
        calls. We ask you to confirm that your parent knows about the calls and agrees to them. CareCircle is the service that
        decides how this information is used.
      </p>

      <h2>2. What we collect</h2>
      <ul>
        <li><b>Your account:</b> name, email address, mobile number, password (stored only as a one-way hash), plan and billing status.</li>
        <li><b>About your parent:</b> name, relationship to you, phone number, preferred language, time zone, call times, and emergency contacts you add.</li>
        <li><b>Health details you give us:</b> medicine names, doses and timings, typed in or read from a prescription photo you upload.</li>
        <li><b>From the calls:</b> whether the call was answered, how long it lasted, which medicines your parent said they took, their mood, anything they asked us to tell you, a short summary, and a text transcript of the conversation.</li>
        <li><b>Alerts we raise:</b> for example a missed medicine, a health worry, or a possible emergency.</li>
        <li><b>Technical data:</b> the sign-in session and basic logs needed to keep the service secure.</li>
      </ul>
      <p>We do not sell personal data, and we do not use it for advertising.</p>

      <h2>3. Why we use it</h2>
      <ul>
        <li>To place the check-in calls, understand the answers, and show you the results.</li>
        <li>To alert you and the people you invite when something needs attention.</li>
        <li>To run your subscription, send receipts and account emails, and keep the service secure.</li>
        <li>To improve reliability, for example noticing that a call time never gets answered.</li>
      </ul>

      <h2>4. Who helps us process it</h2>
      <p>We use these providers only to run CareCircle. Each receives only what it needs:</p>
      <ul>
        <li><b>Sarvam AI</b> — places the voice calls, understands speech and produces the transcript and summary.</li>
        <li><b>Groq</b> — reads the medicines from a prescription photo you upload. The image is sent for reading and we do not keep the file; we keep only the medicine list you review and confirm.</li>
        <li><b>Supabase</b> — stores our database.</li>
        <li><b>Razorpay</b> — takes payments. We never see or store your card number, UPI PIN or CVV.</li>
        <li><b>Resend</b> — sends our emails.</li>
        <li><b>Vercel</b> — hosts the website.</li>
      </ul>
      <p>
        Some of these providers process data outside India. We choose providers that protect data appropriately, and we will
        update this page if that changes.
      </p>

      <h2>5. Health information and the AI voice</h2>
      <p>
        Saathi is an AI voice. It does not diagnose, give medical advice, or change any medicine. When your parent mentions
        something worrying, we tell you and suggest speaking to them or their doctor. If a call suggests a possible
        emergency, we alert you straight away, but CareCircle is not an emergency service. In an emergency call <b>112</b>.
      </p>

      <h2>6. How long we keep it</h2>
      <p>
        We keep your information while your account is open. When you delete a parent profile, their calls stop and the
        profile is archived; ask us and we will permanently erase it along with the call history. When you close your
        account, we erase your data except records we must keep by law, such as invoices.
      </p>

      <h2>7. Your choices and rights</h2>
      <p>You can ask us to:</p>
      <ul>
        <li>show you the information we hold about you or your parent;</li>
        <li>correct anything that is wrong;</li>
        <li>erase it, or stop the calls at any time (you can also pause calls from the dashboard);</li>
        <li>withdraw consent, and tell us if your parent no longer wants the calls.</li>
      </ul>
      <p>
        Write to <ContactLine />. You may also complain to the Data Protection Board of India if you think your data has been
        mishandled.
      </p>

      <h2>8. Security</h2>
      <p>
        Passwords are hashed, sessions can be revoked, connections use HTTPS, and only you can see your parents&apos; details.
        No system is perfectly secure, so please use a strong password and tell us at once if you think your account was
        accessed by someone else.
      </p>

      <h2>9. Children</h2>
      <p>CareCircle is for adults. We do not knowingly collect information from anyone under 18.</p>

      <h2>10. Changes and contact</h2>
      <p>
        If we change this policy in a way that matters, we will tell you by email or in the app before it takes effect. For
        questions or to exercise your rights, write to <ContactLine />. See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}
