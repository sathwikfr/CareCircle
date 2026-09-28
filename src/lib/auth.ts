import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { User } from './types';
import { getDBSession } from './security';
import { getUserById } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'carecircle-secret-key-development-secure-token-2025';
export const AUTH_COOKIE_NAME = 'carecircle_session';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function signToken(payload: { userId: string; email: string; name: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): { userId: string; email: string; name: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; name: string };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    // 1. Check DB-backed session token
    if (token.startsWith('sess_')) {
      const dbSession = await getDBSession(token);
      if (!dbSession) return null; // Revoked or expired session
      return await getUserById(dbSession.userId);
    }

    // 2. Check JWT token
    const payload = verifyToken(token);
    if (!payload) return null;

    return await getUserById(payload.userId);
  } catch {
    return null;
  }
}
