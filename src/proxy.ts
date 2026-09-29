import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Optimistic page guard: signed-out visitors are sent to /login before a
 * protected page renders. This only checks that a session cookie is present;
 * real authorization happens in every API route (lib/access.ts), which
 * validates the session against the database.
 */
const SESSION_COOKIE = 'carecircle_session';

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token && token.startsWith('sess_')) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/account/:path*', '/checkout/:path*']
};
