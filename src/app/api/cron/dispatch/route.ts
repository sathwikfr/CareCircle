import { NextResponse } from 'next/server';
import { runDispatch } from '@/lib/callDispatch';
import { requestSecret, safeEqual } from '@/lib/secrets';

/**
 * Cron entry point: an external scheduler (cron-job.org, Vercel Cron, …) calls
 * this every ~5 minutes with the CRON_SECRET, either as `x-cron-secret` or as
 * `Authorization: Bearer <secret>` (what Vercel Cron sends).
 */
async function handle(req: Request) {
  if (!safeEqual(requestSecret(req, 'x-cron-secret'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runDispatch();
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    console.error('[cron/dispatch] Failed:', err);
    return NextResponse.json({ error: 'Dispatch failed' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
