/**
 * The one write path (spec §3). Phone, email and board all end up in
 * createTicket() / applyCommand() so behaviour and notifications are
 * identical whatever the door. Every function takes an injectable `db`
 * (neon tag) and the notify layer takes `send`, so this module smoke-tests
 * without Postgres or Graph.
 *
 * Notes are only ever built via addNote(), which always writes an explicit
 * boolean is_internal (default false) to the ticket_notes.is_internal
 * column (NOT NULL) — so every note object this module hands to
 * notify()/renderEmail already carries a real boolean, never undefined.
 * See lib/notify.js's isPublicNote() for the second line of defence.
 */
import sql, { toCamel, toCamelArray } from './db.js';
import { generateToken } from './threading.js';
import { computePriority, isCategory, isPriority } from './priority.js';
import { resolveStaff, staffById, staffByEmail } from './staff.js';
import { notify } from './notify.js';

export const STATUSES = ['open', 'in_progress', 'closed'];
export const SUMMARY_MAX = 8000;
export const FIELD_MAX = 200;

export class CommandError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CommandError';
    this.code = code;
  }
}

const clip = (v, max = FIELD_MAX) => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};

const TICKET_COLUMNS = 'id, number, status, priority, category, source, subject, summary, caller_name, caller_phone, caller_email, caller_org, subject_person, assigned_to, email_token, graph_conversation_id, retell_call_id, created_at, updated_at, closed_at';

// ── finders ────────────────────────────────────────────────────────────────

// The neon tag has no fragment composition, so statements that need the shared
// column list go through db.query(text, params) with numbered placeholders.
async function one(db, text, params) {
  const [row] = await db.query(text, params);
  return toCamel(row || null);
}

export async function getTicketById(id, { db = sql } = {}) {
  return one(db, `SELECT ${TICKET_COLUMNS} FROM tickets WHERE id = $1 LIMIT 1`, [id]);
}

export async function getTicketByNumber(number, { db = sql } = {}) {
  return one(db, `SELECT ${TICKET_COLUMNS} FROM tickets WHERE number = $1 LIMIT 1`, [Number(number)]);
}

export async function getTicketByToken(number, token, { db = sql } = {}) {
  return one(db, `SELECT ${TICKET_COLUMNS} FROM tickets WHERE number = $1 AND email_token = $2 LIMIT 1`, [Number(number), String(token)]);
}

export async function getTicketByConversation(conversationId, { db = sql } = {}) {
  return one(db, `SELECT ${TICKET_COLUMNS} FROM tickets WHERE graph_conversation_id = $1 ORDER BY created_at DESC LIMIT 1`, [String(conversationId)]);
}

export async function getTicketByCallerAndNumber(email, number, { db = sql } = {}) {
  return one(db, `SELECT ${TICKET_COLUMNS} FROM tickets WHERE number = $1 AND lower(caller_email) = $2 LIMIT 1`, [Number(number), String(email).toLowerCase()]);
}

export async function getTicketByRetellCallId(callId, { db = sql } = {}) {
  if (!callId) return null;
  return one(db, `SELECT ${TICKET_COLUMNS} FROM tickets WHERE retell_call_id = $1 ORDER BY created_at DESC LIMIT 1`, [String(callId)]);
}

/** Lookup object in the shape lib/threading.js matchTicket expects. */
export function threadingLookup({ db = sql } = {}) {
  return {
    byToken: (number, token) => getTicketByToken(number, token, { db }),
    byConversation: (id) => getTicketByConversation(id, { db }),
    byCallerAndNumber: (email, number) => getTicketByCallerAndNumber(email, number, { db }),
  };
}

/** Board list: urgent first, then newest. Filters are all optional. */
export async function listTickets({ status, priority, category, assignedTo, q, limit = 200 } = {}, { db = sql } = {}) {
  const where = [];
  const params = [];
  const add = (clause, value) => { params.push(value); where.push(clause.replace('?', `$${params.length}`)); };
  if (status && STATUSES.includes(status)) add('t.status = ?', status);
  else if (status === 'active') where.push("t.status <> 'closed'");
  if (isPriority(priority)) add('t.priority = ?', priority);
  if (isCategory(category)) add('t.category = ?', category);
  if (assignedTo === 'unassigned') where.push('t.assigned_to IS NULL');
  else if (assignedTo) add('t.assigned_to = ?', assignedTo);
  if (q && String(q).trim()) {
    const term = String(q).trim();
    params.push(`%${term}%`, term);
    const like = `$${params.length - 1}`;
    const exact = `$${params.length}`;
    where.push(`(t.subject ILIKE ${like} OR t.summary ILIKE ${like} OR t.caller_name ILIKE ${like} OR CAST(t.number AS text) = ${exact})`);
  }
  const text = `
    SELECT t.id, t.number, t.status, t.priority, t.category, t.source, t.subject, t.summary, t.caller_name, t.caller_email, t.caller_phone,
           t.subject_person, t.assigned_to, s.name AS assignee_name, t.created_at, t.updated_at, t.closed_at,
           (SELECT count(*) FROM pending_notifications p WHERE p.ticket_id = t.id AND p.sent_at IS NULL AND p.attempts >= 5) AS failed_notifications
    FROM tickets t LEFT JOIN staff s ON s.id = t.assigned_to
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, t.created_at DESC
    LIMIT ${Math.min(Math.max(Number(limit) || 200, 1), 500)}`;
  return toCamelArray(await db.query(text, params));
}

