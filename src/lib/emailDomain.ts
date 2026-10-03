import { promises as dns } from 'dns';

// RFC 2606 / 6761 reserved names. They never receive mail; accepted only under
// `next dev` so local tests can use claude-e2e-*@example.com accounts.
const RESERVED_DOMAIN = /(^|\.)(example\.(com|net|org)|example|test|invalid|localhost)$/i;

const PUBLIC_DNS = ['1.1.1.1', '8.8.8.8'];
const RESOLVER_OPTIONS = { timeout: 2500, tries: 1 };

type Answer = 'yes' | 'no' | 'unknown';

/**
 * Cheap first check before mailing a signup code: does the email's domain
 * accept mail at all? Catches typos like "gmail.con" straight away. It cannot
 * tell whether the mailbox itself exists (no provider, Google included, offers
 * that); the emailed code is what proves the address.
 *
 * DNS trouble on our side never blocks a signup.
 */
export async function emailDomainAcceptsMail(email: string): Promise<boolean> {
  const domain = email.split('@').pop()?.trim().toLowerCase() || '';
  if (!domain) return false;
  if (RESERVED_DOMAIN.test(domain)) return process.env.NODE_ENV === 'development';

  const answer = await askResolver(new dns.Resolver(RESOLVER_OPTIONS), domain);
  if (answer !== 'unknown') return answer === 'yes';

  // The machine's own DNS didn't answer (seen on Windows dev machines whose
  // resolver is a local proxy Node can't reach): ask public DNS instead.
  const publicResolver = new dns.Resolver(RESOLVER_OPTIONS);
  publicResolver.setServers(PUBLIC_DNS);
  return (await askResolver(publicResolver, domain)) !== 'no';
}

async function askResolver(resolver: dns.Resolver, domain: string): Promise<Answer> {
  try {
    const records = await resolver.resolveMx(domain);
    // A "null MX" (RFC 7505: one record with an empty exchange) means the domain takes no mail.
    return records.some(r => r.exchange && r.exchange !== '.') ? 'yes' : 'no';
  } catch (err) {
    if (!isMissing(err)) return 'unknown';
    if (errCode(err) === 'ENOTFOUND') return 'no'; // the domain does not exist
  }
  // No MX record: mail falls back to the domain's own address.
  try {
    return (await resolver.resolve4(domain)).length > 0 ? 'yes' : 'no';
  } catch (err) {
    return isMissing(err) ? 'no' : 'unknown';
  }
}

function errCode(err: unknown): string | undefined {
  return (err as NodeJS.ErrnoException)?.code;
}

/** The DNS answered "no such name / no such record", as opposed to failing to answer. */
function isMissing(err: unknown): boolean {
  const code = errCode(err);
  return code === 'ENOTFOUND' || code === 'ENODATA';
}
