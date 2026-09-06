/**
 * Staff allowlist API (spec §7). Any signed-in staff member may list; only
 * admins may save. Deactivation is a save with active:false, so one
 * statement (upsertStaff) covers add, edit, alias changes and removal.
 *
 *   GET  /api/staff?action=list
 *   POST /api/staff?action=save   { name, email, role, aliases, receivesNewTickets, active }
 */
import sql from '../../lib/db.js';
import { getAction, readJsonBody, sendJson } from '../../lib/http.js';
import { requireStaff, requireAdmin } from '../../lib/auth.js';
import { allStaff, activeStaff, upsertStaff } from '../../lib/staff.js';

export async function handleStaff(req, res, { db = sql, now = Date.now() } = {}) {
  const action = getAction(req);
  try {
    if (action === 'list' && req.method === 'GET') {
      const user = await requireStaff(req, res, { db, now });
      if (!user) return;
      const staff = user.role === 'admin' ? await allStaff({ db }) : await activeStaff({ db });
      return sendJson(res, 200, { staff, user });
    }
    if (action === 'save' && req.method === 'POST') {
      const user = await requireAdmin(req, res, { db, now });
      if (!user) return;
      const body = await readJsonBody(req);
      if (!body) return sendJson(res, 400, { error: 'JSON body required' });
      if (body.active === false && String(body.email || '').trim().toLowerCase() === user.email) return sendJson(res, 400, { error: 'You cannot deactivate yourself' });
      const staff = await upsertStaff({
        name: body.name, email: body.email, role: body.role, aliases: body.aliases ?? [],
        receivesNewTickets: body.receivesNewTickets !== false, active: body.active !== false,
      }, { db });
      return sendJson(res, 200, { staff });
    }
    return sendJson(res, 404, { error: 'Unknown action' });
  } catch (e) {
    if (/need a name|valid email/.test(String(e?.message))) return sendJson(res, 400, { error: e.message });
    console.error(`[staff] ${action} failed:`, e);
    return sendJson(res, 500, { error: 'Something went wrong' });
  }
}

export default function handler(req, res) {
  return handleStaff(req, res);
}
