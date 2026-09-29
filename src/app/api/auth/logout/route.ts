import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getSessionToken } from '@/lib/auth';
import { revokeDBSession } from '@/lib/security';

export async function POST() {
  const token = await getSessionToken();
  if (token) {
    try {
      await revokeDBSession(token);
    } catch (err) {
      console.error('[logout] Failed to revoke session:', err);
    }
  }
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}
