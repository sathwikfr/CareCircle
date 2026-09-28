import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getParentById, confirmMedicineReport, setMedicinesForParent, getMedicinesForParent } from '@/lib/db';
import { Medicine } from '@/lib/types';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const { id, reportId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parent = getParentById(id);
    if (!parent) {
      return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });
    }

    const { confirmedMedicines } = await req.json();

    if (!Array.isArray(confirmedMedicines) || confirmedMedicines.length === 0) {
      return NextResponse.json({ error: 'Please confirm at least one medicine' }, { status: 400 });
    }

    // Convert confirmed candidates to Medicine objects
    const currentMeds = getMedicinesForParent(id);
    const newMeds: Medicine[] = confirmedMedicines.map((m: Partial<Medicine>, idx: number) => ({
      id: m.id || `med_${Date.now()}_${idx}`,
      parentId: id,
      name: m.name || 'Medicine',
      dosage: m.dosage || '1 tablet daily',
      timeOfDay: m.timeOfDay || 'morning',
      timingSlots: m.timingSlots || [m.timeOfDay || 'morning'],
      foodRelation: m.foodRelation || 'not_specified',
      frequency: m.frequency || 'daily',
      isActive: true
    }));

    // Save to parent medicines table
    const allMeds = [...currentMeds, ...newMeds];
    setMedicinesForParent(id, allMeds);

    // Audit trail confirmation
    confirmMedicineReport(reportId, newMeds.map(m => m.id));

    return NextResponse.json({
      success: true,
      message: `${newMeds.length} medicines confirmed and added to ${parent.name}'s daily routine.`,
      medicines: allMeds
    });
  } catch (err) {
    console.error('Confirm report error:', err);
    return NextResponse.json({ error: 'Failed to confirm medicines' }, { status: 500 });
  }
}
