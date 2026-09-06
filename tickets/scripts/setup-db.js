/**
 * Idempotent schema for the tickets service (spec §5 plus the settings table
 * used for the poll cursor and cron lease). Run: `node scripts/setup-db.js`.
 * Every statement is CREATE ... IF NOT EXISTS so re-running is safe.
 */
import sql from '../lib/db.js';

export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS staff (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     name text NOT NULL,
     email text NOT NULL UNIQUE,
     aliases text[] NOT NULL DEFAULT '{}',
     role text NOT NULL DEFAULT 'agent' CHECK (role IN ('admin','agent')),
     receives_new_tickets boolean NOT NULL DEFAULT true,
     active boolean NOT NULL DEFAULT true,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS tickets (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     number serial UNIQUE,
     status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','closed')),
     priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','high','urgent')),
     category text NOT NULL CHECK (category IN ('referral','staff','resident_concern','general')),
     source text NOT NULL CHECK (source IN ('phone','email','board')),
     subject text,
     summary text,
     caller_name text,
     caller_phone text,
     caller_email text,
     caller_org text,
     subject_person text,
     assigned_to uuid NULL REFERENCES staff(id),
     email_token text NOT NULL UNIQUE,
     graph_conversation_id text,
     retell_call_id text,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now(),
     closed_at timestamptz
   )`,
  `CREATE TABLE IF NOT EXISTS ticket_notes (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
     body text NOT NULL,
     author_type text NOT NULL CHECK (author_type IN ('staff','caller','system','ai')),
     author_name text,
     author_email text,
     is_internal boolean NOT NULL DEFAULT true, -- fail closed: an insert that omits the column is never accidentally public
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS ticket_events (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
     event text NOT NULL,
     actor text,
     from_value text,
     to_value text,
     via text NOT NULL CHECK (via IN ('phone','email','board','cron')),
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS processed_messages (
     internet_message_id text PRIMARY KEY,
     ticket_id uuid NULL REFERENCES tickets(id) ON DELETE SET NULL,
     outcome text,
     processed_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS pending_notifications (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     ticket_id uuid NULL REFERENCES tickets(id) ON DELETE CASCADE,
     kind text NOT NULL,
     recipient text NOT NULL,
     payload jsonb NOT NULL DEFAULT '{}'::jsonb,
     attempts int NOT NULL DEFAULT 0,
     last_error text,
     next_attempt_at timestamptz NOT NULL DEFAULT now(),
     created_at timestamptz NOT NULL DEFAULT now(),
     sent_at timestamptz
   )`,
  `CREATE TABLE IF NOT EXISTS failed_calls (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     retell_call_id text,
     action text NOT NULL,
     args jsonb,
     error text,
     alerted_at timestamptz,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS settings (
     key text PRIMARY KEY,
     value text NOT NULL,
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS tickets_email_token_idx ON tickets(email_token)`,
  `CREATE INDEX IF NOT EXISTS tickets_conversation_idx ON tickets(graph_conversation_id)`,
  `CREATE INDEX IF NOT EXISTS tickets_status_priority_created_idx ON tickets(status, priority, created_at)`,
  `CREATE INDEX IF NOT EXISTS tickets_retell_call_idx ON tickets(retell_call_id)`,
  `CREATE INDEX IF NOT EXISTS ticket_notes_ticket_idx ON ticket_notes(ticket_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS ticket_events_ticket_idx ON ticket_events(ticket_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS pending_notifications_due_idx ON pending_notifications(sent_at, next_attempt_at)`,
];

export async function createSchema(db = sql) {
  for (const statement of SCHEMA_STATEMENTS) {
    await db.query(statement);
  }
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').replace(/^.*\//, ''));
if (isMain) {
  createSchema()
    .then(() => { console.log(`Schema ready (${SCHEMA_STATEMENTS.length} statements).`); })
    .catch((e) => { console.error('setup-db failed:', e.message); process.exit(1); });
}
