import { describe, it, expect } from 'vitest';
import { getOpenStateLabelV2, minutesUntil, type HoursSnapshot } from './get-open-state-label';

// ---------------------------------------------------------------------------
// Helpers to build deterministic test fixtures
// ---------------------------------------------------------------------------

/**
 * Build a Date object with a specific time on an arbitrary fixed calendar date.
 * Using a Monday so day-of-week doesn't interfere with unrelated logic.
 */
function makeNow(hh: number, mm: number): Date {
  const d = new Date('2025-01-06T00:00:00.000Z'); // Monday 2025-01-06
  d.setHours(hh, mm, 0, 0);
  return d;
}

/**
 * Snapshot helpers — build the minimal HoursSnapshot the helper consumes.
 */
function openSnap(closesAt: string | null, today = '11 AM – 9 PM'): HoursSnapshot {
  return { isOpen: true, closesAt, opensAt: null, today };
}

function closedSnap(opensAt: string | null, todayClosedAllDay = false): HoursSnapshot {
  const today = todayClosedAllDay ? 'Closed' : '11 AM – 9 PM';
  return { isOpen: false, closesAt: null, opensAt, today };
}

function noHoursSnap(): HoursSnapshot {
  return { isOpen: null, closesAt: null, opensAt: null, today: null };
}

// ---------------------------------------------------------------------------
// minutesUntil — internal utility (exported for testing)
// ---------------------------------------------------------------------------

