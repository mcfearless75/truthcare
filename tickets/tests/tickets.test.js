import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTicket, applyCommand, addNote, getTicketDetail, getTicketByNumber, getTicketByToken, listTickets, threadingLookup, CommandError } from '../lib/tickets.js';
import { deliverPending } from '../lib/notify.js';
import { fakeDb, fakeSend, fakeCareRota } from './helpers/fake-db.js';

function setup() {
  const db = fakeDb();
  const [jo, paul] = db.seedStaff([
    { name: 'Joanne Bray', email: 'joanne@truthcaregroup.co.uk', aliases: ['jo'], role: 'admin' },
    { name: 'Paul McFearless', email: 'paul@truthcaregroup.co.uk', aliases: ['pm'] },
    { name: 'Sam Quiet', email: 'sam@truthcaregroup.co.uk', receives_new_tickets: false },
  ]);
  const send = fakeSend();
  return { db, send, jo, paul, PAUL: { id: paul.id, name: paul.name, email: paul.email } };
}

const phoneInput = {
  category: 'resident_concern', source: 'phone', summary: 'Daughter worried about bruising on his arm', callerName: 'Jane Smith',
  callerPhone: '+447700900123', callerEmail: 'Jane@Example.com', subjectPerson: 'Michael', retellCallId: 'call_abc',
};

test('createTicket: computes priority, mints a token, records the created event and emails new-ticket staff', async () => {
  const { db, send } = setup();
  const t = await createTicket(phoneInput, { via: 'phone', db, send });
  assert.equal(t.number, 1);
  assert.equal(t.priority, 'urgent');
  assert.equal(t.status, 'open');
  assert.equal(t.callerEmail, 'jane@example.com');
  assert.match(t.emailToken, /^[a-z2-7]{8}$/);
  assert.equal(db.tables.ticket_events[0].event, 'created');
  const queued = db.tables.pending_notifications;
  assert.deepEqual(queued.map((n) => [n.kind, n.recipient, n.payload.audience]).sort(), [['created', 'joanne@truthcaregroup.co.uk', 'staff'], ['created', 'paul@truthcaregroup.co.uk', 'staff']]);
  assert.ok(queued.every((n) => n.sent_at && n.attempts === 1 && n.last_error === null));
  assert.equal(send.sent.length, 2);
  assert.equal(send.sent[0].subject, '[TC-1] [URGENT] Resident concern — Jane Smith re: Michael');
  assert.equal(send.sent[0].replyTo, `tickets+tc1-${t.emailToken}@truthcaregroup.co.uk`);
  assert.ok(send.sent[0].text.includes('Reply with a command'));
  assert.equal(send.to('jane@example.com').length, 0, 'callers are not told about creation by email');
  const withNote = await createTicket({ ...phoneInput, category: 'nonsense', priority: 'high', summary: 'plain', initialNote: { body: 'Email body here', authorType: 'caller', authorName: 'Jane' } }, { via: 'email', db, send });
  assert.equal(withNote.category, 'general');
  assert.equal(withNote.priority, 'high', 'explicit priority raises the general default');
  assert.equal(db.tables.ticket_notes.filter((n) => n.ticket_id === withNote.id).length, 1);
});

test('applyCommand assign/take: resolves staff, records the event, emails only the assignee; errors on unknown or ambiguous', async () => {
  const { db, send, jo, paul, PAUL } = setup();
  const t = await createTicket(phoneInput, { via: 'phone', db, send });
  send.sent.length = 0;
  const r = await applyCommand(t.id, { type: 'assign', value: 'jo' }, PAUL, { via: 'email', db, send });
  assert.equal(r.ticket.assignedTo, jo.id);
  assert.deepEqual(r.events.map((e) => [e.event, e.fromValue, e.toValue, e.actor, e.via]), [['assigned', null, 'Joanne Bray', 'Paul McFearless', 'email']]);
  assert.deepEqual(send.sent.map((m) => m.to), ['joanne@truthcaregroup.co.uk']);
  assert.ok(send.sent[0].text.startsWith('Assigned to you'));
  const again = await applyCommand(t.id, { type: 'assign', value: 'joanne' }, PAUL, { via: 'board', db, send });
  assert.equal(again.events.length, 0, 'assigning to the current assignee is a no-op');
  await assert.rejects(applyCommand(t.id, { type: 'assign', value: 'zed' }, PAUL, { via: 'email', db, send }), (e) => e instanceof CommandError && e.code === 'no_staff');
  db.seedStaff([{ name: 'John Smith', email: 'john@truthcaregroup.co.uk' }]);
  await assert.rejects(applyCommand(t.id, { type: 'assign', value: 'j' }, PAUL, { via: 'email', db, send }), (e) => e.code === 'ambiguous' && e.message.includes('Joanne Bray or John Smith'));
  send.sent.length = 0;
  const mine = await applyCommand(t.id, { type: 'take' }, { email: 'PAUL@truthcaregroup.co.uk' }, { via: 'email', db, send });
  assert.equal(mine.ticket.assignedTo, paul.id);
  assert.deepEqual(send.sent.map((m) => m.to), ['paul@truthcaregroup.co.uk']);
  await assert.rejects(applyCommand(t.id, { type: 'take' }, { email: 'stranger@example.com' }, { via: 'email', db, send }), (e) => e.code === 'no_staff');
  await assert.rejects(applyCommand('00000000-0000-4000-8000-999999999999', { type: 'take' }, PAUL, { via: 'email', db, send }), (e) => e.code === 'no_ticket');
});

