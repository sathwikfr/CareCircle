import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/access';
import { getUserByEmail } from '@/lib/db';
import { EMAIL_PATTERN, mailVerificationCode, rejectUndeliverableDomain, tooManyCodes } from '@/lib/emailCode';
import { checkRateLimit, recordFailedAttempt, createEmailChangeCode } from '@/lib/security';

const TEN_MINUTES = 10 * 60 * 1000;

/**
 * Email change, step 1: mail a 6-digit code to the NEW address. The account
 * keeps its current email until that code is entered (POST /api/account/email).
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const { user } = auth;

    const { email } = await req.json();
    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    const newEmail = email.trim().toLowerCase();

    if (newEmail === user.email) {
      return NextResponse.json({ error: 'That is already the email on your account.' }, { status: 400 });
    }

    const limitKey = `email_change:${user.id}`;
    const limit = checkRateLimit(limitKey, 3, TEN_MINUTES);
    if (!limit.allowed) return tooManyCodes(limit.retryAfterSec);

    if (await getUserByEmail(newEmail)) {
      return NextResponse.json(
        { error: 'Another Aaptha account already uses this email.', code: 'EMAIL_TAKEN' },
        { status: 409 }
      );
    }

    const badDomain = await rejectUndeliverableDomain(newEmail);
    if (badDomain) return badDomain;

    recordFailedAttempt(limitKey, TEN_MINUTES);

    const { code } = await createEmailChangeCode(user.id, newEmail);
    return await mailVerificationCode({ to: newEmail, name: user.name, code, purpose: 'email_change' });
  } catch (err) {
    console.error('Email change send-code error:', err);
    return NextResponse.json({ error: 'Could not send the verification code. Please try again.' }, { status: 500 });
  }
}