export async function getTicketDetail(number, { db = sql } = {}) {
  const ticket = await getTicketByNumber(number, { db });
  if (!ticket) return null;
  const [notes, events, assignee] = await Promise.all([
    db`SELECT id, body, author_type, author_name, author_email, is_internal, created_at FROM ticket_notes WHERE ticket_id = ${ticket.id} ORDER BY created_at ASC`,
    db`SELECT id, event, actor, from_value, to_value, via, created_at FROM ticket_events WHERE ticket_id = ${ticket.id} ORDER BY created_at ASC`,
    staffById(ticket.assignedTo, { db }),
  ]);
  const failed = toCamelArray(await db`SELECT id, kind, recipient, attempts, last_error, created_at FROM pending_notifications WHERE ticket_id = ${ticket.id} AND sent_at IS NULL AND attempts >= 5 ORDER BY created_at DESC`);
  return { ticket, notes: toCamelArray(notes), events: toCamelArray(events), assignee, failedNotifications: failed };
}

// ── writes ─────────────────────────────────────────────────────────────────

/** Always writes an explicit boolean to is_internal (default false, coerced with !!) — never undefined. */
export async function addNote(ticketId, { body, authorType = 'system', authorName = null, authorEmail = null, isInternal = false }, { db = sql } = {}) {
  const text = String(body || '').trim().slice(0, SUMMARY_MAX);
  if (!text) return null;
  const [row] = await db`
    INSERT INTO ticket_notes (ticket_id, body, author_type, author_name, author_email, is_internal)
    VALUES (${ticketId}, ${text}, ${authorType}, ${clip(authorName)}, ${clip(authorEmail)?.toLowerCase() || null}, ${!!isInternal})
    RETURNING id, ticket_id, body, author_type, author_name, author_email, is_internal, created_at
  `;
  await db`UPDATE tickets SET updated_at = now() WHERE id = ${ticketId}`;
  return toCamel(row);
}

export async function addEvent(ticketId, { event, actor = null, fromValue = null, toValue = null, via }, { db = sql } = {}) {
  const [row] = await db`
    INSERT INTO ticket_events (ticket_id, event, actor, from_value, to_value, via)
    VALUES (${ticketId}, ${event}, ${clip(actor)}, ${clip(fromValue)}, ${clip(toValue)}, ${via})
    RETURNING id, ticket_id, event, actor, from_value, to_value, via, created_at
  `;
  return toCamel(row);
}

/**
 * @param input { category, priority?, subject?, summary, callerName?, callerPhone?, callerEmail?, callerOrg?,
 *                subjectPerson?, source, graphConversationId?, retellCallId?, shiftStartsAt?, initialNote? }
 */
export async function createTicket(input, { via, actor = null, db = sql, send, immediate = true } = {}) {
  const category = isCategory(input.category) ? input.category : 'general';
  const source = ['phone', 'email', 'board'].includes(input.source) ? input.source : via;
  const summary = String(input.summary || '').trim().slice(0, SUMMARY_MAX);
  const priority = computePriority({ category, summary: `${input.subject || ''} ${summary}`, shiftStartsAt: input.shiftStartsAt, explicit: input.priority });
  const emailToken = generateToken();
  const ticket = await one(db, `
    INSERT INTO tickets (status, priority, category, source, subject, summary, caller_name, caller_phone, caller_email, caller_org, subject_person, email_token, graph_conversation_id, retell_call_id)
    VALUES ('open', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING ${TICKET_COLUMNS}`, [
    priority, category, source, clip(input.subject, 300), summary || null, clip(input.callerName), clip(input.callerPhone, 40),
    clip(input.callerEmail)?.toLowerCase() || null, clip(input.callerOrg), clip(input.subjectPerson), emailToken,
    clip(input.graphConversationId, 500), clip(input.retellCallId),
  ]);
  await addEvent(ticket.id, { event: 'created', actor: actor?.name || actor?.email || source, toValue: priority, via }, { db });
  if (input.initialNote?.body) await addNote(ticket.id, input.initialNote, { db });
  await notify('created', ticket, { db, send, immediate });
  return ticket;
}

