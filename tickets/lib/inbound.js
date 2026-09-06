/**
 * Email door (spec §6.1, §6.3–§6.5): poll infotech@ for mail addressed to
 * tickets@, thread it, and either apply staff commands, attach a caller
 * reply, or create a ticket. Nothing is silently dropped: every message
 * ends in processed_messages with an outcome, and a message that blows up
 * mid-way still becomes a bare general ticket carrying the error.
 *
 * Overlap guard: spec §6.5 names pg_try_advisory_lock(4201). The Neon HTTP
 * driver runs every statement in its own session, so a session-scoped
 * advisory lock would be released the instant the statement returned. The
 * same guarantee (overlapping run exits with { skipped: true }) comes from a
 * 4-minute lease row `lock:4201` in settings, compared as ISO timestamps.
 */
import sql from './db.js';
import { ticketsAddress, ownAddresses, ticketsLocalPart, ticketsDomain } from './config.js';
import { listMessages, sendMail, messageBodyText } from './graph.js';
import { shouldProcess, addressOf, recipientsOf, isDeliveryFailure } from './mailguard.js';
import { matchTicket, normaliseSubject } from './threading.js';
import { parseCommands, unknownMessage } from './commands.js';
import { classify } from './classify.js';
import { staffByEmail, staffById } from './staff.js';
import { createTicket, applyCommand, addNote, addEvent, getTicketById, threadingLookup, CommandError } from './tickets.js';
import { recipientsFor, notifyRecipients, queueBounce, notify } from './notify.js';

export const LOCK_KEY = 'lock:4201';
export const LEASE_MS = 4 * 60 * 1000;
export const LOOKBACK_MS = 10 * 60 * 1000;
export const FIRST_RUN_LOOKBACK_MS = 60 * 60 * 1000;
export const MAX_PER_RUN = 20;
export const ATTACHMENT_NOTE = 'This email had attachments. They are not imported — see the original message in the infotech@ inbox.';

// ── settings / lease ───────────────────────────────────────────────────────

export async function getSetting(key, { db = sql } = {}) {
  const [row] = await db`SELECT value FROM settings WHERE key = ${key} LIMIT 1`;
  return row ? row.value : null;
}

export async function setSetting(key, value, { db = sql } = {}) {
  await db`INSERT INTO settings (key, value) VALUES (${key}, ${String(value)}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
}

/** Returns the lease value (its expiry ISO) when acquired, null when another run holds an unexpired lease. */
export async function acquireLease({ db = sql, now = Date.now() } = {}) {
  const expires = new Date(now + LEASE_MS).toISOString();
  const nowIso = new Date(now).toISOString();
  const rows = await db`INSERT INTO settings (key, value) VALUES (${LOCK_KEY}, ${expires}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now() WHERE settings.value < ${nowIso} RETURNING key`;
  return rows.length ? expires : null;
}

export async function releaseLease(value, { db = sql } = {}) {
  await db`DELETE FROM settings WHERE key = ${LOCK_KEY} AND value = ${value}`;
}

export async function pollSince({ db = sql, now = Date.now() } = {}) {
  const last = Date.parse((await getSetting('last_poll', { db })) || '');
  return new Date((Number.isFinite(last) ? last - LOOKBACK_MS : now - FIRST_RUN_LOOKBACK_MS));
}

// ── dedupe ─────────────────────────────────────────────────────────────────

const messageKey = (m) => String(m.internetMessageId || m.id || '').trim();

export async function filterUnprocessed(messages, { db = sql } = {}) {
  const keyed = messages.filter(messageKey);
  if (!keyed.length) return [];
  const rows = await db`SELECT internet_message_id FROM processed_messages WHERE internet_message_id = ANY(${keyed.map(messageKey)}::text[])`;
  const seen = new Set(rows.map((r) => r.internet_message_id));
  return keyed.filter((m) => !seen.has(messageKey(m)));
}

export async function markProcessed(message, ticketId, outcome, { db = sql } = {}) {
  await db`INSERT INTO processed_messages (internet_message_id, ticket_id, outcome) VALUES (${messageKey(message)}, ${ticketId || null}, ${String(outcome).slice(0, 200)}) ON CONFLICT (internet_message_id) DO NOTHING`;
}

// ── per-message handling ───────────────────────────────────────────────────

function senderOf(message) {
  return { email: addressOf(message?.from), name: String(message?.from?.emailAddress?.name || '').trim() };
}

function bodyWithAttachmentNote(message) {
  const text = messageBodyText(message);
  return message?.hasAttachments ? `${text}\n\n(${ATTACHMENT_NOTE})`.trim() : text;
}

/** Staff reply on a known ticket: apply commands, or bounce. */
export async function applyParsedEmail(ticket, parsed, staff, { db = sql, send = sendMail } = {}) {
  const actor = { id: staff.id, name: staff.name, email: staff.email, type: 'staff' };
  const applied = [];
  const failed = [];
  if (parsed.unknown.length) {
    const messages = parsed.unknown.map(unknownMessage);
    await addNote(ticket.id, { body: messages.join('\n'), authorType: 'system', authorName: 'Tickets', isInternal: true }, { db });
    await queueBounce({ to: staff.email, ticket, unknown: parsed.unknown, messages }, { db, send });
    return { applied, failed: parsed.unknown, bounced: true };
  }
  let current = ticket;
  for (const command of parsed.commands) {
    try {
      const r = await applyCommand(current, command, actor, { via: 'email', db, send });
      current = r.ticket;
      applied.push(command.raw);
    } catch (e) {
      if (!(e instanceof CommandError)) throw e;
      failed.push(`${command.raw}: ${e.message}`);
    }
  }
  if (parsed.note) {
    await applyCommand(current, { type: 'note', value: parsed.note }, actor, { via: 'email', db, send });
    applied.push('note');
  }
  if (failed.length) {
    await addNote(ticket.id, { body: failed.map((f) => `Couldn't apply '${f}'`).join('\n'), authorType: 'system', authorName: 'Tickets', isInternal: true }, { db });
    await queueBounce({ to: staff.email, ticket, unknown: failed, messages: failed.map((f) => `Couldn't apply ${f}`) }, { db, send });
  }
  return { applied, failed, bounced: failed.length > 0 };
}

