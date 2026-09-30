import { NextResponse } from 'next/server';
import {
  getRecentEmails,
  sendPasswordResetEmail,
  sendPaymentFailedEmail,
  sendPaymentReceiptEmail,
  sendSubscriptionActivatedEmail,
  sendSubscriptionCancelledEmail,
  sendSubscriptionStoppedEmail,
  sendTrialEmail,
  sendVerificationEmail,
  sendUrgentAlertEmail
} from '@/lib/email';

// Development-only tooling: the outbox contains password-reset links and the
// POST handler can email arbitrary addresses, so it must never be reachable
// outside `next dev`.
function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return null;
}

export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;
  const emails = getRecentEmails(30);
  const resendApiKeyConfigured = Boolean(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Aaptha <onboarding@resend.dev>';

  return NextResponse.json({
    status: 'ok',
    resendConfigured: resendApiKeyConfigured,
    fromEmail,
    outboxCount: emails.length,
    recentEmails: emails
  });
}

export async function POST(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  try {
    const { type, to = 'sathwik.fr@gmail.com' } = await req.json();

    let result;
    if (type === 'password_reset') {
      result = await sendPasswordResetEmail({
        to,
        name: 'Sathwik Rao',
        resetUrl: `http://localhost:3000/reset-password?token=rst_test_${Date.now()}&email=${encodeURIComponent(to)}`,
        expiresInMinutes: 20
      });
    } else if (type === 'verification') {
      result = await sendVerificationEmail({
        to,
        name: 'Sathwik Rao',
        verifyUrl: `http://localhost:3000/dashboard`
      });
    } else if (type === 'receipt') {
      result = await sendPaymentReceiptEmail({
        to,
        name: 'Sathwik Rao',
        planName: 'Family Care (Most Popular)',
        amount: 1299,
        invoiceNumber: `CC-2025-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
        nextBillingDate: 'Oct 27, 2026',
        paymentMethod: 'UPI AutoPay (HDFC)'
      });
    } else if (type === 'alert') {
      result = await sendUrgentAlertEmail({
        to,
        name: 'Sathwik Rao',
        parentName: 'Amma (Lakshmi Rao)',
        alertLevel: 'level_2',
        alertType: 'Missed Blood Pressure Medicine',
        summary: 'Amma mentioned feeling mild dizziness this morning and had not yet taken her prescribed Amlodipine 5mg dose.',
        actionUrl: `http://localhost:3000/dashboard`
      });
    } else if (type === 'activated') {
      result = await sendSubscriptionActivatedEmail({
        to, name: 'Sathwik Rao', planName: 'Family Care', monthlyAmount: 1299, paidToday: 0, invoiceNumber: 'CC-2026-A1B2C3',
        paymentMethod: 'UPI AutoPay', trialDays: 14, firstChargeDate: '14 Oct 2026', parentsIncluded: 2
      });
    } else if (type === 'payment_failed') {
      result = await sendPaymentFailedEmail({
        to, name: 'Sathwik Rao', planName: 'Family Care', amount: 1299, retryUrl: 'http://localhost:3000/account/billing'
      });
    } else if (type === 'stopped') {
      result = await sendSubscriptionStoppedEmail({ to, name: 'Sathwik Rao', planName: 'Family Care', amount: 1299 });
    } else if (type === 'cancelled') {
      result = await sendSubscriptionCancelledEmail({ to, name: 'Sathwik Rao', planName: 'Family Care', accessUntil: '14 Oct 2026' });
    } else if (type === 'trial_ending') {
      result = await sendTrialEmail({ variant: 'free_ending', to, name: 'Sathwik Rao', endsOn: new Date(Date.now() + 2 * 86400000) });
    } else if (type === 'trial_ended') {
      result = await sendTrialEmail({ variant: 'free_ended', to, name: 'Sathwik Rao', endedOn: new Date(Date.now() - 86400000) });
    } else if (type === 'paid_trial_ending') {
      result = await sendTrialEmail({ variant: 'paid_ending', to, name: 'Sathwik Rao', planName: 'Family Care', amount: 1299, chargeOn: new Date(Date.now() + 3 * 86400000) });
    } else {
      return NextResponse.json({ error: 'Unknown email test type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Test email (${type}) dispatched to ${to}`,
      result
    });
  } catch (err) {
    console.error('Test email error:', err);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}
