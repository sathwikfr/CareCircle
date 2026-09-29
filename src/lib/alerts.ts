/**
 * Alert engine: records an AlertRecord and notifies the family.
 * Email is the only channel that exists today. WhatsApp / SMS are NOT built,
 * so alerts are never labelled as sent through them.
 */
import { prisma } from './prisma';
import { newId } from './db';
import { sendUrgentAlertEmail } from './email';
import { ALERT_TITLES } from './callInterpretation';

type SendUrgentEmail = typeof sendUrgentAlertEmail;

/** Injectable dependencies (tests replace the email sender). */
export interface AlertDeps {
  sendEmail?: SendUrgentEmail;
}

export interface RaiseAlertInput {
  parentId: string;
  callLogId?: string | null;
  level: 1 | 2 | 3 | 4;
  title: string;
  message: string;
}

export interface RaiseAlertResult {
  created: boolean;
  alertId?: string;
  emailed: number;
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

/**
 * Creates the alert once per (call, title) and emails the family when the
 * alert is level 2+ and the account's notification preferences allow it.
 */
export async function raiseAlert(
  input: RaiseAlertInput,
  deps: AlertDeps = {}
): Promise<RaiseAlertResult> {
  const sendEmail = deps.sendEmail || sendUrgentAlertEmail;

  if (input.callLogId) {
    const existing = await prisma.alertRecord.findFirst({ where: { callLogId: input.callLogId, title: input.title } });
    if (existing) return { created: false, alertId: existing.id, emailed: 0 };
  }

  const parent = await prisma.parentProfile.findUnique({
    where: { id: input.parentId },
    include: {
      user: { include: { notificationPreferences: true } },
      caregivers: true
    }
  });
  if (!parent) return { created: false, emailed: 0 };

  const prefs = parent.user.notificationPreferences;
  const emailAllowed = prefs ? prefs.email : true;
  const minLevel = prefs ? prefs.minimumAlertLevel : 1;
  const shouldEmail = input.level >= 2 && emailAllowed && input.level >= minLevel;

  const alert = await prisma.alertRecord.create({
    data: {
      id: newId('alt'),
      parentId: parent.id,
      callLogId: input.callLogId || null,
      level: input.level,
      title: input.title,
      message: input.message,
      channel: 'email',
      timestamp: new Date().toISOString(),
      status: 'sent'
    }
  });

  let emailed = 0;
  if (shouldEmail) {
    const recipients = new Map<string, string>([[parent.user.email, parent.user.name]]);
    for (const cg of parent.caregivers) {
      if (cg.status === 'accepted' && cg.role === 'co_manager') recipients.set(cg.email, cg.name);
    }

    for (const [to, name] of recipients) {
      try {
        const res = await sendEmail({
          to,
          name,
          parentName: parent.name,
          alertLevel: input.level >= 3 ? 'level_3' : 'level_2',
          alertType: input.title,
          summary: input.message,
          actionUrl: `${appUrl()}/dashboard`
        });
        if (res.success) emailed += 1;
        else console.error(`[alerts] Email to ${to} failed: ${res.error}`);
      } catch (err) {
        console.error(`[alerts] Email to ${to} threw:`, err);
      }
    }
  }

  return { created: true, alertId: alert.id, emailed };
}

/** Level-2 alert once every attempt to reach the parent has failed. */
export async function raiseUnreachableAlert(
  callLog: { id: string; parentId: string; attemptNumber: number; slot: string | null },
  parentName: string,
  reason: 'no_answer' | 'busy' | 'failed',
  failureReason?: string | null,
  deps: AlertDeps = {}
): Promise<RaiseAlertResult> {
  const slotText = callLog.slot ? `${callLog.slot} ` : '';
  if (reason === 'failed') {
    return raiseAlert(
      {
        parentId: callLog.parentId,
        callLogId: callLog.id,
        level: 2,
        title: ALERT_TITLES.failed,
        message: `The ${slotText}check-in call to ${parentName} could not be placed${failureReason ? ` (${failureReason})` : ''}. Please check that their phone number is correct and reachable.`
      },
      deps
    );
  }
  return raiseAlert(
    {
      parentId: callLog.parentId,
      callLogId: callLog.id,
      level: 2,
      title: ALERT_TITLES.unreachable,
      message: `We tried ${callLog.attemptNumber} time${callLog.attemptNumber === 1 ? '' : 's'} today but could not reach ${parentName} for the ${slotText}check-in call (${reason === 'busy' ? 'line busy' : 'no answer'}). Please call them when you can.`
    },
    deps
  );
}
