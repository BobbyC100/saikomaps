/**
 * Intent Profile System
 * 
 * Determines what actions and content are eligible for merchant pages
 * based on user intent patterns, not categorical taxonomy.
 * 
 * Three profiles:
 * - Transactional: "I need to complete something" (Reserve, Call before arrival)
 * - Visit-Now: "I'm deciding whether to go right now" (Just show up)
 * - Go-There: "This is a place, not a business" (Parks, beaches, spots)
 */

import type { PrimaryVertical } from './primaryVertical';

export type IntentProfile = 'transactional' | 'visit-now' | 'go-there';

export interface PlaceForIntent {
  primaryVertical?: PrimaryVertical | null;
  reservationUrl?: string | null;
  phone?: string | null;
  intentProfile?: string | null;
  intentProfileOverride?: boolean;
  /** @deprecated Use primaryVertical. Kept for legacy callers during migration. */
  category?: string | null;
}

const GO_THERE_VERTICALS: Set<PrimaryVertical> = new Set(['NATURE', 'ACTIVITY']);

/**
 * Assign default intent profile based on primary_vertical.
 * Auto-promotes to transactional if reservation URL exists.
 */
export function assignIntentProfile(place: PlaceForIntent): IntentProfile {
  if (place.reservationUrl) {
    return 'transactional';
  }

  if (place.primaryVertical && GO_THERE_VERTICALS.has(place.primaryVertical)) {
    return 'go-there';
  }

  return 'visit-now';
}

/**
 * Get the effective intent profile for a place
 * Respects curator override if present
 */
export function getIntentProfile(place: PlaceForIntent): IntentProfile {
  if (place.intentProfileOverride && place.intentProfile) {
    return place.intentProfile as IntentProfile;
  }
  return assignIntentProfile(place);
}

/**
 * Get human-readable label for intent profile
 */
export function getIntentProfileLabel(profile: IntentProfile): string {
  const labels: Record<IntentProfile, string> = {
    transactional: 'Transactional',
    'visit-now': 'Visit Now',
    'go-there': 'Go There',
  };
  return labels[profile];
}

/**
 * Get description of what the intent profile means
 */
export function getIntentProfileDescription(profile: IntentProfile): string {
  const descriptions: Record<IntentProfile, string> = {
    transactional: 'User needs to complete an action before arrival (reserve, call, book)',
    'visit-now': 'User is deciding whether to go right now (walk-in, spontaneous)',
    'go-there': 'This is a place/location, not a business with operations',
  };
  return descriptions[profile];
}
