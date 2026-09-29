import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/access';
import { createSubscriptionServer, PaymentsUnavailableError } from '@/lib/razorpay';
import { PlanId } from '@/lib/types';
import { PLANS } from '@/lib/plans';

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  try {
    const { planId } = await req.json();

    if (!planId || !PLANS[planId as PlanId]) {
      return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 });
    }
    const plan = PLANS[planId as PlanId];
    if (plan.priceMonthly === 0) {
      return NextResponse.json({ error: 'Free plan does not require payment processing.' }, { status: 400 });
    }

    const subResult = await createSubscriptionServer(planId as PlanId, {
      userId: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || undefined
    });

    return NextResponse.json({
      success: true,
      subscriptionId: subResult.subscriptionId,
      keyId: subResult.keyId,
      planId: subResult.planId,
      amount: subResult.amount,
      currency: subResult.currency,
      isSandbox: subResult.isSandbox
    });
  } catch (err: unknown) {
    if (err instanceof PaymentsUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error('Create subscription error:', err);
    return NextResponse.json({ error: 'Failed to start checkout. Please try again.' }, { status: 500 });
  }
}
