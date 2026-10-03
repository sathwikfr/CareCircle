import { NextResponse } from 'next/server';
import { checkNewAccount } from '@/lib/signupChecks';
import { mailVerificationCode, rejectUndeliverableDomain, tooManyCodes } from '@/lib/emailCode';
import { checkRateLimit, recordFailedAttempt, createSignupEmailCode } from '@/lib/security';

const TEN_MINUTES = 10 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

function clientIp(req: Request): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
}

/**
 * Email signup, step 1: mail a 6-digit code to the address. The account is
 * only created (POST /api/auth/signup) once that code comes back, which proves
 * the inbox exists and belongs to the person signing up.
 */
export async function POST(req: Request) {
  try {
    const check = await checkNewAccount(await req.json());
    if (!check.ok) return check.response;
    const { name, email } = check;

    const emailKey = `signup_code:${email}`;
    const emailLimit = checkRateLimit(emailKey, 3, TEN_MINUTES);
    if (!emailLimit.allowed) return tooManyCodes(emailLimit.retryAfterSec);

    const ip = clientIp(req);
    const ipKey = ip ? `signup_code_ip:${ip}` : null;
    if (ipKey) {
      const ipLimit = checkRateLimit(ipKey, 10, ONE_HOUR);
      if (!ipLimit.allowed) return tooManyCodes(ipLimit.retryAfterSec);
    }

    const badDomain = await rejectUndeliverableDomain(email);
    if (badDomain) return badDomain;

    recordFailedAttempt(emailKey, TEN_MINUTES);
    if (ipKey) recordFailedAttempt(ipKey, ONE_HOUR);

    const { code } = await createSignupEmailCode(email);
    return await mailVerificationCode({ to: email, name, code, purpose: 'signup' });
  } catch (err) {
    console.error('Signup send-code error:', err);
    return NextResponse.json({ error: 'Could not send the verification code. Please try again.' }, { status: 500 });
  }
}
