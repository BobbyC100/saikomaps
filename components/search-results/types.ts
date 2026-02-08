// Shared types for bento grid cards

export type SignalType = 'eater38' | 'latimes101' | 'michelin' | 'chefrec' | 'infatuation';

export interface Signal {
  type: SignalType;
  label: string;
}

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
  
  // Location
  distanceMiles?: number;
}
