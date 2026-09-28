import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getUserInvoices,
  cancelSubscription,
  reactivateSubscription,
  updateUserSubscription
} from '@/lib/db';
import { PlanId } from '@/lib/types';
import { PLANS } from '@/lib/plans';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const invoices = getUserInvoices(user.id);
  const currentPlan = user.subscription?.planId ? PLANS[user.subscription.planId] : null;

  return NextResponse.json({
    user,
    subscription: user.subscription || null,
    currentPlan,
    invoices
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, newPlanId, reason } = await req.json();

    if (action === 'cancel') {
      const ok = cancelSubscription(user.id);
      console.log(`User ${user.id} cancelled subscription. Reason: ${reason || 'Not specified'}`);

      // Dispatch Cancellation Email
      if (user.email) {
        const { sendSubscriptionCancelledEmail } = await import('@/lib/email');
        const planName = user.subscription?.planId ? PLANS[user.subscription.planId].name : 'Family Care';
        const accessUntil = user.subscription?.currentPeriodEnd
          ? new Date(user.subscription.currentPeriodEnd).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'the end of your current cycle';

        sendSubscriptionCancelledEmail({
          to: user.email,
          name: user.name,
          planName,
          accessUntil
        }).catch(err => console.error('[Billing] Failed to dispatch cancellation email:', err));
      }

      return NextResponse.json({
        success: ok,
        message: 'Your subscription has been scheduled to cancel at the end of your billing cycle. Amma & Appa’s calls will continue uninterrupted until then.'
      });
    }

    if (action === 'reactivate') {
      const ok = reactivateSubscription(user.id);
      return NextResponse.json({
        success: ok,
        message: 'Your subscription has been successfully reactivated.'
      });
    }

    if (action === 'switch-plan') {
      if (!newPlanId || !PLANS[newPlanId as PlanId]) {
        return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
      }

      const updated = updateUserSubscription(user.id, {
        planId: newPlanId as PlanId,
        paymentMethodBrand: user.subscription?.paymentMethodBrand || 'UPI AutoPay',
        paymentMethodLast4: user.subscription?.paymentMethodLast4 || '4242'
      });

      return NextResponse.json({
        success: true,
        message: `Plan changed successfully to ${PLANS[newPlanId as PlanId].name}.`,
        subscription: updated
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Billing action error:', err);
    return NextResponse.json({ error: 'Failed to update billing settings.' }, { status: 500 });
  }
}
