import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readRawBody, readJsonBody, getAction, getQuery, parseCookies } from '../lib/http.js';
import { requireCronAuth } from '../lib/cron-auth.js';

const streamReq = (text, extra = {}) => Object.assign(Readable.from([Buffer.from(text)]), { headers: {}, url: '/', ...extra });
const fakeRes = () => {
  const r = { code: 0, body: null };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
};

test('readRawBody returns the exact bytes, honours a pre-parsed string body, and yields "" on overflow', async () => {
  assert.equal(await readRawBody(streamReq('{"a":1}')), '{"a":1}');
  assert.equal(await readRawBody({ body: 'raw text', headers: {} }), 'raw text');
  assert.equal(await readRawBody({ body: Buffer.from('buf'), headers: {} }), 'buf');
  const big = streamReq('x'.repeat(2048));
  big.destroy = () => {};
  assert.equal(await readRawBody(big, 1024), '');
});

test('readJsonBody parses JSON, reuses an object body, and returns null for junk', async () => {
  assert.deepEqual(await readJsonBody(streamReq('{"a":1}')), { a: 1 });
  assert.deepEqual(await readJsonBody({ body: { b: 2 }, headers: {} }), { b: 2 });
  assert.equal(await readJsonBody(streamReq('not json')), null);
  assert.equal(await readJsonBody(streamReq('')), null);
  assert.equal(await readJsonBody(streamReq('"a string"')), null);
});

test('getAction / getQuery / parseCookies', () => {
  assert.equal(getAction({ url: '/api/phone?action=create_ticket' }), 'create_ticket');
  assert.equal(getAction({ url: '/api/cron?job=email' }, 'job'), 'email');
  assert.equal(getAction({ url: '/api/cron' }), '');
  assert.equal(getAction({}), '');
  assert.equal(getQuery({ url: '/x?n=42' }).get('n'), '42');
  assert.deepEqual(parseCookies({ headers: { cookie: 'tc_session=abc.def; other=1%202' } }), { tc_session: 'abc.def', other: '1 2' });
  assert.deepEqual(parseCookies({ headers: {} }), {});
  assert.deepEqual(parseCookies({}), {});
});

test('requireCronAuth: 503 when unset, 401 on mismatch, true on Bearer match', () => {
  delete process.env.CRON_SECRET;
  let res = fakeRes();
  assert.equal(requireCronAuth({ headers: {} }, res), false);
  assert.equal(res.code, 503);
  process.env.CRON_SECRET = 's3cret';
  res = fakeRes();
  assert.equal(requireCronAuth({ headers: { authorization: 'Bearer nope' } }, res), false);
  assert.equal(res.code, 401);
  res = fakeRes();
  assert.equal(requireCronAuth({ headers: { authorization: 'Bearer s3cret' } }, res), true);
  assert.equal(res.code, 0);
  delete process.env.CRON_SECRET;
});
