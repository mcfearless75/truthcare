/**
 * In-memory stand-in for the neon sql tag, covering exactly the statements
 * lib/staff.js, lib/notify.js, lib/tickets.js, lib/inbound.js and
 * lib/retention.js issue.
 * Both call styles are supported: sql`...${v}` and sql.query(text, params).
 * Anything unrecognised throws, so a new query in lib/ shows up as a test
 * failure here rather than silently returning [].
 */
export function fakeDb() {
  const t = { staff: [], tickets: [], ticket_notes: [], ticket_events: [], pending_notifications: [], failed_calls: [], settings: [], processed_messages: [] };
  let ids = 0;
  let numbers = 0;
  const uuid = () => `00000000-0000-4000-8000-${String(++ids).padStart(12, '0')}`;
  const now = () => new Date().toISOString();
  const log = [];

  function run(text, p) {
    const q = text.replace(/\s+/g, ' ').trim();
    log.push({ q, params: p });
    let m;
    // ── staff ──
    if (/FROM staff WHERE active = true AND lower\(email\) = \$1/.test(q)) return t.staff.filter((s) => s.active && s.email.toLowerCase() === p[0]).slice(0, 1);
    if (/FROM staff WHERE id = \$1/.test(q)) return t.staff.filter((s) => s.id === p[0]);
    if (/FROM staff WHERE active = true AND receives_new_tickets = true/.test(q)) return t.staff.filter((s) => s.active && s.receives_new_tickets);
    if (/FROM staff WHERE active = true AND role = 'admin'/.test(q)) return t.staff.filter((s) => s.active && s.role === 'admin');
    if (/FROM staff WHERE active = true ORDER BY name/.test(q)) return t.staff.filter((s) => s.active);
    if (/FROM staff ORDER BY active DESC, name/.test(q)) return [...t.staff];
    if (/^INSERT INTO staff/.test(q)) {
      const [name, email, role, aliases, receives_new_tickets, active] = p;
      let row = t.staff.find((s) => s.email === email);
      if (!row) { row = { id: uuid(), email, created_at: now() }; t.staff.push(row); }
      Object.assign(row, { name, role, aliases, receives_new_tickets, active });
      return [row];
    }
    // ── tickets ──
    if (/^INSERT INTO tickets/.test(q)) {
      const row = {
        id: uuid(), number: ++numbers, status: 'open', priority: p[0], category: p[1], source: p[2], subject: p[3], summary: p[4],
        caller_name: p[5], caller_phone: p[6], caller_email: p[7], caller_org: p[8], subject_person: p[9], email_token: p[10],
        graph_conversation_id: p[11], retell_call_id: p[12], assigned_to: null, created_at: now(), updated_at: now(), closed_at: null,
      };
      t.tickets.push(row);
      return [row];
    }
    if (/FROM tickets t LEFT JOIN staff s/.test(q)) {
      const rank = { urgent: 0, high: 1, normal: 2 };
      return [...t.tickets].sort((a, b) => rank[a.priority] - rank[b.priority] || b.created_at.localeCompare(a.created_at))
        .map((r) => ({ ...r, assignee_name: t.staff.find((s) => s.id === r.assigned_to)?.name || null, failed_notifications: 0 }));
    }
    if ((m = /FROM tickets WHERE (.+?)(?: ORDER BY .+?)? LIMIT 1$/.exec(q))) {
      const w = m[1];
      const rows = t.tickets.filter((r) => {
        if (w === 'id = $1') return r.id === p[0];
        if (w === 'number = $1') return r.number === p[0];
        if (w === 'number = $1 AND email_token = $2') return r.number === p[0] && r.email_token === p[1];
        if (w === 'graph_conversation_id = $1') return r.graph_conversation_id === p[0];
        if (w === 'number = $1 AND lower(caller_email) = $2') return r.number === p[0] && (r.caller_email || '').toLowerCase() === p[1];
        if (w === 'retell_call_id = $1') return r.retell_call_id === p[0];
        throw new Error(`fake-db: unhandled ticket where: ${w}`);
      });
      return rows.slice(-1);
    }
    if ((m = /^UPDATE tickets SET (\w+) = \$1, updated_at = now\(\)(?:, closed_at = (now\(\)|NULL))? WHERE id = \$2 RETURNING/.exec(q))) {
      const row = t.tickets.find((r) => r.id === p[1]);
      if (!row) return [];
      row[m[1]] = p[0];
      row.updated_at = now();
      if (m[2] === 'now()') row.closed_at = now();
      if (m[2] === 'NULL') row.closed_at = null;
      return [row];
    }
    if (/^UPDATE tickets SET updated_at = now\(\) WHERE id = \$1$/.test(q)) return [];
    if (/^UPDATE tickets SET graph_conversation_id = \$1 WHERE id = \$2/.test(q)) { const row = t.tickets.find((r) => r.id === p[1]); if (row) row.graph_conversation_id = p[0]; return []; }
    if (/^UPDATE tickets SET retell_call_id = \$1 WHERE id = \$2/.test(q)) { const row = t.tickets.find((r) => r.id === p[1]); if (row) row.retell_call_id = p[0]; return []; }
    // ── notes / events ──
    if (/^INSERT INTO ticket_notes/.test(q)) {
      const row = { id: uuid(), ticket_id: p[0], body: p[1], author_type: p[2], author_name: p[3], author_email: p[4], is_internal: p[5], created_at: now() };
      t.ticket_notes.push(row);
      return [row];
    }
    if (/SELECT DISTINCT lower\(author_email\) AS email FROM ticket_notes WHERE ticket_id = \$1/.test(q)) {
      return [...new Set(t.ticket_notes.filter((n) => n.ticket_id === p[0] && n.author_type === 'staff' && n.author_email).map((n) => n.author_email.toLowerCase()))].map((email) => ({ email }));
    }
    if (/FROM ticket_notes WHERE ticket_id = \$1 AND is_internal = false ORDER BY created_at DESC LIMIT 1/.test(q)) return t.ticket_notes.filter((n) => n.ticket_id === p[0] && !n.is_internal).slice(-1);
    if (/FROM ticket_notes WHERE ticket_id = \$1 ORDER BY created_at ASC/.test(q)) return t.ticket_notes.filter((n) => n.ticket_id === p[0]);
    if (/^INSERT INTO ticket_events/.test(q)) {
      const row = { id: uuid(), ticket_id: p[0], event: p[1], actor: p[2], from_value: p[3], to_value: p[4], via: p[5], created_at: now() };
      t.ticket_events.push(row);
      return [row];
    }
    if (/FROM ticket_events WHERE ticket_id = \$1 ORDER BY created_at ASC/.test(q)) return t.ticket_events.filter((e) => e.ticket_id === p[0]);
    // ── pending_notifications ──
    if (/^INSERT INTO pending_notifications/.test(q)) {
      const row = { id: uuid(), ticket_id: p[0], kind: p[1], recipient: p[2], payload: JSON.parse(p[3]), attempts: 0, last_error: null, next_attempt_at: now(), created_at: now(), sent_at: null };
      t.pending_notifications.push(row);
      return [row];
    }
    if (/^UPDATE pending_notifications SET sent_at = now\(\), attempts = attempts \+ 1, last_error = NULL WHERE id = \$1/.test(q)) {
      const row = t.pending_notifications.find((r) => r.id === p[0]);
      if (row) { row.sent_at = now(); row.attempts += 1; row.last_error = null; }
      return [];
    }
    if (/^UPDATE pending_notifications SET attempts = \$1, last_error = \$2, next_attempt_at = \$3 WHERE id = \$4/.test(q)) {
      const row = t.pending_notifications.find((r) => r.id === p[3]);
      if (row) { row.attempts = p[0]; row.last_error = p[1]; row.next_attempt_at = p[2]; }
      return [];
    }
    if (/FROM pending_notifications WHERE sent_at IS NULL AND attempts < \$1 AND next_attempt_at <= now\(\)/.test(q)) {
      const nowIso = now();
      return t.pending_notifications.filter((r) => !r.sent_at && r.attempts < p[0] && r.next_attempt_at <= nowIso).slice(0, p[1]);
    }
    if (/FROM pending_notifications WHERE ticket_id = \$1 AND sent_at IS NULL AND attempts >= 5/.test(q)) return t.pending_notifications.filter((r) => r.ticket_id === p[0] && !r.sent_at && r.attempts >= 5);
    // ── failed_calls ──
    if (/^INSERT INTO failed_calls/.test(q)) { const row = { id: uuid(), retell_call_id: p[0], action: p[1], args: JSON.parse(p[2]), error: p[3], alerted_at: null, created_at: now() }; t.failed_calls.push(row); return [row]; }
    if (/FROM failed_calls WHERE alerted_at IS NULL/.test(q)) return t.failed_calls.filter((r) => !r.alerted_at);
    if (/^UPDATE failed_calls SET alerted_at = now\(\) WHERE id = ANY\(\$1/.test(q)) { for (const r of t.failed_calls) if (p[0].includes(r.id)) r.alerted_at = now(); return []; }
    // ── retention (lib/retention.js) ──
    if (/^UPDATE tickets SET caller_name = \$2, caller_phone = \$2/.test(q)) {
      const hit = t.tickets.filter((r) => r.closed_at && r.closed_at < p[0] && [r.caller_name, r.caller_phone, r.caller_email, r.caller_org, r.subject_person].some((v) => v !== p[1]));
      for (const r of hit) Object.assign(r, { caller_name: p[1], caller_phone: p[1], caller_email: p[1], caller_org: p[1], subject_person: p[1], summary: String(r.summary || '').slice(0, 80), updated_at: now() });
      return hit.map((r) => ({ id: r.id }));
    }
    if (/^DELETE FROM ticket_notes WHERE author_type = 'ai' AND ticket_id IN \(SELECT id FROM tickets WHERE closed_at IS NOT NULL AND closed_at < \$1\)/.test(q)) {
      const ids = new Set(t.tickets.filter((r) => r.closed_at && r.closed_at < p[0]).map((r) => r.id));
      const gone = t.ticket_notes.filter((n) => n.author_type === 'ai' && ids.has(n.ticket_id));
      t.ticket_notes = t.ticket_notes.filter((n) => !gone.includes(n));
      return gone.map((n) => ({ id: n.id }));
    }
    if (/^DELETE FROM pending_notifications WHERE ticket_id IN \(SELECT id FROM tickets WHERE closed_at IS NOT NULL AND closed_at < \$1\)/.test(q)) {
      const ids = new Set(t.tickets.filter((r) => r.closed_at && r.closed_at < p[0]).map((r) => r.id));
      const gone = t.pending_notifications.filter((n) => ids.has(n.ticket_id));
      t.pending_notifications = t.pending_notifications.filter((n) => !gone.includes(n));
      return gone.map((n) => ({ id: n.id }));
    }
    // ── settings / processed_messages (cron) ──
    if (/^SELECT value FROM settings WHERE key = \$1/.test(q)) return t.settings.filter((s) => s.key === p[0]).map((s) => ({ value: s.value }));
    if (/^INSERT INTO settings \(key, value\) VALUES \(\$1, \$2\) ON CONFLICT \(key\) DO UPDATE SET value = EXCLUDED.value, updated_at = now\(\)$/.test(q)) {
      const row = t.settings.find((s) => s.key === p[0]);
      if (row) { row.value = p[1]; row.updated_at = now(); } else t.settings.push({ key: p[0], value: p[1], updated_at: now() });
      return [];
    }
    if (/^INSERT INTO settings \(key, value\) VALUES \(\$1, \$2\) ON CONFLICT \(key\) DO UPDATE SET value = EXCLUDED.value, updated_at = now\(\) WHERE settings.value < \$3 RETURNING key/.test(q)) {
      const row = t.settings.find((s) => s.key === p[0]);
      if (!row) { t.settings.push({ key: p[0], value: p[1], updated_at: now() }); return [{ key: p[0] }]; }
      if (row.value < p[2]) { row.value = p[1]; row.updated_at = now(); return [{ key: p[0] }]; }
      return [];
    }
    if (/^DELETE FROM settings WHERE key = \$1 AND value = \$2/.test(q)) { t.settings = t.settings.filter((s) => !(s.key === p[0] && s.value === p[1])); return []; }
    if (/^SELECT internet_message_id FROM processed_messages WHERE internet_message_id = ANY\(\$1/.test(q)) return t.processed_messages.filter((r) => p[0].includes(r.internet_message_id)).map((r) => ({ internet_message_id: r.internet_message_id }));
    if (/^INSERT INTO processed_messages/.test(q)) { if (!t.processed_messages.some((r) => r.internet_message_id === p[0])) t.processed_messages.push({ internet_message_id: p[0], ticket_id: p[1], outcome: p[2], processed_at: now() }); return []; }
    throw new Error(`fake-db: unhandled query: ${q}`);
  }

  const sql = (strings, ...values) => Promise.resolve(run(strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ''), ''), values));
  sql.query = (text, params = []) => Promise.resolve(run(text, params));
  sql.tables = t;
  sql.log = log;
  sql.seedStaff = (rows) => rows.map((r) => { const row = { id: uuid(), aliases: [], role: 'agent', receives_new_tickets: true, active: true, created_at: now(), ...r }; t.staff.push(row); return row; });
  return sql;
}

/** Records every send; can be told to fail for particular recipients. */
export function fakeSend() {
  const sent = [];
  const failFor = new Set();
  const send = async (msg) => {
    if (failFor.has(msg.to)) throw new Error(`Graph sendMail failed 503: simulated for ${msg.to}`);
    sent.push(msg);
  };
  send.sent = sent;
  send.failFor = failFor;
  send.to = (address) => sent.filter((m) => m.to === address);
  return send;
}
