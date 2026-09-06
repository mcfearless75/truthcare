import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TOKEN_LENGTH, generateToken, isToken, buildReplyTo, parseReplyTo, findTicketRef,
  normaliseSubject, subjectTicketNumber, matchTicket,
} from '../lib/threading.js';

test('generateToken is 8 chars of lower base32 (a-z2-7) and varies', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const t = generateToken();
    assert.equal(t.length, TOKEN_LENGTH);
    assert.match(t, /^[a-z2-7]{8}$/);
    seen.add(t);
  }
  assert.ok(seen.size > 190, 'tokens should be effectively unique');
  assert.equal(isToken('abcd2345'), true);
  assert.equal(isToken('ABCD2345'), false);
  assert.equal(isToken('abcd1890'), false, '0,1,8,9 are not base32');
});

test('reply-to round trip and case-insensitive parsing', () => {
  const addr = buildReplyTo(42, 'abcd2345', 'truthcaregroup.co.uk');
  assert.equal(addr, 'tickets+tc42-abcd2345@truthcaregroup.co.uk');
  assert.deepEqual(parseReplyTo(addr), { localPart: 'tickets', number: 42, token: 'abcd2345', domain: 'truthcaregroup.co.uk' });
  assert.deepEqual(parseReplyTo('Tickets+TC42-ABCD2345@Truthcaregroup.co.uk'), { localPart: 'tickets', number: 42, token: 'abcd2345', domain: 'truthcaregroup.co.uk' });
  assert.deepEqual(parseReplyTo('Truth Care Tickets <tickets+tc7-zzzz7777@truthcaregroup.co.uk>')?.number, 7);
  assert.equal(parseReplyTo('tickets@truthcaregroup.co.uk'), null);
  assert.equal(parseReplyTo('tickets+tc42@truthcaregroup.co.uk'), null, 'number alone is not a ref');
  assert.equal(parseReplyTo('tickets+tc42-short@truthcaregroup.co.uk'), null);
  assert.equal(parseReplyTo(''), null);
  assert.equal(parseReplyTo(null), null);
});

test('findTicketRef picks the first matching recipient and respects localPart/domain filters', () => {
  const list = ['jo@truthcaregroup.co.uk', 'TICKETS+TC9-abcdefgh@truthcaregroup.co.uk', 'tickets+tc10-abcdefgh@truthcaregroup.co.uk'];
  assert.deepEqual(findTicketRef(list), { number: 9, token: 'abcdefgh' });
  assert.equal(findTicketRef(['support+tc9-abcdefgh@truthcaregroup.co.uk'], { localPart: 'tickets' }), null);
  assert.equal(findTicketRef(['tickets+tc9-abcdefgh@other.org'], { domain: 'truthcaregroup.co.uk' }), null);
  assert.equal(findTicketRef([]), null);
  assert.equal(findTicketRef(undefined), null);
});

test('normaliseSubject strips stacked Re/Fwd prefixes; subjectTicketNumber reads [TC-n]', () => {
  assert.equal(normaliseSubject('Re: RE: Fwd: FW: Hello'), 'Hello');
  assert.equal(normaliseSubject('  Hello  '), 'Hello');
  assert.equal(normaliseSubject(undefined), '');
  assert.equal(subjectTicketNumber('Re: [TC-42] [URGENT] Resident concern'), 42);
  assert.equal(subjectTicketNumber('re: [tc-7] x'), 7);
  assert.equal(subjectTicketNumber('no ref here'), null);
});

function lookupWith(db) {
  return {
    byToken: async (number, token) => db.byToken?.[`${number}-${token}`] ?? null,
    byConversation: async (id) => db.byConversation?.[id] ?? null,
    byCallerAndNumber: async (email, number) => db.byCaller?.[`${email}|${number}`] ?? null,
  };
}

test('tier 1: token match wins over conversation and subject', async () => {
  const T1 = { id: 't1' }, T2 = { id: 't2' }, T3 = { id: 't3' };
  const lookup = lookupWith({ byToken: { '42-abcd2345': T1 }, byConversation: { conv: T2 }, byCaller: { 'a@b.com|42': T3 } });
  const r = await matchTicket({ recipients: ['tickets+tc42-abcd2345@truthcaregroup.co.uk'], conversationId: 'conv', fromEmail: 'a@b.com', subject: '[TC-42] x' }, lookup);
  assert.deepEqual(r, { ticket: T1, tier: 'token' });
});

test('wrong token is rejected — number alone is never trusted — then falls through the tiers', async () => {
  const T2 = { id: 't2' };
  const lookup = lookupWith({ byToken: { '42-abcd2345': { id: 't1' } }, byConversation: { conv: T2 } });
  const r = await matchTicket({ recipients: ['tickets+tc42-wrongtok@truthcaregroup.co.uk'], conversationId: 'conv', fromEmail: '', subject: '' }, lookup);
  assert.deepEqual(r, { ticket: T2, tier: 'conversation' });
  const none = await matchTicket({ recipients: ['tickets+tc42-wrongtok@truthcaregroup.co.uk'], conversationId: null, fromEmail: 'x@y.com', subject: 'hello' }, lookup);
  assert.equal(none, null);
});

test('tier 2 conversation, tier 3 sender+subject (both required), else null', async () => {
  const T2 = { id: 't2' }, T3 = { id: 't3' };
  const lookup = lookupWith({ byConversation: { conv: T2 }, byCaller: { 'fam@example.com|42': T3 } });
  assert.deepEqual(await matchTicket({ recipients: [], conversationId: 'conv', fromEmail: 'fam@example.com', subject: '[TC-42]' }, lookup), { ticket: T2, tier: 'conversation' });
  assert.deepEqual(await matchTicket({ recipients: [], conversationId: 'other', fromEmail: 'FAM@example.com', subject: 'Re: [TC-42] update' }, lookup), { ticket: T3, tier: 'subject' });
  assert.equal(await matchTicket({ recipients: [], conversationId: 'other', fromEmail: 'stranger@example.com', subject: 'Re: [TC-42] update' }, lookup), null, 'subject alone is not enough');
  assert.equal(await matchTicket({ recipients: [], conversationId: 'other', fromEmail: 'fam@example.com', subject: 'no ref' }, lookup), null, 'sender alone is not enough');
  assert.equal(await matchTicket({ recipients: [], conversationId: null, fromEmail: '', subject: '' }, lookup), null);
});
