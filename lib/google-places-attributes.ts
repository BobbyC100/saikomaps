/**
 * Google Places "About" Attributes
 *
 * Types, text parser, and API fetcher for structured place attribute data
 * from Google Maps (Accessibility, Service Options, Atmosphere, etc.).
 *
 * Stored as JSONB in golden_records.google_places_attributes.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GooglePlacesAttributes {
  accessibility?: string[];
  service_options?: string[];
  highlights?: string[];
  popular_for?: string[];
  offerings?: string[];
  dining_options?: string[];
  amenities?: string[];
  atmosphere?: string[];
  crowd?: string[];
  planning?: string[];
  payments?: string[];
  children?: string[];
  parking?: string[];
  pets?: string[];
  [key: string]: string[] | undefined;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maps display-name category headings → JSON keys */
export const CATEGORY_KEY_MAP: Record<string, keyof GooglePlacesAttributes> = {
  'accessibility': 'accessibility',
  'service options': 'service_options',
  'highlights': 'highlights',
  'popular for': 'popular_for',
  'offerings': 'offerings',
  'dining options': 'dining_options',
  'amenities': 'amenities',
  'atmosphere': 'atmosphere',
  'crowd': 'crowd',
  'planning': 'planning',
  'payments': 'payments',
  'children': 'children',
  'parking': 'parking',
  'pets': 'pets',
};

/** Maps Google Places API (New) v1 boolean fields → category + label */
export const API_FIELD_TO_ATTRIBUTE: Record<string, { category: keyof GooglePlacesAttributes; label: string }> = {
  // Service options
  dineIn:                        { category: 'service_options', label: 'Dine-in' },
  delivery:                      { category: 'service_options', label: 'Delivery' },
  takeout:                       { category: 'service_options', label: 'Takeout' },
  curbsidePickup:                { category: 'service_options', label: 'Curbside pickup' },
  outdoorSeating:                { category: 'service_options', label: 'Outdoor seating' },
  // Dining options
  servesBreakfast:               { category: 'dining_options', label: 'Breakfast' },
  servesLunch:                   { category: 'dining_options', label: 'Lunch' },
  servesDinner:                  { category: 'dining_options', label: 'Dinner' },
  servesBrunch:                  { category: 'dining_options', label: 'Brunch' },
  servesDessert:                 { category: 'dining_options', label: 'Dessert' },
  // Offerings
  servesBeer:                    { category: 'offerings', label: 'Beer' },
  servesWine:                    { category: 'offerings', label: 'Wine' },
  servesCocktails:               { category: 'offerings', label: 'Cocktails' },
  servesCoffee:                  { category: 'offerings', label: 'Coffee' },
  servesVegetarianFood:          { category: 'offerings', label: 'Vegetarian options' },
  // Planning
  reservable:                    { category: 'planning', label: 'Accepts reservations' },
  goodForGroups:                 { category: 'planning', label: 'Good for groups' },
  // Children
  goodForChildren:               { category: 'children', label: 'Good for kids' },
  menuForChildren:               { category: 'children', label: "Kids' menu" },
  // Pets
  allowsDogs:                    { category: 'pets', label: 'Dogs allowed' },
  // Amenities
  restroom:                      { category: 'amenities', label: 'Restroom' },
  liveMusic:                     { category: 'amenities', label: 'Live music' },
  // Accessibility
  'accessibilityOptions.wheelchairAccessibleEntrance':  { category: 'accessibility', label: 'Wheelchair accessible entrance' },
  'accessibilityOptions.wheelchairAccessibleParking':   { category: 'accessibility', label: 'Wheelchair accessible parking lot' },
  'accessibilityOptions.wheelchairAccessibleRestroom':  { category: 'accessibility', label: 'Wheelchair accessible restroom' },
  'accessibilityOptions.wheelchairAccessibleSeating':   { category: 'accessibility', label: 'Wheelchair accessible seating' },
  // Parking
  'parkingOptions.freeParkingLot':    { category: 'parking', label: 'Free parking lot' },
  'parkingOptions.paidParkingLot':    { category: 'parking', label: 'Paid parking lot' },
  'parkingOptions.freeStreetParking': { category: 'parking', label: 'Free street parking' },
  'parkingOptions.paidStreetParking': { category: 'parking', label: 'Paid street parking' },
  'parkingOptions.valetParking':      { category: 'parking', label: 'Valet parking' },
  'parkingOptions.freeGarageParking': { category: 'parking', label: 'Free parking garage' },
  'parkingOptions.paidGarageParking': { category: 'parking', label: 'Paid parking garage' },
  // Payments
  'paymentOptions.acceptsCreditCards': { category: 'payments', label: 'Credit cards' },
  'paymentOptions.acceptsDebitCards':  { category: 'payments', label: 'Debit cards' },
  'paymentOptions.acceptsNfc':         { category: 'payments', label: 'NFC mobile payments' },
  'paymentOptions.acceptsCashOnly':    { category: 'payments', label: 'Cash only' },
};

