import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchByName, resolveShiftDate, findDropCandidate, dropShift, dropShiftForTicket, getShiftStatus, CareRotaError } from '../lib/carerota.js';
import { fakeCareRota as fakeSupabase } from './helpers/fake-db.js';

const ORG = { id: 'org-1', name: 'Truth Care Group' };
const STAFF = [
  { id: 'staff-1', org_id: 'org-1', full_name: 'Joanne Bray' },
  { id: 'staff-2', org_id: 'org-1', full_name: 'Sam Quiet' },
  { id: 'staff-3', org_id: 'org-1', full_name: 'Sam Loud' },
];
const shift = (over = {}) => ({ id: 'shift-1', org_id: 'org-1', assigned_staff_id: 'staff-1', shift_date: '2026-09-06', start_time: '20:00:00', status: 'confirmed', ...over });

function tablesWith(shifts) {
  return { organisations: [ORG], staff_records: STAFF, shifts };
}

test('matchByName: exact wins over prefix; ambiguous prefix reported; no match is null', () => {
  assert.equal(matchByName('Joanne Bray', STAFF).row.id, 'staff-1');
  assert.equal(matchByName('joanne', STAFF).row.id, 'staff-1', 'case-insensitive first-name prefix');
  assert.deepEqual(matchByName('sam', STAFF).ambiguous.map((s) => s.id).sort(), ['staff-2', 'staff-3']);
  assert.equal(matchByName('Nobody Here', STAFF), null);
  assert.equal(matchByName('', STAFF), null);
});

test('resolveShiftDate: uses a parseable date, otherwise defaults to today', () => {
  assert.equal(resolveShiftDate('2026-09-07T20:00:00Z'), '2026-09-07');
  const now = Date.parse('2026-09-06T12:00:00Z');
  assert.equal(resolveShiftDate(null, { now }), '2026-09-06');
  assert.equal(resolveShiftDate('not a date at all', { now }), '2026-09-06', 'garbage input falls back to today rather than throwing');
});

test('findDropCandidate: clean single match resolves staff + shift', async () => {
  const client = fakeSupabase(tablesWith([shift()]));
  const r = await findDropCandidate({ callerName: 'Joanne Bray', shiftStartsAt: '2026-09-06T20:00:00Z' }, { client });
  assert.deepEqual(r, { ok: true, staffId: 'staff-1', staffName: 'Joanne Bray', shiftId: 'shift-1', shiftDate: '2026-09-06', startTime: '20:00:00', orgId: 'org-1' });
});

test('findDropCandidate fails closed: no org, no staff, ambiguous staff, no shift, ambiguous shift', async () => {
  const noOrg = await findDropCandidate({ callerName: 'Joanne Bray' }, { client: fakeSupabase({ organisations: [], staff_records: STAFF, shifts: [] }) });
  assert.deepEqual(noOrg, { ok: false, code: 'no_org', message: 'No carerota organisation matches "Truth Care Group" — check CAREROTA_ORG_NAME.' });

  const noStaff = await findDropCandidate({ callerName: 'Nobody Here' }, { client: fakeSupabase(tablesWith([])) });
  assert.equal(noStaff.ok, false);
  assert.equal(noStaff.code, 'no_staff');

  const ambiguousStaff = await findDropCandidate({ callerName: 'Sam' }, { client: fakeSupabase(tablesWith([])) });
  assert.equal(ambiguousStaff.code, 'ambiguous_staff');
  assert.match(ambiguousStaff.message, /Sam Quiet.*Sam Loud|Sam Loud.*Sam Quiet/);

  const noShift = await findDropCandidate({ callerName: 'Joanne Bray', shiftStartsAt: '2026-09-06T20:00:00Z' }, { client: fakeSupabase(tablesWith([])) });
  assert.equal(noShift.code, 'no_shift');

  const ambiguousShift = await findDropCandidate({ callerName: 'Joanne Bray', shiftStartsAt: '2026-09-06T20:00:00Z' }, { client: fakeSupabase(tablesWith([shift(), shift({ id: 'shift-2', start_time: '08:00:00' })])) });
  assert.equal(ambiguousShift.code, 'ambiguous_shift');

  const leftStaff = await findDropCandidate({ callerName: 'Joanne Bray' }, { client: fakeSupabase({ organisations: [ORG], staff_records: [{ ...STAFF[0], left_at: '2026-01-01' }], shifts: [] }) });
  assert.equal(leftStaff.code, 'no_staff', 'a left_at row is excluded by the query filter, not matched');
});

