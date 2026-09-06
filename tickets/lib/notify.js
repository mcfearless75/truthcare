/**
 * Outbound notifications (spec §6.2, §8). Every email is first written to
 * pending_notifications, then attempted immediately; anything that fails is
 * retried by ?job=notifications with a growing gap (attempts² × 5 min) up to
 * MAX_ATTEMPTS, after which last_error stays set and the board shows it.
 *
 * Recipient table (spec §6.2):
 *   created          → all active staff with receives_new_tickets
 *   assigned         → the assignee
 *   updated          → assignee + every staff who has replied on the thread
 *                      (falls back to new-ticket recipients when unassigned
 *                      and nobody has replied — spec §6.3)
 *   closed / public  → as updated, PLUS caller_email when present and the
 *   note               note is not internal
 *
 * A note is only ever treated as public when isPublicNote() says so — see
 * that helper for why an omitted/ambiguous isInternal must fail closed.
 */
import sql, { toCamel, toCamelArray } from './db.js';
import { sendMail } from './graph.js';
import { renderEmail, replyToFor } from './templates.js';
import { newTicketRecipients, adminStaff } from './staff.js';

export const MAX_ATTEMPTS = 5;
export const BACKOFF_BASE_MS = 5 * 60 * 1000;

/** Delay before the next try after `attempts` failures: 5, 20, 45, 80 minutes. */
export function backoffMs(attempts) {
  const n = Math.max(1, Number(attempts) || 1);
  return BACKOFF_BASE_MS * n * n;
}

const dedupe = (list) => [...new Set(list.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))];

/**
 * A note counts as public ONLY when isInternal is explicitly `false`.
 * Anything else — `true`, `undefined`, `null`, a missing note — is treated
 * as internal. This is a deliberate fail-closed default: a note built
 * in-memory (rather than round-tripped through the ticket_notes table,
 * whose is_internal column is NOT NULL) must never leak to the caller just
 * because a caller of this module forgot to set the flag. This is the same
 * class of bug Task 7's review found in templates.renderCallerEmail
 * (an omitted note.isInternal rendered as public) — guarded again here so
 * it can never reach that render path via lib/notify.js.
 */
export function isPublicNote(note) {
  return !!note && note.isInternal === false;
}

/** Staff who have written a note on this ticket (distinct emails). */
export async function threadParticipants(ticketId, { db = sql } = {}) {
  const rows = await db`SELECT DISTINCT lower(author_email) AS email FROM ticket_notes WHERE ticket_id = ${ticketId} AND author_type = 'staff' AND author_email IS NOT NULL`;
  return rows.map((r) => r.email);
}

/**
 * @returns {Promise<{ staff: string[], caller: string|null }>}
 */
export async function recipientsFor(kind, ticket, { db = sql, assignee = null, note = null } = {}) {
  if (kind === 'created') {
    return { staff: dedupe((await newTicketRecipients({ db })).map((s) => s.email)), caller: null };
  }
  if (kind === 'assigned') {
    return { staff: dedupe([assignee?.email]), caller: null };
  }
  let staff = dedupe([assignee?.email, ...(await threadParticipants(ticket.id, { db }))]);
  if (!staff.length) staff = dedupe((await newTicketRecipients({ db })).map((s) => s.email));
  const callerWanted = kind === 'closed' || (kind === 'updated' && isPublicNote(note));
  const caller = callerWanted && ticket.callerEmail ? String(ticket.callerEmail).trim().toLowerCase() : null;
  return { staff, caller };
}

/** Insert one pending row per recipient. Returns the camelCase rows. */
export async function queueNotification(kind, ticket, recipients, payload, { db = sql } = {}) {
  const out = [];
  for (const recipient of dedupe(recipients)) {
    const [row] = await db`
      INSERT INTO pending_notifications (ticket_id, kind, recipient, payload)
      VALUES (${ticket?.id || null}, ${kind}, ${recipient}, ${JSON.stringify(payload)})
      RETURNING id, ticket_id, kind, recipient, payload, attempts, last_error, next_attempt_at, created_at, sent_at
    `;
    out.push(toCamel(row));
  }
  return out;
}

const parsePayload = (p) => (typeof p === 'string' ? JSON.parse(p) : p || {});

