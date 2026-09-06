import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, unwrapRetellBody, validateCreateArgs, normaliseCategory, phoneMatchesTicket, lookupResult, summariseCallAnalysis, FALLBACK_RESULT, NOT_FOUND_RESULT } from '../lib/phone.js';
import { signRetellBody } from '../lib/retell.js';
import { handlePhone } from '../api/phone/index.js';
import { fakeDb, fakeSend } from './helpers/fake-db.js';

test('normalizePhone: UK national, +44, 0044, landline, international, junk', () => {
  assert.equal(normalizePhone('07700 900123'), '+447700900123');
  assert.equal(normalizePhone('+44 7700 900123'), '+447700900123');
  assert.equal(normalizePhone('0044 7700 900123'), '+447700900123');
  assert.equal(normalizePhone('447700900123'), '+447700900123');
  assert.equal(normalizePhone('7700900123'), '+447700900123');
  assert.equal(normalizePhone('(01934) 123456'), '+441934123456');
  assert.equal(normalizePhone('+1 (415) 555-2671'), '+14155552671');
  assert.equal(normalizePhone(''), null);
  assert.equal(normalizePhone(null), null);
  assert.equal(normalizePhone('abc'), null);
  assert.equal(normalizePhone('12'), null);
  assert.equal(normalizePhone('0123'), null);
});

test('unwrapRetellBody and validateCreateArgs produce createTicket input or a speakable prompt', () => {
  assert.deepEqual(unwrapRetellBody({ name: 'create_ticket', args: { a: 1 }, call: { call_id: 'c1' } }), { args: { a: 1 }, call: { call_id: 'c1' } });
  assert.deepEqual(unwrapRetellBody({ a: 1 }), { args: { a: 1 }, call: {} });
  assert.deepEqual(unwrapRetellBody(null), { args: {}, call: {} });
  assert.equal(validateCreateArgs({}).prompt, 'Which type of call is this — a referral or enquiry, a member of staff calling in, a concern about a resident, or a general message?');
  assert.equal(validateCreateArgs({ category: 'staff' }).prompt, 'Could you ask the caller for their name?');
  assert.equal(validateCreateArgs({ category: 'staff', caller_name: 'Sam' }).prompt, 'Could you ask the caller to briefly describe what the call is about?');
  const v = validateCreateArgs({ category: 'Resident concern', priority: 'high', caller_name: ' Jane Smith ', caller_phone: '07700 900123', caller_email: 'JANE@example.com', caller_org: 'NHS', subject_person: 'Michael', summary: 'Bruising on his arm.\nWants a call today.', shift_starts_at: '' }, { call_id: 'call_1', from_number: '+441934000000' });
  assert.equal(v.ok, true);
  assert.deepEqual(v.input, { category: 'resident_concern', priority: 'high', subject: 'Bruising on his arm.', summary: 'Bruising on his arm.\nWants a call today.', callerName: 'Jane Smith', callerPhone: '+447700900123', callerEmail: 'jane@example.com', callerOrg: 'NHS', subjectPerson: 'Michael', shiftStartsAt: null, source: 'phone', retellCallId: 'call_1' });
  const noPhone = validateCreateArgs({ category: 'general', caller_name: 'A', summary: 'x', priority: 'silly', caller_email: 'not-email' }, { from_number: '+441934000000' });
  assert.equal(noPhone.input.callerPhone, '+441934000000', 'caller-ID is the fallback');
  assert.equal(noPhone.input.priority, undefined);
  assert.equal(noPhone.input.callerEmail, null);
  assert.ok(validateCreateArgs({ category: 'general', caller_name: 'A', summary: 'y'.repeat(200) }).input.subject.endsWith('…'));
  for (const [raw, expected] of [['referral', 'referral'], ['Referral or enquiry', 'referral'], ['staff calling in', 'staff'], ['resident_concern', 'resident_concern'], ['A concern about a resident', 'resident_concern'], ['General message', 'general'], ['', null], ['pizza', null]]) {
    assert.equal(normaliseCategory(raw), expected, raw);
  }
});

