/**
 * parse-hours-text.ts
 *
 * Conservative parser for free-text hours strings captured from Instagram
 * profiles, bios, or other non-structured sources.
 *
 * Design rules:
 *  - Prefer false negatives (return null) over false positives (bad data in DB).
 *  - Never guess. If the pattern is ambiguous, return null.
 *  - Output is a day-keyed object compatible with parseHours() day-keyed path:
 *      { monday: "9 AM – 9 PM", tuesday: "9 AM – 9 PM", ... }
 *  - Closed days are represented as "Closed".
 *  - Times are normalised to "H AM/PM – H AM/PM" (no leading zeros, en-dash).
 */

export type WeeklySchedule = Record<string, string>;

export type ParseHoursTextResult =
  | { ok: true; weeklyScheduleJson: WeeklySchedule; daysFound: number }
  | { ok: false; reason: string };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_NAMES: Record<string, string> = {
  monday: 'monday', mon: 'monday', mo: 'monday', m: 'monday',
  tuesday: 'tuesday', tue: 'tuesday', tues: 'tuesday', tu: 'tuesday',
  wednesday: 'wednesday', wed: 'wednesday', we: 'wednesday', w: 'wednesday',
  thursday: 'thursday', thu: 'thursday', thur: 'thursday', thurs: 'thursday', th: 'thursday',
  friday: 'friday', fri: 'friday', fr: 'friday', f: 'friday',
  saturday: 'saturday', sat: 'saturday', sa: 'saturday',
  sunday: 'sunday', sun: 'sunday', su: 'sunday',
};

const CANONICAL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ORDER: Record<string, number> = Object.fromEntries(CANONICAL_DAYS.map((d, i) => [d, i]));

// Patterns that indicate the text is not parseable hours
const BAIL_PATTERNS = [
  /by appointment/i,
  /call (us |ahead|for)/i,
  /check (website|instagram|back)/i,
  /seasonal/i,
  /varies/i,
  /coming soon/i,
  /temporarily closed/i,
  /closed (permanently|indefinitely)/i,
];

// ---------------------------------------------------------------------------
// Time normalisation
// ---------------------------------------------------------------------------

/**
 * Parse a time token like "9am", "9:30AM", "9:00 AM", "21:00" → "9 AM" or "9:30 PM".
 * Returns null if unrecognisable.
 */
function parseTimeToken(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, '');
  // 24-hour: 17:00, 21:30
  const h24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) {
    let h = parseInt(h24[1], 10);
    const m = parseInt(h24[2], 10);
    if (h > 23 || m > 59) return null;
    const suffix = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    const mStr = m > 0 ? `:${String(m).padStart(2, '0')}` : '';
    return `${h}${mStr} ${suffix}`;
  }
  // 12-hour: 9am, 9:30pm, 9 AM, 9:30 PM, 12pm
  const h12 = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (h12) {
    let h = parseInt(h12[1], 10);
    const m = h12[2] ? parseInt(h12[2], 10) : 0;
    const suffix = h12[3].toUpperCase();
    if (h > 12 || m > 59) return null;
    const mStr = m > 0 ? `:${String(m).padStart(2, '0')}` : '';
    return `${h}${mStr} ${suffix}`;
  }
  // Bare integer that could be noon/midnight context — reject; too ambiguous
  return null;
}

/**
 * Parse "9 AM – 10 PM" or "9am-10pm" range → "9 AM – 10 PM" or null.
 */
function parseTimeRange(raw: string): string | null {
  // Split on –, -, to, –, —
  const parts = raw.split(/\s*(?:–|—|-|to)\s*/i);
  if (parts.length !== 2) return null;
  const open = parseTimeToken(parts[0].trim());
  const close = parseTimeToken(parts[1].trim());
  if (!open || !close) return null;
  return `${open} – ${close}`;
}

// ---------------------------------------------------------------------------
// Day range expansion
// ---------------------------------------------------------------------------

/**
 * Expand "Mon–Fri" or "Mon,Wed,Fri" or a single day into an array of canonical day names.
 * Returns null if the token is unrecognisable.
 */
function expandDayToken(raw: string): string[] | null {
  const lower = raw.trim().toLowerCase().replace(/\./g, '');

  // Range: "mon-fri" / "mon–fri"
  const rangeMatch = lower.match(/^(\w+)\s*(?:-|–|—|to)\s*(\w+)$/);
  if (rangeMatch) {
    const start = DAY_NAMES[rangeMatch[1]];
    const end = DAY_NAMES[rangeMatch[2]];
    if (!start || !end) return null;
    const si = DAY_ORDER[start];
    const ei = DAY_ORDER[end];
    if (si > ei) return null; // e.g. "Fri–Mon" is ambiguous — reject
    return CANONICAL_DAYS.slice(si, ei + 1);
  }

  // List: "mon,wed,fri" (already split by caller; or single)
  const single = DAY_NAMES[lower];
  return single ? [single] : null;
}

/**
 * Given a day expression ("Mon-Fri", "Mon, Wed, Fri", "Tuesday") return all canonical days.
 */
