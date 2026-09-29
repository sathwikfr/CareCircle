import { NextResponse } from 'next/server';
import { getRecentEmails, sendPasswordResetEmail, sendPaymentReceiptEmail, sendVerificationEmail, sendUrgentAlertEmail } from '@/lib/email';

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
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'CareCircle <onboarding@resend.dev>';

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
        amount: 1499,
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
