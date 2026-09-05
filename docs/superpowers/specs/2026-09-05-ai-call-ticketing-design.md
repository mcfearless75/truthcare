# AI Call Answering + Email Ticketing — Design Spec

**Date:** 5 September 2026
**Status:** Approved in brainstorming (this session); implementation planning follows.
**Trigger:** "like we have with TrakNet — can we implement an AI call system that creates a ticket and logs it in a system for Truth Care? Tickets can be checked, edited, assigned and closed — all via email also — MS 365 via GoDaddy."

---

## 1. Decisions made during brainstorming

| Question | Decision |
|---|---|
| Which calls | All: referrals/enquiries, staff calls, resident concerns, general |
| When the AI answers | **Overflow only** — landline rings first; forward-on-no-answer (~20s) and out-of-hours → Retell number |
| Staff interface | **Email-first.** Commands in reply emails; a small read-mostly web board for oversight |
| Who works tickets | Small allowlist (management team), seeded by script, editable on the board |
| M365 access | Full tenant admin confirmed → Microsoft Graph client-credentials, same as TrakNet |
| Mailbox | `tickets@truthcaregroup.co.uk` is an **alias on `infotech@truthcaregroup.co.uk`** (not its own mailbox) |
| Urgent handling | Email only, flagged `[URGENT]` in subject. SMS/live transfer deliberately out of scope for launch |
| Approach | New small service inspired by TrakNet — not a fork, not Power Automate |

## 2. Non-negotiables / constraints

- **Retell AI** for telephony, using mid-call function calling so the ticket exists before the caller hangs up. Same pattern as TrakNet's `lib/retell.js` (HMAC signature verification) — copied verbatim.
- **Transcripts contain special-category health data.** Retell: DPA signed, call **recording off**, transcript retention set to the minimum the dashboard allows. Our DB: retention cron (§5) anonymises closed tickets after 12 months.
- **Marketing site untouched.** `site/` stays a static, cookie-free Next.js export. This service is a separate deployable.
- **Never 500 to Retell mid-call.** Every failure path returns a speakable 200.
- **Nothing silently dropped.** Every inbound email either matches a ticket, creates one, or produces a bounce-back.
- **Both `tickets@` and `infotech@` are treated as "our own" addresses** for loop protection.

## 3. Architecture

```
Caller ──► Truth Care landline (no answer 20s / out of hours)
              │ forward-on-no-answer
              ▼
          Retell AI agent ──(mid-call function call, HMAC-signed)──► POST /api/phone
                                                                        │
                                                                        ▼
Staff Outlook ◄── Graph sendMail (from: tickets@) ◄── tickets service ──► Neon Postgres
      │                                                    ▲
      │ reply / new mail to tickets@ (alias of infotech@)  │ cron every 5 min
      └──────► infotech@ mailbox ◄──── Graph poll ─────────┘

Manager browser ──► tickets.truthcaregroup.co.uk (board, Sign in with Microsoft)
```

- **Location:** `tickets/` folder in the `truthcare` repo. Own Vercel project `truthcare-tickets` (root directory `tickets`), domain `tickets.truthcaregroup.co.uk`.
- **Runtime:** Vercel serverless functions, plain Node ESM, `api/<area>/index.js` + `?action=` routing (TrakNet shape). Neon serverless Postgres via `@neondatabase/serverless`, no ORM. Schema in `scripts/setup-db.js`.
- **Three inbound doors, one write path:** phone (Retell), email (Graph poll), board. All go through `lib/tickets.js` → `createTicket()` and `applyCommand()` so behaviour is identical regardless of source.
- **Outbound is email only.**
- **Lifted from TrakNet** (`C:\Users\LAPTOP80\Projects\traknet`): `lib/retell.js`; `lib/email.js` (Graph token + sendMail); the polling loop, `conversationId` threading and auto-reply/own-mail filters from `lib/handlers/tickets/cron.js`; the classify-with-regex-fallback pattern from `lib/handlers/tickets/classify.js`; `lib/cron-auth.js`.

### 3.1 File layout