/** Try to send one pending row now; records success or schedules the retry. Never throws. */
export async function deliverOne(row, { db = sql, send = sendMail, now = Date.now() } = {}) {
  const payload = parsePayload(row.payload);
  try {
    const email = renderEmail(row.kind, payload);
    await send({
      to: row.recipient,
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(payload.ticket?.emailToken ? { replyTo: replyToFor(payload.ticket) } : {}),
    });
    await db`UPDATE pending_notifications SET sent_at = now(), attempts = attempts + 1, last_error = NULL WHERE id = ${row.id}`;
    return { ok: true };
  } catch (e) {
    const attempts = (Number(row.attempts) || 0) + 1;
    const next = new Date(now + backoffMs(attempts)).toISOString();
    const message = String(e?.message || e).slice(0, 1000);
    await db`UPDATE pending_notifications SET attempts = ${attempts}, last_error = ${message}, next_attempt_at = ${next} WHERE id = ${row.id}`;
    console.error(`[notify] ${row.kind} to ${row.recipient} failed (attempt ${attempts}): ${message}`);
    return { ok: false, attempts, error: message };
  }
}

/** Queue + immediate attempt. Returns the pending rows (so callers can report ids). */
export async function notifyRecipients(kind, ticket, recipients, payload, { db = sql, send = sendMail, immediate = true } = {}) {
  const rows = await queueNotification(kind, ticket, recipients, payload, { db });
  if (immediate) for (const row of rows) await deliverOne(row, { db, send });
  return rows;
}

/**
 * Fan out one ticket event. `note`/`event`/`assignee` are plain objects
 * that go into the payload verbatim (see templates.renderEmail). `note`,
 * if present, is normalised to an explicit boolean isInternal before it is
 * ever written into a payload — staff or caller — so a stored
 * pending_notifications row can never carry an ambiguous flag.
 */
export async function notify(kind, ticket, { db = sql, send = sendMail, immediate = true, assignee = null, note = null, event = null } = {}) {
  const { staff, caller } = await recipientsFor(kind, ticket, { db, assignee, note });
  const safeNote = note ? { ...note, isInternal: !isPublicNote(note) } : null;
  const base = { ticket, assignee, note: safeNote, event };
  const queued = [];
  if (staff.length) queued.push(...await notifyRecipients(kind, ticket, staff, { ...base, audience: 'staff' }, { db, send, immediate }));
  if (caller) {
    const callerKind = kind === 'closed' ? 'closed' : 'caller_reply';
    queued.push(...await notifyRecipients(callerKind, ticket, [caller], { ...base, audience: 'caller' }, { db, send, immediate }));
  }
  return queued;
}

export async function queueBounce({ to, ticket = null, unknown = [], messages = [] }, { db = sql, send = sendMail, immediate = true } = {}) {
  return notifyRecipients('bounce', ticket, [to], { ticket, unknown, messages }, { db, send, immediate });
}

/** Retry cron: due rows with attempts < MAX_ATTEMPTS, oldest first. */
export async function deliverPending({ db = sql, send = sendMail, now = Date.now(), limit = 20 } = {}) {
  const rows = toCamelArray(await db`
    SELECT id, ticket_id, kind, recipient, payload, attempts, last_error, next_attempt_at
    FROM pending_notifications
    WHERE sent_at IS NULL AND attempts < ${MAX_ATTEMPTS} AND next_attempt_at <= now()
    ORDER BY created_at ASC LIMIT ${limit}
  `);
  const result = { sent: 0, failed: 0, exhausted: 0 };
  for (const row of rows) {
    const r = await deliverOne(row, { db, send, now });
    if (r.ok) result.sent++;
    else if (r.attempts >= MAX_ATTEMPTS) result.exhausted++;
    else result.failed++;
  }
  return result;
}

/** Spec §8: failed Retell calls are emailed to admins on the next cron, once. */
export async function alertFailedCalls({ db = sql, send = sendMail } = {}) {
  const rows = toCamelArray(await db`SELECT id, retell_call_id, action, args, error, created_at FROM failed_calls WHERE alerted_at IS NULL ORDER BY created_at ASC LIMIT 50`);
  if (!rows.length) return { alerted: 0 };
  const admins = dedupe((await adminStaff({ db })).map((s) => s.email));
  if (!admins.length) { console.error('[notify] failed calls waiting but no admin staff to alert'); return { alerted: 0, noAdmins: true }; }
  await notifyRecipients('failed_calls', null, admins, { rows }, { db, send });
  const ids = rows.map((r) => r.id);
  await db`UPDATE failed_calls SET alerted_at = now() WHERE id = ANY(${ids}::uuid[])`;
  return { alerted: rows.length };
}
