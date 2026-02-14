/**
 * Data Transformers
 * Transform Prisma Place model to MerchantData
 * Enforces Merchant Hierarchy v2.2 spec
 */

import { MerchantData } from '@/lib/types/merchant';

/**
 * Normalize text: trim, remove empty strings
 */
function normalizeText(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Normalize Instagram handle
 */
function normalizeInstagramHandle(handle: string | null | undefined): string | undefined {
  if (!handle) return undefined;
  
  let normalized = handle.trim();
  
  // Remove leading @
  if (normalized.startsWith('@')) {
    normalized = normalized.slice(1);
  }
  
  // If it's a URL, extract handle
  if (normalized.includes('instagram.com/')) {
    const match = normalized.match(/instagram\.com\/([^/?]+)/);
    if (match) normalized = match[1];
  }
  
  // Validate format
  if (!/^[a-zA-Z0-9_.]+$/.test(normalized)) {
    return undefined;
  }
  
  return normalized.length > 0 ? normalized : undefined;
}

/**
 * Extract hero and collage photos from googlePhotos JSON
 */
function extractPhotos(googlePhotos: any) {
  if (!googlePhotos || !googlePhotos.photos || !Array.isArray(googlePhotos.photos)) {
    return { hero: null, collage: undefined };
  }
  
  const photos = googlePhotos.photos;
  
  // Find hero (marked with isHero:true) or use first photo
  const heroPhoto = photos.find((p: any) => p.isHero === true) || photos[0];
  
  if (!heroPhoto) {
    return { hero: null, collage: undefined };
  }
  
  // Collage = all photos except hero (filter by URL to handle any duplicates)
  const collagePhotos = photos
    .filter((p: any) => p.url !== heroPhoto.url)
    .map((p: any) => ({
      id: p.id || p.url,
      url: p.url,
      alt: p.alt,
    }));
  
  return {
    hero: {
      id: heroPhoto.id || heroPhoto.url,
      url: heroPhoto.url,
      alt: heroPhoto.alt,
    },
    collage: collagePhotos.length > 0 ? collagePhotos : undefined,
  };
}

/**
 * Build hours state from JSON hours
 */
function buildHoursState(hoursJson: any) {
  if (!hoursJson) {
    return { hours: undefined };
  }
  
  // Check if any day has actual hours
  const hasAnyHours = Object.values(hoursJson).some((h: any) => 
    typeof h === 'string' && h.trim().length > 0
  );
  
  if (!hasAnyHours) {
    return { hours: undefined };
  }
  
  return {
    hours: {
      monday: hoursJson.monday,
      tuesday: hoursJson.tuesday,
      wednesday: hoursJson.wednesday,
      thursday: hoursJson.thursday,
      friday: hoursJson.friday,
      saturday: hoursJson.saturday,
      sunday: hoursJson.sunday,
    }
  };
}

/**
 * Calculate open status from hours
 */
function buildOpenStatus(hours: any) {
  if (!hours) return undefined;
  
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todayHours = hours[dayName];
  
  if (!todayHours || todayHours.toLowerCase() === 'closed') {
    return {
      isOpen: false,
      todayWindow: 'Closed',
    };
  }
  
  // Return optimistic status with hours window
  return {
    isOpen: true,
    todayWindow: todayHours,
  };
}

/**
 * Parse address string to address object
 */
function parseAddress(addressString: string | null | undefined) {
  if (!addressString) return undefined;
  
  // Basic parse: "123 Main St, San Francisco, CA 94110"
  const parts = addressString.split(',').map(s => s.trim());
  
  if (parts.length < 3) {
    // Return as formatted string if can't parse
    return {
      street: addressString,
      city: '',
      state: '',
      zip: '',
    };
  }
  
  const stateZip = parts[2]?.split(' ') || [];
  
  return {
    street: parts[0],
    city: parts[1],
    state: stateZip[0] || '',
    zip: stateZip[1] || '',
  };
}

/**
 * Transform Prisma Place to MerchantData
 * Maps from existing schema: googlePhotos JSON, hours JSON, address string, etc.
 */
export function transformDatabaseToMerchant(place: any): MerchantData {
  // Extract hero and collage from googlePhotos JSON
  const { hero, collage } = extractPhotos(place.googlePhotos);
  
  if (!hero) {
    throw new Error(`No hero photo found for place: ${place.id}`);
  }
  
  // Hours from JSON
  const { hours } = buildHoursState(place.hours);
  const openStatus = buildOpenStatus(hours);
  
  // Coverage sources from relation
  const coverageSources = place.sources?.length > 0
    ? place.sources.map((source: any) => ({
        publication: source.publication,
        quote: normalizeText(source.quote),
        url: source.url,
        date: source.date,
      }))
    : undefined;
  
  return {
    id: place.id,
    slug: place.slug,
    name: place.name,
    tagline: undefined, // Not in Place model
    
    // Hero + collage (hero excluded from collage)
    heroPhoto: hero,
    photos: collage,
    
    // Contact
    phone: normalizeText(place.phone),
    instagramHandle: normalizeInstagramHandle(place.instagram),
    reservationUrl: undefined, // Not in Place model
    websiteUrl: place.website,
    
    // Vibe tags
    vibeTags: place.neighborhood ? [place.neighborhood] : undefined,
    
    // Editorial
    curatorNote: undefined, // Not in Place model
    coverageSources,
    
    // Hours
    hours,
    openStatus,
    
    // Location
    address: parseAddress(place.address),
    coordinates: (place.latitude && place.longitude) ? {
      lat: place.latitude,
      lng: place.longitude,
    } : undefined,
    
    // Attributes (not in Place model)
    attributes: undefined,
    
    // Discovery (not in Place model)
    alsoOnLists: undefined,
    house: undefined,
  };
}
