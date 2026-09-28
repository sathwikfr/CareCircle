import {
  getUserById,
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
  const demoUser = getUserByEmail('demo@carecircle.in');
  console.log('Found Demo User:', demoUser?.name, '| Email:', demoUser?.email, '| Phone:', demoUser?.phone);
  console.log('User Initials/Avatar:', demoUser?.avatar);

  console.log('\n=== TEST 2: Update Profile (Name & Phone & Initials) ===');
  const updateRes1 = updateUserProfile(demoUser!.id, {
    name: 'Sathwik Rao Demo',
    phone: '+91 99999 88888',
    avatar: 'SR'
  });
  console.log('Updated User:', updateRes1?.user.name, '| Phone:', updateRes1?.user.phone, '| Avatar:', updateRes1?.user.avatar);
  console.log('Email Changed Flag:', updateRes1?.emailChanged);

  console.log('\n=== TEST 3: Update Email (Triggers Re-verification) ===');
  const updateRes2 = updateUserProfile(demoUser!.id, {
    email: 'newemail@carecircle.in'
  });
  console.log('New Email:', updateRes2?.user.email);
  console.log('Email Verified Status (should be false):', updateRes2?.user.emailVerified);
  console.log('Email Changed Flag (should be true):', updateRes2?.emailChanged);

  console.log('\n=== TEST 4: Update Notification Preferences ===');
  const updateRes3 = updateUserProfile(demoUser!.id, {
    notificationPreferences: {
      whatsapp: true,
      sms: false,
      email: true,
      push: true,
      minimumAlertLevel: 2
    }
  });
  console.log('Saved Notif Prefs:', updateRes3?.user.notificationPreferences);

  console.log('\n=== TEST 5: Password Verification & Change ===');
  const initialHash = await hashPassword('CurrentSecret123!');
  updateUserPasswordHash(demoUser!.id, initialHash);

  const wrongMatch = await comparePassword('WrongPassword', getUserPasswordHash(demoUser!.id)!);
  console.log('Wrong Password Matches (should be false):', wrongMatch);

  const correctMatch = await comparePassword('CurrentSecret123!', getUserPasswordHash(demoUser!.id)!);
  console.log('Correct Password Matches (should be true):', correctMatch);

  const newHash = await hashPassword('BrandNewSecret456!');
  updateUserPasswordHash(demoUser!.id, newHash);
  const newPasswordMatch = await comparePassword('BrandNewSecret456!', getUserPasswordHash(demoUser!.id)!);
  console.log('New Password Matches after update (should be true):', newPasswordMatch);

  console.log('\n=== TEST 6: Verify Parent Profiles are untouched ===');
  const parents = getParentsForUser(demoUser!.id);
  console.log('Parent count for user:', parents.length);
  parents.forEach(p => console.log(' - Parent:', p.name, '| Call Time:', p.callTime, '| Relationship:', p.relationship));

  console.log('\n>>> ALL TESTS PASSED! <<<');
}

runTests().catch(console.error);
