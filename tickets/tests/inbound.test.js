import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { processInbox, processMessage, acquireLease, releaseLease, pollSince, MAX_PER_RUN, LOCK_KEY } from '../lib/inbound.js';
import { handleCron } from '../api/cron/index.js';
import { fakeDb, fakeSend } from './helpers/fake-db.js';

const TICKETS = 'tickets@truthcaregroup.co.uk';
const r = (address, name = '') => ({ emailAddress: { address, name } });
let seq = 0;
const msg = (over = {}) => ({
  id: `g${++seq}`, internetMessageId: `<m${seq}@example.com>`, subject: 'Hello', from: r('fam@example.com', 'Family Member'),
  toRecipients: [r(TICKETS)], ccRecipients: [], body: { contentType: 'text', content: 'Hi there' },
  receivedDateTime: new Date(1_800_000_000_000 + seq * 1000).toISOString(), hasAttachments: false, conversationId: `conv-${seq}`, internetMessageHeaders: [], ...over,
});
const staffClassifier = async () => ({ category: 'referral', priority: 'high', summary: 'A placement enquiry.', via: 'ai' });

function setup() {
  const db = fakeDb();
  const [jo] = db.seedStaff([{ name: 'Joanne Bray', email: 'joanne@truthcaregroup.co.uk', aliases: ['jo'], role: 'admin' }, { name: 'Paul M', email: 'paul@truthcaregroup.co.uk' }]);
  const send = fakeSend();
  const inbox = [];
  const list = async ({ since }) => { list.since = since; return inbox.filter((m) => Date.parse(m.receivedDateTime) >= since.getTime()); };
  const run = (now = Date.now()) => processInbox({ db, send, list, classifier: staffClassifier, now });
  return { db, send, inbox, list, run, jo };
}

beforeEach(() => { delete process.env.TICKETS_ADDRESS; delete process.env.MAILBOX_ADDRESS; });

test('lease: a second overlapping run is skipped; an expired lease can be taken; release frees it', async () => {
  const db = fakeDb();
  const t0 = Date.parse('2026-09-05T10:00:00Z');
  const lease = await acquireLease({ db, now: t0 });
  assert.ok(lease);
  assert.equal(await acquireLease({ db, now: t0 + 60_000 }), null, 'still held');
  assert.ok(await acquireLease({ db, now: t0 + 5 * 60_000 }), 'expired lease is taken over');
  const held = setup();
  await acquireLease({ db: held.db, now: t0 });
  assert.deepEqual(await held.run(t0 + 1000), { skipped: true, reason: 'another run holds the lease' });
  await releaseLease(await acquireLease({ db, now: t0 + 20 * 60_000 }), { db });
  assert.equal(db.tables.settings.some((s) => s.key === LOCK_KEY), false);
});

test('cursor: first run looks back an hour, later runs look back 10 min from last_poll', async () => {
  const db = fakeDb();
  const now = Date.parse('2026-09-05T10:00:00Z');
  assert.equal((await pollSince({ db, now })).toISOString(), '2026-09-05T09:00:00.000Z');
  db.tables.settings.push({ key: 'last_poll', value: '2026-09-05T09:55:00.000Z' });
  assert.equal((await pollSince({ db, now })).toISOString(), '2026-09-05T09:45:00.000Z');
});

test('new mail from a non-staff sender becomes a ticket: classified, source email, caller from From:, conversation id kept, staff emailed', async () => {
  const { db, send, inbox, run } = setup();
  inbox.push(msg({ subject: 'Fwd: Placement for my brother', body: { contentType: 'html', content: '<p>Hi,</p><p>Looking for a bed.</p>' }, hasAttachments: true }));
  const stats = await run();
  assert.equal(stats.processed, 1);
  assert.deepEqual(stats.outcomes, { new_ticket: 1 });
  const t = db.tables.tickets[0];
  assert.equal(t.source, 'email');
  assert.equal(t.category, 'referral');
  assert.equal(t.priority, 'high');
  assert.equal(t.subject, 'Placement for my brother');
  assert.equal(t.caller_email, 'fam@example.com');
  assert.equal(t.caller_name, 'Family Member');
  assert.equal(t.graph_conversation_id, inbox[0].conversationId);
  assert.ok(t.summary.startsWith('Hi,\nLooking for a bed.'));
  assert.ok(t.summary.includes('had attachments'));
  assert.ok(db.tables.ticket_notes[0].body.startsWith('Classified by ai as referral / high — A placement enquiry.'));
  assert.deepEqual(send.sent.map((m) => m.to).sort(), ['joanne@truthcaregroup.co.uk', 'paul@truthcaregroup.co.uk']);
  assert.equal(db.tables.processed_messages[0].internet_message_id, inbox[0].internetMessageId);
  assert.equal(db.tables.processed_messages[0].ticket_id, t.id);
  assert.equal(db.tables.settings.find((s) => s.key === 'last_poll').value, stats.cursor);
});

