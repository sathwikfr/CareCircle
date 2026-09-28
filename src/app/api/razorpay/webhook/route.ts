import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { RAZORPAY_KEY_SECRET } from '@/lib/razorpay';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (signature && process.env.RAZORPAY_WEBHOOK_SECRET) {
      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || RAZORPAY_KEY_SECRET)
        .update(rawBody)
        .digest('hex');

      if (expected !== signature) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody || '{}');
    const event = payload.event;
    console.log(`[Razorpay Webhook Received] event: ${event}`, payload);

    switch (event) {
      case 'subscription.charged':
      case 'subscription.activated':
        // Subscription is active or charged successfully
        break;
      case 'payment.failed':
        // Handle failed recurring charge
        break;
      case 'subscription.cancelled':
        // Handle subscription cancellation
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
