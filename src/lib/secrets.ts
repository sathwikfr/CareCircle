import crypto from 'crypto';

/** Constant-time string comparison; false when either side is missing. */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Reads a secret from `Authorization: Bearer …` or the given header name. */
export function requestSecret(req: Request, headerName: string): string | null {
  const auth = req.headers.get('authorization');
  if (auth && /^bearer /i.test(auth)) return auth.slice(7).trim();
  return req.headers.get(headerName);
}
