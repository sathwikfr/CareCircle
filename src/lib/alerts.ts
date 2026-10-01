/**
 * Alert engine: records AlertRecords. Telling the family is familyNotify.ts
 * (WhatsApp, one message per call; email only as described there).
 *
 * `recordAlert` only writes the alert (callers that raise several alerts for
 * one call notify once afterwards); `raiseAlert` records and notifies.
 */
import { prisma } from './prisma';
import { newId } from './db';
import { ALERT_TITLES } from './callInterpretation';
import { NotifyAlert } from './familyMessages';
import { notifyFamily, NotifyDeps, NotifyResult } from './familyNotify';

/** Injectable dependencies (tests replace the email sender and WhatsApp). */
export type AlertDeps = NotifyDeps;

export interface RaiseAlertInput {
  parentId: string;
  callLogId?: string | null;
  level: 1 | 2 | 3 | 4;
  title: string;
  message: string;
}

export interface RecordAlertResult {
  created: boolean;
  alertId?: string;
  /** Set only when the alert was newly created. */
  alert?: NotifyAlert;
}

export interface RaiseAlertResult extends RecordAlertResult {
  notified?: NotifyResult;
}

/** Creates the alert once per (call, title). */
export async function recordAlert(input: RaiseAlertInput): Promise<RecordAlertResult> {
  if (input.callLogId) {
    const existing = await prisma.alertRecord.findFirst({ where: { callLogId: input.callLogId, title: input.title } });
    if (existing) return { created: false, alertId: existing.id };
  }

  const parent = await prisma.parentProfile.findUnique({ where: { id: input.parentId }, select: { id: true } });
  if (!parent) return { created: false };

  const alert = await prisma.alertRecord.create({
    data: {
      id: newId('alt'),
      parentId: parent.id,
      callLogId: input.callLogId || null,
      level: input.level,
      title: input.title,
      message: input.message,
      channel: 'dashboard', // updated to whatsapp / email once delivered
      timestamp: new Date().toISOString(),
      status: 'sent'
    }
  });
  return {
    created: true,
    alertId: alert.id,
    alert: { id: alert.id, level: alert.level, title: alert.title, message: alert.message }
  };
}

/** Records one alert and notifies the family about it straight away. */
export async function raiseAlert(input: RaiseAlertInput, deps: AlertDeps = {}): Promise<RaiseAlertResult> {
  const rec = await recordAlert(input);
  if (!rec.alert) return rec;
  const notified = await notifyFamily(
    { parentId: input.parentId, callLogId: input.callLogId || null, alerts: [rec.alert] },
    deps
  );
  return { ...rec, notified };
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
