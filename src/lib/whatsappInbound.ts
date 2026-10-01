/**
 * Meta's WhatsApp webhook: delivery statuses for our messages, and what the
 * family sends back (button taps, STOP / START, any other text).
 *
 * Safe to receive twice (Meta retries): inbound messages are unique by their
 * WhatsApp id, and statuses only ever move forward.
 * Button taps only act on the message they were tapped on, and only when the
 * tapping number is the number we sent it to.
 */
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { newId } from './db';
import { WhatsAppConfig, getWhatsAppConfig, sendText, WA_PAYLOAD } from './whatsapp';
import { WA_REPLIES } from './familyMessages';
import { claimAndEmailFallback, NotifyDeps } from './familyNotify';
import { placeManualCall, DispatchDeps } from './callDispatch';

export interface InboundDeps extends NotifyDeps {
  now?: Date;
  /** Passed to placeManualCall for "Call again" (tests inject a fake Sarvam). */
  dispatch?: DispatchDeps;
}

export interface InboundSummary {
  statuses: number;
  messages: number;
  replies: number;
}

/** Hours between automatic "this number isn't read by a person" replies to one number. */
export const AUTO_REPLY_GAP_HOURS = 12;

const STATUS_RANK: Record<string, number> = { pending: 0, sent: 1, delivered: 2, read: 3, failed: 4 };
const STOP_WORDS = new Set(['stop', 'unsubscribe', 'stop all']);
const START_WORDS = new Set(['start', 'subscribe', 'unstop']);

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/** The account a WhatsApp number belongs to: its WhatsApp setting first, then the account phone. */
async function findUserByPhone(e164: string) {
  const pref = await prisma.notificationPreferences.findFirst({ where: { whatsappNumber: e164 }, select: { userId: true } });
  if (pref) return prisma.user.findUnique({ where: { id: pref.userId } });
  return prisma.user.findFirst({ where: { phone: e164 } });
}

async function reply(
  cfg: WhatsAppConfig | null,
  inbound: { id: string; phone: string; userId: string | null },
  text: string,
  deps: InboundDeps,
  kind: 'reply' | 'auto_reply' = 'reply'
): Promise<boolean> {
  if (!cfg) return false;
  const row = await prisma.whatsAppMessage.create({
    data: {
      id: newId('wam'),
      userId: inbound.userId,
      kind,
      refKey: `reply:${inbound.id}`,
      phone: inbound.phone,
      body: text
    }
  });
  try {
    const { messageId } = await sendText(cfg, inbound.phone, text, deps.fetchImpl);
    await prisma.whatsAppMessage.update({ where: { id: row.id }, data: { status: 'sent', providerMessageId: messageId } });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    await prisma.whatsAppMessage.update({ where: { id: row.id }, data: { status: 'failed', error: message.slice(0, 300) } });
    console.error('[whatsapp] Reply failed:', message);
    return false;
  }
}

async function handleStatus(st: Obj, deps: InboundDeps): Promise<boolean> {
  const id = str(st.id);
  const status = str(st.status);
  if (!id || !(status in STATUS_RANK)) return false;
  const row = await prisma.whatsAppMessage.findUnique({ where: { providerMessageId: id } });
  if (!row) return false;

  const err = obj(arr(st.errors)[0]);
  const errorText = status === 'failed'
    ? `${err.code ?? ''} ${str(err.title) || str(err.message)}`.trim().slice(0, 300) || 'failed'
    : undefined;
  const moved = await prisma.whatsAppMessage.updateMany({
    where: { id: row.id, status: { in: Object.keys(STATUS_RANK).filter(s => STATUS_RANK[s] < STATUS_RANK[status]) } },
    data: { status, ...(errorText ? { error: errorText } : {}) }
  });
  if (moved.count === 1 && status === 'failed' && row.level >= 3) {
    await claimAndEmailFallback(row.id, deps);
  }
  return moved.count === 1;
}

