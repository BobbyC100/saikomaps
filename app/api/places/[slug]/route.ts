/**
 * API Route: Place Details by Slug
 * GET /api/places/[slug]
 * Returns canonical Place data + maps that include this place (published only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getGooglePhotoUrl, getPhotoRefFromStored } from '@/lib/google-places';
import { getActiveOverlays } from '@/lib/overlays/getActiveOverlays';
import { buildPlaceServiceFacts } from '@/lib/place-payload';
import {
  fetchPlaceForPRLBySlug,
  assembleSceneSenseFromMaterialized,
} from '@/lib/scenesense';

const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  process.env.GIT_SHA ||
  process.env.BUILD_ID ||
  process.env.NEXT_PUBLIC_BUILD_ID ||
  'local-dev';
const ENV = process.env.VERCEL_ENV || process.env.NODE_ENV || 'local';

function jsonHeaders(extra: Record<string, string> = {}, bypassCache = false): Record<string, string> {
  const base: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Build-Id': BUILD_ID,
    'X-Env': ENV,
    'X-Server-Time': new Date().toISOString(),
    ...extra,
  };
  if (bypassCache || process.env.NODE_ENV === 'development') {
    base['Cache-Control'] = 'no-store, no-cache, must-revalidate';
    base['Pragma'] = 'no-cache';
    base['Expires'] = '0';
  }
  return base;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const bypassCache = request.nextUrl.searchParams.get('__nocache') === '1';

  try {
    const { slug } = await params;

    if (process.env.DEBUG_HEADERS === '1') {
      console.log('[places API]', { slug, buildId: BUILD_ID, env: ENV, bypassCache });
    }

    if (!slug) {
      const headers = jsonHeaders(bypassCache ? { 'X-Cache-Bypass': '1' } : {}, bypassCache);
      return NextResponse.json(
        { error: 'Place slug is required' },
        { status: 400, headers }
      );
    }

    const place = await db.places.findUnique({
      where: { slug },
      include: {
        map_places: {
          include: {
            lists: {
              select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                published: true,
                coverImageUrl: true,
                users: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        restaurant_groups: {
          select: {
            name: true,
            slug: true,
          },
        },
        category_rel: {
          select: {
            slug: true,
          },
        },
        energy_scores: {
          where: { version: 'energy_v1' },
          take: 1,
        },
        place_tag_scores: {
          where: {
            version: 'tags_v1',
            depends_on_energy_version: 'energy_v1',
          },
          take: 1,
        },
      },
    });

    if (!place) {
      const headers = jsonHeaders(bypassCache ? { 'X-Cache-Bypass': '1' } : {}, bypassCache);
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404, headers }
      );
    }

    if ((place as { businessStatus?: string | null }).businessStatus === 'CLOSED_PERMANENTLY') {
      const headers = jsonHeaders(bypassCache ? { 'X-Cache-Bypass': '1' } : {}, bypassCache);
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404, headers }
      );
    }

    // Get photo URLs (up to 10 for merchant page: 1 hero + up to 9 gallery)
    const photoUrls: string[] = [];
    if (place.googlePhotos && Array.isArray(place.googlePhotos)) {
      for (let i = 0; i < Math.min(10, place.googlePhotos.length); i++) {
        const ref = getPhotoRefFromStored(place.googlePhotos[i] as { photo_reference?: string; photoReference?: string; name?: string });
        if (ref) {
          try {
            photoUrls.push(getGooglePhotoUrl(ref, i === 0 ? 800 : 400));
          } catch {
            // skip
          }
        }
      }
    }

    // Parse hours
    let hours: Record<string, string> | null = null;
    if (place.hours) {
      try {
        hours =
          typeof place.hours === 'string'
            ? JSON.parse(place.hours)
            : (place.hours as Record<string, string>);
      } catch {
        hours = null;
      }
    }

    // Format appearsOn (only published maps) and curator note from first map with descriptor
    const publishedMapPlaces = place.map_places.filter((mp) => mp.lists && mp.lists.status === 'PUBLISHED');
    const mapIds = publishedMapPlaces.map(mp => mp.lists!.id);

    // Run overlay fetch, place counts, and golden_record (for service facts) in parallel
    const [activeOverlays, placeCounts, goldenRecord] = await Promise.all([
      getActiveOverlays({ placeId: place.id, now: new Date() }).catch((err) => {
        console.error(`[Newsletter Overlay] Failed to fetch overlays for place ${place.slug}:`, err);
        return [] as Awaited<ReturnType<typeof getActiveOverlays>>;
      }),
      mapIds.length > 0
        ? db.map_places.groupBy({
            by: ['mapId'],
            where: { mapId: { in: mapIds } },
            _count: { id: true },
          })
        : Promise.resolve([]),
      place.googlePlaceId
        ? db.golden_records.findFirst({
            where: { google_place_id: place.googlePlaceId },
            select: {
              google_places_attributes: true,
              identity_signals: true,
              place_personality: true,
              vibe_tags: true,
            },
          })
        : Promise.resolve(null),
    ]);

    // VALADATA: canonical service facts (takeout, delivery, dine_in, reservable, curbside_pickup)
    // googleAttrs: places.googlePlacesAttributes first; golden fallback only when place attrs null/empty
    const googleAttrs =
      (place.googlePlacesAttributes as Record<string, unknown> | null) ??
      (goldenRecord?.google_places_attributes as Record<string, unknown> | null) ??
      null;
    let facts: { service: Partial<Record<string, boolean | null>> };
    let conflicts: { service: Partial<Record<string, { sources: string[]; values: Record<string, boolean> }>> };
    try {
      const out = buildPlaceServiceFacts({
        googleAttrs: googleAttrs ?? undefined,
        scrapeAttrs: null,
        manualOverrides: null,
      });
      facts = out.facts;
      conflicts = out.conflicts;
    } catch {
      facts = { service: {} };
      conflicts = { service: {} };
    }

    if (activeOverlays.length > 0) {
      console.log(`[Newsletter Overlay] Place ${place.slug} has ${activeOverlays.length} active overlay(s):`, {
        overlays: activeOverlays.map((o) => ({
          type: o.overlayType,
          startsAt: o.startsAt,
          endsAt: o.endsAt,
          sourceSignalId: o.sourceSignalId,
        })),
      });
    }
    
    // Create lookup map for counts
    const countLookup = new Map(
      placeCounts.map(pc => [pc.mapId, pc._count.id])
    );
    
    const appearsOn = publishedMapPlaces.map((mp) => ({
      id: mp.lists!.id,
      title: mp.lists!.title,
      slug: mp.lists!.slug,
      coverImageUrl: mp.lists!.coverImageUrl,
      creatorName: mp.lists!.users?.name || mp.lists!.users?.email?.split('@')[0] || 'Unknown',
      description: null, // TODO: Add description field to lists table
      placeCount: countLookup.get(mp.lists!.id) || 0,
      authorType: (mp.lists!.users?.email?.includes('@saiko.com') ? 'saiko' : 'user') as 'saiko' | 'user',
    }));
    
    const curatorMapPlace = publishedMapPlaces.find((mp) => mp.descriptor?.trim());
    const curatorNote = curatorMapPlace?.descriptor?.trim() ?? null;
    const curatorCreatorName =
      curatorMapPlace?.lists?.users?.name ||
      curatorMapPlace?.lists?.users?.email?.split('@')[0] ||
      null;

    // ============================================================================
    // DEMO DATA INJECTION (for testing layouts)
    // Remove this section when real data is available
    // ============================================================================
    const isDemoPlace = slug === 'seco';
    
    // DEMO: Add cover images for seco's Also On maps
    if (isDemoPlace && appearsOn.length > 0) {
      const dummyImages = [
        'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop', // Restaurant interior
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop', // Restaurant bar
        'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=300&fit=crop', // Food plating
      ];
      
      appearsOn.forEach((map, index) => {
        if (!map.coverImageUrl) {
          map.coverImageUrl = dummyImages[index % dummyImages.length];
        }
      });
    }
    
    let enhancedPhotoUrls = photoUrls;
    let enhancedVibeTags = place.vibeTags || [];
    let enhancedTips = place.tips || [];
    let enhancedPullQuote = place.pullQuote;
    let enhancedPullQuoteSource = place.pullQuoteSource;
    let enhancedCuratorNote = curatorNote;
    
    if (isDemoPlace && photoUrls.length < 2) {
      // Add dummy gallery photos for demo
      enhancedPhotoUrls = [
        photoUrls[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1428515613728-6b4607e44363?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=400&h=400&fit=crop',
      ];
    }
    
    if (isDemoPlace && enhancedVibeTags.length === 0) {
      enhancedVibeTags = ['Date Night', 'Lively', 'Cozy'];
    }

    // SceneSense: PRL + assemble via materializer (single source of truth)
    const placeForPRL = await fetchPlaceForPRLBySlug(slug);
    const identitySignals = goldenRecord?.identity_signals as {
      place_personality?: string;
      vibe_words?: string[];
      signature_dishes?: string[];
    } | null;
    const scenesenseResult = placeForPRL
      ? assembleSceneSenseFromMaterialized({
          placeForPRL,
          vibeTags: isDemoPlace && enhancedVibeTags.length > 0 ? enhancedVibeTags : place.vibeTags,
          neighborhood: place.neighborhood,
          category: place.category ?? place.category_rel?.slug ?? null,
          identitySignals: identitySignals
            ? {
                place_personality:
                  goldenRecord?.place_personality ?? identitySignals.place_personality ?? null,
                vibe_words:
                  identitySignals.vibe_words ??
                  (Array.isArray(goldenRecord?.vibe_tags) ? goldenRecord.vibe_tags : []),
                signature_dishes: identitySignals.signature_dishes ?? [],
              }
            : null,
        })
      : { prl: 1 as const, mode: 'LITE' as const, scenesense: null, prlResult: null as never };
    
    if (isDemoPlace && enhancedTips.length === 0) {
      enhancedTips = [
        'Book 2-3 weeks ahead for prime times',
        'Bar seats available walk-in at 5pm',
        'Ask for wine pairings',
        'Rooftop opens at sunset'
      ];
    }
    
    if (isDemoPlace && !enhancedPullQuote) {
      enhancedPullQuote = "The room has a bubbly energy as it fills up with creative directors who part-time in Lisbon and people who own at least one crystal, but don't expect the same excitement from the snacky menu.";
      enhancedPullQuoteSource = "The Infatuation";
    }
    
    if (isDemoPlace && !enhancedCuratorNote) {
      enhancedCuratorNote = "The best natural wine list on the eastside. Unpretentious and always interesting.";
    }
    // ============================================================================

    return NextResponse.json(
      {
        success: true,
        data: {
        location: {
          id: place.id,
          slug: place.slug,
          name: place.name,
          address: place.address,
          latitude: place.latitude ? Number(place.latitude) : null,
          longitude: place.longitude ? Number(place.longitude) : null,
          phone: place.phone,
          website: place.website,
          instagram: place.instagram,
          description: place.description,
          category: place.category,
          neighborhood: place.neighborhood,
          cuisineType: place.cuisineType,
          priceLevel: place.priceLevel,
          photoUrl: enhancedPhotoUrls[0] ?? null,
          photoUrls: enhancedPhotoUrls,
          hours,
          googlePlaceId: place.googlePlaceId,
          curatorNote: enhancedCuratorNote,
          curatorCreatorName,
          sources: place.editorialSources || [],
          vibeTags: enhancedVibeTags,
          prl: scenesenseResult.prl,
          scenesense: scenesenseResult.scenesense,
          tips: enhancedTips,
          tagline: place.tagline,
          pullQuote: enhancedPullQuote,
          pullQuoteSource: enhancedPullQuoteSource,
          pullQuoteAuthor: place.pullQuoteAuthor,
          pullQuoteUrl: place.pullQuoteUrl,
          pullQuoteType: place.pullQuoteType,
          transitAccessible: place.transitAccessible,
          thematicTags: place.thematicTags ?? [],
          contextualConnection: place.contextualConnection,
          curatorAttribution: place.curatorAttribution,
          // Decision Onset fields
          intentProfile: place.intentProfile,
          intentProfileOverride: place.intentProfileOverride,
          reservationUrl: place.reservationUrl,
          // Restaurant Group
          restaurantGroup: place.restaurant_groups || null,
          // Markets fields
          placeType: place.placeType,
          categorySlug: place.category_rel?.slug ?? (typeof place.category === "string" ? place.category : null),
          marketSchedule: place.marketSchedule ?? null,
        },
        guide: appearsOn[0]
          ? {
              id: appearsOn[0].id,
              title: appearsOn[0].title,
              slug: appearsOn[0].slug,
              creatorName: appearsOn[0].creatorName,
            }
          : null,
        appearsOn,
        isOwner: false,
        facts,
        _conflicts: Object.keys(conflicts.service).length > 0 ? conflicts : undefined,
        energyScore: place.energy_scores[0] ?? null,
        placeTagScores: place.place_tag_scores[0] ?? null,
      },
    },
      {
        headers: jsonHeaders(
          bypassCache
            ? { 'X-Cache-Bypass': '1' }
            : { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
          bypassCache
        ),
      }
    );
  } catch (error) {
    console.error('Error fetching place:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch place',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: jsonHeaders({}, bypassCache) }
    );
  }
}
