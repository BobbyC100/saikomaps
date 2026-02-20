/**
 * Data transformation utilities for HorizontalBentoCard
 * 
 * Transforms Prisma Place model data into PlaceCardData format
 * for use with the HorizontalBentoCard component.
 */

import { PlaceCardData, Signal, SignalType, SignalStatus } from '@/components/search-results/types';
import {
  sortVibeTagsByPriority,
  CARD_TAG_LIMIT,
} from '@/lib/config/vibe-tags';

// Prisma Place type (partial - only fields we need for cards)
interface PrismaPlace {
  id: string;
  slug: string;
  name: string;
  neighborhood: string | null;
  category: string | null;
  cuisineType: string | null;
  priceLevel: number | null;
  googlePhotos: any; // JSON field
  hours: any; // JSON field
  sources: any; // JSON field (editorial sources)
  vibeTags: string[];
  latitude: any;
  longitude: any;
  placePersonality?: string | null;
  
  // Badge Ship v1: Menu/Winelist signal status
  menu_signals?: {
    status: string;
    payload: any;
  } | null;
  winelist_signals?: {
    status: string;
    payload: any;
  } | null;
}

/**
 * Extract the first photo URL from Google Photos JSON
 */
function getPhotoUrl(googlePhotos: any): string | undefined {
  if (!googlePhotos) return undefined;
  
  // Handle array format
  if (Array.isArray(googlePhotos) && googlePhotos.length > 0) {
    const firstPhoto = googlePhotos[0];
    if (typeof firstPhoto === 'string') return firstPhoto;
    if (firstPhoto.url) return firstPhoto.url;
    if (firstPhoto.photoReference) {
      // Construct Google Photos API URL if we have a reference
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${firstPhoto.photoReference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
    }
  }
  
  return undefined;
}

/**
 * Convert price level (1-4) to $ symbols
 */
function formatPrice(priceLevel: number | null): '$' | '$$' | '$$$' | undefined {
  if (priceLevel === null || priceLevel < 1) return undefined;
  if (priceLevel === 1) return '$';
  if (priceLevel === 2) return '$$';
  if (priceLevel >= 3) return '$$$';
  return undefined;
}

/**
 * Parse hours JSON to determine if place is currently open
 */
function parseOpenStatus(hours: any): {
  isOpen?: boolean;
  closesAt?: string;
  opensAt?: string;
} {
  if (!hours) return {};
  
  const obj = typeof hours === 'string' ? JSON.parse(hours) : hours;
  
  // Check for openNow field
  const isOpen = obj.openNow ?? obj.open_now ?? undefined;
  
  // Extract today's hours for close/open times
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const weekdayText = obj.weekday_text ?? obj.weekdayText;
  
  if (!weekdayText?.[todayIndex]) {
    return { isOpen };
  }
  
  const todayHours = weekdayText[todayIndex];
  
  // Extract close time (e.g., "9:00 AM – 10:00 PM" → "10:00 PM")
  const closeMatch = todayHours.match(/[–-]\s*(\d{1,2}:?\d{0,2}\s*(?:AM|PM))/i);
  const closesAt = closeMatch ? closeMatch[1].replace(/(\d+):00/, '$1').trim() : undefined;
  
  // Extract open time for when closed
  const openMatch = todayHours.match(/(\d{1,2}:?\d{0,2}\s*(?:AM|PM))\s*[–-]/i);
  const opensAt = openMatch ? openMatch[1].replace(/(\d+):00/, '$1').trim() : undefined;
  
  return { isOpen, closesAt, opensAt };
}

/**
 * Extract signals from editorial sources JSON
 * Maps publication names to signal types
 */
function extractSignals(sources: any): Signal[] {
  if (!sources || !Array.isArray(sources)) return [];
  
  const signalMap: Record<string, SignalType> = {
    'eater': 'eater38',
    'eater la': 'eater38',
    'la times': 'latimes101',
    'michelin': 'michelin',
    'michelin guide': 'michelin',
    'infatuation': 'infatuation',
    'the infatuation': 'infatuation',
  };
  
  const signals: Signal[] = [];
  const seen = new Set<SignalType>();
  
  for (const source of sources) {
    const pub = (source.publication || source.name || '').toLowerCase();
    
    for (const [key, signalType] of Object.entries(signalMap)) {
      if (pub.includes(key) && !seen.has(signalType)) {
        signals.push({
          type: signalType,
          label: getLabelForSignal(signalType),
        });
        seen.add(signalType);
      }
    }
  }
  
  return signals;
}

/**
 * Get display label for signal type
 */
function getLabelForSignal(type: SignalType): string {
  const labels: Record<SignalType, string> = {
    eater38: 'Eater 38',
    latimes101: 'LA Times 101',
    michelin: 'Michelin',
    chefrec: 'Chef Rec',
    infatuation: 'Infatuation',
    menu_analyzed: 'Menu Analyzed',
    wine_program: 'Wine Program',
  };
  return labels[type];
}

/**
 * Extract coverage quote from first editorial source
 */
function extractCoverageQuote(sources: any): {
  coverageQuote?: string;
  coverageSource?: string;
} {
  if (!sources || !Array.isArray(sources) || sources.length === 0) {
    return {};
  }
  
  const firstSource = sources[0];
  const content = firstSource.content || firstSource.excerpt;
  const publication = firstSource.publication || firstSource.name;
  
  if (!content) return {};
  
  // Truncate to ~120 chars for card display
  const quote = content.length > 120 
    ? content.slice(0, 120).replace(/\s+\S*$/, '') + '…'
    : content;
  
  return {
    coverageQuote: quote,
    coverageSource: publication,
  };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in miles
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Transform Prisma Place to PlaceCardData
 * 
 * @param place - Place from Prisma query
 * @param userLocation - Optional user coordinates for distance calculation
 */
export function transformPlaceToCardData(
  place: PrismaPlace,
  userLocation?: { lat: number; lon: number }
): PlaceCardData {
  const { isOpen, closesAt, opensAt } = parseOpenStatus(place.hours);
  const { coverageQuote, coverageSource } = extractCoverageQuote(place.sources);
  
  // Calculate distance if user location provided
  let distanceMiles: number | undefined;
  if (userLocation && place.latitude && place.longitude) {
    const lat = typeof place.latitude === 'object' ? parseFloat(place.latitude.toString()) : place.latitude;
    const lon = typeof place.longitude === 'object' ? parseFloat(place.longitude.toString()) : place.longitude;
    distanceMiles = calculateDistance(userLocation.lat, userLocation.lon, lat, lon);
  }
  
  // Map signal status from database
  const menuSignalsStatus = place.menu_signals?.status as SignalStatus;
  const winelistSignalsStatus = place.winelist_signals?.status as SignalStatus;
  
  // Check if identity data is present in payload (for conservative partial inclusion)
  const menuIdentityPresent = !!(place.menu_signals?.payload && 
    (place.menu_signals.payload.signature_items?.length > 0 || 
     place.menu_signals.payload.cuisine_indicators?.length > 0));
  const winelistIdentityPresent = !!(place.winelist_signals?.payload && 
    (place.winelist_signals.payload.key_producers?.length > 0 || 
     place.winelist_signals.payload.style_indicators?.length > 0));
  
  return {
    slug: place.slug,
    name: place.name,
    category: place.category || 'Place',
    neighborhood: place.neighborhood || '',
    photoUrl: getPhotoUrl(place.googlePhotos),
    price: formatPrice(place.priceLevel),
    cuisine: place.cuisineType || undefined,
    isOpen,
    closesAt,
    opensAt,
    signals: extractSignals(place.sources),
    coverageQuote,
    coverageSource,
    vibeTags:
      place.vibeTags && place.vibeTags.length > 0
        ? sortVibeTagsByPriority(place.vibeTags).slice(0, CARD_TAG_LIMIT)
        : undefined,
    distanceMiles,
    placePersonality: place.placePersonality as any,
    
    // Badge Ship v1: Signal status
    menuSignalsStatus,
    winelistSignalsStatus,
    menuIdentityPresent,
    winelistIdentityPresent,
  };
}

/**
 * Batch transform multiple places
 */
export function transformPlacesToCardData(
  places: PrismaPlace[],
  userLocation?: { lat: number; lon: number }
): PlaceCardData[] {
  return places.map(place => transformPlaceToCardData(place, userLocation));
}
