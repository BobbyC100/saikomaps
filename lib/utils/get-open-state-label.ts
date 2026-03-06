/**
 * getOpenStateLabelV2 — pure helper for "Opening soon" / "Closing soon" microcopy.
 *
 * Priority order:
 *  1. Open   + closes within threshold → "Closing soon"
 *  2. Open   → "Open now"
 *  3. Closed + opens within threshold (today, not all-day closed) → "Opening soon"
 *  4. Closed + next open time known → "Closed — Opens at {time}"
 *  5. Closed → "Closed now"
 *  6. No hours data → label null
 *
 * Open states are always evaluated before closed states to prevent stale
 * openNow=false data from surfacing a "Closed" label for an open place.
 */

export type OpenStateLabelKind =
  | 'opening_soon'
  | 'closing_soon'
  | 'open'
  | 'closed'
  | null;

export interface OpenStateResult {
  label: string | null;
  kind: OpenStateLabelKind;
  /** Formatted time string, present when showTime is true and label is opening/closing soon */
  at?: string;
}

/**
 * Minimal shape required from the parsed hours snapshot.
 * Compatible with the return type of parseHours() in
 * app/(viewer)/place/[slug]/lib/parseHours.ts.
 */
export interface HoursSnapshot {
  /** null when open/closed status is indeterminate (no hours data) */
  isOpen: boolean | null;
  /** Closing time string for current window, e.g. "9 PM" or "9:30 PM" */
  closesAt: string | null;
  /** Next opening time string, e.g. "11 AM" or "11:30 AM" */
  opensAt: string | null;
  /**
   * Today's full hours string, e.g. "11 AM – 9 PM" or "Closed".
   * Used to distinguish "not yet open today" from "next open is a future day".
   */
  today: string | null;
  /**
   * True when isOpen was derived from an explicit openNow/open_now boolean
   * in the hours data. False/absent when isOpen was inferred from hours text.
   * Passed through from parseHours(); used to gate open-state label display.
   */
  openNowExplicit?: boolean;
}

export interface GetOpenStateLabelOpts {
  /** Whether to append the time to the label, e.g. "Opening soon · 11 AM" */
  showTime?: boolean;
  /** Minutes window that qualifies as "soon" (inclusive). Default: 30 */
  thresholdMins?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Parse a short time string into 24-hour {hours, minutes}.
 * Accepts: "9 PM", "11 AM", "9:30 PM", "11:30 AM"
 */
function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  const m = timeStr.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3].toUpperCase();
  if (meridiem === 'PM' && h !== 12) h += 12;
  if (meridiem === 'AM' && h === 12) h = 0;
  return { hours: h, minutes: min };
}

/**
 * Returns positive minutes from `now` until the given time string (today or
 * the next occurrence if the time has already passed today).
 * Returns null if the time string cannot be parsed.
 */
export function minutesUntil(targetTimeStr: string, now: Date): number | null {
  const parsed = parseTimeString(targetTimeStr);
  if (!parsed) return null;
  const target = new Date(now);
  target.setHours(parsed.hours, parsed.minutes, 0, 0);
  let diff = (target.getTime() - now.getTime()) / 60_000;
  // Wrap negative diff to the next 24-hour window
  if (diff < 0) diff += 24 * 60;
  return diff;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function getOpenStateLabelV2(
  parsedHours: HoursSnapshot,
  now: Date,
  opts: GetOpenStateLabelOpts = {},
): OpenStateResult {
  const { thresholdMins = 30, showTime = false } = opts;
  const { isOpen, closesAt, opensAt, today } = parsedHours;

  if (isOpen === null) {
    return { label: null, kind: null };
  }

  // ── Priority 1: place is currently open ──────────────────────────────────
  // Check this first so an open place can never fall through to a "Closed"
  // label — even if stale openNow=false data is present in the snapshot.
  if (isOpen === true) {
    if (closesAt) {
      const minsUntilClose = minutesUntil(closesAt, now);
      if (minsUntilClose !== null && minsUntilClose <= thresholdMins) {
        const at = showTime ? closesAt : undefined;
        return {
          label: `Closing soon${at ? ` · ${at}` : ''}`,
          kind: 'closing_soon',
          ...(at !== undefined ? { at } : {}),
        };
      }
    }
    return { label: 'Open now', kind: 'open' };
  }

  // ── Priority 2: place is currently closed ────────────────────────────────
  // "Opening soon" only applies when today has actual open hours (not "Closed
  // all day"), meaning `opensAt` is today's upcoming open time — not a future
  // day's open time that happens to be within 30 min of the current clock.
  const todayIsClosedAllDay = today?.toLowerCase().includes('closed') ?? false;

  if (opensAt && !todayIsClosedAllDay) {
    const minsUntilOpen = minutesUntil(opensAt, now);
    if (minsUntilOpen !== null && minsUntilOpen <= thresholdMins) {
      const at = showTime ? opensAt : undefined;
      return {
        label: `Opening soon${at ? ` · ${at}` : ''}`,
        kind: 'opening_soon',
        ...(at !== undefined ? { at } : {}),
      };
    }
  }

  // When next open time is known, show it — more useful than "Closed now".
  // Applies to today's upcoming open time OR a future day's open time.
  if (opensAt) {
    return { label: `Closed — Opens at ${opensAt}`, kind: 'closed', at: opensAt };
  }

  return { label: 'Closed now', kind: 'closed' };
}
