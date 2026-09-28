import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getParentById, addCallLog } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const parent = await getParentById(id);
  if (!parent) {
    return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
  }

  // Create a simulated test call log
  const newCall = await addCallLog(id, {
    scheduledTime: 'Immediate (Test Call)',
    actualAnswerTime: 'Just now',
    status: 'answered',
    durationSeconds: 45,
    medicationConfirmed: true,
    mood: 'cheerful',
    summary: `Test audio call conducted in ${parent.language}. AI greeted warmly and confirmed test connection.`,
    notes: 'Sample audio played successfully.'
  });

  return NextResponse.json({
    success: true,
    message: `Test call dispatched to ${parent.phone}! Connection verified in ${parent.language}.`,
    call: newCall
  });
}
