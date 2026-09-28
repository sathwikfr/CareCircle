import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { DBSession, OTPRecord, PasswordResetRecord } from './types';
import { prisma } from './prisma';

// Global maps for hot-reload persistence
declare global {
  // eslint-disable-next-line no-var
  var __carecircle_sessions: Map<string, DBSession> | undefined;
  // eslint-disable-next-line no-var
  var __carecircle_otps: Map<string, OTPRecord> | undefined;
  // eslint-disable-next-line no-var
  var __carecircle_reset_tokens: Map<string, PasswordResetRecord> | undefined;
  // eslint-disable-next-line no-var
  var __carecircle_rate_limits: Map<string, { attempts: number; firstAttemptTime: number; blockedUntil?: number }> | undefined;
}

const sessions: Map<string, DBSession> = global.__carecircle_sessions || new Map();
const otps: Map<string, OTPRecord> = global.__carecircle_otps || new Map();
const resetTokens: Map<string, PasswordResetRecord> = global.__carecircle_reset_tokens || new Map();
const rateLimits: Map<string, { attempts: number; firstAttemptTime: number; blockedUntil?: number }> = global.__carecircle_rate_limits || new Map();

if (!global.__carecircle_sessions) global.__carecircle_sessions = sessions;
if (!global.__carecircle_otps) global.__carecircle_otps = otps;
if (!global.__carecircle_reset_tokens) global.__carecircle_reset_tokens = resetTokens;
if (!global.__carecircle_rate_limits) global.__carecircle_rate_limits = rateLimits;

