/**
 * Derive neighborhood from lat/lng coordinates.
 * Strategy: LA boundary polygon lookup (free, instant) → Google reverse geocode fallback.
 *
 * TODO: Implement boundary polygon lookup from LA neighborhood GeoJSON data.
 * For now, returns null (no derivation) so the build passes.
 */

interface DeriveResult {
  neighborhood: string;
  source: 'boundary_polygon' | 'google_reverse_geocode';
}

export async function deriveNeighborhood(
  lat: number,
  lng: number,
): Promise<DeriveResult | null> {
  // TODO: Implement LA neighborhood boundary polygon lookup
  // TODO: Google reverse geocode fallback
  return null;
}
