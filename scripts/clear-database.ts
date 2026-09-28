import { prisma } from '../src/lib/prisma';

async function clearAllData() {
  console.log('Clearing all tables in Supabase PostgreSQL...');

  // Delete child records first to respect foreign key constraints
  await prisma.scheduledCallSlot.deleteMany({});
  await prisma.medicine.deleteMany({});
  await prisma.emergencyContact.deleteMany({});
  await prisma.callLog.deleteMany({});
  await prisma.alertRecord.deleteMany({});
  await prisma.scheduleSuggestion.deleteMany({});
  await prisma.caregiverInvite.deleteMany({});
  await prisma.medicineReport.deleteMany({});
  await prisma.parentProfile.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.userSubscription.deleteMany({});
  await prisma.notificationPreferences.deleteMany({});
  await prisma.dBSession.deleteMany({});
  await prisma.passwordResetRecord.deleteMany({});
  await prisma.oTPRecord.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('All data deleted successfully from Supabase PostgreSQL!');
}

clearAllData()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
