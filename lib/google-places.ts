/**
 * Google Places API Integration
 * Handles search and place details fetching
 * 
 * ARCHITECTURE NOTE: This should ONLY be called from:
 * - Import pipelines
 * - Background jobs
 * - Explicit admin actions
 * 
 * NEVER call from:
 * - Page loads
 * - User interactions
 * - UI components
 */

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_PLACES_ENABLED = process.env.GOOGLE_PLACES_ENABLED === 'true';
const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

function checkEnabled() {
  if (!GOOGLE_PLACES_ENABLED) {
    throw new Error('Google Places API is disabled. Enable via GOOGLE_PLACES_ENABLED=true');
  }
}

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  types?: string[];
  rating?: number;
  userRatingsTotal?: number;
}

export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  formattedPhoneNumber?: string;
  website?: string;
  location: {
    lat: number;
    lng: number;
  };
  rating?: number;
  userRatingsTotal?: number;
  types: string[];
  photos?: Array<{
    photoReference: string;
    width: number;
    height: number;
  }>;
  openingHours?: {
    openNow?: boolean;
    weekdayText?: string[];
  };
  priceLevel?: number;
  businessStatus?: string;
  addressComponents?: AddressComponent[];
  vicinity?: string;
}

/**
 * Parse neighborhood from Google Places address_components.
 * Priority: neighborhood → sublocality_level_1 → sublocality → locality
 */
export function parseNeighborhood(addressComponents: AddressComponent[] | null | undefined): string | null {
  if (!addressComponents?.length) return null;
  const priorityTypes = ['neighborhood', 'sublocality_level_1', 'sublocality', 'locality'];
  for (const type of priorityTypes) {
    const component = addressComponents.find((c) => c.types.includes(type));
    if (component?.long_name) return component.long_name;
  }
  return null;
}

/**
 * Get neighborhood from PlaceDetails: prefer address_components, fallback to vicinity first segment
 */
export function getNeighborhoodFromPlaceDetails(details: PlaceDetails | null | undefined): string | null {
  if (!details) return null;
  const fromComponents = parseNeighborhood(details.addressComponents);
  if (fromComponents) return fromComponents;
  if (details.vicinity) {
    const first = details.vicinity.split(',')[0]?.trim();
    if (first) return first;
  }
  return null;
}

export interface SearchOptions {
  locationBias?: {
    latitude: number;
    longitude: number;
  };
  maxResults?: number;
}

/**
 * Search for places using Google Places Text Search API
 */
export async function searchPlace(
  query: string,
  options: SearchOptions = {}
): Promise<PlaceSearchResult[]> {
  checkEnabled();
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key is not configured');
  }

  const params = new URLSearchParams({
    query,
    key: GOOGLE_PLACES_API_KEY,
  });

  // Add location bias if provided
  if (options.locationBias) {
    params.append(
      'location',
      `${options.locationBias.latitude},${options.locationBias.longitude}`
    );
    params.append('radius', '50000'); // 50km radius
  }

  const response = await fetch(
    `${PLACES_API_BASE}/textsearch/json?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API error: ${data.status}`);
  }

  const results: PlaceSearchResult[] = (data.results || [])
    .slice(0, options.maxResults || 10)
    .map((place: any) => ({
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
      types: place.types,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
    }));

  return results;
}

/**
 * Get detailed information about a specific place
 */
