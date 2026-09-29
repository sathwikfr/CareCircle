import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/razorpay';

/**
 * Razorpay webhook. Requires RAZORPAY_WEBHOOK_SECRET; unsigned or wrongly
 * signed requests are rejected. Keeps UserSubscription in sync with the
 * subscription lifecycle in Razorpay.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  try {
    const payload = JSON.parse(rawBody || '{}');
    const event: string = payload.event;
    const subEntity = payload.payload?.subscription?.entity;
    const paymentEntity = payload.payload?.payment?.entity;
    const subscriptionId: string | undefined = subEntity?.id || paymentEntity?.subscription_id;

    if (!subscriptionId) {
      return NextResponse.json({ status: 'ignored' });
    }

    const current = await prisma.userSubscription.findFirst({ where: { razorpaySubscriptionId: subscriptionId } });
    if (!current) {
      console.warn(`[Razorpay Webhook] ${event} for unknown subscription ${subscriptionId}`);
      return NextResponse.json({ status: 'ignored' });
    }

    const periodEnd = subEntity?.current_end ? new Date(subEntity.current_end * 1000) : undefined;

    switch (event) {
      case 'subscription.activated':
      case 'subscription.charged':
      case 'subscription.resumed':
        await prisma.userSubscription.update({
          where: { id: current.id },
          data: {
            status: 'active',
            cancelAtPeriodEnd: false,
            ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
            ...(paymentEntity?.id ? { razorpayPaymentId: paymentEntity.id } : {})
          }
        });
        break;
      case 'subscription.pending':
      case 'subscription.halted':
      case 'payment.failed':
        await prisma.userSubscription.update({ where: { id: current.id }, data: { status: 'past_due' } });
        break;
      case 'subscription.cancelled':
      case 'subscription.completed':
        await prisma.userSubscription.update({
          where: { id: current.id },
          data: { status: 'cancelled', cancelAtPeriodEnd: true, ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}) }
        });
        break;
      default:
        break;
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
