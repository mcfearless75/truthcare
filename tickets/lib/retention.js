/**
 * Retention (spec §5): tickets closed more than 12 months ago lose their
 * personal data. caller_name/phone/email/org/subject_person → '[redacted]',
 * ai notes (transcripts — special-category health data) are deleted, summary
 * is truncated to its first 80 characters. number, category and timestamps
 * stay for statistics. Queued notification payloads for those tickets carry
 * the same fields, so they go too.
 *
 * The SQL is built as plain text + params so the builder is unit-testable
 * and runRetention only needs a `db.query(text, params)`.
 */
import sql from './db.js';

export const RETENTION_MONTHS = 12;
export const SUMMARY_KEEP_CHARS = 80;
export const REDACTED = '[redacted]';

/** Same calendar day 12 months earlier, clamped for month-end (31 Mar → 28/29 Feb). */
export function retentionCutoff(now = Date.now()) {
  const d = new Date(now);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - RETENTION_MONTHS, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
  const daysInTarget = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), daysInTarget));
  return target;
}

const CLOSED_BEFORE = 'closed_at IS NOT NULL AND closed_at < $1';

/** @returns {Array<{ name: string, text: string, params: any[] }>} in execution order */
export function retentionStatements(cutoffIso) {
  return [
    {
      name: 'anonymise_tickets',
      text: `UPDATE tickets
             SET caller_name = $2, caller_phone = $2, caller_email = $2, caller_org = $2, subject_person = $2,
                 summary = left(summary, ${SUMMARY_KEEP_CHARS}), updated_at = now()
             WHERE ${CLOSED_BEFORE}
               AND (caller_name IS DISTINCT FROM $2 OR caller_phone IS DISTINCT FROM $2 OR caller_email IS DISTINCT FROM $2
                    OR caller_org IS DISTINCT FROM $2 OR subject_person IS DISTINCT FROM $2)
             RETURNING id`,
      params: [cutoffIso, REDACTED],
    },
    {
      name: 'delete_ai_notes',
      text: `DELETE FROM ticket_notes
             WHERE author_type = 'ai'
               AND ticket_id IN (SELECT id FROM tickets WHERE ${CLOSED_BEFORE})
             RETURNING id`,
      params: [cutoffIso],
    },
    {
      name: 'delete_notification_payloads',
      text: `DELETE FROM pending_notifications
             WHERE ticket_id IN (SELECT id FROM tickets WHERE ${CLOSED_BEFORE})
             RETURNING id`,
      params: [cutoffIso],
    },
  ];
}

export async function runRetention({ db = sql, now = Date.now() } = {}) {
  const cutoff = retentionCutoff(now).toISOString();
  const counts = {};
  for (const s of retentionStatements(cutoff)) {
    const rows = await db.query(s.text, s.params);
    counts[s.name] = Array.isArray(rows) ? rows.length : 0;
  }
  return { cutoff, anonymised: counts.anonymise_tickets, aiNotesDeleted: counts.delete_ai_notes, notificationsDeleted: counts.delete_notification_payloads };
}
