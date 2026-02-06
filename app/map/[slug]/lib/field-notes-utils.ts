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

/** Compute bounding box from array of {lat, lng} points using smart bounds to exclude outliers. */
export function computeBounds(
  points: Array<{ lat: number; lng: number }>,
  tight: boolean = false // For cover map tight zoom
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  if (points.length === 0) {
    return { minLat: 0, maxLat: 0.01, minLng: 0, maxLng: 0.01 };
  }

  // For cover map, use tighter outlier detection (1.0 instead of 1.5)
  const multiplier = tight ? 0.8 : 1.0; // Even tighter for cover map
  
  if (points.length <= 3) {
    // Too few points for outlier detection
    return computeSimpleBounds(points, tight);
  }

  // Calculate center point
  const centerLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const centerLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;

  // Calculate distance from center for each point
  const distances = points.map(p => ({
    point: p,
    distance: Math.sqrt(
      Math.pow(p.lat - centerLat, 2) + 
      Math.pow(p.lng - centerLng, 2)
    )
  }));

  // Sort by distance
  distances.sort((a, b) => a.distance - b.distance);

  // Calculate IQR
  const q1Index = Math.floor(distances.length * 0.25);
  const q3Index = Math.floor(distances.length * 0.75);
  const q1 = distances[q1Index].distance;
  const q3 = distances[q3Index].distance;
  const iqr = q3 - q1;

  // Upper fence for cover map (tighter than expanded map)
  const upperFence = q3 + multiplier * iqr;

  // Filter to included points only
  const includedPoints = distances
    .filter(({ distance }) => distance <= upperFence)
    .map(({ point }) => point);

  // If we filtered out too many, use all points
  if (includedPoints.length < 2) {
    return computeSimpleBounds(points, tight);
  }

  return computeSimpleBounds(includedPoints, tight);
}

/** Helper: Compute simple bounds with padding */
function computeSimpleBounds(
  points: Array<{ lat: number; lng: number }>,
  tight: boolean = false
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const padding = tight ? 0.02 : 0.05; // Much tighter padding for cover map
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
