/**
 * scripts/test-phone-normalise.ts
 *
 * Unit tests for normalizePhone.
 * Run with: npx tsx scripts/test-phone-normalise.ts
 */

import { normalizePhone } from '../src/lib/phone';

interface Case {
  input: string;
  expectOk: boolean;
  expectE164?: string;
  label: string;
}

const PASS = '✅';
const FAIL = '❌';

const cases: Case[] = [
  // ── Valid Indian 10-digit numbers ────────────────────────────────────────
  { input: '8309426043',    expectOk: true, expectE164: '+918309426043', label: 'bare 10-digit (8xx)' },
  { input: '9876543210',    expectOk: true, expectE164: '+919876543210', label: 'bare 10-digit (9xx)' },
  { input: '6012345678',    expectOk: true, expectE164: '+916012345678', label: 'bare 10-digit (6xx)' },
  { input: '7000000000',    expectOk: true, expectE164: '+917000000000', label: 'bare 10-digit (7xx)' },

  // ── With country code ────────────────────────────────────────────────────
  { input: '+918309426043', expectOk: true, expectE164: '+918309426043', label: '+91 prefix' },
  { input: '918309426043',  expectOk: true, expectE164: '+918309426043', label: '91 prefix no +' },
  { input: '08309426043',   expectOk: true, expectE164: '+918309426043', label: 'STD 0 prefix' },

  // ── With formatting characters ────────────────────────────────────────────
  { input: '+91 830 942 6043',  expectOk: true, expectE164: '+918309426043', label: 'spaces with +91' },
  { input: '83094-26043',       expectOk: true, expectE164: '+918309426043', label: 'dashes' },
  { input: '(830) 942-6043',    expectOk: true, expectE164: '+918309426043', label: 'US-style brackets' },
  { input: '91-8309426043',     expectOk: true, expectE164: '+918309426043', label: '91- dash format' },

  // ── Other international ───────────────────────────────────────────────────
  { input: '+447911123456',  expectOk: true, expectE164: '+447911123456', label: 'UK number' },
  { input: '+12015551234',   expectOk: true, expectE164: '+12015551234',  label: 'US number' },

  // ── Invalid: wrong start digit ────────────────────────────────────────────
  { input: '5123456789',    expectOk: false, label: 'starts with 5 (invalid Indian)' },
  { input: '1234567890',    expectOk: false, label: 'starts with 1 (invalid Indian)' },
  { input: '0000000000',    expectOk: false, label: 'all zeros' },

  // ── Invalid: wrong length ────────────────────────────────────────────────
  { input: '87785048520',   expectOk: false, label: '11 digits no prefix (known bad: DB value)' },
  { input: '123456789',     expectOk: false, label: '9 digits (too short)' },
  { input: '12345678901',   expectOk: false, label: '11 digits no 0/91 prefix' },

  // ── Invalid: empty / missing ─────────────────────────────────────────────
  { input: '',              expectOk: false, label: 'empty string' },
  { input: '   ',           expectOk: false, label: 'only spaces' },
  { input: '+91',           expectOk: false, label: '+91 with no digits' },

  // ── Invalid: bad +91 local part ─────────────────────────────────────────
  { input: '+915123456789', expectOk: false, label: '+91 + starts-with-5 local' },
  { input: '+9187785048520',expectOk: false, label: '+91 + 11 local digits' },
];

let passed = 0;
let failed = 0;

for (const c of cases) {
  const result = normalizePhone(c.input);
  const okMatch = result.ok === c.expectOk;
  const e164Match = !c.expectE164 || (result.ok && result.e164 === c.expectE164);
  const allOk = okMatch && e164Match;

  if (allOk) {
    passed++;
    const detail = result.ok ? `→ ${result.e164}` : `→ "${result.reason}"`;
    console.log(`${PASS}  ${c.label}: "${c.input}" ${detail}`);
  } else {
    failed++;
    const got = result.ok ? `ok=true, e164=${result.e164}` : `ok=false, reason="${result.reason}"`;
    const want = c.expectOk
      ? `ok=true, e164=${c.expectE164 ?? '(any)'}`
      : `ok=false`;
    console.log(`${FAIL}  ${c.label}: "${c.input}"`);
    console.log(`       got : ${got}`);
    console.log(`       want: ${want}`);
  }
}

console.log(`\n${'─'.repeat(55)}`);
console.log(`  ${passed} passed  |  ${failed} failed  |  ${cases.length} total`);
console.log('─'.repeat(55));

if (failed > 0) process.exit(1);
