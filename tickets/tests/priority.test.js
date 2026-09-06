import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIES, PRIORITIES, ESCALATION_WORDS, computePriority, defaultPriority,
  hasEscalationWord, maxPriority, priorityRank, shiftIsImminent, isCategory, isPriority,
} from '../lib/priority.js';

const NOW = Date.parse('2026-09-05T10:00:00Z');
const hours = (h) => new Date(NOW + h * 3600 * 1000).toISOString();

test('category defaults match spec §4.2', () => {
  assert.deepEqual(CATEGORIES, ['referral', 'staff', 'resident_concern', 'general']);
  assert.deepEqual(PRIORITIES, ['normal', 'high', 'urgent']);
  assert.equal(defaultPriority('referral'), 'high');
  assert.equal(defaultPriority('staff'), 'normal');
  assert.equal(defaultPriority('resident_concern'), 'urgent');
  assert.equal(defaultPriority('general'), 'normal');
  assert.equal(defaultPriority('nonsense'), 'normal');
  assert.equal(defaultPriority('constructor'), 'normal');
  assert.equal(defaultPriority('toString'), 'normal');
  for (const c of CATEGORIES) assert.equal(computePriority({ category: c, summary: 'plain call' }), defaultPriority(c));
});

test('every escalation word raises any category to urgent, as a whole word, case-insensitively', () => {
  assert.deepEqual(ESCALATION_WORDS, ['emergency', 'safeguarding', 'tonight', 'now', 'immediately', 'police', 'hospital']);
  for (const w of ESCALATION_WORDS) {
    assert.equal(hasEscalationWord(`please deal with this ${w.toUpperCase()} thanks`), true, w);
    assert.equal(computePriority({ category: 'general', summary: `About the ${w}.` }), 'urgent', w);
  }
  assert.equal(hasEscalationWord('I know the family well'), false, '"now" inside "know" must not match');
  assert.equal(hasEscalationWord('the hospitality team'), false, '"hospital" inside "hospitality" must not match');
  assert.equal(hasEscalationWord(''), false);
  assert.equal(hasEscalationWord(null), false);
});

test('staff shift starting within 4h is urgent; later is normal; already started is urgent', () => {
  assert.equal(shiftIsImminent(hours(3.5), NOW), true);
  assert.equal(shiftIsImminent(hours(4), NOW), false);
  assert.equal(shiftIsImminent(NOW + 2 * 3600 * 1000, NOW), true, 'epoch-ms number');
  assert.equal(shiftIsImminent(hours(5), NOW), false);
  assert.equal(shiftIsImminent(hours(-1), NOW), true);
  assert.equal(shiftIsImminent('not a date', NOW), false);
  assert.equal(shiftIsImminent(null, NOW), false);
  assert.equal(computePriority({ category: 'staff', summary: 'sick', shiftStartsAt: hours(2), now: NOW }), 'urgent');
  assert.equal(computePriority({ category: 'staff', summary: 'sick', shiftStartsAt: hours(6), now: NOW }), 'normal');
  assert.equal(computePriority({ category: 'staff', summary: 'sick', shiftStartsAt: new Date(NOW + 60_000), now: NOW }), 'urgent');
  assert.equal(computePriority({ category: 'general', summary: 'x', shiftStartsAt: hours(1), now: NOW }), 'normal', 'shift rule is staff-only');
});

test('explicit priority is honoured only when it raises the computed one', () => {
  assert.equal(computePriority({ category: 'referral', summary: 'x', explicit: 'normal' }), 'high');
  assert.equal(computePriority({ category: 'general', summary: 'x', explicit: 'urgent' }), 'urgent');
  assert.equal(computePriority({ category: 'general', summary: 'x', explicit: 'high' }), 'high');
  assert.equal(computePriority({ category: 'resident_concern', summary: 'x', explicit: 'normal' }), 'urgent');
  assert.equal(computePriority({ category: 'general', summary: 'x', explicit: 'bogus' }), 'normal');
  assert.equal(computePriority({ category: 'general', summary: 'x', explicit: undefined }), 'normal');
});

test('rank helpers', () => {
  assert.equal(priorityRank('normal'), 0);
  assert.equal(priorityRank('high'), 1);
  assert.equal(priorityRank('urgent'), 2);
  assert.equal(priorityRank('junk'), 0);
  assert.equal(maxPriority('high', 'normal'), 'high');
  assert.equal(maxPriority('normal', 'urgent'), 'urgent');
  assert.equal(maxPriority('junk', 'normal'), 'normal');
  assert.equal(isCategory('staff'), true);
  assert.equal(isCategory('Staff'), false);
  assert.equal(isPriority('urgent'), true);
  assert.equal(isPriority(''), false);
});
