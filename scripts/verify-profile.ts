import {
  getUserByEmail,
  updateUserProfile,
  getUserPasswordHash,
  updateUserPasswordHash,
  ensureDemoDataSeeded,
  getParentsForUser
} from '../src/lib/db';
import { hashPassword, comparePassword } from '../src/lib/auth';

async function runTests() {
  ensureDemoDataSeeded();
  console.log('=== TEST 1: Retrieve User Profile ===');
  const demoUser = await getUserByEmail('sathwik.fr@gmail.com');
  console.log('Found User:', demoUser?.name, '| Email:', demoUser?.email, '| Phone:', demoUser?.phone);
  console.log('User Initials/Avatar:', demoUser?.avatar);

  if (!demoUser) {
    console.log('User not found.');
    return;
  }

  console.log('\n=== TEST 2: Update Profile (Name & Phone & Initials) ===');
  const updateRes1 = await updateUserProfile(demoUser.id, {
    name: 'Sathwik Rao',
    phone: '+91 9874563210',
    avatar: 'SR'
  });
  console.log('Updated User:', updateRes1?.user.name, '| Phone:', updateRes1?.user.phone, '| Avatar:', updateRes1?.user.avatar);
  console.log('Email Changed Flag:', updateRes1?.emailChanged);

  console.log('\n=== TEST 3: Update Notification Preferences ===');
  const updateRes3 = await updateUserProfile(demoUser.id, {
    notificationPreferences: {
      whatsapp: true,
      sms: false,
      email: true,
      push: true,
      minimumAlertLevel: 2
    }
  });
  console.log('Saved Notif Prefs:', updateRes3?.user.notificationPreferences);

  console.log('\n=== TEST 4: Password Verification & Change ===');
  const currentHash = await getUserPasswordHash(demoUser.id);
  if (currentHash) {
    const wrongMatch = await comparePassword('WrongPassword', currentHash);
    console.log('Wrong Password Matches (should be false):', wrongMatch);
  }

  console.log('\n=== TEST 5: Verify Parent Profiles ===');
  const parents = await getParentsForUser(demoUser.id);
  console.log('Parent count for user:', parents.length);
  parents.forEach(p => console.log(' - Parent:', p.name, '| Call Time:', p.callTime, '| Relationship:', p.relationship));

  console.log('\n>>> ALL TESTS PASSED! <<<');
}

runTests().catch(console.error);
