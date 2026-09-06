/**
 * Pure helpers for the Retell door (spec §4.3, §8). No I/O.
 *
 * Retell reads our JSON response to the caller, so every caller-fixable
 * problem is a 200 with a speakable `result`; only auth/method faults use
 * error statuses (see api/phone/index.js).
 */
import { isCategory, isPriority } from './priority.js';

export const FALLBACK_RESULT = "I've got your details — the team will pick this up.";
export const NOT_FOUND_RESULT = "I can't find a ticket with those details.";
export const UNREADABLE_RESULT = "Sorry, I didn't catch that — could you say it again?";
export const SUBJECT_MAX = 80;
export const SUMMARY_MAX = 4000;

/**
 * E.164 normalisation with UK defaults:
 *   "07700 900123" → +447700900123, "+44 7700 900123" → +447700900123,
 *   "0044 7700 900123" → +447700900123, "(01934) 123456" → +441934123456,
 *   "+1 415 555 2671" → +14155552671. Anything unparseable → null.
 */
export function normalizePhone(raw) {
  let s = String(raw || '').replace(/[^\d+]/g, '');
  if (!s) return null;
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (s.startsWith('+')) {
    const digits = s.slice(1).replace(/\+/g, '');
    return /^[1-9]\d{6,14}$/.test(digits) ? `+${digits}` : null;
  }
  if (s.startsWith('0')) {
    const digits = s.slice(1);
    return /^[1-9]\d{8,9}$/.test(digits) ? `+44${digits}` : null;
  }
  if (/^44[1-9]\d{8,9}$/.test(s)) return `+${s}`;
  if (/^[1-9]\d{9}$/.test(s)) return `+44${s}`;
  return null;
}

/** Retell accepts both { name, args, call } and (with "Payload: args only") a bare args object. */
export function unwrapRetellBody(body) {
  if (body && typeof body === 'object' && body.args && typeof body.args === 'object') {
    return { args: body.args, call: body.call && typeof body.call === 'object' ? body.call : {} };
  }
  return { args: body && typeof body === 'object' ? body : {}, call: {} };
}

/** A number the caller spoke wins over caller-ID (spec §4.3). */
export function callerPhoneFrom(args, call) {
  return normalizePhone(args?.caller_phone) || normalizePhone(call?.from_number) || null;
}

/** Tolerant category mapping for whatever the model sends: "Resident concern", "referral or enquiry", … */
export function normaliseCategory(value) {
  const v = String(value || '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
  if (!v) return null;
  if (isCategory(v.replace(/ /g, '_'))) return v.replace(/ /g, '_');
  if (/resident|concern|complaint/.test(v)) return 'resident_concern';
  if (/referral|enquiry|inquiry|placement/.test(v)) return 'referral';
  if (/staff|sick|shift|cover|late/.test(v)) return 'staff';
  if (/general|message|other|supplier|maintenance/.test(v)) return 'general';
  return null;
}

const str = (v, max) => String(v ?? '').trim().slice(0, max);

/**
 * @returns {{ ok: true, input: object } | { ok: false, prompt: string }}
 */
export function validateCreateArgs(args = {}, call = {}) {
  const category = normaliseCategory(args.category);
  if (!category) return { ok: false, prompt: 'Which type of call is this — a referral or enquiry, a member of staff calling in, a concern about a resident, or a general message?' };
  const callerName = str(args.caller_name, 200);
  if (!callerName) return { ok: false, prompt: 'Could you ask the caller for their name?' };
  const summary = str(args.summary, SUMMARY_MAX);
  if (!summary) return { ok: false, prompt: 'Could you ask the caller to briefly describe what the call is about?' };
  const firstLine = summary.split('\n')[0].trim();
  const subject = firstLine.length > SUBJECT_MAX ? `${firstLine.slice(0, SUBJECT_MAX - 1)}…` : firstLine;
  return {
    ok: true,
    input: {
      category,
      priority: isPriority(args.priority) ? args.priority : undefined,
      subject,
      summary,
      callerName,
      callerPhone: callerPhoneFrom(args, call),
      callerEmail: /^[^@\s]+@[^@\s]+$/.test(str(args.caller_email, 200)) ? str(args.caller_email, 200).toLowerCase() : null,
      callerOrg: str(args.caller_org, 200) || null,
      subjectPerson: str(args.subject_person, 200) || null,
      shiftStartsAt: str(args.shift_starts_at, 40) || null,
      source: 'phone',
      retellCallId: str(call.call_id, 200) || null,
    },
  };
}

export function speak(result, extra = {}) {
  return { result, ...extra };
}

export function createdResult(ticket) {
  return speak(`I've logged that as ticket ${ticket.number} and the team will be in touch.`, { ticket_number: ticket.number });
}

const STATUS_SPOKEN = { open: 'open and waiting for the team', in_progress: 'being worked on by the team', closed: 'closed' };

/** Status plus the latest public note — nothing else is ever disclosed (spec §4.3). */
export function lookupResult(ticket, note) {
  const status = STATUS_SPOKEN[ticket.status] || ticket.status;
  const update = note?.body ? ` The latest update from the team is: ${String(note.body).trim().slice(0, 400)}` : ' There are no updates from the team yet.';
  return speak(`Ticket ${ticket.number} is ${status}.${update}`, { ticket_number: ticket.number, status: ticket.status });
}

/** Both the caller-ID and a spoken number are acceptable proofs (spec §4.3). */
export function phoneMatchesTicket(ticket, args, call) {
  const stored = normalizePhone(ticket?.callerPhone);
  if (!stored) return false;
  const candidates = [normalizePhone(args?.caller_phone), normalizePhone(call?.from_number)].filter(Boolean);
  return candidates.includes(stored);
}

const EMERGENCY_RE = /\b999\b|medical emergency|not breathing|unresponsive|ambulance/i;

/**
 * Retell post-call payload → the fields we keep (transcript + summary only).
 * `emergency` is true when the scripted 999 guard fired (spec §4.1): the agent
 * ends those calls without create_ticket, so the webhook logs them as an
 * urgent resident_concern instead.
 */
export function summariseCallAnalysis(call = {}) {
  const analysis = call.call_analysis || {};
  const summary = str(analysis.call_summary, 2000);
  const transcript = str(call.transcript, 20000);
  const bits = [];
  if (summary) bits.push(`Summary: ${summary}`);
  if (transcript) bits.push(`Transcript:\n${transcript}`);
  return { summary, transcript, emergency: EMERGENCY_RE.test(`${summary}\n${transcript}`), note: bits.join('\n\n') || 'Call analysed — no transcript or summary returned.' };
}
