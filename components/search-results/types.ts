// Shared types for bento grid cards

export type SignalType = 
  | 'eater38' 
  | 'latimes101' 
  | 'michelin' 
  | 'chefrec' 
  | 'infatuation'
  | 'menu_analyzed'      // Internal: menu signals extracted
  | 'wine_program';      // Internal: winelist signals extracted

export interface Signal {
  type: SignalType;
  label: string;
  isInternal?: boolean;  // Distinguishes internal vs external badges
}

export type SignalStatus = 'ok' | 'partial' | 'failed' | null;

export type PlacePersonality = 
  | 'institution' 
  | 'neighborhood_spot' 
  | 'chef_driven' 
  | 'destination' 
  | 'scene' 
  | 'hidden_gem';

export interface PlaceCardData {
  // Required
  slug: string;
  name: string;
  neighborhood: string;
  category: string;
  
  // Optional (graceful degradation)
  photoUrl?: string;
  price?: '$' | '$$' | '$$$';
  cuisine?: string;
  
  // Status
  isOpen?: boolean;
  closesAt?: string;
  opensAt?: string;
  
  // Editorial
  signals?: Signal[];
  coverageQuote?: string;
  coverageSource?: string;
  vibeTags?: string[];
  
  // Identity Signals
  placePersonality?: PlacePersonality;
  
  // Internal Signal Status (Badge Ship v1)
  menuSignalsStatus?: SignalStatus;
  winelistSignalsStatus?: SignalStatus;
  menuIdentityPresent?: boolean;     // Optional: only if available
  winelistIdentityPresent?: boolean; // Optional: only if available
  
  // Location
  distanceMiles?: number;
}

/**
 * Map place_personality enum to human-readable label
 */
export function getPersonalityLabel(personality?: PlacePersonality): string | null {
  if (!personality) return null;
  
  const labels: Record<PlacePersonality, string> = {
    institution: 'Institution',
    neighborhood_spot: 'Neighborhood Spot',
    chef_driven: 'Chef-Driven',
    destination: 'Destination',
    scene: 'Scene',
    hidden_gem: 'Hidden Gem',
  };
  
  return labels[personality] || null;
}

/**
 * Compute internal badges based on signal status
 * Badge Ship v1: Menu Analyzed + Wine Program
 * 
 * Display Rules:
 * - Show badge on "ok" status
 * - Optionally show on "partial" if identity is present
 * - Never show on "failed" or missing
 * - Max 2 internal badges
 * - Silence > weak signal
 */
export function computeInternalBadges(place: PlaceCardData): Signal[] {
  const badges: Signal[] = [];
  
  // Menu badge logic
  if (place.menuSignalsStatus === 'ok') {
    badges.push({
      type: 'menu_analyzed',
      label: 'Menu Analyzed',
      isInternal: true,
    });
  } else if (
    place.menuSignalsStatus === 'partial' && 
    place.menuIdentityPresent === true
  ) {
    // Conservative inclusion: only if identity output exists
    badges.push({
      type: 'menu_analyzed',
      label: 'Menu Analyzed',
      isInternal: true,
    });
  }
  
  // Wine badge logic
  if (place.winelistSignalsStatus === 'ok') {
    badges.push({
      type: 'wine_program',
      label: 'Wine Program',
      isInternal: true,
    });
  } else if (
    place.winelistSignalsStatus === 'partial' && 
    place.winelistIdentityPresent === true
  ) {
    // Conservative inclusion: only if identity output exists
    badges.push({
      type: 'wine_program',
      label: 'Wine Program',
      isInternal: true,
    });
  }
  
  // Cap at 2 total internal badges
  return badges.slice(0, 2);
}