```
tickets/
  package.json          # type: module; deps: @neondatabase/serverless, jose
  vercel.json           # crons, rewrites for board routes
  api/
    phone/index.js      # Retell function calls + post-call webhook
    cron/index.js       # ?job=email | retention | notifications
    tickets/index.js    # board JSON API (list, get, command)
    auth/index.js       # OIDC login/callback/logout
    staff/index.js      # allowlist CRUD (admin)
  lib/
    db.js               # neon sql tag, toCamel
    retell.js           # copied from TrakNet
    graph.js            # token cache, sendMail(from tickets@), listMessages(infotech@)
    tickets.js          # createTicket, applyCommand, events, notifications fan-out
    commands.js         # email command parser (pure, tested)
    threading.js        # reply-to token, match strategies (pure, tested)
    mailguard.js        # isOwnMail, isAutoReply, recipient filter (pure, tested)
    priority.js         # priority rules (pure, tested)
    templates.js        # email subject/body builders
    auth.js             # JWT cookie, OIDC helpers
    cron-auth.js        # copied from TrakNet
  public/
    index.html, ticket.html, staff.html, app.js, styles.css
  scripts/
    setup-db.js, seed-staff.js, simulate-call.js
  tests/
    commands.test.js, threading.test.js, mailguard.test.js, priority.test.js,
    retention.test.js, integration/email-flow.test.js
```

Every file stays under 500 lines; pure modules (`commands`, `threading`, `mailguard`, `priority`) have no I/O so they test without a DB.

## 4. The phone call

### 4.1 Persona

"Truth Care Group's assistant." Warm, plain-spoken. Says up front it is an automated assistant taking a message because the team can't get to the phone, and that a person will follow up. It **never** gives clinical advice and **never** confirms whether a named person is a resident — it records what the caller says.

**Emergency guard (scripted, not model-decided):** if the caller describes a medical emergency, the agent says to hang up and call 999, then logs an urgent `resident_concern` ticket.

### 4.2 Triage categories

| Category | Typical caller | Must collect before `create_ticket` | Default priority |
|---|---|---|---|
| `referral` | family, social worker, commissioner, case manager | caller name, org, phone; who the enquiry is about (first name only); condition in caller's words; funding route if known | `high` |
| `staff` | employee | name, shift affected, reason (sick/late/cover), next expected in | `normal` (`urgent` if shift starts < 4h) |
| `resident_concern` | family, professional | caller name, phone; who it's about; the concern in their words | always `urgent` |
| `general` | suppliers, maintenance, anything else | name, phone, what it's about | `normal` |

**Priority escalation words** (any category → `urgent`): emergency, safeguarding, tonight, now, immediately, police, hospital. Implemented in `lib/priority.js` as a pure function over `(category, summary, shiftStartsAt?)`; the agent may also pass an explicit `priority` which is honoured only if it *raises* the computed one.

### 4.3 Function calls (Retell custom functions → `POST /api/phone?action=<name>`)

All verified with `lib/retell.js`. Caller-ID from Retell's `call.from_number` is the default phone; a number the caller speaks wins.

- **`create_ticket(category, priority?, caller_name, caller_phone?, caller_email?, caller_org?, subject_person?, summary)`**
  Returns `{ result: "I've logged that as ticket 42 and the team will be in touch." }`. Validation failures (missing name/summary) return **200** with a prompt like *"Could you ask the caller for their name?"* so the call never drops.
- **`lookup_ticket(ticket_number, caller_phone?)`**
  Returns status + latest **public** note only, and only when the phone (spoken or caller-ID) matches `tickets.caller_phone` after E.164 normalisation. Otherwise: *"I can't find a ticket with those details."* Nothing else is ever disclosed.

### 4.4 Post-call webhook (`POST /api/phone?action=webhook`, event `call_analyzed`)

Stores Retell's transcript and summary as an `ai` internal note on the ticket matched by `retell_call_id`. If no ticket was created (caller hung up early), creates a `general` ticket from the summary so the missed call is still visible.

## 5. Data model

Deliberately smaller than TrakNet: no orgs, no groups, no SLA, no clients.

```sql
tickets (
  id uuid pk, number serial unique,
  status text check in ('open','in_progress','closed') default 'open',
  priority text check in ('normal','high','urgent') default 'normal',
  category text check in ('referral','staff','resident_concern','general'),
  source text check in ('phone','email','board'),
  subject text, summary text,
  caller_name text, caller_phone text, caller_email text, caller_org text,
  subject_person text,
  assigned_to uuid null references staff(id),
  email_token text unique,              -- 8 chars, base32, used in reply-to
  graph_conversation_id text,
  retell_call_id text,
  created_at, updated_at, closed_at timestamptz
)
ticket_notes (
  id, ticket_id fk, body text,
  author_type text check in ('staff','caller','system','ai'),
  author_name, author_email, is_internal bool, created_at
)
staff (
  id, name, email unique, aliases text[], role check in ('admin','agent'),
  receives_new_tickets bool default true, active bool default true
)
ticket_events (
  id, ticket_id fk, event text, actor text, from_value text, to_value text,
  via text check in ('phone','email','board','cron'), created_at
)
processed_messages ( internet_message_id text pk, ticket_id, processed_at )
pending_notifications ( id, ticket_id, kind, recipient, payload jsonb,
                        attempts int default 0, last_error, created_at, sent_at )
failed_calls ( id, retell_call_id, action, args jsonb, error, created_at )
```

