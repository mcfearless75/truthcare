import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handleTickets } from '../api/tickets/index.js';
import { handleStaff } from '../api/staff/index.js';
import { signSession, COOKIE_NAME } from '../lib/auth.js';
import { fakeDb, fakeSend } from './helpers/fake-db.js';

const NOW = Date.parse('2026-09-05T10:00:00Z');
const fakeRes = () => { const r = { code: 0, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const req = (method, url, { cookie, body } = {}) => ({ method, url, headers: cookie ? { cookie } : {}, ...(body !== undefined ? { body } : {}) });

async function setup() {
  const db = fakeDb();
  const [jo, paul] = db.seedStaff([{ name: 'Joanne Bray', email: 'jo@truthcaregroup.co.uk', aliases: ['jo'], role: 'admin' }, { name: 'Paul M', email: 'paul@truthcaregroup.co.uk' }]);
  const send = fakeSend();
  const cookieFor = async (s) => `${COOKIE_NAME}=${await signSession({ id: s.id, name: s.name, email: s.email, role: s.role }, { now: NOW })}`;
  return { db, send, jo, paul, joCookie: await cookieFor(jo), paulCookie: await cookieFor(paul) };
}

beforeEach(() => { process.env.JWT_SECRET = 'a-test-secret-that-is-long-enough-32chars!'; });

test('tickets API: 401 without a session; create → list (urgent first) → get → command, all via the shared write path', async () => {
  const { db, send, jo, joCookie, paulCookie } = await setup();
  let res = fakeRes();
  await handleTickets(req('GET', '/api/tickets?action=list'), res, { db, send, now: NOW });
  assert.equal(res.code, 401);

  res = fakeRes();
  await handleTickets(req('POST', '/api/tickets?action=create', { cookie: paulCookie, body: { category: 'general', summary: 'Boiler engineer coming Tuesday', callerName: 'Gas Co', callerPhone: '01934 123456' } }), res, { db, send, now: NOW });
  assert.equal(res.code, 201);
  assert.equal(res.body.ticket.source, 'board');
  assert.equal(db.tables.ticket_events[0].actor, 'Paul M');
  res = fakeRes();
  await handleTickets(req('POST', '/api/tickets?action=create', { cookie: paulCookie, body: { category: 'resident_concern', summary: 'Family worried', callerName: 'Jane', callerEmail: 'jane@example.com', subjectPerson: 'Michael' } }), res, { db, send, now: NOW });
  assert.equal(res.body.ticket.priority, 'urgent');
  res = fakeRes();
  await handleTickets(req('POST', '/api/tickets?action=create', { cookie: paulCookie, body: { category: 'general' } }), res, { db, send, now: NOW });
  assert.deepEqual([res.code, res.body.error], [400, 'summary is required']);

  res = fakeRes();
  await handleTickets(req('GET', '/api/tickets?action=list&status=active'), Object.assign(res, {}), { db, send, now: NOW });
  assert.equal(res.code, 401);
  res = fakeRes();
  await handleTickets(req('GET', '/api/tickets?action=list&status=active', { cookie: joCookie }), res, { db, send, now: NOW });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.tickets.map((t) => t.number), [2, 1], 'urgent first');
  assert.deepEqual(res.body.staff.map((s) => s.name), ['Joanne Bray', 'Paul M']);
  assert.equal(res.body.user.email, 'jo@truthcaregroup.co.uk');

  res = fakeRes();
  await handleTickets(req('GET', '/api/tickets?action=get&number=2', { cookie: joCookie }), res, { db, send, now: NOW });
  assert.equal(res.code, 200);
  assert.equal(res.body.ticket.number, 2);
  assert.deepEqual(Object.keys(res.body).sort(), ['assignee', 'events', 'failedNotifications', 'notes', 'staff', 'ticket', 'user']);
  res = fakeRes();
  await handleTickets(req('GET', '/api/tickets?action=get&number=99', { cookie: joCookie }), res, { db, send, now: NOW });
  assert.equal(res.code, 404);

  send.sent.length = 0;
  res = fakeRes();
  await handleTickets(req('POST', '/api/tickets?action=command&number=2', { cookie: paulCookie, body: { type: 'assign', value: 'Joanne Bray' } }), res, { db, send, now: NOW });
  assert.equal(res.code, 200);
  assert.equal(res.body.ticket.assignedTo, jo.id);
  assert.equal(res.body.events[0].via, 'board');
  assert.deepEqual(send.sent.map((m) => m.to), ['jo@truthcaregroup.co.uk']);
  res = fakeRes();
  await handleTickets(req('POST', '/api/tickets?action=command&number=2', { cookie: paulCookie, body: { type: 'note', value: 'We will ring you today.' } }), res, { db, send, now: NOW });
  assert.equal(res.body.notes[0].isInternal, false);
  assert.ok(send.to('jane@example.com').length, 'public note from the board reaches the caller exactly like an email note');
  res = fakeRes();
  await handleTickets(req('POST', '/api/tickets?action=command&number=2', { cookie: paulCookie, body: { type: 'assign', value: 'nobody' } }), res, { db, send, now: NOW });
  assert.deepEqual([res.code, res.body.code], [400, 'no_staff']);
  res = fakeRes();
  await handleTickets(req('POST', '/api/tickets?action=command&number=2', { cookie: paulCookie, body: { type: 'explode' } }), res, { db, send, now: NOW });
  assert.equal(res.code, 400);
  res = fakeRes();
  await handleTickets(req('POST', '/api/tickets?action=command&number=42', { cookie: paulCookie, body: { type: 'take' } }), res, { db, send, now: NOW });
  assert.equal(res.code, 404);
  res = fakeRes();
  await handleTickets(req('GET', '/api/tickets?action=nope', { cookie: paulCookie }), res, { db, send, now: NOW });
  assert.equal(res.code, 404);
});

test('staff API: agents see active staff, admins see everyone and can save; self-deactivation blocked; validation', async () => {
  const { db, joCookie, paulCookie, paul } = await setup();
  paul.active = true;
  db.seedStaff([{ name: 'Old Hand', email: 'old@truthcaregroup.co.uk', active: false }]);
  let res = fakeRes();
  await handleStaff(req('GET', '/api/staff?action=list', { cookie: paulCookie }), res, { db, now: NOW });
  assert.deepEqual(res.body.staff.map((s) => s.email), ['jo@truthcaregroup.co.uk', 'paul@truthcaregroup.co.uk']);
  res = fakeRes();
  await handleStaff(req('GET', '/api/staff?action=list', { cookie: joCookie }), res, { db, now: NOW });
  assert.equal(res.body.staff.length, 3);
  res = fakeRes();
  await handleStaff(req('POST', '/api/staff?action=save', { cookie: paulCookie, body: { name: 'New', email: 'new@truthcaregroup.co.uk' } }), res, { db, now: NOW });
  assert.equal(res.code, 403);
  res = fakeRes();
  await handleStaff(req('POST', '/api/staff?action=save', { cookie: joCookie, body: { name: 'New Person', email: 'New@TruthCareGroup.co.uk', role: 'agent', aliases: 'np', receivesNewTickets: false } }), res, { db, now: NOW });
  assert.equal(res.code, 200);
  assert.deepEqual([res.body.staff.email, res.body.staff.aliases, res.body.staff.receivesNewTickets, res.body.staff.active], ['new@truthcaregroup.co.uk', ['np'], false, true]);
  res = fakeRes();
  await handleStaff(req('POST', '/api/staff?action=save', { cookie: joCookie, body: { name: 'Paul M', email: 'paul@truthcaregroup.co.uk', active: false } }), res, { db, now: NOW });
  assert.equal(res.code, 200);
  assert.equal(paul.active, false);
  res = fakeRes();
  await handleStaff(req('GET', '/api/staff?action=list', { cookie: paulCookie }), res, { db, now: NOW });
  assert.equal(res.code, 401, 'deactivated Paul is locked out at once');
  res = fakeRes();
  await handleStaff(req('POST', '/api/staff?action=save', { cookie: joCookie, body: { name: 'Joanne Bray', email: 'jo@truthcaregroup.co.uk', active: false } }), res, { db, now: NOW });
  assert.deepEqual([res.code, res.body.error], [400, 'You cannot deactivate yourself']);
  res = fakeRes();
  await handleStaff(req('POST', '/api/staff?action=save', { cookie: joCookie, body: { name: 'X', email: 'nope' } }), res, { db, now: NOW });
  assert.equal(res.code, 400);
  res = fakeRes();
  await handleStaff(req('POST', '/api/staff?action=save', { cookie: joCookie, body: 'garbage' }), res, { db, now: NOW });
  assert.equal(res.code, 400);
});

test('public pages reference app.js/styles.css, carry data-page, and the CSP allows no inline scripts', () => {
  for (const [file, pageName] of [['index.html', 'list'], ['ticket.html', 'ticket'], ['staff.html', 'staff']]) {
    const html = readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8');
    assert.ok(html.includes(`data-page="${pageName}"`), `${file} data-page`);
    assert.ok(html.includes('<script src="/app.js"></script>'), `${file} app.js`);
    assert.ok(html.includes('<link rel="stylesheet" href="/styles.css">'), `${file} styles.css`);
    assert.ok(!/<script>|\son(click|load|change|submit|error|input)="/i.test(html), `${file} has no inline script or handlers (CSP script-src 'self')`);
    assert.ok(html.includes('noindex'), `${file} noindex`);
  }
  const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
  for (const colour of ['#0f2c3f', '#f5921e', '#1a1a1a', '#5a6570']) assert.ok(css.includes(colour), `palette ${colour}`);
  const js = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.ok(js.includes("'/api/auth?action=login'") && js.includes('action=command') && js.includes('action=save'));
});
