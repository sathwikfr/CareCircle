/**
 * scripts/report-bad-phones.ts
 *
 * READ-ONLY audit: lists every parent and emergency contact in the DB
 * whose stored phone fails E.164 normalisation.
 *
 * Run with: npx tsx scripts/report-bad-phones.ts
 * Does NOT modify any data.
 */

import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { normalizePhone } from '../src/lib/phone';

async function main() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  CareCircle — Bad Phone Report (READ-ONLY)');
  console.log('══════════════════════════════════════════════════════════\n');

  // ── Parent phones ────────────────────────────────────────────────────────
  const parents = await prisma.parentProfile.findMany({
    select: { id: true, name: true, phone: true, userId: true, isDeleted: true }
  });

  const badParents: Array<{ id: string; name: string; phone: string; reason: string; isDeleted: boolean }> = [];

  for (const p of parents) {
    const result = normalizePhone(p.phone);
    if (!result.ok) {
      badParents.push({ id: p.id, name: p.name, phone: p.phone, reason: result.reason, isDeleted: p.isDeleted });
    }
  }

  if (badParents.length === 0) {
    console.log('✅  All parent phones are valid E.164.\n');
  } else {
    console.log(`❌  ${badParents.length} parent phone(s) are invalid:\n`);
    console.log(
      'ID'.padEnd(26) +
      'Name'.padEnd(20) +
      'Stored phone'.padEnd(18) +
      'Reason'
    );
    console.log('─'.repeat(90));
    for (const b of badParents) {
      console.log(
        b.id.padEnd(26) +
        b.name.substring(0, 18).padEnd(20) +
        b.phone.padEnd(18) +
        b.reason
      );
    }
    console.log();
  }

  // ── Emergency contact phones ─────────────────────────────────────────────
  const contacts = await prisma.emergencyContact.findMany({
    select: { id: true, name: true, phone: true, parentId: true }
  });

  const badContacts: Array<{ id: string; name: string; phone: string; parentId: string; reason: string }> = [];

  for (const c of contacts) {
    const result = normalizePhone(c.phone);
    if (!result.ok) {
      badContacts.push({ id: c.id, name: c.name, phone: c.phone, parentId: c.parentId, reason: result.reason });
    }
  }

  if (badContacts.length === 0) {
    console.log('✅  All emergency contact phones are valid E.164.\n');
  } else {
    console.log(`❌  ${badContacts.length} emergency contact phone(s) are invalid:\n`);
    console.log(
      'Contact ID'.padEnd(26) +
      'Name'.padEnd(20) +
      'Stored phone'.padEnd(18) +
      'ParentId'.padEnd(26) +
      'Reason'
    );
    console.log('─'.repeat(110));
    for (const b of badContacts) {
      console.log(
        b.id.padEnd(26) +
        b.name.substring(0, 18).padEnd(20) +
        b.phone.padEnd(18) +
        b.parentId.padEnd(26) +
        b.reason
      );
    }
    console.log();
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const totalBad = badParents.length + badContacts.length;
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Scanned ${parents.length} parents, ${contacts.length} emergency contacts`);
  if (totalBad === 0) {
    console.log('  No invalid phones found — you are good to go!');
  } else {
    console.log(`  ${totalBad} invalid phone(s) found.`);
    console.log('  Fix them in the dashboard or directly in Supabase.');
    console.log('  Saathi will refuse to call parents with invalid phones.');
  }
  console.log('══════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

main().catch(async err => {
  console.error('\n❌ Fatal:', err);
  await prisma.$disconnect();
  process.exit(1);
});
