import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backoffMs, BACKOFF_BASE_MS, MAX_ATTEMPTS, recipientsFor, deliverPending, queueBounce, alertFailedCalls, notify } from '../lib/notify.js';
import { fakeDb, fakeSend } from './helpers/fake-db.js';

const ticketRow = (db, over = {}) => {
  const row = { id: `t-${db.tables.tickets.length + 1}`, number: db.tables.tickets.length + 1, status: 'open', priority: 'normal', category: 'general', source: 'email', subject: 'Hi', summary: 'x', caller_name: 'Cal', caller_email: 'cal@example.com', email_token: 'abcd2345', assigned_to: null, created_at: new Date().toISOString(), ...over };
  db.tables.tickets.push(row);
  return { id: row.id, number: row.number, status: row.status, priority: row.priority, category: row.category, source: row.source, subject: row.subject, summary: row.summary, callerName: row.caller_name, callerEmail: row.caller_email, emailToken: row.email_token, assignedTo: row.assigned_to, createdAt: row.created_at };
};

test('backoff schedule is attempts² × 5 min: 5, 20, 45, 80 minutes', () => {
  assert.equal(BACKOFF_BASE_MS, 5 * 60 * 1000);
  assert.deepEqual([1, 2, 3, 4].map((n) => backoffMs(n) / 60000), [5, 20, 45, 80]);
  assert.equal(backoffMs(0), 5 * 60 * 1000);
  assert.equal(backoffMs('junk'), 5 * 60 * 1000);
  assert.equal(MAX_ATTEMPTS, 5);
});

test('recipientsFor implements the spec §6.2 table', async () => {
  const db = fakeDb();
  const [jo, paul] = db.seedStaff([
    { name: 'Jo', email: 'jo@truthcaregroup.co.uk' },
    { name: 'Paul', email: 'paul@truthcaregroup.co.uk' },
    { name: 'Sam', email: 'sam@truthcaregroup.co.uk', receives_new_tickets: false },
  ]);
  const t = ticketRow(db);
  assert.deepEqual(await recipientsFor('created', t, { db }), { staff: ['jo@truthcaregroup.co.uk', 'paul@truthcaregroup.co.uk'], caller: null });
  assert.deepEqual(await recipientsFor('assigned', t, { db, assignee: { email: 'Sam@truthcaregroup.co.uk' } }), { staff: ['sam@truthcaregroup.co.uk'], caller: null });
  assert.deepEqual(await recipientsFor('updated', t, { db }), { staff: ['jo@truthcaregroup.co.uk', 'paul@truthcaregroup.co.uk'], caller: null }, 'unassigned + nobody replied → new-ticket recipients');
  db.tables.ticket_notes.push({ ticket_id: t.id, author_type: 'staff', author_email: 'Sam@truthcaregroup.co.uk', is_internal: false });
  db.tables.ticket_notes.push({ ticket_id: t.id, author_type: 'caller', author_email: 'cal@example.com', is_internal: false });
  assert.deepEqual(await recipientsFor('updated', t, { db, assignee: { email: paul.email } }), { staff: ['paul@truthcaregroup.co.uk', 'sam@truthcaregroup.co.uk'], caller: null }, 'assignee + staff who replied; caller notes do not count');
  assert.deepEqual(await recipientsFor('updated', t, { db, assignee: { email: paul.email }, note: { isInternal: false } }), { staff: ['paul@truthcaregroup.co.uk', 'sam@truthcaregroup.co.uk'], caller: 'cal@example.com' }, 'public note adds the caller');
  assert.deepEqual((await recipientsFor('updated', t, { db, assignee: { email: paul.email }, note: { isInternal: true } })).caller, null);
  assert.deepEqual((await recipientsFor('closed', t, { db, assignee: { email: jo.email } })).caller, 'cal@example.com');
  assert.equal((await recipientsFor('closed', { ...t, callerEmail: null }, { db, assignee: { email: jo.email } })).caller, null);
});

test('recipientsFor fails closed when a note omits is_internal — never treated as public (Task 7 carry-forward)', async () => {
  const db = fakeDb();
  db.seedStaff([{ name: 'Jo', email: 'jo@truthcaregroup.co.uk' }]);
  const t = ticketRow(db);
  // A note object built in memory (not round-tripped through the DB column,
  // which is NOT NULL boolean) must never be treated as public just because
  // isInternal was left off — that is exactly the templates.js bug from
  // Task 7's review (an omitted note.isInternal renders as public).
  const omitted = await recipientsFor('updated', t, { db, note: { body: 'leaky?' } });
  assert.equal(omitted.caller, null, 'omitted is_internal must never leak the note to the caller');
  const nullish = await recipientsFor('updated', t, { db, note: { body: 'leaky?', isInternal: null } });
  assert.equal(nullish.caller, null, 'null is_internal must never leak the note to the caller');
  const explicitPublic = await recipientsFor('updated', t, { db, note: { body: 'fine', isInternal: false } });
  assert.equal(explicitPublic.caller, 'cal@example.com', 'only an explicit false is treated as public');
});

