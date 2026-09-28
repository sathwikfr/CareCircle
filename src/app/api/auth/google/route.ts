import { NextResponse } from 'next/server';
import { getUserByEmail, createUser } from '@/lib/db';
import { AUTH_COOKIE_NAME } from '@/lib/auth';
import { createDBSession } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const { email, name, mode = 'login', rememberMe = true } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid Google email is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. LOGIN MODE: Account MUST already exist!
    if (mode === 'login') {
      const existingUser = await getUserByEmail(cleanEmail);
      if (!existingUser) {
        return NextResponse.json(
          {
            error: `No CareCircle account is registered with ${cleanEmail}. Would you like to create an account?`,
            notFound: true,
            code: 'ACCOUNT_NOT_FOUND',
            enteredEmail: cleanEmail
          },
          { status: 404 }
        );
      }

      // Success: Create session for existing user
      const session = await createDBSession(existingUser.id, rememberMe);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...user } = existingUser;

      const response = NextResponse.json({
        success: true,
        message: 'Logged in successfully with Google',
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

    // 2. SIGNUP MODE: Creates account
    if (mode === 'signup') {
      const existingUser = await getUserByEmail(cleanEmail);
      if (existingUser) {
        return NextResponse.json(
          {
            error: `An account for ${cleanEmail} already exists. Please log in instead.`,
            code: 'ACCOUNT_EXISTS'
          },
          { status: 409 }
        );
      }

      const newUser = await createUser({
        name: name || cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: '+91 98765 00000',
        planId: 'family'
      });
      newUser.emailVerified = true;

      const session = await createDBSession(newUser.id, rememberMe);

      const response = NextResponse.json({
        success: true,
        message: 'Account created with Google',
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

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  } catch (err) {
    console.error('Google auth error:', err);
    return NextResponse.json({ error: 'Google authentication failed' }, { status: 500 });
  }
}
