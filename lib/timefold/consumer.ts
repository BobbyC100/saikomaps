/**
 * TimeFOLD v1 — Consumer Expression Layer
 *
 * Hardcoded phrase mapping and render guard for the public-facing
 * temporal orientation sentence. No dynamic copy. No freeform text.
 * No trace exposure. No timeline.
 *
 * WO: S.K.A.I./WO-TIMEFOLD-001 v1.1
 *
 * Render contract:
 *   getTimeFOLDPhrase() returns a string only when timefold_status = 'APPROVED'
 *   and timefold_class is a known class. Returns null in all other cases.
 *   At most one sentence renders per place.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TIMEFOLD_CLASSES = ['STABILITY', 'NEWNESS'] as const;
export const TIMEFOLD_STATUSES = ['PROPOSED', 'APPROVED', 'SUPPRESSED'] as const;

export type TimeFOLDClass = (typeof TIMEFOLD_CLASSES)[number];
export type TimeFOLDStatus = (typeof TIMEFOLD_STATUSES)[number];

/**
 * Hardcoded phrase mapping (WO §4).
 * Phrase text must not be stored in the database or generated dynamically.
 * Any change to copy requires a versioned work order.
 */
const PHRASE_MAP: Record<TimeFOLDClass, string> = {
  STABILITY: 'Established local presence.',
  NEWNESS: 'Recently opened.',
};

// ---------------------------------------------------------------------------
// Render guard
// ---------------------------------------------------------------------------

export interface TimeFOLDEntity {
  timefoldClass: string | null;
  timefoldStatus: string | null;
}

/**
 * Return the rendered TimeFOLD phrase for a place, or null (silence).
 *
 * Returns null if:
 *   - timefold_status is not 'APPROVED'
 *   - timefold_class is null or not a recognized class
 *   - Any other state (PROPOSED, SUPPRESSED, null)
 *
 * Never throws. Safe to call on any entity object.
 */
export function getTimeFOLDPhrase(entity: TimeFOLDEntity): string | null {
  if (entity.timefoldStatus !== 'APPROVED') return null;
  if (!entity.timefoldClass) return null;

  const phrase = PHRASE_MAP[entity.timefoldClass as TimeFOLDClass];
  return phrase ?? null;
}

/**
 * Type guard: is the given string a valid TimeFOLD class?
 */
export function isValidTimeFOLDClass(value: unknown): value is TimeFOLDClass {
  return TIMEFOLD_CLASSES.includes(value as TimeFOLDClass);
}

/**
 * Type guard: is the given string a valid TimeFOLD status?
 */
export function isValidTimeFOLDStatus(value: unknown): value is TimeFOLDStatus {
  return TIMEFOLD_STATUSES.includes(value as TimeFOLDStatus);
}
