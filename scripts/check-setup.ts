/**
 * Launch readiness check: `npm run check:setup` (add `-- --strict` to exit 1 when something is missing).
 *
 * Reads .env.local then .env (the same order Next.js uses: .env.local wins) and reports, per feature, which
 * settings are still missing or still placeholders, and where to get each one. It never prints a secret value.
 * It also checks that the database is reachable and has the call-pipeline columns.
 */
import { config } from 'dotenv';
import fs from 'fs';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const PLACEHOLDER = /demo|your_|xxxx|changeme|carecircle2025|plan_x|\+91x{4}|^$/i;

type Check = { name: string; hint: string; valid?: (v: string) => string | null };
interface Group {
  title: string;
  why: string;
  optional?: boolean;
  checks: Check[];
  extra?: (env: NodeJS.ProcessEnv) => string[];
}

const isSet = (v: string | undefined) => !!v && !PLACEHOLDER.test(v);

const GROUPS: Group[] = [
  {
    title: 'Website address & cron',
    why: 'Sarvam and Razorpay call these URLs; the scheduler proves who it is with CRON_SECRET.',
    checks: [
      {
        name: 'NEXT_PUBLIC_APP_URL',
        hint: 'Your public https address, e.g. https://carecircle.in (an ngrok URL works for local call tests)',
        valid: v => (/^https:\/\//.test(v) ? (/localhost|127\.0\.0\.1/.test(v) ? 'still localhost' : null) : 'must start with https:// for production')
      },
      { name: 'CRON_SECRET', hint: 'Any long random string (already generated locally)', valid: v => (v.length >= 24 ? null : 'too short (use 24+ characters)') },
      { name: 'NEXT_PUBLIC_SUPPORT_EMAIL', hint: 'The email shown on the Privacy and Terms pages for requests' }
    ]
  },
  {
    title: 'Email (password resets, alerts, receipts)',
    why: 'Without a verified sender, emails only reach the Resend account owner.',
    checks: [
      { name: 'RESEND_API_KEY', hint: 'Resend dashboard → API Keys' },
      {
        name: 'RESEND_FROM_EMAIL',
        hint: 'An address on a domain you verified in Resend, e.g. CareCircle <no-reply@yourdomain.com>',
        valid: v => (/@resend\.dev/i.test(v) ? 'resend.dev only delivers to your own address' : null)
      }
    ]
  },
  {
    title: 'Prescription reading (Groq)',
    why: 'Reads medicines from a photo of a prescription.',
    checks: [
      { name: 'GROQ_API_KEY', hint: 'console.groq.com → API Keys' },
      { name: 'GROQ_VISION_MODEL', hint: 'A Groq vision model id (already set)' }
    ]
  },
  {
    title: 'Payments (Razorpay)',
    why: 'Takes subscriptions for Family Care and Extended Family.',
    checks: [
      { name: 'RAZORPAY_KEY_ID', hint: 'Razorpay → Account & Settings → API Keys (starts rzp_test_ or rzp_live_)' },
      { name: 'NEXT_PUBLIC_RAZORPAY_KEY_ID', hint: 'The same Key ID again (the browser needs it)' },
      { name: 'RAZORPAY_KEY_SECRET', hint: 'Shown once when you generate the key' },
      { name: 'RAZORPAY_WEBHOOK_SECRET', hint: 'Any random string; paste the same value in Razorpay → Webhooks (generated locally already)' },
      { name: 'RAZORPAY_PLAN_ID_FAMILY', hint: 'Run: npx tsx scripts/create-razorpay-plans.ts --confirm' },
      { name: 'RAZORPAY_PLAN_ID_EXTENDED', hint: 'Printed by the same script' }
    ],
    extra: env => {
      const notes: string[] = [];
      const a = env.RAZORPAY_KEY_ID;
      const b = env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (isSet(a) && isSet(b) && a !== b) notes.push('RAZORPAY_KEY_ID and NEXT_PUBLIC_RAZORPAY_KEY_ID differ: checkout would fail');
      if (isSet(a)) notes.push(`mode: ${a!.startsWith('rzp_live_') ? 'LIVE (real money)' : a!.startsWith('rzp_test_') ? 'test' : 'unknown key prefix'}`);
      return notes;
    }
  },
  {
    title: 'Saathi voice calls (Sarvam)',
    why: 'Places the daily check-in calls. Calling stays off until all of these are set.',
    checks: [
      { name: 'SARVAM_API_KEY', hint: 'Sarvam dashboard → Settings → API Key' },
      { name: 'SARVAM_ORG_ID', hint: 'In the Sarvam dashboard URL / Settings' },
      { name: 'SARVAM_WORKSPACE_ID', hint: 'In the Sarvam dashboard URL / Settings' },
      { name: 'SARVAM_APP_ID', hint: 'The published Saathi agent (see docs/sarvam-agent.md)' },
      { name: 'SARVAM_CONNECTION_ID', hint: 'Deploy → Phone Numbers → your Sarvam Vobiz connection' },
      { name: 'SARVAM_AGENT_PHONE_NUMBER', hint: 'The number you rented, in +91… format' },
      { name: 'SARVAM_WEBHOOK_SECRET', hint: 'Random string (already generated locally); use it as the agent tool bearer token' }
    ]
  },
  {
    title: 'Google sign-in',
    why: 'Adds a "Continue with Google" button. Optional: email and password work without it.',
    optional: true,
    checks: [
      { name: 'GOOGLE_CLIENT_ID', hint: 'Google Cloud Console → Credentials → OAuth client (Web)' },
      { name: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID', hint: 'The same client id again' }
    ]
  }
];

function readKeys(file: string): Record<string, string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('dotenv').parse(fs.readFileSync(file));
  } catch {
    return {};
  }
}

