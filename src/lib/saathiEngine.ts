/**
 * Saathi AI — CareCircle's voice companion engine
 *
 * This module is the brain of every Saathi call. It:
 *  1. Builds the opening TwiML greeting for each parent
 *  2. Processes the parent's spoken response (transcribed by Twilio)
 *  3. Decides the next question or farewell
 *  4. Generates a structured post-call summary via Groq
 *
 * Ground rules (from master prompt):
 *  - Only use field names that exist in prisma/schema.prisma
 *  - No external TTS beyond Twilio's built-in <Say> for Stage 1
 *  - Groq model: process.env.GROQ_CALL_MODEL || 'llama-3.3-70b-versatile'
 */

import Groq from 'groq-sdk';
import { prisma } from './prisma';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CallContext {
  parentId: string;
  parentName: string;
  language: string;             // e.g. "Hindi & English"
  medicines: MedInContext[];
  slot: string;                 // morning | afternoon | evening | bedtime | wellness
  slotLabel: string;
}

export interface MedInContext {
  name: string;
  dosage: string;
  foodRelation: string;
  questionScript: string;
}

export interface SaathiTurn {
  questionIndex: number;        // which medicine we are asking about (0-based)
  totalQuestions: number;
  askedMoods: boolean;
  complete: boolean;
  rawTranscripts: string[];     // parent's spoken answers so far
  confirmed: boolean[];         // per-medicine confirmed?
  mood: string;                 // cheerful | calm | anxious | unwell | neutral
}

