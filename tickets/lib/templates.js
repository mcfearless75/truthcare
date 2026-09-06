/**
 * Email subject and body builders (spec §6.2). Pure apart from reading the
 * tickets address/domain and APP_URL from config. Everything renders from a
 * plain JSON payload (camelCase ticket row + optional note/event/assignee) so
 * pending_notifications.payload can be rendered later by the retry cron
 * exactly as it would have been at queue time.
 *
 * Two audiences:
 *   staff  — full detail, board link, command footer
 *   caller — status + the public note only; never internal notes, never the
 *            assignee's email, never the command footer
 */
import { COMMAND_HELP } from './commands.js';
import { buildReplyTo } from './threading.js';
import { appUrl, ticketsDomain, ticketsLocalPart } from './config.js';

export const CATEGORY_LABELS = { referral: 'Referral', staff: 'Staff', resident_concern: 'Resident concern', general: 'General' };
export const STATUS_LABELS = { open: 'Open', in_progress: 'In progress', closed: 'Closed' };
export const SOURCE_LABELS = { phone: 'phone call', email: 'email', board: 'the board' };
export const SUBJECT_MAX = 150;
export const KINDS = ['created', 'assigned', 'updated', 'closed', 'caller_reply', 'bounce', 'failed_calls'];

const NAVY = '#0f2c3f';
const ORANGE = '#f5921e';
const INK = '#1a1a1a';
const MUTED = '#5a6570';

export function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const nl2br = (s) => escapeHtml(s).replace(/\n/g, '<br>');

/** Priority tag for subjects — only high/urgent carry one. */
export function priorityTag(priority) {
  if (priority === 'urgent') return '[URGENT]';
  if (priority === 'high') return '[HIGH]';
  return '';
}

export function categoryLabel(category) {
  return CATEGORY_LABELS[category] || 'General';
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || String(status || 'Open');
}

/** `[TC-42] [URGENT] Resident concern — Jane Smith re: Michael` */
export function ticketSubject(ticket) {
  const tag = priorityTag(ticket.priority);
  const caller = String(ticket.callerName || '').trim() || 'Unknown caller';
  const re = String(ticket.subjectPerson || ticket.subject || '').trim();
  let s = `[TC-${ticket.number}]${tag ? ` ${tag}` : ''} ${categoryLabel(ticket.category)} — ${caller}${re ? ` re: ${re}` : ''}`;
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > SUBJECT_MAX) s = `${s.slice(0, SUBJECT_MAX - 1)}…`;
  return s;
}

/** Caller-facing subject keeps [TC-n] (tier-3 threading) but no priority tag or category. */
export function callerSubject(ticket, kind) {
  const tail = kind === 'closed' ? 'your message has been closed' : 'an update on your message';
  return `[TC-${ticket.number}] Truth Care Group — ${tail}`;
}

export function replyToFor(ticket) {
  return buildReplyTo(ticket.number, ticket.emailToken, ticketsDomain(), ticketsLocalPart());
}

export function boardUrl(ticket) {
  return `${appUrl()}/t/${ticket.number}`;
}

export function commandFooterText() {
  return ['Reply with a command on its own line:', ...COMMAND_HELP.map(([cmd, meaning]) => `  ${cmd}  —  ${meaning}`)].join('\n');
}

export function commandFooterHtml() {
  const rows = COMMAND_HELP.map(([cmd, meaning]) => `<tr><td style="padding:3px 12px 3px 0;white-space:nowrap;font-family:Menlo,Consolas,monospace;font-size:12px;color:${NAVY}">${escapeHtml(cmd)}</td><td style="padding:3px 0;font-size:12px;color:${MUTED}">${escapeHtml(meaning)}</td></tr>`).join('');
  return `<p style="margin:0 0 6px;font-size:13px;font-weight:600;color:${NAVY}">Reply with a command on its own line:</p><table cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table>`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function wrapHtml({ title, bodyHtml, footerHtml }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK}">
<div style="max-width:620px;margin:24px auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e3e8ec">
  <div style="background:${NAVY};padding:18px 28px;border-bottom:4px solid ${ORANGE}"><span style="color:#ffffff;font-size:18px;font-weight:600;letter-spacing:.3px">Truth Care Group</span><span style="color:#cfd8de;font-size:13px;margin-left:10px">${escapeHtml(title)}</span></div>
  <div style="padding:24px 28px;font-size:15px;line-height:1.5">${bodyHtml}</div>
  ${footerHtml ? `<div style="background:#f8fafb;border-top:1px solid #e3e8ec;padding:16px 28px">${footerHtml}</div>` : ''}
  <div style="padding:12px 28px;font-size:11px;color:${MUTED}">Truth Care Group · Weston-super-Mare · automated ticket email</div>
</div></body></html>`;
}

function badge(text, colour) {
  return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${colour};color:#fff;font-size:12px;font-weight:600;margin-right:6px">${escapeHtml(text)}</span>`;
}