test('notify queues staff and caller rows with the right kinds/audiences and sends immediately', async () => {
  const db = fakeDb();
  db.seedStaff([{ name: 'Jo', email: 'jo@truthcaregroup.co.uk' }]);
  const send = fakeSend();
  const t = ticketRow(db);
  const rows = await notify('closed', t, { db, send, assignee: { email: 'jo@truthcaregroup.co.uk', name: 'Jo' }, event: { event: 'status', fromValue: 'open', toValue: 'closed', actor: 'Jo' } });
  assert.deepEqual(rows.map((r) => [r.kind, r.recipient, r.payload.audience]), [['closed', 'jo@truthcaregroup.co.uk', 'staff'], ['closed', 'cal@example.com', 'caller']]);
  assert.equal(send.sent.length, 2);
  assert.ok(send.to('cal@example.com')[0].subject.includes('has been closed'));
  assert.equal(send.to('cal@example.com')[0].replyTo, 'tickets+tc1-abcd2345@truthcaregroup.co.uk');
  const deferred = await notify('updated', t, { db, send, immediate: false, note: { body: 'hi', isInternal: false } });
  assert.equal(deferred.length, 2);
  assert.equal(send.sent.length, 2, 'immediate:false leaves rows for the cron');
});

test('deliverPending: retries due rows, gives up after MAX_ATTEMPTS, keeps last_error for the board', async () => {
  const db = fakeDb();
  const send = fakeSend();
  const t = ticketRow(db);
  send.failFor.add('cal@example.com');
  await notify('closed', t, { db, send });
  const row = db.tables.pending_notifications[0];
  assert.equal(row.attempts, 1);
  for (let i = 2; i <= MAX_ATTEMPTS; i++) {
    row.next_attempt_at = new Date(0).toISOString();
    const r = await deliverPending({ db, send });
    assert.deepEqual(r, i < MAX_ATTEMPTS ? { sent: 0, failed: 1, exhausted: 0 } : { sent: 0, failed: 0, exhausted: 1 }, `attempt ${i}`);
    assert.equal(row.attempts, i);
  }
  row.next_attempt_at = new Date(0).toISOString();
  assert.deepEqual(await deliverPending({ db, send }), { sent: 0, failed: 0, exhausted: 0 }, 'exhausted rows are no longer selected');
  assert.match(row.last_error, /simulated/);
  assert.equal(row.sent_at, null);
});

test('queueBounce and alertFailedCalls', async () => {
  const db = fakeDb();
  db.seedStaff([{ name: 'Jo', email: 'jo@truthcaregroup.co.uk', role: 'admin' }, { name: 'Paul', email: 'paul@truthcaregroup.co.uk' }]);
  const send = fakeSend();
  const t = ticketRow(db);
  await queueBounce({ to: 'paul@truthcaregroup.co.uk', ticket: t, unknown: ['asign jo'], messages: ["Couldn't understand 'asign jo' — did you mean assign?"] }, { db, send });
  assert.equal(send.sent[0].to, 'paul@truthcaregroup.co.uk');
  assert.ok(send.sent[0].subject.endsWith('command not understood'));
  assert.ok(send.sent[0].text.includes('did you mean assign?'));
  assert.deepEqual(await alertFailedCalls({ db, send }), { alerted: 0 });
  db.tables.failed_calls.push({ id: 'f1', retell_call_id: 'call_1', action: 'create_ticket', args: { caller_name: 'A' }, error: 'boom', alerted_at: null, created_at: new Date().toISOString() });
  assert.deepEqual(await alertFailedCalls({ db, send }), { alerted: 1 });
  assert.equal(send.sent.at(-1).to, 'jo@truthcaregroup.co.uk', 'admins only');
  assert.ok(send.sent.at(-1).text.includes('call_1'));
  assert.ok(db.tables.failed_calls[0].alerted_at);
  assert.deepEqual(await alertFailedCalls({ db, send }), { alerted: 0 }, 'alerted once');
});
