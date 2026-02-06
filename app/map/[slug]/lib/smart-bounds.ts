/**
 * Smart Bounds Calculation
 * Uses IQR-based outlier detection to prevent far-away locations
 * from stretching the map view too wide.
 */

interface LatLng {
  lat: number;
  lng: number;
}

interface SmartBoundsResult {
  bounds: google.maps.LatLngBounds;
  outliers: LatLng[];
  included: LatLng[];
}

/**
 * Calculate smart bounds that exclude geographic outliers
 * @param locations - Array of lat/lng coordinates
 * @param multiplier - IQR multiplier for outlier detection (default 1.5, use 1.0 for tighter bounds)
 * @returns Bounds object with included points and list of outliers
 */
export function calculateSmartBounds(
  locations: LatLng[],
  multiplier: number = 1.5
): SmartBoundsResult {
  if (locations.length === 0) {
    const bounds = new google.maps.LatLngBounds();
    return { bounds, outliers: [], included: [] };
  }

  if (locations.length <= 3) {
    // Too few points to have meaningful outliers — use all
    const bounds = new google.maps.LatLngBounds();
    locations.forEach(loc => bounds.extend(loc));
    return { bounds, outliers: [], included: locations };
  }

  // Calculate center point
  const centerLat = locations.reduce((sum, l) => sum + l.lat, 0) / locations.length;
  const centerLng = locations.reduce((sum, l) => sum + l.lng, 0) / locations.length;

  // Calculate distance from center for each point
  const distances = locations.map(loc => ({
    loc,
    distance: Math.sqrt(
      Math.pow(loc.lat - centerLat, 2) + 
      Math.pow(loc.lng - centerLng, 2)
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

  // Upper fence: Q3 + multiplier * IQR
  const upperFence = q3 + multiplier * iqr;

  // Separate outliers from included
  const included: LatLng[] = [];
  const outliers: LatLng[] = [];

  distances.forEach(({ loc, distance }) => {
    if (distance <= upperFence) {
      included.push(loc);
    } else {
      outliers.push(loc);
    }
  });

  // Build bounds from included points only
  const bounds = new google.maps.LatLngBounds();
  included.forEach(loc => bounds.extend(loc));

  return { bounds, outliers, included };
}
