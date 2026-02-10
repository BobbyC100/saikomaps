/**
 * Haversine Distance Calculation
 * 
 * Calculates the great-circle distance between two points on Earth
 * given their latitude and longitude in decimal degrees.
 */

const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_M = 6371000;

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  unit: 'km' | 'm' = 'm'
): number {
  // Convert degrees to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  const radius = unit === 'km' ? EARTH_RADIUS_KM : EARTH_RADIUS_M;
  return radius * c;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}
