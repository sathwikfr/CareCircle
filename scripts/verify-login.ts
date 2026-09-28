import { getUserByEmailOrPhone } from '../src/lib/db';
import { prisma } from '../src/lib/prisma';

async function testLoginLookup() {
  console.log('Testing getUserByEmailOrPhone for sathwik.fr@gmail.com...');
  const user = await getUserByEmailOrPhone('sathwik.fr@gmail.com');
  console.log('Lookup result:', user);

  if (user) {
    console.log('SUCCESS: User found in PostgreSQL Supabase DB!');
    console.log(`- ID: ${user.id}`);
    console.log(`- Name: ${user.name}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Has PasswordHash: ${Boolean(user.passwordHash)}`);
  } else {
    console.log('FAILED: User not found.');
  }
}

testLoginLookup()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
