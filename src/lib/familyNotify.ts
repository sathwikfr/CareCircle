/**
 * Tells the family about a call. Call-related news goes to WhatsApp, one
 * message per call; email is only for account and billing.
 *
 *  - WhatsApp configured + family opted in: one WhatsApp message (familyMessages.ts
 *    picks it). If a level 3-4 message can't be delivered (now, or later via the
 *    status webhook), the owner gets an email instead: the one safety exception.
 *  - WhatsApp configured but the family hasn't opted in: level 3-4 alerts are emailed.
 *  - WhatsApp NOT configured (until Meta is set up): alert emails exactly as before,
 *    so families never go from getting something to getting nothing.
 */
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { newId } from './db';
import { normalizePhone } from './phone';
import { sendUrgentAlertEmail } from './email';
import { WhatsAppConfig, getWhatsAppConfig, sendTemplate, WHATSAPP_TEMPLATES } from './whatsapp';
import { NotifyAlert, planFamilyMessage } from './familyMessages';

export interface NotifyDeps {
  sendEmail?: typeof sendUrgentAlertEmail;
  /** undefined = read the environment; null = WhatsApp off (tests). */
  whatsapp?: WhatsAppConfig | null;
  fetchImpl?: typeof fetch;
}

export interface NotifyResult {
  whatsapp: 'sent' | 'failed' | 'duplicate' | 'not_wanted' | 'not_opted_in' | 'not_configured';
  emailed: number;
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

async function loadParent(parentId: string) {
  return prisma.parentProfile.findUnique({
    where: { id: parentId },
    include: { user: { include: { notificationPreferences: true } }, caregivers: true }
  });
}
type LoadedParent = NonNullable<Awaited<ReturnType<typeof loadParent>>>;

/** The family's WhatsApp number, or null when they haven't opted in. */
export function whatsappRecipient(user: LoadedParent['user']): string | null {
  const prefs = user.notificationPreferences;
  if (!prefs?.whatsappOptInAt || prefs.whatsapp === false) return null;
  const phone = normalizePhone(prefs.whatsappNumber || user.phone || '');
  return phone.ok ? phone.e164 : null;
}

async function emailAlerts(parent: LoadedParent, alerts: NotifyAlert[], deps: NotifyDeps): Promise<number> {
  const sendEmail = deps.sendEmail || sendUrgentAlertEmail;
  const recipients = new Map<string, string>([[parent.user.email, parent.user.name]]);
  for (const cg of parent.caregivers) {
    if (cg.status === 'accepted' && cg.role === 'co_manager') recipients.set(cg.email, cg.name);
  }
  let emailed = 0;
  for (const alert of alerts) {
    let sentThisAlert = false;
    for (const [to, name] of recipients) {
      try {
        const res = await sendEmail({
          to,
          name,
          parentName: parent.name,
          alertLevel: alert.level >= 3 ? 'level_3' : 'level_2',
          alertType: alert.title,
          summary: alert.message,
          actionUrl: `${appUrl()}/dashboard`
        });
        if (res.success) {
          emailed += 1;
          sentThisAlert = true;
        } else console.error(`[notify] Email to ${to} failed: ${res.error}`);
      } catch (err) {
        console.error(`[notify] Email to ${to} threw:`, err);
      }
    }
    if (sentThisAlert) await prisma.alertRecord.update({ where: { id: alert.id }, data: { channel: 'email' } });
  }
  return emailed;
}

/** Level 3-4 alerts of a call, emailed when WhatsApp can't carry them. */
async function emailSafetyFallback(parent: LoadedParent, alerts: NotifyAlert[], deps: NotifyDeps): Promise<number> {
  const prefs = parent.user.notificationPreferences;
  if (prefs && prefs.email === false) return 0;
  const serious = alerts.filter(a => a.level >= 3);
  return serious.length ? emailAlerts(parent, serious, deps) : 0;
}

export async function notifyFamily(
  input: { parentId: string; callLogId: string | null; alerts: NotifyAlert[]; update?: string | null },
  deps: NotifyDeps = {}
): Promise<NotifyResult> {
  const parent = await loadParent(input.parentId);
  if (!parent) return { whatsapp: 'not_wanted', emailed: 0 };
  const prefs = parent.user.notificationPreferences;
  const minLevel = prefs ? prefs.minimumAlertLevel : 1;

  const cfg = deps.whatsapp !== undefined ? deps.whatsapp : getWhatsAppConfig();
  if (!cfg) {
    // Before WhatsApp is live: the original alert emails (level 2+, within the family's settings).
    const emailAllowed = prefs ? prefs.email : true;
    const wanted = input.alerts.filter(a => a.level >= 2 && a.level >= minLevel);
    const emailed = emailAllowed && wanted.length ? await emailAlerts(parent, wanted, deps) : 0;
    return { whatsapp: 'not_configured', emailed };
  }

  const plan = planFamilyMessage({
    parentName: parent.name,
    parentPhone: parent.phone,
    alerts: input.alerts,
    update: input.update,
    minimumAlertLevel: minLevel
  });
  if (!plan) return { whatsapp: 'not_wanted', emailed: 0 };

  const to = whatsappRecipient(parent.user);
  if (!to) return { whatsapp: 'not_opted_in', emailed: await emailSafetyFallback(parent, input.alerts, deps) };

  let row;
  try {
    row = await prisma.whatsAppMessage.create({
      data: {
        id: newId('wam'),
        userId: parent.userId,
        parentId: parent.id,
        callLogId: input.callLogId,
        alertId: plan.alertId,
        kind: plan.kind,
        refKey: `${input.callLogId || plan.alertId || newId('ref')}:${to}`,
        phone: to,
        templateName: WHATSAPP_TEMPLATES[plan.kind].name,
        body: plan.body,
        level: plan.level
      }
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { whatsapp: 'duplicate', emailed: 0 };
    throw err;
  }

  try {
    const { messageId } = await sendTemplate(cfg, to, plan.kind, plan.params, deps.fetchImpl);
    await prisma.whatsAppMessage.update({ where: { id: row.id }, data: { status: 'sent', providerMessageId: messageId } });
    const ids = input.alerts.map(a => a.id);
    if (ids.length) await prisma.alertRecord.updateMany({ where: { id: { in: ids } }, data: { channel: 'whatsapp' } });
    return { whatsapp: 'sent', emailed: 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error(`[notify] WhatsApp to ${parent.userId} failed: ${message}`);
    await prisma.whatsAppMessage.update({ where: { id: row.id }, data: { status: 'failed', error: message.slice(0, 300) } });
    const emailed = plan.level >= 3 ? await claimAndEmailFallback(row.id, deps) : 0;
    return { whatsapp: 'failed', emailed };
  }
}

/**
 * A level 3-4 WhatsApp message failed (when sending, or later in Meta's status
 * webhook): email that call's serious alerts instead, once.
 */
export async function claimAndEmailFallback(messageId: string, deps: NotifyDeps = {}): Promise<number> {
  const claimed = await prisma.whatsAppMessage.updateMany({
    where: { id: messageId, fallbackEmailedAt: null, level: { gte: 3 } },
    data: { fallbackEmailedAt: new Date() }
  });
  if (claimed.count !== 1) return 0;
  const msg = await prisma.whatsAppMessage.findUnique({ where: { id: messageId } });
  if (!msg?.parentId) return 0;
  const parent = await loadParent(msg.parentId);
  if (!parent) return 0;
  const alerts = await prisma.alertRecord.findMany({
    where: msg.callLogId ? { callLogId: msg.callLogId, level: { gte: 3 } } : { id: msg.alertId || '', level: { gte: 3 } }
  });
  return emailSafetyFallback(parent, alerts, deps);
}
