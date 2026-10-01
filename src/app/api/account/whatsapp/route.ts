import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/phone';
import { getWhatsAppConfig } from '@/lib/whatsapp';

/** WhatsApp call updates for the logged-in account: status, opt in, opt out. */
async function status(userId: string, accountPhone: string) {
  const prefs = await prisma.notificationPreferences.findUnique({ where: { userId } });
  const optedIn = !!prefs?.whatsappOptInAt && prefs.whatsapp !== false;
  return {
    available: !!getWhatsAppConfig(),
    optedIn,
    optedInAt: optedIn ? prefs!.whatsappOptInAt!.toISOString() : null,
    number: prefs?.whatsappNumber || accountPhone || ''
  };
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  return NextResponse.json({ success: true, whatsapp: await status(auth.user.id, auth.user.phone) });
}

/** Body: { optIn: boolean, number?: string }. Opting in needs a valid number and records when consent was given. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let body: { optIn?: unknown; number?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const userId = auth.user.id;

  if (body.optIn !== true) {
    await prisma.notificationPreferences.upsert({
      where: { userId },
      create: { userId, whatsapp: false, whatsappOptInAt: null },
      update: { whatsapp: false, whatsappOptInAt: null }
    });
    return NextResponse.json({ success: true, whatsapp: await status(userId, auth.user.phone) });
  }

  const raw = typeof body.number === 'string' && body.number.trim() ? body.number : auth.user.phone;
  const phone = normalizePhone(raw || '');
  if (!phone.ok) {
    return NextResponse.json({ error: raw ? phone.reason : 'Add your WhatsApp number first.' }, { status: 400 });
  }
  const number = phone.e164 === auth.user.phone ? null : phone.e164;
  await prisma.notificationPreferences.upsert({
    where: { userId },
    create: { userId, whatsapp: true, whatsappOptInAt: new Date(), whatsappNumber: number },
    update: { whatsapp: true, whatsappOptInAt: new Date(), whatsappNumber: number }
  });
  return NextResponse.json({ success: true, whatsapp: await status(userId, auth.user.phone) });
}