Indexes: `tickets(email_token)`, `tickets(graph_conversation_id)`, `tickets(status, priority, created_at)`, `tickets(retell_call_id)`.

**Retention** (`?job=retention`, weekly): for tickets `closed_at < now() - 12 months`, set `caller_name/phone/email/org/subject_person` to `'[redacted]'`, delete `ticket_notes` where `author_type='ai'`, and truncate `summary` to its first 80 chars. `number`, `category`, timestamps stay for statistics.

## 6. Email

### 6.1 Mailbox mechanics (alias on `infotech@`)

- Graph reads `/users/infotech@truthcaregroup.co.uk/messages` and processes **only** messages whose To/Cc contains `tickets@truthcaregroup.co.uk` or `tickets+<tag>@truthcaregroup.co.uk` (`lib/mailguard.js → isForTickets`). All other mail in the inbox is ignored and untouched.
- **No `isRead` mutation.** Cursor = `receivedDateTime ge <last poll − 10 min>` plus `processed_messages` dedupe on `internetMessageId`. Humans reading `infotech@` see no side effects.
- Plus-addressing on an alias delivers to `infotech@` in Exchange Online, so the reply-to token scheme works.
- **Send from alias:** `POST /users/infotech@…/sendMail` with `from: tickets@…` and `saveToSentItems: false`. Requires tenant setting `Set-OrganizationConfig -SendFromAliasEnabled $true` (prerequisite §10).
- Exchange **application access policy** restricts the app registration to `infotech@` only.

### 6.2 Outbound

From `Truth Care Tickets <tickets@truthcaregroup.co.uk>`:

- **Subject:** `[TC-42] [URGENT] Resident concern — <caller> re: <subject_person|subject>`. Priority tag only for `high`/`urgent`.
- **Reply-To:** `tickets+tc42-<email_token>@truthcaregroup.co.uk`.
- **Body:** summary, caller details, category, status, assignee, then a short *"Reply with a command"* footer listing the commands in §6.3.

| Event | Recipients |
|---|---|
| Ticket created | all `staff` with `receives_new_tickets` |
| Assigned | assignee |
| Status/priority change, staff note | assignee + every staff who has replied on the thread |
| Public note / closure | as above **+ `caller_email`** if present and note is not internal |

Sends go through `pending_notifications` and are attempted immediately, then retried by `?job=notifications` (max 5 attempts, exponential backoff; after that flagged on the board).

### 6.3 Inbound commands

`lib/commands.js → parseCommands(bodyText)`: strip everything from the first quoted-reply marker (`From:`, `On … wrote:`, `-----Original Message-----`, `> `) downward; each remaining non-empty line is tried as a command; leftover lines join into a note.

| Staff writes | Effect |
|---|---|
| `assign joanne` / `assign to jo` / `@joanne` | resolve via `staff.name`/`aliases` (case-insensitive prefix match; ambiguity → bounce) |
| `mine` / `take` | assign to sender |
| `close` / `closed` / `resolved` / `done` | status → `closed` |
| `reopen` / `open` | status → `open` |
| `in progress` / `working on it` / `started` | status → `in_progress` |
| `urgent` / `priority high` / `priority normal` | priority |
| `category staff|referral|resident|general` | recategorise |
| `internal: …` or line starting `#` | internal note (never sent to caller) |
| anything else | public note; sent to `caller_email` if present |

Unknown/ambiguous command → system note *"Couldn't understand 'asign jo' — did you mean assign?"* + bounce-back email to sender listing commands. Unknown-word lines are treated as note text only if **no** line in the message looked like a failed command.

**Authority:** only active `staff` emails may issue commands. Mail from anyone else:
- matches a ticket → added as a `caller` note; assignee (or new-ticket recipients if unassigned) notified
- no match → **new ticket**, `source=email`, sender as caller, subject as subject. Category/priority via Claude classification (`claude-haiku-4-5-20251001`, 300 tokens, JSON out) with regex fallback; staff can correct with one reply.

### 6.4 Threading (`lib/threading.js`)

1. `tickets+tc<number>-<token>@` in any To/Cc → exact match (token must match; number alone is not trusted)
2. `graph_conversation_id`
3. Sender email == `caller_email` AND normalised subject contains `[TC-<n>]`
4. No match → new ticket

