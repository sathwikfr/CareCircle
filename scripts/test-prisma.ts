import { prisma } from '../src/lib/prisma';

async function testSupabase() {
  const users = await prisma.user.findMany({
    include: { subscription: true, notificationPreferences: true, parents: true }
  });
  console.log('=== Connected to Supabase Postgres! ===');
  console.log('User count in Supabase:', users.length);
  users.forEach((u) => {
    console.log(` - User: ${u.name} (${u.email}) | Plan: ${u.subscription?.planId} | Parents: ${u.parents.length}`);
  });

  const parents = await prisma.parentProfile.findMany({
    include: { medicines: true, emergencyContacts: true, callSchedule: true }
  });
  console.log('\nParent count in Supabase:', parents.length);
  parents.forEach((p) => {
    console.log(` - Parent: ${p.name} | CallTime: ${p.callTime} | Medicines: ${p.medicines.length} | ScheduleSlots: ${p.callSchedule.length}`);
  });
}

testSupabase()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
