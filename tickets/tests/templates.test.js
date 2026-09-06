import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ticketSubject, priorityTag, callerSubject, replyToFor, boardUrl, escapeHtml, renderEmail,
  renderStaffEmail, renderCallerEmail, renderBounceEmail, renderFailedCallsAlert, renderDigestEmail, commandFooterText, KINDS, SUBJECT_MAX,
} from '../lib/templates.js';

const ticket = (over = {}) => ({
  id: 'uuid-1', number: 42, status: 'open', priority: 'urgent', category: 'resident_concern', source: 'phone',
  subject: 'Concern about care', summary: 'Daughter worried about bruising on arm.\nWants a call today.',
  callerName: 'Jane Smith', callerPhone: '+447700900123', callerEmail: 'jane@example.com', callerOrg: null,
  subjectPerson: 'Michael', emailToken: 'abcd2345', createdAt: '2026-09-05T10:00:00Z', ...over,
});

beforeEach(() => { delete process.env.TICKETS_ADDRESS; delete process.env.APP_URL; });

test('subject: [TC-42] [URGENT] Resident concern — Jane Smith re: Michael', () => {
  assert.equal(ticketSubject(ticket()), '[TC-42] [URGENT] Resident concern — Jane Smith re: Michael');
});

test('priority tag only for high/urgent; normal has none', () => {
  assert.equal(priorityTag('urgent'), '[URGENT]');
  assert.equal(priorityTag('high'), '[HIGH]');
  assert.equal(priorityTag('normal'), '');
  assert.equal(priorityTag(undefined), '');
  assert.equal(ticketSubject(ticket({ priority: 'high', category: 'referral' })), '[TC-42] [HIGH] Referral — Jane Smith re: Michael');
  assert.equal(ticketSubject(ticket({ priority: 'normal', category: 'general' })), '[TC-42] General — Jane Smith re: Michael');
});

test('subject falls back: subject_person → subject → nothing; unknown caller; truncation', () => {
  assert.equal(ticketSubject(ticket({ priority: 'normal', category: 'staff', subjectPerson: null })), '[TC-42] Staff — Jane Smith re: Concern about care');
  assert.equal(ticketSubject(ticket({ priority: 'normal', category: 'general', subjectPerson: '', subject: '' })), '[TC-42] General — Jane Smith');
  assert.equal(ticketSubject(ticket({ priority: 'normal', category: 'general', callerName: '', subjectPerson: null, subject: null })), '[TC-42] General — Unknown caller');
  const long = ticketSubject(ticket({ subject: 'x'.repeat(300), subjectPerson: null }));
  assert.equal(long.length, SUBJECT_MAX);
  assert.ok(long.endsWith('…'));
  assert.equal(ticketSubject(ticket({ category: 'bogus', priority: 'normal' })), '[TC-42] General — Jane Smith re: Michael');
});

test('caller subject keeps [TC-n] for threading but no priority tag; reply-to and board url', () => {
  assert.equal(callerSubject(ticket(), 'update'), '[TC-42] Truth Care Group — an update on your message');
  assert.equal(callerSubject(ticket(), 'closed'), '[TC-42] Truth Care Group — your message has been closed');
  assert.equal(replyToFor(ticket()), 'tickets+tc42-abcd2345@truthcaregroup.co.uk');
  process.env.TICKETS_ADDRESS = 'help@example.org';
  assert.equal(replyToFor(ticket()), 'help+tc42-abcd2345@example.org');
  delete process.env.TICKETS_ADDRESS;
  assert.equal(boardUrl(ticket()), 'https://tickets.truthcaregroup.co.uk/t/42');
  process.env.APP_URL = 'http://localhost:3000/';
  assert.equal(boardUrl(ticket()), 'http://localhost:3000/t/42');
});

test('staff email carries summary, caller details, assignee, event, note, board link and the command footer', () => {
  const out = renderStaffEmail({ kind: 'updated', ticket: ticket(), assignee: { name: 'Joanne Bray', email: 'jo@truthcaregroup.co.uk' }, note: { body: 'Rang the family <b>twice</b>', authorName: 'Paul', isInternal: true }, event: { event: 'status', fromValue: 'open', toValue: 'in_progress', actor: 'Paul' } });
  assert.equal(out.subject, '[TC-42] [URGENT] Resident concern — Jane Smith re: Michael');
  for (const needle of ['Ticket updated', 'Daughter worried about bruising', 'Jane Smith', '+447700900123', 'jane@example.com', 'Michael', 'Joanne Bray', 'Status changed from Open to In progress by Paul', 'Internal note from Paul', 'Rang the family', 'https://tickets.truthcaregroup.co.uk/t/42', 'Reply with a command', 'assign <name>']) {
    assert.ok(out.text.includes(needle), `text has ${needle}`);
  }
  assert.ok(out.html.includes('Rang the family &lt;b&gt;twice&lt;/b&gt;'), 'note is escaped in html');
  assert.ok(out.html.includes('assign &lt;name&gt;'), 'footer in html');
  assert.ok(out.html.includes('#0f2c3f') && out.html.includes('#f5921e'), 'Truth Care palette');
  assert.ok(renderStaffEmail({ kind: 'created', ticket: ticket() }).text.startsWith('New resident concern ticket — TC-42 (URGENT)'));
  assert.ok(renderStaffEmail({ kind: 'assigned', ticket: ticket() }).text.startsWith('Assigned to you'));
  assert.ok(renderStaffEmail({ kind: 'closed', ticket: ticket({ status: 'closed' }) }).text.includes('Ticket closed'));
  assert.ok(renderStaffEmail({ kind: 'created', ticket: ticket() }).text.includes('Assigned to: Unassigned'));
});

