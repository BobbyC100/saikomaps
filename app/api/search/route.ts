import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getGooglePhotoUrl } from '@/lib/google-places'

const prisma = new PrismaClient()

// Energy intent: map search concepts → identity_signals.language_signals equivalents
const ENERGY_INTENT_TERMS = new Set([
  'date night', 'date-night', 'romantic',
  'cozy', 'chill', 'intimate', 'quiet',
  'lively', 'buzzy', 'energetic', 'electric',
  'late night', 'late-night',
  'after work', 'after-work',
  'low-key', 'lowkey', 'casual',
  'group', 'solo',
]);

// Helper: Extract first photo URL
function getFirstPhotoUrl(googlePhotos: any): string | undefined {
  if (!googlePhotos || !Array.isArray(googlePhotos)) return undefined;
  const firstPhoto = googlePhotos[0];
  if (!firstPhoto) return undefined;
  
  try {
    if (typeof firstPhoto === 'string' && firstPhoto.trim()) {
      return getGooglePhotoUrl(firstPhoto, 400);
    }
    
    if (typeof firstPhoto === 'object') {
      const ref = firstPhoto.name || firstPhoto.photoReference || firstPhoto.photo_reference;
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
function mapPriceLevel(level: number | null): '$' | '$$' | '$$$' | undefined {
  if (level === null || level === undefined) return undefined;
  if (level === 1) return '$';
  if (level === 2) return '$$';
  if (level >= 3) return '$$$';
  return undefined;
}

// Helper: Parse hours for status (simplified)
function getOpenStatus(hours: any): { isOpen?: boolean; closesAt?: string; opensAt?: string } {
  if (!hours || typeof hours !== 'object') return {};
  
  try {
    if ('openNow' in hours || 'open_now' in hours) {
      return { isOpen: hours.openNow || hours.open_now };
    }
    return {};
  } catch (e) {
    return {};
  }
}

// Helper: Extract editorial signals
function extractSignals(place: any): Array<{ type: string; label: string }> {
  const signals: Array<{ type: string; label: string }> = [];
  
  if (place.editorialSources && Array.isArray(place.editorialSources)) {
    const seenTypes = new Set<string>();
    
    for (const source of place.editorialSources) {
      if (signals.length >= 2) break;
      
      const pub = source.publication?.toLowerCase() || '';
      
      if (pub.includes('eater') && !seenTypes.has('eater38')) {
        signals.push({ type: 'eater38', label: 'Eater 38' });
        seenTypes.add('eater38');
      } else if (pub.includes('la times') && !seenTypes.has('latimes101')) {
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
  }
  
  if (place.chefRecs && Array.isArray(place.chefRecs) && place.chefRecs.length > 0 && signals.length < 2) {
    signals.push({ type: 'chefrec', label: 'Chef Rec' });
  }
  
  return signals;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const userLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
  const userLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;

  if (!query || query.length < 2) {
    return NextResponse.json({
      neighborhoods: [],
      places: [],
    })
  }

  const queryLower = query.toLowerCase().trim()
  const isEnergyQuery = ENERGY_INTENT_TERMS.has(queryLower);

  try {
    // Search places — energy-only queries skip name/category matching to avoid noise
    const places = await prisma.entities.findMany({
      where: {
        OR: [
          { name: { contains: queryLower, mode: 'insensitive' } },
          { neighborhood: { contains: queryLower, mode: 'insensitive' } },
          { category: { contains: queryLower, mode: 'insensitive' } },
          { cuisineType: { contains: queryLower, mode: 'insensitive' } },
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
        latitude: true,
        longitude: true,
        googlePlaceId: true,
        googlePhotos: true,
        hours: true,
        pullQuote: true,
        pullQuoteSource: true,
        editorialSources: true,
        chefRecs: true,
      },
      take: 50,
    })
    
    // Fetch identity signals + menu/winelist status + language_signals from golden_records
    const googlePlaceIds = places
      .map(p => p.googlePlaceId)
      .filter((id): id is string => id !== null);
    
    const goldenRecords = await prisma.golden_records.findMany({
      where: {
        google_place_id: { in: googlePlaceIds },
      },
      select: {
        google_place_id: true,
        place_personality: true,
        identity_signals: true,
        menu_signals: {
          select: {
            status: true,
            payload: true,
          },
        },
        winelist_signals: {
          select: {
            status: true,
            payload: true,
          },
        },
      },
    });
    
    // Build map of google_place_id → identity data
    const identityMap = new Map<string, {
      personality: string | null;
      languageSignals: string[];
      menuSignalsStatus: string | null;
      winelistSignalsStatus: string | null;
      menuPayload: any;
      winelistPayload: any;
    }>();
    goldenRecords.forEach(record => {
      if (record.google_place_id) {
        const sig = record.identity_signals as Record<string, unknown> | null;
        const languageSignals = Array.isArray(sig?.language_signals) ? (sig!.language_signals as string[]) : [];
        identityMap.set(record.google_place_id, {
          personality: record.place_personality,
          languageSignals,
          menuSignalsStatus: record.menu_signals?.status || null,
          winelistSignalsStatus: record.winelist_signals?.status || null,
          menuPayload: record.menu_signals?.payload || null,
          winelistPayload: record.winelist_signals?.payload || null,
        });
      }
    });

    // Helper: Calculate distance in miles
    const calculateDistance = (lat1: number | null, lng1: number | null, lat2: any, lng2: any): number | undefined => {
      if (!lat1 || !lng1 || !lat2 || !lng2) return undefined;
      
      const lat2Num = typeof lat2 === 'string' ? parseFloat(lat2) : Number(lat2);
      const lng2Num = typeof lng2 === 'string' ? parseFloat(lng2) : Number(lng2);
      
      if (isNaN(lat2Num) || isNaN(lng2Num)) return undefined;
      
      const R = 3959;
      const dLat = ((lat2Num - lat1) * Math.PI) / 180;
      const dLng = ((lng2Num - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2Num * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Rank and enrich results
    const rankedPlaces = places
      .map((place) => {
        const nameLower = place.name.toLowerCase()
        const identity = place.googlePlaceId ? identityMap.get(place.googlePlaceId) : null;
        const languageSignals = identity?.languageSignals ?? [];
        let score = 0

        // Exact name match
        if (nameLower === queryLower) score = 1000
        // Name starts with query
        else if (nameLower.startsWith(queryLower)) score = 900
        // Name contains query
        else if (nameLower.includes(queryLower)) score = 800
        // Neighborhood exact match
        else if (place.neighborhood?.toLowerCase() === queryLower) score = 700
        // Neighborhood contains query
        else if (place.neighborhood?.toLowerCase().includes(queryLower)) score = 600
        // Category/cuisine match
        else if (
          place.category?.toLowerCase().includes(queryLower) ||
          place.cuisineType?.toLowerCase().includes(queryLower)
        )
          score = 500

        // Boost for energy/scene match in identity_signals.language_signals
        if (isEnergyQuery && languageSignals.some((w) => w.toLowerCase().includes(queryLower) || queryLower.includes(w.toLowerCase()))) {
          score = Math.max(score, 400);
        }

        return { ...place, score, identity }
      })
      .filter((place) => place.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ score, id, googlePlaceId, identity, ...place }) => {
        const photoUrl = getFirstPhotoUrl(place.googlePhotos);
        const status = getOpenStatus(place.hours);
        const signals = extractSignals(place);
        const price = mapPriceLevel(place.priceLevel);
        const distanceMiles = calculateDistance(userLat, userLng, place.latitude, place.longitude);
        
        const menuIdentityPresent = !!(identity?.menuPayload && 
          (identity.menuPayload.signature_items?.length > 0 || 
           identity.menuPayload.cuisine_indicators?.length > 0));
        const winelistIdentityPresent = !!(identity?.winelistPayload && 
          (identity.winelistPayload.key_producers?.length > 0 || 
           identity.winelistPayload.style_indicators?.length > 0));
        
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
          distanceMiles: distanceMiles !== undefined ? parseFloat(distanceMiles.toFixed(1)) : undefined,
          placePersonality: identity?.personality as any,
          menuSignalsStatus: identity?.menuSignalsStatus as any,
          winelistSignalsStatus: identity?.winelistSignalsStatus as any,
          menuIdentityPresent,
          winelistIdentityPresent,
        };
      })

    // Aggregate neighborhoods from all matching places (before ranking)
    const neighborhoodCounts = new Map<string, number>()
    places.forEach((place) => {
      if (place.neighborhood) {
        const hood = place.neighborhood
        neighborhoodCounts.set(hood, (neighborhoodCounts.get(hood) || 0) + 1)
      }
    })

    const matchingNeighborhoods = Array.from(neighborhoodCounts.entries())
      .filter(([name]) => name.toLowerCase().includes(queryLower))
      .sort((a, b) => {
        const aLower = a[0].toLowerCase()
        const bLower = b[0].toLowerCase()

        if (aLower === queryLower) return -1
        if (bLower === queryLower) return 1

        return b[1] - a[1]
      })
      .slice(0, 3)
      .map(([name, count]) => ({
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        count,
      }))

    return NextResponse.json({
      neighborhoods: matchingNeighborhoods,
      places: rankedPlaces,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
