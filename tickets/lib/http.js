/**
 * Request plumbing shared by every api/ handler. readRawBody is lifted from
 * TrakNet's lib/middleware.js — Retell signatures are verified against the
 * exact bytes received, never a re-serialised parse.
 */

/** Exact request body text; '' when empty or when it exceeds maxBytes (the socket is destroyed). */
export async function readRawBody(req, maxBytes = 1024 * 1024) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let overflowed = false;
    req.on('data', (chunk) => {
      if (overflowed) return;
      size += chunk.length;
      if (size > maxBytes) {
        overflowed = true;
        chunks.length = 0;
        req.destroy();
        resolve('');
        return;
      }
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => { if (!overflowed) resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}

/** Parsed JSON body, or null when absent/invalid. Uses a body Vercel already parsed when present. */
export async function readJsonBody(req, maxBytes = 256 * 1024) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = await readRawBody(req, maxBytes);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function getQuery(req) {
  return new URL(req.url || '/', 'http://localhost').searchParams;
}

/** ?action=… (or any other single query parameter), '' when absent. */
export function getAction(req, name = 'action') {
  return (getQuery(req).get(name) || '').trim();
}

export function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers?.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { out[k] = part.slice(i + 1).trim(); }
  }
  return out;
}

export function sendJson(res, status, body) {
  res.status(status).json(body);
}