describe('minutesUntil', () => {
  it('returns minutes to a future time on the same day', () => {
    const now = makeNow(10, 0); // 10:00 AM
    expect(minutesUntil('11 AM', now)).toBeCloseTo(60, 0);
  });

  it('wraps past times to the next 24-hour occurrence', () => {
    const now = makeNow(22, 0); // 10 PM
    // 9 PM is in the past → next occurrence is +23h
    expect(minutesUntil('9 PM', now)).toBeCloseTo(23 * 60, 0);
  });

  it('handles :30 minutes', () => {
    const now = makeNow(10, 0);
    expect(minutesUntil('10:30 AM', now)).toBeCloseTo(30, 0);
  });

  it('returns null for an unparseable string', () => {
    expect(minutesUntil('noon', makeNow(10, 0))).toBeNull();
    expect(minutesUntil('', makeNow(10, 0))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Closed → Opening soon
// ---------------------------------------------------------------------------

describe('getOpenStateLabelV2 — Closed → Opening soon', () => {
  it('opens in 29 mins → Opening soon', () => {
    const now = makeNow(10, 31); // 10:31 AM; opens at 11 AM → 29 min
    const result = getOpenStateLabelV2(closedSnap('11 AM'), now);
    expect(result.kind).toBe('opening_soon');
    expect(result.label).toBe('Opening soon');
  });

  it('opens in exactly 30 mins → Opening soon (inclusive boundary)', () => {
    const now = makeNow(10, 30); // 10:30 AM; opens at 11 AM → 30 min
    const result = getOpenStateLabelV2(closedSnap('11 AM'), now);
    expect(result.kind).toBe('opening_soon');
  });

  it('opens in 31 mins → Closed — Opens at 11 AM (next open time shown)', () => {
    const now = makeNow(10, 29); // 10:29 AM; opens at 11 AM → 31 min
    const result = getOpenStateLabelV2(closedSnap('11 AM'), now);
    expect(result.kind).toBe('closed');
    expect(result.label).toBe('Closed — Opens at 11 AM');
    expect(result.at).toBe('11 AM');
  });

  it('includes time in label when showTime: true', () => {
    const now = makeNow(10, 40);
    const result = getOpenStateLabelV2(closedSnap('11 AM'), now, { showTime: true });
    expect(result.kind).toBe('opening_soon');
    expect(result.label).toBe('Opening soon · 11 AM');
    expect(result.at).toBe('11 AM');
  });

  it('respects custom thresholdMins', () => {
    const now = makeNow(10, 45); // 15 min before 11 AM
    const within15 = getOpenStateLabelV2(closedSnap('11 AM'), now, { thresholdMins: 15 });
    const within10 = getOpenStateLabelV2(closedSnap('11 AM'), now, { thresholdMins: 10 });
    expect(within15.kind).toBe('opening_soon');
    expect(within10.kind).toBe('closed');
  });
});

// ---------------------------------------------------------------------------
// Open → Closing soon
// ---------------------------------------------------------------------------

describe('getOpenStateLabelV2 — Open → Closing soon', () => {
  it('closes in 29 mins → Closing soon', () => {
    const now = makeNow(20, 31); // 8:31 PM; closes at 9 PM → 29 min
    const result = getOpenStateLabelV2(openSnap('9 PM'), now);
    expect(result.kind).toBe('closing_soon');
    expect(result.label).toBe('Closing soon');
  });

  it('closes in exactly 30 mins → Closing soon (inclusive boundary)', () => {
    const now = makeNow(20, 30); // 8:30 PM; closes at 9 PM → 30 min
    const result = getOpenStateLabelV2(openSnap('9 PM'), now);
    expect(result.kind).toBe('closing_soon');
  });

  it('closes in 31 mins → Open now', () => {
    const now = makeNow(20, 29); // 8:29 PM; closes at 9 PM → 31 min
    const result = getOpenStateLabelV2(openSnap('9 PM'), now);
    expect(result.kind).toBe('open');
    expect(result.label).toBe('Open now');
  });

  it('includes time in label when showTime: true', () => {
    const now = makeNow(20, 40);
    const result = getOpenStateLabelV2(openSnap('9 PM'), now, { showTime: true });
    expect(result.kind).toBe('closing_soon');
    expect(result.label).toBe('Closing soon · 9 PM');
    expect(result.at).toBe('9 PM');
  });
});

// ---------------------------------------------------------------------------
// Normal open / closed (well outside threshold)
// ---------------------------------------------------------------------------

describe('getOpenStateLabelV2 — Normal open/closed', () => {
  it('open with >30 mins to close → Open now', () => {
    const now = makeNow(14, 0); // 2 PM; closes at 9 PM → 420 min
    const result = getOpenStateLabelV2(openSnap('9 PM'), now);
    expect(result.kind).toBe('open');
    expect(result.label).toBe('Open now');
  });

  it('closed with >30 mins to open → Closed — Opens at 11 AM', () => {
    const now = makeNow(8, 0); // 8 AM; opens at 11 AM → 180 min
    const result = getOpenStateLabelV2(closedSnap('11 AM'), now);
    expect(result.kind).toBe('closed');
    expect(result.label).toBe('Closed — Opens at 11 AM');
    expect(result.at).toBe('11 AM');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('getOpenStateLabelV2 — Edge cases', () => {
  it('no hours available → label null, kind null', () => {
    const result = getOpenStateLabelV2(noHoursSnap(), makeNow(12, 0));
    expect(result.label).toBeNull();
    expect(result.kind).toBeNull();
  });

  it('open but no closesAt → Open now (no Closing soon)', () => {
    // Place is open but we have no close time (e.g. "Open 24 hours")
    const result = getOpenStateLabelV2(openSnap(null), makeNow(12, 0));
    expect(result.kind).toBe('open');
    expect(result.label).toBe('Open now');
  });

  it('closed all day today, opensAt from tomorrow → no Opening soon, shows Closed — Opens at', () => {
    // today = "Closed" means opensAt came from a future day.
    // "Opening soon" must NOT trigger (guard: !todayIsClosedAllDay).
    // But "Closed — Opens at {time}" still shows because opensAt is known.
    const snap: HoursSnapshot = {
      isOpen: false,
      closesAt: null,
      opensAt: '11 AM',       // from tomorrow's data
      today: 'Closed',        // today is a closed day
    };
    const now = makeNow(10, 40);
    const result = getOpenStateLabelV2(snap, now);
    expect(result.kind).toBe('closed');
    expect(result.label).toBe('Closed — Opens at 11 AM');
    // Confirm Opening soon did NOT fire (it would require !todayIsClosedAllDay)
    expect(result.kind).not.toBe('opening_soon');
  });

  it('closed all day, far from next-day open → Closed — Opens at 11 AM', () => {
    const snap: HoursSnapshot = {
      isOpen: false,
      closesAt: null,
      opensAt: '11 AM',
      today: 'Closed',
    };
    const now = makeNow(8, 0); // 3 hours before 11 AM
    const result = getOpenStateLabelV2(snap, now);
    expect(result.kind).toBe('closed');
    expect(result.label).toBe('Closed — Opens at 11 AM');
  });

  it('currently past closing for today, opensAt is stale time → Closed — Opens at (tomorrow)', () => {
    // Place was open 11 AM – 9 PM; it is now 10 PM (past close).
    // minutesUntil wraps: "11 AM" from 10 PM ≈ 13h away — no Opening soon.
    // "Closed — Opens at 11 AM" is shown (opens tomorrow at 11 AM).
    const snap: HoursSnapshot = {
      isOpen: false,
      closesAt: null,
      opensAt: '11 AM',
      today: '11 AM – 9 PM',
    };
    const now = makeNow(22, 0); // 10 PM
    const result = getOpenStateLabelV2(snap, now);
    expect(result.kind).toBe('closed');
    expect(result.label).toBe('Closed — Opens at 11 AM');
    expect(result.kind).not.toBe('opening_soon');
  });

  it('overnight bar: closing at 2 AM, now 1:45 AM → Closing soon', () => {
    // Bar closes at 2 AM; it is currently 1:45 AM (same calendar day).
    // minutesUntil("2 AM", 1:45 AM) = 15 min → Closing soon.
    const snap: HoursSnapshot = {
      isOpen: true,
      closesAt: '2 AM',
      opensAt: null,
      today: '10 PM – 2 AM',
    };
    const now = makeNow(1, 45); // 1:45 AM
    const result = getOpenStateLabelV2(snap, now);
    expect(result.kind).toBe('closing_soon');
  });

  it('overnight bar: closing at 2 AM, now 10 PM → Open now (not closing soon)', () => {
    const snap: HoursSnapshot = {
      isOpen: true,
      closesAt: '2 AM',
      opensAt: null,
      today: '10 PM – 2 AM',
    };
    const now = makeNow(22, 0); // 10 PM
    const result = getOpenStateLabelV2(snap, now);
    expect(result.kind).toBe('open');
  });

  it('at parameter is absent for "Closed — Opens at" when showTime is false', () => {
    // at is always included for "Closed — Opens at" (the time IS the label)
    // — this test documents that at is present regardless of showTime.
    const now = makeNow(8, 0); // 3h before 11 AM — outside threshold
    const result = getOpenStateLabelV2(closedSnap('11 AM'), now);
    expect(result.kind).toBe('closed');
    expect(result.label).toBe('Closed — Opens at 11 AM');
    // at is included because the time appears inside the label
    expect(result.at).toBe('11 AM');
  });
});

// ---------------------------------------------------------------------------
// WO-required: "Closed — Opens at {time}" format
// ---------------------------------------------------------------------------

describe('getOpenStateLabelV2 — Closed — Opens at {time}', () => {
  it('closed, far from open (3h) → Closed — Opens at 5 PM', () => {
    const snap: HoursSnapshot = {
      isOpen: false,
      closesAt: null,
      opensAt: '5 PM',
      today: '5 PM – 10 PM',
    };
    const now = makeNow(14, 0); // 2 PM, 3 hours before 5 PM
    const result = getOpenStateLabelV2(snap, now);
    expect(result.kind).toBe('closed');
    expect(result.label).toBe('Closed — Opens at 5 PM');
    expect(result.at).toBe('5 PM');
  });

  it('closed, next open has :30 minutes → Closed — Opens at 5:30 PM', () => {
    const snap: HoursSnapshot = {
      isOpen: false,
      closesAt: null,
      opensAt: '5:30 PM',
      today: '5:30 PM – 10 PM',
    };
    const now = makeNow(12, 0);
    const result = getOpenStateLabelV2(snap, now);
    expect(result.kind).toBe('closed');
    expect(result.label).toBe('Closed — Opens at 5:30 PM');
  });

  it('closed with no opensAt at all → Closed now', () => {
    const snap: HoursSnapshot = {
      isOpen: false,
      closesAt: null,
      opensAt: null,
      today: '11 AM – 9 PM',
    };
    const result = getOpenStateLabelV2(snap, makeNow(22, 0));
    expect(result.kind).toBe('closed');
    expect(result.label).toBe('Closed now');
    expect(result.at).toBeUndefined();
  });

  it('Opening soon boundary at exactly 30 min takes priority over Closed — Opens at', () => {
    const now = makeNow(10, 30); // 10:30 AM; opens at 11 AM → exactly 30 min
    const result = getOpenStateLabelV2(closedSnap('11 AM'), now);
    expect(result.kind).toBe('opening_soon');
    // "Opening soon" wins — NOT "Closed — Opens at"
    expect(result.label).not.toContain('Closed —');
  });

  it('Opening soon at 29 min takes priority over Closed — Opens at', () => {
    const now = makeNow(10, 31); // 10:31 AM; opens at 11 AM → 29 min
    const result = getOpenStateLabelV2(closedSnap('11 AM'), now);
    expect(result.kind).toBe('opening_soon');
  });

  it('open with known next close time well outside threshold → Open now, not Closed — Opens at', () => {
    const now = makeNow(14, 0); // 2 PM; closes at 9 PM → 7h
    const result = getOpenStateLabelV2(openSnap('9 PM'), now);
    expect(result.kind).toBe('open');
    expect(result.label).toBe('Open now');
  });
});