function parseDayExpression(expr: string): string[] | null {
  // Split on commas first (handles "Mon, Wed, Fri")
  const tokens = expr.split(/\s*,\s*/);
  const days: string[] = [];
  for (const t of tokens) {
    const expanded = expandDayToken(t);
    if (!expanded) return null;
    for (const d of expanded) {
      if (!days.includes(d)) days.push(d);
    }
  }
  return days.length > 0 ? days : null;
}

// ---------------------------------------------------------------------------
// Line parser
// ---------------------------------------------------------------------------

type LineResult = { days: string[]; hours: string } | null;

/**
 * Parse one line like:
 *   "Mon–Fri: 11am–9pm"
 *   "Saturday 10 AM – 2 PM"
 *   "Sunday: closed"
 *   "Mon–Sat 11:00am–10:00pm, Sun 11:00am–8:00pm"
 */
function parseLine(line: string): LineResult[] {
  const raw = line.trim();
  if (!raw) return [];

  // Split compound lines: "Mon–Sat 11am–10pm, Sun 11am–8pm"
  // A compound line has a day expression after a comma that's followed by time info.
  // Strategy: try splitting on ", " and parsing each sub-part recursively.
  const compoundParts = raw.split(/,\s*(?=[A-Za-z])/);
  if (compoundParts.length > 1) {
    const results: LineResult[] = [];
    for (const part of compoundParts) {
      const sub = parseLine(part);
      for (const r of sub) {
        if (r) results.push(r);
      }
    }
    return results;
  }

  // Normalise separator between day expression and time range
  // Patterns:  "Mon–Fri: 9am–5pm" | "Monday 9am–5pm" | "Mon-Fri 9am-5pm"
  const sep = raw.match(/^(.+?)\s*[:\s]\s*((?:\d|noon|midnight|closed).*)$/i);
  if (!sep) return [];

  const dayPart = sep[1].trim();
  const timePart = sep[2].trim();

  const days = parseDayExpression(dayPart);
  if (!days || days.length === 0) return [];

  if (/^closed$/i.test(timePart)) {
    return [{ days, hours: 'Closed' }];
  }

  const range = parseTimeRange(timePart);
  if (!range) return [];

  return [{ days, hours: range }];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse free-text hours (from Instagram bio, profile, etc.) into a day-keyed
 * weekly schedule compatible with the app's parseHours() day-keyed path.
 *
 * @param raw - Raw string, e.g. "Mon–Fri 11am–9pm\nSat–Sun 10am–10pm"
 * @returns ParseHoursTextResult
 */
export function parseHoursText(raw: string | null | undefined): ParseHoursTextResult {
  if (!raw || !raw.trim()) {
    return { ok: false, reason: 'empty input' };
  }

  // Bail on known un-parseable patterns first
  for (const pattern of BAIL_PATTERNS) {
    if (pattern.test(raw)) {
      return { ok: false, reason: `matched bail pattern: ${pattern.source}` };
    }
  }

  // Split into lines (handle \n, ; as line separators)
  const lines = raw
    .split(/\n|;/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { ok: false, reason: 'no lines after splitting' };
  }

  const schedule: WeeklySchedule = {};
  let daysFound = 0;

  for (const line of lines) {
    const results = parseLine(line);
    for (const r of results) {
      if (!r) continue;
      for (const day of r.days) {
        schedule[day] = r.hours;
        daysFound++;
      }
    }
  }

  // Require at least 3 distinct days to avoid single-day false positives
  const distinctDays = Object.keys(schedule).length;
  if (distinctDays < 3) {
    return {
      ok: false,
      reason: `only ${distinctDays} distinct day(s) found — need ≥ 3 for confidence`,
    };
  }

  return { ok: true, weeklyScheduleJson: schedule, daysFound };
}

// ---------------------------------------------------------------------------
// Hours write policy
// ---------------------------------------------------------------------------

export type HoursWriteDecision =
  | { write: true; reason: string }
  | { write: false; reason: string };

/**
 * Decide whether to overwrite hours_json with parsed Instagram hours.
 *
 * Policy:
 *  - Always write if hours_json is currently null.
 *  - Write if existing source attribution is lower-confidence than "instagram"
 *    (only "unknown" / null / missing qualifies in v1).
 *  - Never overwrite Google Places hours (source = "google_places") —
 *    Google is considered higher-confidence than raw text parsing.
 */
export function shouldWriteHours(args: {
  parsedOk: boolean;
  existingHoursJson: unknown;
  existingSource: string | null | undefined;
}): HoursWriteDecision {
  if (!args.parsedOk) {
    return { write: false, reason: 'parser returned null — nothing to write' };
  }
  if (args.existingHoursJson === null || args.existingHoursJson === undefined) {
    return { write: true, reason: 'hours_json is empty — instagram hours fills the gap' };
  }
  const src = (args.existingSource ?? '').toLowerCase();
  if (src === '' || src === 'unknown' || src === 'manual_placeholder') {
    return { write: true, reason: `existing source "${src}" is lower-confidence; instagram overwrites` };
  }
  // google_places, google_places_api, or any resolved source → do not overwrite
  return {
    write: false,
    reason: `existing source "${args.existingSource}" is higher-confidence; instagram skipped`,
  };
}
