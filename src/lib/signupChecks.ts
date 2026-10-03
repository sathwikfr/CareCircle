import { NextResponse } from 'next/server';
import { getUserByEmail, isPhoneRegistered } from './db';
import { normalizePhone } from './phone';
import { EMAIL_PATTERN } from './emailCode';

export type NewAccountCheck =
  | { ok: true; name: string; email: string; phone: string }
  | { ok: false; response: NextResponse };

function reject(status: number, error: string, extra: Record<string, string> = {}): NewAccountCheck {
  return { ok: false, response: NextResponse.json({ error, ...extra }, { status }) };
}

/**
 * Shared by both email-signup steps (send the code, then create the account):
 * valid name, email and phone, and neither the email nor the phone is taken.
 * `field` on ACCOUNT_EXISTS says which one matched, so "Log in instead" can
 * prefill it.
 */
export async function checkNewAccount(body: { name?: unknown; email?: unknown; phone?: unknown }): Promise<NewAccountCheck> {
  const { name, email, phone } = body;

  if (typeof name !== 'string' || !name.trim()) {
    return reject(400, 'Please enter your full name.');
  }

  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    return reject(400, 'Please enter a valid email address.');
  }

  if (typeof phone !== 'string' || !phone.trim()) {
    return reject(400, 'Please enter a valid mobile number.');
  }
  const phoneResult = normalizePhone(phone);
  if (!phoneResult.ok) {
    return reject(400, phoneResult.reason);
  }

  const cleanEmail = email.trim().toLowerCase();

  if (await getUserByEmail(cleanEmail)) {
    return reject(409, 'An account with this email already exists. Please log in instead.', {
      code: 'ACCOUNT_EXISTS',
      field: 'email'
    });
  }

  if (await isPhoneRegistered(phoneResult.e164)) {
    return reject(409, 'An account with this mobile number already exists. Please log in instead.', {
      code: 'ACCOUNT_EXISTS',
      field: 'phone'
    });
  }

  return { ok: true, name: name.trim(), email: cleanEmail, phone: phoneResult.e164 };
}
