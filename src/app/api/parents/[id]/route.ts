import { NextResponse } from 'next/server';
import {
  updateParent,
  pauseParentCalls,
  deleteParentSoft,
  getMedicinesForParent,
  getEmergencyContacts,
  getCallLogsForParent,
  getAlertsForParent,
  getScheduleSuggestionsForParent,
  getCaregiversForParent,
  getNotificationPreferences,
  ParentUpdates
} from '@/lib/db';
import { requireOwnedParent } from '@/lib/access';
import { normalizePhone } from '@/lib/phone';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const access = await requireOwnedParent(id);
  if (!access.ok) return access.response;

  const [medicines, emergencyContacts, callLogs, alerts, suggestions, caregivers, notifPrefs] = await Promise.all([
    getMedicinesForParent(id),
    getEmergencyContacts(id),
    getCallLogsForParent(id),
    getAlertsForParent(id),
    getScheduleSuggestionsForParent(id),
    getCaregiversForParent(id),
    getNotificationPreferences(access.user.id)
  ]);

  return NextResponse.json({
    parent: access.parent,
    medicines,
    emergencyContacts,
    callLogs,
    alerts,
    suggestions,
    caregivers,
    notifPrefs
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const access = await requireOwnedParent(id);
  if (!access.ok) return access.response;

  try {
    const body = await req.json();
    const { action, updates, pauseReason, pauseUntil } = body;

    if (action === 'pause') {
      if (pauseUntil !== undefined && pauseUntil !== null) {
        const until = new Date(pauseUntil);
        if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
          return NextResponse.json({ error: 'Please choose a valid future date to resume calls.' }, { status: 400 });
        }
      }
      const updated = await pauseParentCalls(id, true, pauseReason || 'Travel / Vacation', pauseUntil || undefined);
      return NextResponse.json({ success: true, parent: updated, message: 'Calls paused successfully.' });
    }

    if (action === 'resume') {
      const updated = await pauseParentCalls(id, false);
      return NextResponse.json({ success: true, parent: updated, message: 'Calls resumed successfully.' });
    }

    if (action === 'delete') {
      await deleteParentSoft(id);
      return NextResponse.json({ success: true, message: 'Parent profile archived. Calls have stopped; past call logs are kept.' });
    }

    if (action === 'update' && updates && typeof updates === 'object') {
      const allowed: ParentUpdates = {
        name: updates.name,
        relationship: updates.relationship,
        language: updates.language,
        timezone: updates.timezone,
        callTime: updates.callTime
      };
      if (updates.phone !== undefined) {
        const phoneResult = normalizePhone(String(updates.phone));
        if (!phoneResult.ok) {
          return NextResponse.json({ error: phoneResult.reason }, { status: 400 });
        }
        allowed.phone = phoneResult.e164;
      }
      const updated = await updateParent(id, allowed);
      return NextResponse.json({ success: true, parent: updated, message: 'Parent settings updated.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Update parent error:', err);
    const message = err instanceof Error && err.message.startsWith('Invalid') ? err.message : 'Failed to update parent profile.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const access = await requireOwnedParent(id);
  if (!access.ok) return access.response;

  await deleteParentSoft(id);
  return NextResponse.json({ success: true, message: 'Parent profile archived. Calls have stopped; past call logs are kept.' });
}