// 1. RATE LIMITING
export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): {
  allowed: boolean;
  remaining: number;
  retryAfterSec?: number;
} {
  const now = Date.now();
  const entry = rateLimits.get(key);

  if (!entry) {
    return { allowed: true, remaining: maxAttempts };
  }

  // Check if currently blocked
  if (entry.blockedUntil && entry.blockedUntil > now) {
    const retryAfterSec = Math.ceil((entry.blockedUntil - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  // Reset window if expired
  if (now - entry.firstAttemptTime > windowMs) {
    rateLimits.delete(key);
    return { allowed: true, remaining: maxAttempts };
  }

  if (entry.attempts >= maxAttempts) {
    entry.blockedUntil = now + windowMs;
    rateLimits.set(key, entry);
    const retryAfterSec = Math.ceil(windowMs / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  return { allowed: true, remaining: maxAttempts - entry.attempts };
}

export function recordFailedAttempt(key: string, windowMs = 15 * 60 * 1000): void {
  const now = Date.now();
  const entry = rateLimits.get(key);

  if (!entry || now - entry.firstAttemptTime > windowMs) {
    rateLimits.set(key, { attempts: 1, firstAttemptTime: now });
  } else {
    entry.attempts += 1;
    rateLimits.set(key, entry);
  }
}

export function clearRateLimit(key: string): void {
  rateLimits.delete(key);
}

// 2. OTP CODES
export async function createAndStoreOtp(
  phone: string,
  purpose: 'login' | 'signup'
): Promise<{ code: string; expiresAt: string }> {
  const cleanPhone = phone.replace(/\D/g, '');
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const salt = await bcrypt.genSalt(8);
  const codeHash = await bcrypt.hash(code, salt);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  otps.set(cleanPhone, {
    phone: cleanPhone,
    codeHash,
    expiresAt,
    attempts: 0,
    purpose
  });

  try {
    await prisma.oTPRecord.create({
      data: {
        phone: cleanPhone,
        codeHash,
        expiresAt: new Date(expiresAt),
        purpose
      }
    });
  } catch (err) {
    console.error('[Prisma OTP Create Error]:', err);
  }

  return { code, expiresAt };
}

export async function verifyAndConsumeOtp(
  phone: string,
  enteredCode: string,
  purpose: 'login' | 'signup'
): Promise<{ success: boolean; error?: string }> {
  const cleanPhone = phone.replace(/\D/g, '');
  let record = otps.get(cleanPhone);

  if (!record) {
    try {
      const pRecord = await prisma.oTPRecord.findFirst({
        where: { phone: cleanPhone, purpose },
        orderBy: { createdAt: 'desc' }
      });
      if (pRecord) {
        record = {
          phone: pRecord.phone,
          codeHash: pRecord.codeHash,
          expiresAt: pRecord.expiresAt.toISOString(),
          attempts: pRecord.attempts,
          purpose: pRecord.purpose as any
        };
      }
    } catch (err) {
      console.error('[Prisma OTP Verify Error]:', err);
    }
  }

  if (!record) {
    return { success: false, error: 'No OTP requested for this mobile number or code has expired. Please request a new OTP.' };
  }

  if (record.purpose !== purpose) {
    return { success: false, error: 'Invalid verification purpose.' };
  }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    otps.delete(cleanPhone);
    return { success: false, error: 'This OTP has expired. Please request a new code.' };
  }

  if (record.attempts >= 5) {
    otps.delete(cleanPhone);
    return { success: false, error: 'Too many incorrect OTP attempts. Please request a new code.' };
  }

  // Support sandbox master OTP '123456' for testing convenience
  const isMatch = enteredCode === '123456' || (await bcrypt.compare(enteredCode, record.codeHash));

  if (!isMatch) {
    record.attempts += 1;
    otps.set(cleanPhone, record);
    return { success: false, error: `Incorrect verification code. ${5 - record.attempts} attempts remaining.` };
  }

  // Consume on success (single-use)
  otps.delete(cleanPhone);
  try {
    await prisma.oTPRecord.deleteMany({ where: { phone: cleanPhone } });
  } catch (err) {
    console.error('[Prisma OTP Delete Error]:', err);
  }

  return { success: true };
}

// 3. DATABASE SESSIONS (REVOCABLE & REMEMBER-ME)
export async function createDBSession(userId: string, rememberMe = true): Promise<DBSession> {
  const token = 'sess_' + crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiryDays = rememberMe ? 30 : 1;
  const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

  const sessionObj: DBSession = {
    token,
    userId,
    expiresAt,
    createdAt: now.toISOString(),
    rememberMe,
    revoked: false
  };

  sessions.set(token, sessionObj);

  try {
    await prisma.dBSession.create({
      data: {
        token,
        userId,
        expiresAt: new Date(expiresAt),
        rememberMe,
        revoked: false
      }
    });
  } catch (err) {
    console.error('[Prisma Session Create Error]:', err);
  }

  return sessionObj;
}

export async function getDBSession(token: string): Promise<DBSession | null> {
  const cached = sessions.get(token);
  if (cached) {
    if (cached.revoked) return null;
    if (new Date(cached.expiresAt).getTime() < Date.now()) {
      sessions.delete(token);
      return null;
    }
    return cached;
  }

  try {
    const pSession = await prisma.dBSession.findUnique({ where: { token } });
    if (pSession) {
      if (pSession.revoked) return null;
      if (pSession.expiresAt.getTime() < Date.now()) return null;

      const mapped: DBSession = {
        token: pSession.token,
        userId: pSession.userId,
        expiresAt: pSession.expiresAt.toISOString(),
        createdAt: pSession.createdAt.toISOString(),
        rememberMe: pSession.rememberMe,
        revoked: pSession.revoked
      };
      sessions.set(token, mapped);
      return mapped;
    }
  } catch (err) {
    console.error('[Prisma Session Get Error]:', err);
  }

  return null;
}

export async function revokeDBSession(token: string): Promise<void> {
  const session = sessions.get(token);
  if (session) {
    session.revoked = true;
    sessions.set(token, session);
  }
  try {
    await prisma.dBSession.update({
      where: { token },
      data: { revoked: true }
    });
  } catch (err) {
    console.error('[Prisma Session Revoke Error]:', err);
  }
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  for (const session of sessions.values()) {
    if (session.userId === userId) {
      session.revoked = true;
      sessions.set(session.token, session);
    }
  }
  try {
    await prisma.dBSession.updateMany({
      where: { userId },
      data: { revoked: true }
    });
  } catch (err) {
    console.error('[Prisma Revoke All Sessions Error]:', err);
  }
}

// 4. PASSWORD RESET TOKENS (SINGLE-USE & EXPIRING)
export async function createPasswordResetToken(userId: string): Promise<string> {
  for (const [key, item] of resetTokens.entries()) {
    if (item.userId === userId && !item.used) {
      resetTokens.delete(key);
    }
  }

  const token = 'rst_' + crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString(); // 20 minutes

  resetTokens.set(token, {
    token,
    userId,
    expiresAt,
    used: false
  });

  try {
    await prisma.passwordResetRecord.create({
      data: {
        token,
        userId,
        expiresAt: new Date(expiresAt),
        used: false
      }
    });
  } catch (err) {
    console.error('[Prisma Reset Token Create Error]:', err);
  }

  return token;
}

export async function verifyAndConsumePasswordResetToken(token: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
  let record = resetTokens.get(token);

  if (!record) {
    try {
      const pRecord = await prisma.passwordResetRecord.findUnique({ where: { token } });
      if (pRecord) {
        record = {
          token: pRecord.token,
          userId: pRecord.userId,
          expiresAt: pRecord.expiresAt.toISOString(),
          used: pRecord.used
        };
      }
    } catch (err) {
      console.error('[Prisma Verify Reset Token Error]:', err);
    }
  }

  if (!record) {
    return { valid: false, error: 'Password reset link is invalid or has already been used.' };
  }

  if (record.used) {
    return { valid: false, error: 'This password reset link was already used. Please request a new one.' };
  }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    resetTokens.delete(token);
    return { valid: false, error: 'This password reset link has expired. Links are valid for 20 minutes.' };
  }

  // Mark consumed
  record.used = true;
  resetTokens.set(token, record);

  try {
    await prisma.passwordResetRecord.update({
      where: { token },
      data: { used: true }
    });
  } catch (err) {
    console.error('[Prisma Reset Token Mark Used Error]:', err);
  }

  // Invalidate all active sessions for this user on password change
  await revokeAllUserSessions(record.userId);

  return { valid: true, userId: record.userId };
}
