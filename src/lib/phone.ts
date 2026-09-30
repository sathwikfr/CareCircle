/**
 * src/lib/phone.ts
 *
 * E.164 phone normalisation for Aaptha.
 *
 * Rules (India-first, international-aware):
 *  - Strip spaces, dashes, dots, brackets, parentheses
 *  - Indian 10-digit numbers starting 6-9 → +91XXXXXXXXXX
 *  - Leading 0   (STD prefix)  → strip, validate remaining 10 digits
 *  - Leading 91  (country code without +) → +91 + remaining 10 digits
 *  - Leading +91 → keep, validate remaining 10 digits
 *  - Any other +CC format that is already valid E.164 (7-15 digits after +) → keep as-is
 *  - Wrong length, wrong start digit, non-numeric → ok:false with reason
 *
 * We NEVER truncate or guess — if we can't produce a valid number, we say why.
 */

export type NormaliseOk    = { ok: true;  e164: string };
export type NormaliseError = { ok: false; reason: string };
export type NormaliseResult = NormaliseOk | NormaliseError;

/**
 * Remove all formatting characters, keeping + only if it leads the string.
 */
function strip(raw: string): string {
  // Preserve a leading '+', strip everything except digits
  const hasPlus = raw.trimStart().startsWith('+');
  const digits  = raw.replace(/\D/g, '');
  return hasPlus ? '+' + digits : digits;
}

/**
 * Validate an Indian 10-digit mobile number (starts with 6-9).
 */
function isValidIndian10(digits: string): boolean {
  return digits.length === 10 && /^[6-9]/.test(digits);
}

export function normalizePhone(input: string): NormaliseResult {
  if (!input || !input.trim()) {
    return { ok: false, reason: 'Phone number is required.' };
  }

  const stripped = strip(input.trim());

  // ── Already in +CC format ──────────────────────────────────────────────────
  if (stripped.startsWith('+')) {
    const afterPlus = stripped.slice(1); // digits only

    // +91XXXXXXXXXX — Indian number: must be exactly 12 digits (91 + 10 local)
    if (afterPlus.startsWith('91')) {
      if (afterPlus.length !== 12) {
        return {
          ok: false,
          reason: `"+${afterPlus}" looks like an Indian number (+91) but has ${afterPlus.length - 2} local digits instead of 10. Please check the number.`
        };
      }
      const local = afterPlus.slice(2); // 10 digits
      if (!isValidIndian10(local)) {
        return {
          ok: false,
          reason: `Invalid Indian number after +91: "${local}" must be 10 digits starting with 6-9.`
        };
      }
      return { ok: true, e164: `+91${local}` };
    }

    // Other international: E.164 requires 7–15 digits total after +
    if (afterPlus.length >= 7 && afterPlus.length <= 15 && /^\d+$/.test(afterPlus)) {
      return { ok: true, e164: stripped };
    }

    return {
      ok: false,
      reason: `"${input}" doesn't look like a valid international number. Expected + followed by 7-15 digits.`
    };
  }

  // ── Pure digits (no +) ────────────────────────────────────────────────────
  const digits = stripped; // no leading +

  // 91XXXXXXXXXX — country code without + (12 digits total)
  if (digits.startsWith('91') && digits.length === 12) {
    const local = digits.slice(2);
    if (!isValidIndian10(local)) {
      return {
        ok: false,
        reason: `Invalid Indian number after 91: "${local}" must be 10 digits starting with 6-9.`
      };
    }
    return { ok: true, e164: `+91${local}` };
  }

  // 0XXXXXXXXXX — STD prefix (11 digits)
  if (digits.startsWith('0') && digits.length === 11) {
    const local = digits.slice(1);
    if (!isValidIndian10(local)) {
      return {
        ok: false,
        reason: `Invalid Indian number after STD 0: "${local}" must be 10 digits starting with 6-9.`
      };
    }
    return { ok: true, e164: `+91${local}` };
  }

  // XXXXXXXXXX — bare 10-digit Indian number
  if (digits.length === 10) {
    if (!isValidIndian10(digits)) {
      return {
        ok: false,
        reason: `"${digits}" is 10 digits but doesn't start with 6-9. Indian mobile numbers must start with 6, 7, 8, or 9.`
      };
    }
    return { ok: true, e164: `+91${digits}` };
  }

  // Wrong length — give a precise message
  if (digits.length < 10) {
    return {
      ok: false,
      reason: `"${input}" has only ${digits.length} digit${digits.length === 1 ? '' : 's'} — too short. Indian mobile numbers need 10 digits.`
    };
  }

  if (digits.length === 11 && !digits.startsWith('0')) {
    return {
      ok: false,
      reason: `"${input}" has 11 digits but doesn't start with 0 (STD) or 91 (country code). Please check the number.`
    };
  }

  return {
    ok: false,
    reason: `"${input}" has ${digits.length} digits. Can't determine the country code. Please include + prefix (e.g. +918309426043).`
  };
}

/**
 * Convenience: returns the E.164 string or throws with the reason.
 * Use in server-side code where you want to throw on invalid input.
 */
export function normalizePhoneOrThrow(input: string): string {
  const result = normalizePhone(input);
  if (!result.ok) throw new Error(result.reason);
  return result.e164;
}
