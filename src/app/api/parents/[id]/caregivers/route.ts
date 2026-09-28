import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { inviteCaregiver } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { email, name, role } = await req.json();

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid caregiver email required' }, { status: 400 });
  }

  const invite = inviteCaregiver(id, email.trim(), name || 'Family Caregiver', role || 'co_manager');

  return NextResponse.json({
    success: true,
    message: `Invitation link dispatched to ${email}. They can join this parent’s dashboard.`,
    invite
  });
}
