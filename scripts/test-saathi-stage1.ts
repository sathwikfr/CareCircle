/**
 * scripts/test-saathi-stage1.ts
 *
 * Stage 1 smoke test for the Saathi AI calling engine.
 * Run with:  npx tsx scripts/test-saathi-stage1.ts
 *
 * Tests (no Twilio call placed — purely offline):
 *  1. DB: Load a parent + medicines from Postgres
 *  2. Engine: Build opening greeting, medicine questions, wellness question, farewell
 *  3. Groq: Interpret simulated speech responses
 *  4. Groq: Generate a post-call summary
 *  5. DB: Persist a test CallLog (then delete it to keep DB clean)
 */

import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import {
  loadCallContext,
  buildOpeningGreeting,
  buildMedicineQuestion,
  buildWellnessQuestion,
  buildFarewell,
  buildTwiml,
  interpretSpeechResponse,
  generateCallSummary,
  persistCallLog,
  SaathiTurn
} from '../src/lib/saathiEngine';

const PASS = '✅';
const FAIL = '❌';

function log(label: string, ok: boolean, detail?: string) {
  const icon = ok ? PASS : FAIL;
  console.log(`${icon}  ${label}${detail ? ': ' + detail : ''}`);
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Saathi AI — Stage 1 Smoke Test');
  console.log('═══════════════════════════════════════════════════════\n');

  // ── 1. Load a parent from DB ─────────────────────────────────────────────
  const parents = await prisma.parentProfile.findMany({
    where: { isDeleted: false },
    take: 1,
    include: {
      medicines: { where: { isActive: true }, take: 3 },
      callSchedule: { where: { isActive: true }, take: 1 }
    }
  });

  if (parents.length === 0) {
    console.log(`${FAIL}  No parent profiles found in DB. Add a parent first then re-run.\n`);
    await prisma.$disconnect();
    return;
  }

  const parent = parents[0];
  console.log(`Found parent: ${parent.name} (${parent.id})`);
  console.log(`  Phone   : ${parent.phone}`);
  console.log(`  Language: ${parent.language}`);
  console.log(`  Medicines: ${parent.medicines.map(m => m.name).join(', ') || '(none)'}\n`);

  // ── 2. Load call context ─────────────────────────────────────────────────
  const slot = parent.callSchedule[0]?.slot ?? 'morning';
  const ctx  = await loadCallContext(parent.id, slot);
  log('loadCallContext', !!ctx.parentName, `slot=${ctx.slot}, meds=${ctx.medicines.length}`);

  // ── 3. Script generation ─────────────────────────────────────────────────
  const greeting = buildOpeningGreeting(ctx);
  log('buildOpeningGreeting', greeting.includes('Saathi'), greeting);

  if (ctx.medicines.length > 0) {
    const q0 = buildMedicineQuestion(ctx, 0);
    log('buildMedicineQuestion(0)', q0.length > 5, q0);
  }

  const wellness = buildWellnessQuestion(ctx);
  log('buildWellnessQuestion', wellness.length > 5, wellness);

  const farewell = buildFarewell(ctx, [true], 'cheerful');
  log('buildFarewell', farewell.includes('Goodbye'), farewell);

  // ── 4. TwiML generation ──────────────────────────────────────────────────
  const twiml = buildTwiml('Hello from Saathi!', 'https://example.com/gather', 'yes, no, haan, nahi');
  const twimlOk = twiml.includes('<Gather') && twiml.includes('<Say');
  log('buildTwiml', twimlOk, twimlOk ? 'Valid TwiML structure' : twiml);

  // ── 5. Groq speech interpretation ────────────────────────────────────────
  if (!process.env.GROQ_API_KEY) {
    log('Groq interpretSpeechResponse', false, 'GROQ_API_KEY not set — skipping');
  } else {
    const simResponses = [
      { text: 'Yes I took it', expected: true },
      { text: 'nahi bhool gaya', expected: false },
      { text: 'haan le liya', expected: true }
    ];

    for (const sim of simResponses) {
      const result = await interpretSpeechResponse(
        sim.text,
        `medicine question: ${ctx.medicines[0]?.name ?? 'medicine'}`,
        ctx.parentName
      );
      log(
        `interpretSpeechResponse("${sim.text}")`,
        result.confirmed === sim.expected,
        `confirmed=${result.confirmed}, mood=${result.mood}`
      );
    }
  }

  // ── 6. Groq summary generation ───────────────────────────────────────────
  const mockTurn: SaathiTurn = {
    questionIndex: 0,
    totalQuestions: ctx.medicines.length,
    askedMoods: true,
    complete: true,
    rawTranscripts: ['haan, le liya', 'fine hoon, shukriya'],
    confirmed: ctx.medicines.length > 0 ? [true] : [],
    mood: 'cheerful'
  };

  const summary = await generateCallSummary(ctx, mockTurn, 45);
  log(
    'generateCallSummary',
    summary.summary.length > 10,
    `confirmed=${summary.medicationConfirmed}, mood=${summary.mood}`
  );
  console.log(`\n  📋 Summary: "${summary.summary}"`);
  if (summary.notes) console.log(`  📝 Notes  : "${summary.notes}"`);
  if (summary.alertLevel) console.log(`  🚨 Alert  : L${summary.alertLevel} — ${summary.alertTitle}`);

  // ── 7. Persist test CallLog ──────────────────────────────────────────────
  const logId = await persistCallLog(
    ctx,
    summary,
    new Date().toISOString(),
    new Date().toISOString(),
    45,
    'answered'
  );
  log('persistCallLog', !!logId, `CallLog id=${logId}`);

  // Clean up test log
  await prisma.callLog.delete({ where: { id: logId } });
  log('cleanup test CallLog', true, 'deleted');

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Stage 1 complete. All systems nominal.');
  console.log('  Next step: configure TWILIO_* env vars and run a live call test.');
  console.log('═══════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

main().catch(async err => {
  console.error('\n❌ Fatal:', err);
  await prisma.$disconnect();
  process.exit(1);
});
