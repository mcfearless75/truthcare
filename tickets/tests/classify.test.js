import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { classify, regexClassify, parseClaudeResponse, extractJSONObject, buildPrompt, CLAUDE_MODEL, MAX_TOKENS } from '../lib/classify.js';

const claudeReply = (text, status = 200) => async (url, init) => ({
  ok: status < 400, status,
  json: async () => ({ content: [{ type: 'text', text }] }),
  _init: init, _url: url,
});

beforeEach(() => { process.env.ANTHROPIC_API_KEY = 'sk-test'; });

test('regex fallback covers the four categories and priority words', () => {
  assert.equal(regexClassify('Re: my mum', 'I am worried about bruising on her arm').category, 'resident_concern');
  assert.equal(regexClassify('Off sick', 'I cannot make my shift tonight').category, 'staff');
  assert.equal(regexClassify('Referral', 'Social worker enquiring about a placement').category, 'referral');
  assert.equal(regexClassify('Invoice', 'Please find attached').category, 'general');
  assert.equal(regexClassify('URGENT', 'please ring today').priority, 'urgent');
  assert.equal(regexClassify('Question', 'need an answer today').priority, 'high');
  assert.equal(regexClassify('Hello', 'just checking in').priority, 'normal');
  assert.deepEqual(regexClassify('', ''), { category: 'general', priority: 'normal', summary: null, via: 'regex' });
});

test('parseClaudeResponse validates the JSON shape; extractJSONObject tolerates prose around it', () => {
  assert.deepEqual(extractJSONObject('Sure! {"a":1} done'), { a: 1 });
  assert.equal(extractJSONObject('[1,2]'), null);
  assert.equal(extractJSONObject('{bad json'), null);
  assert.deepEqual(parseClaudeResponse('{"category":"staff","priority":"high","summary":" Sick tonight "}'), { category: 'staff', priority: 'high', summary: 'Sick tonight', via: 'ai' });
  assert.equal(parseClaudeResponse('{"category":"Support","priority":"high","summary":"x"}'), null);
  assert.equal(parseClaudeResponse('{"category":"staff","priority":"critical","summary":"x"}'), null);
  assert.equal(parseClaudeResponse('{"category":"staff","priority":"high"}').summary, null);
  assert.equal(parseClaudeResponse('nothing here'), null);
});

test('classify uses Claude haiku with 300 tokens and JSON prompt; falls back to regex on bad output, HTTP error, throw, or no key', async () => {
  let captured;
  const ok = await classify('Off sick', 'cannot do my shift', { fetchImpl: async (url, init) => { captured = { url, init }; return claudeReply('{"category":"staff","priority":"urgent","summary":"Staff member off sick tonight."}')(url, init); } });
  assert.deepEqual(ok, { category: 'staff', priority: 'urgent', summary: 'Staff member off sick tonight.', via: 'ai' });
  assert.equal(captured.url, 'https://api.anthropic.com/v1/messages');
  const sent = JSON.parse(captured.init.body);
  assert.equal(sent.model, CLAUDE_MODEL);
  assert.equal(CLAUDE_MODEL, 'claude-haiku-4-5-20251001');
  assert.equal(sent.max_tokens, MAX_TOKENS);
  assert.equal(MAX_TOKENS, 300);
  assert.equal(captured.init.headers['x-api-key'], 'sk-test');
  assert.ok(sent.messages[0].content.includes('<email_body>cannot do my shift</email_body>'));
  assert.ok(buildPrompt('s', 'b').includes('Respond with ONLY a JSON object'));
  assert.equal((await classify('Off sick', 'cannot do my shift', { fetchImpl: claudeReply('I think it is staff related.') })).via, 'regex');
  assert.equal((await classify('Off sick', 'cannot do my shift', { fetchImpl: claudeReply('{}', 529) })).via, 'regex');
  assert.equal((await classify('Off sick', 'cannot do my shift', { fetchImpl: async () => { throw new Error('boom'); } })).via, 'regex');
  delete process.env.ANTHROPIC_API_KEY;
  const noKey = await classify('Off sick', 'cannot do my shift', { fetchImpl: async () => { throw new Error('must not be called'); } });
  assert.deepEqual(noKey, { category: 'staff', priority: 'normal', summary: null, via: 'regex' });
});
