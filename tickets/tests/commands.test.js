import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCommands, parseLine, stripQuotedReply, stripSignOff, unknownMessage, editDistance, COMMAND_HELP } from '../lib/commands.js';

const one = (line) => {
  const r = parseCommands(line);
  assert.equal(r.commands.length, 1, `expected exactly one command for "${line}", got ${JSON.stringify(r)}`);
  return r.commands[0];
};

test('assign forms: "assign joanne", "assign to jo", "@joanne", "Assign: Jo", trailing punctuation', () => {
  assert.deepEqual(one('assign joanne'), { type: 'assign', value: 'joanne', raw: 'assign joanne' });
  assert.deepEqual(one('assign to jo'), { type: 'assign', value: 'jo', raw: 'assign to jo' });
  assert.deepEqual(one('@joanne'), { type: 'assign', value: 'joanne', raw: '@joanne' });
  assert.equal(one('Assign: Jo.').value, 'Jo');
  assert.equal(one('ASSIGN TO Joanne Bray').value, 'Joanne Bray');
  assert.equal(parseLine('assigned to jo yesterday'), null, '"assigned…" is prose, not a command');
});

test('mine / take assign to the sender', () => {
  assert.deepEqual(one('mine'), { type: 'take', raw: 'mine' });
  assert.deepEqual(one('Take!'), { type: 'take', raw: 'Take!' });
});

test('status words: close/closed/resolved/done → closed; reopen/open → open; in progress/working on it/started → in_progress', () => {
  for (const w of ['close', 'closed', 'resolved', 'done', 'Done.', 'CLOSE']) assert.equal(one(w).value, 'closed', w);
  for (const w of ['reopen', 'open', 'Reopen']) assert.equal(one(w).value, 'open', w);
  for (const w of ['in progress', 'In Progress', 'in-progress', 'working on it', 'started']) assert.equal(one(w).value, 'in_progress', w);
  assert.equal(one('close').type, 'status');
});

test('priority: urgent, priority high, priority normal, priority: urgent', () => {
  assert.deepEqual(one('urgent'), { type: 'priority', value: 'urgent', raw: 'urgent' });
  assert.equal(one('priority high').value, 'high');
  assert.equal(one('Priority normal').value, 'normal');
  assert.equal(one('priority: urgent').value, 'urgent');
});

test('category staff|referral|resident|general maps resident → resident_concern', () => {
  assert.equal(one('category staff').value, 'staff');
  assert.equal(one('category referral').value, 'referral');
  assert.equal(one('category resident').value, 'resident_concern');
  assert.equal(one('category resident concern').value, 'resident_concern');
  assert.equal(one('Category: General').value, 'general');
  assert.equal(one('category staff').type, 'category');
});

test('internal notes: "internal: …" and lines starting with #', () => {
  assert.deepEqual(one('internal: spoke to the family, call back Monday'), { type: 'internal_note', value: 'spoke to the family, call back Monday', raw: 'internal: spoke to the family, call back Monday' });
  assert.equal(one('# not for the caller').value, 'not for the caller');
  assert.equal(one('#tight').value, 'tight');
  assert.deepEqual(parseCommands('#').unknown, ['#']);
});

test('anything else is a public note; blank lines collapse', () => {
  const r = parseCommands('Hi Jo,\n\n\n\nWe have a bed from Monday.\n\nPlease call the family.');
  assert.deepEqual(r.commands, []);
  assert.deepEqual(r.unknown, []);
  assert.equal(r.note, 'Hi Jo,\n\nWe have a bed from Monday.\n\nPlease call the family.');
  assert.equal(parseCommands('').note, null);
  assert.equal(parseCommands('   \n  ').note, null);
});

test('commands and a note in one reply keep their order and split cleanly', () => {
  const r = parseCommands('assign jo\nurgent\nFamily want a call back before 5pm today.\nclose');
  assert.deepEqual(r.commands.map((c) => [c.type, c.value]), [['assign', 'jo'], ['priority', 'urgent'], ['status', 'closed']]);
  assert.equal(r.note, 'Family want a call back before 5pm today.');
  assert.deepEqual(r.unknown, []);
});

test('typos and malformed commands are unknown with a suggestion, and suppress the note', () => {
  assert.deepEqual(parseLine('asign jo'), { type: 'unknown', raw: 'asign jo', suggestion: 'assign' });
  assert.equal(unknownMessage('asign jo'), "Couldn't understand 'asign jo' — did you mean assign?");
  assert.equal(parseLine('clsoe').suggestion, 'close', 'transposition counts as one edit');
  assert.equal(parseLine('assign').suggestion, 'assign <name>');
  assert.equal(parseLine('@').suggestion, 'assign <name>');
  assert.equal(parseLine('priority hgih').suggestion, 'priority normal|high|urgent');
  assert.equal(parseLine('category kitchen').suggestion, 'category staff|referral|resident|general');
  const r = parseCommands('asign jo\nPlease ring the family');
  assert.deepEqual(r.unknown, ['asign jo']);
  assert.equal(r.note, null, 'note is suppressed when a line looked like a failed command');
  assert.deepEqual(r.commands, []);
  const mixed = parseCommands('urgent\nasign jo');
  assert.equal(mixed.commands.length, 1, 'valid commands are still returned so the caller can decide');
  assert.deepEqual(mixed.unknown, ['asign jo']);
});

