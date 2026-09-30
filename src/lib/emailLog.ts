import { prisma } from './prisma';

/**
 * "Send at most once" for transactional email, backed by the EmailLog unique key
 * (userId, kind, refKey). Razorpay may deliver a webhook twice and the cron runs every
 * few minutes, so anything that must reach a customer exactly once claims a row first.
 *
 * failOpen decides what happens when the claim itself can't be recorded (database error):
 *  - true  -> send anyway (payment/cancellation notices: better a rare duplicate than silence)
 *  - false -> skip (cron reminders: without a record they would repeat every run)
 */
export interface EmailClaim {
  userId: string;
  kind: string;
  refKey: string;
  failOpen: boolean;
}

export type SendOnceResult = 'sent' | 'duplicate' | 'failed';

async function claim(c: EmailClaim): Promise<boolean> {
  try {
    // INSERT ... ON CONFLICT DO NOTHING: count is 0 when another run already claimed this email.
    const res = await prisma.emailLog.createMany({
      data: [{ userId: c.userId, kind: c.kind, refKey: c.refKey }],
      skipDuplicates: true
    });
    return res.count === 1;
  } catch (err) {
    console.error(`[EmailLog] Could not record ${c.kind}/${c.refKey}:`, err instanceof Error ? err.message : err);
    return c.failOpen;
  }
}

async function release(c: EmailClaim): Promise<void> {
  try {
    await prisma.emailLog.deleteMany({ where: { userId: c.userId, kind: c.kind, refKey: c.refKey } });
  } catch {
    // Nothing more to do: worst case the email is not retried.
  }
}

/** Marks an email as already handled (e.g. a receipt that another code path just sent). */
export async function markEmailSent(c: Omit<EmailClaim, 'failOpen'>): Promise<void> {
  await claim({ ...c, failOpen: true });
}

/**
 * Claims the (user, kind, refKey) slot and runs `send`. If the send fails the claim is
 * released so the next attempt (a webhook retry or the next cron run) can try again.
 */
export async function sendOnce(
  c: EmailClaim,
  send: () => Promise<{ success: boolean; error?: string }>
): Promise<SendOnceResult> {
  if (!(await claim(c))) return 'duplicate';
  try {
    const res = await send();
    if (res.success) return 'sent';
    console.error(`[EmailLog] ${c.kind} email failed: ${res.error || 'unknown error'}`);
  } catch (err) {
    console.error(`[EmailLog] ${c.kind} email threw:`, err instanceof Error ? err.message : err);
  }
  await release(c);
  return 'failed';
}
