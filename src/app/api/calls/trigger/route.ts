/**
 * POST /api/calls/trigger
 *
 * Initiates a Twilio outbound call to a parent.
 * Body: { parentId: string, slot: string }
 *
 * The call is authenticated via session token (same middleware pattern used
 * elsewhere in CareCircle). In production this is also invoked by the cron
 * scheduler — in that case pass x-cron-secret header.
 */

import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { prisma } from '@/lib/prisma';

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is not set');
  }
  return twilio(accountSid, authToken);
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    `https://${process.env.VERCEL_URL}` ||
    'http://localhost:3000'
  );
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth: allow session cookie OR internal cron secret ──────────────────
    const cronSecret = req.headers.get('x-cron-secret');
    const isCron = cronSecret && cronSecret === process.env.CRON_SECRET;

    if (!isCron) {
      // Check session cookie (same as other auth-protected routes)
      const sessionToken = req.cookies.get('session_token')?.value;
      if (!sessionToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const session = await prisma.dBSession.findUnique({
        where: { token: sessionToken },
        include: { user: true }
      });
      if (!session || session.revoked || session.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Session expired' }, { status: 401 });
      }
    }

    const body = await req.json() as { parentId?: string; slot?: string };
    const { parentId, slot = 'morning' } = body;

    if (!parentId) {
      return NextResponse.json({ error: 'parentId is required' }, { status: 400 });
    }

    // ── Load parent ─────────────────────────────────────────────────────────
    const parent = await prisma.parentProfile.findUnique({
      where: { id: parentId }
    });

    if (!parent || parent.isDeleted) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }

    if (parent.isPaused) {
      return NextResponse.json(
        { error: 'Calls are paused for this parent', pauseReason: parent.pauseReason },
        { status: 409 }
      );
    }

    if (!parent.phone) {
      return NextResponse.json({ error: 'Parent has no phone number' }, { status: 422 });
    }

    // ── Initiate Twilio call ────────────────────────────────────────────────
    const baseUrl = getBaseUrl();
    const twimlUrl = `${baseUrl}/api/calls/twiml?parentId=${encodeURIComponent(parentId)}&slot=${encodeURIComponent(slot)}`;

    const client = getTwilioClient();
    const call = await client.calls.create({
      to: parent.phone,
      from: process.env.TWILIO_PHONE_NUMBER!,
      url: twimlUrl,
      statusCallback: `${baseUrl}/api/calls/status`,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['completed', 'failed', 'busy', 'no-answer'],
      machineDetection: 'Enable',    // skip voicemail
      timeout: 30
    });

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      to: parent.phone,
      parentName: parent.name,
      slot
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[calls/trigger] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
