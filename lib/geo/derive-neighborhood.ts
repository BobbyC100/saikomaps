/**
 * Unified neighborhood derivation.
 * Strategy: local boundary lookup first (free, instant) → Google reverse geocode fallback (API call).
 */
import { lookupNeighborhood } from './neighborhood-lookup';
import { getNeighborhoodFromCoords } from '@/lib/google-places';
import { normalizeNeighborhood } from './normalize-neighborhood';

export type NeighborhoodSource = 'boundary_lookup' | 'google_geocode';

export interface DeriveNeighborhoodResult {
  neighborhood: string;
  source: NeighborhoodSource;
}

/**
 * Derive neighborhood for a given lat/lng.
 * 1. Try local LA boundary polygon lookup (instant, no API cost).
 * 2. Fall back to Google Geocoding API reverse lookup.
 * Returns null if both strategies fail.
 */
export async function deriveNeighborhood(
  lat: number,
  lng: number,
): Promise<DeriveNeighborhoodResult | null> {
  // Strategy 1: local boundary lookup (instant, free)
  const fromBoundary = lookupNeighborhood(lat, lng);
  if (fromBoundary) {
    return { neighborhood: fromBoundary, source: 'boundary_lookup' };
  }

  // Strategy 2: Google reverse geocode (API call)
  const fromGoogle = await getNeighborhoodFromCoords(lat, lng);
  if (fromGoogle) {
    const normalized = normalizeNeighborhood(fromGoogle);
    if (normalized) {
      return { neighborhood: normalized, source: 'google_geocode' };
    }
  }

  return null;
}