test('caller email: public note only, no internal note, no footer, no assignee email, no board link', () => {
  const pub = renderCallerEmail({ kind: 'caller_reply', ticket: ticket(), note: { body: 'We have a bed from Monday.', authorName: 'Jo', isInternal: false } });
  assert.equal(pub.subject, '[TC-42] Truth Care Group — an update on your message');
  assert.ok(pub.text.includes('Hello Jane Smith,'));
  assert.ok(pub.text.includes('We have a bed from Monday.'));
  for (const banned of ['Reply with a command', 'assign', 'jo@truthcaregroup.co.uk', '/t/42', 'URGENT']) {
    assert.ok(!pub.text.includes(banned) && !pub.html.includes(banned), `caller email must not contain ${banned}`);
  }
  const internal = renderCallerEmail({ kind: 'caller_reply', ticket: ticket(), note: { body: 'SECRET', isInternal: true } });
  assert.ok(!internal.text.includes('SECRET') && !internal.html.includes('SECRET'));
  const closed = renderCallerEmail({ kind: 'closed', ticket: ticket({ callerName: '' }) });
  assert.equal(closed.subject, '[TC-42] Truth Care Group — your message has been closed');
  assert.ok(closed.text.startsWith('Hello,'));
  assert.ok(closed.text.includes('has now been closed'));
});

test('bounce and failed-calls renderers', () => {
  const b = renderBounceEmail({ ticket: ticket(), unknown: ['asign jo'], messages: ["Couldn't understand 'asign jo' — did you mean assign?"] });
  assert.equal(b.subject, '[TC-42] [URGENT] Resident concern — Jane Smith re: Michael — command not understood');
  assert.ok(b.text.includes("did you mean assign?") && b.text.includes('Nothing was changed on TC-42') && b.text.includes(commandFooterText()));
  const b2 = renderBounceEmail({ ticket: null, unknown: ['xyz'] });
  assert.equal(b2.subject, 'Truth Care Tickets — command not understood');
  assert.ok(b2.text.includes("Couldn't understand 'xyz'"));
  const f = renderFailedCallsAlert({ rows: [{ createdAt: '2026-09-05T10:00:00Z', action: 'create_ticket', retellCallId: 'call_1', error: 'db down', args: { caller_name: 'A' } }] });
  assert.equal(f.subject, '[Tickets] 1 failed phone call needs attention');
  assert.ok(f.text.includes('call_1') && f.text.includes('db down') && f.text.includes('"caller_name":"A"'));
  assert.ok(f.html.includes('&quot;caller_name&quot;'));
});

test('renderDigestEmail: counts, an open-ticket table, empty state, and HTML-escaping', () => {
  const open1 = { number: 7, priority: 'urgent', category: 'resident_concern', callerName: 'Jane <Smith>', status: 'open', assigneeName: null };
  const open2 = { number: 8, priority: 'normal', category: 'general', callerName: 'A Coordinator', status: 'in_progress', assigneeName: 'Joanne Bray' };
  const d = renderDigestEmail({ createdLast24h: 3, closedLast24h: 1, open: [open1, open2] });
  assert.equal(d.subject, '[Tickets] Daily summary — 3 new, 2 open');
  assert.ok(d.text.includes('New in the last 24h: 3'));
  assert.ok(d.text.includes('Closed in the last 24h: 1'));
  assert.ok(d.text.includes('Currently open: 2'));
  assert.ok(d.text.includes('TC-7 · URGENT · Resident concern · Jane <Smith> · Open · Unassigned'));
  assert.ok(d.text.includes('TC-8 · NORMAL · General · A Coordinator · In progress · Joanne Bray'));
  assert.ok(d.html.includes('Jane &lt;Smith&gt;'), 'caller name is HTML-escaped');
  assert.ok(d.html.includes('TC-7') && d.html.includes('TC-8'));

  const empty = renderDigestEmail({ createdLast24h: 0, closedLast24h: 0, open: [] });
  assert.equal(empty.subject, '[Tickets] Daily summary — 0 new, 0 open');
  assert.ok(empty.text.includes('No open tickets.'));
  assert.ok(empty.html.includes('No open tickets — nice and clear.'));
});

test('renderEmail dispatches by kind and audience; rejects unknown kinds', () => {
  assert.deepEqual(KINDS, ['created', 'assigned', 'updated', 'closed', 'caller_reply', 'bounce', 'failed_calls']);
  assert.ok(renderEmail('created', { ticket: ticket() }).text.includes('Reply with a command'));
  assert.ok(!renderEmail('closed', { audience: 'caller', ticket: ticket() }).text.includes('Reply with a command'));
  assert.ok(renderEmail('closed', { audience: 'staff', ticket: ticket() }).text.includes('Reply with a command'));
  assert.equal(renderEmail('caller_reply', { ticket: ticket(), note: { body: 'hi', isInternal: false } }).subject, '[TC-42] Truth Care Group — an update on your message');
  assert.ok(renderEmail('bounce', { ticket: ticket(), unknown: ['x'] }).subject.endsWith('command not understood'));
  assert.throws(() => renderEmail('nope', {}), /Unknown email kind/);
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});
