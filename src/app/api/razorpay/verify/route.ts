import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { verifySubscriptionSignatureServer } from '@/lib/razorpay';
import { updateUserSubscription, getUserByEmail } from '@/lib/db';
import { PlanId } from '@/lib/types';
import { PLANS } from '@/lib/plans';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      planId,
      customerEmail,
      paymentMethodBrand,
      paymentMethodLast4
    } = body;

    if (!razorpay_payment_id || !razorpay_subscription_id) {
      return NextResponse.json(
        { error: 'Missing payment or subscription identifiers.' },
        { status: 400 }
      );
    }

    if (!planId || !PLANS[planId as PlanId]) {
      return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
    }

    // Server-side cryptographic signature check
    const isValid = verifySubscriptionSignatureServer(
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature || ''
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid payment signature. Verification failed.' },
        { status: 400 }
      );
    }

    // Determine target user (from authenticated session or lookup by email)
    const sessionUser = await getSessionUser();
    let targetUserId = sessionUser?.id;

    if (!targetUserId && customerEmail) {
      const existing = await getUserByEmail(customerEmail);
      if (existing) {
        targetUserId = existing.id;
      }
    }

    let updatedSub = null;
    if (targetUserId) {
      updatedSub = await updateUserSubscription(targetUserId, {
        planId: planId as PlanId,
        razorpaySubscriptionId: razorpay_subscription_id,
        razorpayPaymentId: razorpay_payment_id,
        paymentMethodBrand: paymentMethodBrand || 'UPI AutoPay',
        paymentMethodLast4: paymentMethodLast4 || '4242'
      });

      // Dispatch Payment Receipt Email
      const emailToNotify = sessionUser?.email || customerEmail;
      if (emailToNotify) {
        const { sendPaymentReceiptEmail } = await import('@/lib/email');
        const plan = PLANS[planId as PlanId];
        const nextMonth = new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
        sendPaymentReceiptEmail({
          to: emailToNotify,
          name: sessionUser?.name || 'Caregiver',
          planName: plan.name,
          amount: plan.priceMonthly,
          invoiceNumber: `CC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
          nextBillingDate: nextMonth,
          paymentMethod: paymentMethodBrand || 'UPI AutoPay'
        }).catch(err => console.error('[Razorpay Verify] Failed to dispatch receipt email:', err));
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription verified and activated successfully.',
      subscription: updatedSub,
      receiptDetails: {
        paymentId: razorpay_payment_id,
        subscriptionId: razorpay_subscription_id,
        planName: PLANS[planId as PlanId].name,
        amount: PLANS[planId as PlanId].priceMonthly,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Verify payment error:', err);
    return NextResponse.json({ error: 'Server error during payment verification.' }, { status: 500 });
  }
}
