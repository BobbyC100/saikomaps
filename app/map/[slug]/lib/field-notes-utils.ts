/** Convert lat/lng to relative positions (0–1) within a bounding box for cover map pins. */
export function latLngToCoverPosition(
  lat: number,
  lng: number,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): { x: number; y: number } {
  const { minLat, maxLat, minLng, maxLng } = bounds;
  const latRange = maxLat - minLat || 0.01;
  const lngRange = maxLng - minLng || 0.01;
  const x = (lng - minLng) / lngRange;
  const y = 1 - (lat - minLat) / latRange; // Flip Y so north is up
  return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
}

/** Compute bounding box from array of {lat, lng} points. */
export function computeBounds(
  points: Array<{ lat: number; lng: number }>
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  if (points.length === 0) {
    return { minLat: 0, maxLat: 0.01, minLng: 0, maxLng: 0.01 };
  }
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const padding = 0.05;
  const latRange = Math.max(0.02, (Math.max(...lats) - Math.min(...lats)) * (1 + padding));
  const lngRange = Math.max(0.02, (Math.max(...lngs) - Math.min(...lngs)) * (1 + padding));
  const minLat = (Math.min(...lats) + Math.max(...lats)) / 2 - latRange / 2;
  const maxLat = minLat + latRange;
  const minLng = (Math.min(...lngs) + Math.max(...lngs)) / 2 - lngRange / 2;
  const maxLng = minLng + lngRange;
  return { minLat, maxLat, minLng, maxLng };
}

export interface CoverPin {
  id: string;
  name: string;
  x: number;
  y: number;
  isFeatured?: boolean;
}

/** Build CoverPin[] for cover map from places with lat/lng. */
export function buildCoverPins(
  places: Array<{
    id: string;
    name: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
    orderIndex?: number;
  }>
): CoverPin[] {
  const points = places
    .map((p) => {
      const lat = typeof p.latitude === 'string' ? parseFloat(p.latitude) : p.latitude;
      const lng = typeof p.longitude === 'string' ? parseFloat(p.longitude) : p.longitude;
      if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
      return { id: p.id, name: p.name, lat, lng, orderIndex: p.orderIndex ?? 0 };
    })
    .filter((p): p is NonNullable<typeof p> => p != null);

  if (points.length === 0) return [];

  const bounds = computeBounds(points);
  const firstIndex = points.reduce(
    (best, p, i) => ((p.orderIndex ?? 0) < (points[best]?.orderIndex ?? 999) ? i : best),
    0
  );

  return points.map((p, i) => {
    const { x, y } = latLngToCoverPosition(p.lat, p.lng, bounds);
    return {
      id: p.id,
      name: p.name,
      x,
      y,
      isFeatured: i === firstIndex || i < 3, // First place + next 2 get labels (max 3-4)
    };
  });
}
