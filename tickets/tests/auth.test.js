import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet } from 'jose';
import {
  signSession, verifySession, cookieHeader, clearCookieHeader, requireStaff, requireAdmin, authorizeUrl, verifyIdToken,
  COOKIE_NAME, STATE_COOKIE, SESSION_TTL_S,
} from '../lib/auth.js';
import { handleAuth } from '../api/auth/index.js';
import { fakeDb } from './helpers/fake-db.js';

const NOW = Date.parse('2026-09-05T10:00:00Z');
const fakeRes = () => {
  const r = { code: 0, body: null, headers: {}, ended: false, statusCode: 200 };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.end = (b) => { r.ended = true; r.body = b ?? r.body; r.code = r.code || r.statusCode; };
  return r;
};
const reqWith = (url, cookie = '') => ({ url, headers: cookie ? { cookie } : {} });

beforeEach(() => {
  process.env.JWT_SECRET = 'a-test-secret-that-is-long-enough-32chars!';
  process.env.MICROSOFT_TENANT_ID = 'tenant-1';
  process.env.MICROSOFT_CLIENT_ID = 'client-1';
  process.env.MICROSOFT_CLIENT_SECRET = 'secret-1';
  delete process.env.APP_URL;
  delete process.env.MS_LOGIN_BASE_URL;
});

test('session JWT round-trips, expires after 12h, rejects tampering and a different secret', async () => {
  const token = await signSession({ id: 'u1', name: 'Jo', email: 'Jo@TruthCareGroup.co.uk', role: 'admin' }, { now: NOW });
  const s = await verifySession(token, { now: NOW + 1000 });
  assert.deepEqual(s, { id: 'u1', name: 'Jo', email: 'jo@truthcaregroup.co.uk', role: 'admin', exp: Math.floor(NOW / 1000) + SESSION_TTL_S });
  assert.equal(SESSION_TTL_S, 12 * 60 * 60);
  assert.ok(await verifySession(token, { now: NOW + 11 * 3600 * 1000 }));
  assert.equal(await verifySession(token, { now: NOW + 13 * 3600 * 1000 }), null, 'expired');
  assert.equal(await verifySession(`${token}x`, { now: NOW }), null, 'tampered');
  assert.equal(await verifySession('', { now: NOW }), null);
  process.env.JWT_SECRET = 'another-secret-that-is-also-long-enough!!';
  assert.equal(await verifySession(token, { now: NOW }), null, 'different secret');
  process.env.JWT_SECRET = 'short';
  await assert.rejects(signSession({ id: 'u1', email: 'a@b.c' }), /at least 32/);
});

test('cookie headers are HttpOnly; Secure; SameSite=Lax', () => {
  assert.equal(cookieHeader(COOKIE_NAME, 'abc.def', { maxAge: 60 }), 'tc_session=abc.def; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=60');
  assert.equal(clearCookieHeader(STATE_COOKIE), 'tc_oidc_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  assert.ok(cookieHeader('x', 'a b').includes('x=a%20b;'));
});

test('requireStaff / requireAdmin re-check the allowlist on every request', async () => {
  const db = fakeDb();
  const [jo, paul] = db.seedStaff([{ name: 'Jo', email: 'jo@truthcaregroup.co.uk', role: 'admin' }, { name: 'Paul', email: 'paul@truthcaregroup.co.uk' }]);
  const joCookie = `${COOKIE_NAME}=${await signSession({ id: jo.id, name: jo.name, email: jo.email, role: 'admin' }, { now: NOW })}`;
  const paulCookie = `${COOKIE_NAME}=${await signSession({ id: paul.id, name: paul.name, email: paul.email, role: 'agent' }, { now: NOW })}`;
  let res = fakeRes();
  const user = await requireStaff(reqWith('/api/tickets', joCookie), res, { db, now: NOW });
  assert.deepEqual([user.id, user.email, user.role], [jo.id, 'jo@truthcaregroup.co.uk', 'admin']);
  assert.equal(res.code, 0);
  res = fakeRes();
  assert.equal(await requireStaff(reqWith('/api/tickets'), res, { db, now: NOW }), null);
  assert.deepEqual([res.code, res.body.login], [401, '/api/auth?action=login']);
  res = fakeRes();
  assert.ok(await requireAdmin(reqWith('/api/staff', joCookie), res, { db, now: NOW }));
  res = fakeRes();
  assert.equal(await requireAdmin(reqWith('/api/staff', paulCookie), res, { db, now: NOW }), null);
  assert.equal(res.code, 403);
  paul.active = false;
  res = fakeRes();
  assert.equal(await requireStaff(reqWith('/api/tickets', paulCookie), res, { db, now: NOW }), null, 'deactivated staff lose access immediately');
  assert.equal(res.code, 401);
  paul.active = true;
  paul.role = 'admin';
  res = fakeRes();
  assert.equal((await requireAdmin(reqWith('/api/staff', paulCookie), res, { db, now: NOW })).role, 'admin', 'role comes from the staff row, not the cookie');
});

test('authorizeUrl targets the tenant with code flow, openid profile email and the callback redirect', () => {
  const u = new URL(authorizeUrl({ state: 'st4te' }));
  assert.equal(u.origin + u.pathname, 'https://login.microsoftonline.com/tenant-1/oauth2/v2.0/authorize');
  assert.equal(u.searchParams.get('client_id'), 'client-1');
  assert.equal(u.searchParams.get('response_type'), 'code');
  assert.equal(u.searchParams.get('scope'), 'openid profile email');
  assert.equal(u.searchParams.get('state'), 'st4te');
  assert.equal(u.searchParams.get('redirect_uri'), 'https://tickets.truthcaregroup.co.uk/api/auth?action=callback');
});

test('verifyIdToken checks signature, issuer, audience and tid, and reads preferred_username', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  const keySet = createLocalJWKSet({ keys: [jwk] });
  const mint = (claims, { aud = 'client-1', iss = 'https://login.microsoftonline.com/tenant-1/v2.0' } = {}) => new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' }).setIssuer(iss).setAudience(aud).setIssuedAt(Math.floor(NOW / 1000)).setExpirationTime(Math.floor(NOW / 1000) + 3600).sign(privateKey);
  const good = await verifyIdToken(await mint({ tid: 'tenant-1', preferred_username: 'Jo@TruthCareGroup.co.uk', name: 'Joanne Bray', oid: 'oid-1' }), { keySet, now: NOW });
  assert.deepEqual(good, { email: 'jo@truthcaregroup.co.uk', name: 'Joanne Bray', tid: 'tenant-1', oid: 'oid-1' });
  assert.equal((await verifyIdToken(await mint({ tid: 'tenant-1', email: 'x@y.org' }), { keySet, now: NOW })).email, 'x@y.org');
  await assert.rejects(verifyIdToken(await mint({ tid: 'tenant-2', preferred_username: 'a@b.c' }), { keySet, now: NOW }), /tid does not match/);
  await assert.rejects(verifyIdToken(await mint({ tid: 'tenant-1', preferred_username: 'a@b.c' }, { aud: 'other' }), { keySet, now: NOW }), /"aud" claim/);
  await assert.rejects(verifyIdToken(await mint({ tid: 'tenant-1', preferred_username: 'a@b.c' }, { iss: 'https://evil.example/v2.0' }), { keySet, now: NOW }), /"iss" claim/);
  await assert.rejects(verifyIdToken(await mint({ tid: 'tenant-1' }), { keySet, now: NOW }), /no preferred_username/);
  await assert.rejects(verifyIdToken(await mint({ tid: 'tenant-1', preferred_username: 'a@b.c' }), { keySet, now: NOW + 7200 * 1000 }), /"exp" claim/);
});

