/**
 * Email command parser (spec §6.3). Pure: no I/O, no env.
 *
 * A staff reply is read line by line after the quoted reply and any sign-off
 * have been cut away. Each line is tried as a command; lines that are not
 * commands become the note. A line that LOOKS like a command but is not one
 * (a typo such as "asign jo", "priority hgih", "assign" with no name) is
 * reported in `unknown` so the caller can bounce it — and in that case the
 * note is suppressed, because the sender clearly meant to command, not to
 * write prose (spec §6.3: "Unknown-word lines are treated as note text only
 * if no line in the message looked like a failed command").
 */

export const COMMAND_HELP = [
  ['assign <name>  /  @name', 'assign to a member of staff'],
  ['mine  /  take', 'assign to yourself'],
  ['close  /  done  /  resolved', 'close the ticket'],
  ['reopen', 'reopen the ticket'],
  ['in progress  /  started', 'mark as in progress'],
  ['urgent  /  priority high  /  priority normal', 'change priority'],
  ['category staff|referral|resident|general', 'recategorise'],
  ['dropshift', 'staff tickets only — drop the shift in CareRota and start its cover cascade'],
  ['internal: <text>  or  # <text>', 'internal note (never sent to the caller)'],
  ['anything else', 'public note — sent to the caller when we have their email'],
];

const STATUS_WORDS = {
  close: 'closed', closed: 'closed', resolved: 'closed', resolve: 'closed', done: 'closed',
  reopen: 'open', open: 'open',
  'in progress': 'in_progress', 'in-progress': 'in_progress', 'working on it': 'in_progress', started: 'in_progress',
};
const CATEGORY_WORDS = {
  staff: 'staff', referral: 'referral', general: 'general',
  resident: 'resident_concern', 'resident concern': 'resident_concern', resident_concern: 'resident_concern', 'resident-concern': 'resident_concern',
};
const PRIORITY_WORDS = ['normal', 'high', 'urgent'];
const KEYWORDS = ['assign', 'mine', 'take', 'close', 'closed', 'resolved', 'done', 'reopen', 'open', 'in progress', 'working on it', 'started', 'urgent', 'priority', 'category', 'internal', 'dropshift'];

const QUOTE_MARKERS = [
  /^From:\s/m,
  /^-{2,}\s*Original Message\s*-{2,}/mi,
  /^>/m,
  /^On [^\n]{0,200}(?:\n[^\n]{0,120})?wrote:\s*$/m,
  /^_{10,}\s*$/m,
  /^-- $/m,
  /^Sent from my /m,
];
const SIGN_OFF_RE = /^(kind regards|best regards|warm regards|regards|many thanks|thanks|thank you|best|cheers|ta)[,.!]?$/i;

/** Everything from the first quoted-reply marker downward is dropped. */
export function stripQuotedReply(text) {
  const s = String(text || '').replace(/\r\n?/g, '\n');
  let cut = s.length;
  for (const re of QUOTE_MARKERS) {
    const m = re.exec(s);
    if (m && m.index < cut) cut = m.index;
  }
  return s.slice(0, cut).trim();
}

/**
 * Drop only the line that literally reads as a closing phrase ("Thanks",
 * "Kind regards,") — never anything after it.
 *
 * Two earlier fix rounds tried to also swallow the name/title lines that
 * typically follow a sign-off, using word-count and then punctuation
 * heuristics to tell a signature from real content. Both let through a
 * short trailing sentence that lacked the discriminator they relied on
 * ("Thanks\nCalled her mum" silently lost "Called her mum"). There is no
 * local, structural rule that reliably tells a two-word name from a
 * two-word note — the two are genuinely indistinguishable without reading
 * for meaning. Given the spec's "nothing silently dropped" principle, the
 * failure mode that has to be impossible is losing real content, not
 * leaving a stray "Joanne Bray" in a ticket note — so this only ever
 * removes the sign-off phrase itself.
 */
export function stripSignOff(text) {
  const lines = String(text || '').split('\n').filter((l) => !SIGN_OFF_RE.test(l.trim()));
  return lines.join('\n').trim();
}

/** Optimal string alignment distance — one adjacent transposition counts as a single edit. */
export function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

const unknown = (raw, suggestion) => ({ type: 'unknown', raw, suggestion });

/**
 * Parse one line. Returns null when the line is not a command (note text),
 * a command object, or { type: 'unknown', raw, suggestion } for a failed command.
 */
