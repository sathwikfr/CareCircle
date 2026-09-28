import { NextResponse } from 'next/server';
import { getUserByEmailOrPhone } from '@/lib/db';
import { comparePassword, AUTH_COOKIE_NAME } from '@/lib/auth';
import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  createDBSession
} from '@/lib/security';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { emailOrPhone, password, rememberMe = true } = body;

    if (!emailOrPhone || !emailOrPhone.trim()) {
      return NextResponse.json({ error: 'Please enter your registered email address or mobile number.' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Please enter your password.' }, { status: 400 });
    }

    const cleanIdentifier = emailOrPhone.trim().toLowerCase();
    const rateLimitKey = `login:${cleanIdentifier}`;

    // 1. Rate Limiting Check (5 attempts in 15 minutes)
    const rateStatus = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed login attempts. For security, this account is temporarily locked. Please try again in ${Math.ceil((rateStatus.retryAfterSec || 900) / 60)} minutes or reset your password.`,
          code: 'RATE_LIMITED',
          retryAfterSec: rateStatus.retryAfterSec
        },
        { status: 429 }
      );
    }

    // 2. Strict Account Existence Check: NEVER create user on login!
    const userWithHash = getUserByEmailOrPhone(cleanIdentifier);
    if (!userWithHash) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        {
          error: 'No account found with this email or phone number. Would you like to sign up instead?',
          code: 'ACCOUNT_NOT_FOUND',
          notFound: true,
          enteredIdentifier: cleanIdentifier
        },
        { status: 404 }
      );
    }

    // 3. Verify Password
    if (!userWithHash.passwordHash) {
      if (process.env.NODE_ENV !== 'production' && password) {
        const { hashPassword } = await import('@/lib/auth');
        const { updateUserPasswordHash } = await import('@/lib/db');
        const newHash = await hashPassword(password);
        updateUserPasswordHash(userWithHash.id, newHash);
        userWithHash.passwordHash = newHash;
      } else {
        return NextResponse.json(
          {
            error: 'This account was created with Google or Phone OTP. Please log in using that method or set a password.',
            code: 'AUTH_METHOD_MISMATCH',
            accountEmail: userWithHash.email
          },
          { status: 401 }
        );
      }
    }

    const isPasswordValid = await comparePassword(password, userWithHash.passwordHash);
    // Allow Password123 for demo seeded accounts in dev mode
    const isDevMatch = process.env.NODE_ENV !== 'production' && password === 'Password123';

    if (!isPasswordValid && !isDevMatch) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        {
          error: 'Incorrect password. Please verify your credentials or click "Forgot password?" to receive a reset link.',
          code: 'INCORRECT_PASSWORD'
        },
        { status: 401 }
      );
    }

    // 4. Success: Clear rate limit, create database-backed session
    clearRateLimit(rateLimitKey);

    const session = createDBSession(userWithHash.id, rememberMe);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...user } = userWithHash;

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully',
      user,
      sessionToken: session.token
    });

    const maxAgeSeconds = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days vs 1 day

    response.cookies.set(AUTH_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeSeconds
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred during login.' }, { status: 500 });
  }
}
