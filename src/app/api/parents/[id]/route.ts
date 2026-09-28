import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getParentById,
  updateParent,
  pauseParentCalls,
  deleteParentSoft,
  getMedicinesForParent,
  getEmergencyContacts,
  getCallLogsForParent,
  getAlertsForParent,
  getScheduleSuggestionsForParent,
  getCaregiversForParent,
  getNotificationPreferences
} from '@/lib/db';

function canAccessParent(parentUserId: string, currentUserId: string): boolean {
  return parentUserId === currentUserId;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
  }

  const { id } = await params;
  const parent = await getParentById(id);
  if (!parent) {
    return NextResponse.json({ error: 'Parent profile not found.' }, { status: 404 });
  }

  // Strict Authorization Check: Only owner can view
  if (!canAccessParent(parent.userId, user.id)) {
    return NextResponse.json({ error: 'Forbidden: You do not have permission to access this parent profile.' }, { status: 403 });
  }

  const medicines = await getMedicinesForParent(id);
  const emergencyContacts = await getEmergencyContacts(id);
  const callLogs = await getCallLogsForParent(id);
  const alerts = await getAlertsForParent(id);
  const suggestions = await getScheduleSuggestionsForParent(id);
  const caregivers = await getCaregiversForParent(id);
  const notifPrefs = await getNotificationPreferences(id);

  return NextResponse.json({
    parent,
    medicines,
    emergencyContacts,
    callLogs,
    alerts,
    suggestions,
    caregivers,
    notifPrefs
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
  }

  const { id } = await params;
  const parent = await getParentById(id);
  if (!parent) {
    return NextResponse.json({ error: 'Parent profile not found.' }, { status: 404 });
  }

  // Strict Authorization Check: Only owner can modify
  if (!canAccessParent(parent.userId, user.id)) {
    return NextResponse.json({ error: 'Forbidden: You do not have permission to modify this parent profile.' }, { status: 403 });
  }

  const body = await req.json();
  const { action, updates, pauseReason, pauseUntil } = body;

  if (action === 'pause') {
    const updated = await pauseParentCalls(id, true, pauseReason || 'Travel / Vacation', pauseUntil);
    return NextResponse.json({ success: true, parent: updated, message: 'Calls paused successfully.' });
  }

  if (action === 'resume') {
    const updated = await pauseParentCalls(id, false);
    return NextResponse.json({ success: true, parent: updated, message: 'Calls resumed successfully.' });
  }

  if (action === 'delete') {
    await deleteParentSoft(id);
    return NextResponse.json({ success: true, message: 'Parent profile archived safely. Past call logs remain exported.' });
  }

  if (action === 'update' && updates) {
    const updated = await updateParent(id, updates);
    return NextResponse.json({ success: true, parent: updated, message: 'Parent settings updated.' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
  }

  const { id } = await params;
  const parent = await getParentById(id);
  if (!parent) {
    return NextResponse.json({ error: 'Parent profile not found.' }, { status: 404 });
  }

  if (!canAccessParent(parent.userId, user.id)) {
    return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this parent profile.' }, { status: 403 });
  }

  await deleteParentSoft(id);
  return NextResponse.json({ success: true, message: 'Parent profile permanently removed.' });
}
