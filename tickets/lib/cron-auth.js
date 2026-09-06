/** Shared guard for Vercel cron endpoints.
 *  Vercel sends:  Authorization: Bearer <CRON_SECRET>
 *  Fails closed: if CRON_SECRET is unset the endpoint refuses to run, so a
 *  misconfigured deploy surfaces as a 503 instead of an open endpoint.
 *  Uses a constant-time comparison so the secret cannot be recovered by
 *  timing the rejection (length check first, then timingSafeEqual).
 *  Returns true when the request may proceed; otherwise the response has
 *  already been sent. */
import { timingSafeEqual } from 'node:crypto';

export function requireCronAuth(req, res) {
  const configured = (process.env.CRON_SECRET || '').trim();
  if (!configured) {
    console.error('[cron-auth] CRON_SECRET is not set — refusing to run cron endpoint');
    res.status(503).json({ error: 'Cron not configured' });
    return false;
  }
  const supplied = (req.headers['authorization'] || req.headers['x-cron-secret'] || '')
    .replace(/^Bearer\s+/i, '');
  const suppliedBuf = Buffer.from(supplied);
  const configuredBuf = Buffer.from(configured);
  if (suppliedBuf.length !== configuredBuf.length || !timingSafeEqual(suppliedBuf, configuredBuf)) {
    res.status(401).json({ error: 'Unauthorised' });
    return false;
  }
  return true;
}
