/**
 * Board auth (spec §7): Sign in with Microsoft (Entra OIDC, single tenant,
 * same app registration as Graph) → staff allowlist check → HS256 session
 * JWT in an HttpOnly; Secure; SameSite=Lax cookie for 12 h.
 *
 * MS_LOGIN_BASE_URL is a test-only override; the JWKS and issuer are always
 * derived from it plus MICROSOFT_TENANT_ID.
 */
import { randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';
import { env, requireEnv, appUrl } from './config.js';
import { parseCookies } from './http.js';
import { staffByEmail } from './staff.js';
import sql from './db.js';

export const COOKIE_NAME = 'tc_session';
export const STATE_COOKIE = 'tc_oidc_state';
export const SESSION_TTL_S = 12 * 60 * 60;
export const STATE_TTL_S = 10 * 60;
export const SCOPES = 'openid profile email';

const encoder = new TextEncoder();

function secretKey() {
  const secret = requireEnv('JWT_SECRET');
  if (secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  return encoder.encode(secret);
}

// ── session JWT ────────────────────────────────────────────────────────────

export async function signSession({ id, name, email, role }, { now = Date.now(), ttlSeconds = SESSION_TTL_S } = {}) {
  const iat = Math.floor(now / 1000);
  return new SignJWT({ name, email: String(email).toLowerCase(), role })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(String(id))
    .setIssuer('truthcare-tickets')
    .setAudience('board')
    .setIssuedAt(iat)
    .setExpirationTime(iat + ttlSeconds)
    .sign(secretKey());
}

/** @returns {Promise<{ id, name, email, role, exp } | null>} */
export async function verifySession(token, { now = Date.now() } = {}) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: 'truthcare-tickets', audience: 'board', currentDate: new Date(now) });
    return { id: payload.sub, name: payload.name, email: payload.email, role: payload.role, exp: payload.exp };
  } catch {
    return null;
  }
}

// ── cookies / responses ────────────────────────────────────────────────────

export function cookieHeader(name, value, { maxAge = SESSION_TTL_S, secure = true } = {}) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearCookieHeader(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function redirect(res, location, cookies = []) {
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.setHeader('Location', location);
  res.statusCode = 302;
  res.end();
}

export async function sessionFromReq(req, { now = Date.now() } = {}) {
  return verifySession(parseCookies(req)[COOKIE_NAME], { now });
}

/** Valid cookie AND still an active staff member (deactivation takes effect immediately). Sends 401 otherwise. */
export async function requireStaff(req, res, { db = sql, now = Date.now() } = {}) {
  const session = await sessionFromReq(req, { now });
  const staff = session ? await staffByEmail(session.email, { db }) : null;
  if (!staff) {
    res.status(401).json({ error: 'Sign in required', login: '/api/auth?action=login' });
    return null;
  }
  return { ...session, id: staff.id, name: staff.name, role: staff.role };
}

export async function requireAdmin(req, res, { db = sql, now = Date.now() } = {}) {
  const user = await requireStaff(req, res, { db, now });
  if (!user) return null;
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return null;
  }
  return user;
}

// ── OIDC ───────────────────────────────────────────────────────────────────

export function loginBase() {
  return env('MS_LOGIN_BASE_URL', 'https://login.microsoftonline.com').replace(/\/+$/, '');
}

export function redirectUri() {
  return `${appUrl()}/api/auth?action=callback`;
}

export function randomState() {
  return randomBytes(24).toString('base64url');
}

export function authorizeUrl({ state, tenant = requireEnv('MICROSOFT_TENANT_ID'), clientId = requireEnv('MICROSOFT_CLIENT_ID') } = {}) {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    response_mode: 'query',
    scope: SCOPES,
    state,
    prompt: 'select_account',
  });
  return `${loginBase()}/${tenant}/oauth2/v2.0/authorize?${params}`;
}

/** Authorization-code exchange. Returns the raw token response ({ id_token, … }). */
export async function exchangeCode(code, { fetchImpl = globalThis.fetch } = {}) {
  const tenant = requireEnv('MICROSOFT_TENANT_ID');
  const res = await fetchImpl(`${loginBase()}/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: requireEnv('MICROSOFT_CLIENT_ID'),
      client_secret: requireEnv('MICROSOFT_CLIENT_SECRET'),
      code,
      redirect_uri: redirectUri(),
      scope: SCOPES,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id_token) throw new Error(`Token exchange failed: ${data.error_description || data.error || res.status}`);
  return data;
}

let remoteKeys = null;
let remoteKeysFor = '';

/** Cached remote JWKS for the tenant (jose handles rotation/refetch). */
export function tenantKeySet(tenant = requireEnv('MICROSOFT_TENANT_ID')) {
  const url = `${loginBase()}/${tenant}/discovery/v2.0/keys`;
  if (!remoteKeys || remoteKeysFor !== url) {
    remoteKeys = createRemoteJWKSet(new URL(url));
    remoteKeysFor = url;
  }
  return remoteKeys;
}

/**
 * Verify the id_token: signature against the tenant JWKS, issuer, audience,
 * expiry, and tid === MICROSOFT_TENANT_ID. `keySet` is injectable for tests.
 * @returns {Promise<{ email: string, name: string, tid: string, oid: string }>}
 */
export async function verifyIdToken(idToken, { tenant = requireEnv('MICROSOFT_TENANT_ID'), clientId = requireEnv('MICROSOFT_CLIENT_ID'), keySet = tenantKeySet(tenant), now = Date.now() } = {}) {
  const { payload } = await jwtVerify(idToken, keySet, {
    issuer: `${loginBase()}/${tenant}/v2.0`,
    audience: clientId,
    currentDate: new Date(now),
  });
  if (payload.tid !== tenant) throw new Error('id_token tid does not match MICROSOFT_TENANT_ID');
  const email = String(payload.preferred_username || payload.email || '').trim().toLowerCase();
  if (!email) throw new Error('id_token carries no preferred_username or email');
  return { email, name: String(payload.name || email), tid: payload.tid, oid: String(payload.oid || '') };
}
