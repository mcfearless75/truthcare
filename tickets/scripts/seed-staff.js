/**
 * Seed or update the staff allowlist (spec §1: small allowlist, seeded by script).
 *
 *   node scripts/seed-staff.js "Joanne Bray" joanne@truthcaregroup.co.uk admin jo,joanne
 *   node scripts/seed-staff.js "Paul M" paul@truthcaregroup.co.uk agent
 *
 * Args: <name> <email> [role=agent] [comma,separated,aliases]
 * Upserts on email, so re-running with new aliases updates the row.
 */
import sql from '../lib/db.js';

const [name, emailArg, roleArg = 'agent', aliasArg = ''] = process.argv.slice(2);

if (!name || !emailArg) {
  console.error('Usage: node scripts/seed-staff.js "<name>" <email> [admin|agent] [alias1,alias2]');
  process.exit(1);
}
const email = emailArg.trim().toLowerCase();
const role = roleArg === 'admin' ? 'admin' : 'agent';
const aliases = aliasArg.split(',').map((a) => a.trim().toLowerCase()).filter(Boolean);

const [row] = await sql`
  INSERT INTO staff (name, email, role, aliases, active)
  VALUES (${name.trim()}, ${email}, ${role}, ${aliases}, true)
  ON CONFLICT (email) DO UPDATE
    SET name = EXCLUDED.name, role = EXCLUDED.role, aliases = EXCLUDED.aliases, active = true
  RETURNING id, name, email, role, aliases
`;
console.log(`Staff ready: ${row.name} <${row.email}> role=${row.role} aliases=[${row.aliases.join(', ')}] id=${row.id}`);