test('staff reply via the reply-to token applies commands and a note; a later caller reply threads by conversation and reopens', async () => {
  const { db, send, inbox, run, jo } = setup();
  inbox.push(msg({ subject: 'Placement' }));
  await run();
  const t = db.tables.tickets[0];
  inbox.push(msg({
    subject: `Re: [TC-${t.number}] [HIGH] Referral — Family Member re: Placement`, from: r('paul@truthcaregroup.co.uk', 'Paul M'),
    toRecipients: [r(`tickets+tc${t.number}-${t.email_token}@truthcaregroup.co.uk`)], conversationId: 'outlook-conv-1',
    body: { contentType: 'html', content: '<div>assign jo</div><div>Family want a call back.</div><div>close</div><br><hr><b>From:</b> Truth Care Tickets<br>close<br>urgent' },
  }));
  send.sent.length = 0;
  const stats = await run();
  assert.deepEqual(stats.outcomes, { staff: 1 });
  assert.equal(t.assigned_to, jo.id);
  assert.equal(t.status, 'closed');
  assert.equal(t.priority, 'high', 'quoted "urgent" below From: was ignored');
  assert.equal(t.graph_conversation_id, 'outlook-conv-1', 'conversation id adopted from the token match');
  const noteBodies = db.tables.ticket_notes.map((n) => n.body);
  assert.ok(noteBodies.includes('Family want a call back.'));
  assert.ok(send.to('fam@example.com').some((m) => m.text.includes('Family want a call back.')), 'public note reached the caller');
  assert.ok(send.to('fam@example.com').some((m) => m.subject.includes('has been closed')), 'closure reached the caller');
  assert.ok(send.to('joanne@truthcaregroup.co.uk').some((m) => m.text.startsWith('Assigned to you')));
  inbox.push(msg({ subject: `Re: [TC-${t.number}] Truth Care Group — your message has been closed`, from: r('fam@example.com', 'Family Member'), conversationId: 'outlook-conv-1', body: { contentType: 'text', content: 'Thanks, one more thing…' } }));
  send.sent.length = 0;
  const again = await run();
  assert.deepEqual(again.outcomes, { caller_reply: 1 });
  assert.equal(t.status, 'open', 'caller reply reopens');
  assert.equal(db.tables.ticket_notes.at(-1).author_type, 'caller');
  assert.deepEqual(send.sent.map((m) => m.to).sort(), ['joanne@truthcaregroup.co.uk', 'paul@truthcaregroup.co.uk'], 'assignee + Paul (he replied on the thread) told; caller not echoed');
  assert.equal(db.tables.processed_messages.at(-1).outcome, 'caller_reply:conversation');
});

test('staff typo bounces, records a system note and applies nothing; tier-3 subject match works for the caller', async () => {
  const { db, send, inbox, run } = setup();
  inbox.push(msg({ subject: 'Placement' }));
  await run();
  const t = db.tables.tickets[0];
  inbox.push(msg({ subject: `Re: [TC-${t.number}] Referral`, from: r('paul@truthcaregroup.co.uk'), conversationId: t.graph_conversation_id, body: { contentType: 'text', content: 'asign jo\nclose' } }));
  send.sent.length = 0;
  const stats = await run();
  assert.deepEqual(stats.outcomes, { staff: 1 });
  assert.equal(db.tables.processed_messages.at(-1).outcome, 'staff:bounced');
  assert.equal(t.status, 'open');
  assert.equal(t.assigned_to, null);
  assert.ok(db.tables.ticket_notes.at(-1).body.includes("did you mean assign?"));
  assert.deepEqual(send.sent.map((m) => [m.to, m.subject.endsWith('command not understood')]), [['paul@truthcaregroup.co.uk', true]]);
  inbox.push(msg({ subject: `RE: [TC-${t.number}] anything`, from: r('fam@example.com'), conversationId: 'brand-new-conv', body: { contentType: 'text', content: 'Following up' } }));
  const s2 = await run();
  assert.deepEqual(s2.outcomes, { caller_reply: 1 });
  assert.equal(db.tables.processed_messages.at(-1).outcome, 'caller_reply:subject');
  assert.equal(t.graph_conversation_id, 'brand-new-conv');
  inbox.push(msg({ subject: `RE: [TC-${t.number}] anything`, from: r('stranger@example.com'), conversationId: 'other', body: { contentType: 'text', content: 'I am not the caller' } }));
  const s3 = await run();
  assert.deepEqual(s3.outcomes, { new_ticket: 1 }, 'subject alone never matches — a stranger gets a fresh ticket');
});

