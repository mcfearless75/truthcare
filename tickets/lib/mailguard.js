/**
 * Inbound mail guards (spec §6.1, §6.5). Pure functions over Graph message
 * objects ({ subject, from, toRecipients, ccRecipients, internetMessageHeaders }).
 *
 * The polled mailbox is infotech@ — a real, human-read inbox. Only mail
 * addressed to the tickets@ alias (or tickets+<tag>@) is ours; everything
 * else is ignored and untouched.
 */

export function addressOf(recipient) {
  if (!recipient) return '';
  if (typeof recipient === 'string') return recipient.trim().toLowerCase();
  const a = recipient.emailAddress?.address ?? recipient.address ?? '';
  return String(a).trim().toLowerCase();
}

export function addressesOf(list) {
  return (Array.isArray(list) ? list : []).map(addressOf).filter(Boolean);
}

/** To recipients followed by Cc recipients, lower-cased. */
export function recipientsOf(message) {
  return [...addressesOf(message?.toRecipients), ...addressesOf(message?.ccRecipients)];
}

function splitAddress(a) {
  const i = a.lastIndexOf('@');
  return i < 0 ? [a, ''] : [a.slice(0, i), a.slice(i + 1)];
}

/** True when To/Cc contains tickets@<domain> or tickets+<anything>@<domain>. */
export function isForTickets(message, ticketsAddress) {
  const [local, domain] = splitAddress(String(ticketsAddress || '').toLowerCase());
  return recipientsOf(message).some((a) => {
    const [l, d] = splitAddress(a);
    return d === domain && (l === local || l.startsWith(`${local}+`));
  });
}

/** From tickets@, infotech@ (spec §2: both are "us") or a plus-addressed form of either. */
export function isOwnMail(fromEmail, ownAddresses) {
  const from = String(fromEmail || '').trim().toLowerCase();
  if (!from) return false;
  const [fl, fd] = splitAddress(from);
  const fromBase = `${fl.split('+')[0]}@${fd}`;
  return (ownAddresses || []).some((own) => {
    const o = String(own || '').trim().toLowerCase();
    return o === from || o === fromBase;
  });
}

export function headerValue(message, name) {
  const wanted = String(name).toLowerCase();
  for (const h of message?.internetMessageHeaders || []) {
    if (String(h?.name || '').toLowerCase() === wanted) return String(h.value ?? '').trim();
  }
  return '';
}

const AUTO_SUBJECT_RE = /^(automatic reply|auto[- ]?reply|out of office|undeliverable|delivery status|delivery has failed|mail delivery failed)/i;

export function isAutoReply(message) {
  if (AUTO_SUBJECT_RE.test(String(message?.subject || '').trim())) return true;
  const autoSubmitted = headerValue(message, 'Auto-Submitted');
  if (autoSubmitted && !/^no$/i.test(autoSubmitted)) return true;
  if (headerValue(message, 'X-Autoreply') || headerValue(message, 'X-Autorespond')) return true;
  if (/^(bulk|junk|list|auto_reply)$/i.test(headerValue(message, 'Precedence'))) return true;
  return false;
}

export function shouldProcess(message, { ticketsAddress, ownAddresses }) {
  if (!isForTickets(message, ticketsAddress)) return { ok: false, reason: 'not_for_tickets' };
  if (isOwnMail(addressOf(message?.from), ownAddresses)) return { ok: false, reason: 'own_mail' };
  if (isAutoReply(message)) return { ok: false, reason: 'auto_reply' };
  return { ok: true };
}