### 6.5 Guards (`lib/mailguard.js`)

- `isOwnMail`: from `tickets@` or `infotech@` → skip
- `isAutoReply`: `Auto-Submitted`, `X-Autoreply`, `Precedence: bulk`, subjects matching `/^(automatic reply|out of office|undeliverable|delivery status)/i` → skip
- Cap 20 messages per cron run; advisory lock `pg_try_advisory_lock(4201)` so overlapping crons exit.

## 7. Board + auth

- **Sign in with Microsoft**: Entra OIDC (same app registration; `openid profile email`; single-tenant). Callback checks `email` against active `staff`; non-members get "not on the list — ask an admin". Session = `jose` HS256 JWT in an `HttpOnly; Secure; SameSite=Lax` cookie, 12h.
- **Pages** (vanilla HTML/JS, Truth Care palette from `site/`):
  - `/` — list; filters status/priority/category/assignee; urgent first, then newest
  - `/t/42` — detail: thread, events, actions (assign, status, priority, note/internal note). Actions call the **same `applyCommand`** as email, so notifications are identical.
  - `/staff` — admin only: add/deactivate staff, edit aliases and `receives_new_tickets`
- JSON API under `/api/tickets` and `/api/staff`, cookie-authenticated, admin checks on staff mutations.

## 8. Error handling

| Failure | Behaviour |
|---|---|
| Retell function call throws (DB down, bug) | 200 with *"I've got your details — the team will pick this up"*; raw args → `failed_calls`; alert email to admins on next cron |
| Retell signature invalid | 401, logged, no body processing |
| Graph token/send fails | ticket still saved; notification queued in `pending_notifications`, retried |
| Inbound email matches nothing | new ticket, never dropped |
| Command ambiguous/unknown | bounce-back + system note |
| Cron overlap | advisory lock; second run exits 200 `{skipped:true}` |
| Claude classification fails | regex fallback → `general`/`normal` |

## 9. Testing

- **Unit** (`node --test`, no framework): `commands` (every table row, typos, quoted-reply stripping, `#` internal marker), `threading` (token round-trip, tier order, wrong-token rejection), `mailguard` (recipient filter incl. plus-addresses, own-mail, auto-reply headers), `priority` (category defaults, escalation words, 4h shift rule, explicit-only-raises), retention SQL builder.
- **Integration** (`tests/integration/email-flow.test.js`): fake Graph HTTP server; poll → new ticket → staff reply `assign jo` → assignment notification → `close` → closure email to caller.
- **Phone**: `scripts/simulate-call.js` posts HMAC-signed `create_ticket` / `lookup_ticket` / `call_analyzed` payloads at a local or preview URL.
- **Manual acceptance before go-live**: ring from a mobile, let it overflow, complete one referral call and one staff-sickness call; confirm both emails arrive, `assign` and `close` replies work, ticket shows on the board, caller receives closure email.

## 10. Prerequisites (client side, not code)

1. **Entra app registration** — application permissions `Mail.Read`, `Mail.Send` (admin-consented); web redirect URI `https://tickets.truthcaregroup.co.uk/api/auth?action=callback`; client secret. Exchange: `New-ApplicationAccessPolicy -AppId <id> -PolicyScopeGroupId infotech@truthcaregroup.co.uk -AccessRight RestrictAccess`.
2. **Send from alias**: `Set-OrganizationConfig -SendFromAliasEnabled $true`.
3. **Retell**: account, UK number, DPA signed, recording **off**, minimum transcript retention, agent configured with the two custom functions + webhook URL + prompt from `tickets/docs/agent-prompt.md`.
4. **Telephony**: landline forward-on-no-answer (20s) and out-of-hours forward → Retell number.
5. **Infra**: Neon project (EU region), Vercel project `truthcare-tickets` (root `tickets`), DNS `tickets` CNAME → Vercel.

### Environment variables

```
DATABASE_URL
MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET
MAILBOX_ADDRESS=infotech@truthcaregroup.co.uk
TICKETS_ADDRESS=tickets@truthcaregroup.co.uk
RETELL_API_KEY, RETELL_WEBHOOK_SECRET
ANTHROPIC_API_KEY
JWT_SECRET, CRON_SECRET
APP_URL=https://tickets.truthcaregroup.co.uk
```

## 11. Out of scope (named, not forgotten)

- SMS or live-transfer escalation for urgent tickets
- Graph change-notification webhooks (5-min polling is the launch design)
- Attachments on inbound email (ignored at launch; noted in the ticket as "had N attachments")
- Multi-site / org model
- Mobile app wrapper