test('guards: own mail, auto-replies and mail not addressed to tickets@ are recorded as skips; dedupe by internetMessageId', async () => {
  const { db, inbox, run } = setup();
  inbox.push(msg({ from: r(TICKETS) }));
  inbox.push(msg({ from: r('infotech@truthcaregroup.co.uk') }));
  inbox.push(msg({ subject: 'Automatic reply: hi' }));
  inbox.push(msg({ toRecipients: [r('infotech@truthcaregroup.co.uk')] }));
  const stats = await run();
  assert.deepEqual(stats.outcomes, { skip: 4 });
  assert.deepEqual(db.tables.processed_messages.map((p) => p.outcome), ['skip:own_mail', 'skip:own_mail', 'skip:auto_reply', 'skip:not_for_tickets']);
  assert.equal(db.tables.tickets.length, 0);
  const again = await run();
  assert.equal(again.processed, 0, 'already processed');
  assert.equal(again.fetched, 4);
});

test('cap: 25 fresh messages → 20 processed, cursor parked on the 20th; next run takes the remaining 5', async () => {
  const { db, inbox, run, list } = setup();
  for (let i = 0; i < 25; i++) inbox.push(msg({ subject: `Enquiry ${i}` }));
  const first = await run();
  assert.equal(first.processed, MAX_PER_RUN);
  assert.equal(first.cursor, inbox[19].receivedDateTime);
  const second = await run();
  assert.equal(second.processed, 5);
  assert.ok(list.since.getTime() <= Date.parse(inbox[19].receivedDateTime), 'second run started from the parked cursor minus lookback');
  assert.equal(db.tables.tickets.length, 25);
  assert.equal(db.tables.processed_messages.length, 25);
});

test('a message whose processing throws still becomes a bare ticket and is marked processed', async () => {
  const { db, send, inbox } = setup();
  inbox.push(msg({ subject: 'Broken one', body: { contentType: 'text', content: 'help' } }));
  const stats = await processInbox({ db, send, list: async () => inbox, classifier: async () => { throw new Error('classifier exploded'); } });
  assert.equal(stats.errors.length, 1);
  assert.deepEqual(stats.outcomes, { error: 1 });
  const t = db.tables.tickets[0];
  assert.equal(t.category, 'general');
  assert.equal(t.subject, 'Broken one');
  assert.ok(db.tables.ticket_notes[0].body.includes('classifier exploded'));
  assert.ok(db.tables.processed_messages[0].outcome.startsWith('error:'));
});

test('processMessage on a direct call returns the outcome shape', async () => {
  const { db, send } = setup();
  const out = await processMessage(msg({ subject: 'Direct' }), { db, send, classifier: staffClassifier });
  assert.deepEqual(Object.keys(out).sort(), ['outcome', 'ticketId', 'ticketNumber']);
  assert.equal(out.outcome, 'new_ticket');
  assert.equal(out.ticketNumber, 1);
});

test('cron handler: secret checks, unknown job, and the email job wiring', async () => {
  const fakeRes = () => { const o = { code: 0, body: null }; o.status = (c) => { o.code = c; return o; }; o.json = (b) => { o.body = b; return o; }; return o; };
  delete process.env.CRON_SECRET;
  let res = fakeRes();
  await handleCron({ url: '/api/cron?job=email', headers: {} }, res);
  assert.equal(res.code, 503);
  process.env.CRON_SECRET = 'cron-secret';
  res = fakeRes();
  await handleCron({ url: '/api/cron?job=email', headers: { authorization: 'Bearer wrong' } }, res);
  assert.equal(res.code, 401);
  res = fakeRes();
  await handleCron({ url: '/api/cron?job=nope', headers: { authorization: 'Bearer cron-secret' } }, res);
  assert.equal(res.code, 404);
  const { db, send, inbox } = setup();
  inbox.push(msg({ subject: 'Via cron' }));
  res = fakeRes();
  await handleCron({ url: '/api/cron?job=email', headers: { authorization: 'Bearer cron-secret' } }, res, { db, send, list: async () => inbox, classifier: staffClassifier });
  assert.equal(res.code, 200);
  assert.equal(res.body.job, 'email');
  assert.equal(res.body.processed, 1);
  res = fakeRes();
  await handleCron({ url: '/api/cron?job=email', headers: { authorization: 'Bearer cron-secret' } }, res, { db, send, list: async () => { throw new Error('graph down'); } });
  assert.deepEqual([res.code, res.body], [500, { job: 'email', error: 'graph down' }]);
  assert.equal(db.tables.settings.some((s) => s.key === LOCK_KEY), false, 'lease released even when the job throws');
  delete process.env.CRON_SECRET;
});