export async function getPlaceDetails(
  placeId: string
): Promise<PlaceDetails | null> {
  checkEnabled();
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key is not configured');
  }

  const params = new URLSearchParams({
    place_id: placeId,
    key: GOOGLE_PLACES_API_KEY,
    fields: [
      'place_id',
      'name',
      'formatted_address',
      'formatted_phone_number',
      'website',
      'geometry',
      'rating',
      'user_ratings_total',
      'types',
      'photos',
      'opening_hours',
      'price_level',
      'business_status',
      'address_components',
      'vicinity',
    ].join(','),
  });

  const response = await fetch(
    `${PLACES_API_BASE}/details/json?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status === 'NOT_FOUND') {
    return null;
  }

  if (data.status !== 'OK') {
    throw new Error(`Google Places API error: ${data.status}`);
  }

  const place = data.result;

  const addressComponents = place.address_components?.map((c: any) => ({
    long_name: c.long_name,
    short_name: c.short_name,
    types: c.types || [],
  }));

  return {
    placeId: place.place_id,
    name: place.name,
    formattedAddress: place.formatted_address,
    formattedPhoneNumber: place.formatted_phone_number,
    website: place.website,
    location: {
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
    },
    rating: place.rating,
    userRatingsTotal: place.user_ratings_total,
    types: place.types || [],
    photos: place.photos?.map((photo: any) => ({
      photoReference: photo.photo_reference,
      width: photo.width,
      height: photo.height,
    })),
    openingHours: place.opening_hours
      ? {
          openNow: place.opening_hours.open_now,
          weekdayText: place.opening_hours.weekday_text,
        }
      : undefined,
    priceLevel: place.price_level,
    businessStatus: place.business_status,
    addressComponents: addressComponents || undefined,
    vicinity: place.vicinity || undefined,
  };
}

/**
 * Reverse geocode lat/lng to get neighborhood (sublocality or neighborhood component)
 */
export async function getNeighborhoodFromCoords(
  lat: number,
  lng: number
): Promise<string | null> {
  if (!GOOGLE_PLACES_API_KEY) return null;

  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key: GOOGLE_PLACES_API_KEY,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
  );

  if (!response.ok) return null;

  const data = await response.json();
  if (data.status !== 'OK' || !data.results?.[0]?.address_components) return null;

  const components = data.results[0].address_components;
  // Prefer neighborhood, then sublocality_level_1, then sublocality
  const types = ['neighborhood', 'sublocality_level_1', 'sublocality'];
  for (const type of types) {
    const comp = components.find((c: { types: string[] }) => c.types.includes(type));
    if (comp?.long_name) return comp.long_name;
  }
  return null;
}

/**
 * Get photo URL from photo reference (server-side, uses GOOGLE_PLACES_API_KEY)
 */
export function getPhotoUrl(
  photoReference: string,
  maxWidth: number = 400
): string {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key is not configured');
  }

  return `${PLACES_API_BASE}/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
}

/**
 * Convert a Google Places photo reference or name to a displayable URL.
 * Supports both legacy format (photo_reference) and new Places API v1 format (name like places/{id}/photos/{ref}).
 * Use NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for client-side img src.
 */