test('lookup helpers: phone match rules and spoken result', () => {
  const t = { number: 7, status: 'in_progress', callerPhone: '+447700900123' };
  assert.equal(phoneMatchesTicket(t, { caller_phone: '07700 900123' }, {}), true);
  assert.equal(phoneMatchesTicket(t, {}, { from_number: '+447700900123' }), true);
  assert.equal(phoneMatchesTicket(t, { caller_phone: '07700 000000' }, { from_number: '+441934000000' }), false);
  assert.equal(phoneMatchesTicket({ ...t, callerPhone: null }, { caller_phone: '07700 900123' }, {}), false);
  assert.deepEqual(lookupResult(t, { body: 'We have a bed from Monday.' }), { result: 'Ticket 7 is being worked on by the team. The latest update from the team is: We have a bed from Monday.', ticket_number: 7, status: 'in_progress' });
  assert.equal(lookupResult({ ...t, status: 'open' }, null).result, 'Ticket 7 is open and waiting for the team. There are no updates from the team yet.');
  const s = summariseCallAnalysis({ transcript: 'Agent: Hello\nUser: Hi', call_analysis: { call_summary: 'Caller asked about a bed.' } });
  assert.equal(s.summary, 'Caller asked about a bed.');
  assert.equal(s.note, 'Summary: Caller asked about a bed.\n\nTranscript:\nAgent: Hello\nUser: Hi');
  assert.equal(s.emergency, false);
  assert.equal(summariseCallAnalysis({}).note, 'Call analysed — no transcript or summary returned.');
  assert.equal(summariseCallAnalysis({ transcript: 'Agent: Please hang up now and dial 999 immediately.' }).emergency, true);
  assert.equal(summariseCallAnalysis({ call_analysis: { call_summary: 'Caller said her mother was unresponsive.' } }).emergency, true);
});

