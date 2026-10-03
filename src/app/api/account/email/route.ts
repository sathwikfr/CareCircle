import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/access';
import { changeUserEmail, getUserPasswordHash } from '@/lib/db';
import { EMAIL_PATTERN } from '@/lib/emailCode';
import { sendEmailChangedNotice } from '@/lib/email';
import { verifyEmailChangeCode } from '@/lib/security';

/**
 * Email change, step 2: the code from /api/account/email/send-code proves the
 * new inbox is the user's, so the account switches to it (marked verified).
 * The old address gets a notice in case this wasn't them.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const { user } = auth;

    const { email, code } = await req.json();
    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    const newEmail = email.trim().toLowerCase();

    if (newEmail === user.email) {
      return NextResponse.json({ error: 'That is already the email on your account.' }, { status: 400 });
    }

    if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
      return NextResponse.json(
        { error: 'Please enter the 6-digit code we emailed you.', code: 'CODE_REQUIRED' },
        { status: 400 }
      );
    }

    const verified = await verifyEmailChangeCode(user.id, newEmail, code.trim());
    if (!verified.success) {
      return NextResponse.json({ error: verified.error, code: 'CODE_INVALID' }, { status: 400 });
    }

    const result = await changeUserEmail(user.id, newEmail);
    if (result === 'taken') {
      return NextResponse.json(
        { error: 'Another Aaptha account already uses this email.', code: 'EMAIL_TAKEN' },
        { status: 409 }
      );
    }
    if (!result) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    // Phone-OTP accounts start with a placeholder address that has no inbox.
    if (!result.previousEmail.endsWith('@carecircle.user')) {
      try {
        await sendEmailChangedNotice({ to: result.previousEmail, name: result.user.name, newEmail });
      } catch (err) {
        console.error('[Aaptha Email] Could not send the email-changed notice:', err);
      }
    }

    // Google sign-in finds the account by email, so a Google-only account
    // (no password) can't use Google with a different address any more.
    const hasPassword = Boolean(await getUserPasswordHash(user.id));
    const message = hasPassword
      ? `Your email is now ${newEmail}. Use it to log in from now on.`
      : `Your email is now ${newEmail}. Your account has no password yet, so log in with Google using this address, or use "Forgot password" on the login page to set one.`;

    return NextResponse.json({ success: true, message, user: result.user });
  } catch (err) {
    console.error('Email change confirm error:', err);
    return NextResponse.json({ error: 'Could not change your email. Please try again.' }, { status: 500 });
  }
}
