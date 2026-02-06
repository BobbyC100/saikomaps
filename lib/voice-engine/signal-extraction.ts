/**
 * Saiko Voice Engine v1.1 - Merchant Signal Extraction
 * Extract and derive attributes from Google Places data
 */

import {
  MerchantSignals,
  DerivedAttributes,
  PriceLevel,
  PopularityTier,
  Vibe,
  TimeOfDay,
} from './types';

// ============================================
// PRICE LEVEL MAPPING
// ============================================

export function mapGooglePriceLevel(priceLevel: number | null | undefined): PriceLevel {
  if (priceLevel === null || priceLevel === undefined) return 'UNKNOWN';
  
  switch (priceLevel) {
    case 0:
    case 1:
      return 'INEXPENSIVE';
    case 2:
      return 'MODERATE';
    case 3:
      return 'EXPENSIVE';
    case 4:
      return 'VERY_EXPENSIVE';
    default:
      return 'UNKNOWN';
  }
}

// ============================================
// STREET NAME EXTRACTION
// ============================================

export function extractStreetName(formattedAddress: string | null | undefined): string {
  if (!formattedAddress) return '';
  
  // Split by comma and take first part (usually street address)
  const parts = formattedAddress.split(',');
  if (parts.length === 0) return '';
  
  // Extract street name from "123 Main St" -> "Main"
  const streetPart = parts[0].trim();
  const words = streetPart.split(/\s+/);
  
  // Find the street name (skip number, take words before St/Ave/Blvd/etc)
  const streetTypeIndex = words.findIndex((w) =>
    /^(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|way|pl|place|ct|court)\.?$/i.test(
      w
    )
  );
  
  if (streetTypeIndex > 1) {
    // Return the word(s) before the street type
    return words.slice(1, streetTypeIndex).join(' ');
  }
  
  // Fallback: return second word if it exists
  return words.length > 1 ? words[1] : '';
}

// ============================================
// NEIGHBORHOOD EXTRACTION
// ============================================

export function extractNeighborhood(
  addressComponents: any[] | null | undefined
): string {
  if (!addressComponents) return '';
  
  // Look for neighborhood, locality, or sublocality
  const neighborhoodTypes = ['neighborhood', 'sublocality', 'locality'];
  
  for (const type of neighborhoodTypes) {
    const component = addressComponents.find((c) => c.types?.includes(type));
    if (component?.long_name) {
      return component.long_name;
    }
  }
  
  return '';
}

// ============================================
// EXTRACT MERCHANT SIGNALS
// ============================================

export interface GooglePlaceData {
  displayName?: string;
  name?: string;
  formattedAddress?: string;
  addressComponents?: any[];
  primaryType?: string;
  types?: string[];
  priceLevel?: number;
  userRatingCount?: number;
  
  // Boolean attributes
  outdoorSeating?: boolean;
  servesBeer?: boolean;
  servesWine?: boolean;
  servesCocktails?: boolean;
  servesBreakfast?: boolean;
  servesBrunch?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  liveMusic?: boolean;
  dineIn?: boolean;
  takeout?: boolean;
  delivery?: boolean;
}

export function extractMerchantSignals(data: GooglePlaceData): MerchantSignals {
  const name = data.displayName || data.name || 'Unknown';
  const category = data.primaryType || (data.types?.[0]) || 'restaurant';
  const neighborhood = extractNeighborhood(data.addressComponents);
  const street = extractStreetName(data.formattedAddress);
  const priceLevel = mapGooglePriceLevel(data.priceLevel);
  
  // Service style
  const serviceStyle: string[] = [];
  if (data.dineIn) serviceStyle.push('dine_in');
  if (data.takeout) serviceStyle.push('takeout');
  if (data.delivery) serviceStyle.push('delivery');
  
  return {
    name,
    category,
    neighborhood,
    street,
    priceLevel,
    outdoorSeating: data.outdoorSeating ?? false,
    servesBeer: data.servesBeer ?? false,
    servesWine: data.servesWine ?? false,
    servesCocktails: data.servesCocktails ?? false,
    servesBreakfast: data.servesBreakfast ?? false,
    servesBrunch: data.servesBrunch ?? false,
    liveMusic: data.liveMusic ?? false,
    serviceStyle,
    userRatingCount: data.userRatingCount ?? 0,
  };
}

// ============================================
// DERIVE ATTRIBUTES
// ============================================

export function deriveAttributes(signals: MerchantSignals): DerivedAttributes {
  // POPULARITY TIER
  let popularityTier: PopularityTier;
  if (signals.userRatingCount > 1000) {
    popularityTier = 'institution';
  } else if (signals.userRatingCount >= 200) {
    popularityTier = 'known';
  } else {
    popularityTier = 'discovery';
  }
  
  // VIBE
  let vibe: Vibe;
  const hasDrinks = signals.servesBeer || signals.servesCocktails;
  const isExpensive = signals.priceLevel === 'EXPENSIVE' || signals.priceLevel === 'VERY_EXPENSIVE';
  const isTakeoutOnly = signals.serviceStyle.includes('takeout') && !signals.serviceStyle.includes('dine_in');
  
  if (signals.outdoorSeating && hasDrinks) {
    vibe = 'hang';
  } else if (isExpensive) {
    vibe = 'occasion';
  } else if (isTakeoutOnly) {
    vibe = 'quick';
  } else {
    vibe = 'neighborhood';
  }
  
  // TIME OF DAY
  let timeOfDay: TimeOfDay;
  const breakfastOrBrunch = signals.servesBreakfast || signals.servesBrunch;
  
  if (breakfastOrBrunch && !signals.serviceStyle.includes('dine_in')) {
    timeOfDay = 'morning';
  } else {
    timeOfDay = 'anytime';
  }
  
  return {
    popularityTier,
    vibe,
    timeOfDay,
  };
}

// ============================================
// COMBINED EXTRACTION
// ============================================

export function extractSignalsAndAttributes(data: GooglePlaceData): {
  signals: MerchantSignals;
  derived: DerivedAttributes;
} {
  const signals = extractMerchantSignals(data);
  const derived = deriveAttributes(signals);
  return { signals, derived };
}