// ── handler ──
const KEY = 'retell-test-key';
const fakeRes = () => { const r = { code: 0, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const signed = (action, payload, { key = KEY, at = Date.now() } = {}) => {
  const body = JSON.stringify(payload);
  return { method: 'POST', url: `/api/phone?action=${action}`, headers: { 'x-retell-signature': signRetellBody(body, key, at) }, body };
};

beforeEach(() => { process.env.RETELL_API_KEY = KEY; delete process.env.RETELL_WEBHOOK_SECRET; });

test('handler: method, unknown action and signature checks happen before any processing', async () => {
  const db = fakeDb();
  let res = fakeRes();
  await handlePhone({ method: 'GET', url: '/api/phone?action=create_ticket', headers: {} }, res, { db });
  assert.equal(res.code, 405);
  res = fakeRes();
  await handlePhone(signed('nope', {}), res, { db });
  assert.equal(res.code, 404);
  res = fakeRes();
  await handlePhone(signed('create_ticket', { args: {} }, { key: 'wrong' }), res, { db });
  assert.equal(res.code, 401);
  res = fakeRes();
  await handlePhone(signed('create_ticket', { args: {} }, { at: Date.now() - 10 * 60 * 1000 }), res, { db });
  assert.equal(res.code, 401, 'stale timestamp');
  delete process.env.RETELL_API_KEY;
  res = fakeRes();
  await handlePhone(signed('create_ticket', { args: {} }), res, { db });
  assert.equal(res.code, 401, 'no key configured → refuse');
  process.env.RETELL_WEBHOOK_SECRET = 'other-key';
  res = fakeRes();
  await handlePhone(signed('webhook', { event: 'call_started' }, { key: 'other-key' }), res, { db });
  assert.deepEqual([res.code, res.body], [200, { ok: true, ignored: 'call_started' }], 'RETELL_WEBHOOK_SECRET is accepted as a signing key too');
  assert.equal(db.log.length, 0, 'nothing touched the database');
});

test('handler create_ticket: validation prompts are 200s; success creates the ticket and speaks the number', async () => {
  const db = fakeDb();
  db.seedStaff([{ name: 'Jo', email: 'jo@truthcaregroup.co.uk' }]);
  const send = fakeSend();
  let res = fakeRes();
  await handlePhone(signed('create_ticket', { name: 'create_ticket', args: { category: 'staff' }, call: { call_id: 'c1' } }), res, { db, send });
  assert.deepEqual([res.code, res.body], [200, { result: 'Could you ask the caller for their name?' }]);
  res = fakeRes();
  await handlePhone(signed('create_ticket', { name: 'create_ticket', args: { category: 'staff', caller_name: 'Sam', summary: 'Off sick tonight, shift at 8pm', shift_starts_at: new Date(Date.now() + 3600e3).toISOString() }, call: { call_id: 'c1', from_number: '+447700900123' } }), res, { db, send });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { result: "I've logged that as ticket 1 and the team will be in touch.", ticket_number: 1 });
  const row = db.tables.tickets[0];
  assert.equal(row.priority, 'urgent');
  assert.equal(row.caller_phone, '+447700900123');
  assert.equal(row.retell_call_id, 'c1');
  assert.equal(row.source, 'phone');
  assert.equal(send.sent[0].to, 'jo@truthcaregroup.co.uk');
  res = fakeRes();
  await handlePhone({ ...signed('create_ticket', {}), body: 'not json', headers: { 'x-retell-signature': signRetellBody('not json', KEY, Date.now()) } }, res, { db, send });
  assert.equal(res.body.result, "Sorry, I didn't catch that — could you say it again?");
});

test('handler lookup_ticket: only status + latest public note, only when the phone matches', async () => {
  const db = fakeDb();
  const send = fakeSend();
  await handlePhone(signed('create_ticket', { args: { category: 'general', caller_name: 'Jane', summary: 'Bed enquiry', caller_phone: '07700 900123' }, call: { call_id: 'c2' } }), fakeRes(), { db, send });
  const t = db.tables.tickets[0];
  db.tables.ticket_notes.push({ id: 'n1', ticket_id: t.id, body: 'SECRET internal', author_type: 'staff', is_internal: true, created_at: '2026-09-05T10:00:00Z' });
  db.tables.ticket_notes.push({ id: 'n2', ticket_id: t.id, body: 'We have a bed from Monday.', author_type: 'staff', is_internal: false, created_at: '2026-09-05T09:00:00Z' });
  let res = fakeRes();
  await handlePhone(signed('lookup_ticket', { args: { ticket_number: '1' }, call: { from_number: '+447700900123' } }), res, { db });
  assert.equal(res.body.result, 'Ticket 1 is open and waiting for the team. The latest update from the team is: We have a bed from Monday.');
  assert.ok(!JSON.stringify(res.body).includes('SECRET'));
  res = fakeRes();
  await handlePhone(signed('lookup_ticket', { args: { ticket_number: 1, caller_phone: '07700 900123' }, call: { from_number: '+441934000000' } }), res, { db });
  assert.equal(res.body.ticket_number, 1, 'spoken number also proves');
  res = fakeRes();
  await handlePhone(signed('lookup_ticket', { args: { ticket_number: 1 }, call: { from_number: '+441934000000' } }), res, { db });
  assert.deepEqual(res.body, { result: NOT_FOUND_RESULT });
  res = fakeRes();
  await handlePhone(signed('lookup_ticket', { args: { ticket_number: 99 }, call: { from_number: '+447700900123' } }), res, { db });
  assert.deepEqual(res.body, { result: NOT_FOUND_RESULT });
  res = fakeRes();
  await handlePhone(signed('lookup_ticket', { args: {}, call: {} }), res, { db });
  assert.deepEqual(res.body, { result: 'What is the ticket number?' });
});

test('handler webhook call_analyzed: attaches an ai note to the matching ticket, or creates a general ticket', async () => {
  const db = fakeDb();
  db.seedStaff([{ name: 'Jo', email: 'jo@truthcaregroup.co.uk' }]);
  const send = fakeSend();
  await handlePhone(signed('create_ticket', { args: { category: 'general', caller_name: 'Jane', summary: 'Bed enquiry' }, call: { call_id: 'c3' } }), fakeRes(), { db, send });
  let res = fakeRes();
  await handlePhone(signed('webhook', { event: 'call_analyzed', call: { call_id: 'c3', transcript: 'Agent: hi\nUser: hello', call_analysis: { call_summary: 'Bed enquiry from Jane.' } } }), res, { db, send });
  assert.deepEqual(res.body, { ok: true, ticket_number: 1, attached: true });
  const note = db.tables.ticket_notes.at(-1);
  assert.equal(note.author_type, 'ai');
  assert.equal(note.is_internal, true);
  assert.ok(note.body.includes('Transcript:\nAgent: hi'));
  res = fakeRes();
  await handlePhone(signed('webhook', { event: 'call_analyzed', call: { call_id: 'c4', from_number: '07700 900999', call_analysis: { call_summary: 'Caller hung up.' } } }), res, { db, send });
  assert.deepEqual(res.body, { ok: true, ticket_number: 2, created: true, emergency: false });
  const missed = db.tables.tickets[1];
  assert.equal(missed.category, 'general');
  assert.equal(missed.priority, 'normal');
  assert.equal(missed.caller_phone, '+447700900999');
  assert.equal(missed.retell_call_id, 'c4');
  assert.equal(missed.summary, 'Caller hung up.');
  assert.equal(send.sent.at(-1).to, 'jo@truthcaregroup.co.uk');
  // spec §4.1: the scripted 999 guard ends the call without create_ticket → urgent resident_concern from the webhook
  res = fakeRes();
  await handlePhone(signed('webhook', { event: 'call_analyzed', call: { call_id: 'c5', from_number: '+447700900111', transcript: 'User: my dad has collapsed and is not breathing\nAgent: This sounds like a medical emergency. Please hang up now and dial 999 immediately.', call_analysis: { call_summary: 'Caller reported a collapse; agent told them to dial 999 and ended the call.' } } }), res, { db, send });
  assert.deepEqual(res.body, { ok: true, ticket_number: 3, created: true, emergency: true });
  const emergency = db.tables.tickets[2];
  assert.equal(emergency.category, 'resident_concern');
  assert.equal(emergency.priority, 'urgent');
  assert.equal(emergency.subject, 'Emergency call — caller told to dial 999');
  assert.equal(emergency.caller_phone, '+447700900111');
  assert.ok(send.sent.at(-1).subject.startsWith('[TC-3] [URGENT] Resident concern'));
});

test('handler never 500s: a thrown error answers the fallback line and lands in failed_calls', async () => {
  const db = fakeDb();
  const broken = Object.assign((strings, ...values) => db(strings, ...values), { query: async () => { throw new Error('connection refused'); }, tables: db.tables });
  let res = fakeRes();
  const args = { category: 'referral', caller_name: 'Jane', summary: 'Bed enquiry' };
  await handlePhone(signed('create_ticket', { args, call: { call_id: 'c5' } }), res, { db: broken, send: fakeSend() });
  assert.deepEqual([res.code, res.body], [200, { result: FALLBACK_RESULT }]);
  const f = db.tables.failed_calls[0];
  assert.equal(f.retell_call_id, 'c5');
  assert.equal(f.action, 'create_ticket');
  assert.deepEqual(f.args, args);
  assert.match(f.error, /connection refused/);
  res = fakeRes();
  await handlePhone(signed('webhook', { event: 'call_analyzed', call: { call_id: 'c6' } }), res, { db: broken, send: fakeSend() });
  assert.deepEqual([res.code, res.body], [200, { ok: false, error: 'recorded' }]);
  assert.equal(db.tables.failed_calls[1].action, 'webhook');
});

test('handler never 500s on a request-stream error while reading the body', async () => {
  // No `body` string, so readRawBody falls into the streaming branch and
  // relies on the 'error' listener — a client abort or bad transfer-encoding
  // rejects that promise before the body (and so the signature) can ever be
  // checked.
  const db = fakeDb();
  const brokenReq = {
    method: 'POST',
    url: '/api/phone?action=create_ticket',
    headers: {},
    on(event, cb) { if (event === 'error') queueMicrotask(() => cb(new Error('ECONNRESET'))); },
  };
  const res = fakeRes();
  await handlePhone(brokenReq, res, { db, send: fakeSend() });
  assert.deepEqual([res.code, res.body], [200, { result: FALLBACK_RESULT }]);
  const f = db.tables.failed_calls[0];
  assert.equal(f.action, 'create_ticket');
  assert.equal(f.retell_call_id, null);
  assert.match(f.error, /ECONNRESET/);

  const db2 = fakeDb();
  const brokenWebhookReq = { ...brokenReq, url: '/api/phone?action=webhook' };
  const res2 = fakeRes();
  await handlePhone(brokenWebhookReq, res2, { db: db2, send: fakeSend() });
  assert.deepEqual([res2.code, res2.body], [200, { ok: false, error: 'recorded' }]);
});