async function setField(ticket, field, value, { via, actor, db }) {
  const column = { status: 'status', priority: 'priority', category: 'category' }[field];
  const from = ticket[field];
  if (from === value) return { ticket, event: null };
  const closedAt = field === 'status' ? (value === 'closed' ? 'now()' : 'NULL') : null;
  const text = `UPDATE tickets SET ${column} = $1, updated_at = now()${closedAt ? `, closed_at = ${closedAt}` : ''} WHERE id = $2 RETURNING ${TICKET_COLUMNS}`;
  const updated = await one(db, text, [value, ticket.id]);
  const event = await addEvent(ticket.id, { event: field, actor: actor?.name || actor?.email, fromValue: from, toValue: value, via }, { db });
  return { ticket: updated, event };
}

async function assignTo(ticket, staff, { via, actor, db }) {
  if (ticket.assignedTo === staff.id) return { ticket, event: null };
  const previous = ticket.assignedTo ? await staffById(ticket.assignedTo, { db }) : null;
  const updated = await one(db, `UPDATE tickets SET assigned_to = $1, updated_at = now() WHERE id = $2 RETURNING ${TICKET_COLUMNS}`, [staff.id, ticket.id]);
  const event = await addEvent(ticket.id, { event: 'assigned', actor: actor?.name || actor?.email, fromValue: previous?.name || null, toValue: staff.name, via }, { db });
  return { ticket: updated, event };
}

/**
 * Apply one parsed command (lib/commands.js shape, plus { type: 'note', value }
 * for public notes). `actor` = { name, email, id? } — a staff member for
 * email/board, or a system actor.
 * @returns {Promise<{ ticket, events: object[], notes: object[] }>}
 */
export async function applyCommand(ticketId, command, actor, { via, db = sql, send, immediate = true } = {}) {
  const ticket = typeof ticketId === 'object' ? ticketId : await getTicketById(ticketId, { db });
  if (!ticket) throw new CommandError('no_ticket', 'Ticket not found');
  const actorLabel = actor?.name || actor?.email || via;
  const events = [];
  const notes = [];
  const opts = { via, actor, db };

  switch (command.type) {
    case 'assign': {
      const match = await resolveStaff(command.value, { db });
      if (!match) throw new CommandError('no_staff', `No staff member matches '${command.value}'`);
      if (match.ambiguous) throw new CommandError('ambiguous', `'${command.value}' could be ${match.ambiguous.map((s) => s.name).join(' or ')} — please use a fuller name`);
      const r = await assignTo(ticket, match.staff, opts);
      if (r.event) { events.push(r.event); await notify('assigned', r.ticket, { db, send, immediate, assignee: match.staff, event: r.event }); }
      return { ticket: r.ticket, events, notes };
    }
    case 'take': {
      const me = actor?.id ? await staffById(actor.id, { db }) : await staffByEmail(actor?.email, { db });
      if (!me) throw new CommandError('no_staff', 'Only a listed member of staff can take a ticket');
      const r = await assignTo(ticket, me, opts);
      if (r.event) { events.push(r.event); await notify('assigned', r.ticket, { db, send, immediate, assignee: me, event: r.event }); }
      return { ticket: r.ticket, events, notes };
    }
    case 'status': {
      if (!STATUSES.includes(command.value)) throw new CommandError('bad_value', `Unknown status '${command.value}'`);
      const r = await setField(ticket, 'status', command.value, opts);
      if (r.event) {
        events.push(r.event);
        const assignee = await staffById(r.ticket.assignedTo, { db });
        await notify(command.value === 'closed' ? 'closed' : 'updated', r.ticket, { db, send, immediate, assignee, event: r.event });
      }
      return { ticket: r.ticket, events, notes };
    }
    case 'priority':
    case 'category': {
      const valid = command.type === 'priority' ? isPriority(command.value) : isCategory(command.value);
      if (!valid) throw new CommandError('bad_value', `Unknown ${command.type} '${command.value}'`);
      const r = await setField(ticket, command.type, command.value, opts);
      if (r.event) {
        events.push(r.event);
        await notify('updated', r.ticket, { db, send, immediate, assignee: await staffById(r.ticket.assignedTo, { db }), event: r.event });
      }
      return { ticket: r.ticket, events, notes };
    }
    case 'internal_note':
    case 'note': {
      const isInternal = command.type === 'internal_note';
      const note = await addNote(ticket.id, { body: command.value, authorType: actor?.type || 'staff', authorName: actorLabel, authorEmail: actor?.email, isInternal }, { db });
      if (!note) throw new CommandError('empty_note', 'Note is empty');
      notes.push(note);
      const assignee = await staffById(ticket.assignedTo, { db });
      await notify('updated', ticket, { db, send, immediate, assignee, note });
      return { ticket, events, notes };
    }
    default:
      throw new CommandError('unknown_command', `Unknown command type '${command.type}'`);
  }
}
