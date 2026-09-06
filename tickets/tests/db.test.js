import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCamel, toCamelArray, getSql, resetSql } from '../lib/db.js';
import { env, mailboxAddress, ticketsAddress, ticketsDomain, ticketsLocalPart, ownAddresses, appUrl } from '../lib/config.js';

test('toCamel converts snake_case keys and passes values through', () => {
  assert.deepEqual(toCamel({ caller_name: 'Jo', email_token: 'abc', number: 4 }), { callerName: 'Jo', emailToken: 'abc', number: 4 });
  assert.equal(toCamel(null), null);
});

test('toCamelArray maps every row', () => {
  assert.deepEqual(toCamelArray([{ a_b: 1 }, { c_d: 2 }]), [{ aB: 1 }, { cD: 2 }]);
});

test('getSql throws a clear error when DATABASE_URL is unset', () => {
  const saved = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  resetSql();
  assert.throws(() => getSql(), /DATABASE_URL is not set/);
  if (saved) process.env.DATABASE_URL = saved;
  resetSql();
});

test('config derives tickets/mailbox addresses with defaults and env overrides', () => {
  delete process.env.MAILBOX_ADDRESS;
  delete process.env.TICKETS_ADDRESS;
  assert.equal(mailboxAddress(), 'infotech@truthcaregroup.co.uk');
  assert.equal(ticketsAddress(), 'tickets@truthcaregroup.co.uk');
  assert.equal(ticketsLocalPart(), 'tickets');
  assert.equal(ticketsDomain(), 'truthcaregroup.co.uk');
  assert.deepEqual(ownAddresses(), ['tickets@truthcaregroup.co.uk', 'infotech@truthcaregroup.co.uk']);
  process.env.TICKETS_ADDRESS = ' Tickets@Example.org ';
  assert.equal(ticketsAddress(), 'tickets@example.org');
  delete process.env.TICKETS_ADDRESS;
  process.env.APP_URL = 'https://tickets.example.org/';
  assert.equal(appUrl(), 'https://tickets.example.org');
  delete process.env.APP_URL;
  assert.equal(env('DEFINITELY_UNSET_VAR', 'fallback'), 'fallback');
});
