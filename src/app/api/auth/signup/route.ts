import { NextResponse } from 'next/server';
import { getUserByEmail, getUserByPhone, createUser } from '@/lib/db';
import { hashPassword, AUTH_COOKIE_NAME } from '@/lib/auth';
import { createDBSession } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, password, planId, isGoogle } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!isGoogle) {
      if (!phone || phone.replace(/\D/g, '').length < 10) {
        return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number.' }, { status: 400 });
      }

      if (!password || password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
      }
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        {
          error: 'An account with this email already exists. Please log in instead.',
          code: 'ACCOUNT_EXISTS'
        },
        { status: 409 }
      );
    }

    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    if (cleanPhone && cleanPhone.length >= 10) {
      const existingPhone = await getUserByPhone(cleanPhone);
      if (existingPhone) {
        return NextResponse.json(
          {
            error: 'An account with this mobile number already exists. Please log in instead.',
            code: 'ACCOUNT_EXISTS'
          },
          { status: 409 }
        );
      }
    }

    let passwordHash: string | undefined = undefined;
    if (password) {
      passwordHash = await hashPassword(password);
    }

    const user = await createUser({
      name: name.trim(),
      email: email.trim(),
      phone: phone || '+91 98000 00000',
      passwordHash,
      planId: planId || undefined
    });

    const session = await createDBSession(user.id, true);

    // Send Welcome & Verification Email
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { sendVerificationEmail } = await import('@/lib/email');
    sendVerificationEmail({
      to: user.email,
      name: user.name,
      verifyUrl: `${origin}/dashboard`
    }).catch(err => console.error('[CareCircle Signup] Failed to dispatch welcome email:', err));

    const response = NextResponse.json({
      success: true,
      user
    });

    const maxAgeSeconds = 30 * 24 * 60 * 60; // 30 days remember me
    response.cookies.set(AUTH_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeSeconds
    });

    return response;
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