function priorityColour(p) {
  return p === 'urgent' ? '#b42318' : p === 'high' ? ORANGE : MUTED;
}

function detailRows(ticket, assignee) {
  const rows = [];
  const callerBits = [ticket.callerName, ticket.callerOrg ? `(${ticket.callerOrg})` : '', ticket.callerPhone, ticket.callerEmail].filter(Boolean).join(' · ');
  rows.push(['Caller', callerBits || 'Unknown']);
  if (ticket.subjectPerson) rows.push(['About', ticket.subjectPerson]);
  rows.push(['Category', categoryLabel(ticket.category)]);
  rows.push(['Status', statusLabel(ticket.status)]);
  rows.push(['Priority', String(ticket.priority || 'normal')]);
  rows.push(['Assigned to', assignee?.name || 'Unassigned']);
  rows.push(['Logged', `via ${SOURCE_LABELS[ticket.source] || ticket.source || 'unknown'} ${formatDate(ticket.createdAt)}`.trim()]);
  return rows;
}

function rowsText(rows) {
  return rows.map(([k, v]) => `${k}: ${v}`).join('\n');
}

function rowsHtml(rows) {
  return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:14px 0">${rows.map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;font-size:13px;color:${MUTED};vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:4px 0;font-size:14px">${escapeHtml(v)}</td></tr>`).join('')}</table>`;
}

function eventLine(event) {
  if (!event) return '';
  const who = event.actor ? ` by ${event.actor}` : '';
  switch (event.event) {
    case 'assigned': return `Assigned to ${event.toValue || 'nobody'}${who}`;
    case 'status': return `Status changed from ${statusLabel(event.fromValue)} to ${statusLabel(event.toValue)}${who}`;
    case 'priority': return `Priority changed from ${event.fromValue} to ${event.toValue}${who}`;
    case 'category': return `Category changed from ${categoryLabel(event.fromValue)} to ${categoryLabel(event.toValue)}${who}`;
    default: return `${event.event}${event.toValue ? `: ${event.toValue}` : ''}${who}`;
  }
}

const STAFF_HEADINGS = {
  created: (t) => `New ${categoryLabel(t.category).toLowerCase()} ticket`,
  assigned: () => 'Assigned to you',
  updated: () => 'Ticket updated',
  closed: () => 'Ticket closed',
};

