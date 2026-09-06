/**
 * Cron door. Vercel calls these on the schedules in vercel.json with
 * Authorization: Bearer <CRON_SECRET>.
 *
 *   GET /api/cron?job=email          poll infotech@ for tickets@ mail (every 5 min)
 */
import { requireCronAuth } from '../../lib/cron-auth.js';
import { getAction, sendJson } from '../../lib/http.js';
import { processInbox } from '../../lib/inbound.js';

export const JOBS = {
  email: (deps) => processInbox(deps),
};

/** Testable core: `deps` are passed straight to the job (db, send, list, classifier, now). */
export async function handleCron(req, res, deps = {}) {
  if (!requireCronAuth(req, res)) return;
  const job = getAction(req, 'job');
  const run = JOBS[job];
  if (!run) return sendJson(res, 404, { error: 'Unknown job', jobs: Object.keys(JOBS) });
  const started = Date.now();
  try {
    const result = await run(deps);
    return sendJson(res, 200, { job, ms: Date.now() - started, ...result });
  } catch (e) {
    console.error(`[cron] ${job} failed:`, e);
    return sendJson(res, 500, { job, error: String(e?.message || e) });
  }
}

export default function handler(req, res) {
  return handleCron(req, res);
}