test('notes: public note goes to assignee + thread participants and the caller; internal note never reaches the caller', async () => {
  const { db, send, PAUL } = setup();
  const t = await createTicket(phoneInput, { via: 'phone', db, send });
  await applyCommand(t.id, { type: 'take' }, PAUL, { via: 'email', db, send });
  send.sent.length = 0;
  const pub = await applyCommand(t.id, { type: 'note', value: 'We have a bed from Monday.' }, PAUL, { via: 'email', db, send });
  assert.equal(pub.notes.length, 1);
  assert.equal(pub.notes[0].isInternal, false);
  assert.equal(pub.notes[0].authorEmail, 'paul@truthcaregroup.co.uk');
  const kinds = db.tables.pending_notifications.slice(-2).map((n) => [n.kind, n.recipient, n.payload.audience]).sort();
  assert.deepEqual(kinds, [['caller_reply', 'jane@example.com', 'caller'], ['updated', 'paul@truthcaregroup.co.uk', 'staff']]);
  const callerMail = send.to('jane@example.com')[0];
  assert.equal(callerMail.subject, '[TC-1] Truth Care Group — an update on your message');
  assert.ok(callerMail.text.includes('We have a bed from Monday.'));
  assert.ok(!callerMail.text.includes('Reply with a command'));
  send.sent.length = 0;
  const internal = await applyCommand(t.id, { type: 'internal_note', value: 'Family are difficult, tread carefully' }, { name: 'Joanne Bray', email: 'joanne@truthcaregroup.co.uk' }, { via: 'board', db, send });
  assert.equal(internal.notes[0].isInternal, true);
  assert.deepEqual(send.sent.map((m) => m.to).sort(), ['joanne@truthcaregroup.co.uk', 'paul@truthcaregroup.co.uk'], 'assignee + participants (Jo now participates), no caller');
  assert.ok(send.sent.every((m) => m.text.includes('Internal note from Joanne Bray')));
  await assert.rejects(applyCommand(t.id, { type: 'note', value: '   ' }, PAUL, { via: 'email', db, send }), (e) => e.code === 'empty_note');
});

