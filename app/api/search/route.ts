/**
 * API Route: Search
 * GET /api/search?q=...&lat=...&lng=...
 * Returns neighborhoods + ranked places for Explore/Search UI
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getGooglePhotoUrl } from '@/lib/google-places';

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
    // Pull a larger set, then rank down to 12
    const places = await (db as any).places.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { neighborhood: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
          { cuisineType: { contains: query, mode: 'insensitive' } },
          { vibeTags: { hasSome: [queryLower] } },
        ],
        status: 'OPEN',
      },
      select: {
        id: true,
        slug: true,
        name: true,
        neighborhood: true,
        category: true,
        cuisineType: true,
        priceLevel: true,
        vibeTags: true,
        latitude: true,
        longitude: true,
        googlePlaceId: true,

        googlePhotos: true,
        hours: true,

        pullQuote: true,
        pullQuoteSource: true,
        pullQuoteAuthor: true,
        pullQuoteUrl: true,
        editorialSources: true,
        chefRecs: true,
      },
      take: 50,
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

    // Rank
    const rankedPlaces = places
      .map((place: any) => {
        const nameLower = (place.name || '').toLowerCase();
        let score = 0;

        if (nameLower === queryLower) score = 1000;
        else if (nameLower.startsWith(queryLower)) score = 900;
        else if (nameLower.includes(queryLower)) score = 800;
        else if ((place.neighborhood || '').toLowerCase() === queryLower) score = 700;
        else if ((place.neighborhood || '').toLowerCase().includes(queryLower)) score = 600;
        else if (
          (place.category || '').toLowerCase().includes(queryLower) ||
          (place.cuisineType || '').toLowerCase().includes(queryLower)
        )
          score = 500;
        else if (Array.isArray(place.vibeTags) && place.vibeTags.some((t: string) => t.toLowerCase().includes(queryLower)))
          score = 400;

        return { ...place, score };
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 12)
      .map((place: any) => {
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
          cuisine: place.cuisineType,
          price,
          photoUrl,
          ...status,
          signals,
          coverageQuote: place.pullQuote,
          coverageSource: place.pullQuoteSource,
          vibeTags: Array.isArray(place.vibeTags) ? place.vibeTags.slice(0, 3) : [],
          distanceMiles: distanceMiles !== undefined ? Number(distanceMiles.toFixed(1)) : undefined,
          placePersonality,
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