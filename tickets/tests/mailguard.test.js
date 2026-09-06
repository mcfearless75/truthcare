import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addressOf, addressesOf, recipientsOf, isForTickets, isOwnMail, headerValue, isAutoReply, shouldProcess } from '../lib/mailguard.js';

const TICKETS = 'tickets@truthcaregroup.co.uk';
const OWN = ['tickets@truthcaregroup.co.uk', 'infotech@truthcaregroup.co.uk'];
const r = (address) => ({ emailAddress: { address } });
const msg = (over = {}) => ({
  subject: 'Hello', from: r('fam@example.com'), toRecipients: [r(TICKETS)], ccRecipients: [], internetMessageHeaders: [], ...over,
});

test('address helpers accept strings and Graph recipient objects', () => {
  assert.equal(addressOf('A@B.com'), 'a@b.com');
  assert.equal(addressOf({ emailAddress: { address: 'X@Y.org' } }), 'x@y.org');
  assert.equal(addressOf({ address: 'Q@Z.org' }), 'q@z.org');
  assert.equal(addressOf(null), '');
  assert.deepEqual(addressesOf([r('a@b.com'), 'c@d.com', null]), ['a@b.com', 'c@d.com']);
  assert.deepEqual(recipientsOf(msg({ toRecipients: [r('a@b.com')], ccRecipients: [r('c@d.com')] })), ['a@b.com', 'c@d.com']);
  assert.deepEqual(recipientsOf({}), []);
});

test('isForTickets: exact alias, plus-addresses, Cc, case; rejects other inbox mail', () => {
  assert.equal(isForTickets(msg(), TICKETS), true);
  assert.equal(isForTickets(msg({ toRecipients: [r('Tickets@TruthCareGroup.co.uk')] }), TICKETS), true);
  assert.equal(isForTickets(msg({ toRecipients: [r('tickets+tc42-abcd2345@truthcaregroup.co.uk')] }), TICKETS), true);
  assert.equal(isForTickets(msg({ toRecipients: [r('jo@truthcaregroup.co.uk')], ccRecipients: [r('tickets+anything@truthcaregroup.co.uk')] }), TICKETS), true);
  assert.equal(isForTickets(msg({ toRecipients: [r('infotech@truthcaregroup.co.uk')] }), TICKETS), false, 'ordinary infotech@ mail is ignored');
  assert.equal(isForTickets(msg({ toRecipients: [r('tickets@other.org')] }), TICKETS), false);
  assert.equal(isForTickets(msg({ toRecipients: [r('ticketsx@truthcaregroup.co.uk')] }), TICKETS), false);
  assert.equal(isForTickets(msg({ toRecipients: [], ccRecipients: [] }), TICKETS), false);
});

test('isOwnMail: tickets@, infotech@, plus-addressed tickets, case; not strangers', () => {
  assert.equal(isOwnMail('tickets@truthcaregroup.co.uk', OWN), true);
  assert.equal(isOwnMail('InfoTech@TruthCareGroup.co.uk', OWN), true);
  assert.equal(isOwnMail('tickets+tc1-abcd2345@truthcaregroup.co.uk', OWN), true);
  assert.equal(isOwnMail('jo@truthcaregroup.co.uk', OWN), false);
  assert.equal(isOwnMail('', OWN), false);
  assert.equal(isOwnMail(null, OWN), false);
});

test('isAutoReply: headers and subject patterns from spec §6.5', () => {
  const h = (name, value) => msg({ internetMessageHeaders: [{ name, value }] });
  assert.equal(headerValue(h('Auto-Submitted', 'auto-replied'), 'auto-submitted'), 'auto-replied');
  assert.equal(headerValue(msg(), 'Auto-Submitted'), '');
  assert.equal(isAutoReply(h('Auto-Submitted', 'auto-replied')), true);
  assert.equal(isAutoReply(h('Auto-Submitted', 'auto-generated')), true);
  assert.equal(isAutoReply(h('Auto-Submitted', 'no')), false, 'Auto-Submitted: no is a normal message');
  assert.equal(isAutoReply(h('X-Autoreply', 'yes')), true);
  assert.equal(isAutoReply(h('Precedence', 'bulk')), true);
  assert.equal(isAutoReply(h('Precedence', 'list')), true);
  assert.equal(isAutoReply(h('Precedence', 'normal')), false);
  for (const s of ['Automatic reply: [TC-1] x', 'Out of Office', 'Undeliverable: hello', 'Delivery Status Notification (Failure)', 'auto-reply: away', 'Mail delivery failed']) {
    assert.equal(isAutoReply(msg({ subject: s })), true, s);
  }
  assert.equal(isAutoReply(msg({ subject: 'Re: [TC-1] question about out of office cover' })), false, 'pattern is anchored at start');
  assert.equal(isAutoReply(msg({ subject: undefined, internetMessageHeaders: undefined })), false);
});

test('shouldProcess returns the first failing reason in order: recipient, own mail, auto reply', () => {
  const ctx = { ticketsAddress: TICKETS, ownAddresses: OWN };
  assert.deepEqual(shouldProcess(msg(), ctx), { ok: true });
  assert.deepEqual(shouldProcess(msg({ toRecipients: [r('infotech@truthcaregroup.co.uk')] }), ctx), { ok: false, reason: 'not_for_tickets' });
  assert.deepEqual(shouldProcess(msg({ from: r('tickets@truthcaregroup.co.uk') }), ctx), { ok: false, reason: 'own_mail' });
  assert.deepEqual(shouldProcess(msg({ from: r('infotech@truthcaregroup.co.uk') }), ctx), { ok: false, reason: 'own_mail' });
  assert.deepEqual(shouldProcess(msg({ subject: 'Automatic reply: hi' }), ctx), { ok: false, reason: 'auto_reply' });
});