test('handleAuth: login sets the state cookie and redirects; callback verifies state, allowlists, sets the session; logout; me', async () => {
  const db = fakeDb();
  const [jo] = db.seedStaff([{ name: 'Joanne Bray', email: 'jo@truthcaregroup.co.uk', role: 'admin' }]);
  let res = fakeRes();
  await handleAuth(reqWith('/api/auth?action=login'), res, { db });
  assert.equal(res.statusCode, 302);
  const state = new URL(res.headers.location).searchParams.get('state');
  assert.ok(state.length > 20);
  assert.ok(res.headers['set-cookie'][0].startsWith(`${STATE_COOKIE}=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`));

  const deps = { db, now: NOW, exchange: async (code) => ({ id_token: `idt-for-${code}` }), verifyId: async (idt) => ({ email: idt === 'idt-for-good' ? 'jo@truthcaregroup.co.uk' : 'stranger@example.com', name: 'Whoever', tid: 'tenant-1', oid: 'o' }) };
  res = fakeRes();
  await handleAuth(reqWith(`/api/auth?action=callback&code=good&state=wrong`, `${STATE_COOKIE}=${state}`), res, deps);
  assert.equal(res.code, 400);
  assert.ok(String(res.body).includes('stale'));
  res = fakeRes();
  await handleAuth(reqWith(`/api/auth?action=callback&error=access_denied&error_description=User+cancelled`, ''), res, deps);
  assert.equal(res.code, 400);
  res = fakeRes();
  await handleAuth(reqWith(`/api/auth?action=callback&code=bad&state=${state}`, `${STATE_COOKIE}=${state}`), res, deps);
  assert.equal(res.code, 403);
  assert.ok(String(res.body).includes('not on the tickets staff list') && String(res.body).includes('stranger@example.com'));
  res = fakeRes();
  await handleAuth(reqWith(`/api/auth?action=callback&code=good&state=${state}`, `${STATE_COOKIE}=${state}`), res, deps);
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, '/');
  const sessionCookie = res.headers['set-cookie'][0];
  assert.ok(sessionCookie.startsWith(`${COOKIE_NAME}=`) && sessionCookie.includes('HttpOnly; Secure; SameSite=Lax; Max-Age=43200'));
  assert.equal(res.headers['set-cookie'][1], clearCookieHeader(STATE_COOKIE));
  const token = decodeURIComponent(sessionCookie.split(';')[0].slice(COOKIE_NAME.length + 1));
  assert.deepEqual((await verifySession(token, { now: NOW })).id, jo.id);
  res = fakeRes();
  await handleAuth(reqWith('/api/auth?action=me', `${COOKIE_NAME}=${token}`), res, { db, now: NOW });
  assert.deepEqual([res.code, res.body.user.email, res.body.user.role], [200, 'jo@truthcaregroup.co.uk', 'admin']);
  res = fakeRes();
  await handleAuth(reqWith('/api/auth?action=me'), res, { db, now: NOW });
  assert.equal(res.code, 401);
  res = fakeRes();
  await handleAuth(reqWith('/api/auth?action=logout', `${COOKIE_NAME}=${token}`), res, { db });
  assert.deepEqual([res.statusCode, res.headers.location, res.headers['set-cookie'][0]], [302, '/', clearCookieHeader(COOKIE_NAME)]);
  res = fakeRes();
  await handleAuth(reqWith(`/api/auth?action=callback&code=good&state=${state}`, `${STATE_COOKIE}=${state}`), res, { ...deps, exchange: async () => { throw new Error('exchange down'); } });
  assert.equal(res.code, 401);
  res = fakeRes();
  await handleAuth(reqWith('/api/auth?action=nope'), res, { db });
  assert.equal(res.code, 404);
});
