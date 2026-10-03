import { NextResponse } from 'next/server';
import { emailDomainAcceptsMail } from './emailDomain';
import { sendOtpEmail } from './email';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function tooManyCodes(retryAfterSec?: number): NextResponse {
  return NextResponse.json(
    { error: `Too many codes requested. Please wait ${Math.ceil((retryAfterSec || 600) / 60)} minutes and try again.` },
    { status: 429 }
  );
}

/** 400 response when the address's domain can't receive mail (typos like "gmail.con"), else null. */
export async function rejectUndeliverableDomain(email: string): Promise<NextResponse | null> {
  if (await emailDomainAcceptsMail(email)) return null;
  return NextResponse.json(
    { error: `"${email.split('@')[1]}" doesn't receive email. Please check the address for typos.`, code: 'EMAIL_DOMAIN_INVALID' },
    { status: 400 }
  );
}

/**
 * Mails a 6-digit code and builds the route's response. Outside `next dev` a
 * code that wasn't delivered is a 503, never a silent success; under
 * `next dev` the code comes back as `devCode` (like the phone OTP's devOtp).
 */
export async function mailVerificationCode(args: {
  to: string;
  name?: string;
  code: string;
  purpose: 'signup' | 'email_change';
}): Promise<NextResponse> {
  const sent = await sendOtpEmail(args);
  const isDev = process.env.NODE_ENV === 'development';

  if (!sent.success || sent.simulated) {
    console.error(`[Aaptha Email] Could not email the ${args.purpose} code:`, sent.error || 'RESEND_API_KEY is not set');
    if (!isDev) {
      return NextResponse.json(
        {
          error: "We couldn't send a code to this email right now. Please check the address and try again, or contact us if it keeps happening.",
          code: 'EMAIL_SEND_FAILED'
        },
        { status: 503 }
      );
    }
  }

  return NextResponse.json({ success: true, sentTo: args.to, ...(isDev ? { devCode: args.code } : {}) });
}