test('status/priority/category: events, closed_at, closure email to caller, no-ops and bad values', async () => {
  const { db, send, PAUL } = setup();
  const t = await createTicket(phoneInput, { via: 'phone', db, send });
  await applyCommand(t.id, { type: 'take' }, PAUL, { via: 'email', db, send });
  send.sent.length = 0;
  const prog = await applyCommand(t.id, { type: 'status', value: 'in_progress' }, PAUL, { via: 'email', db, send });
  assert.equal(prog.ticket.status, 'in_progress');
  assert.deepEqual(send.sent.map((m) => m.to), ['paul@truthcaregroup.co.uk'], 'status change: staff only');
  send.sent.length = 0;
  const closed = await applyCommand(t.id, { type: 'status', value: 'closed' }, PAUL, { via: 'email', db, send });
  assert.equal(closed.ticket.status, 'closed');
  assert.ok(closed.ticket.closedAt, 'closed_at set');
  assert.deepEqual(send.sent.map((m) => m.to).sort(), ['jane@example.com', 'paul@truthcaregroup.co.uk']);
  assert.equal(send.to('jane@example.com')[0].subject, '[TC-1] Truth Care Group — your message has been closed');
  assert.ok(send.to('paul@truthcaregroup.co.uk')[0].text.includes('Ticket closed'));
  send.sent.length = 0;
  const same = await applyCommand(t.id, { type: 'status', value: 'closed' }, PAUL, { via: 'email', db, send });
  assert.equal(same.events.length, 0);
  assert.equal(send.sent.length, 0, 'no-op sends nothing');
  const reopened = await applyCommand(t.id, { type: 'status', value: 'open' }, PAUL, { via: 'board', db, send });
  assert.equal(reopened.ticket.closedAt, null, 'reopening clears closed_at');
  const pr = await applyCommand(t.id, { type: 'priority', value: 'normal' }, PAUL, { via: 'email', db, send });
  assert.equal(pr.ticket.priority, 'normal');
  assert.deepEqual(pr.events.map((e) => [e.event, e.fromValue, e.toValue]), [['priority', 'urgent', 'normal']]);
  const cat = await applyCommand(t.id, { type: 'category', value: 'general' }, PAUL, { via: 'email', db, send });
  assert.equal(cat.ticket.category, 'general');
  await assert.rejects(applyCommand(t.id, { type: 'priority', value: 'meh' }, PAUL, { via: 'email', db, send }), (e) => e.code === 'bad_value');
  await assert.rejects(applyCommand(t.id, { type: 'status', value: 'done' }, PAUL, { via: 'email', db, send }), (e) => e.code === 'bad_value');
  await assert.rejects(applyCommand(t.id, { type: 'dance' }, PAUL, { via: 'email', db, send }), (e) => e.code === 'unknown_command');
});

