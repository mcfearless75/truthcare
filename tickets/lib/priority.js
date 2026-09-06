/**
 * Priority rules (spec §4.2). Pure: no I/O, no env.
 *
 *  - category defaults: referral=high, staff=normal, resident_concern=urgent, general=normal
 *  - staff ticket whose shift starts in < 4h (or has already started) → urgent
 *  - any escalation word in the summary → urgent
 *  - an explicit priority (from the agent or a classifier) is honoured only if it RAISES the result
 */
export const CATEGORIES = ['referral', 'staff', 'resident_concern', 'general'];
export const PRIORITIES = ['normal', 'high', 'urgent'];
export const ESCALATION_WORDS = ['emergency', 'safeguarding', 'tonight', 'now', 'immediately', 'police', 'hospital'];
export const SHIFT_URGENT_WINDOW_MS = 4 * 60 * 60 * 1000;

const DEFAULTS = { referral: 'high', staff: 'normal', resident_concern: 'urgent', general: 'normal' };
const ESCALATION_RE = new RegExp(`\\b(${ESCALATION_WORDS.join('|')})\\b`, 'i');

export function isCategory(c) {
  return CATEGORIES.includes(c);
}

export function isPriority(p) {
  return PRIORITIES.includes(p);
}

export function priorityRank(p) {
  const i = PRIORITIES.indexOf(p);
  return i < 0 ? 0 : i;
}

/** Higher of two priorities; unknown values count as 'normal'. */
export function maxPriority(a, b) {
  const aa = isPriority(a) ? a : 'normal';
  const bb = isPriority(b) ? b : 'normal';
  return priorityRank(aa) >= priorityRank(bb) ? aa : bb;
}

export function defaultPriority(category) {
  return Object.prototype.hasOwnProperty.call(DEFAULTS, category) ? DEFAULTS[category] : 'normal';
}

export function hasEscalationWord(text) {
  return ESCALATION_RE.test(String(text || ''));
}

/** True when the shift starts less than 4h from `now` — including shifts that already started. */
export function shiftIsImminent(shiftStartsAt, now = Date.now()) {
  if (!shiftStartsAt) return false;
  const t = shiftStartsAt instanceof Date ? shiftStartsAt.getTime()
    : typeof shiftStartsAt === 'number' ? shiftStartsAt
    : Date.parse(String(shiftStartsAt));
  if (!Number.isFinite(t)) return false;
  return t - now < SHIFT_URGENT_WINDOW_MS;
}

export function computePriority({ category, summary, shiftStartsAt, explicit, now = Date.now() }) {
  let p = defaultPriority(category);
  if (category === 'staff' && shiftIsImminent(shiftStartsAt, now)) p = 'urgent';
  if (hasEscalationWord(summary)) p = 'urgent';
  if (isPriority(explicit)) p = maxPriority(p, explicit);
  return p;
}
