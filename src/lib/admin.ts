import { notFound } from 'next/navigation';
import { getSessionUser } from './auth';
import { isAdminEmail } from './adminEmail';
import { User } from './types';

/**
 * For /admin pages: returns the admin user, or renders the normal 404 for everyone else
 * (signed out, or signed in but not listed in ADMIN_EMAILS) so the page's existence isn't revealed.
 */
export async function requireAdminPage(): Promise<User> {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) notFound();
  return user;
}
