import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { retentionCutoff, retentionStatements, runRetention, RETENTION_MONTHS, SUMMARY_KEEP_CHARS, REDACTED } from '../lib/retention.js';
import { backoffMs, MAX_ATTEMPTS } from '../lib/notify.js';
import { handleCron, JOBS } from '../api/cron/index.js';
import { fakeDb, fakeSend } from './helpers/fake-db.js';

test('retentionCutoff is 12 calendar months back, clamped at month end', () => {
  assert.equal(RETENTION_MONTHS, 12);
  assert.equal(retentionCutoff(Date.parse('2026-09-05T03:00:00Z')).toISOString(), '2025-09-05T03:00:00.000Z');
  assert.equal(retentionCutoff(Date.parse('2028-02-29T03:00:00Z')).toISOString(), '2027-02-28T03:00:00.000Z');
  assert.equal(retentionCutoff(Date.parse('2027-03-31T00:00:00Z')).toISOString(), '2026-03-31T00:00:00.000Z');
  assert.equal(retentionCutoff(Date.parse('2027-01-15T12:00:00Z')).toISOString(), '2026-01-15T12:00:00.000Z');
});

test('retention SQL: redact caller notes/events, anonymise closed tickets (incl. subject), delete ai notes, drop queued payloads — parameterised, idempotent, statistics kept', () => {
  const cutoff = '2025-09-05T03:00:00.000Z';
  const s = retentionStatements(cutoff);
  assert.deepEqual(s.map((x) => x.name), ['redact_caller_notes', 'redact_caller_events', 'anonymise_tickets', 'delete_ai_notes', 'delete_notification_payloads']);
  const [callerNotes, callerEvents, anon, notes, payloads] = s;
  const flat = (t) => t.replace(/\s+/g, ' ').trim();
  assert.equal(REDACTED, '[redacted]');

  assert.deepEqual(callerNotes.params, [cutoff, REDACTED]);
  assert.ok(flat(callerNotes.text).startsWith("UPDATE ticket_notes SET author_name = $2, author_email = $2 WHERE author_type = 'caller'"));
  assert.ok(flat(callerNotes.text).includes('ticket_id IN (SELECT id FROM tickets WHERE closed_at IS NOT NULL AND closed_at < $1)'));
  assert.ok(flat(callerNotes.text).includes('author_name IS DISTINCT FROM $2 OR author_email IS DISTINCT FROM $2'), 'already-redacted rows are skipped');
  for (const staffType of ["author_type = 'staff'", "author_type = 'system'", "author_type = 'ai'"]) assert.ok(!flat(callerNotes.text).includes(staffType), 'only caller-authored notes are touched');

  assert.deepEqual(callerEvents.params, [cutoff, REDACTED]);
  assert.ok(flat(callerEvents.text).startsWith('UPDATE ticket_events SET actor = $2 WHERE'));
  assert.ok(flat(callerEvents.text).includes('ticket_id IN (SELECT id FROM tickets WHERE closed_at IS NOT NULL AND closed_at < $1)'));
  assert.ok(flat(callerEvents.text).includes('actor <> $2'), 'idempotency guard');
  assert.match(flat(callerEvents.text), /lower\((ticket_events\.)?actor\) = lower\((t2\.)?caller_name\)/, 'only actors matching the ticket caller are redacted');
  assert.match(flat(callerEvents.text), /lower\((ticket_events\.)?actor\) = lower\((t2\.)?caller_email\)/);
  assert.ok(flat(callerEvents.text).includes('ticket_events.actor'), 'actor is column-qualified in the correlated subquery so a future tickets.actor column could never shadow it');

  assert.deepEqual(anon.params, [cutoff, REDACTED]);
  for (const col of ['caller_name', 'caller_phone', 'caller_email', 'caller_org', 'subject_person', 'subject']) assert.ok(flat(anon.text).includes(`${col} = $2`), col);
  assert.ok(flat(anon.text).includes(`summary = left(summary, ${SUMMARY_KEEP_CHARS})`));
  assert.equal(SUMMARY_KEEP_CHARS, 80);
  assert.ok(flat(anon.text).includes('WHERE closed_at IS NOT NULL AND closed_at < $1'));
  assert.ok(flat(anon.text).includes('caller_name IS DISTINCT FROM $2'), 'already-redacted rows are skipped');
  assert.ok(flat(anon.text).includes('subject IS DISTINCT FROM $2'));
  assert.ok(flat(anon.text).endsWith('RETURNING id'));
  for (const kept of ['number =', 'category =', 'created_at =', 'closed_at =', 'DELETE FROM tickets']) assert.ok(!flat(anon.text).includes(kept), `must not touch ${kept}`);

  assert.deepEqual(notes.params, [cutoff]);
  assert.ok(flat(notes.text).startsWith("DELETE FROM ticket_notes WHERE author_type = 'ai' AND ticket_id IN (SELECT id FROM tickets WHERE closed_at IS NOT NULL AND closed_at < $1)"));
  assert.ok(flat(payloads.text).startsWith('DELETE FROM pending_notifications WHERE ticket_id IN (SELECT id FROM tickets WHERE closed_at IS NOT NULL AND closed_at < $1)'));
  assert.ok(!s.some((x) => x.text.includes(cutoff)), 'the cutoff is a parameter, never interpolated');
});

