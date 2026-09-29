import { NextResponse } from 'next/server';
import { addMedicine, toggleMedicineStatus, linkMedicinesIntoSchedule } from '@/lib/db';
import { requireOwnedParent } from '@/lib/access';
import { Medicine, MedicineTimingSlot, FoodRelation } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

const TIMING_SLOTS: MedicineTimingSlot[] = ['morning', 'afternoon', 'evening', 'bedtime', 'as_needed'];
const FOOD_RELATIONS: FoodRelation[] = ['before_food', 'after_food', 'with_food', 'not_specified'];
const TIMES_OF_DAY: Medicine['timeOfDay'][] = ['morning', 'afternoon', 'evening', 'bedtime'];
const FREQUENCIES: Medicine['frequency'][] = ['daily', 'twice_daily', 'as_needed'];

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const access = await requireOwnedParent(id);
  if (!access.ok) return access.response;

  try {
    const { name, dosage, timeOfDay, timingSlots, foodRelation, frequency } = await req.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Medicine name is required' }, { status: 400 });
    }

    const tod: Medicine['timeOfDay'] = TIMES_OF_DAY.includes(timeOfDay) ? timeOfDay : 'morning';
    const slots: MedicineTimingSlot[] = Array.isArray(timingSlots)
      ? timingSlots.filter((s: MedicineTimingSlot) => TIMING_SLOTS.includes(s))
      : [];

    const newMed = await addMedicine(id, {
      name: name.trim().slice(0, 120),
      dosage: (dosage || '1 tablet').toString().slice(0, 120),
      timeOfDay: tod,
      timingSlots: slots.length > 0 ? slots : [tod],
      foodRelation: FOOD_RELATIONS.includes(foodRelation) ? foodRelation : 'not_specified',
      frequency: FREQUENCIES.includes(frequency) ? frequency : 'daily',
      isActive: true
    });

    // Make sure Saathi actually asks about the new medicine on the right call.
    const scheduleNotes = await linkMedicinesIntoSchedule(id, [newMed]);

    return NextResponse.json({ success: true, medicine: newMed, scheduleNotes });
  } catch (err) {
    console.error('Add medicine error:', err);
    return NextResponse.json({ error: 'Failed to add medicine' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const access = await requireOwnedParent(id);
  if (!access.ok) return access.response;

  const { medicineId } = await req.json();
  if (!medicineId || typeof medicineId !== 'string') {
    return NextResponse.json({ error: 'medicineId is required' }, { status: 400 });
  }

  const updated = await toggleMedicineStatus(id, medicineId);
  if (!updated) {
    return NextResponse.json({ error: 'Medicine not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, medicine: updated });
}
