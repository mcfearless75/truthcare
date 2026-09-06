/**
 * Retell door (spec §4.3, §4.4, §8).
 *
 *   POST /api/phone?action=create_ticket   mid-call custom function
 *   POST /api/phone?action=lookup_ticket   mid-call custom function
 *   POST /api/phone?action=webhook         post-call events (call_analyzed)
 *
 * Every request must carry a valid X-Retell-Signature over the exact raw
 * body. Invalid → 401 and nothing is processed. After that we NEVER 500:
 * caller-fixable problems answer 200 + a speakable prompt, and any thrown
 * error answers 200 + FALLBACK_RESULT with the raw args saved to
 * failed_calls so the next cron alerts an admin.
 */
import sql from '../../lib/db.js';
import { env } from '../../lib/config.js';
import { readRawBody, getAction, sendJson } from '../../lib/http.js';
import { verifyRetellSignature } from '../../lib/retell.js';
import { sendMail } from '../../lib/graph.js';
import { createTicket, addNote, applyCommand, getTicketByNumber, getTicketByRetellCallId } from '../../lib/tickets.js';
import {
  FALLBACK_RESULT, NOT_FOUND_RESULT, UNREADABLE_RESULT, unwrapRetellBody, validateCreateArgs, createdResult,
  lookupResult, phoneMatchesTicket, speak, summariseCallAnalysis, normalizePhone,
} from '../../lib/phone.js';

export const MAX_BODY_BYTES = 256 * 1024;
export const ACTIONS = ['create_ticket', 'lookup_ticket', 'webhook'];

function signingKeys() {
  return [env('RETELL_API_KEY'), env('RETELL_WEBHOOK_SECRET')].filter(Boolean);
}

async function recordFailure(db, { callId, action, args, error }) {
  try {
    await db`INSERT INTO failed_calls (retell_call_id, action, args, error) VALUES (${callId || null}, ${action}, ${JSON.stringify(args || {})}, ${String(error?.stack || error?.message || error).slice(0, 2000)})`;
  } catch (e) {
    console.error('[phone] could not record failed call:', e.message);
  }
}

async function createTicketAction({ args, call }, { db, send }) {
  const v = validateCreateArgs(args, call);
  if (!v.ok) return speak(v.prompt);
  const ticket = await createTicket(v.input, { via: 'phone', actor: { name: 'Phone agent' }, db, send });
  return createdResult(ticket);
}

async function lookupTicketAction({ args, call }, { db }) {
  const number = Number.parseInt(String(args.ticket_number ?? '').replace(/\D/g, ''), 10);
  if (!Number.isFinite(number) || number <= 0) return speak('What is the ticket number?');
  const ticket = await getTicketByNumber(number, { db });
  if (!ticket || !phoneMatchesTicket(ticket, args, call)) return speak(NOT_FOUND_RESULT);
  const [note] = await db`SELECT body FROM ticket_notes WHERE ticket_id = ${ticket.id} AND is_internal = false ORDER BY created_at DESC LIMIT 1`;
  return lookupResult(ticket, note || null);
}

async function webhookAction(body, { db, send }) {
  const event = String(body?.event || '');
  const call = body?.call || {};
  if (event !== 'call_analyzed') return { ok: true, ignored: event || 'unknown' };
  const callId = String(call.call_id || '');
  const { summary, note, emergency } = summariseCallAnalysis(call);
  const existing = callId ? await getTicketByRetellCallId(callId, { db }) : null;
  if (existing) {
    await addNote(existing.id, { body: note, authorType: 'ai', authorName: 'Retell', isInternal: true }, { db });
    // I2: webhook-level defense-in-depth (spec §4.1) must hold even when the
    // call already produced a ticket — an emergency-matching transcript
    // raises priority (and fires the 'updated' notification) rather than
    // sitting silently in an internal note nobody is told about.
    let ticket = existing;
    let raisedToUrgent = false;
    if (emergency && existing.priority !== 'urgent') {
      const r = await applyCommand(existing, { type: 'priority', value: 'urgent' }, { name: 'Retell webhook' }, { via: 'phone', db, send });
      ticket = r.ticket;
      raisedToUrgent = true;
    }
    return { ok: true, ticket_number: ticket.number, attached: true, ...(raisedToUrgent ? { raised_to_urgent: true } : {}) };
  }
  // Spec §4.1: the scripted 999 guard ends the call without create_ticket, so the
  // emergency is logged here as an urgent resident_concern; any other no-ticket call
  // becomes a general ticket so the missed call is still visible.
  const ticket = await createTicket({
    category: emergency ? 'resident_concern' : 'general',
    priority: emergency ? 'urgent' : undefined,
    source: 'phone',
    subject: emergency ? 'Emergency call — caller told to dial 999' : 'Missed call — no ticket taken during the call',
    summary: summary || (emergency ? 'Caller described a medical emergency and was told to dial 999.' : 'Caller hung up before any details were taken.'),
    callerName: 'Unknown caller',
    callerPhone: normalizePhone(call.from_number),
    retellCallId: callId || null,
    initialNote: { body: note, authorType: 'ai', authorName: 'Retell', isInternal: true },
  }, { via: 'phone', actor: { name: 'Phone agent' }, db, send });
  return { ok: true, ticket_number: ticket.number, created: true, emergency };
}

/** Testable core: deps default to the real db and Graph. */
export async function handlePhone(req, res, { db = sql, send = sendMail, now = Date.now() } = {}) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  const action = getAction(req);
  if (!ACTIONS.includes(action)) return sendJson(res, 404, { error: 'Unknown action' });

  let raw;
  try {
    raw = await readRawBody(req, MAX_BODY_BYTES);
  } catch (e) {
    // A request-stream error (client aborted, malformed transfer-encoding,
    // body over MAX_BODY_BYTES) must never escape as an unhandled rejection —
    // same never-500 guarantee as every other failure path below, and still
    // recorded so a dropped call isn't invisible to the failed_calls alert.
    console.error(`[phone] ${action} raw body read failed:`, e);
    await recordFailure(db, { callId: null, action, args: { note: 'raw body read failed' }, error: e });
    return sendJson(res, 200, action === 'webhook' ? { ok: false, error: 'recorded' } : speak(FALLBACK_RESULT));
  }
  const keys = signingKeys();
  const signature = req.headers?.['x-retell-signature'];
  if (!keys.length || !keys.some((k) => verifyRetellSignature(raw, signature, k, now))) {
    console.warn(`[phone] rejected ${action}: ${keys.length ? 'bad signature' : 'RETELL_API_KEY not set'}`);
    return sendJson(res, 401, { error: 'Unauthorised' });
  }

  let body;
  try { body = JSON.parse(raw); } catch { return sendJson(res, 200, speak(UNREADABLE_RESULT)); }
  const unwrapped = unwrapRetellBody(body);
  const callId = unwrapped.call?.call_id || body?.call?.call_id || null;

  try {
    if (action === 'create_ticket') return sendJson(res, 200, await createTicketAction(unwrapped, { db, send }));
    if (action === 'lookup_ticket') return sendJson(res, 200, await lookupTicketAction(unwrapped, { db }));
    return sendJson(res, 200, await webhookAction(body, { db, send }));
  } catch (e) {
    console.error(`[phone] ${action} failed:`, e);
    await recordFailure(db, { callId, action, args: action === 'webhook' ? { event: body?.event, call_id: callId } : unwrapped.args, error: e });
    return sendJson(res, 200, action === 'webhook' ? { ok: false, error: 'recorded' } : speak(FALLBACK_RESULT));
  }
}

export default function handler(req, res) {
  return handlePhone(req, res);
}