/** Field mask for the Google Places API (New) v1 request */
export const API_FIELD_MASK = [
  'dineIn', 'delivery', 'takeout', 'curbsidePickup', 'outdoorSeating',
  'servesBreakfast', 'servesLunch', 'servesDinner', 'servesBrunch', 'servesDessert',
  'servesBeer', 'servesWine', 'servesCocktails', 'servesCoffee', 'servesVegetarianFood',
  'reservable', 'goodForGroups', 'goodForChildren', 'menuForChildren',
  'allowsDogs', 'restroom', 'liveMusic',
  'accessibilityOptions', 'parkingOptions', 'paymentOptions',
].join(',');

// ---------------------------------------------------------------------------
// Text Parser
// ---------------------------------------------------------------------------

/**
 * Parse Google Places "About" text (copy-pasted from Google Maps UI)
 * into structured GooglePlacesAttributes JSON.
 *
 * Handles input like:
 *   Service options
 *   * Outdoor seating
 *   * Delivery
 *
 *   Atmosphere
 *   * Casual
 *   * Cozy
 */
export function parseGooglePlacesAttributesText(text: string): GooglePlacesAttributes {
  const result: GooglePlacesAttributes = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let currentCategory: keyof GooglePlacesAttributes | null = null;

  for (const line of lines) {
    // Check if this is a category heading
    const normalized = line.toLowerCase().replace(/[:\s]+$/, '');
    if (CATEGORY_KEY_MAP[normalized]) {
      currentCategory = CATEGORY_KEY_MAP[normalized];
      if (!result[currentCategory]) {
        result[currentCategory] = [];
      }
      continue;
    }

    // Check for bullet item
    const bulletMatch = line.match(/^[*•\-]\s+(.+)$/);
    if (bulletMatch && currentCategory) {
      result[currentCategory]!.push(bulletMatch[1].trim());
      continue;
    }

    // Plain text line under a category (no bullet)
    if (currentCategory && line.length > 0) {
      result[currentCategory]!.push(line);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// API Fetcher (Google Places API New v1)
// ---------------------------------------------------------------------------

/**
 * Fetch place attributes from the Google Places API (New) v1.
 *
 * Uses: GET https://places.googleapis.com/v1/places/{placeId}
 * Auth: X-Goog-Api-Key header
 * Fields: X-Goog-FieldMask header
 */
export async function fetchGooglePlacesAttributes(
  placeId: string,
  apiKey: string,
): Promise<GooglePlacesAttributes | null> {
  const url = `https://places.googleapis.com/v1/places/${placeId}`;

  const response = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': API_FIELD_MASK,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`  Google Places API error for ${placeId}: ${response.status} ${errorText}`);
    return null;
  }

  const data = await response.json();
  return convertApiResponseToAttributes(data);
}

/**
 * Convert the API response (flat booleans + nested objects) into
 * the categorized GooglePlacesAttributes shape.
 */
function convertApiResponseToAttributes(apiResponse: Record<string, any>): GooglePlacesAttributes {
  const result: GooglePlacesAttributes = {};

  for (const [fieldPath, mapping] of Object.entries(API_FIELD_TO_ATTRIBUTE)) {
    // Resolve dotted paths (e.g. "accessibilityOptions.wheelchairAccessibleEntrance")
    const value = getNestedValue(apiResponse, fieldPath);

    if (value === true) {
      if (!result[mapping.category]) {
        result[mapping.category] = [];
      }
      result[mapping.category]!.push(mapping.label);
    }
  }

  return result;
}

/** Resolve a dotted path like "a.b.c" on an object */
function getNestedValue(obj: Record<string, any>, path: string): any {
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}
