import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchStaff, resolveStaff, staffByEmail, upsertStaff, newTicketRecipients, activeStaff } from '../lib/staff.js';
import { fakeDb } from './helpers/fake-db.js';

const JO = { id: '1', name: 'Joanne Bray', email: 'joanne@truthcaregroup.co.uk', aliases: ['jo', 'joanne'], active: true };
const JOHN = { id: '2', name: 'John Smith', email: 'john.smith@truthcaregroup.co.uk', aliases: [], active: true };
const PAUL = { id: '3', name: 'Paul McFearless', email: 'paul@truthcaregroup.co.uk', aliases: ['pm'], active: true };
const GONE = { id: '4', name: 'Jenny Old', email: 'jenny@truthcaregroup.co.uk', aliases: ['jen'], active: false };
const STAFF = [JO, JOHN, PAUL, GONE];

test('matchStaff: exact alias/name/email wins; case-insensitive; @ prefix tolerated', () => {
  assert.deepEqual(matchStaff('joanne', STAFF), { staff: JO });
  assert.deepEqual(matchStaff('jo', STAFF), { staff: JO }, 'exact alias beats the prefix of john');
  assert.deepEqual(matchStaff('@Joanne Bray', STAFF), { staff: JO });
  assert.deepEqual(matchStaff('JOHN', STAFF), { staff: JOHN });
  assert.deepEqual(matchStaff('john.smith', STAFF), { staff: JOHN }, 'email local part');
  assert.deepEqual(matchStaff('pm', STAFF), { staff: PAUL });
  assert.deepEqual(matchStaff('paul@truthcaregroup.co.uk', STAFF), null, 'full email is not a key; use the local part or name');
});

test('matchStaff: prefix match, ambiguity, no match, inactive excluded', () => {
  assert.deepEqual(matchStaff('joan', STAFF), { staff: JO });
  assert.deepEqual(matchStaff('pau', STAFF), { staff: PAUL });
  assert.deepEqual(matchStaff('j', STAFF), { ambiguous: [JO, JOHN] });
  assert.equal(matchStaff('zed', STAFF), null);
  assert.equal(matchStaff('', STAFF), null);
  assert.equal(matchStaff(null, STAFF), null);
  assert.equal(matchStaff('jen', STAFF), null, 'inactive staff never match');
  assert.equal(matchStaff('jo', []), null);
});

test('db helpers against the fake tag: resolve, lookup by email, recipients, upsert', async () => {
  const db = fakeDb();
  db.seedStaff([
    { name: 'Joanne Bray', email: 'joanne@truthcaregroup.co.uk', aliases: ['jo'], role: 'admin' },
    { name: 'Sam Quiet', email: 'sam@truthcaregroup.co.uk', receives_new_tickets: false },
    { name: 'Old Hand', email: 'old@truthcaregroup.co.uk', active: false },
  ]);
  assert.equal((await resolveStaff('jo', { db })).staff.name, 'Joanne Bray');
  assert.equal((await staffByEmail('JOANNE@truthcaregroup.co.uk', { db })).name, 'Joanne Bray');
  assert.equal(await staffByEmail('old@truthcaregroup.co.uk', { db }), null);
  assert.equal(await staffByEmail('', { db }), null);
  assert.deepEqual((await newTicketRecipients({ db })).map((s) => s.email), ['joanne@truthcaregroup.co.uk']);
  assert.equal((await activeStaff({ db })).length, 2);
  const created = await upsertStaff({ name: ' New Person ', email: 'New@TruthCareGroup.co.uk', role: 'boss', aliases: 'np, NP ,new' }, { db });
  assert.equal(created.email, 'new@truthcaregroup.co.uk');
  assert.equal(created.role, 'agent', 'unknown roles fall back to agent');
  assert.deepEqual(created.aliases, ['np', 'new']);
  assert.equal(created.receivesNewTickets, true);
  const updated = await upsertStaff({ name: 'New Person', email: 'new@truthcaregroup.co.uk', role: 'admin', active: false }, { db });
  assert.equal(updated.id, created.id, 'upsert on email');
  assert.equal(updated.role, 'admin');
  assert.equal(updated.active, false);
  await assert.rejects(upsertStaff({ name: 'X', email: 'not-an-email' }, { db }), /valid email/);
  await assert.rejects(upsertStaff({ name: '', email: 'a@b.com' }, { db }), /need a name/);
});