test('prose that merely starts with a command-like word is a note, not a failed command', () => {
  for (const line of ['Done, thanks — call them back tomorrow', 'Open to suggestions on this one', 'Sorted, spoke to the family', 'Closing the loop with the social worker next week']) {
    assert.equal(parseLine(line), null, line);
  }
  assert.equal(editDistance('asign', 'assign'), 1);
  assert.equal(editDistance('clsoe', 'close'), 1);
  assert.equal(editDistance('sorted', 'started'), 2);
});

test('quoted reply is stripped at the first marker: From:, On … wrote:, Original Message, > lines, Outlook rule, -- signature', () => {
  const tail = '\n\nclose\nassign jo';
  assert.equal(stripQuotedReply(`mine\n\nFrom: Truth Care Tickets <tickets@truthcaregroup.co.uk>${tail}`), 'mine');
  assert.equal(stripQuotedReply(`mine\n\nOn Fri, 5 Sep 2026 at 10:02, Truth Care Tickets\n<tickets@truthcaregroup.co.uk> wrote:${tail}`), 'mine');
  assert.equal(stripQuotedReply(`mine\n-----Original Message-----${tail}`), 'mine');
  assert.equal(stripQuotedReply(`mine\n> close\n> assign jo`), 'mine');
  assert.equal(stripQuotedReply(`mine\r\n________________________________\r\nFrom: x${tail}`), 'mine');
  assert.equal(stripQuotedReply(`mine\n-- \nJo Bray${tail}`), 'mine');
  assert.equal(stripQuotedReply(`mine\nSent from my iPhone${tail}`), 'mine');
  const r = parseCommands(`take\n\nOn Fri wrote:\n> close`);
  assert.deepEqual(r.commands.map((c) => c.type), ['take']);
  assert.equal(stripQuotedReply(null), '');
});

test('sign-off and signature are not note text', () => {
  assert.equal(stripSignOff('Please call them.\n\nKind regards,\nJoanne Bray\nRegistered Manager'), 'Please call them.');
  assert.equal(stripSignOff('Please call them.\nThanks\nJo'), 'Please call them.');
  const r = parseCommands('close\nMany thanks\nJo Bray\nRegistered Manager');
  assert.equal(r.note, null);
  assert.equal(r.commands[0].value, 'closed');
});

test('COMMAND_HELP lists every command family for footers and bounces', () => {
  const text = COMMAND_HELP.map(([cmd]) => cmd).join('\n');
  for (const needle of ['assign', 'mine', 'close', 'reopen', 'in progress', 'urgent', 'priority', 'category', 'internal:', '#']) assert.ok(text.includes(needle), needle);
});

test('prose that merely contains an inflected keyword is a note, not a failed command', () => {
  const line = 'Closed for lunch, will call back at 2';
  const r = parseCommands(line);
  assert.deepEqual(r.commands, []);
  assert.deepEqual(r.unknown, []);
  assert.equal(r.note, line);

  assert.equal(parseLine('Taken care of'), null);
  assert.equal(parseLine('Opens at 9am'), null);
});

test('prose that merely starts with "category"/"priority" is a note, not a failed command', () => {
  for (const line of ['Category error, please advise on the form', 'Priority list attached for review']) {
    const r = parseCommands(line);
    assert.equal(r.note, line, line);
    assert.deepEqual(r.unknown, [], line);
  }
});

test('short command-shaped lines still fail as unknown with a suggestion', () => {
  assert.equal(parseLine('category nonsense').type, 'unknown');
  assert.equal(parseLine('category nonsense').suggestion, 'category staff|referral|resident|general');
  assert.deepEqual(parseLine('asign jo'), { type: 'unknown', raw: 'asign jo', suggestion: 'assign' });
  assert.equal(parseLine('clsoe').type, 'unknown');
  assert.equal(parseLine('clsoe').suggestion, 'close');
});

test('sign-off is only stripped when it actually closes the message', () => {
  const r = parseCommands('close\nThanks\nWill call the family back tomorrow afternoon.');
  assert.deepEqual(r.commands.map((c) => c.type), ['status']);
  assert.equal(r.note, 'Will call the family back tomorrow afternoon.');

  const r2 = parseCommands('Will call the family back tomorrow.\nThanks,\nJo');
  assert.deepEqual(r2.commands, []);
  assert.equal(r2.note, 'Will call the family back tomorrow.');
});

test('a short punctuated sentence after a sign-off word is real content, not part of the signature', () => {
  assert.deepEqual(parseCommands('close\nThanks\nCall back please.'), {
    commands: [{ type: 'status', value: 'closed', raw: 'close' }],
    note: 'Call back please.',
    unknown: [],
  });
  assert.equal(parseCommands('close\nThanks\nWill do.').note, 'Will do.');
  assert.equal(parseCommands('close\nThanks\nCalled them.').note, 'Called them.');
});

test('a genuine signature with a longer, unpunctuated job title is still stripped in full', () => {
  const note = stripSignOff('Please call them.\n\nKind regards,\nJoanne Bray\nRegistered Manager of the Trust');
  assert.equal(note, 'Please call them.');
});

test('assign only accepts a short name, not ordinary prose that happens to start with "assign"', () => {
  assert.equal(parseLine('Assign a mentor to help her settle in properly, thanks.'), null);
  assert.equal(parseCommands('Assign a mentor to help her settle in properly, thanks.').commands.length, 0);
  assert.equal(
    parseCommands('Assign a mentor to help her settle in properly, thanks.').note,
    'Assign a mentor to help her settle in properly, thanks.'
  );
  // still works for real short assign targets, including a two-word name
  assert.deepEqual(parseLine('assign to Joanne Bray'), { type: 'assign', value: 'Joanne Bray', raw: 'assign to Joanne Bray' });
});
