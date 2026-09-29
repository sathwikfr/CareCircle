import { NextResponse } from 'next/server';
import { getSessionUser } from './auth';
import { getParentById } from './db';
import { ParentProfile, User } from './types';

type Denied = { ok: false; response: NextResponse };

export async function requireUser(): Promise<{ ok: true; user: User } | Denied> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 }) };
  }
  return { ok: true, user };
}

/**
 * Loads a parent profile and verifies the logged-in user owns it.
 * Every /api/parents/[id]/* route must go through this.
 */
export async function requireOwnedParent(
  parentId: string
): Promise<{ ok: true; user: User; parent: ParentProfile } | Denied> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parent = await getParentById(parentId);
  // Same response for "missing" and "someone else's" so ids can't be probed.
  if (!parent || parent.userId !== auth.user.id) {
    return { ok: false, response: NextResponse.json({ error: 'Parent profile not found.' }, { status: 404 }) };
  }
  return { ok: true, user: auth.user, parent };
}

