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

export type IntentProfile = 'transactional' | 'visit-now' | 'go-there';

export interface PlaceForIntent {
  category?: string | null;
  reservationUrl?: string | null;
  phone?: string | null;
  intentProfile?: string | null;
  intentProfileOverride?: boolean;
}

/**
 * Assign default intent profile based on place category
 * Auto-promotes to transactional if reservation URL exists
 */
export function assignIntentProfile(place: PlaceForIntent): IntentProfile {
  // Auto-promotion: reservation URL = transactional
  if (place.reservationUrl) {
    return 'transactional';
  }

  // Default mapping from category
  const category = place.category?.toLowerCase() || '';
  
  // Go-There: Natural places without business operations
  if (
    category.includes('park') ||
    category.includes('beach') ||
    category.includes('trail') ||
    category.includes('nature') ||
    category.includes('skate') ||
    category.includes('surf')
  ) {
    return 'go-there';
  }

  // Transactional: Places that typically require booking/coordination
  // (Only if they DON'T have reservation URL - that's handled above)
  // Most restaurants default to visit-now unless they explicitly add reservation URL
  
  // Visit-Now: Default for most businesses
  // Restaurants, bars, cafes, retail, galleries, etc.
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
