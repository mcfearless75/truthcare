import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeShiftOutcome, checkDroppedShifts } from '../lib/carerota-watch.js';
import { createTicket } from '../lib/tickets.js';
import { fakeDb, fakeSend, fakeCareRota } from './helpers/fake-db.js';

const CAREROTA_ENV = ['CAREROTA_URL', 'CAREROTA_ANON_KEY', 'CAREROTA_MANAGER_EMAIL', 'CAREROTA_MANAGER_PASSWORD'];
function withCareRotaConfigured(fn) {
  return async () => {
    for (const k of CAREROTA_ENV) process.env[k] = 'set';
    try { await fn(); } finally { for (const k of CAREROTA_ENV) delete process.env[k]; }
  };
}

test('describeShiftOutcome: a friendly line for every carerota terminal status, and a fallback for anything unexpected', () => {
  assert.equal(describeShiftOutcome({ status: 'claimed', assigneeName: 'Sam Quiet' }), "Sam Quiet has claimed this shift in CareRota — awaiting the usual approval.");
  assert.equal(describeShiftOutcome({ status: 'confirmed', assigneeName: 'Sam Quiet' }), 'Sam Quiet is confirmed covering this shift in CareRota.');
  assert.equal(describeShiftOutcome({ status: 'confirmed', assigneeName: null }), 'A member of staff is confirmed covering this shift in CareRota.');
  assert.equal(describeShiftOutcome({ status: 'unfilled', assigneeName: null }), 'No one picked up this shift in CareRota — it still needs cover arranged manually.');
  assert.equal(describeShiftOutcome({ status: 'cancelled', assigneeName: null }), 'This shift was cancelled in CareRota.');
  assert.equal(describeShiftOutcome({ status: 'draft', assigneeName: null }), 'This shift\'s CareRota status is now "draft".');
});

test('checkDroppedShifts: does nothing until CareRota is configured', async () => {
  for (const k of CAREROTA_ENV) delete process.env[k];
  const db = fakeDb();
  const result = await checkDroppedShifts({ db });
  assert.deepEqual(result, { checked: 0, resolved: 0 });
});

test('checkDroppedShifts: still-open shifts are left for the next run; resolved shifts get a note and an assignee email, and are never checked again', withCareRotaConfigured(async () => {
  const db = fakeDb();
  db.seedStaff([{ name: 'Kumi Pillay', email: 'kumi@truthcaregroup.co.uk', role: 'admin' }]);
  const send = fakeSend();

  const openTicket = await createTicket({ category: 'staff', source: 'phone', summary: 'Feeling unwell', callerName: 'Joanne Bray' }, { via: 'phone', db, send });
  db.tables.tickets.find((t) => t.id === openTicket.id).carerota_shift_id = 'shift-open';

  const resolvedTicket = await createTicket({ category: 'staff', source: 'phone', summary: 'Feeling unwell', callerName: 'Sam Quiet' }, { via: 'phone', db, send });
  db.tables.tickets.find((t) => t.id === resolvedTicket.id).carerota_shift_id = 'shift-claimed';

  const client = fakeCareRota({
    organisations: [],
    staff_records: [{ id: 'cr-staff-2', full_name: 'Sam Loud' }],
    shifts: [
      { id: 'shift-open', status: 'open', assigned_staff_id: null },
      { id: 'shift-claimed', status: 'claimed', assigned_staff_id: 'cr-staff-2' },
    ],
  });

  send.sent.length = 0; // clear the "created" emails from setup, isolate what this poll itself sends
  const result = await checkDroppedShifts({ db, send, getCareRotaClient: async () => client });
  assert.deepEqual(result, { checked: 2, resolved: 1 });

  const openRow = db.tables.tickets.find((t) => t.id === openTicket.id);
  assert.equal(openRow.carerota_shift_notified_at, undefined, 'still-open shift is not marked notified');
  assert.equal(db.tables.ticket_notes.filter((n) => n.ticket_id === openTicket.id).length, 0);

  const resolvedRow = db.tables.tickets.find((t) => t.id === resolvedTicket.id);
  assert.ok(resolvedRow.carerota_shift_notified_at, 'resolved shift is marked notified so it is never re-checked');
  const notes = db.tables.ticket_notes.filter((n) => n.ticket_id === resolvedTicket.id);
  assert.equal(notes.length, 1);
  assert.match(notes[0].body, /Sam Loud has claimed this shift in CareRota/);
  assert.equal(notes[0].is_internal, true);
  assert.equal(send.sent.length, 1, 'the "updated" notification went out for the resolved ticket only');

  // A second pass must not re-notify the already-resolved ticket, and the
  // still-open one is picked up again (still not covered).
  send.sent.length = 0;
  const second = await checkDroppedShifts({ db, send, getCareRotaClient: async () => client });
  assert.deepEqual(second, { checked: 1, resolved: 0 });
  assert.equal(send.sent.length, 0);
}));
