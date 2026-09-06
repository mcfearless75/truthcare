import { neon } from '@neondatabase/serverless';

/**
 * Neon HTTP client, created lazily. TrakNet's lib/db.js calls neon() at module
 * load; we defer it so pure modules (and their tests) can import anything that
 * imports db.js without DATABASE_URL being set. The exported `sql` is the same
 * tagged-template API: sql`SELECT ... ${param}` → Promise<Row[]>.
 */
let client = null;

export function getSql() {
  if (!client) {
    const url = (process.env.DATABASE_URL || '').trim();
    if (!url) throw new Error('DATABASE_URL is not set');
    client = neon(url);
  }
  return client;
}

/** Drop the cached client (tests that switch DATABASE_URL). */
export function resetSql() {
  client = null;
}

const sql = (strings, ...values) => getSql()(strings, ...values);
/** Raw parameterised query — used by setup-db for DDL strings. */
sql.query = (text, params = []) => getSql().query(text, params);
export default sql;

/** Convert snake_case DB rows to camelCase for the frontend */
export function toCamel(row) {
  if (!row) return null;
  const out = {};
  for (const [key, val] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = val;
  }
  return out;
}

export function toCamelArray(rows) {
  return rows.map(toCamel);
}
