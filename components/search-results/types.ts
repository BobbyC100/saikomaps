// Shared types for bento grid cards

export type SignalType = 'eater38' | 'latimes101' | 'michelin' | 'chefrec' | 'infatuation';

export interface Signal {
  type: SignalType;
  label: string;
}

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
  
  // Optional (graceful degradation)
  category?: string;
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