async function handleMessage(msg: Obj, cfg: WhatsAppConfig | null, deps: InboundDeps): Promise<number> {
  const waId = str(msg.id);
  const fromDigits = str(msg.from).replace(/\D/g, '');
  if (!waId || !fromDigits) return 0;
  const phone = `+${fromDigits}`;
  const type = str(msg.type);

  const payload =
    type === 'button' ? str(obj(msg.button).payload) || str(obj(msg.button).text)
    : type === 'interactive' ? str(obj(obj(msg.interactive).button_reply).id)
    : '';
  const text = type === 'text' ? str(obj(msg.text).body).trim() : '';

  // Meta re-delivers messages; the cheap check keeps the unique index (the backstop) out of the error log.
  if (await prisma.whatsAppMessage.findUnique({ where: { providerMessageId: waId }, select: { id: true } })) return 0;
  const user = await findUserByPhone(phone);
  let inbound;
  try {
    inbound = await prisma.whatsAppMessage.create({
      data: {
        id: newId('wam'),
        userId: user?.id || null,
        direction: 'in',
        kind: 'inbound',
        refKey: waId,
        phone,
        body: (payload ? `[button] ${str(obj(msg.button).text) || payload}` : text || `[${type || 'message'}]`).slice(0, 2000),
        providerMessageId: waId,
        status: 'received'
      }
    });
  } catch (err) {
    if (isUniqueViolation(err)) return 0; // Meta re-delivered it
    throw err;
  }
  // Numbers we don't know get no reply (keeps the number from answering spam).
  if (!user) return 0;
  const target = { id: inbound.id, phone, userId: user.id };

  // ---- button taps: act on the message the button belongs to
  if (payload === WA_PAYLOAD.ack || payload === WA_PAYLOAD.recall) {
    const contextId = str(obj(msg.context).id);
    const original = contextId ? await prisma.whatsAppMessage.findUnique({ where: { providerMessageId: contextId } }) : null;
    if (!original || original.direction !== 'out' || original.phone !== phone) return 0;

    if (payload === WA_PAYLOAD.ack) {
      if (!original.alertId) return 0;
      const done = await prisma.alertRecord.updateMany({
        where: { id: original.alertId, acknowledgedAt: null },
        data: { acknowledgedAt: deps.now || new Date(), status: 'resolved' }
      });
      return (await reply(cfg, target, done.count === 1 ? WA_REPLIES.acknowledged : WA_REPLIES.alreadyAcknowledged, deps)) ? 1 : 0;
    }

    if (!original.parentId || original.userId !== user.id) return 0;
    const parent = await prisma.parentProfile.findUnique({ where: { id: original.parentId }, select: { name: true } });
    const result = await placeManualCall(
      { parentId: original.parentId, ownerId: user.id, kind: 'manual' },
      { ...deps.dispatch, now: deps.now }
    );
    const text = result.ok ? WA_REPLIES.calling(parent?.name || 'your parent') : WA_REPLIES.callFailed(result.error);
    return (await reply(cfg, target, text, deps)) ? 1 : 0;
  }

  // ---- STOP / START
  const word = text.toLowerCase().replace(/[.!]+$/, '').trim();
  if (STOP_WORDS.has(word)) {
    await prisma.notificationPreferences.upsert({
      where: { userId: user.id },
      create: { userId: user.id, whatsapp: false, whatsappOptInAt: null },
      update: { whatsapp: false, whatsappOptInAt: null }
    });
    return (await reply(cfg, target, WA_REPLIES.stopped, deps)) ? 1 : 0;
  }
  if (START_WORDS.has(word)) {
    const now = deps.now || new Date();
    const number = user.phone === phone ? null : phone;
    await prisma.notificationPreferences.upsert({
      where: { userId: user.id },
      create: { userId: user.id, whatsapp: true, whatsappOptInAt: now, whatsappNumber: number },
      update: { whatsapp: true, whatsappOptInAt: now, whatsappNumber: number }
    });
    return (await reply(cfg, target, WA_REPLIES.started, deps)) ? 1 : 0;
  }

  // ---- anything else: point them to the dashboard, at most once per AUTO_REPLY_GAP_HOURS
  const since = new Date((deps.now || new Date()).getTime() - AUTO_REPLY_GAP_HOURS * 3600000);
  const recent = await prisma.whatsAppMessage.count({
    where: { phone, kind: 'auto_reply', createdAt: { gte: since } }
  });
  if (recent > 0) return 0;
  const appUrl = cfg?.appUrl || (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return (await reply(cfg, target, WA_REPLIES.autoReply(appUrl), deps, 'auto_reply')) ? 1 : 0;
}

export async function processWhatsAppWebhook(body: unknown, deps: InboundDeps = {}): Promise<InboundSummary> {
  const cfg = deps.whatsapp !== undefined ? deps.whatsapp : getWhatsAppConfig();
  const summary: InboundSummary = { statuses: 0, messages: 0, replies: 0 };
  for (const entry of arr(obj(body).entry)) {
    for (const change of arr(obj(entry).changes)) {
      const value = obj(obj(change).value);
      for (const st of arr(value.statuses)) {
        if (await handleStatus(obj(st), deps)) summary.statuses += 1;
      }
      for (const msg of arr(value.messages)) {
        summary.messages += 1;
        summary.replies += await handleMessage(obj(msg), cfg, deps);
      }
    }
  }
  return summary;
}