test('runRetention executes the statements in order (caller notes/events redacted before tickets are anonymised) and reports counts', async () => {
  const calls = [];
  const db = { query: async (text, params) => { calls.push({ text, params }); return calls.length === 3 ? [{ id: 'a' }, { id: 'b' }] : calls.length === 4 ? [{ id: 'n' }] : calls.length === 1 ? [{ id: 'note1' }] : calls.length === 2 ? [{ id: 'evt1' }] : []; } };
  const r = await runRetention({ db, now: Date.parse('2026-09-05T03:00:00Z') });
  assert.deepEqual(r, { cutoff: '2025-09-05T03:00:00.000Z', anonymised: 2, aiNotesDeleted: 1, notificationsDeleted: 0, notesRedacted: 1, eventsRedacted: 1 });
  assert.equal(calls.length, 5);
  assert.ok(calls[0].text.includes('UPDATE ticket_notes'));
  assert.ok(calls[1].text.includes('UPDATE ticket_events'));
  assert.ok(calls[2].text.includes('UPDATE tickets'));
  assert.ok(calls[3].text.includes('DELETE FROM ticket_notes'));
  assert.ok(calls[4].text.includes('DELETE FROM pending_notifications'));
  assert.equal(calls[0].params[0], '2025-09-05T03:00:00.000Z');
});

