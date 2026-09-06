/**
 * Email threading (spec §6.4). Pure: the only I/O is behind the injected
 * `lookup` object, so the tier ordering is unit-testable.
 *
 * Reply-To addresses look like  tickets+tc42-abcd2345@truthcaregroup.co.uk
 * The token (8 chars, base32 lower) is what proves the reply belongs to the
 * ticket; the number alone is never trusted.
 */
import { randomBytes } from 'node:crypto';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567'; // RFC 4648 base32, lower-cased
export const TOKEN_LENGTH = 8;

export function generateToken() {
  const bytes = randomBytes(TOKEN_LENGTH);
  let out = '';
  for (const b of bytes) out += ALPHABET[b & 31]; // 256 % 32 === 0 → uniform
  return out;
}

export function isToken(s) {
  return /^[a-z2-7]{8}$/.test(String(s || ''));
}

export function buildReplyTo(number, token, domain, localPart = 'tickets') {
  return `${localPart}+tc${number}-${token}@${domain}`;
}

const REPLY_TO_RE = /^([a-z0-9._-]+)\+tc(\d{1,9})-([a-z2-7]{8})@([a-z0-9.-]+)$/;

/** Case-insensitive; tolerates "Display Name <addr>" wrappers. Null if not a ticket reply-to. */
export function parseReplyTo(address) {
  let s = String(address || '').trim();
  const angled = /<([^>]+)>/.exec(s);
  if (angled) s = angled[1].trim();
  const m = REPLY_TO_RE.exec(s.toLowerCase());
  if (!m) return null;
  return { localPart: m[1], number: Number(m[2]), token: m[3], domain: m[4] };
}

export function findTicketRef(addresses, { localPart = 'tickets', domain } = {}) {
  for (const a of addresses || []) {
    const ref = parseReplyTo(a);
    if (!ref) continue;
    if (localPart && ref.localPart !== localPart.toLowerCase()) continue;
    if (domain && ref.domain !== domain.toLowerCase()) continue;
    return { number: ref.number, token: ref.token };
  }
  return null;
}

/** Strip stacked Re:/Fwd:/Fw: prefixes so thread subjects compare equal. */
export function normaliseSubject(s) {
  let out = String(s || '').trim();
  const re = /^(re|fwd?|fw|aw|sv)\s*:\s*/i;
  while (re.test(out)) out = out.replace(re, '');
  return out.trim();
}

export function subjectTicketNumber(subject) {
  const m = /\[tc-(\d{1,9})\]/i.exec(String(subject || ''));
  return m ? Number(m[1]) : null;
}

/**
 * Tier order (spec §6.4):
 *   1. tickets+tc<n>-<token>@ in any To/Cc → byToken(n, token)
 *   2. Graph conversationId → byConversation(id)
 *   3. sender email == caller_email AND subject contains [TC-n] → byCallerAndNumber(email, n)
 *   4. null → caller creates a new ticket
 */
export async function matchTicket({ recipients = [], conversationId = null, fromEmail = '', subject = '' }, lookup, opts = {}) {
  const ref = findTicketRef(recipients, opts);
  if (ref) {
    const t = await lookup.byToken(ref.number, ref.token);
    if (t) return { ticket: t, tier: 'token' };
  }
  if (conversationId) {
    const t = await lookup.byConversation(conversationId);
    if (t) return { ticket: t, tier: 'conversation' };
  }
  const n = subjectTicketNumber(subject);
  const email = String(fromEmail || '').trim().toLowerCase();
  if (n && email) {
    const t = await lookup.byCallerAndNumber(email, n);
    if (t) return { ticket: t, tier: 'subject' };
  }
  return null;
}
