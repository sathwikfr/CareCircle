/** Accounts the owner creates while testing (see CLAUDE.md rule 10). Hidden from admin numbers. */
export const TEST_EMAIL_PREFIX = 'claude-e2e-';

/** Admin emails come from ADMIN_EMAILS (comma separated, case-insensitive). Empty = nobody is an admin. */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
