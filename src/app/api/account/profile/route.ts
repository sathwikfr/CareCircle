import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getUserById, updateUserProfile } from '@/lib/db';
import { NotificationPreferences } from '@/lib/types';
import { normalizePhone } from '@/lib/phone';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const freshUser = (await getUserById(user.id)) || user;
    return NextResponse.json({
      success: true,
      user: freshUser
    });
  } catch (err) {
    console.error('Account Profile GET Error:', err);
    return NextResponse.json({ error: 'Failed to retrieve profile.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, phone, avatar, notificationPreferences } = body;

    if (name !== undefined && (!name || typeof name !== 'string' || name.trim().length < 2)) {
      return NextResponse.json({ error: 'Full name must be at least 2 characters.' }, { status: 400 });
    }

    // The email only changes after a code sent to the new address is entered
    // (/api/account/email/send-code, then /api/account/email).
    if (email !== undefined && (typeof email !== 'string' || email.trim().toLowerCase() !== sessionUser.email)) {
      return NextResponse.json(
        { error: 'To change your email, confirm the new address with the code we send to it.', code: 'EMAIL_CHANGE_NEEDS_CODE' },
        { status: 400 }
      );
    }

    let normalizedPhone: string | undefined = undefined;
    if (phone !== undefined) {
      if (typeof phone !== 'string') {
        return NextResponse.json({ error: 'Invalid phone format.' }, { status: 400 });
      }
      if (phone.trim() !== '') {
        const phoneResult = normalizePhone(phone);
        if (!phoneResult.ok) {
          return NextResponse.json({ error: phoneResult.reason }, { status: 400 });
        }
        normalizedPhone = phoneResult.e164;
      } else {
        normalizedPhone = '';
      }
    }

    // Validate notification preferences if provided
    let cleanNotifPrefs: NotificationPreferences | undefined = undefined;
    if (notificationPreferences && typeof notificationPreferences === 'object') {
      cleanNotifPrefs = {
        whatsapp: Boolean(notificationPreferences.whatsapp),
        sms: Boolean(notificationPreferences.sms),
        email: Boolean(notificationPreferences.email),
        push: Boolean(notificationPreferences.push),
        minimumAlertLevel: typeof notificationPreferences.minimumAlertLevel === 'number'
          ? Math.max(1, Math.min(4, notificationPreferences.minimumAlertLevel))
          : 1
      };
    }

    const updateResult = await updateUserProfile(sessionUser.id, {
      name,
      phone: normalizedPhone !== undefined ? normalizedPhone : phone,
      avatar,
      notificationPreferences: cleanNotifPrefs
    });

    if (!updateResult) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updateResult.user
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update profile.';
    console.error('Account Profile PATCH Error:', err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