export function getGooglePhotoUrl(
  photoRefOrName: string,
  maxWidth: number = 800
): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    throw new Error('Google Maps API key is not configured');
  }

  // New Places API v1 format: name like "places/ChIJ.../photos/..."
  if (photoRefOrName.startsWith('places/')) {
    return `https://places.googleapis.com/v1/${photoRefOrName}/media?maxWidthPx=${maxWidth}&key=${key}`;
  }

  // Legacy format: photo_reference
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoRefOrName}&key=${key}`;
}

/**
 * Extract photo reference or name from a stored photo object (handles both formats).
 * Also accepts a raw string (photo reference or name).
 */
export function getPhotoRefFromStored(
  photo: { photo_reference?: string; photoReference?: string; name?: string } | string | null | undefined
): string | null {
  if (!photo) return null;
  if (typeof photo === 'string' && photo.trim()) return photo.trim();
  if (typeof photo === 'object' && photo !== null) {
    if ('name' in photo && typeof (photo as { name?: string }).name === 'string') return (photo as { name: string }).name;
    const ref = (photo as { photo_reference?: string; photoReference?: string }).photo_reference
      ?? (photo as { photoReference?: string }).photoReference;
    return ref || null;
  }
  return null;
}

/**
 * Build a Google Places photo URL for client-side use.
 * Returns null if API key is not configured.
 */
export function buildClientPhotoUrl(
  photoRefOrName: string,
  maxWidth: number = 200
): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (!key?.trim()) return null;

  if (photoRefOrName.startsWith('places/')) {
    return `https://places.googleapis.com/v1/${photoRefOrName}/media?maxWidthPx=${maxWidth}&key=${key}`;
  }
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoRefOrName}&key=${key}`;
}

/**
 * VALADATA: Google Places ingestion contract (v1).
 * Request allowlist — only these fields are requested from Place Details API.
 * Forbidden: photos, reviews, editorial summaries, rich media.
 */
export const VALADATA_GOOGLE_PLACES_FIELDS_V1 = [
  'place_id',
  'types',
  'price_level',
  'rating',
  'user_ratings_total',
  'serves_beer',
  'serves_wine',
  'serves_breakfast',
  'serves_brunch',
  'serves_lunch',
  'serves_dinner',
  'serves_vegetarian_food',
  'delivery',
  'dine_in',
  'takeout',
  'reservable',
  'curbside_pickup',
] as const;

export const VALADATA_GOOGLE_PLACES_FIELDS_V1_STRING =
  VALADATA_GOOGLE_PLACES_FIELDS_V1.join(',');

/**
 * Attributes JSON shape for golden_records.google_places_attributes.
 * Includes types + Atmosphere fields for energy/tag scoring.
 * popular_times: NOT available from Google Places API (removed years ago).
 */
export interface GooglePlacesAttributes {
  types?: string[];
  price_level?: number;
  rating?: number;
  user_ratings_total?: number;
  serves_beer?: boolean;
  serves_wine?: boolean;
  serves_breakfast?: boolean;
  serves_brunch?: boolean;
  serves_lunch?: boolean;
  serves_dinner?: boolean;
  serves_vegetarian_food?: boolean;
  delivery?: boolean;
  dine_in?: boolean;
  takeout?: boolean;
  reservable?: boolean;
  curbside_pickup?: boolean;
  /** Always null — popular_times is NOT available from the official Google Places API. */
  popular_times?: null;
  _meta?: {
    fetched_at: string;
    popular_times_available: false;
    source: 'google_places';
    fields_mask_used?: string;
  };
}

/**
 * Fetch Place Details with Atmosphere fields for golden_records.google_places_attributes.
 * Returns structured JSON suitable for energy/tag scoring.
 * popular_times is never available from the public API.
 */
export async function getPlaceAttributes(placeId: string): Promise<GooglePlacesAttributes | null> {
  checkEnabled();
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key is not configured');
  }

  const params = new URLSearchParams({
    place_id: placeId,
    key: GOOGLE_PLACES_API_KEY,
    fields: VALADATA_GOOGLE_PLACES_FIELDS_V1_STRING,
  });

  const response = await fetch(
    `${PLACES_API_BASE}/details/json?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status === 'NOT_FOUND') {
    return null;
  }

  if (data.status !== 'OK') {
    throw new Error(`Google Places API error: ${data.status}`);
  }

  const place = data.result;
  const now = new Date().toISOString();

  const attrs: GooglePlacesAttributes = {
    types: place.types ?? [],
    price_level: place.price_level,
    rating: place.rating,
    user_ratings_total: place.user_ratings_total,
    serves_beer: place.serves_beer ?? undefined,
    serves_wine: place.serves_wine ?? undefined,
    serves_breakfast: place.serves_breakfast ?? undefined,
    serves_brunch: place.serves_brunch ?? undefined,
    serves_lunch: place.serves_lunch ?? undefined,
    serves_dinner: place.serves_dinner ?? undefined,
    serves_vegetarian_food: place.serves_vegetarian_food ?? undefined,
    delivery: place.delivery ?? undefined,
    dine_in: place.dine_in ?? undefined,
    takeout: place.takeout ?? undefined,
    reservable: place.reservable ?? undefined,
    curbside_pickup: place.curbside_pickup ?? undefined,
    popular_times: null,
    _meta: {
      fetched_at: now,
      popular_times_available: false,
      source: 'google_places',
      fields_mask_used: VALADATA_GOOGLE_PLACES_FIELDS_V1_STRING,
    },
  };

  return attrs;
}

/**
 * Attributes "present" per CTO brief:
 * - non-null with types (or equivalent) and at least one atmosphere field
 */
export function areAttributesPresent(attrs: unknown): boolean {
  if (!attrs || typeof attrs !== 'object') return false;
  const o = attrs as Record<string, unknown>;
  const hasTypes = Array.isArray(o.types) && o.types.length > 0;
  const atmosphereFields = [
    'serves_beer',
    'serves_wine',
    'serves_cocktails',
    'live_music',
    'good_for_groups',
    'delivery',
    'dine_in',
    'takeout',
    'reservable',
  ];
  const hasAtmosphere = atmosphereFields.some((f) => o[f] === true || o[f] === false);
  return hasTypes && hasAtmosphere;
}

/**
 * popular_times "present" if attrs has non-empty popular_times.
 * Google API does NOT provide this; always false for our fetches.
 */
export function isPopularTimesPresent(attrs: unknown): boolean {
  if (!attrs || typeof attrs !== 'object') return false;
  const o = attrs as Record<string, unknown>;
  const pt = o.popular_times;
  if (pt == null) return false;
  if (Array.isArray(pt) && pt.length > 0) return true;
  if (typeof pt === 'object' && Object.keys(pt).length > 0) return true;
  return false;
}
