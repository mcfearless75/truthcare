/**
 * CareRota integration (spec addendum 2026-09-06). A staff-category ticket's
 * `dropshift` command matches the caller against carerota's own data and, on
 * a clean single match, calls carerota's existing `request_drop` RPC — which
 * marks the shift open and starts carerota's own cover-cascade (offers it to
 * other eligible staff, sends their push notifications). This module never
 * reimplements that logic; it only finds the right staff_id/shift_id and
 * calls the RPC exactly as carerota's own UI would.
 *
 * Deliberately human-gated: nothing here runs from the phone call itself.
 * A member of staff reads the ticket, checks the AI got the name and date
 * right, and only then sends the `dropshift` command — see docs/agent-
 * prompt.md and lib/config.js's carerotaConfig() doc comment for why.
 *
 * `client` is always injectable (tests never talk to a real carerota
 * project); `carerotaClient()` builds the one real client, caching the
 * signed-in session the same way lib/graph.js caches its Graph token.
 */
import { carerotaConfig, requireEnv } from './config.js';

export class CareRotaError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'CareRotaError';
    this.code = code;
    Object.assign(this, extra);
  }
}

let cachedClient = null;

/** Lazy real client: signs in as the configured manager account, once. */
export async function carerotaClient() {
  if (cachedClient) return cachedClient;
  const { url, anonKey, managerEmail, managerPassword } = carerotaConfig();
  if (!url) requireEnv('CAREROTA_URL');
  if (!anonKey) requireEnv('CAREROTA_ANON_KEY');
  if (!managerEmail) requireEnv('CAREROTA_MANAGER_EMAIL');
  if (!managerPassword) requireEnv('CAREROTA_MANAGER_PASSWORD');
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(url, anonKey);
  const { error } = await client.auth.signInWithPassword({ email: managerEmail, password: managerPassword });
  if (error) throw new CareRotaError('auth_failed', `CareRota sign-in failed: ${error.message}`);
  cachedClient = client;
  return client;
}

export function resetCareRotaClientCache() {
  cachedClient = null;
}

const norm = (s) => String(s || '').trim().toLowerCase();

/** Same tolerant name matching lib/staff.js uses: exact wins, else a unique prefix. */
export function matchByName(query, rows, nameField = 'full_name') {
  const q = norm(query);
  if (!q) return null;
  const exact = rows.filter((r) => norm(r[nameField]) === q);
  if (exact.length === 1) return { row: exact[0] };
  if (exact.length > 1) return { ambiguous: exact };
  const first = q.split(' ')[0];
  const prefix = rows.filter((r) => norm(r[nameField]).startsWith(first) || norm(r[nameField]).split(' ')[0] === first);
  if (prefix.length === 1) return { row: prefix[0] };
  if (prefix.length > 1) return { ambiguous: prefix };
  return null;
}

/** `shiftStartsAt` is free text the phone AI captured (lib/phone.js never validates its format) — best-effort date, defaulting to today. */
export function resolveShiftDate(shiftStartsAt, { now = Date.now() } = {}) {
  const parsed = shiftStartsAt ? new Date(shiftStartsAt) : null;
  const d = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date(now);
  return d.toISOString().slice(0, 10);
}

const OPEN_STATUSES = ['published', 'claimed', 'confirmed'];

/**
 * Resolve a ticket's caller to exactly one carerota staff_id + shift_id.
 * Fails closed on anything but a single clean match at every step — an
 * automatic cover-cascade going to the wrong person or the wrong shift is
 * worse than asking a human to check carerota directly.
 * @returns {Promise<{ ok: true, staffId, staffName, shiftId, shiftDate, startTime, orgId } | { ok: false, code, message }>}
 */
