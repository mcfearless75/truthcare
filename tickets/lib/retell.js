/**
 * Retell AI webhook / custom-function signature verification.
 *
 * Retell signs every request it sends us with
 *   X-Retell-Signature: v=<unix ms timestamp>,d=<hex HMAC-SHA256(rawBody + timestamp, API_KEY)>
 * and documents a 5-minute freshness window and constant-time comparison
 * (docs.retellai.com/features/secure-webhook, "Verify without SDK").
 * Verify against the RAW request body string — never a re-serialised parse.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const RETELL_SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

const SIGNATURE_RE = /^v=(\d{1,16}),d=([0-9a-fA-F]+)$/;

/** Build a signature the way Retell does — for tests and local curl checks. */
export function signRetellBody(rawBody, apiKey, timestampMs) {
  const digest = createHmac('sha256', apiKey).update(String(rawBody ?? '') + String(timestampMs)).digest('hex');
  return `v=${timestampMs},d=${digest}`;
}

/**
 * @param {string} rawBody     exact request body text ('' for bodiless requests)
 * @param {unknown} signature  the X-Retell-Signature header value
 * @param {string} apiKey      RETELL_API_KEY
 * @param {number} [nowMs]     injectable clock for tests
 * @returns {boolean}
 */
export function verifyRetellSignature(rawBody, signature, apiKey, nowMs = Date.now()) {
  if (!apiKey || typeof signature !== 'string') return false;
  const m = SIGNATURE_RE.exec(signature.trim());
  if (!m) return false;
  const timestamp = Number(m[1]);
  if (!Number.isFinite(timestamp) || Math.abs(nowMs - timestamp) > RETELL_SIGNATURE_TOLERANCE_MS) return false;

  const expected = createHmac('sha256', apiKey).update(String(rawBody ?? '') + m[1]).digest();
  const given = Buffer.from(m[2], 'hex');
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}
