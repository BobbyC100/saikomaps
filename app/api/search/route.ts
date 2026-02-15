/**
 * API Route: Search
 * GET /api/search?q=...&lat=...&lng=...
 * Returns neighborhoods + ranked places for Explore/Search UI
 * 
 * EOS Integration: Uses editorial ranking system for discovery
 * - Ranked-only inclusion (rankingScore > 0)
 * - Human-authored ordering (no ML)
 * - Diversity constraint enforced
 * - Max 12 results cap
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getGooglePhotoUrl } from '@/lib/google-places';
import { applyDiversityFilter } from '@/lib/ranking';
import { requireActiveCityId } from '@/lib/active-city';
import { getIntentCategory } from '@/lib/search/intent-map';

// Helper: Extract first photo URL
function getFirstPhotoUrl(googlePhotos: any): string | undefined {
  if (!googlePhotos || !Array.isArray(googlePhotos)) return undefined;
  const firstPhoto = googlePhotos[0];
  if (!firstPhoto) return undefined;

  try {
    // String format: photo reference
    if (typeof firstPhoto === 'string' && firstPhoto.trim()) {
      return getGooglePhotoUrl(firstPhoto, 400);
    }

    // Object format
    if (typeof firstPhoto === 'object') {
      const ref =
        firstPhoto.name ||
        firstPhoto.photoReference ||
        firstPhoto.photo_reference ||
        firstPhoto.reference;

      if (ref && typeof ref === 'string') {
        return getGooglePhotoUrl(ref, 400);
      }
    }
  } catch (e) {
    console.error('Error processing photo:', e);
  }

  return undefined;
}

// Helper: Map price level to symbol
function mapPriceLevel(level: number | null | undefined): '$' | '$$' | '$$$' | undefined {
  if (level === null || level === undefined) return undefined;
  if (level <= 1) return '$';
  if (level === 2) return '$$';
  return '$$$';
}

// Helper: Parse hours for status (simplified)
function getOpenStatus(hours: any): { isOpen?: boolean } {
  if (!hours || typeof hours !== 'object') return {};
  try {
    if ('openNow' in hours) return { isOpen: Boolean(hours.openNow) };
    if ('open_now' in hours) return { isOpen: Boolean(hours.open_now) };
    return {};
  } catch {
    return {};
  }
}

// Helper: Extract editorial signals (max 2)
function extractSignals(place: any): Array<{ type: string; label: string }> {
  const signals: Array<{ type: string; label: string }> = [];
  const seenTypes = new Set<string>();

  const sources = Array.isArray(place?.editorialSources) ? place.editorialSources : [];

  for (const source of sources) {
    if (signals.length >= 2) break;

    const pub = (source?.publication || source?.source_publication || '')
      .toString()
      .toLowerCase();

    if (!pub) continue;

    if (pub.includes('eater') && !seenTypes.has('eater38')) {
      signals.push({ type: 'eater38', label: 'Eater 38' });
      seenTypes.add('eater38');
    } else if ((pub.includes('la times') || pub.includes('los angeles times')) && !seenTypes.has('latimes101')) {
      signals.push({ type: 'latimes101', label: 'LA Times 101' });
      seenTypes.add('latimes101');
    } else if (pub.includes('michelin') && !seenTypes.has('michelin')) {
      signals.push({ type: 'michelin', label: 'Michelin' });
      seenTypes.add('michelin');
    } else if (pub.includes('infatuation') && !seenTypes.has('infatuation')) {
      signals.push({ type: 'infatuation', label: 'Infatuation' });
      seenTypes.add('infatuation');
    }
  }

  // Chef rec fallback (only if we still have room)
  if (signals.length < 2 && Array.isArray(place?.chefRecs) && place.chefRecs.length > 0) {
    signals.push({ type: 'chefrec', label: 'Chef Rec' });
  }

  return signals;
}

// Helper: Calculate distance in miles
function calculateDistanceMiles(
  lat1: number | null,
  lng1: number | null,
  lat2: number | null,
  lng2: number | null
): number | undefined {
  if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) return undefined;

  const R = 3959; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q') || '';
  const query = q.trim();
  const queryLower = query.toLowerCase();

  const userLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat') as string) : null;
  const userLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng') as string) : null;

  if (!query || query.length < 2) {
    return NextResponse.json({ neighborhoods: [], places: [] });
  }

  try {
    // Fetch LA city ID
    const cityId = await requireActiveCityId();

    // P0 Fix: Check for intent mapping (dinner → eat, drinks → drink)
    const intentCategory = getIntentCategory(query);

    // EOS: Fetch ranked places only (rankingScore > 0)
    // Pull larger set for search matching, then rank and cap
    const places = await (db as any).places.findMany({
      where: {
        cityId,
        rankingScore: { gt: 0 }, // EOS: Ranked-only inclusion gate
        // If intent matched (e.g., "dinner"), filter by category
        // Otherwise, search across all text fields
        ...(intentCategory ? {
          category: intentCategory,
        } : {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { neighborhood: { contains: query, mode: 'insensitive' } },
            { category: { contains: query, mode: 'insensitive' } },
            { cuisinePrimary: { contains: query, mode: 'insensitive' } }, // EOS: Search curated cuisine first
            { cuisineType: { contains: query, mode: 'insensitive' } }, // Fallback to legacy
            { vibeTags: { hasSome: [queryLower] } },
          ],
        }),
        status: 'OPEN',
      },
      select: {
        id: true,
        slug: true,
        name: true,
        neighborhood: true,
        category: true,
        cuisineType: true,
        cuisinePrimary: true, // EOS: Saiko-curated cuisine taxonomy
        priceLevel: true,
        vibeTags: true,
        latitude: true,
        longitude: true,
        googlePlaceId: true,
        rankingScore: true, // EOS: Used for ordering

        googlePhotos: true,
        hours: true,

        pullQuote: true,
        pullQuoteSource: true,
        pullQuoteAuthor: true,
        pullQuoteUrl: true,
        editorialSources: true,
        chefRecs: true,
      },
      take: 100, // Fetch more for diversity filtering
      orderBy: {
        rankingScore: 'desc', // EOS: Human-authored editorial ordering
      },
    });

    // Fetch identity signals for places that have googlePlaceId
    const googlePlaceIds: string[] = places
      .map((p: any) => p.googlePlaceId)
      .filter((id: any): id is string => typeof id === 'string' && id.length > 0);

    const identitySignals = googlePlaceIds.length
      ? await (db as any).golden_records.findMany({
          where: { google_place_id: { in: googlePlaceIds } },
          select: { google_place_id: true, place_personality: true },
        })
      : [];

    const personalityMap = new Map<string, string | null>();
    for (const r of identitySignals) {
      if (r.google_place_id) personalityMap.set(r.google_place_id, r.place_personality ?? null);
    }

    // EOS: Apply relevance scoring for query matching (secondary to rankingScore)
    // Primary ordering is by rankingScore (editorial), this adds query-relevance boosting
    const scoredPlaces = places
      .map((place: any) => {
        const nameLower = (place.name || '').toLowerCase();
        let queryRelevance = 0;

        // Query relevance boosts (for sorting within same rankingScore tier)
        if (nameLower === queryLower) queryRelevance = 1000;
        else if (nameLower.startsWith(queryLower)) queryRelevance = 900;
        else if (nameLower.includes(queryLower)) queryRelevance = 800;
        else if ((place.neighborhood || '').toLowerCase() === queryLower) queryRelevance = 700;
        else if ((place.neighborhood || '').toLowerCase().includes(queryLower)) queryRelevance = 600;
        else if ((place.category || '').toLowerCase().includes(queryLower)) queryRelevance = 500;
        else if ((place.cuisinePrimary || '').toLowerCase().includes(queryLower)) queryRelevance = 480; // Prefer curated cuisine
        else if ((place.cuisineType || '').toLowerCase().includes(queryLower)) queryRelevance = 460; // Legacy fallback
        else if (Array.isArray(place.vibeTags) && place.vibeTags.some((t: string) => t.toLowerCase().includes(queryLower)))
          queryRelevance = 400;

        return { ...place, queryRelevance };
      })
      .sort((a: any, b: any) => {
        // EOS: Primary sort by editorial ranking
        if (b.rankingScore !== a.rankingScore) {
          return b.rankingScore - a.rankingScore;
        }
        // Secondary: Query relevance (within same editorial tier)
        return b.queryRelevance - a.queryRelevance;
      });

    // EOS: Apply diversity filter (max 3 consecutive same cuisine)
    const diversePlaces = applyDiversityFilter(scoredPlaces, 3);

    // EOS: Enforce max cap (12 results for search)
    const cappedPlaces = diversePlaces.slice(0, 12);

    // Transform to response format
    const rankedPlaces = cappedPlaces.map((place: any) => {
        const photoUrl = getFirstPhotoUrl(place.googlePhotos);
        const status = getOpenStatus(place.hours);
        const signals = extractSignals(place);
        const price = mapPriceLevel(place.priceLevel);

        const distanceMiles = calculateDistanceMiles(
          userLat,
          userLng,
          typeof place.latitude === 'number' ? place.latitude : null,
          typeof place.longitude === 'number' ? place.longitude : null
        );

        const placePersonality = place.googlePlaceId ? personalityMap.get(place.googlePlaceId) ?? null : null;

        return {
          slug: place.slug,
          name: place.name,
          neighborhood: place.neighborhood,
          category: place.category,
          cuisine: place.cuisineType, // Keep legacy for client (cuisinePrimary is internal only)
          price,
          photoUrl,
          ...status,
          signals,
          coverageQuote: place.pullQuote,
          coverageSource: place.pullQuoteSource,
          vibeTags: Array.isArray(place.vibeTags) ? place.vibeTags.slice(0, 3) : [],
          distanceMiles: distanceMiles !== undefined ? Number(distanceMiles.toFixed(1)) : undefined,
          placePersonality,
          // Note: rankingScore, cuisinePrimary NOT exposed to client (internal only)
        };
      });

    // Neighborhood aggregation (from all matches)
    const neighborhoodCounts = new Map<string, number>();
    for (const p of places) {
      if (p.neighborhood) {
        const hood = p.neighborhood as string;
        neighborhoodCounts.set(hood, (neighborhoodCounts.get(hood) || 0) + 1);
      }
    }

    const matchingNeighborhoods = Array.from(neighborhoodCounts.entries())
      .filter(([name]) => name.toLowerCase().includes(queryLower))
      .sort((a, b) => {
        const aLower = a[0].toLowerCase();
        const bLower = b[0].toLowerCase();
        if (aLower === queryLower) return -1;
        if (bLower === queryLower) return 1;
        return b[1] - a[1];
      })
      .slice(0, 3)
      .map(([name, count]) => ({
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        count,
      }));

    return NextResponse.json({
      neighborhoods: matchingNeighborhoods,
      places: rankedPlaces,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}