export async function findDropCandidate({ callerName, shiftStartsAt }, { client, now = Date.now() } = {}) {
  const { orgName } = carerotaConfig();
  const { data: orgs, error: orgErr } = await client.from('organisations').select('id, name').ilike('name', orgName);
  if (orgErr) return { ok: false, code: 'lookup_failed', message: `Could not read carerota organisations: ${orgErr.message}` };
  if (!orgs?.length) return { ok: false, code: 'no_org', message: `No carerota organisation matches "${orgName}" — check CAREROTA_ORG_NAME.` };
  if (orgs.length > 1) return { ok: false, code: 'ambiguous_org', message: `More than one carerota organisation matches "${orgName}".` };
  const orgId = orgs[0].id;

  const { data: staff, error: staffErr } = await client.from('staff_records').select('id, full_name').eq('org_id', orgId).is('left_at', null);
  if (staffErr) return { ok: false, code: 'lookup_failed', message: `Could not read carerota staff: ${staffErr.message}` };
  const staffMatch = matchByName(callerName, staff || []);
  if (!staffMatch) return { ok: false, code: 'no_staff', message: `No active carerota staff member matches "${callerName}".` };
  if (staffMatch.ambiguous) return { ok: false, code: 'ambiguous_staff', message: `More than one carerota staff member matches "${callerName}": ${staffMatch.ambiguous.map((s) => s.full_name).join(', ')}.` };

  const shiftDate = resolveShiftDate(shiftStartsAt, { now });
  const { data: shifts, error: shiftErr } = await client.from('shifts').select('id, start_time, end_time, status')
    .eq('org_id', orgId).eq('assigned_staff_id', staffMatch.row.id).eq('shift_date', shiftDate).in('status', OPEN_STATUSES);
  if (shiftErr) return { ok: false, code: 'lookup_failed', message: `Could not read carerota shifts: ${shiftErr.message}` };
  if (!shifts?.length) return { ok: false, code: 'no_shift', message: `${staffMatch.row.full_name} has no droppable shift in carerota on ${shiftDate}.` };
  if (shifts.length > 1) return { ok: false, code: 'ambiguous_shift', message: `${staffMatch.row.full_name} has more than one shift in carerota on ${shiftDate} — drop it directly in carerota.` };

  return { ok: true, staffId: staffMatch.row.id, staffName: staffMatch.row.full_name, shiftId: shifts[0].id, shiftDate, startTime: shifts[0].start_time, orgId };
}

/** Calls carerota's own request_drop RPC — same call its own UI makes. */
export async function dropShift({ shiftId, reason }, { client }) {
  const { error } = await client.rpc('request_drop', { p_shift_id: shiftId, p_reason: reason || null });
  if (error) throw new CareRotaError('drop_failed', `carerota request_drop failed: ${error.message}`);
}

/**
 * Current state of a previously-dropped shift, for the callback poller
 * (lib/carerota-watch.js). `status` is one of carerota's own shift statuses
 * ('open' while the cascade is still offering it; 'claimed'/'confirmed' once
 * someone takes it; 'unfilled' once the cascade is exhausted; 'cancelled').
 * Two queries rather than an embedded-relation select, matching every other
 * lookup in this file — keeps the fake client in tests trivial and the real
 * query obvious to read.
 * @returns {Promise<{ status: string, assigneeName: string|null } | null>} null if the shift no longer exists
 */
export async function getShiftStatus(shiftId, { client }) {
  const { data: shifts, error } = await client.from('shifts').select('id, status, assigned_staff_id').eq('id', shiftId);
  if (error) throw new CareRotaError('lookup_failed', `Could not read carerota shift status: ${error.message}`);
  const shift = shifts?.[0];
  if (!shift) return null;
  let assigneeName = null;
  if (shift.assigned_staff_id) {
    const { data: staff, error: staffErr } = await client.from('staff_records').select('full_name').eq('id', shift.assigned_staff_id);
    if (staffErr) throw new CareRotaError('lookup_failed', `Could not read carerota staff: ${staffErr.message}`);
    assigneeName = staff?.[0]?.full_name || null;
  }
  return { status: shift.status, assigneeName };
}

/**
 * Full flow for the `dropshift` command: find the candidate, drop the shift,
 * return a short human-readable outcome for the ticket note. Never throws
 * for an ordinary "couldn't match" case — those come back as `{ ok: false }`
 * so the caller can write a clear internal note rather than bouncing the
 * whole command reply.
 */
export async function dropShiftForTicket({ callerName, shiftStartsAt, reason }, { client, now = Date.now() } = {}) {
  const candidate = await findDropCandidate({ callerName, shiftStartsAt }, { client, now });
  if (!candidate.ok) return candidate;
  await dropShift({ shiftId: candidate.shiftId, reason }, { client });
  return { ok: true, ...candidate, message: `Dropped ${candidate.staffName}'s shift on ${candidate.shiftDate} (${candidate.startTime}) in carerota — cover cascade started.` };
}
