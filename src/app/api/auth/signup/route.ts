import { NextResponse } from 'next/server';
import { createUser } from '@/lib/db';
import { hashPassword, AUTH_COOKIE_NAME } from '@/lib/auth';
import { createDBSession, verifySignupEmailCode } from '@/lib/security';
import { checkNewAccount } from '@/lib/signupChecks';
import { PLANS } from '@/lib/plans';
import { PlanId } from '@/lib/types';

/**
 * Email signup, step 2: create the account once the code from
 * /api/auth/signup/send-code is entered.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password, planId, code } = body;

    const check = await checkNewAccount(body);
    if (!check.ok) return check.response;

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
      return NextResponse.json(
        { error: 'Please enter the 6-digit code we emailed you.', code: 'CODE_REQUIRED' },
        { status: 400 }
      );
    }

    const verified = await verifySignupEmailCode(check.email, code.trim());
    if (!verified.success) {
      return NextResponse.json({ error: verified.error, code: 'CODE_INVALID' }, { status: 400 });
    }

    const user = await createUser({
      name: check.name,
      email: check.email,
      phone: check.phone,
      passwordHash: await hashPassword(password),
      // Only the Free plan is granted at signup; paid plans require checkout.
      planId: planId && PLANS[planId as PlanId] ? (planId as PlanId) : undefined,
      // Proven by the emailed code above.
      emailVerified: true
    });

    const session = await createDBSession(user.id, true);

    const response = NextResponse.json({ success: true, user });
    response.cookies.set(AUTH_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60
    });
    return response;
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