/** Non-staff mail on a known ticket: caller note, reopen if closed, tell the assignee (never echo to the caller). */
export async function addCallerReply(ticket, { body, name, email }, { db = sql, send = sendMail } = {}) {
  const note = await addNote(ticket.id, { body, authorType: 'caller', authorName: name || email, authorEmail: email, isInternal: false }, { db });
  let current = ticket;
  if (ticket.status === 'closed') {
    await db.query('UPDATE tickets SET status = $1, updated_at = now(), closed_at = NULL WHERE id = $2 RETURNING id', ['open', ticket.id]);
    await addEvent(ticket.id, { event: 'status', actor: name || email, fromValue: 'closed', toValue: 'open', via: 'email' }, { db });
    current = await getTicketById(ticket.id, { db });
  }
  const assignee = current.assignedTo ? await staffById(current.assignedTo, { db }) : null;
  const { staff } = await recipientsFor('updated', current, { db, assignee, note: { ...note, isInternal: true } });
  if (staff.length) await notifyRecipients('updated', current, staff, { audience: 'staff', ticket: current, note, assignee }, { db, send });
  return note;
}

/** Anyone's mail that matches nothing: classify and create. */
export async function createTicketFromEmail(message, { db = sql, send = sendMail, classifier = classify } = {}) {
  const from = senderOf(message);
  const subject = normaliseSubject(message.subject) || '(no subject)';
  const body = bodyWithAttachmentNote(message);
  const c = await classifier(subject, body);
  const ticket = await createTicket({
    category: c.category,
    priority: c.priority,
    subject,
    summary: body || subject,
    callerName: from.name || from.email,
    callerEmail: from.email,
    source: 'email',
    graphConversationId: message.conversationId || null,
    initialNote: { body: `Classified by ${c.via} as ${c.category} / ${c.priority}${c.summary ? ` — ${c.summary}` : ''}. Reply with "category …" or "priority …" to correct.`, authorType: 'system', authorName: 'Tickets', isInternal: true },
  }, { via: 'email', actor: { name: from.name || from.email, email: from.email }, db, send });
  return ticket;
}

/**
 * @returns {Promise<{ outcome: string, ticketId: string|null, ticketNumber: number|null }>}
 */
/**
 * C1: a non-delivery report (NDR) that reads as an "auto_reply" skip is not
 * always safe to drop silently — if it threads back to one of our own
 * tickets, it means an outbound email to that ticket's caller bounced, and
 * the caller believes they've been contacted when they haven't. Attach an
 * internal note and alert staff instead of leaving only a `skip:auto_reply`
 * row in processed_messages. An NDR that matches no ticket is still a bare
 * skip, unchanged.
 */
async function handleUndeliverableBounce(message, { db, send }) {
  if (!isDeliveryFailure(message)) return null;
  const match = await matchTicket(
    { recipients: recipientsOf(message), conversationId: message.conversationId || null, fromEmail: '', subject: message.subject },
    threadingLookup({ db }),
    { localPart: ticketsLocalPart(), domain: ticketsDomain() },
  );
  if (!match) return null;
  const { ticket, tier } = match;
  const note = await addNote(ticket.id, {
    body: "Delivery failed for the caller's email address — a message to them did not arrive. Check the caller's contact number instead.",
    authorType: 'system', authorName: 'Tickets', isInternal: true,
  }, { db });
  const assignee = ticket.assignedTo ? await staffById(ticket.assignedTo, { db }) : null;
  await notify('updated', ticket, { db, send, assignee, note });
  return { outcome: `bounce_alert:${tier}`, ticketId: ticket.id, ticketNumber: ticket.number };
}

