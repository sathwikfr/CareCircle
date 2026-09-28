import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createSubscriptionServer } from '@/lib/razorpay';
import { PlanId } from '@/lib/types';
import { PLANS } from '@/lib/plans';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { planId, customerEmail, customerName, customerPhone } = body;

    const user = await getSessionUser();
    const email = user?.email || customerEmail;
    const name = user?.name || customerName || 'Valued Caregiver';
    const phone = user?.phone || customerPhone;

    if (!email) {
      return NextResponse.json({ error: 'Customer email is required to initiate subscription.' }, { status: 400 });
    }

    if (!planId || !PLANS[planId as PlanId]) {
      return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 });
    }

    const plan = PLANS[planId as PlanId];
    if (plan.priceMonthly === 0) {
      return NextResponse.json({ error: 'Free plan does not require payment processing.' }, { status: 400 });
    }

    const subResult = await createSubscriptionServer(planId as PlanId, email, name, phone);

    return NextResponse.json({
      success: true,
      subscriptionId: subResult.subscriptionId,
      keyId: subResult.keyId,
      planId: subResult.planId,
      amount: subResult.amount,
      currency: subResult.currency,
      isSandbox: subResult.isSandbox,
      customer: {
        name,
        email,
        phone
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create subscription';
    console.error('Create subscription error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