export function parseLine(rawLine) {
  const raw = String(rawLine ?? '').trim();
  if (!raw) return null;

  let m = /^(?:#|internal\s*:)\s*(.*)$/i.exec(raw);
  if (m) return m[1].trim() ? { type: 'internal_note', value: m[1].trim(), raw } : unknown(raw, 'internal: <your note>');

  const line = raw.replace(/[.!,;:]+$/, '').trim();
  const lower = line.toLowerCase().replace(/\s+/g, ' ');
  const words = lower.split(' ').filter(Boolean);
  // A line is only eligible to be reported as a *failed* command (a bad
  // category/priority value, or a typo) when it is command-shaped: at most 3
  // words. Longer lines are ordinary prose that merely starts with, or
  // contains, a command-like word — they become note text instead.
  const commandShaped = words.length <= 3;

  if (line.startsWith('@')) {
    const who = line.slice(1).trim();
    return who ? { type: 'assign', value: who, raw } : unknown(raw, 'assign <name>');
  }
  m = /^assign\b(?:\s*:|\s+to\b)?\s*(.*)$/i.exec(line);
  if (m) {
    const who = m[1].trim();
    if (!who) return unknown(raw, 'assign <name>');
    // "Assign a mentor to help her settle in properly" is prose that starts
    // with the verb "assign", not a command — a real assign target is a
    // short name, never a long sentence. Fall through to note text.
    if (words.length > 5) return null;
    return { type: 'assign', value: who, raw };
  }
  if (lower === 'mine' || lower === 'take') return { type: 'take', raw };
  if (lower === 'dropshift' || lower === 'drop shift') return { type: 'dropshift', raw };
  if (STATUS_WORDS[lower]) return { type: 'status', value: STATUS_WORDS[lower], raw };
  if (lower === 'urgent') return { type: 'priority', value: 'urgent', raw };
  m = /^priority\b\s*:?\s*(.*)$/i.exec(line);
  if (m) {
    const p = m[1].trim().toLowerCase();
    if (PRIORITY_WORDS.includes(p)) return { type: 'priority', value: p, raw };
    return commandShaped ? unknown(raw, 'priority normal|high|urgent') : null;
  }
  m = /^category\b\s*:?\s*(.*)$/i.exec(line);
  if (m) {
    const c = CATEGORY_WORDS[m[1].trim().toLowerCase().replace(/\s+/g, ' ')];
    if (c) return { type: 'category', value: c, raw };
    return commandShaped ? unknown(raw, 'category staff|referral|resident|general') : null;
  }

  // Typo detection: a short line whose first word is one edit away from a
  // command keyword. A word that already IS a keyword (or a real inflection
  // of one, longer than the keyword itself — "closed"/"taken"/"opens") is
  // never "corrected" to a different keyword.
  if (commandShaped) {
    const first = words[0].replace(/[^a-z]/g, '');
    if (first.length >= 4 && !KEYWORDS.includes(first)) {
      for (const kw of KEYWORDS) {
        const head = kw.split(' ')[0];
        if (head.length >= 4 && first.length <= head.length && editDistance(first, head) === 1) {
          return unknown(raw, kw);
        }
      }
    }
  }
  return null;
}

/** Human sentence for a failed command, used in the system note and bounce email. */
export function unknownMessage(raw) {
  const p = parseLine(raw);
  const hint = p?.type === 'unknown' && p.suggestion ? ` — did you mean ${p.suggestion}?` : '';
  return `Couldn't understand '${String(raw).trim()}'${hint}`;
}

/**
 * @returns {{ commands: Array<{type:string, value?:string, raw:string}>, note: string|null, unknown: string[] }}
 */
export function parseCommands(bodyText) {
  const text = stripSignOff(stripQuotedReply(bodyText));
  const commands = [];
  const unknownLines = [];
  const noteLines = [];
  for (const line of text.split('\n')) {
    const parsed = parseLine(line);
    if (!parsed) { noteLines.push(line.trim()); continue; }
    if (parsed.type === 'unknown') unknownLines.push(parsed.raw);
    else commands.push(parsed);
  }
  const note = noteLines.join('\n').replace(/\n{3,}/g, '\n\n').trim() || null;
  return { commands, note: unknownLines.length ? null : note, unknown: unknownLines };
}