test('a shift not in an open status (draft/cancelled/unfilled/open/drop_requested) is not offered as droppable', async () => {
  const r = await findDropCandidate({ callerName: 'Joanne Bray', shiftStartsAt: '2026-09-06T20:00:00Z' }, { client: fakeSupabase(tablesWith([shift({ status: 'cancelled' })])) });
  assert.equal(r.code, 'no_shift');
});

test('dropShift calls the real carerota request_drop RPC with the shift id and reason', async () => {
  const client = fakeSupabase(tablesWith([shift()]));
  await dropShift({ shiftId: 'shift-1', reason: 'Feeling unwell' }, { client });
  assert.deepEqual(client.rpcCalls, [{ name: 'request_drop', params: { p_shift_id: 'shift-1', p_reason: 'Feeling unwell' } }]);
});

test('dropShift surfaces an RPC error as CareRotaError rather than swallowing it', async () => {
  const client = fakeSupabase(tablesWith([shift()]), { rpcError: { message: 'Shift cannot be dropped in its current state (open)' } });
  await assert.rejects(dropShift({ shiftId: 'shift-1' }, { client }), (e) => e instanceof CareRotaError && e.code === 'drop_failed' && /current state/.test(e.message));
});

test('dropShiftForTicket: finds and drops on a clean match; returns the outcome without dropping on any ambiguity', async () => {
  const okClient = fakeSupabase(tablesWith([shift()]));
  const ok = await dropShiftForTicket({ callerName: 'Joanne Bray', shiftStartsAt: '2026-09-06T20:00:00Z', reason: 'Sick' }, { client: okClient });
  assert.equal(ok.ok, true);
  assert.match(ok.message, /Dropped Joanne Bray's shift on 2026-09-06 \(20:00:00\) in carerota/);
  assert.equal(okClient.rpcCalls.length, 1);

  const ambiguousClient = fakeSupabase(tablesWith([]));
  const ambiguous = await dropShiftForTicket({ callerName: 'Sam', shiftStartsAt: null }, { client: ambiguousClient });
  assert.equal(ambiguous.ok, false);
  assert.equal(ambiguous.code, 'ambiguous_staff');
  assert.equal(ambiguousClient.rpcCalls.length, 0, 'never calls request_drop when the match is not clean');
});

test("getShiftStatus: reports status and, once assigned, the covering staff member's name", async () => {
  const openClient = fakeSupabase(tablesWith([shift({ status: 'open', assigned_staff_id: null })]));
  assert.deepEqual(await getShiftStatus('shift-1', { client: openClient }), { status: 'open', assigneeName: null });

  const claimedClient = fakeSupabase(tablesWith([shift({ status: 'claimed', assigned_staff_id: 'staff-2' })]));
  assert.deepEqual(await getShiftStatus('shift-1', { client: claimedClient }), { status: 'claimed', assigneeName: 'Sam Quiet' });

  const missingClient = fakeSupabase(tablesWith([]));
  assert.equal(await getShiftStatus('shift-1', { client: missingClient }), null, 'a shift that no longer exists is null, not a thrown error');
});

test('getShiftStatus surfaces a lookup error as CareRotaError', async () => {
  const client = { from: () => ({ select: function () { return this; }, eq: function () { return this; }, then: (resolve) => resolve({ data: null, error: { message: 'network down' } }) }) };
  await assert.rejects(getShiftStatus('shift-1', { client }), (e) => e instanceof CareRotaError && e.code === 'lookup_failed' && /network down/.test(e.message));
});
