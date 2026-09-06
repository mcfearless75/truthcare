/**
 * End-to-end email flow (spec §9): a fake Microsoft Graph served by node:http
 * (token, messages, sendMail) drives the real cron handler through
 * lib/graph.js over HTTP:
 *
 *   new mail → ticket → staff reply "assign jo" → assignment email
 *            → staff reply "close" → closure email to the caller
 *
 * Runs twice: always against the in-memory fake of the neon tag, and —
 * when DATABASE_URL points at a SCRATCH Neon database (the test truncates
 * every table) — against real Postgres via scripts/setup-db.js.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { handleCron } from '../../api/cron/index.js';
import { resetTokenCache } from '../../lib/graph.js';
import { upsertStaff } from '../../lib/staff.js';
import { fakeDb } from '../helpers/fake-db.js';

const TICKETS = 'tickets@truthcaregroup.co.uk';
const MAILBOX = 'infotech@truthcaregroup.co.uk';
const CRON = 'integration-cron-secret';

// ── fake Graph ─────────────────────────────────────────────────────────────
function startFakeGraph() {
  const state = { inbox: [], sent: [], tokens: 0, seq: 0 };
  const readBody = (req) => new Promise((resolve) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => resolve(s)); });
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (req.method === 'POST' && /^\/login\/[^/]+\/oauth2\/v2\.0\/token$/.test(url.pathname)) {
      const form = new URLSearchParams(await readBody(req));
      if (form.get('grant_type') !== 'client_credentials' || form.get('scope') !== 'https://graph.microsoft.com/.default') return json(400, { error: 'invalid_request' });
      state.tokens++;
      return json(200, { token_type: 'Bearer', expires_in: 3600, access_token: `fake-token-${state.tokens}` });
    }
    if (!/^Bearer fake-token-\d+$/.test(req.headers.authorization || '')) return json(401, { error: { code: 'InvalidAuthenticationToken' } });
    const mailbox = `/v1.0/users/${encodeURIComponent(MAILBOX)}`;
    if (req.method === 'GET' && url.pathname === `${mailbox}/messages`) {
      const m = /^receivedDateTime ge (.+)$/.exec(url.searchParams.get('$filter') || '');
      const since = m ? Date.parse(m[1]) : 0;
      const top = Number(url.searchParams.get('$top') || 50);
      const value = state.inbox.filter((x) => Date.parse(x.receivedDateTime) >= since).sort((a, b) => a.receivedDateTime.localeCompare(b.receivedDateTime)).slice(0, top);
      return json(200, { value });
    }
    if (req.method === 'POST' && url.pathname === `${mailbox}/sendMail`) {
      const body = JSON.parse(await readBody(req));
      state.sent.push(body);
      res.writeHead(202); return res.end();
    }
    if (req.method === 'PATCH') return json(500, { error: 'isRead must never be patched' });
    return json(404, { error: { code: 'NotFound', message: `${req.method} ${url.pathname}` } });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, state, port: server.address().port })));
}

const r = (address, name = '') => ({ emailAddress: { address, name } });
function deliver(state, { from, name = '', to = TICKETS, subject, text, conversationId }) {
  state.seq++;
  const msg = {
    id: `AAMk${state.seq}`, internetMessageId: `<int-${state.seq}@example.com>`, subject, from: r(from, name), toRecipients: [r(to)], ccRecipients: [],
    body: { contentType: 'text', content: text }, receivedDateTime: new Date(Date.now() - 5000 + state.seq).toISOString(),
    hasAttachments: false, conversationId: conversationId || `conv-${state.seq}`, internetMessageHeaders: [],
  };
  state.inbox.push(msg);
  return msg;
}

const fakeRes = () => { const o = { code: 0, body: null }; o.status = (c) => { o.code = c; return o; }; o.json = (b) => { o.body = b; return o; }; return o; };
async function cron(job, deps) {
  const res = fakeRes();
  await handleCron({ url: `/api/cron?job=${job}`, headers: { authorization: `Bearer ${CRON}` } }, res, deps);
  assert.equal(res.code, 200, JSON.stringify(res.body));
  return res.body;
}

const addressesOf = (list = []) => list.map((x) => x.emailAddress.address);
const sentTo = (state, address) => state.sent.filter((m) => addressesOf(m.message.toRecipients).includes(address));

// ── the flow, independent of which db it runs on ───────────────────────────
async function runFlow({ db, state, findTicket }) {
  const deps = db ? { db } : {};
  await upsertStaff({ name: 'Joanne Bray', email: 'joanne@truthcaregroup.co.uk', role: 'admin', aliases: ['jo'] }, deps);
  await upsertStaff({ name: 'Paul M', email: 'paul@truthcaregroup.co.uk', role: 'agent' }, deps);

  // 1. New mail from a family member → ticket + "created" emails to both staff
  deliver(state, { from: 'fam@example.com', name: 'Family Member', subject: 'Placement for my brother', text: 'Hi, we are looking for a bed for my brother after his accident. Please call me.' });
  let out = await cron('email', deps);
  assert.equal(out.processed, 1, JSON.stringify(out));
  assert.deepEqual(out.outcomes, { new_ticket: 1 });
  let ticket = await findTicket();
  assert.ok(ticket, 'ticket row exists');
  assert.equal(ticket.source, 'email');
  assert.equal(ticket.caller_email, 'fam@example.com');
  assert.equal(ticket.status, 'open');
  assert.equal(state.sent.length, 2, 'created → both receives_new_tickets staff');
  const created = state.sent[0].message;
  assert.equal(state.sent[0].saveToSentItems, false);
  assert.equal(created.from.emailAddress.address, TICKETS);
  assert.match(created.subject, new RegExp(`^\\[TC-${ticket.number}\\] `));
  const replyTo = created.replyTo[0].emailAddress.address;
  assert.equal(replyTo, `tickets+tc${ticket.number}-${ticket.email_token}@truthcaregroup.co.uk`);
  assert.equal(state.tokens, 1, 'token fetched once and cached');

  // 2. Paul replies to the reply-to address: assign jo → assignment email to Jo only
  state.sent.length = 0;
  deliver(state, { from: 'paul@truthcaregroup.co.uk', name: 'Paul M', to: replyTo, subject: `Re: ${created.subject}`, text: 'assign jo\n\nFrom: Truth Care Tickets\nclose' });
  out = await cron('email', deps);
  assert.deepEqual(out.outcomes, { staff: 1 }, JSON.stringify(out));
  ticket = await findTicket();
  assert.ok(ticket.assigned_to, 'assigned');
  assert.equal(ticket.status, 'open', 'quoted "close" below From: was ignored');
  assert.equal(state.sent.length, 1);
  assert.deepEqual(addressesOf(state.sent[0].message.toRecipients), ['joanne@truthcaregroup.co.uk']);
  assert.match(state.sent[0].message.body.content, /Assigned to you/);

  // 3. Jo replies: close → closure email to the caller (and to the thread)
  state.sent.length = 0;
  deliver(state, { from: 'joanne@truthcaregroup.co.uk', name: 'Joanne Bray', to: replyTo, subject: `Re: ${created.subject}`, text: 'close' });
  out = await cron('email', deps);
  assert.deepEqual(out.outcomes, { staff: 1 }, JSON.stringify(out));
  ticket = await findTicket();
  assert.equal(ticket.status, 'closed');
  assert.ok(ticket.closed_at);
  const toCaller = sentTo(state, 'fam@example.com');
  assert.equal(toCaller.length, 1, 'exactly one closure email to the caller');
  assert.equal(toCaller[0].message.subject, `[TC-${ticket.number}] Truth Care Group — your message has been closed`);
  assert.ok(!toCaller[0].message.body.content.includes('Reply with a command'), 'caller email carries no command footer');
  assert.equal(toCaller[0].message.replyTo[0].emailAddress.address, replyTo);
  assert.ok(sentTo(state, 'joanne@truthcaregroup.co.uk').length + sentTo(state, 'paul@truthcaregroup.co.uk').length >= 1, 'staff on the thread told');

  // 4. Idempotent: nothing new → nothing processed; the other jobs run clean
  out = await cron('email', deps);
  assert.equal(out.processed, 0);
  const notifications = await cron('notifications', deps);
  assert.deepEqual([notifications.sent, notifications.failed, notifications.exhausted, notifications.failedCallAlerts], [0, 0, 0, 0]);
  const retention = await cron('retention', deps);
  assert.deepEqual([retention.anonymised, retention.aiNotesDeleted, retention.notificationsDeleted], [0, 0, 0]);
  return ticket;
}

// ── harness ────────────────────────────────────────────────────────────────
let graph;
before(async () => {
  graph = await startFakeGraph();
  process.env.GRAPH_BASE_URL = `http://127.0.0.1:${graph.port}/v1.0`;
  process.env.MS_LOGIN_BASE_URL = `http://127.0.0.1:${graph.port}/login`;
  process.env.MICROSOFT_TENANT_ID = 'tenant-int';
  process.env.MICROSOFT_CLIENT_ID = 'client-int';
  process.env.MICROSOFT_CLIENT_SECRET = 'secret-int';
  process.env.MAILBOX_ADDRESS = MAILBOX;
  process.env.TICKETS_ADDRESS = TICKETS;
  process.env.CRON_SECRET = CRON;
  delete process.env.ANTHROPIC_API_KEY; // regex classification — no network
});
after(() => new Promise((resolve) => graph.server.close(resolve)));

test('email flow against the in-memory fake tag (always runs)', async () => {
  resetTokenCache();
  graph.state.inbox.length = 0; graph.state.sent.length = 0; graph.state.tokens = 0;
  const db = fakeDb();
  const ticket = await runFlow({ db, state: graph.state, findTicket: async () => db.tables.tickets[0] || null });
  assert.equal(ticket.number, 1);
  assert.ok(db.tables.processed_messages.length === 3);
});

const DATABASE_URL = (process.env.DATABASE_URL || '').trim();
test('email flow against a real Neon database (needs DATABASE_URL to a scratch database)', { skip: DATABASE_URL ? false : 'Set DATABASE_URL to a SCRATCH Neon database to run the real-Postgres email-flow test (it truncates every table).' }, async () => {
  const { default: sql, resetSql } = await import('../../lib/db.js');
  const { createSchema } = await import('../../scripts/setup-db.js');
  resetSql();
  await createSchema(sql);
  await sql.query('TRUNCATE tickets, ticket_notes, ticket_events, processed_messages, pending_notifications, failed_calls, staff, settings RESTART IDENTITY CASCADE');
  resetTokenCache();
  graph.state.inbox.length = 0; graph.state.sent.length = 0; graph.state.tokens = 0;
  const findTicket = async () => (await sql`SELECT id, number, status, source, caller_email, email_token, assigned_to, closed_at FROM tickets ORDER BY number ASC LIMIT 1`)[0] || null;
  const ticket = await runFlow({ db: null, state: graph.state, findTicket });
  assert.equal(ticket.number, 1);
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM processed_messages`;
  assert.equal(count, 3);
  const [{ notes }] = await sql`SELECT count(*)::int AS notes FROM ticket_notes WHERE ticket_id = ${ticket.id}`;
  assert.ok(notes >= 1, 'classification note stored');
});
