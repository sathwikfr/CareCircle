import { NextResponse } from 'next/server';
import { getUserByPhone, createUser } from '@/lib/db';
import { AUTH_COOKIE_NAME } from '@/lib/auth';
import { verifyAndConsumeOtp, createDBSession } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const { phone, code, purpose = 'login', name, rememberMe = true } = await req.json();

    if (!phone || !code) {
      return NextResponse.json({ error: 'Mobile number and verification code are required.' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    // 1. Strict Existence Check for Login
    if (purpose === 'login') {
      const existingUser = getUserByPhone(cleanPhone);
      if (!existingUser) {
        return NextResponse.json(
          {
            error: 'No account registered with this phone number. Please sign up first.',
            notFound: true,
            code: 'ACCOUNT_NOT_FOUND'
          },
          { status: 404 }
        );
      }

      // Verify OTP code
      const verifyResult = await verifyAndConsumeOtp(cleanPhone, code.trim(), 'login');
      if (!verifyResult.success) {
        return NextResponse.json({ error: verifyResult.error }, { status: 400 });
      }

      // Success: Create DB Session
      const session = createDBSession(existingUser.id, rememberMe);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...user } = existingUser;

      const response = NextResponse.json({
        success: true,
        message: 'Logged in successfully via OTP verification',
        user
      });

      const maxAgeSeconds = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
      response.cookies.set(AUTH_COOKIE_NAME, session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: maxAgeSeconds
      });

      return response;
    }

    // 2. Signup Verification
    if (purpose === 'signup') {
      const existingUser = getUserByPhone(cleanPhone);
      if (existingUser) {
        return NextResponse.json(
          { error: 'An account with this mobile number already exists. Please log in instead.' },
          { status: 409 }
        );
      }

      const verifyResult = await verifyAndConsumeOtp(cleanPhone, code.trim(), 'signup');
      if (!verifyResult.success) {
        return NextResponse.json({ error: verifyResult.error }, { status: 400 });
      }

      // Create new user (Sign up action only)
      const newUser = createUser({
        name: name || 'Caregiver',
        email: `${cleanPhone}@carecircle.user`,
        phone: `+91 ${cleanPhone}`,
        planId: 'family'
      });
      newUser.phoneVerified = true;

      const session = createDBSession(newUser.id, rememberMe);

      const response = NextResponse.json({
        success: true,
        message: 'Account created and verified successfully',
        user: newUser
      });

      const maxAgeSeconds = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
      response.cookies.set(AUTH_COOKIE_NAME, session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: maxAgeSeconds
      });

      return response;
    }

    return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 });
  }
}
