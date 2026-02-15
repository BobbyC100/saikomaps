/**
 * getPlaceCanonical - Fetch canonical place data for customer-facing display
 * 
 * Returns structured, customer-ready place data aligned to the Place Canonical API contract.
 * 
 * @see docs/API-CONTRACT-PLACE-CANONICAL.md
 */

import { db } from '@/lib/db';
import { getGooglePhotoUrl, getPhotoRefFromStored } from '@/lib/google-places';

// ═════════════════════════════════════════════════════════════════════════════
// Types
// ═════════════════════════════════════════════════════════════════════════════

export interface PlaceCanonical {
  // Identity & Basic Info
  id: string;
  slug: string;
  name: string;
  status: 'OPEN' | 'CLOSED' | 'TEMP_CLOSED';

  // Location & Geography
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  neighborhood: string | null;
  city: string | null;

  // Tier 0 Actions (Primary CTAs)
  menuUrl: string | null;
  winelistUrl: string | null;
  reservationUrl: string | null;

  // Contact & Secondary Actions
  phone: string | null;
  instagram: string | null;
  aboutUrl: string | null;
  website: string | null;

  // Hours & Availability
  hours: Record<string, string> | null;
  hoursFreshness: {
    cachedAt: string | null;
    needsRefresh: boolean; // internal QA signal only
  };

  // Trust Layer (Editorial Content)
  saikoSummary: {
    content: string;
    generatedAt: string;
    modelVersion: string;
    sourceCount: number;
  } | null;

  pullQuote: {
    quote: string;
    author: string | null;
    source: string;
    url: string | null;
  } | null;

  coverages: Array<{
    url: string;
    title: string | null;
    publication: string;
    excerpt: string | null;
    quote: string | null;
    publishedAt: string | null;
    trustLevel: 'editorial';
  }>;

  curatorNote: {
    note: string;
    creatorName: string;
    mapTitle: string;
    mapSlug: string;
  } | null;

  // Identity Signals (Chips/Attributes)
  cuisine: {
    primary: string | null;
    secondary: string[];
  };

  priceLevel: number | null;
  intentProfile: string | null;
  vibeTags: string[];

  attributes: {
    accessibility: string[] | null;
    parking: string[] | null;
    dining: string[] | null;
  } | null;

  // Media
  photos: {
    hero: string | null;
    gallery: string[];
  };

  // Tips & Recommendations
  tips: string[];
  chefRecs: {
    chef: string;
    items: string[];
  } | null;

  // Tagline
  tagline: string | null;

  // Restaurant Group
  restaurantGroup: {
    name: string;
    slug: string;
  } | null;

  // Map Appearances
  appearsOn: Array<{
    id: string;
    title: string;
    slug: string;
    coverImageUrl: string | null;
    creatorName: string;
    placeCount: number;
  }>;
}

// ═════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Filter Google Places attributes to useful, non-Yelp-ish signals
 */
function filterGoogleAttributes(raw: any): {
  accessibility: string[] | null;
  parking: string[] | null;
  dining: string[] | null;
} | null {
  if (!raw || typeof raw !== 'object') return null;

  const accessibility = [
    'wheelchair_accessible_entrance',
    'wheelchair_accessible_parking',
    'wheelchair_accessible_restroom',
    'wheelchair_accessible_seating',
  ].filter((key) => raw[key] === true);

  const parking = [
    'parking_street',
    'parking_lot',
    'parking_valet',
    'parking_garage',
    'parking_free',
  ].filter((key) => raw[key] === true);

  const dining = [
    'outdoor_seating',
    'takeout',
    'delivery',
    'reservations_required',
    'reservations_accepted',
    'dine_in',
  ].filter((key) => raw[key] === true);

  if (accessibility.length === 0 && parking.length === 0 && dining.length === 0) {
    return null;
  }

  return {
    accessibility: accessibility.length > 0 ? accessibility : null,
    parking: parking.length > 0 ? parking : null,
    dining: dining.length > 0 ? dining : null,
  };
}

const HOURS_REFRESH_QA_DAYS = 14; // internal QA default (not customer messaging)

