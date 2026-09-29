import { NextResponse } from 'next/server';
import { confirmMedicineReport, getMedicineReportById, setMedicinesForParent, linkMedicinesIntoSchedule, newId } from '@/lib/db';
import { requireOwnedParent } from '@/lib/access';
import { Medicine, MedicineTimingSlot, FoodRelation } from '@/lib/types';

type Ctx = { params: Promise<{ id: string; reportId: string }> };

const TIMING_SLOTS: MedicineTimingSlot[] = ['morning', 'afternoon', 'evening', 'bedtime', 'as_needed'];
const FOOD_RELATIONS: FoodRelation[] = ['before_food', 'after_food', 'with_food', 'not_specified'];
const TIMES_OF_DAY: Medicine['timeOfDay'][] = ['morning', 'afternoon', 'evening', 'bedtime'];
const FREQUENCIES: Medicine['frequency'][] = ['daily', 'twice_daily', 'as_needed'];

/**
 * The user has reviewed the extracted draft and explicitly confirmed these
 * medicines. Only now are they saved to the parent's routine.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id, reportId } = await params;
  const access = await requireOwnedParent(id);
  if (!access.ok) return access.response;

  try {
    const report = await getMedicineReportById(reportId);
    if (!report || report.userId !== access.user.id || (report.parentId && report.parentId !== id)) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    if (report.status === 'confirmed') {
      return NextResponse.json({ error: 'These medicines were already confirmed.' }, { status: 409 });
    }

    const { confirmedMedicines } = await req.json();
    if (!Array.isArray(confirmedMedicines) || confirmedMedicines.length === 0) {
      return NextResponse.json({ error: 'Please confirm at least one medicine' }, { status: 400 });
    }

    const newMeds: Medicine[] = (confirmedMedicines as Partial<Medicine>[])
      .filter(m => m.name && m.name.trim())
      .map(m => {
        const timeOfDay = TIMES_OF_DAY.includes(m.timeOfDay as Medicine['timeOfDay']) ? m.timeOfDay! : 'morning';
        const slots = Array.isArray(m.timingSlots)
          ? m.timingSlots.filter((s): s is MedicineTimingSlot => TIMING_SLOTS.includes(s))
          : [];
        return {
          id: newId('med'),
          parentId: id,
          name: m.name!.trim().slice(0, 120),
          dosage: (m.dosage || '1 tablet daily').toString().slice(0, 120),
          timeOfDay,
          timingSlots: slots.length > 0 ? slots : [timeOfDay],
          foodRelation: FOOD_RELATIONS.includes(m.foodRelation as FoodRelation) ? m.foodRelation : 'not_specified',
          frequency: FREQUENCIES.includes(m.frequency as Medicine['frequency']) ? m.frequency! : 'daily',
          isActive: true
        };
      });

    if (newMeds.length === 0) {
      return NextResponse.json({ error: 'Please confirm at least one medicine with a name' }, { status: 400 });
    }

    const saved = await setMedicinesForParent(id, newMeds);
    const scheduleNotes = await linkMedicinesIntoSchedule(id, saved);
    await confirmMedicineReport(reportId, saved.map(m => m.id), { userId: access.user.id, parentId: id });

    return NextResponse.json({
      success: true,
      message: `${saved.length} medicine${saved.length === 1 ? '' : 's'} confirmed and added to ${access.parent.name}'s daily routine.`,
      medicines: saved,
      scheduleNotes
    });
  } catch (err) {
    console.error('Confirm report error:', err);
    return NextResponse.json({ error: 'Failed to confirm medicines' }, { status: 500 });
  }
}
