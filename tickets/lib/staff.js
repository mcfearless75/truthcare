/**
 * Staff allowlist (spec §1, §6.3, §7). matchStaff is pure so the
 * prefix/alias rules are unit-tested; the async helpers take an injectable
 * `db` (defaults to the real neon tag) so tickets.js can be smoke-tested
 * without a database.
 */
import sql, { toCamel, toCamelArray } from './db.js';

const norm = (s) => String(s || '').trim().toLowerCase();

/**
 * Resolve "joanne", "jo", "@Joanne Bray", "jbray" against staff rows
 * ({ name, email, aliases }). Exact alias/name/email match wins outright;
 * otherwise a case-insensitive prefix match on first name, full name, any
 * alias or the email local part. Returns { staff } | { ambiguous: staff[] } | null.
 */
export function matchStaff(query, staffList) {
  const q = norm(query).replace(/^@/, '').replace(/\s+/g, ' ');
  if (!q) return null;
  const rows = (staffList || []).filter((s) => s && s.active !== false);
  const keysOf = (s) => {
    const name = norm(s.name);
    const local = norm(s.email).split('@')[0];
    return [name, name.split(' ')[0], local, ...(s.aliases || []).map(norm)].filter(Boolean);
  };
  const exact = rows.filter((s) => keysOf(s).includes(q));
  if (exact.length === 1) return { staff: exact[0] };
  if (exact.length > 1) return { ambiguous: exact };
  const prefix = rows.filter((s) => keysOf(s).some((k) => k.startsWith(q)));
  if (prefix.length === 1) return { staff: prefix[0] };
  if (prefix.length > 1) return { ambiguous: prefix };
  return null;
}

export async function activeStaff({ db = sql } = {}) {
  const rows = await db`SELECT id, name, email, aliases, role, receives_new_tickets, active FROM staff WHERE active = true ORDER BY name`;
  return toCamelArray(rows);
}

export async function allStaff({ db = sql } = {}) {
  const rows = await db`SELECT id, name, email, aliases, role, receives_new_tickets, active, created_at FROM staff ORDER BY active DESC, name`;
  return toCamelArray(rows);
}

/** Active staff row whose email matches (case-insensitive), else null. */
export async function staffByEmail(email, { db = sql } = {}) {
  const e = norm(email);
  if (!e) return null;
  const [row] = await db`SELECT id, name, email, aliases, role, receives_new_tickets, active FROM staff WHERE active = true AND lower(email) = ${e} LIMIT 1`;
  return toCamel(row || null);
}

export async function staffById(id, { db = sql } = {}) {
  if (!id) return null;
  const [row] = await db`SELECT id, name, email, aliases, role, receives_new_tickets, active FROM staff WHERE id = ${id} LIMIT 1`;
  return toCamel(row || null);
}

/** Staff who receive "ticket created" emails (spec §6.2 row 1). */
export async function newTicketRecipients({ db = sql } = {}) {
  const rows = await db`SELECT id, name, email FROM staff WHERE active = true AND receives_new_tickets = true ORDER BY name`;
  return toCamelArray(rows);
}

export async function adminStaff({ db = sql } = {}) {
  const rows = await db`SELECT id, name, email FROM staff WHERE active = true AND role = 'admin' ORDER BY name`;
  return toCamelArray(rows);
}

export async function resolveStaff(query, { db = sql } = {}) {
  return matchStaff(query, await activeStaff({ db }));
}

/** Admin editor: insert or update by email. */
export async function upsertStaff({ name, email, role = 'agent', aliases = [], receivesNewTickets = true, active = true }, { db = sql } = {}) {
  const cleanName = String(name || '').trim();
  const cleanEmail = norm(email);
  if (!cleanName || !/^[^@\s]+@[^@\s]+$/.test(cleanEmail)) throw new Error('Staff need a name and a valid email');
  const cleanRole = role === 'admin' ? 'admin' : 'agent';
  const cleanAliases = [...new Set((Array.isArray(aliases) ? aliases : String(aliases).split(',')).map(norm).filter(Boolean))];
  const [row] = await db`
    INSERT INTO staff (name, email, role, aliases, receives_new_tickets, active)
    VALUES (${cleanName}, ${cleanEmail}, ${cleanRole}, ${cleanAliases}, ${!!receivesNewTickets}, ${!!active})
    ON CONFLICT (email) DO UPDATE
      SET name = EXCLUDED.name, role = EXCLUDED.role, aliases = EXCLUDED.aliases,
          receives_new_tickets = EXCLUDED.receives_new_tickets, active = EXCLUDED.active
    RETURNING id, name, email, aliases, role, receives_new_tickets, active
  `;
  return toCamel(row);
}
