import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getGraphToken, resetTokenCache, listMessages, sendMail, stripHtml, messageBodyText, MESSAGE_SELECT } from '../lib/graph.js';

const calls = [];
const realFetch = globalThis.fetch;

function fakeFetch(handler) {
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', headers: init.headers || {}, body: init.body });
    const r = handler(String(url), init);
    return {
      ok: r.status < 400,
      status: r.status,
      json: async () => r.json ?? {},
      text: async () => JSON.stringify(r.json ?? {}),
    };
  };
}

beforeEach(() => {
  calls.length = 0;
  resetTokenCache();
  process.env.MICROSOFT_TENANT_ID = 'tenant-1';
  process.env.MICROSOFT_CLIENT_ID = 'client-1';
  process.env.MICROSOFT_CLIENT_SECRET = 'secret-1';
  delete process.env.MAILBOX_ADDRESS;
  delete process.env.TICKETS_ADDRESS;
  delete process.env.GRAPH_BASE_URL;
  delete process.env.MS_LOGIN_BASE_URL;
});
afterEach(() => { globalThis.fetch = realFetch; });

const tokenResponse = (token = 'tok-1', expiresIn = 3600) => ({ status: 200, json: { access_token: token, expires_in: expiresIn } });

test('token is fetched with client credentials and cached until 60s before expiry', async () => {
  let n = 0;
  fakeFetch((url) => (url.includes('/oauth2/v2.0/token') ? tokenResponse(`tok-${++n}`, 600) : { status: 404 }));
  const t0 = Date.parse('2026-09-05T10:00:00Z');
  assert.equal(await getGraphToken({ now: t0 }), 'tok-1');
  assert.equal(await getGraphToken({ now: t0 + 500_000 }), 'tok-1', 'still cached at 500s of a 600s token');
  assert.equal(await getGraphToken({ now: t0 + 540_000 }), 'tok-2', 'refreshed at 60s before expiry');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token');
  const form = new URLSearchParams(calls[0].body);
  assert.equal(form.get('grant_type'), 'client_credentials');
  assert.equal(form.get('client_id'), 'client-1');
  assert.equal(form.get('client_secret'), 'secret-1');
  assert.equal(form.get('scope'), 'https://graph.microsoft.com/.default');
});

test('token failure throws a clear error and missing env throws before any fetch', async () => {
  fakeFetch(() => ({ status: 401, json: { error: 'invalid_client', error_description: 'bad secret' } }));
  await assert.rejects(getGraphToken(), /Graph auth failed: bad secret/);
  delete process.env.MICROSOFT_CLIENT_SECRET;
  resetTokenCache();
  calls.length = 0;
  await assert.rejects(getGraphToken(), /MICROSOFT_CLIENT_SECRET is not set/);
  assert.equal(calls.length, 0);
});

test('listMessages reads MAILBOX_ADDRESS with the receivedDateTime cursor, select, top, asc order — and never PATCHes', async () => {
  const msgs = [{ id: 'm1', subject: 'a' }, { id: 'm2', subject: 'b' }];
  fakeFetch((url) => (url.includes('/token') ? tokenResponse() : { status: 200, json: { value: msgs } }));
  const out = await listMessages({ since: '2026-09-05T09:50:00.000Z' });
  assert.deepEqual(out, msgs);
  const req = calls[1];
  const u = new URL(req.url);
  assert.equal(u.origin + u.pathname, 'https://graph.microsoft.com/v1.0/users/infotech%40truthcaregroup.co.uk/messages');
  assert.equal(u.searchParams.get('$filter'), 'receivedDateTime ge 2026-09-05T09:50:00.000Z');
  assert.equal(u.searchParams.get('$select'), MESSAGE_SELECT);
  assert.equal(u.searchParams.get('$top'), '50');
  assert.equal(u.searchParams.get('$orderby'), 'receivedDateTime asc');
  assert.equal(req.headers.Authorization, 'Bearer tok-1');
  assert.equal(req.headers.Prefer, 'outlook.body-content-type="text"');
  assert.ok(calls.every((c) => c.method !== 'PATCH'), 'isRead must never be mutated');
  fakeFetch((url) => (url.includes('/token') ? tokenResponse() : { status: 200, json: {} }));
  assert.deepEqual(await listMessages({ since: Date.now() }), []);
});