test('dropshift: staff-only, needs CareRota configured, and writes a clear internal note either way', async () => {
  const { db, send, PAUL } = setup();
  const CAREROTA_ENV = ['CAREROTA_URL', 'CAREROTA_ANON_KEY', 'CAREROTA_MANAGER_EMAIL', 'CAREROTA_MANAGER_PASSWORD'];
  for (const k of CAREROTA_ENV) delete process.env[k];

  const general = await createTicket({ ...phoneInput, category: 'general' }, { via: 'phone', db, send });
  await assert.rejects(applyCommand(general.id, { type: 'dropshift' }, PAUL, { via: 'email', db, send }), (e) => e.code === 'wrong_category');

  const staffTicket = await createTicket({ category: 'staff', source: 'phone', summary: 'Feeling unwell, cannot make shift', callerName: 'Joanne Bray', shiftStartsAt: '2026-09-06T20:00:00Z' }, { via: 'phone', db, send });

  const notConfigured = await applyCommand(staffTicket.id, { type: 'dropshift' }, PAUL, { via: 'email', db, send });
  assert.match(notConfigured.notes[0].body, /CareRota is not configured yet/);
  assert.equal(notConfigured.notes[0].isInternal, true);

  for (const k of CAREROTA_ENV) process.env[k] = 'set';
  try {
    const org = { id: 'org-1', name: 'Beaconsfield' };
    const staffRow = { id: 'cr-staff-1', org_id: 'org-1', full_name: 'Joanne Bray' };
    const shiftRow = { id: 'cr-shift-1', org_id: 'org-1', assigned_staff_id: 'cr-staff-1', shift_date: '2026-09-06', start_time: '20:00:00', status: 'confirmed' };
    const okClient = fakeCareRota({ organisations: [org], staff_records: [staffRow], shifts: [shiftRow] });
    const ok = await applyCommand(staffTicket.id, { type: 'dropshift' }, PAUL, { via: 'email', db, send, getCareRotaClient: async () => okClient });
    assert.match(ok.notes[0].body, /Dropped Joanne Bray's shift on 2026-09-06 \(20:00:00\) in carerota/);
    assert.equal(okClient.rpcCalls.length, 1);
    assert.equal(db.tables.tickets.find((t) => t.id === staffTicket.id).carerota_shift_id, 'cr-shift-1', 'recorded so the CareRota poller (lib/carerota-watch.js) knows which shift to follow up on');

    const ambiguousClient = fakeCareRota({ organisations: [org], staff_records: [staffRow, { ...staffRow, id: 'cr-staff-2' }], shifts: [] });
    const ambiguous = await applyCommand(staffTicket.id, { type: 'dropshift' }, PAUL, { via: 'email', db, send, getCareRotaClient: async () => ambiguousClient });
    assert.match(ambiguous.notes[0].body, /Could not drop the shift automatically.*Please update CareRota directly/s);

    const throwingClient = { from: () => { throw new Error('network down'); }, rpc: async () => ({ data: null, error: null }) };
    const errored = await applyCommand(staffTicket.id, { type: 'dropshift' }, PAUL, { via: 'email', db, send, getCareRotaClient: async () => throwingClient });
    assert.match(errored.notes[0].body, /Could not reach CareRota: network down/);
  } finally {
    for (const k of CAREROTA_ENV) delete process.env[k];
  }
});

test('finders, detail, list ordering and the threading lookup', async () => {
  const { db, send, paul, PAUL } = setup();
  const a = await createTicket({ ...phoneInput, category: 'general', summary: 'plain', callerEmail: 'a@example.com', graphConversationId: 'conv-a' }, { via: 'email', db, send });
  const b = await createTicket(phoneInput, { via: 'phone', db, send });
  await applyCommand(b.id, { type: 'take' }, PAUL, { via: 'board', db, send });
  await applyCommand(b.id, { type: 'note', value: 'hello' }, PAUL, { via: 'board', db, send });
  const list = await listTickets({}, { db });
  assert.deepEqual(list.map((t) => t.number), [2, 1], 'urgent first');
  assert.equal(list[0].assigneeName, 'Paul McFearless');
  const detail = await getTicketDetail(2, { db });
  assert.equal(detail.ticket.id, b.id);
  assert.equal(detail.assignee.id, paul.id);
  assert.equal(detail.notes.length, 1);
  assert.deepEqual(detail.events.map((e) => e.event), ['created', 'assigned']);
  assert.equal(await getTicketDetail(99, { db }), null);
  assert.equal((await getTicketByNumber(1, { db })).id, a.id);
  assert.equal((await getTicketByToken(1, a.emailToken, { db })).id, a.id);
  assert.equal(await getTicketByToken(1, 'wrongtok', { db }), null);
  const lookup = threadingLookup({ db });
  assert.equal((await lookup.byToken(2, b.emailToken)).id, b.id);
  assert.equal((await lookup.byConversation('conv-a')).id, a.id);
  assert.equal((await lookup.byCallerAndNumber('A@example.com'.toLowerCase(), 1)).id, a.id);
  assert.equal(await lookup.byCallerAndNumber('a@example.com', 2), null);
  const filtered = await listTickets({ status: 'active', priority: 'urgent', category: 'resident_concern', assignedTo: 'unassigned', q: 'Jane', limit: 5000 }, { db });
  assert.ok(Array.isArray(filtered));
  const sqlText = db.log.at(-1).q;
  assert.ok(sqlText.includes("t.status <> 'closed'") && sqlText.includes('t.priority = $1') && sqlText.includes('t.assigned_to IS NULL') && sqlText.includes('ILIKE $3') && sqlText.includes('LIMIT 500'), sqlText);
});

test('a failed send is kept in pending_notifications with backoff and retried by deliverPending', async () => {
  const { db, send } = setup();
  send.failFor.add('joanne@truthcaregroup.co.uk');
  const t = await createTicket(phoneInput, { via: 'phone', db, send });
  const failed = db.tables.pending_notifications.find((n) => n.recipient === 'joanne@truthcaregroup.co.uk');
  assert.equal(failed.attempts, 1);
  assert.equal(failed.sent_at, null);
  assert.match(failed.last_error, /simulated/);
  assert.ok(Date.parse(failed.next_attempt_at) > Date.now() + 4 * 60 * 1000, 'next attempt is ~5 min out');
  assert.equal(t.number, 1, 'ticket creation is not blocked by a send failure');
  send.failFor.clear();
  assert.deepEqual(await deliverPending({ db, send }), { sent: 0, failed: 0, exhausted: 0 }, 'not due yet');
  failed.next_attempt_at = new Date(0).toISOString();
  assert.deepEqual(await deliverPending({ db, send }), { sent: 1, failed: 0, exhausted: 0 });
  assert.ok(failed.sent_at);
  assert.equal(failed.attempts, 2);
});

test('addNote fails closed: a caller that omits isInternal gets an internal note, never a public one', async () => {
  const { db, send } = setup();
  const t = await createTicket(phoneInput, { via: 'phone', db, send });
  const note = await addNote(t.id, { body: 'Note built without saying whether it is internal' }, { db });
  assert.equal(note.isInternal, true, 'omitting isInternal must default to internal, not public');
  const stored = db.tables.ticket_notes.find((n) => n.id === note.id);
  assert.equal(stored.is_internal, true);
});
