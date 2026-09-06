/**
 * Sign in with Microsoft (spec §7).
 *
 *   GET /api/auth?action=login     → 302 to Entra authorize (state in a short-lived cookie)
 *   GET /api/auth?action=callback  → exchange code, verify id_token, allowlist check, set session cookie, 302 /
 *   GET /api/auth?action=logout    → clear cookie, 302 /
 *   GET /api/auth?action=me        → { user } or 401
 *
 * Non-members get a plain 403 page: "not on the list — ask an admin".
 */
import sql from '../../lib/db.js';
import { getQuery, getAction, parseCookies, sendJson } from '../../lib/http.js';
import { staffByEmail } from '../../lib/staff.js';
import {
  COOKIE_NAME, STATE_COOKIE, STATE_TTL_S, SESSION_TTL_S, randomState, authorizeUrl, exchangeCode, verifyIdToken,
  signSession, cookieHeader, clearCookieHeader, redirect, sessionFromReq,
} from '../../lib/auth.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function html(res, status, title, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#1a1a1a"><h1 style="color:#0f2c3f">${esc(title)}</h1>${body}<p><a href="/api/auth?action=login">Try another account</a></p></body>`);
}

/** Testable core. `exchange` and `verifyId` default to the real Entra calls. */
export async function handleAuth(req, res, { db = sql, exchange = exchangeCode, verifyId = verifyIdToken, now = Date.now() } = {}) {
  const action = getAction(req);

  if (action === 'login') {
    const state = randomState();
    return redirect(res, authorizeUrl({ state }), [cookieHeader(STATE_COOKIE, state, { maxAge: STATE_TTL_S })]);
  }

  if (action === 'callback') {
    const q = getQuery(req);
    const cookies = parseCookies(req);
    if (q.get('error')) return html(res, 400, 'Sign-in cancelled', `<p>Microsoft reported: ${esc(q.get('error_description') || q.get('error'))}</p>`);
    const state = q.get('state') || '';
    if (!state || state !== cookies[STATE_COOKIE]) return html(res, 400, 'Sign-in expired', '<p>The sign-in link was stale or opened in a different browser. Please start again.</p>');
    const code = q.get('code') || '';
    if (!code) return html(res, 400, 'Sign-in failed', '<p>No authorization code was returned.</p>');
    let identity;
    try {
      const tokens = await exchange(code);
      identity = await verifyId(tokens.id_token, { now });
    } catch (e) {
      console.error('[auth] callback failed:', e?.message || e);
      return html(res, 401, 'Sign-in failed', '<p>Microsoft did not confirm your identity. Please try again.</p>');
    }
    const staff = await staffByEmail(identity.email, { db });
    if (!staff) {
      console.warn(`[auth] ${identity.email} signed in but is not on the staff list`);
      return html(res, 403, "You're not on the list", `<p><strong>${esc(identity.email)}</strong> signed in successfully but is not on the tickets staff list. Ask an admin to add you on the Staff page.</p>`);
    }
    const token = await signSession({ id: staff.id, name: staff.name, email: staff.email, role: staff.role }, { now });
    return redirect(res, '/', [cookieHeader(COOKIE_NAME, token, { maxAge: SESSION_TTL_S }), clearCookieHeader(STATE_COOKIE)]);
  }

  if (action === 'logout') {
    return redirect(res, '/', [clearCookieHeader(COOKIE_NAME)]);
  }

  if (action === 'me') {
    const session = await sessionFromReq(req, { now });
    const staff = session ? await staffByEmail(session.email, { db }) : null;
    if (!staff) return sendJson(res, 401, { error: 'Sign in required', login: '/api/auth?action=login' });
    return sendJson(res, 200, { user: { id: staff.id, name: staff.name, email: staff.email, role: staff.role, exp: session.exp } });
  }

  return sendJson(res, 404, { error: 'Unknown action' });
}

export default function handler(req, res) {
  return handleAuth(req, res);
}
