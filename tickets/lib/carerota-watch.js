/**
 * Closes the loop the `dropshift` command opens (spec addendum 2026-09-06):
 * once a shift is dropped in carerota, this polls for how it was resolved
 * and notifies the ticket the same way any other update does, so nobody has
 * to check carerota by hand to find out whether the shift got covered.
 *
 * Deliberately a poll, not a webhook from carerota — adding a webhook would
 * mean changing carerota's own codebase (a separate live product with its
 * own release cycle) to know about this service. A cron running every 15
 * minutes (see vercel.json) is a small delay in exchange for a change that
 * lives entirely on this side.
 */
import sql, { toCamelArray } from './db.js';
import { addNote, getTicketById } from './tickets.js';
import { staffById } from './staff.js';
import { notify } from './notify.js';
import { sendMail } from './graph.js';
import { getShiftStatus, carerotaClient as defaultCareRotaClient } from './carerota.js';
import { carerotaConfigured } from './config.js';

const RESOLVED_MESSAGES = {
  claimed: (name) => `${name || 'A member of staff'} has claimed this shift in CareRota — awaiting the usual approval.`,
  confirmed: (name) => `${name || 'A member of staff'} is confirmed covering this shift in CareRota.`,
  unfilled: () => 'No one picked up this shift in CareRota — it still needs cover arranged manually.',
  cancelled: () => 'This shift was cancelled in CareRota.',
};

/** Pure so the message wording is unit-testable without a fake client. */
export function describeShiftOutcome({ status, assigneeName }) {
  const fn = RESOLVED_MESSAGES[status];
  return fn ? fn(assigneeName) : `This shift's CareRota status is now "${status}".`;
}

/**
 * One pass over every ticket waiting on a carerota outcome. Never chases a
 * shift forever: 'open' just means the cascade is still running, so it's
 * left for the next run; anything else is treated as resolved, notified
 * once via the normal 'updated' notification path (assignee + thread
 * participants, same as any other note), and never checked again
 * (carerota_shift_notified_at is set).
 */
export async function checkDroppedShifts({ db = sql, send = sendMail, immediate = true, getCareRotaClient = defaultCareRotaClient } = {}) {
  if (!carerotaConfigured()) return { checked: 0, resolved: 0 };
  const rows = toCamelArray(await db.query(
    `SELECT id, carerota_shift_id FROM tickets WHERE carerota_shift_id IS NOT NULL AND carerota_shift_notified_at IS NULL`, [],
  ));
  if (!rows.length) return { checked: 0, resolved: 0 };

  const client = await getCareRotaClient();
  let resolved = 0;
  for (const row of rows) {
    const info = await getShiftStatus(row.carerotaShiftId, { client });
    if (!info || info.status === 'open') continue;
    const ticket = await getTicketById(row.id, { db });
    if (!ticket) continue; // shouldn't happen, but one missing ticket must never abort the whole poll
    const note = await addNote(ticket.id, { body: describeShiftOutcome(info), authorType: 'system', authorName: 'CareRota', isInternal: true }, { db });
    const assignee = await staffById(ticket.assignedTo, { db });
    await notify('updated', ticket, { db, send, immediate, assignee, note });
    await db.query(`UPDATE tickets SET carerota_shift_notified_at = now() WHERE id = $1`, [ticket.id]);
    resolved += 1;
  }
  return { checked: rows.length, resolved };
}
