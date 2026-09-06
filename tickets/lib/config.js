/**
 * Environment access in one place. Everything is read at call time (not module
 * load) so tests can set process.env before calling and pure modules never
 * need a configured environment just to be imported.
 */
export function env(name, fallback = '') {
  const v = (process.env[name] ?? '').trim();
  return v || fallback;
}

export function requireEnv(name) {
  const v = env(name);
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

/** The real mailbox Graph reads from and sends through (infotech@). */
export function mailboxAddress() {
  return env('MAILBOX_ADDRESS', 'infotech@truthcaregroup.co.uk').toLowerCase();
}

/** The alias we send as and match inbound recipients against (tickets@). */
export function ticketsAddress() {
  return env('TICKETS_ADDRESS', 'tickets@truthcaregroup.co.uk').toLowerCase();
}

export function ticketsLocalPart() {
  return ticketsAddress().split('@')[0];
}

export function ticketsDomain() {
  return ticketsAddress().split('@')[1];
}

/** Both addresses are "us" for loop protection (spec §2). */
export function ownAddresses() {
  return [ticketsAddress(), mailboxAddress()];
}

export function appUrl() {
  return env('APP_URL', 'https://tickets.truthcaregroup.co.uk').replace(/\/+$/, '');
}

const splitList = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

/**
 * Recipients for the daily digest email (spec addendum 2026-09-06): the
 * care-management leads get it as "to", the IT/system mailbox gets it as
 * "bcc" so it doesn't look like a third addressee. Overridable via env so
 * the list can change without a redeploy touching code.
 */
export function digestRecipients() {
  return {
    to: splitList(env('DIGEST_TO', 'kumi@truthcaregroup.co.uk,joanne@truthcaregroup.co.uk')),
    bcc: splitList(env('DIGEST_BCC', 'infotech@truthcaregroup.co.uk')),
  };
}