async function checkDatabase(): Promise<string[]> {
  const lines: string[] = [];
  if (!isSet(process.env.DATABASE_URL) || !isSet(process.env.DIRECT_URL)) {
    return ['✗ DATABASE_URL / DIRECT_URL missing'];
  }
  try {
    const { prisma } = await import('../src/lib/prisma');
    const users = await prisma.user.count();
    lines.push(`✓ database reachable (${users} account${users === 1 ? '' : 's'})`);
    try {
      await prisma.callLog.findFirst({ select: { providerAttemptId: true, nextRetryAt: true, processedAt: true } });
      await prisma.alertRecord.findFirst({ select: { callLogId: true } });
      lines.push('✓ call-pipeline columns exist');
    } catch {
      lines.push('✗ call-pipeline columns are missing: the schema needs the additive update (see CLAUDE.md, never --accept-data-loss)');
    }
    await prisma.$disconnect();
  } catch (err) {
    lines.push(`✗ database not reachable: ${err instanceof Error ? err.message.split('\n')[0].slice(0, 120) : 'unknown error'}`);
  }
  return lines;
}

async function main() {
  const strict = process.argv.includes('--strict');
  const env = process.env;
  let notReady = 0;

  console.log('CareCircle launch readiness\n');

  const conflicts: string[] = [];
  const local = readKeys('.env.local');
  const base = readKeys('.env');
  for (const k of Object.keys(local)) {
    if (k in base && local[k] !== base[k]) conflicts.push(k);
  }

  for (const g of GROUPS) {
    const problems: string[] = [];
    for (const c of g.checks) {
      const v = env[c.name];
      if (v === undefined || v === '') problems.push(`  ✗ ${c.name}: missing. ${c.hint}`);
      else if (PLACEHOLDER.test(v)) problems.push(`  ✗ ${c.name}: still a placeholder. ${c.hint}`);
      else {
        const why = c.valid?.(v);
        if (why) problems.push(`  ✗ ${c.name}: ${why}`);
      }
    }
    const notes = g.extra ? g.extra(env) : [];
    const ready = problems.length === 0;
    if (!ready && !g.optional) notReady += 1;
    console.log(`${ready ? '✓ READY ' : g.optional ? '○ OPTIONAL' : '✗ NEEDS KEYS'}  ${g.title}`);
    if (!ready) console.log(`  ${g.why}`);
    problems.forEach(p => console.log(p));
    notes.forEach(n => console.log(`  · ${n}`));
    console.log('');
  }

  console.log('Database');
  for (const l of await checkDatabase()) console.log(`  ${l}`);
  if (conflicts.length) {
    console.log(`\n⚠ These keys exist in both .env and .env.local with DIFFERENT values; .env.local wins in Next.js:\n  ${conflicts.join(', ')}`);
  }
  console.log('\nKeys can go in .env.local (recommended: Next.js reads it first). On Vercel add the same names under Project → Settings → Environment Variables.');
  console.log(notReady === 0 ? '\nAll required settings are in place.' : `\n${notReady} required group${notReady === 1 ? '' : 's'} still need keys. Nothing else is blocking.`);
  process.exit(strict && notReady > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('check-setup failed:', err instanceof Error ? err.message : err);
  process.exit(2);
});
