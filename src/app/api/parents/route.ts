import { NextResponse } from 'next/server';
import {
  getParentsForUser,
  createParent,
  setMedicinesForParent,
  setEmergencyContacts,
  deleteParentSoft,
  newId
} from '@/lib/db';
import { requireUser } from '@/lib/access';
import { getEffectivePlan } from '@/lib/plans';
import { Medicine, EmergencyContact, MedicineTimingSlot, FoodRelation } from '@/lib/types';
import { normalizePhone } from '@/lib/phone';

const TIMING_SLOTS: MedicineTimingSlot[] = ['morning', 'afternoon', 'evening', 'bedtime', 'as_needed', 'unspecified'];
const FOOD_RELATIONS: FoodRelation[] = ['before_food', 'after_food', 'with_food', 'not_specified'];
const TIMES_OF_DAY: Medicine['timeOfDay'][] = ['morning', 'afternoon', 'evening', 'bedtime'];
const FREQUENCIES: Medicine['frequency'][] = ['daily', 'twice_daily', 'as_needed'];

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const list = await getParentsForUser(user.id);
  const plan = getEffectivePlan(user.subscription, user.createdAt);

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
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

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

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: "Please enter parent's name" }, { status: 400 });
    }

    // E.164 phone normalisation — validate and reject, never truncate
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }
    const phoneResult = normalizePhone(phone);
    if (!phoneResult.ok) {
      return NextResponse.json({ error: phoneResult.reason }, { status: 400 });
    }

    if (consentGiven !== true) {
      return NextResponse.json({ error: 'Parent consent is mandatory before starting calls' }, { status: 400 });
    }

    // Validate emergency contacts before creating anything.
    let formattedContacts: Omit<EmergencyContact, 'parentId'>[] = [];
    if (Array.isArray(emergencyContacts) && emergencyContacts.length > 0) {
      for (const [i, c] of (emergencyContacts as Partial<EmergencyContact>[]).entries()) {
        const contactName = (c.name || '').trim();
        const contactPhone = (c.phone || '').trim();
        if (!contactName && !contactPhone) continue; // empty optional row
        const norm = normalizePhone(contactPhone);
        if (!contactName || !norm.ok) {
          return NextResponse.json(
            { error: `Emergency contact ${i + 1}: ${!contactName ? 'name is required' : norm.ok ? '' : norm.reason}` },
            { status: 400 }
          );
        }
        formattedContacts.push({
          id: newId('emg'),
          name: contactName,
          relation: (c.relation || 'Son / Daughter').toString().slice(0, 100),
          phone: norm.e164,
          priority: formattedContacts.length === 0 ? 'primary' : 'secondary'
        });
      }
    }
    if (formattedContacts.length === 0) {
      // Default to the account holder as primary emergency contact.
      const norm = normalizePhone(user.phone || '');
      if (!norm.ok) {
        return NextResponse.json(
          { error: 'Please add at least one emergency contact with a valid mobile number.' },
          { status: 400 }
        );
      }
      formattedContacts = [
        { id: newId('emg'), name: user.name, relation: 'Child (Primary Caregiver)', phone: norm.e164, priority: 'primary' }
      ];
    }

    // Check plan limits
    const existing = await getParentsForUser(user.id);
    const plan = getEffectivePlan(user.subscription, user.createdAt);
    if (plan.expired) {
      return NextResponse.json(
        { error: 'Your free trial has ended. Please choose a plan to add a parent and restart the calls.', code: 'TRIAL_ENDED' },
        { status: 403 }
      );
    }
    if (existing.length >= plan.parentsIncluded) {
      return NextResponse.json(
        {
          error: `Your current ${plan.name} plan allows up to ${plan.parentsIncluded} parent profile${plan.parentsIncluded === 1 ? '' : 's'}. Please upgrade to add more.`
        },
        { status: 403 }
      );
    }

    const parent = await createParent({
      userId: user.id,
      name: name.trim().slice(0, 120),
      relationship: (relationship || 'Mother').toString().slice(0, 60),
      phone: phoneResult.e164,
      language: (language || 'Hindi & English').toString().slice(0, 60),
      timezone: (timezone || 'Asia/Kolkata (IST)').toString().slice(0, 60),
      callTime: callTime || (Array.isArray(callSchedule) && callSchedule[0]?.time) || undefined,
      callSchedule: Array.isArray(callSchedule) ? callSchedule : undefined,
      consentGiven: true
    });

    try {
      if (Array.isArray(medicines) && medicines.length > 0) {
        const formattedMeds: Medicine[] = (medicines as Partial<Medicine>[])
          .filter(m => m.name && m.name.trim())
          .map(m => {
            const timeOfDay = TIMES_OF_DAY.includes(m.timeOfDay as Medicine['timeOfDay']) ? m.timeOfDay! : 'morning';
            const slots = Array.isArray(m.timingSlots)
              ? m.timingSlots.filter((s): s is MedicineTimingSlot => TIMING_SLOTS.includes(s))
              : [];
            return {
              id: newId('med'),
              parentId: parent.id,
              name: m.name!.trim().slice(0, 120),
              dosage: (m.dosage || '1 tablet').toString().slice(0, 120),
              timeOfDay,
              timingSlots: slots.length > 0 ? slots : [timeOfDay],
              foodRelation: FOOD_RELATIONS.includes(m.foodRelation as FoodRelation) ? m.foodRelation : 'not_specified',
              frequency: FREQUENCIES.includes(m.frequency as Medicine['frequency']) ? m.frequency! : 'daily',
              isActive: true
            };
          });
        if (formattedMeds.length > 0) {
          await setMedicinesForParent(parent.id, formattedMeds);
        }
      }

      await setEmergencyContacts(
        parent.id,
        formattedContacts.map(c => ({ ...c, parentId: parent.id }))
      );
    } catch (childErr) {
      // Don't leave a half-created profile behind (it would block a retry via plan limits).
      await deleteParentSoft(parent.id).catch(() => undefined);
      throw childErr;
    }

    return NextResponse.json({
      success: true,
      message: 'Parent profile created successfully',
      parent
    });
  } catch (err) {
    console.error('Create parent error:', err);
    return NextResponse.json({ error: 'Failed to create parent profile. Please try again.' }, { status: 500 });
  }
}
