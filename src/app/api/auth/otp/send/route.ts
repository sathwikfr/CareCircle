import { NextResponse } from 'next/server';
import { getUserByPhone } from '@/lib/db';
import { checkRateLimit, recordFailedAttempt, createAndStoreOtp } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const { phone, purpose = 'login' } = await req.json();

    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const rateLimitKey = `otp_send:${cleanPhone}`;

    // Rate limiting: max 3 requests per 10 minutes
    const rateStatus = checkRateLimit(rateLimitKey, 3, 10 * 60 * 1000);
    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          error: `Too many OTP requests. Please wait ${Math.ceil((rateStatus.retryAfterSec || 600) / 60)} minutes before requesting another code.`
        },
        { status: 429 }
      );
    }

    // STRICT CHECK: IF LOGIN, ACCOUNT MUST EXIST!
    if (purpose === 'login') {
      const existingUser = await getUserByPhone(cleanPhone);
      if (!existingUser) {
        return NextResponse.json(
          {
            error: 'No account registered with this mobile number. Please sign up first.',
            notFound: true,
            code: 'ACCOUNT_NOT_FOUND'
          },
          { status: 404 }
        );
      }
    }

    // IF SIGNUP, ACCOUNT MUST NOT ALREADY EXIST
    if (purpose === 'signup') {
      const existingUser = await getUserByPhone(cleanPhone);
      if (existingUser) {
        return NextResponse.json(
          {
            error: 'An account with this mobile number already exists. Please log in instead.',
            code: 'ACCOUNT_EXISTS'
          },
          { status: 409 }
        );
      }
    }

    recordFailedAttempt(rateLimitKey, 10 * 60 * 1000);
    const { code, expiresAt } = await createAndStoreOtp(cleanPhone, purpose);

    console.log(`[CareCircle SMS Gateway] OTP sent to +91 ${cleanPhone}: [${code}] (Expires at: ${expiresAt})`);

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to +91 ${cleanPhone.slice(-4).padStart(cleanPhone.length, '•')}`,
      devOtp: process.env.NODE_ENV !== 'production' ? code : undefined
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    return NextResponse.json({ error: 'Failed to dispatch verification code.' }, { status: 500 });
  }
}
