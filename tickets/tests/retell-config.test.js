import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { samplePayloads, signedRequest } from '../scripts/simulate-call.js';
import { verifyRetellSignature } from '../lib/retell.js';
import { validateCreateArgs } from '../lib/phone.js';
import { CATEGORIES, PRIORITIES } from '../lib/priority.js';

const config = JSON.parse(readFileSync(new URL('../docs/retell-functions.json', import.meta.url), 'utf8'));
const prompt = readFileSync(new URL('../docs/agent-prompt.md', import.meta.url), 'utf8');

test('retell-functions.json: agent id, webhook, two custom functions with the right urls, enums and speak flags', () => {
  assert.equal(config.agent_id, 'agent_4d82b100b4d5daca406a5f317b');
  assert.equal(config.webhook_url, 'https://tickets.truthcaregroup.co.uk/api/phone?action=webhook');
  assert.deepEqual(config.webhook_events, ['call_analyzed']);
  assert.deepEqual(config.functions.map((f) => f.name), ['create_ticket', 'lookup_ticket']);
  for (const f of config.functions) {
    assert.equal(f.type, 'custom');
    assert.equal(f.url, `https://tickets.truthcaregroup.co.uk/api/phone?action=${f.name}`);
    assert.equal(f.speak_during_execution, true);
    assert.equal(f.speak_after_execution, true);
    assert.equal(f.parameters.type, 'object');
    assert.ok(f.description.length > 40);
  }
  const create = config.functions[0].parameters;
  assert.deepEqual(create.properties.category.enum, CATEGORIES);
  assert.deepEqual(create.properties.priority.enum, PRIORITIES);
  assert.deepEqual(create.required, ['category', 'caller_name', 'summary']);
  for (const p of ['caller_phone', 'caller_email', 'caller_org', 'subject_person', 'summary', 'shift_starts_at']) assert.ok(create.properties[p], p);
  const lookup = config.functions[1].parameters;
  assert.deepEqual(lookup.required, ['ticket_number']);
  assert.ok(lookup.properties.caller_phone);
});

test('agent-prompt.md carries the identity line, the 999 guard, never-confirm-resident, the four categories and both functions', () => {
  for (const needle of [
    'automated overflow assistant', 'Never claim to be a human staff member',
    'This sounds like a medical emergency. Please hang up now and dial 999 immediately.',
    'Never confirm or deny whether a named person is a resident',
    '`referral`', '`staff`', '`resident_concern`', '`general`',
    '`create_ticket`', '`lookup_ticket`', 'any update on my ticket?',
    "You're all set. Your ticket number is [ticket_number], and the team will follow up as soon as they can.",
    'agent_4d82b100b4d5daca406a5f317b',
  ]) assert.ok(prompt.includes(needle), needle);
  assert.ok(!prompt.includes('log_ticket'), 'old function name must not appear');
});

test('simulate-call payloads validate against the phone door and are signed so verifyRetellSignature accepts them', () => {
  const payloads = samplePayloads({ phone: '+447700900123', ticket: 7, callId: 'sim_1' });
  const v = validateCreateArgs(payloads.create_ticket.args, payloads.create_ticket.call);
  assert.equal(v.ok, true);
  assert.equal(v.input.category, 'referral');
  assert.equal(v.input.retellCallId, 'sim_1');
  assert.equal(payloads.lookup_ticket.args.ticket_number, '7');
  assert.equal(payloads.webhook.event, 'call_analyzed');
  assert.equal(payloads.webhook.call.call_id, 'sim_1');
  const at = Date.now();
  const req = signedRequest('http://localhost:3000/api/phone?action=create_ticket', payloads.create_ticket, 'k3y', at);
  assert.equal(verifyRetellSignature(req.body, req.headers['X-Retell-Signature'], 'k3y', at), true);
  assert.equal(verifyRetellSignature(req.body, req.headers['X-Retell-Signature'], 'other', at), false);
});
