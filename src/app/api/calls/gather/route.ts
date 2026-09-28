/**
 * POST /api/calls/gather
 *
 * Twilio posts here after the parent speaks. This handler:
 *  1. Receives the SpeechResult transcript
 *  2. Passes it to Groq (via saathiEngine.interpretSpeechResponse)
 *  3. Decides whether to ask the next medicine question, the mood question, or end the call
 *  4. If call is complete: persists CallLog + optional AlertRecord to Postgres
 *
 * Query params: parentId, slot, q (question index, 0-based)
 * Post body (form-encoded by Twilio): SpeechResult, CallSid, CallStatus, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  loadCallContext,
  buildMedicineQuestion,
  buildWellnessQuestion,
  buildFarewell,
  buildTwiml,
  buildFarewellTwiml,
  interpretSpeechResponse,
  generateCallSummary,
  persistCallLog,
  SaathiTurn
} from '@/lib/saathiEngine';

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    `https://${process.env.VERCEL_URL}` ||
    'http://localhost:3000'
  );
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parentId  = searchParams.get('parentId') ?? '';
  const slot      = searchParams.get('slot') ?? 'morning';
  const qIndex    = parseInt(searchParams.get('q') ?? '0', 10);

  // Parse Twilio's form-encoded body
  const formData  = await req.formData();
  const transcript = (formData.get('SpeechResult') as string | null) ?? '';
  const callSid    = (formData.get('CallSid')     as string | null) ?? '';

  // We track state statelessly via URL params (q = question index, done = mood done)
  const askedMoods = searchParams.get('mood') === '1';

  if (!parentId) {
    return new NextResponse('parentId missing', { status: 400 });
  }

  try {
    const ctx = await loadCallContext(parentId, slot);
    const baseUrl = getBaseUrl();

    // ── Interpret the spoken response ────────────────────────────────────────
    let confirmed = false;
    let mood = 'neutral';
    let needsAlert = false;

    if (transcript) {
      const questionContext = askedMoods
        ? 'wellness / mood check-in question'
        : `medicine question ${qIndex + 1} of ${ctx.medicines.length}: ${ctx.medicines[qIndex]?.name ?? ''}`;

      const result = await interpretSpeechResponse(transcript, questionContext, ctx.parentName);
      confirmed  = result.confirmed;
      mood       = result.mood;
      needsAlert = result.needsAlert;
    }

    // ── Decide next action ───────────────────────────────────────────────────

    const isLastMedicine = qIndex >= ctx.medicines.length - 1;
    const hasMedicines   = ctx.medicines.length > 0;

    // Case 1: We just asked a medicine question and there's another one
    if (hasMedicines && !askedMoods && !isLastMedicine) {
      const nextQ      = qIndex + 1;
      const nextText   = buildMedicineQuestion(ctx, nextQ);
      const gatherUrl  = `${baseUrl}/api/calls/gather?parentId=${encodeURIComponent(parentId)}&slot=${encodeURIComponent(slot)}&q=${nextQ}`;
      const hints      = ctx.medicines.map(m => m.name).join(', ') + ', yes, no, haan, nahi';
      const twiml      = buildTwiml(nextText, gatherUrl, hints, 4);
      return new NextResponse(twiml, { status: 200, headers: { 'Content-Type': 'text/xml' } });
    }

    // Case 2: All medicines asked → now ask the mood/wellness question
    if ((hasMedicines && !askedMoods && isLastMedicine) || (!hasMedicines && !askedMoods)) {
      const wellnessText = buildWellnessQuestion(ctx);
      const gatherUrl    = `${baseUrl}/api/calls/gather?parentId=${encodeURIComponent(parentId)}&slot=${encodeURIComponent(slot)}&q=${qIndex}&mood=1`;
      const hints        = 'yes, no, fine, good, well, pain, tired, haan, nahi, theek hoon';
      const twiml        = buildTwiml(wellnessText, gatherUrl, hints, 5);
      return new NextResponse(twiml, { status: 200, headers: { 'Content-Type': 'text/xml' } });
    }

    // Case 3: Wellness question answered → end the call
    // Build a minimal SaathiTurn for summary generation
    const turn: SaathiTurn = {
      questionIndex: qIndex,
      totalQuestions: ctx.medicines.length,
      askedMoods: true,
      complete: true,
      rawTranscripts: [transcript],          // simplified — Stage 2 will accumulate all
      confirmed: hasMedicines ? [confirmed] : [],
      mood
    };

    const durationSeconds = 30; // Twilio will give us real duration via status callback
    const summary = await generateCallSummary(ctx, turn, durationSeconds);

    // Persist to DB
    const scheduledTime = new Date().toISOString();
    await persistCallLog(ctx, summary, scheduledTime, scheduledTime, durationSeconds, 'answered');

    // Build farewell TwiML
    const farewellText  = buildFarewell(ctx, turn.confirmed, mood);
    const farewellTwiml = buildFarewellTwiml(farewellText);

    // Log call sid for debugging
    console.log(`[calls/gather] Call ${callSid} complete. Alert needed: ${needsAlert}`);

    return new NextResponse(farewellTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('[calls/gather]', msg);

    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">I am sorry, something went wrong. Your family will be notified. Goodbye and take care!</Say>
</Response>`;
    return new NextResponse(errorTwiml, { status: 200, headers: { 'Content-Type': 'text/xml' } });
  }
}