/** Staff-facing email for created | assigned | updated | closed. */
export function renderStaffEmail({ kind, ticket, assignee = null, note = null, event = null }) {
  const heading = (STAFF_HEADINGS[kind] || STAFF_HEADINGS.updated)(ticket);
  const rows = detailRows(ticket, assignee);
  const ev = eventLine(event);
  const noteLabel = note ? `${note.isInternal ? 'Internal note' : 'Note'} from ${note.authorName || note.authorType || 'unknown'}` : '';

  const text = [
    `${heading} — TC-${ticket.number}${ticket.priority && ticket.priority !== 'normal' ? ` (${ticket.priority.toUpperCase()})` : ''}`,
    '',
    ticket.summary ? `Summary:\n${ticket.summary}` : '',
    '',
    rowsText(rows),
    ev ? `\n${ev}` : '',
    note ? `\n${noteLabel}:\n${note.body}` : '',
    '',
    `Open on the board: ${boardUrl(ticket)}`,
    '',
    commandFooterText(),
  ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n').trim();

  const bodyHtml = [
    `<h2 style="margin:0 0 10px;font-size:20px;color:${NAVY}">${escapeHtml(heading)} <span style="color:${MUTED};font-weight:400">TC-${ticket.number}</span></h2>`,
    `<p style="margin:0 0 12px">${badge(statusLabel(ticket.status), NAVY)}${badge(String(ticket.priority || 'normal').toUpperCase(), priorityColour(ticket.priority))}${badge(categoryLabel(ticket.category), MUTED)}</p>`,
    ticket.summary ? `<p style="margin:0 0 6px;font-size:13px;color:${MUTED}">Summary</p><p style="margin:0 0 14px;white-space:pre-wrap">${nl2br(ticket.summary)}</p>` : '',
    rowsHtml(rows),
    ev ? `<p style="margin:0 0 12px;padding:10px 12px;background:#fff6ea;border-left:3px solid ${ORANGE};font-size:14px">${escapeHtml(ev)}</p>` : '',
    note ? `<p style="margin:0 0 4px;font-size:13px;color:${MUTED}">${escapeHtml(noteLabel)}</p><blockquote style="margin:0 0 14px;padding:10px 12px;border-left:3px solid ${NAVY};background:#f4f6f8;white-space:pre-wrap">${nl2br(note.body)}</blockquote>` : '',
    `<p style="margin:14px 0 0"><a href="${escapeHtml(boardUrl(ticket))}" style="display:inline-block;padding:10px 16px;background:${ORANGE};color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Open on the board</a></p>`,
  ].join('');

  return { subject: ticketSubject(ticket), html: wrapHtml({ title: heading, bodyHtml, footerHtml: commandFooterHtml() }), text };
}

/** Caller-facing email for caller_reply (a public note) or closed. Never includes internal content. */
export function renderCallerEmail({ kind, ticket, note = null }) {
  const closed = kind === 'closed';
  const greeting = `Hello${ticket.callerName ? ` ${ticket.callerName}` : ''},`;
  const intro = closed
    ? `Your message to Truth Care Group (reference TC-${ticket.number}) has now been closed.`
    : `There is an update on your message to Truth Care Group (reference TC-${ticket.number}).`;
  const publicNote = note && !note.isInternal ? note.body : '';
  const outro = 'If you need to add anything, simply reply to this email and it will be attached to the same reference.';

  const text = [greeting, '', intro, publicNote ? `\n${publicNote}` : '', '', outro, '', 'Truth Care Group'].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n').trim();
  const bodyHtml = [
    `<p style="margin:0 0 12px">${escapeHtml(greeting)}</p>`,
    `<p style="margin:0 0 12px">${escapeHtml(intro)}</p>`,
    publicNote ? `<blockquote style="margin:0 0 14px;padding:10px 12px;border-left:3px solid ${NAVY};background:#f4f6f8;white-space:pre-wrap">${nl2br(publicNote)}</blockquote>` : '',
    `<p style="margin:0 0 12px;color:${MUTED};font-size:14px">${escapeHtml(outro)}</p>`,
    '<p style="margin:0">Truth Care Group</p>',
  ].join('');
  return { subject: callerSubject(ticket, closed ? 'closed' : 'update'), html: wrapHtml({ title: closed ? 'Message closed' : 'Update', bodyHtml, footerHtml: '' }), text };
}

/** Bounce-back to a staff sender whose reply contained a command we could not understand. */
export function renderBounceEmail({ ticket, unknown = [], messages = [] }) {
  const heading = "Couldn't understand your reply";
  const lines = messages.length ? messages : unknown.map((u) => `Couldn't understand '${u}'`);
  const ref = ticket ? `TC-${ticket.number}` : 'your message';
  const text = [heading, '', `Nothing was changed on ${ref}. These lines looked like commands but were not recognised:`, ...lines.map((l) => `  - ${l}`), '', 'Send a new reply using one of these:', '', commandFooterText()].join('\n');
  const bodyHtml = [
    `<h2 style="margin:0 0 10px;font-size:20px;color:${NAVY}">${escapeHtml(heading)}</h2>`,
    `<p style="margin:0 0 12px">Nothing was changed on <strong>${escapeHtml(ref)}</strong>. These lines looked like commands but were not recognised:</p>`,
    `<ul style="margin:0 0 14px;padding-left:20px">${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`,
    '<p style="margin:0">Send a new reply using one of the commands below.</p>',
  ].join('');
  const subject = ticket ? `${ticketSubject(ticket)} — command not understood` : 'Truth Care Tickets — command not understood';
  return { subject, html: wrapHtml({ title: 'Bounce', bodyHtml, footerHtml: commandFooterHtml() }), text };
}

/** Admin alert listing failed Retell function calls (spec §8). */
export function renderFailedCallsAlert({ rows = [] }) {
  const heading = `${rows.length} failed phone call${rows.length === 1 ? ' needs' : 's need'} attention`;
  const line = (r) => `${formatDate(r.createdAt)} · ${r.action} · call ${r.retellCallId || 'unknown'} · ${r.error || 'no error text'}\n    args: ${JSON.stringify(r.args || {})}`;
  const text = [heading, '', 'The phone agent told the caller "the team will pick this up", but no ticket was created for these calls. Raw arguments are below so a ticket can be raised by hand.', '', ...rows.map(line)].join('\n');
  const bodyHtml = [
    `<h2 style="margin:0 0 10px;font-size:20px;color:${NAVY}">${escapeHtml(heading)}</h2>`,
    '<p style="margin:0 0 12px">The phone agent told the caller "the team will pick this up", but no ticket was created for these calls. Raw arguments are below so a ticket can be raised by hand.</p>',
    ...rows.map((r) => `<div style="margin:0 0 12px;padding:10px 12px;border-left:3px solid #b42318;background:#fff4f2;font-size:13px"><strong>${escapeHtml(formatDate(r.createdAt))}</strong> · ${escapeHtml(r.action)} · call ${escapeHtml(r.retellCallId || 'unknown')}<br>${escapeHtml(r.error || 'no error text')}<pre style="margin:6px 0 0;white-space:pre-wrap;font-size:12px">${escapeHtml(JSON.stringify(r.args || {}, null, 2))}</pre></div>`),
  ].join('');
  return { subject: `[Tickets] ${heading}`, html: wrapHtml({ title: 'Failed calls', bodyHtml, footerHtml: '' }), text };
}

/**
 * Daily digest (spec addendum 2026-09-06): sent once a day to the care-
 * management leads, not queued through pending_notifications like the
 * per-ticket emails — lib/digest.js sends it directly, so this renderer
 * takes plain stats rather than a payload shape.
 */
export function renderDigestEmail({ createdLast24h = 0, closedLast24h = 0, open = [] } = {}) {
  const heading = 'Daily ticket summary';
  const dateLabel = formatDate(new Date().toISOString());
  const hasUrgent = open.some((t) => t.priority === 'urgent');

  const rowText = (t) => `TC-${t.number} · ${String(t.priority || 'normal').toUpperCase()} · ${categoryLabel(t.category)} · ${t.callerName || 'Unknown caller'} · ${statusLabel(t.status)} · ${t.assigneeName || 'Unassigned'}`;
  const text = [
    `${heading} — ${dateLabel}`,
    '',
    `New in the last 24h: ${createdLast24h}`,
    `Closed in the last 24h: ${closedLast24h}`,
    `Currently open: ${open.length}`,
    '',
    open.length ? 'Open tickets:' : 'No open tickets.',
    ...open.map(rowText),
    '',
    `Board: ${appUrl()}`,
  ].join('\n').trim();

  const rowHtml = (t) => `<tr><td style="padding:6px 10px 6px 0;font-size:13px;white-space:nowrap"><a href="${escapeHtml(boardUrl(t))}" style="color:${NAVY};font-weight:600;text-decoration:none">TC-${t.number}</a></td><td style="padding:6px 6px 6px 0;white-space:nowrap">${badge(String(t.priority || 'normal').toUpperCase(), priorityColour(t.priority))}${badge(categoryLabel(t.category), MUTED)}</td><td style="padding:6px 6px 6px 0;font-size:13px">${escapeHtml(t.callerName || 'Unknown caller')}</td><td style="padding:6px 0;font-size:13px;color:${MUTED}">${escapeHtml(t.assigneeName || 'Unassigned')}</td></tr>`;
  const bodyHtml = [
    `<h2 style="margin:0 0 10px;font-size:20px;color:${NAVY}">${escapeHtml(heading)}</h2>`,
    `<p style="margin:0 0 14px;color:${MUTED};font-size:13px">${escapeHtml(dateLabel)}</p>`,
    `<p style="margin:0 0 14px">${badge(`${createdLast24h} new`, NAVY)}${badge(`${closedLast24h} closed`, MUTED)}${badge(`${open.length} open`, hasUrgent ? priorityColour('urgent') : MUTED)}</p>`,
    open.length
      ? `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">${open.map(rowHtml).join('')}</table>`
      : `<p style="margin:0 0 14px;color:${MUTED}">No open tickets — nice and clear.</p>`,
    `<p style="margin:14px 0 0"><a href="${escapeHtml(appUrl())}" style="display:inline-block;padding:10px 16px;background:${ORANGE};color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Open the board</a></p>`,
  ].join('');

  return { subject: `[Tickets] Daily summary — ${createdLast24h} new, ${open.length} open`, html: wrapHtml({ title: 'Daily summary', bodyHtml, footerHtml: '' }), text };
}

/**
 * Single entry point used by lib/notify.js. `payload` is the JSON stored in
 * pending_notifications: { audience?, ticket, assignee?, note?, event?, unknown?, messages?, rows? }.
 */
export function renderEmail(kind, payload = {}) {
  if (!KINDS.includes(kind)) throw new Error(`Unknown email kind: ${kind}`);
  if (kind === 'bounce') return renderBounceEmail(payload);
  if (kind === 'failed_calls') return renderFailedCallsAlert(payload);
  if (kind === 'caller_reply' || payload.audience === 'caller') return renderCallerEmail({ kind, ticket: payload.ticket, note: payload.note });
  return renderStaffEmail({ kind, ticket: payload.ticket, assignee: payload.assignee, note: payload.note, event: payload.event });
}