test('runRetention against per-ticket data: 13mo-closed is anonymised, 11mo and exactly-12mo-closed are not, open tickets never touched', async () => {
  const db = fakeDb();
  const now = Date.parse('2026-09-05T12:00:00Z');
  const cutoffIso = retentionCutoff(now).toISOString(); // 2025-09-05T12:00:00.000Z
  const ticket = (id, overrides) => ({
    id, number: id, status: 'closed', priority: 'normal', category: 'general', source: 'email',
    subject: 's', summary: 'A'.repeat(200), caller_name: 'Jane Smith', caller_phone: '+447700900123',
    caller_email: 'jane@example.com', caller_org: 'NHS', subject_person: 'Michael', email_token: `tok${id}`,
    graph_conversation_id: null, retell_call_id: null, assigned_to: null,
    created_at: new Date(0).toISOString(), updated_at: new Date(0).toISOString(), closed_at: null,
    ...overrides,
  });
  const closed13mo = ticket('t13', { closed_at: '2025-08-01T00:00:00.000Z' }); // strictly before cutoff
  const closedExactly12mo = ticket('t12', { closed_at: cutoffIso }); // == cutoff, must NOT be touched (strict <)
  const closed11mo = ticket('t11', { closed_at: '2025-10-01T00:00:00.000Z' }); // after cutoff
  const stillOpen = ticket('topen', { status: 'open', closed_at: null });
  db.tables.tickets.push(closed13mo, closedExactly12mo, closed11mo, stillOpen);
  db.tables.ticket_notes.push(
    { id: 'n13', ticket_id: 't13', author_type: 'ai', body: 'transcript', is_internal: true, created_at: now, author_name: null, author_email: null },
    { id: 'n11', ticket_id: 't11', author_type: 'ai', body: 'transcript', is_internal: true, created_at: now, author_name: null, author_email: null },
    // I3: a caller-authored note and a staff-authored note on the anonymised ticket —
    // only the caller's own identifying fields should be scrubbed.
    { id: 'nc13', ticket_id: 't13', author_type: 'caller', body: 'Thanks for the update', is_internal: false, created_at: now, author_name: 'Jane Smith', author_email: 'jane@example.com' },
    { id: 'ns13', ticket_id: 't13', author_type: 'staff', body: 'Called the family back', is_internal: true, created_at: now, author_name: 'Jo Bray', author_email: 'jo@truthcaregroup.co.uk' },
    // Same shapes on an untouched (11mo-closed) ticket, to prove they survive.
    { id: 'nc11', ticket_id: 't11', author_type: 'caller', body: 'Following up', is_internal: false, created_at: now, author_name: 'Jane Smith', author_email: 'jane@example.com' },
  );
  db.tables.ticket_events.push(
    // I3: the 'created' event on an email-sourced ticket carries the caller's own name as actor.
    { id: 'ec13', ticket_id: 't13', event: 'created', actor: 'Jane Smith', from_value: null, to_value: 'normal', via: 'email', created_at: now },
    // A staff action (assigned) on the same ticket must survive untouched.
    { id: 'es13', ticket_id: 't13', event: 'assigned', actor: 'Jo Bray', from_value: null, to_value: 'Jo Bray', via: 'email', created_at: now },
    // Same caller-actor shape on an untouched ticket.
    { id: 'ec11', ticket_id: 't11', event: 'created', actor: 'Jane Smith', from_value: null, to_value: 'normal', via: 'email', created_at: now },
  );
  db.tables.pending_notifications.push(
    { id: 'pn13', ticket_id: 't13', kind: 'closed', recipient: 'x@example.com', payload: {}, attempts: 0, last_error: null, next_attempt_at: new Date(0).toISOString(), created_at: new Date(0).toISOString(), sent_at: null },
    { id: 'pn11', ticket_id: 't11', kind: 'closed', recipient: 'x@example.com', payload: {}, attempts: 0, last_error: null, next_attempt_at: new Date(0).toISOString(), created_at: new Date(0).toISOString(), sent_at: null },
  );

  const r = await runRetention({ db, now });
  assert.deepEqual(r, { cutoff: cutoffIso, anonymised: 1, aiNotesDeleted: 1, notificationsDeleted: 1, notesRedacted: 1, eventsRedacted: 1 });

  assert.deepEqual(
    [closed13mo.caller_name, closed13mo.caller_phone, closed13mo.caller_email, closed13mo.caller_org, closed13mo.subject_person, closed13mo.subject],
    [REDACTED, REDACTED, REDACTED, REDACTED, REDACTED, REDACTED],
  );
  assert.equal(closed13mo.summary, 'A'.repeat(80));
  assert.equal(closed13mo.number, 't13', 'number is untouched');
  assert.equal(closed13mo.category, 'general', 'category is untouched');
  assert.equal(closed13mo.created_at, new Date(0).toISOString(), 'created_at is untouched');
  assert.equal(closed13mo.closed_at, '2025-08-01T00:00:00.000Z', 'closed_at is untouched');

  for (const untouched of [closedExactly12mo, closed11mo, stillOpen]) {
    assert.equal(untouched.caller_name, 'Jane Smith', `${untouched.id} must not be anonymised`);
    assert.equal(untouched.subject, 's', `${untouched.id} subject must not be redacted`);
    assert.equal(untouched.summary, 'A'.repeat(200), `${untouched.id} summary must not be truncated`);
  }

  assert.equal(db.tables.ticket_notes.find((n) => n.id === 'n13'), undefined, 'ai note on the anonymised ticket is deleted');
  assert.ok(db.tables.ticket_notes.find((n) => n.id === 'n11'), 'ai note on an untouched ticket survives');
  assert.equal(db.tables.pending_notifications.find((n) => n.id === 'pn13'), undefined, 'queued payload for the anonymised ticket is cleared');
  assert.ok(db.tables.pending_notifications.find((n) => n.id === 'pn11'), 'queued payload for an untouched ticket survives');

  // I3: caller-authored note/event on the anonymised ticket are scrubbed …
  const nc13 = db.tables.ticket_notes.find((n) => n.id === 'nc13');
  assert.deepEqual([nc13.author_name, nc13.author_email], [REDACTED, REDACTED]);
  const ec13 = db.tables.ticket_events.find((e) => e.id === 'ec13');
  assert.equal(ec13.actor, REDACTED);
  // … but the staff-authored note/event on the SAME ticket are not.
  const ns13 = db.tables.ticket_notes.find((n) => n.id === 'ns13');
  assert.deepEqual([ns13.author_name, ns13.author_email], ['Jo Bray', 'jo@truthcaregroup.co.uk']);
  const es13 = db.tables.ticket_events.find((e) => e.id === 'es13');
  assert.equal(es13.actor, 'Jo Bray');
  // Caller-authored note/event on an untouched (11mo-closed) ticket survive too.
  const nc11 = db.tables.ticket_notes.find((n) => n.id === 'nc11');
  assert.deepEqual([nc11.author_name, nc11.author_email], ['Jane Smith', 'jane@example.com']);
  const ec11 = db.tables.ticket_events.find((e) => e.id === 'ec11');
  assert.equal(ec11.actor, 'Jane Smith');

  const r2 = await runRetention({ db, now });
  assert.deepEqual(r2, { cutoff: cutoffIso, anonymised: 0, aiNotesDeleted: 0, notificationsDeleted: 0, notesRedacted: 0, eventsRedacted: 0 }, 'a second run is a no-op — already-redacted rows are skipped');
});