function getHoursFreshness(cachedAt: Date | null): {
  cachedAt: string | null;
  needsRefresh: boolean;
} {
  if (!cachedAt) {
    return { cachedAt: null, needsRefresh: true };
  }

  const now = Date.now();
  const ageInDays = (now - cachedAt.getTime()) / (1000 * 60 * 60 * 24);
  const needsRefresh = ageInDays > HOURS_REFRESH_QA_DAYS;

  return {
    cachedAt: cachedAt.toISOString(),
    needsRefresh,
  };
}

/**
 * Parse chef recommendations from JSON field
 */
function parseChefRecs(raw: any): { chef: string; items: string[] } | null {
  if (!raw || typeof raw !== 'object') return null;
  
  // Expected structure: { chef: string, items: string[] }
  if (typeof raw.chef === 'string' && Array.isArray(raw.items)) {
    return {
      chef: raw.chef,
      items: raw.items,
    };
  }
  
  return null;
}

/**
 * Parse hours JSON into Record<string, string>
 */
function parseHours(raw: any): Record<string, string> | null {
  if (!raw) return null;
  
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    return null;
  }
  
  return null;
}

/**
 * Get photo URLs from Google Photos JSON
 */
function getPhotoUrls(googlePhotos: any): { hero: string | null; gallery: string[] } {
  const photoUrls: string[] = [];
  
  if (googlePhotos && Array.isArray(googlePhotos)) {
    for (let i = 0; i < Math.min(10, googlePhotos.length); i++) {
      const ref = getPhotoRefFromStored(
        googlePhotos[i] as {
          photo_reference?: string;
          photoReference?: string;
          name?: string;
        }
      );
      
      if (ref) {
        try {
          photoUrls.push(getGooglePhotoUrl(ref, i === 0 ? 800 : 400));
        } catch {
          // Skip invalid photo refs
        }
      }
    }
  }
  
  return {
    hero: photoUrls[0] ?? null,
    gallery: photoUrls.slice(1),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Function
// ═════════════════════════════════════════════════════════════════════════════

export async function getPlaceCanonical(
  slug: string,
  cityId: string
): Promise<PlaceCanonical | null> {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. Fetch place with all required relations
  // ───────────────────────────────────────────────────────────────────────────
  const place = await db.places.findFirst({
    where: {
      slug,
      cityId, // City-gated (e.g., LA only)
    },
    include: {
      // Map appearances (published maps only)
      map_places: {
        include: {
          lists: {
            where: {
              status: 'PUBLISHED',
            },
            select: {
              id: true,
              title: true,
              slug: true,
              coverImageUrl: true,
              users: {
                select: {
                  name: true,
                  email: true,
                },
              },
              _count: {
                select: { map_places: true },
              },
            },
          },
        },
      },

      // Restaurant group
      restaurant_groups: {
        select: {
          name: true,
          slug: true,
        },
      },

      // Coverage (approved only, ordered by date)
      coverages: {
        where: {
          status: 'APPROVED',
        },
        include: {
          source: true,
        },
        orderBy: {
          publishedAt: 'desc',
        },
      },
    },
  });

  if (!place) {
    return null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Process map appearances
  // ───────────────────────────────────────────────────────────────────────────
  const appearsOn = place.map_places
    .filter((mp) => mp.lists !== null) // Published maps only
    .map((mp) => ({
      id: mp.lists!.id,
      title: mp.lists!.title,
      slug: mp.lists!.slug,
      coverImageUrl: mp.lists!.coverImageUrl,
      creatorName:
        mp.lists!.users?.name ||
        mp.lists!.users?.email?.split('@')[0] ||
        'Unknown',
      placeCount: (mp.lists as any)._count?.map_places ?? 0,
    }));

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Extract curator note (first non-empty descriptor from published maps)
  // ───────────────────────────────────────────────────────────────────────────
  const curatorMapPlace = place.map_places
    .filter((mp) => mp.lists !== null && mp.descriptor?.trim())
    .sort((a, b) => {
      // Sort by order_index if available
      return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
    })[0];

  const curatorNote = curatorMapPlace
    ? {
        note: curatorMapPlace.descriptor!.trim(),
        creatorName:
          curatorMapPlace.lists?.users?.name ||
          curatorMapPlace.lists?.users?.email?.split('@')[0] ||
          'Unknown',
        mapTitle: curatorMapPlace.lists!.title,
        mapSlug: curatorMapPlace.lists!.slug,
      }
    : null;

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Format coverages
  // ───────────────────────────────────────────────────────────────────────────
  const coverages = place.coverages.map((coverage) => ({
    url: coverage.url,
    title: coverage.title,
    publication: coverage.source.name,
    excerpt: coverage.excerpt,
    quote: coverage.quote,
    publishedAt: coverage.publishedAt?.toISOString().split('T')[0] ?? null,
    trustLevel: 'editorial' as const,
  }));

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Format Saiko Summary
  // ───────────────────────────────────────────────────────────────────────────
  const saikoSummary = place.saikoSummary
    ? {
        content: place.saikoSummary,
        generatedAt: place.saikoSummaryGeneratedAt?.toISOString() ?? '',
        modelVersion: place.saikoSummaryModelVersion ?? 'unknown',
        sourceCount: place.saikoSummaryCoverageIds?.length ?? 0,
      }
    : null;

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Format Pull Quote
  // ───────────────────────────────────────────────────────────────────────────
  const pullQuote = place.pullQuote
    ? {
        quote: place.pullQuote,
        author: place.pullQuoteAuthor,
        source: place.pullQuoteSource ?? 'Unknown',
        url: place.pullQuoteUrl,
      }
    : null;

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Parse hours and calculate freshness
  // ───────────────────────────────────────────────────────────────────────────
  const hours = parseHours(place.hours);
  const hoursFreshness = getHoursFreshness(place.placesDataCachedAt);

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Get photos
  // ───────────────────────────────────────────────────────────────────────────
  const photos = getPhotoUrls(place.googlePhotos);

  // ───────────────────────────────────────────────────────────────────────────
  // 9. Filter Google attributes
  // ───────────────────────────────────────────────────────────────────────────
  const googlePlacesAttributes = place.googlePlacesAttributes ?? null;
  const attributes = filterGoogleAttributes(googlePlacesAttributes);

  // ───────────────────────────────────────────────────────────────────────────
  // 10. Parse chef recommendations
  // ───────────────────────────────────────────────────────────────────────────
  const chefRecs = parseChefRecs(place.chefRecs);

  // ───────────────────────────────────────────────────────────────────────────
  // 11. Assemble final response
  // ───────────────────────────────────────────────────────────────────────────
  return {
    // Identity & Basic Info
    id: place.id,
    slug: place.slug,
    name: place.name,
    status: place.status,

    // Location & Geography
    address: place.address,
    latitude: place.latitude ? Number(place.latitude) : null,
    longitude: place.longitude ? Number(place.longitude) : null,
    neighborhood: place.neighborhoodOverride ?? place.neighborhood,
    city: place.city,

    // Tier 0 Actions (NEW: menuUrl, winelistUrl, aboutUrl)
    menuUrl: place.menuUrl,
    winelistUrl: place.winelistUrl,
    reservationUrl: place.reservationUrl,

    // Contact & Secondary Actions
    phone: place.phone,
    instagram: place.instagram?.replace('@', ''), // Strip @ if present
    aboutUrl: place.aboutUrl,
    website: place.website,

    // Hours & Availability
    hours,
    hoursFreshness,

    // Trust Layer
    saikoSummary,
    pullQuote,
    coverages,
    curatorNote,

    // Identity Signals
    cuisine: {
      primary: place.cuisinePrimary,
      secondary: place.cuisineSecondary ?? [],
    },
    priceLevel: place.priceLevel,
    intentProfile: place.intentProfile,
    vibeTags: place.vibeTags?.slice(0, 4) ?? [], // Max 4 for display

    // Attributes
    attributes,

    // Media
    photos,

    // Tips & Recommendations
    tips: place.tips ?? [],
    chefRecs,

    // Tagline
    tagline: place.tagline,

    // Restaurant Group
    restaurantGroup: place.restaurant_groups
      ? {
          name: place.restaurant_groups.name,
          slug: place.restaurant_groups.slug,
        }
      : null,

    // Map Appearances
    appearsOn,
  };
}
