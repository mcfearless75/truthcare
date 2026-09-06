/**
 * Board JSON API (spec §7). Cookie-authenticated; every mutation goes through
 * the same createTicket/applyCommand as phone and email, so notifications
 * are identical whichever door was used.
 *
 *   GET  /api/tickets?action=list&status=&priority=&category=&assignedTo=&q=
 *   GET  /api/tickets?action=get&number=42
 *   POST /api/tickets?action=command&number=42   { type, value }
 *   POST /api/tickets?action=create              { category, priority?, subject?, summary, callerName?, callerPhone?, callerEmail?, callerOrg?, subjectPerson? }
 */
import sql from '../../lib/db.js';
import { getAction, getQuery, readJsonBody, sendJson } from '../../lib/http.js';
import { requireStaff } from '../../lib/auth.js';
import { activeStaff } from '../../lib/staff.js';
import { listTickets, getTicketDetail, getTicketByNumber, applyCommand, createTicket, CommandError } from '../../lib/tickets.js';
import { sendMail } from '../../lib/graph.js';

const COMMAND_TYPES = ['assign', 'take', 'status', 'priority', 'category', 'note', 'internal_note'];

export async function handleTickets(req, res, { db = sql, send = sendMail, now = Date.now() } = {}) {
  const user = await requireStaff(req, res, { db, now });
  if (!user) return;
  const action = getAction(req);
  const q = getQuery(req);
  const actor = { id: user.id, name: user.name, email: user.email, type: 'staff' };

  try {
    if (action === 'list' && req.method === 'GET') {
      const [tickets, staff] = await Promise.all([
        listTickets({ status: q.get('status') || undefined, priority: q.get('priority') || undefined, category: q.get('category') || undefined, assignedTo: q.get('assignedTo') || undefined, q: q.get('q') || undefined, limit: q.get('limit') || undefined }, { db }),
        activeStaff({ db }),
      ]);
      return sendJson(res, 200, { tickets, staff: staff.map((s) => ({ id: s.id, name: s.name })), user });
    }

    if (action === 'get' && req.method === 'GET') {
      const detail = await getTicketDetail(Number(q.get('number')), { db });
      if (!detail) return sendJson(res, 404, { error: 'Ticket not found' });
      return sendJson(res, 200, { ...detail, staff: (await activeStaff({ db })).map((s) => ({ id: s.id, name: s.name })), user });
    }

    if (action === 'command' && req.method === 'POST') {
      const body = await readJsonBody(req);
      if (!body || !COMMAND_TYPES.includes(body.type)) return sendJson(res, 400, { error: `type must be one of ${COMMAND_TYPES.join(', ')}` });
      const ticket = await getTicketByNumber(Number(q.get('number')), { db });
      if (!ticket) return sendJson(res, 404, { error: 'Ticket not found' });
      const value = typeof body.value === 'string' ? body.value.trim() : body.value;
      const r = await applyCommand(ticket, { type: body.type, value, raw: `${body.type} ${value ?? ''}`.trim() }, actor, { via: 'board', db, send });
      return sendJson(res, 200, { ticket: r.ticket, events: r.events, notes: r.notes });
    }

    if (action === 'create' && req.method === 'POST') {
      const body = await readJsonBody(req);
      if (!body || !String(body.summary || '').trim()) return sendJson(res, 400, { error: 'summary is required' });
      const ticket = await createTicket({
        category: body.category, priority: body.priority, subject: body.subject, summary: body.summary, callerName: body.callerName,
        callerPhone: body.callerPhone, callerEmail: body.callerEmail, callerOrg: body.callerOrg, subjectPerson: body.subjectPerson, source: 'board',
      }, { via: 'board', actor, db, send });
      return sendJson(res, 201, { ticket });
    }

    return sendJson(res, 404, { error: 'Unknown action' });
  } catch (e) {
    if (e instanceof CommandError) return sendJson(res, 400, { error: e.message, code: e.code });
    console.error(`[tickets] ${action} failed:`, e);
    return sendJson(res, 500, { error: 'Something went wrong' });
  }
}

export default function handler(req, res) {
  return handleTickets(req, res);
}
