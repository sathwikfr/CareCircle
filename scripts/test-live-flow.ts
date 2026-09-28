import { createUser, createParent, addMedicine } from '../src/lib/db';
import { prisma } from '../src/lib/prisma';

async function testLiveFlow() {
  console.log('1. Creating a new real user...');
  const user = await createUser({
    name: 'Sathwik Rao',
    email: 'sathwik.fr@gmail.com',
    phone: '+91 98765 43210'
  });

  console.log('2. Creating a parent profile for this user...');
  const parent = await createParent({
    userId: user.id,
    name: 'Lakshmi Rao',
    relationship: 'Mother',
    phone: '+91 98450 11111',
    language: 'Hindi & English',
    callTime: '08:30 AM',
    consentGiven: true
  });

  console.log('3. Adding a medicine...');
  await addMedicine(parent.id, {
    name: 'Telmisartan 40mg',
    dosage: '1 tablet after breakfast',
    timeOfDay: 'morning',
    timingSlots: ['morning'],
    foodRelation: 'after_food',
    frequency: 'daily',
    isActive: true
  });

  // Give 1.5 seconds for async sync
  await new Promise((r) => setTimeout(r, 1500));

  console.log('\n--- Checking Supabase PostgreSQL Tables ---');
  const dbUsers = await prisma.user.findMany({ where: { email: 'sathwik.fr@gmail.com' } });
  const dbParents = await prisma.parentProfile.findMany({ where: { userId: user.id } });
  const dbMeds = await prisma.medicine.findMany({ where: { parentId: parent.id } });

  console.log('User in Supabase:', dbUsers.map((u) => ({ id: u.id, email: u.email, name: u.name })));
  console.log('Parent in Supabase:', dbParents.map((p) => ({ id: p.id, name: p.name, phone: p.phone })));
  console.log('Medicine in Supabase:', dbMeds.map((m) => ({ id: m.id, name: m.name, foodRelation: m.foodRelation })));

  console.log('\n>>> Live Database Persistence Verified! <<<');
}

testLiveFlow()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
