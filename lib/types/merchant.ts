/**
 * Merchant data types following the locked tier hierarchy
 * See: merchant-page-implementation-checklist.md
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Photo {
  id: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface Hours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

export interface OpenStatus {
  isOpen: boolean;
  todayWindow?: string; // e.g., "11:00 AM - 10:00 PM"
  nextChange?: string; // e.g., "Closes at 10:00 PM"
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export interface CuratorNote {
  text: string;
  author?: string;
  date?: string;
}

export interface CoverageSource {
  publication: string;
  quote?: string;
  url?: string;
  date?: string;
}

export interface Attribute {
  id: string;
  category: string;
  name: string;
}

export interface ListReference {
  id: string;
  title: string;
  slug: string;
  coverImage?: string;
}

export interface House {
  text: string;
  tagline?: string;
}

/**
 * Complete merchant data structure
 * Tier hierarchy is enforced at render time, not data structure
 */
export interface MerchantData {
  // Identity
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  heroPhoto: Photo;
  
  // Tier 0: Actions
  phone?: string;
  instagramHandle?: string;
  reservationUrl?: string;
  websiteUrl?: string;
  
  // Tier 1: Visual Identity
  photos?: Photo[]; // Excludes hero for collage
  vibeTags?: string[];
  
  // Tier 2: Editorial + Context
  curatorNote?: CuratorNote;
  coverageSources?: CoverageSource[];
  hours?: Hours;
  openStatus?: OpenStatus;
  
  // Tier 3: Reference
  address?: Address;
  coordinates?: Coordinates;
  
  // Tier 4: Attributes
  attributes?: Attribute[];
  
  // Tier 5: Discovery
  alsoOnLists?: ListReference[];
  house?: House;
}