test('backoff schedule used by the notifications job: 5, 20, 45, 80 minutes then stop at 5 attempts', () => {
  assert.deepEqual([1, 2, 3, 4].map((n) => backoffMs(n) / 60000), [5, 20, 45, 80]);
  assert.equal(MAX_ATTEMPTS, 5);
});

const fakeRes = () => { const o = { code: 0, body: null }; o.status = (c) => { o.code = c; return o; }; o.json = (b) => { o.body = b; return o; }; return o; };
beforeEach(() => { process.env.CRON_SECRET = 'cron-secret'; });

test('?job=notifications drains due rows and alerts admins to failed calls; ?job=retention runs the anonymisation; ?job=digest sends the daily summary', async () => {
  assert.deepEqual(Object.keys(JOBS), ['email', 'notifications', 'retention', 'digest']);
  const db = fakeDb();
  db.seedStaff([{ name: 'Jo', email: 'jo@truthcaregroup.co.uk', role: 'admin' }]);
  const send = fakeSend();
  db.tables.pending_notifications.push({ id: 'p1', ticket_id: null, kind: 'bounce', recipient: 'paul@truthcaregroup.co.uk', payload: { ticket: null, unknown: ['x'] }, attempts: 2, last_error: 'earlier', next_attempt_at: new Date(0).toISOString(), created_at: new Date(0).toISOString(), sent_at: null });
  db.tables.failed_calls.push({ id: 'f1', retell_call_id: 'c1', action: 'create_ticket', args: {}, error: 'boom', alerted_at: null, created_at: new Date().toISOString() });
  let res = fakeRes();
  await handleCron({ url: '/api/cron?job=notifications', headers: { authorization: 'Bearer cron-secret' } }, res, { db, send });
  assert.equal(res.code, 200);
  assert.equal(res.body.job, 'notifications');
  assert.deepEqual([res.body.sent, res.body.failed, res.body.exhausted, res.body.failedCallAlerts], [1, 0, 0, 1]);
  assert.ok(db.tables.pending_notifications[0].sent_at);
  assert.deepEqual(send.sent.map((m) => m.to), ['paul@truthcaregroup.co.uk', 'jo@truthcaregroup.co.uk']);
  const queries = [];
  const retentionDb = { query: async (text, params) => { queries.push({ text, params }); return []; } };
  res = fakeRes();
  await handleCron({ url: '/api/cron?job=retention', headers: { authorization: 'Bearer cron-secret' } }, res, { db: retentionDb, now: Date.parse('2026-09-06T03:00:00Z') });
  assert.equal(res.code, 200);
  assert.deepEqual(
    [res.body.job, res.body.cutoff, res.body.anonymised, res.body.aiNotesDeleted, res.body.notificationsDeleted, res.body.notesRedacted, res.body.eventsRedacted],
    ['retention', '2025-09-06T03:00:00.000Z', 0, 0, 0, 0, 0],
  );
  assert.equal(queries.length, 5);

  res = fakeRes();
  await handleCron({ url: '/api/cron?job=digest', headers: { authorization: 'Bearer cron-secret' } }, res, { db, send });
  assert.equal(res.code, 200);
  assert.equal(res.body.job, 'digest');
  assert.equal(res.body.sent, true);
  assert.ok(send.sent.some((m) => m.subject?.startsWith('[Tickets] Daily summary')));

  delete process.env.CRON_SECRET;
});
