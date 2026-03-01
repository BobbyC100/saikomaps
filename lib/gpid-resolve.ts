/**
 * GPID resolution for import/sync scripts (GPID-first).
 * Resolve google_place_id from: existing value, Nearby Search (200m), or Text Search "${name} Los Angeles".
 * Only accept MATCH when: Nearby strong match (sim >= 0.85, dist <= radius) or Text exactly 1 result + sim >= 0.85.
 */

import { haversineDistance } from '@/lib/haversine';
import { nearbySearch, searchPlace, type PlaceSearchResult } from '@/lib/google-places';
import { tokenSortRatio } from '@/lib/similarity';

const NEARBY_RADIUS_M = 200;
const NAME_SIMILARITY_THRESHOLD = 0.85; // 85% (same as resolver dryrun)
const TEXT_QUERY_SUFFIX = ' Los Angeles';

export type GpidResolveStatus = 'MATCH' | 'AMBIGUOUS' | 'NO_MATCH' | 'ERROR';

export interface GpidResolveResult {
  status: GpidResolveStatus;
  gpid?: string;
  reason: string;
}

function normalize(s: string): string {
  return (s ?? '').toLowerCase().trim();
}

function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  return tokenSortRatio(normalize(a), normalize(b));
}

/** Strong match from Nearby: best candidate has sim >= threshold and distance <= radius. */
function bestNearbyMatch(
  name: string,
  lat: number,
  lng: number,
  results: PlaceSearchResult[],
  radiusM: number
): { placeId: string; score: number } | null {
  if (!results.length) return null;
  let best: PlaceSearchResult | null = null;
  let bestScore = 0;
  let bestDist = Infinity;
  for (const r of results) {
    const score = nameSimilarity(name, r.name);
    const dist = haversineDistance(lat, lng, r.location.lat, r.location.lng, 'm');
    if (score > bestScore || (score === bestScore && dist < bestDist)) {
      bestScore = score;
      bestDist = dist;
      best = r;
    }
  }
  if (!best || bestScore < NAME_SIMILARITY_THRESHOLD || bestDist > radiusM) return null;
  return { placeId: best.placeId, score: bestScore };
}

/** Text search: exactly one result and name similarity >= threshold. */
function textSearchSingleMatch(name: string, results: PlaceSearchResult[]): { placeId: string } | null {
  if (results.length !== 1) return null;
  const r = results[0];
  const score = nameSimilarity(name, r.name);
  if (score < NAME_SIMILARITY_THRESHOLD) return null;
  return { placeId: r.placeId };
}

/**
 * Resolve GPID for a row. Use existing if non-empty; else Nearby (200m) then Text Search fallback.
 * Only returns status MATCH when acceptance rules are met; otherwise skip (SKIP_NO_GPID with reason).
 */
export async function resolveGpid(options: {
  name: string;
  gpid?: string | null;
  lat?: number | null;
  lng?: number | null;
}): Promise<GpidResolveResult> {
  const { name, gpid, lat, lng } = options;
  const hasCoords = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const existingGpid = (typeof gpid === 'string' ? gpid : '').trim();
  if (existingGpid) {
    return { status: 'MATCH', gpid: existingGpid, reason: 'EXISTING_GPID' };
  }

  try {
    if (hasCoords) {
      const nearby = await nearbySearch(lat!, lng!, NEARBY_RADIUS_M);
      const match = bestNearbyMatch(name, lat!, lng!, nearby, NEARBY_RADIUS_M);
      if (match) {
        return { status: 'MATCH', gpid: match.placeId, reason: 'NEARBY_STRONG_MATCH' };
      }
    }

    const textResults = await searchPlace(`${name}${TEXT_QUERY_SUFFIX}`, { maxResults: 5 });
    const textMatch = textSearchSingleMatch(name, textResults);
    if (textMatch) {
      return { status: 'MATCH', gpid: textMatch.placeId, reason: 'TEXT_SINGLE_HIGH_SIM' };
    }

    if (textResults.length === 0) {
      return { status: 'NO_MATCH', reason: 'TEXT_ZERO_RESULTS' };
    }
    if (textResults.length >= 2) {
      return { status: 'AMBIGUOUS', reason: `TEXT_MULTI_RESULTS_${textResults.length}` };
    }
    return { status: 'NO_MATCH', reason: 'TEXT_LOW_SIM' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'ERROR', reason: msg.slice(0, 120) };
  }
}
