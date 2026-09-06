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

test('retention SQL: anonymise closed tickets, delete ai notes, drop queued payloads — parameterised, idempotent, statistics kept', () => {
  const cutoff = '2025-09-05T03:00:00.000Z';
  const s = retentionStatements(cutoff);
  assert.deepEqual(s.map((x) => x.name), ['anonymise_tickets', 'delete_ai_notes', 'delete_notification_payloads']);
  const [anon, notes, payloads] = s;
  const flat = (t) => t.replace(/\s+/g, ' ').trim();
  assert.deepEqual(anon.params, [cutoff, REDACTED]);
  assert.equal(REDACTED, '[redacted]');
  for (const col of ['caller_name', 'caller_phone', 'caller_email', 'caller_org', 'subject_person']) assert.ok(flat(anon.text).includes(`${col} = $2`), col);
  assert.ok(flat(anon.text).includes(`summary = left(summary, ${SUMMARY_KEEP_CHARS})`));
  assert.equal(SUMMARY_KEEP_CHARS, 80);
  assert.ok(flat(anon.text).includes('WHERE closed_at IS NOT NULL AND closed_at < $1'));
  assert.ok(flat(anon.text).includes('caller_name IS DISTINCT FROM $2'), 'already-redacted rows are skipped');
  assert.ok(flat(anon.text).endsWith('RETURNING id'));
  for (const kept of ['number =', 'category =', 'created_at =', 'closed_at =', 'DELETE FROM tickets']) assert.ok(!flat(anon.text).includes(kept), `must not touch ${kept}`);
  assert.deepEqual(notes.params, [cutoff]);
  assert.ok(flat(notes.text).startsWith("DELETE FROM ticket_notes WHERE author_type = 'ai' AND ticket_id IN (SELECT id FROM tickets WHERE closed_at IS NOT NULL AND closed_at < $1)"));
  assert.ok(flat(payloads.text).startsWith('DELETE FROM pending_notifications WHERE ticket_id IN (SELECT id FROM tickets WHERE closed_at IS NOT NULL AND closed_at < $1)'));
  assert.ok(!s.some((x) => x.text.includes(cutoff)), 'the cutoff is a parameter, never interpolated');
});

test('runRetention executes the statements in order and reports counts', async () => {
  const calls = [];
  const db = { query: async (text, params) => { calls.push({ text, params }); return calls.length === 1 ? [{ id: 'a' }, { id: 'b' }] : calls.length === 2 ? [{ id: 'n' }] : []; } };
  const r = await runRetention({ db, now: Date.parse('2026-09-05T03:00:00Z') });
  assert.deepEqual(r, { cutoff: '2025-09-05T03:00:00.000Z', anonymised: 2, aiNotesDeleted: 1, notificationsDeleted: 0 });
  assert.equal(calls.length, 3);
  assert.ok(calls[0].text.includes('UPDATE tickets'));
  assert.ok(calls[1].text.includes('DELETE FROM ticket_notes'));
  assert.ok(calls[2].text.includes('DELETE FROM pending_notifications'));
  assert.equal(calls[0].params[0], '2025-09-05T03:00:00.000Z');
});

test('backoff schedule used by the notifications job: 5, 20, 45, 80 minutes then stop at 5 attempts', () => {
  assert.deepEqual([1, 2, 3, 4].map((n) => backoffMs(n) / 60000), [5, 20, 45, 80]);
  assert.equal(MAX_ATTEMPTS, 5);
});

const fakeRes = () => { const o = { code: 0, body: null }; o.status = (c) => { o.code = c; return o; }; o.json = (b) => { o.body = b; return o; }; return o; };
beforeEach(() => { process.env.CRON_SECRET = 'cron-secret'; });

test('?job=notifications drains due rows and alerts admins to failed calls; ?job=retention runs the anonymisation', async () => {
  assert.deepEqual(Object.keys(JOBS), ['email', 'notifications', 'retention']);
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
  assert.deepEqual([res.body.job, res.body.cutoff, res.body.anonymised, res.body.aiNotesDeleted, res.body.notificationsDeleted], ['retention', '2025-09-06T03:00:00.000Z', 0, 0, 0]);
  assert.equal(queries.length, 3);
  delete process.env.CRON_SECRET;
});