export async function processMessage(message, { db = sql, send = sendMail, classifier = classify } = {}) {
  const guard = shouldProcess(message, { ticketsAddress: ticketsAddress(), ownAddresses: ownAddresses() });
  if (!guard.ok) {
    if (guard.reason === 'auto_reply') {
      const bounced = await handleUndeliverableBounce(message, { db, send });
      if (bounced) return bounced;
    }
    return { outcome: `skip:${guard.reason}`, ticketId: null, ticketNumber: null };
  }

  const from = senderOf(message);
  const match = await matchTicket(
    { recipients: recipientsOf(message), conversationId: message.conversationId || null, fromEmail: from.email, subject: message.subject },
    threadingLookup({ db }),
    { localPart: ticketsLocalPart(), domain: ticketsDomain() },
  );
  const staff = await staffByEmail(from.email, { db });
  const body = bodyWithAttachmentNote(message);

  if (match) {
    const { ticket, tier } = match;
    if (tier !== 'conversation' && message.conversationId && ticket.graphConversationId !== message.conversationId) {
      await db`UPDATE tickets SET graph_conversation_id = ${message.conversationId} WHERE id = ${ticket.id}`;
    }
    if (staff) {
      const r = await applyParsedEmail(ticket, parseCommands(body), staff, { db, send });
      return { outcome: r.bounced ? `staff:bounced` : `staff:${r.applied.length ? r.applied.join(',').slice(0, 150) : 'nothing'}`, ticketId: ticket.id, ticketNumber: ticket.number };
    }
    await addCallerReply(ticket, { body: body || '(empty message)', name: from.name, email: from.email }, { db, send });
    return { outcome: `caller_reply:${tier}`, ticketId: ticket.id, ticketNumber: ticket.number };
  }

  const ticket = await createTicketFromEmail(message, { db, send, classifier });
  return { outcome: staff ? 'staff_new_ticket' : 'new_ticket', ticketId: ticket.id, ticketNumber: ticket.number };
}

/** Last resort so a crashing message still becomes a ticket (spec §2 "nothing silently dropped"). */
async function fallbackTicket(message, error, { db, send }) {
  const from = senderOf(message);
  return createTicket({
    category: 'general',
    subject: normaliseSubject(message.subject) || '(no subject)',
    summary: messageBodyText(message) || '(no body)',
    callerName: from.name || from.email || 'Unknown sender',
    callerEmail: from.email || null,
    source: 'email',
    graphConversationId: message.conversationId || null,
    initialNote: { body: `Automatic processing failed, ticket created without classification or threading.\nError: ${String(error?.message || error).slice(0, 500)}`, authorType: 'system', authorName: 'Tickets', isInternal: true },
  }, { via: 'email', db, send });
}

// ── the poll ───────────────────────────────────────────────────────────────

export async function processInbox({ db = sql, send = sendMail, list = listMessages, classifier = classify, now = Date.now() } = {}) {
  const lease = await acquireLease({ db, now });
  if (!lease) return { skipped: true, reason: 'another run holds the lease' };
  const stats = { fetched: 0, processed: 0, outcomes: {}, errors: [], cursor: null };
  try {
    const since = await pollSince({ db, now });
    const all = await list({ since });
    stats.fetched = all.length;
    const fresh = await filterUnprocessed(all, { db });
    const batch = fresh.slice(0, MAX_PER_RUN);
    for (const message of batch) {
      let result;
      try {
        result = await processMessage(message, { db, send, classifier });
      } catch (e) {
        console.error(`[inbound] ${messageKey(message)} failed:`, e);
        stats.errors.push({ id: messageKey(message), error: String(e?.message || e) });
        const t = await fallbackTicket(message, e, { db, send });
        result = { outcome: `error:${String(e?.message || e).slice(0, 120)}`, ticketId: t.id, ticketNumber: t.number };
      }
      await markProcessed(message, result.ticketId, result.outcome, { db });
      stats.processed++;
      const bucket = result.outcome.split(':')[0];
      stats.outcomes[bucket] = (stats.outcomes[bucket] || 0) + 1;
    }
    stats.cursor = fresh.length > MAX_PER_RUN ? String(batch[batch.length - 1].receivedDateTime) : new Date(now).toISOString();
    await setSetting('last_poll', stats.cursor, { db });
    return stats;
  } finally {
    await releaseLease(lease, { db });
  }
}
