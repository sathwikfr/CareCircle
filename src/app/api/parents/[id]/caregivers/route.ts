import { NextResponse } from 'next/server';
import { inviteCaregiver } from '@/lib/db';
import { requireOwnedParent } from '@/lib/access';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const access = await requireOwnedParent(id);
  if (!access.ok) return access.response;

  try {
    const { email, name, role } = await req.json();

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Valid caregiver email required' }, { status: 400 });
    }
    if (email.trim().toLowerCase() === access.user.email.toLowerCase()) {
      return NextResponse.json({ error: 'You already manage this parent.' }, { status: 400 });
    }

    const invite = await inviteCaregiver(
      id,
      email,
      (name || 'Family Caregiver').toString().slice(0, 120),
      role === 'viewer' ? 'viewer' : 'co_manager'
    );

    return NextResponse.json({
      success: true,
      // Invitation emails and invitee access are not built yet; say so plainly.
      message: `${invite.email} has been added as a pending caregiver for ${access.parent.name}. Invitation emails are coming soon.`,
      invite
    });
  } catch (err) {
    const message = err instanceof Error && err.message.includes('already been invited') ? err.message : 'Failed to invite caregiver';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
