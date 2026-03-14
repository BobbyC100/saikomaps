/**
 * Local LA neighborhood boundary lookup via point-in-polygon.
 * Loads GeoJSON once (lazy singleton), caches in memory.
 * Zero API calls, zero rate limits, sub-millisecond lookup.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import { normalizeNeighborhood } from './normalize-neighborhood';

interface GeoJSONFeature {
  type: 'Feature';
  properties: { name: string; [key: string]: unknown };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

let _collection: GeoJSONFeatureCollection | null = null;

function loadBoundaries(): GeoJSONFeatureCollection {
  if (_collection) return _collection;
  const filePath = join(process.cwd(), 'data', 'geo', 'la-neighborhoods.geojson');
  const raw = readFileSync(filePath, 'utf-8');
  _collection = JSON.parse(raw) as GeoJSONFeatureCollection;
  return _collection;
}

/**
 * Lookup neighborhood from lat/lng using local LA boundary polygons.
 * Returns normalized neighborhood name, or null if point is outside all polygons.
 *
 * Note: GeoJSON uses [lng, lat] order. This function takes (lat, lng) to match
 * the existing getNeighborhoodFromCoords(lat, lng) signature convention.
 */
export function lookupNeighborhood(lat: number, lng: number): string | null {
  const collection = loadBoundaries();
  const pt = point([lng, lat]); // GeoJSON coordinate order: [longitude, latitude]

  for (const feature of collection.features) {
    if (booleanPointInPolygon(pt, feature as any)) {
      return normalizeNeighborhood(feature.properties.name);
    }
  }

  return null;
}
