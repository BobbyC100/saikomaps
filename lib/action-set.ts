/**
 * Primary Action Set Composition
 * 
 * Composes 2-3 actions dynamically based on intent profile and available data.
 * 
 * Slot Structure:
 * - Slot 1: Completion action (Reserve, Call, Website, or Directions)
 * - Slot 2: Navigation or secondary action (Directions, Call, Website, or Save)
 * - Slot 3: Personal actions (Save, Share)
 * 
 * Rules:
 * - Directions always present (address is required)
 * - Actions fall back gracefully when data is missing
 * - Minimum 2 actions always rendered
 */

import { getIntentProfile, type IntentProfile, type PlaceForIntent } from './intent-profile';

export type ActionType = 'reserve' | 'call' | 'website' | 'directions' | 'save' | 'share';

export interface Action {
  type: ActionType;
  value?: string; // URL, phone number, address, etc.
  label: string;
  icon: string;
}

export interface ActionSet {
  slot1: Action | null;
  slot2: Action | null;
  slot3: Action[];
}

export interface PlaceForActions extends PlaceForIntent {
  reservationUrl?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  instagram?: string | null;
}

/**
 * Get completion action for Transactional profile
 * Fallback order: Reserve > Call > Website
 */
function getCompletionAction(place: PlaceForActions): Action | null {
  if (place.reservationUrl) {
    return {
      type: 'reserve',
      value: place.reservationUrl,
      label: 'Reserve',
      icon: 'calendar',
    };
  }
  if (place.phone) {
    return {
      type: 'call',
      value: place.phone,
      label: 'Call',
      icon: 'phone',
    };
  }
  if (place.website) {
    return {
      type: 'website',
      value: place.website,
      label: 'Website',
      icon: 'globe',
    };
  }
  return null;
}

/**
 * Get secondary action for Visit-Now profile
 * Fallback order: Call > Website
 */
function getSecondaryAction(place: PlaceForActions): Action | null {
  if (place.phone) {
    return {
      type: 'call',
      value: place.phone,
      label: 'Call',
      icon: 'phone',
    };
  }
  if (place.website) {
    return {
      type: 'website',
      value: place.website,
      label: 'Website',
      icon: 'globe',
    };
  }
  return null;
}

/**
 * Get directions action
 * Always present - address is required
 */
function getDirectionsAction(place: PlaceForActions): Action | null {
  if (!place.address && !place.latitude) {
    return null; // Should never happen - address is required
  }

  const value =
    place.latitude && place.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`
      : place.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`
        : null;

  if (!value) return null;

  return {
    type: 'directions',
    value,
    label: 'Directions',
    icon: 'map-pin',
  };
}

/**
 * Get personal actions (Save, Share)
 * Currently disabled - will return in Phase 4
 */
function getPersonalActions(): Action[] {
  return [];
}

/**
 * Compose Primary Action Set based on intent profile
 * Phase 2: Save/Share removed - shipping with Completion + Directions only
 */
export function getPrimaryActionSet(place: PlaceForActions): ActionSet {
  const profile = getIntentProfile(place);
  const directions = getDirectionsAction(place);

  switch (profile) {
    case 'transactional': {
      // Transactional: Reserve/Call/Website | Directions
      const completion = getCompletionAction(place);
      return {
        slot1: completion,
        slot2: directions,
        slot3: [],
      };
    }

    case 'visit-now': {
      // Visit-Now: Directions | Call/Website
      const secondary = getSecondaryAction(place);
      return {
        slot1: directions,
        slot2: secondary,
        slot3: [],
      };
    }

    case 'go-there': {
      // Go-There: Directions only
      return {
        slot1: directions,
        slot2: null,
        slot3: [],
      };
    }

    default:
      // Fallback to Visit-Now behavior
      return {
        slot1: directions,
        slot2: getSecondaryAction(place),
        slot3: [],
      };
  }
}

/**
 * Get all actions as a flat array (for rendering)
 * Filters out null values
 */
export function getFlatActions(actionSet: ActionSet): Action[] {
  return [actionSet.slot1, actionSet.slot2, ...actionSet.slot3].filter(
    (action): action is Action => action !== null
  );
}

/**
 * Check if website is being used in primary action set
 * Used to determine if we should show website card in Reference section
 */
export function isWebsiteInActionSet(actionSet: ActionSet): boolean {
  const allActions = getFlatActions(actionSet);
  return allActions.some((action) => action.type === 'website');
}

/**
 * Check if call is being used in primary action set
 * Used to determine if we should show call card in Tier 3
 */
export function isCallInActionSet(actionSet: ActionSet): boolean {
  const allActions = getFlatActions(actionSet);
  return allActions.some((action) => action.type === 'call');
}
