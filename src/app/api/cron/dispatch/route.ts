import { NextResponse } from 'next/server';
import { runDispatch } from '@/lib/callDispatch';
import { runLifecycleEmails } from '@/lib/lifecycleEmails';
import { requestSecret, safeEqual } from '@/lib/secrets';

/**
 * Cron entry point: an external scheduler (cron-job.org, Vercel Cron, …) calls
 * this every ~5 minutes with the CRON_SECRET, either as `x-cron-secret` or as
 * `Authorization: Bearer <secret>` (what Vercel Cron sends).
 * Besides placing calls it sends the trial reminder emails (see lib/lifecycleEmails.ts).
 */
async function handle(req: Request) {
  if (!safeEqual(requestSecret(req, 'x-cron-secret'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Calls and billing reminders are independent: one failing must not stop the other.
  let dispatch: Awaited<ReturnType<typeof runDispatch>> | null = null;
  let dispatchFailed = false;
  try {
    dispatch = await runDispatch();
  } catch (err) {
    dispatchFailed = true;
    console.error('[cron/dispatch] Dispatch failed:', err);
  }

  let lifecycle: Awaited<ReturnType<typeof runLifecycleEmails>> | { error: string };
  try {
    lifecycle = await runLifecycleEmails();
  } catch (err) {
    console.error('[cron/dispatch] Lifecycle emails failed:', err);
    lifecycle = { error: 'Lifecycle emails failed' };
  }

  if (dispatchFailed || !dispatch) {
    return NextResponse.json({ error: 'Dispatch failed', lifecycle }, { status: 500 });
  }
  return NextResponse.json({ success: true, ...dispatch, lifecycle });
}

export const GET = handle;
export const POST = handle;
