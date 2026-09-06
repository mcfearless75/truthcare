import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gatherDigestStats, sendDailyDigest, DIGEST_WINDOW_MS } from '../lib/digest.js';
import { createTicket, applyCommand } from '../lib/tickets.js';
import { fakeDb, fakeSend } from './helpers/fake-db.js';

function setup() {
  const db = fakeDb();
  db.seedStaff([{ name: 'Kumi Pillay', email: 'kumi@truthcaregroup.co.uk', role: 'admin' }]);
  return { db, send: fakeSend() };
}

const referral = { category: 'referral', source: 'phone', summary: 'New referral enquiry', callerName: 'A Coordinator' };

test('gatherDigestStats: counts created/closed in the last 24h and lists the open tickets', async () => {
  const { db, send } = setup();
  // createTicket/applyCommand stamp created_at/closed_at from the fake db's
  // own now() (real wall-clock), not an injectable clock — so `now` below is
  // captured after creating fixtures and only the "stale" row's created_at
  // is pushed back by hand to land outside the 24h window.
  const recent = await createTicket(referral, { via: 'phone', db, send });
  const stale = await createTicket(referral, { via: 'phone', db, send });
  const now = Date.now();
  db.tables.tickets.find((t) => t.id === stale.id).created_at = new Date(now - DIGEST_WINDOW_MS - 1000).toISOString();
  await applyCommand(recent.id, { type: 'status', value: 'closed' }, { name: 'Kumi' }, { via: 'board', db, send });

  const stats = await gatherDigestStats({ db, now });
  assert.equal(stats.createdLast24h, 1, 'only the ticket created inside the window counts');
  assert.equal(stats.closedLast24h, 1);
  assert.equal(stats.cutoff, new Date(now - DIGEST_WINDOW_MS).toISOString());
  assert.ok(Array.isArray(stats.open));
});

test('sendDailyDigest: sends once to the configured recipients with the digest content', async () => {
  const { db, send } = setup();
  delete process.env.DIGEST_TO;
  delete process.env.DIGEST_BCC;
  await createTicket(referral, { via: 'phone', db, send });

  const result = await sendDailyDigest({ db, send });
  assert.equal(send.sent.length, 2, 'one to the new-ticket staff from createTicket, one digest');
  const digest = send.sent.find((m) => m.subject.startsWith('[Tickets] Daily summary'));
  assert.ok(digest, 'a digest email was sent');
  assert.deepEqual(digest.to, ['kumi@truthcaregroup.co.uk', 'joanne@truthcaregroup.co.uk']);
  assert.deepEqual(digest.bcc, ['infotech@truthcaregroup.co.uk']);
  assert.ok(digest.text.includes('New in the last 24h: 1'));
  assert.ok(digest.html.includes('Daily summary'));
  assert.equal(result.sent, true);
  assert.equal(result.createdLast24h, 1);
});

test('sendDailyDigest: recipients are overridable via env (empty falls back to the default, same as every other env() read in this service)', async () => {
  const { db, send } = setup();
  process.env.DIGEST_TO = 'manager@truthcaregroup.co.uk,deputy@truthcaregroup.co.uk';
  process.env.DIGEST_BCC = '';
  try {
    await sendDailyDigest({ db, send });
    const digest = send.sent.find((m) => m.subject.startsWith('[Tickets] Daily summary'));
    assert.deepEqual(digest.to, ['manager@truthcaregroup.co.uk', 'deputy@truthcaregroup.co.uk']);
    assert.deepEqual(digest.bcc, ['infotech@truthcaregroup.co.uk'], 'an empty override falls back to the default, it does not mean "no bcc"');
  } finally {
    delete process.env.DIGEST_TO;
    delete process.env.DIGEST_BCC;
  }
});
