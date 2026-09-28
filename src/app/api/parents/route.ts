import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getParentsForUser,
  createParent,
  setMedicinesForParent,
  setEmergencyContacts
} from '@/lib/db';
import { PLANS } from '@/lib/plans';
import { Medicine, EmergencyContact } from '@/lib/types';

export async function GET() {
  const user = await getSessionUser();
  const userId = user?.id || 'usr_demo_123';

  const list = await getParentsForUser(userId);
  const plan = user?.subscription?.planId ? PLANS[user.subscription.planId] : PLANS.family;

  return NextResponse.json({
    parents: list,
    planLimits: {
      planId: plan.id,
      planName: plan.name,
      allowedParents: plan.parentsIncluded,
      currentCount: list.length,
      canAddMore: list.length < plan.parentsIncluded
    }
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name,
      relationship,
      phone,
      language,
      timezone,
      callTime,
      callSchedule,
      consentGiven,
      medicines,
      emergencyContacts
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Please enter parent’s name' }, { status: 400 });
    }

    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit mobile or landline number' }, { status: 400 });
    }

    if (!consentGiven) {
      return NextResponse.json({ error: 'Parent consent is mandatory before starting calls' }, { status: 400 });
    }

    // Check plan limits
    const existing = await getParentsForUser(user.id);
    const plan = user.subscription?.planId ? PLANS[user.subscription.planId] : PLANS.free;
    if (existing.length >= plan.parentsIncluded) {
      return NextResponse.json(
        {
          error: `Your current ${plan.name} tier permits up to ${plan.parentsIncluded} parent profiles. Please upgrade to Extended Family to add more.`
        },
        { status: 403 }
      );
    }

    const parent = await createParent({
      userId: user.id,
      name: name.trim(),
      relationship: relationship || 'Mother',
      phone: phone.trim(),
      language: language || 'Hindi & English',
      timezone: timezone || 'Asia/Kolkata (IST)',
      callTime: callTime || (Array.isArray(callSchedule) && callSchedule[0]?.time) || '08:15 AM',
      callSchedule: Array.isArray(callSchedule) ? callSchedule : undefined,
      consentGiven: true
    });

    // Add medicines if provided
    if (Array.isArray(medicines) && medicines.length > 0) {
      const formattedMeds: Medicine[] = medicines.map((m: Partial<Medicine>, i: number) => ({
        id: 'med_' + Math.random().toString(36).substring(2, 8) + i,
        parentId: parent.id,
        name: m.name || 'Prescription Medicine',
        dosage: m.dosage || '1 tablet',
        timeOfDay: m.timeOfDay || 'morning',
        frequency: m.frequency || 'daily',
        isActive: true
      }));
      await setMedicinesForParent(parent.id, formattedMeds);
    }

    // Add emergency contacts if provided
    if (Array.isArray(emergencyContacts) && emergencyContacts.length > 0) {
      const formattedContacts: EmergencyContact[] = emergencyContacts.map((c: Partial<EmergencyContact>, i: number) => ({
        id: 'emg_' + Math.random().toString(36).substring(2, 8) + i,
        parentId: parent.id,
        name: c.name || user.name,
        relation: c.relation || 'Son / Daughter',
        phone: c.phone || user.phone,
        priority: i === 0 ? 'primary' : 'secondary'
      }));
      await setEmergencyContacts(parent.id, formattedContacts);
    } else {
      // Default to user as primary emergency contact
      await setEmergencyContacts(parent.id, [
        {
          id: 'emg_default_' + parent.id,
          parentId: parent.id,
          name: user.name,
          relation: 'Child (Primary Caregiver)',
          phone: user.phone,
          priority: 'primary'
        }
      ]);
    }

    return NextResponse.json({
      success: true,
      message: 'Parent profile created successfully',
      parent
    });
  } catch (err) {
    console.error('Create parent error:', err);
    return NextResponse.json({ error: 'Failed to create parent profile' }, { status: 500 });
  }
}
