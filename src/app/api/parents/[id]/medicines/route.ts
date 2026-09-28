import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { addMedicine, toggleMedicineStatus } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, dosage, timeOfDay, timingSlots, foodRelation, frequency } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Medicine name is required' }, { status: 400 });
  }

  const newMed = addMedicine(id, {
    name: name.trim(),
    dosage: dosage || '1 tablet',
    timeOfDay: timeOfDay || 'morning',
    timingSlots: timingSlots || [timeOfDay || 'morning'],
    foodRelation: foodRelation || 'not_specified',
    frequency: frequency || 'daily',
    isActive: true
  });

  return NextResponse.json({ success: true, medicine: newMed });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { medicineId } = await req.json();

  const updated = toggleMedicineStatus(id, medicineId);
  if (!updated) {
    return NextResponse.json({ error: 'Medicine not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, medicine: updated });
}
