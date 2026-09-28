import { NextResponse } from 'next/server';
import { verifyAndConsumePasswordResetToken } from '@/lib/security';
import { hashPassword } from '@/lib/auth';
import { getUserById } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Reset token is required.' }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    // Verify and consume token (enforces single-use and expiry)
    const verification = verifyAndConsumePasswordResetToken(token);
    if (!verification.valid || !verification.userId) {
      return NextResponse.json({ error: verification.error || 'Invalid or expired reset token.' }, { status: 400 });
    }

    const user = getUserById(verification.userId);
    if (!user) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    // Hash new password and update in database
    const newHash = await hashPassword(newPassword);
    const { updateUserPasswordHash } = await import('@/lib/db');
    updateUserPasswordHash(user.id, newHash);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. All active sessions have been signed out for security. Please log in with your new password.'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Failed to reset password.' }, { status: 500 });
  }
}
