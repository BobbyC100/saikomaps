import { describe, it, expect } from 'vitest';
import { parseHoursText, shouldWriteHours } from './parse-hours-text';

// ---------------------------------------------------------------------------
// parseHoursText — happy paths
// ---------------------------------------------------------------------------

describe('parseHoursText — happy paths', () => {
  it('parses a typical multi-line Instagram bio format', () => {
    const result = parseHoursText(
      'Mon–Fri 11am–9pm\nSat 10am–10pm\nSun 10am–8pm'
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.weeklyScheduleJson.monday).toBe('11 AM – 9 PM');
    expect(result.weeklyScheduleJson.friday).toBe('11 AM – 9 PM');
    expect(result.weeklyScheduleJson.saturday).toBe('10 AM – 10 PM');
    expect(result.weeklyScheduleJson.sunday).toBe('10 AM – 8 PM');
    expect(result.daysFound).toBeGreaterThanOrEqual(7);
  });

  it('parses colon-separated format', () => {
    const result = parseHoursText(
      'Monday–Friday: 9am–5pm\nSaturday: 10am–3pm\nSunday: Closed'
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.weeklyScheduleJson.monday).toBe('9 AM – 5 PM');
    expect(result.weeklyScheduleJson.sunday).toBe('Closed');
  });

  it('parses compound single-line format (Mon–Sat 11am–10pm, Sun 11am–8pm)', () => {
    const result = parseHoursText('Mon–Sat: 11am–10pm, Sun: 11am–8pm');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.weeklyScheduleJson.monday).toBe('11 AM – 10 PM');
    expect(result.weeklyScheduleJson.saturday).toBe('11 AM – 10 PM');
    expect(result.weeklyScheduleJson.sunday).toBe('11 AM – 8 PM');
  });

  it('parses 24-hour times', () => {
    const result = parseHoursText('Mon–Fri: 09:00–21:00\nSat: 10:00–22:00\nSun: 10:00–20:00');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.weeklyScheduleJson.monday).toBe('9 AM – 9 PM');
    expect(result.weeklyScheduleJson.saturday).toBe('10 AM – 10 PM');
  });

  it('parses times with minutes', () => {
    const result = parseHoursText('Mon–Thu: 11:30am–9:30pm\nFri–Sat: 11:30am–10:30pm\nSun: 12pm–8pm');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.weeklyScheduleJson.monday).toBe('11:30 AM – 9:30 PM');
    expect(result.weeklyScheduleJson.friday).toBe('11:30 AM – 10:30 PM');
    expect(result.weeklyScheduleJson.sunday).toBe('12 PM – 8 PM');
  });

  it('handles semicolon-separated lines', () => {
    const result = parseHoursText('Mon–Fri: 11am–9pm; Sat: 10am–10pm; Sun: 10am–8pm');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.weeklyScheduleJson.monday).toBe('11 AM – 9 PM');
    expect(result.weeklyScheduleJson.saturday).toBe('10 AM – 10 PM');
  });

  it('handles full day names', () => {
    const result = parseHoursText(
      'Monday: 11am–9pm\nTuesday: 11am–9pm\nWednesday: 11am–9pm\nThursday: Closed\nFriday: 5pm–10pm\nSaturday: 12pm–11pm\nSunday: 12pm–9pm'
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.weeklyScheduleJson.thursday).toBe('Closed');
    expect(result.weeklyScheduleJson.friday).toBe('5 PM – 10 PM');
  });

  it('parses case-insensitive day abbreviations', () => {
    const result = parseHoursText('MON–FRI: 9AM–5PM\nSAT: 10AM–3PM\nSUN: closed');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.weeklyScheduleJson.sunday).toBe('Closed');
  });
});

// ---------------------------------------------------------------------------
// parseHoursText — bail-outs and rejection cases
// ---------------------------------------------------------------------------

describe('parseHoursText — rejects ambiguous / un-parseable input', () => {
  it('returns null for empty string', () => {
    const r = parseHoursText('');
    expect(r.ok).toBe(false);
  });

  it('returns null for null', () => {
    const r = parseHoursText(null);
    expect(r.ok).toBe(false);
  });

  it('returns null for "by appointment"', () => {
    const r = parseHoursText('By appointment only');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toMatch(/bail pattern/i);
  });

  it('returns null for "call ahead"', () => {
    const r = parseHoursText('Call ahead for hours');
    expect(r.ok).toBe(false);
  });

  it('returns null for "temporarily closed"', () => {
    const r = parseHoursText('Temporarily closed for renovation');
    expect(r.ok).toBe(false);
  });

  it('returns null for generic bio text (no recognisable pattern)', () => {
    const r = parseHoursText('We serve the best tacos in LA! Come visit us anytime.');
    expect(r.ok).toBe(false);
  });

  it('rejects when fewer than 3 distinct days are found', () => {
    // Only 2 days parseable — not enough confidence
    const r = parseHoursText('Mon: 11am–9pm\nFri: 5pm–10pm');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toMatch(/distinct day/i);
  });

  it('rejects ambiguous Fri–Mon range (wraps week boundary)', () => {
    // We don't support wrap-around ranges — too risky to guess
    const r = parseHoursText('Fri–Mon: 5pm–11pm\nTue: closed\nWed: closed');
    expect(r.ok).toBe(false);
  });

  it('rejects bare integers with no AM/PM', () => {
    const r = parseHoursText('Mon–Fri: 9–5\nSat: 10–3\nSun: closed');
    expect(r.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// shouldWriteHours — write policy
// ---------------------------------------------------------------------------

describe('shouldWriteHours', () => {
  it('writes when hours_json is null', () => {
    const d = shouldWriteHours({ parsedOk: true, existingHoursJson: null, existingSource: null });
    expect(d.write).toBe(true);
    expect(d.reason).toMatch(/empty/i);
  });

  it('writes when hours_json is undefined', () => {
    const d = shouldWriteHours({ parsedOk: true, existingHoursJson: undefined, existingSource: undefined });
    expect(d.write).toBe(true);
  });

  it('writes when existing source is unknown', () => {
    const d = shouldWriteHours({ parsedOk: true, existingHoursJson: { weekday_text: [] }, existingSource: 'unknown' });
    expect(d.write).toBe(true);
  });

  it('writes when existing source is empty string', () => {
    const d = shouldWriteHours({ parsedOk: true, existingHoursJson: { weekday_text: [] }, existingSource: '' });
    expect(d.write).toBe(true);
  });

  it('does NOT write when existing source is google_places', () => {
    const d = shouldWriteHours({ parsedOk: true, existingHoursJson: { weekday_text: [] }, existingSource: 'google_places' });
    expect(d.write).toBe(false);
    expect(d.reason).toMatch(/higher-confidence/i);
  });

  it('does NOT write when parsedOk is false', () => {
    const d = shouldWriteHours({ parsedOk: false, existingHoursJson: null, existingSource: null });
    expect(d.write).toBe(false);
    expect(d.reason).toMatch(/parser/i);
  });

  it('does NOT overwrite google_places even when hours_json is populated and parsedOk', () => {
    const d = shouldWriteHours({
      parsedOk: true,
      existingHoursJson: { weekday_text: ['Monday: 9 AM – 5 PM'] },
      existingSource: 'google_places',
    });
    expect(d.write).toBe(false);
  });

  it('manual_placeholder is treated as low-confidence — instagram overwrites', () => {
    const d = shouldWriteHours({
      parsedOk: true,
      existingHoursJson: { monday: 'varies' },
      existingSource: 'manual_placeholder',
    });
    expect(d.write).toBe(true);
  });
});
