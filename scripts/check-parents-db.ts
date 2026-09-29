import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const parents = await prisma.parentProfile.findMany({
    select: { id: true, name: true, phone: true }
  });
  console.log('Parents in Supabase Postgres:');
  console.log(JSON.stringify(parents, null, 2));
  await prisma.$disconnect();
}
main().catch(console.error);
