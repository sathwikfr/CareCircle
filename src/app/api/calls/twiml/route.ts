/**
 * GET/POST /api/calls/twiml
 *
 * Twilio calls this endpoint when the parent answers.
 * It returns TwiML that:
 *   1. Greets the parent by name (Saathi AI persona)
 *   2. Opens a <Gather> to capture the first speech response
 *
 * Query params: parentId, slot
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  loadCallContext,
  buildOpeningGreeting,
  buildMedicineQuestion,
  buildWellnessQuestion,
  buildTwiml
} from '@/lib/saathiEngine';

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    `https://${process.env.VERCEL_URL}` ||
    'http://localhost:3000'
  );
}

export async function GET(req: NextRequest) {
  return handleTwiml(req);
}

export async function POST(req: NextRequest) {
  return handleTwiml(req);
}

async function handleTwiml(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get('parentId') ?? '';
  const slot     = searchParams.get('slot') ?? 'morning';

  if (!parentId) {
    return new NextResponse('parentId is required', { status: 400 });
  }

  try {
    const ctx = await loadCallContext(parentId, slot);

    // Build the opening speech
    let sayText: string;
    if (ctx.medicines.length > 0) {
      // Greeting + first medicine question
      const greeting  = buildOpeningGreeting(ctx);
      const firstQ    = buildMedicineQuestion(ctx, 0);
      sayText = `${greeting} ${firstQ}`;
    } else {
      // Wellness-only call
      sayText = buildWellnessQuestion(ctx);
    }

    // gatherUrl: Twilio will POST the transcription here after the parent speaks
    const baseUrl   = getBaseUrl();
    const gatherUrl = `${baseUrl}/api/calls/gather?parentId=${encodeURIComponent(parentId)}&slot=${encodeURIComponent(slot)}&q=0`;

    const hints = ctx.medicines.map(m => m.name).join(', ') + ', yes, no, haan, nahi, fine';
    const twiml = buildTwiml(sayText, gatherUrl, hints, 4);

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error loading parent';
    console.error('[calls/twiml]', msg);

    // Graceful TwiML error response
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">Hello, this is Saathi from CareCircle. I am sorry, I am unable to connect right now. Please try again later. Goodbye!</Say>
</Response>`;
    return new NextResponse(errorTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
