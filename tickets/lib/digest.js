/**
 * Daily digest email (spec addendum 2026-09-06, requested by the user after
 * go-live): a once-a-day summary to the care-management leads so they don't
 * have to check the board to know whether anything needs attention.
 *
 * Deliberately NOT queued through pending_notifications like every other
 * email in this service — it isn't tied to one ticket's lifecycle, has no
 * caller audience, and re-sending it on a notification retry would produce
 * a stale summary. It sends directly and, on failure, throws so the cron
 * job's own error handling (api/cron/index.js: catch -> 500 -> logged) is
 * the single record of a missed digest, rather than adding a second retry
 * mechanism for one email.
 */
import sql from './db.js';
import { sendMail } from './graph.js';
import { digestRecipients } from './config.js';
import { renderDigestEmail } from './templates.js';
import { listTickets } from './tickets.js';

export const DIGEST_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Counts and the open-ticket list the digest email is built from. */
export async function gatherDigestStats({ db = sql, now = Date.now() } = {}) {
  const cutoff = new Date(now - DIGEST_WINDOW_MS).toISOString();
  const [createdRow] = await db.query('SELECT count(*)::int AS n FROM tickets WHERE created_at >= $1', [cutoff]);
  const [closedRow] = await db.query('SELECT count(*)::int AS n FROM tickets WHERE closed_at >= $1', [cutoff]);
  const open = await listTickets({ status: 'active' }, { db });
  return {
    cutoff,
    createdLast24h: Number(createdRow?.n || 0),
    closedLast24h: Number(closedRow?.n || 0),
    open,
  };
}

/** Gather + render + send. Returns a small summary for the cron response. */
export async function sendDailyDigest({ db = sql, send = sendMail, now = Date.now() } = {}) {
  const stats = await gatherDigestStats({ db, now });
  const { to, bcc } = digestRecipients();
  const email = renderDigestEmail(stats);
  await send({ to, bcc, subject: email.subject, html: email.html, text: email.text });
  return { sent: true, to, bcc, createdLast24h: stats.createdLast24h, closedLast24h: stats.closedLast24h, open: stats.open.length };
}
