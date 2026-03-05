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
import { VERTICAL_DISPLAY } from '@/lib/primaryVertical';
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

    const place = await db.entities.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        phone: true,
        website: true,
        instagram: true,
        description: true,
        category: true,
        primary_vertical: true,
        neighborhood: true,
        cuisineType: true,
        priceLevel: true,
        googlePhotos: true,
        hours: true,
        googlePlaceId: true,
        editorialSources: true,
        tips: true,
        tagline: true,
        pullQuote: true,
        pullQuoteSource: true,
        pullQuoteAuthor: true,
        pullQuoteUrl: true,
        pullQuoteType: true,
        transitAccessible: true,
        thematicTags: true,
        contextualConnection: true,
        curatorAttribution: true,
        intentProfile: true,
        intentProfileOverride: true,
        reservationUrl: true,
        entityType: true,
        marketSchedule: true,
        businessStatus: true,
        googlePlacesAttributes: true,
        // Relations
        map_places: {
          select: {
            descriptor: true,
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
        category_rel: {
          select: {
            slug: true,
          },
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

    // Get photo URLs: sort by quality (largest area first), take top 6
    const photoUrls: string[] = [];
    if (place.googlePhotos && Array.isArray(place.googlePhotos)) {
      const photosWithArea = place.googlePhotos
        .map((p) => {
          const obj = p as { width?: number; height?: number; photo_reference?: string; photoReference?: string; name?: string };
          const w = typeof obj.width === 'number' ? obj.width : 0;
          const h = typeof obj.height === 'number' ? obj.height : 0;
          return { raw: obj, area: w * h, hasSize: w > 0 && h > 0 };
        })
        .sort((a, b) => {
          if (a.hasSize !== b.hasSize) return a.hasSize ? -1 : 1;
          return b.area - a.area;
        });

      for (const { raw } of photosWithArea.slice(0, 6)) {
        const ref = getPhotoRefFromStored(raw);
        if (ref) {
          try {
            photoUrls.push(getGooglePhotoUrl(ref, 400));
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
    const [activeOverlays, placeCounts, goldenRecord, coverageSources] = await Promise.all([
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
              cuisine_posture: true,
              service_model: true,
              price_tier: true,
              wine_program_intent: true,
            },
          })
        : Promise.resolve(null),
      db.coverage_sources.findMany({
        where: { entityId: place.id },
        select: { source_name: true, url: true, excerpt: true, published_at: true },
        orderBy: { created_at: 'asc' },
      }).catch(() => [] as { source_name: string; url: string; excerpt: string | null; published_at: Date | null }[]),
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
          neighborhood: place.neighborhood,
          category: place.category ?? place.category_rel?.slug ?? null,
          identitySignals: identitySignals
            ? {
                place_personality:
                  goldenRecord?.place_personality ?? identitySignals.place_personality ?? null,
                vibe_words: identitySignals.vibe_words ?? [],
                signature_dishes: identitySignals.signature_dishes ?? [],
              }
            : null,
        })
      : { prl: 1 as const, mode: 'LITE' as const, scenesense: null, prlResult: null as never };

    // Offering signals: extract drink/service booleans from googleAttrs for frontend
    const offeringSignals: {
      servesBeer: boolean | null;
      servesWine: boolean | null;
      servesVegetarianFood: boolean | null;
      cuisinePosture: string | null;
      serviceModel: string | null;
      priceTier: string | null;
      wineProgramIntent: string | null;
    } = {
      servesBeer: typeof googleAttrs?.serves_beer === 'boolean' ? googleAttrs.serves_beer : null,
      servesWine: typeof googleAttrs?.serves_wine === 'boolean' ? googleAttrs.serves_wine : null,
      servesVegetarianFood: typeof googleAttrs?.serves_vegetarian_food === 'boolean' ? googleAttrs.serves_vegetarian_food : null,
      cuisinePosture: (goldenRecord as Record<string, unknown> | null)?.cuisine_posture as string ?? null,
      serviceModel: (goldenRecord as Record<string, unknown> | null)?.service_model as string ?? null,
      priceTier: (goldenRecord as Record<string, unknown> | null)?.price_tier as string ?? null,
      wineProgramIntent: (goldenRecord as Record<string, unknown> | null)?.wine_program_intent as string ?? null,
    };

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
          category: VERTICAL_DISPLAY[place.primary_vertical] ?? place.category,
          neighborhood: place.neighborhood,
          cuisineType: place.cuisineType,
          priceLevel: place.priceLevel,
          photoUrl: photoUrls[0] ?? null,
          photoUrls,
          hours,
          googlePlaceId: place.googlePlaceId,
          curatorNote,
          curatorCreatorName,
          sources: place.editorialSources || [],
          vibeWords: identitySignals?.vibe_words ?? [],
          prl: scenesenseResult.prl,
          scenesense: scenesenseResult.scenesense,
          tips: place.tips ?? [],
          tagline: place.tagline,
          pullQuote: place.pullQuote,
          pullQuoteSource: place.pullQuoteSource,
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
          primaryVertical: place.primary_vertical,
          offeringSignals,
          // Primary operator (PlaceActorRelationship)
          primaryOperator: null,
          // Markets fields
          placeType: place.entityType,
          categorySlug: place.category_rel?.slug ?? (typeof place.category === "string" ? place.category : null),
          marketSchedule: place.marketSchedule ?? null,
          coverageSources: coverageSources.map((cs) => ({
            sourceName: cs.source_name,
            url: cs.url,
            excerpt: cs.excerpt ?? null,
            publishedAt: cs.published_at ? cs.published_at.toISOString() : null,
          })),
          // Appearances (Where to find / Currently hosting)
          appearancesAsSubject: [],
          appearancesAsHost: [],
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
        energyScore: null,
        placeTagScores: null,
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