export interface CallSummary {
  medicationConfirmed: boolean; // true if ALL medicines confirmed
  mood: string;
  summary: string;
  notes: string | null;
  alertLevel: number | null;   // null = no alert, 1-4 = escalating concern
  alertTitle: string | null;
  alertMessage: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGroqClient(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not set');
  return new Groq({ apiKey: key });
}

function getCallModel(): string {
  return process.env.GROQ_CALL_MODEL || 'openai/gpt-oss-120b';
}

/**
 * Determine the greeting time-of-day phrase based on slot
 */
function timeGreeting(slot: string): string {
  switch (slot) {
    case 'morning':   return 'Good morning';
    case 'afternoon': return 'Good afternoon';
    case 'evening':   return 'Good evening';
    case 'bedtime':   return 'Good night';
    default:          return 'Hello';
  }
}

/**
 * Build a simple TwiML <Response> string (no SDK required)
 */
export function buildTwiml(
  sayText: string,
  gatherUrl: string,
  hints: string = '',
  speechTimeout: number = 3
): string {
  const hintsAttr = hints ? ` hints="${escapeXml(hints)}"` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${escapeXml(gatherUrl)}" method="POST"
          speechTimeout="${speechTimeout}" language="en-IN"${hintsAttr}>
    <Say voice="Polly.Aditi">${escapeXml(sayText)}</Say>
  </Gather>
  <Say voice="Polly.Aditi">I didn't hear anything. Goodbye, take care!</Say>
</Response>`;
}

/**
 * Build TwiML for the final farewell (no Gather needed)
 */
export function buildFarewellTwiml(sayText: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">${escapeXml(sayText)}</Say>
</Response>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── Context Loader ─────────────────────────────────────────────────────────

/**
 * Load everything Saathi needs for a call from the DB.
 * parentId  — from ScheduledCallSlot or trigger payload
 * slotName  — 'morning' | 'afternoon' | 'evening' | 'bedtime' | 'wellness'
 */
export async function loadCallContext(
  parentId: string,
  slotName: string
): Promise<CallContext> {
  const parent = await prisma.parentProfile.findUniqueOrThrow({
    where: { id: parentId },
    include: {
      medicines: { where: { isActive: true } },
      callSchedule: { where: { isActive: true } }
    }
  });

  // Find the call slot that matches this slotName
  const slot = parent.callSchedule.find(s => s.slot === slotName)
    ?? parent.callSchedule[0];

  // Parse linkedMedicinesJson if present
  let medsInContext: MedInContext[] = [];
  if (slot?.linkedMedicinesJson) {
    try {
      const parsed = JSON.parse(slot.linkedMedicinesJson) as Array<{
        name: string;
        dosage?: string;
        foodRelation?: string;
        questionScript?: string;
      }>;
      medsInContext = parsed.map(m => ({
        name: m.name,
        dosage: m.dosage ?? '',
        foodRelation: m.foodRelation ?? 'not_specified',
        questionScript: m.questionScript ?? `Did you take your ${m.name}?`
      }));
    } catch {
      // Fall back to raw medicine list
    }
  }

  // Fallback: use all active medicines for this parent
  if (medsInContext.length === 0) {
    medsInContext = parent.medicines.map(m => ({
      name: m.name,
      dosage: m.dosage,
      foodRelation: m.foodRelation ?? 'not_specified',
      questionScript: `Did you take your ${m.name}?`
    }));
  }

  return {
    parentId,
    parentName: parent.name,
    language: parent.language,
    medicines: medsInContext,
    slot: slotName,
    slotLabel: slot?.label ?? slotName
  };
}

// ─── Script Builder ──────────────────────────────────────────────────────────

/**
 * Build the opening greeting text for a Saathi call
 */
export function buildOpeningGreeting(ctx: CallContext): string {
  const greeting = timeGreeting(ctx.slot);
  const firstName = ctx.parentName.split(' ')[0];

  if (ctx.medicines.length === 0) {
    return `${greeting} ${firstName}! This is Saathi from CareCircle. I am just calling to check how you are doing today. How are you feeling?`;
  }

  const medCount = ctx.medicines.length;
  const medWord = medCount === 1 ? 'medicine' : 'medicines';
  return `${greeting} ${firstName}! This is Saathi from CareCircle, calling for your ${ctx.slotLabel}. I want to ask you about your ${medWord} today. Are you ready?`;
}

/**
 * Build the question text for a specific medicine index
 */
export function buildMedicineQuestion(ctx: CallContext, index: number): string {
  const med = ctx.medicines[index];
  if (!med) return 'Did you take all your medicines?';
  return med.questionScript;
}

/**
 * Build the wellness / mood question (asked after medicine check-in or for wellness slots)
 */
export function buildWellnessQuestion(ctx: CallContext): string {
  const firstName = ctx.parentName.split(' ')[0];
  if (ctx.slot === 'bedtime') {
    return `Great, ${firstName}. One last thing — how are you feeling tonight? Are you doing well?`;
  }
  return `Thank you, ${firstName}. And how are you feeling today overall? Are you doing well?`;
}

/**
 * Build farewell message based on call outcome
 */
export function buildFarewell(ctx: CallContext, confirmed: boolean[], mood: string): string {
  const firstName = ctx.parentName.split(' ')[0];
  const allConfirmed = confirmed.every(Boolean);

  if (ctx.medicines.length === 0) {
    return `Thank you for chatting, ${firstName}. Take care and have a wonderful day. Goodbye!`;
  }

  if (allConfirmed) {
    if (mood === 'cheerful' || mood === 'calm') {
      return `Wonderful, ${firstName}! All your medicines are confirmed. Your family will be happy to know. Take care, stay well, and have a great day. Goodbye!`;
    }
    return `Thank you, ${firstName}. Medicines noted. Please rest and take care. Your family has been notified. Goodbye!`;
  }

  return `Thank you, ${firstName}. I have made a note about your medicines. Your family will be informed. Please take care and stay well. Goodbye!`;
}

// ─── Speech Interpreter ──────────────────────────────────────────────────────

/**
 * Use Groq to interpret a parent's spoken answer and determine:
 *  - confirmed: boolean (did they take the medicine?)
 *  - mood: cheerful | calm | anxious | unwell | neutral
 *  - needsAlert: boolean
 *  - alertReason: string | null
 */
export async function interpretSpeechResponse(
  transcript: string,
  context: string,
  parentName: string
): Promise<{
  confirmed: boolean;
  mood: string;
  needsAlert: boolean;
  alertReason: string | null;
}> {
  if (!transcript || transcript.trim().length < 2) {
    return { confirmed: false, mood: 'neutral', needsAlert: false, alertReason: null };
  }

  const groq = getGroqClient();

  const systemPrompt = `You are Saathi, CareCircle's empathetic AI assistant that interprets elderly parents' spoken responses during medication check-in calls.

Analyze the transcript and return ONLY valid JSON with these exact fields:
{
  "confirmed": true or false,
  "mood": "cheerful or calm or anxious or unwell or neutral",
  "needsAlert": true or false,
  "alertReason": "string or null"
}

Rules:
- "yes", "haan", "haa", "done", "took it", "le liya", "kha liya" means confirmed=true
- "no", "nahi", "forgot", "bhool gaya", "not yet" means confirmed=false
- "pain", "dard", "unwell", "sick", "problem", "chest", "breathless" means needsAlert=true
- Mood: cheerful = happy or positive, calm = neutral or fine, anxious = worried, unwell = sick or in pain, neutral = unclear
- Return ONLY the JSON, no other text.`;

  const userPrompt = `Context: ${context}
Parent name: ${parentName}
Spoken response: "${transcript}"`;

  try {
    const response = await groq.chat.completions.create({
      model: getCallModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 200
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '{}';
    const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      confirmed: Boolean(parsed.confirmed),
      mood: ['cheerful', 'calm', 'anxious', 'unwell', 'neutral'].includes(parsed.mood)
        ? parsed.mood
        : 'neutral',
      needsAlert: Boolean(parsed.needsAlert),
      alertReason: typeof parsed.alertReason === 'string' ? parsed.alertReason : null
    };
  } catch {
    return { confirmed: false, mood: 'neutral', needsAlert: false, alertReason: null };
  }
}

// ─── Summary Generator ───────────────────────────────────────────────────────

/**
 * After the call ends, generate a structured CallLog summary via Groq.
 */
export async function generateCallSummary(
  ctx: CallContext,
  turn: SaathiTurn,
  durationSeconds: number
): Promise<CallSummary> {
  const transcriptText = turn.rawTranscripts
    .map((t, i) => `Q${i + 1}: ${t}`)
    .join('\n');

  const medicationConfirmed = ctx.medicines.length === 0
    ? true
    : turn.confirmed.length > 0 && turn.confirmed.every(Boolean);

  if (!process.env.GROQ_API_KEY || turn.rawTranscripts.length === 0) {
    return {
      medicationConfirmed,
      mood: turn.mood || 'neutral',
      summary: `Saathi call with ${ctx.parentName} (${ctx.slotLabel}). Duration: ${durationSeconds}s.`,
      notes: null,
      alertLevel: null,
      alertTitle: null,
      alertMessage: null
    };
  }

  const groq = getGroqClient();

  const systemPrompt = `You are Saathi, summarizing a medication check-in call for a CareCircle family dashboard.

Return ONLY valid JSON:
{
  "summary": "2-3 sentence human-readable summary of the call for the family",
  "notes": "any specific concerns or notable quotes, or null",
  "alertLevel": null or a number from 1 to 4 where 1 means info, 2 means mild concern, 3 means urgent, 4 means emergency,
  "alertTitle": "short alert title or null",
  "alertMessage": "alert body or null"
}`;

  const userPrompt = `Parent: ${ctx.parentName}
Slot: ${ctx.slotLabel}
Medicines asked: ${ctx.medicines.map(m => m.name).join(', ') || 'none'}
Medicines confirmed: ${turn.confirmed.filter(Boolean).length} of ${ctx.medicines.length}
Duration: ${durationSeconds}s
Parent spoken answers:
${transcriptText}
Overall mood: ${turn.mood}`;

  try {
    const response = await groq.chat.completions.create({
      model: getCallModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 400
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '{}';
    const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      medicationConfirmed,
      mood: turn.mood || 'neutral',
      summary: parsed.summary ?? `Saathi call with ${ctx.parentName}.`,
      notes: parsed.notes ?? null,
      alertLevel: typeof parsed.alertLevel === 'number' ? parsed.alertLevel : null,
      alertTitle: parsed.alertTitle ?? null,
      alertMessage: parsed.alertMessage ?? null
    };
  } catch {
    return {
      medicationConfirmed,
      mood: turn.mood || 'neutral',
      summary: `Saathi completed a ${ctx.slotLabel} check-in with ${ctx.parentName}.`,
      notes: null,
      alertLevel: null,
      alertTitle: null,
      alertMessage: null
    };
  }
}

// ─── Call Log Persistence ────────────────────────────────────────────────────

/**
 * Persist the completed call to CallLog and optionally AlertRecord in Postgres.
 */
export async function persistCallLog(
  ctx: CallContext,
  summary: CallSummary,
  scheduledTime: string,
  actualAnswerTime: string | null,
  durationSeconds: number,
  callStatus: string
): Promise<string> {
  const log = await prisma.callLog.create({
    data: {
      parentId: ctx.parentId,
      scheduledTime,
      actualAnswerTime: actualAnswerTime ?? undefined,
      status: callStatus,
      durationSeconds,
      medicationConfirmed: summary.medicationConfirmed,
      mood: summary.mood,
      summary: summary.summary,
      notes: summary.notes ?? undefined
    }
  });

  if (summary.alertLevel && summary.alertTitle && summary.alertMessage) {
    await prisma.alertRecord.create({
      data: {
        parentId: ctx.parentId,
        level: summary.alertLevel,
        title: summary.alertTitle,
        message: summary.alertMessage,
        channel: 'whatsapp',
        timestamp: new Date().toISOString(),
        status: 'sent'
      }
    });
  }

  return log.id;
}
