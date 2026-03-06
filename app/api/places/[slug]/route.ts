/**
 * API Route: Place Details by Slug
 * GET /api/places/[slug]
 * Returns canonical PlacePageData — shape is locked by lib/contracts/place-page.ts.
 * Drift is caught by tests/contracts/place-page.contract.test.ts.
 *
 * Fields v2 read strategy (dual-read transition):
 *   Primary:  entities (slug/id/status) + canonical_entity_state (all data fields)
 *             + derived_signals (offeringSignals) + interpretation_cache (tagline/pullQuote)
 *   Fallback: legacy entities columns + golden_records (while canonical_state is being populated)
 *   The fallback is removed once slim-entities migration runs.
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
import type { PlacePageData, PlacePageLocation } from '@/lib/contracts/place-page';

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

    // --- Fields v2: routing shell lookup ---
    const entity = await db.entities.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        primary_vertical: true,
        businessStatus: true,
        // Legacy data columns (present until slim-entities migration runs)
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        phone: true,
        website: true,
        instagram: true,
        description: true,
        category: true,
        neighborhood: true,
        cuisineType: true,
        priceLevel: true,
        googlePhotos: true,
        hours: true,
        googlePlaceId: true,
        tips: true,
        tagline: true,
        pullQuote: true,
        pullQuoteSource: true,
        pullQuoteAuthor: true,
        pullQuoteUrl: true,
        reservationUrl: true,
        googlePlacesAttributes: true,
        // Enrichment (legacy)
        merchant_signals: {
          select: { menu_url: true, winelist_url: true },
        },
        // Fields v2: canonical state (1:1)
        canonical_state: {
          select: {
            name: true,
            google_place_id: true,
            latitude: true,
            longitude: true,
            address: true,
            neighborhood: true,
            phone: true,
            website: true,
            instagram: true,
            hours_json: true,
            price_level: true,
            reservation_url: true,
            menu_url: true,
            winelist_url: true,
            description: true,
            cuisine_type: true,
            category: true,
            tips: true,
            google_photos: true,
            google_places_attributes: true,
          },
        },
        // Relations (unchanged)
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
                  select: { name: true, email: true },
                },
              },
            },
          },
        },
        category_rel: { select: { slug: true } },
      },
    });

    if (!entity) {
      const headers = jsonHeaders(bypassCache ? { 'X-Cache-Bypass': '1' } : {}, bypassCache);
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404, headers }
      );
    }

    // Fields v2 dual-read: prefer canonical_state, fall back to legacy entity columns
    const cs = entity.canonical_state;
    const place = {
      id: entity.id,
      slug: entity.slug,
      primary_vertical: entity.primary_vertical,
      businessStatus: cs ? null : (entity as { businessStatus?: string | null }).businessStatus,
      // Data fields: canonical_state primary, legacy fallback
      name: cs?.name ?? (entity as { name?: string }).name ?? '',
      address: cs?.address ?? (entity as { address?: string | null }).address ?? null,
      latitude: cs?.latitude ?? (entity as { latitude?: { toString(): string } | null }).latitude ?? null,
      longitude: cs?.longitude ?? (entity as { longitude?: { toString(): string } | null }).longitude ?? null,
      phone: cs?.phone ?? (entity as { phone?: string | null }).phone ?? null,
      website: cs?.website ?? (entity as { website?: string | null }).website ?? null,
      instagram: cs?.instagram ?? (entity as { instagram?: string | null }).instagram ?? null,
      description: cs?.description ?? (entity as { description?: string | null }).description ?? null,
      category: cs?.category ?? (entity as { category?: string | null }).category ?? null,
      neighborhood: cs?.neighborhood ?? (entity as { neighborhood?: string | null }).neighborhood ?? null,
      cuisineType: cs?.cuisine_type ?? (entity as { cuisineType?: string | null }).cuisineType ?? null,
      priceLevel: cs?.price_level ?? (entity as { priceLevel?: number | null }).priceLevel ?? null,
      googlePhotos: cs?.google_photos ?? (entity as { googlePhotos?: unknown }).googlePhotos ?? null,
      hours: cs?.hours_json ?? (entity as { hours?: unknown }).hours ?? null,
      googlePlaceId: cs?.google_place_id ?? (entity as { googlePlaceId?: string | null }).googlePlaceId ?? null,
      tips: cs?.tips ?? (entity as { tips?: string[] }).tips ?? [],
      googlePlacesAttributes: cs?.google_places_attributes ?? (entity as { googlePlacesAttributes?: unknown }).googlePlacesAttributes ?? null,
      reservationUrl: cs?.reservation_url ?? (entity as { reservationUrl?: string | null }).reservationUrl ?? null,
      // Merchant signals: canonical_state primary, then legacy merchant_signals, then null
      menuUrl: cs?.menu_url ?? (entity as { merchant_signals?: { menu_url: string | null } | null }).merchant_signals?.menu_url ?? null,
      winelistUrl: cs?.winelist_url ?? (entity as { merchant_signals?: { winelist_url: string | null } | null }).merchant_signals?.winelist_url ?? null,
      // map_places / category_rel unchanged
      map_places: entity.map_places,
      category_rel: entity.category_rel,
    };

    // Business status: from entity routing shell (Fields v2) or legacy column
    const businessStatus = (entity as { businessStatus?: string | null }).businessStatus ?? null;
    if (businessStatus === 'CLOSED_PERMANENTLY') {
      const headers = jsonHeaders(bypassCache ? { 'X-Cache-Bypass': '1' } : {}, bypassCache);
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404, headers }
      );
    }

    // Fetch interpretation_cache for tagline + pull quote (Fields v2 path)
    const [taglineCache, pullQuoteCache] = await Promise.all([
      db.interpretation_cache.findFirst({
        where: { entity_id: entity.id, output_type: 'TAGLINE', is_current: true },
        select: { content: true },
        orderBy: { generated_at: 'desc' },
      }),
      db.interpretation_cache.findFirst({
        where: { entity_id: entity.id, output_type: 'PULL_QUOTE', is_current: true },
        select: { content: true },
        orderBy: { generated_at: 'desc' },
      }),
    ]);

    const taglineContent = taglineCache?.content as { text?: string } | null;
    const pullQuoteContent = pullQuoteCache?.content as {
      text?: string; author?: string; source_name?: string; source_url?: string;
    } | null;

    // Resolved tagline: interpretation_cache primary, legacy entity column fallback
    const tagline = taglineContent?.text ?? (entity as { tagline?: string | null }).tagline ?? null;
    // Resolved pull quote: interpretation_cache primary, legacy entity column fallback
    const pullQuote = pullQuoteContent?.text ?? (entity as { pullQuote?: string | null }).pullQuote ?? null;
    const pullQuoteAuthor = pullQuoteContent?.author ?? (entity as { pullQuoteAuthor?: string | null }).pullQuoteAuthor ?? null;
    const pullQuoteSource = pullQuoteContent?.source_name ?? (entity as { pullQuoteSource?: string | null }).pullQuoteSource ?? null;
    const pullQuoteUrl = pullQuoteContent?.source_url ?? (entity as { pullQuoteUrl?: string | null }).pullQuoteUrl ?? null;

    // Fetch offering signals from derived_signals (Fields v2 path)
    const derivedOfferingSignals = await db.derived_signals.findMany({
      where: {
        entity_id: entity.id,
        signal_key: {
          in: ['cuisine_posture', 'service_model', 'price_tier', 'wine_program_intent'],
        },
        // Get the latest version for each key
      },
      orderBy: { computed_at: 'desc' },
      select: { signal_key: true, signal_value: true },
    });

    const derivedSignalMap = new Map(
      derivedOfferingSignals.map(s => [s.signal_key, s.signal_value])
    );

    // Get photo URLs: sort by quality (largest area first), take top 6
    const photoUrls: string[] = [];
    if (place.googlePhotos && Array.isArray(place.googlePhotos as unknown[])) {
      const photosWithArea = (place.googlePhotos as unknown[])
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

    // Run overlay fetch, place counts, and coverage sources in parallel
    // Fields v2: golden_records lookup is retained as a fallback while canonical_state is being populated
    const [activeOverlays, placeCounts, goldenRecord, coverageSources] = await Promise.all([
      getActiveOverlays({ placeId: entity.id, now: new Date() }).catch((err) => {
        console.error(`[Newsletter Overlay] Failed to fetch overlays for place ${entity.slug}:`, err);
        return [] as Awaited<ReturnType<typeof getActiveOverlays>>;
      }),
      mapIds.length > 0
        ? db.map_places.groupBy({
            by: ['mapId'],
            where: { mapId: { in: mapIds } },
            _count: { id: true },
          })
        : Promise.resolve([]),
      // Fallback golden_records read — only needed while canonical_state is not yet populated
      // TODO: remove after populate-canonical-state.ts has run and slim-entities migration applied
      !cs && place.googlePlaceId
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
              hours_json: true,
              menu_url: true,
              winelist_url: true,
              description: true,
            },
          })
        : Promise.resolve(null),
      db.coverage_sources.findMany({
        where: { entityId: entity.id },
        select: { source_name: true, url: true, excerpt: true, published_at: true },
        orderBy: { created_at: 'asc' },
      }).catch(() => [] as { source_name: string; url: string; excerpt: string | null; published_at: Date | null }[]),
    ]);

    // Hours: canonical_state already resolved above; golden_records fallback only when no canonical_state
    if (hours === null && goldenRecord?.hours_json) {
      try {
        hours =
          typeof goldenRecord.hours_json === 'string'
            ? JSON.parse(goldenRecord.hours_json)
            : (goldenRecord.hours_json as Record<string, string>);
      } catch {
        hours = null;
      }
    }

    // Menu + wine list: already resolved in dual-read above; apply golden fallback if still null
    const menuUrl: string | null = place.menuUrl ?? goldenRecord?.menu_url ?? null;
    const winelistUrl: string | null = place.winelistUrl ?? goldenRecord?.winelist_url ?? null;

    // Google attrs: canonical_state primary, golden fallback
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
      console.log(`[Newsletter Overlay] Place ${entity.slug} has ${activeOverlays.length} active overlay(s):`, {
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

    // Fields v2: identity_signals from derived_signals primary, golden_records fallback
    const identitySignalsDerived = derivedSignalMap.get('identity_signals') as {
      place_personality?: string;
      language_signals?: string[];
      signature_dishes?: string[];
    } | null | undefined;
    const identitySignalsFallback = goldenRecord?.identity_signals as {
      place_personality?: string;
      language_signals?: string[];
      signature_dishes?: string[];
    } | null;
    const identitySignals = identitySignalsDerived ?? identitySignalsFallback ?? null;

    const scenesenseResult = placeForPRL
      ? assembleSceneSenseFromMaterialized({
          placeForPRL,
          neighborhood: place.neighborhood,
          category: place.category ?? place.category_rel?.slug ?? null,
          identitySignals: identitySignals
            ? {
                place_personality:
                  (derivedSignalMap.get('place_personality') as string | null) ??
                  (goldenRecord?.place_personality ?? identitySignals.place_personality ?? null),
                language_signals: identitySignals.language_signals ?? [],
                signature_dishes: identitySignals.signature_dishes ?? [],
              }
            : null,
        })
      : { prl: 1 as const, mode: 'LITE' as const, scenesense: null, prlResult: null as never };

    // Offering signals: derived_signals primary, golden_records fallback, googleAttrs for booleans
    const offeringSignals: {
      servesBeer: boolean | null;
      servesWine: boolean | null;
      servesVegetarianFood: boolean | null;
      servesLunch: boolean | null;
      servesDinner: boolean | null;
      servesCocktails: boolean | null;
      cuisinePosture: string | null;
      serviceModel: string | null;
      priceTier: string | null;
      wineProgramIntent: string | null;
    } = {
      servesBeer: typeof googleAttrs?.serves_beer === 'boolean' ? googleAttrs.serves_beer : null,
      servesWine: typeof googleAttrs?.serves_wine === 'boolean' ? googleAttrs.serves_wine : null,
      servesVegetarianFood: typeof googleAttrs?.serves_vegetarian_food === 'boolean' ? googleAttrs.serves_vegetarian_food : null,
      servesLunch: typeof googleAttrs?.serves_lunch === 'boolean' ? googleAttrs.serves_lunch : null,
      servesDinner: typeof googleAttrs?.serves_dinner === 'boolean' ? googleAttrs.serves_dinner : null,
      servesCocktails: typeof googleAttrs?.serves_cocktails === 'boolean' ? googleAttrs.serves_cocktails : null,
      cuisinePosture: (derivedSignalMap.get('cuisine_posture') as string | null) ?? (goldenRecord as Record<string, unknown> | null)?.cuisine_posture as string ?? null,
      serviceModel: (derivedSignalMap.get('service_model') as string | null) ?? (goldenRecord as Record<string, unknown> | null)?.service_model as string ?? null,
      priceTier: (derivedSignalMap.get('price_tier') as string | null) ?? (goldenRecord as Record<string, unknown> | null)?.price_tier as string ?? null,
      wineProgramIntent: (derivedSignalMap.get('wine_program_intent') as string | null) ?? (goldenRecord as Record<string, unknown> | null)?.wine_program_intent as string ?? null,
    };

    const location: PlacePageLocation = {
      // Identity
      id: entity.id,
      slug: entity.slug,
      name: place.name,
      primaryVertical: entity.primary_vertical ?? null,
      category: VERTICAL_DISPLAY[entity.primary_vertical] ?? place.category ?? null,
      neighborhood: place.neighborhood ?? null,
      address: place.address ?? null,
      latitude: place.latitude ? Number(place.latitude) : null,
      longitude: place.longitude ? Number(place.longitude) : null,
      phone: place.phone ?? null,
      website: place.website ?? null,
      instagram: place.instagram ?? null,
      // Facts
      hours: hours ?? null,
      priceLevel: place.priceLevel ?? null,
      businessStatus: businessStatus ?? null,
      cuisineType: place.cuisineType ?? null,
      googlePlaceId: place.googlePlaceId ?? null,
      reservationUrl: place.reservationUrl ?? null,
      menuUrl,
      winelistUrl,
      // Editorial — Fields v2: interpretation_cache primary, legacy fallback
      description: place.description ?? goldenRecord?.description ?? null,
      tagline: tagline ?? null,
      pullQuote: pullQuote ?? null,
      pullQuoteAuthor: pullQuoteAuthor ?? null,
      pullQuoteSource: pullQuoteSource ?? null,
      pullQuoteUrl: pullQuoteUrl ?? null,
      tips: place.tips ?? [],
      curatorNote: curatorNote ?? null,
      curatorCreatorName: curatorCreatorName ?? null,
      // Media
      photoUrl: photoUrls[0] ?? null,
      photoUrls,
      // SceneSense
      prl: scenesenseResult.prl,
      scenesense: scenesenseResult.scenesense ?? null,
      // Offering
      offeringSignals,
      // Coverage
      coverageSources: coverageSources.map((src) => ({
        sourceName: src.source_name,
        url: src.url,
        excerpt: src.excerpt ?? null,
        publishedAt: src.published_at ? src.published_at.toISOString() : null,
      })),
      // Appearances
      appearancesAsSubject: [],
      appearancesAsHost: [],
    };

    const responseData: PlacePageData = {
      location,
      guide: appearsOn[0]
        ? {
            id: appearsOn[0].id,
            title: appearsOn[0].title,
            slug: appearsOn[0].slug,
            creatorName: appearsOn[0].creatorName ?? 'Unknown',
          }
        : null,
      appearsOn,
      isOwner: false,
    };

    // suppress unused — service facts are computed but not in the place page contract
    void facts;
    void conflicts;

    return NextResponse.json(
      { success: true, data: responseData },
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
