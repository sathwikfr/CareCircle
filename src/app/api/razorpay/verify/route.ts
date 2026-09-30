import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/access';
import { invoiceNumberForPayment, verifySubscriptionPayment } from '@/lib/razorpay';
import { updateUserSubscription } from '@/lib/db';
import { PlanId } from '@/lib/types';
import { PLANS } from '@/lib/plans';
import { formatEmailDate, sendSubscriptionActivatedEmail } from '@/lib/email';
import { markEmailSent, sendOnce } from '@/lib/emailLog';

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, planId, paymentMethodBrand } = await req.json();

    if (!razorpay_payment_id || !razorpay_subscription_id) {
      return NextResponse.json({ error: 'Missing payment or subscription identifiers.' }, { status: 400 });
    }

    const plan = PLANS[planId as PlanId];
    if (!plan || plan.priceMonthly === 0) {
      return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
    }

    const verification = await verifySubscriptionPayment({
      paymentId: String(razorpay_payment_id),
      subscriptionId: String(razorpay_subscription_id),
      signature: String(razorpay_signature || ''),
      userId: user.id,
      planId: planId as PlanId
    });

    if (!verification.ok) {
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }

    const invoiceNumber = invoiceNumberForPayment(String(razorpay_payment_id));
    const updatedSub = await updateUserSubscription(user.id, {
      planId: planId as PlanId,
      razorpaySubscriptionId: String(razorpay_subscription_id),
      razorpayPaymentId: String(razorpay_payment_id),
      paymentMethodBrand: verification.isSandbox ? 'Sandbox (no charge)' : (paymentMethodBrand || 'Razorpay').toString().slice(0, 40),
      invoiceNumber
    });

    // Tell the customer their subscription is active. Awaited (not fire-and-forget) so a
    // serverless host can't cut the request off before the email is handed to Resend.
    const paymentMethod = verification.isSandbox ? 'Sandbox (no charge)' : 'Razorpay';
    const firstChargeDate = formatEmailDate(new Date(Date.now() + (plan.hasTrial ? plan.trialDays : 30) * 86400000));
    await sendOnce({ userId: user.id, kind: 'subscription_activated', refKey: String(razorpay_subscription_id), failOpen: true }, () =>
      sendSubscriptionActivatedEmail({
        to: user.email,
        name: user.name,
        planName: plan.name,
        monthlyAmount: plan.priceMonthly,
        paidToday: plan.hasTrial ? 0 : plan.priceMonthly,
        invoiceNumber,
        paymentMethod,
        trialDays: plan.hasTrial ? plan.trialDays : undefined,
        firstChargeDate,
        parentsIncluded: plan.parentsIncluded
      })
    );
    // Without a trial this payment is charged right now; the webhook must not send a second receipt for it.
    if (!plan.hasTrial) {
      await markEmailSent({ userId: user.id, kind: 'payment_receipt', refKey: String(razorpay_payment_id) });
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription verified and activated successfully.',
      subscription: updatedSub,
      receiptDetails: {
        paymentId: razorpay_payment_id,
        subscriptionId: razorpay_subscription_id,
        planName: plan.name,
        amount: plan.priceMonthly,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Verify payment error:', err);
    return NextResponse.json({ error: 'Server error during payment verification.' }, { status: 500 });
  }
}