test('sendMail posts to the mailbox sendMail endpoint as the tickets@ alias with saveToSentItems:false and replyTo', async () => {
  fakeFetch((url) => (url.includes('/token') ? tokenResponse() : { status: 202 }));
  await sendMail({ to: 'jo@truthcaregroup.co.uk', cc: ['fam@example.com'], subject: '[TC-1] Hello', html: '<p>Hi</p>', text: 'Hi', replyTo: 'tickets+tc1-abcd2345@truthcaregroup.co.uk' });
  const req = calls[1];
  assert.equal(req.url, 'https://graph.microsoft.com/v1.0/users/infotech%40truthcaregroup.co.uk/sendMail');
  assert.equal(req.method, 'POST');
  const body = JSON.parse(req.body);
  assert.equal(body.saveToSentItems, false);
  assert.deepEqual(body.message.from, { emailAddress: { address: 'tickets@truthcaregroup.co.uk', name: 'Truth Care Tickets' } });
  assert.deepEqual(body.message.toRecipients, [{ emailAddress: { address: 'jo@truthcaregroup.co.uk' } }]);
  assert.deepEqual(body.message.ccRecipients, [{ emailAddress: { address: 'fam@example.com' } }]);
  assert.deepEqual(body.message.replyTo, [{ emailAddress: { address: 'tickets+tc1-abcd2345@truthcaregroup.co.uk' } }]);
  assert.equal(body.message.body.contentType, 'HTML');
  assert.equal(body.message.subject, '[TC-1] Hello');
  assert.equal(body.message.bodyPreview, 'Hi');
  await assert.rejects(sendMail({ to: [], subject: 'x', html: 'x' }), /no recipients/);
  fakeFetch((url) => (url.includes('/token') ? tokenResponse() : { status: 403, json: { error: { message: 'SendAsDenied' } } }));
  resetTokenCache();
  await assert.rejects(sendMail({ to: 'a@b.com', subject: 'x', html: 'x' }), /Graph POST .*sendMail failed 403.*SendAsDenied/);
});

test('GRAPH_BASE_URL and MS_LOGIN_BASE_URL redirect calls to a fake server', async () => {
  process.env.GRAPH_BASE_URL = 'http://127.0.0.1:4999/v1.0/';
  process.env.MS_LOGIN_BASE_URL = 'http://127.0.0.1:4999/login';
  fakeFetch((url) => (url.includes('/token') ? tokenResponse() : { status: 200, json: { value: [] } }));
  await listMessages({ since: 0 });
  assert.equal(calls[0].url, 'http://127.0.0.1:4999/login/tenant-1/oauth2/v2.0/token');
  assert.ok(calls[1].url.startsWith('http://127.0.0.1:4999/v1.0/users/'));
});

test('stripHtml keeps line structure and decodes entities; messageBodyText handles text and html bodies', () => {
  const html = '<html><head><style>p{}</style></head><body><div>assign jo</div><p>close</p>Family &amp; friends<br>&nbsp;said &quot;ok&quot;<hr><b>From:</b> x</body></html>';
  assert.equal(stripHtml(html), 'assign jo\nclose\nFamily & friends\n said "ok"\nFrom: x');
  assert.equal(stripHtml(''), '');
  assert.equal(messageBodyText({ body: { contentType: 'text', content: 'mine\r\nclose\r\n' } }), 'mine\nclose');
  assert.equal(messageBodyText({ body: { contentType: 'html', content: '<p>mine</p><p>close</p>' } }), 'mine\nclose');
  assert.equal(messageBodyText({}), '');
});
