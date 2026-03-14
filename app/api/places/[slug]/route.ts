/**
 * API Route: Place Details by Slug
 * GET /api/places/[slug]
 * Returns canonical PlacePageData — shape is locked by lib/contracts/place-page.ts.
 * Drift is caught by tests/contracts/place-page.contract.test.ts.
 *
 * Read strategy (temporary — entities-direct):
 *   All data fields read directly from entities table columns (post-26-migration state).
 *   canonical_entity_state, derived_signals, and interpretation_cache are wired in
 *   once those tables are created and populated (add_fields_v2_schema + populate scripts).
 *   golden_records fallback removed — that table is deferred for drop.
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

    // Direct entities query — columns present in DB post-26-migration
    const entity = await db.entities.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        primary_vertical: true,
        businessStatus: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        phone: true,
        website: true,
        instagram: true,
        tiktok: true,
        description: true,
        description_source: true,
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
        merchant_signals: {
          select: { menu_url: true, winelist_url: true, reservation_url: true },
        },
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

    const businessStatus = entity.businessStatus ?? null;
    if (businessStatus === 'CLOSED_PERMANENTLY') {
      const headers = jsonHeaders(bypassCache ? { 'X-Cache-Bypass': '1' } : {}, bypassCache);
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404, headers }
      );
    }

    // Get photo URLs: sort by quality (largest area first), take top 6
    const photoUrls: string[] = [];
    if (entity.googlePhotos && Array.isArray(entity.googlePhotos as unknown[])) {
      const photosWithArea = (entity.googlePhotos as unknown[])
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
    if (entity.hours) {
      try {
        hours =
          typeof entity.hours === 'string'
            ? JSON.parse(entity.hours)
            : (entity.hours as Record<string, string>);
      } catch {
        hours = null;
      }
    }

    // Format appearsOn (only published maps) and curator note from first map with descriptor
    const publishedMapPlaces = entity.map_places.filter((mp) => mp.lists && mp.lists.status === 'PUBLISHED');
    const mapIds = publishedMapPlaces.map(mp => mp.lists!.id);

    const [activeOverlays, placeCounts, coverageSources, identitySignalsRow, offeringProgramsRow] = await Promise.all([
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
      db.coverage_sources.findMany({
        where: { entityId: entity.id },
        select: { source_name: true, url: true, excerpt: true, published_at: true },
        orderBy: { created_at: 'asc' },
      }).catch(() => [] as { source_name: string; url: string; excerpt: string | null; published_at: Date | null }[]),
      db.derived_signals.findFirst({
        where: { entity_id: entity.id, signal_key: 'identity_signals' },
        select: { signal_value: true },
        orderBy: { computed_at: 'desc' },
      }).catch(() => null),
      db.derived_signals.findFirst({
        where: { entity_id: entity.id, signal_key: 'offering_programs' },
        select: { signal_value: true },
        orderBy: { computed_at: 'desc' },
      }).catch(() => null),
    ]);

    // Service facts from google_places_attributes — null until that column is added to entities
    let facts: { service: Partial<Record<string, boolean | null>> };
    let conflicts: { service: Partial<Record<string, { sources: string[]; values: Record<string, boolean> }>> };
    try {
      const out = buildPlaceServiceFacts({
        googleAttrs: undefined,
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

    const countLookup = new Map(
      placeCounts.map(pc => [pc.mapId, pc._count.id])
    );

    const appearsOn = publishedMapPlaces.map((mp) => ({
      id: mp.lists!.id,
      title: mp.lists!.title,
      slug: mp.lists!.slug,
      coverImageUrl: mp.lists!.coverImageUrl,
      creatorName: mp.lists!.users?.name || mp.lists!.users?.email?.split('@')[0] || 'Unknown',
      description: null,
      placeCount: countLookup.get(mp.lists!.id) || 0,
      authorType: (mp.lists!.users?.email?.includes('@saiko.com') ? 'saiko' : 'user') as 'saiko' | 'user',
    }));

    const curatorMapPlace = publishedMapPlaces.find((mp) => mp.descriptor?.trim());
    const curatorNote = curatorMapPlace?.descriptor?.trim() ?? null;
    const curatorCreatorName =
      curatorMapPlace?.lists?.users?.name ||
      curatorMapPlace?.lists?.users?.email?.split('@')[0] ||
      null;

    // Identity signals — extract all fields from derived_signals.identity_signals
    const sv = identitySignalsRow?.signal_value as Record<string, unknown> | null ?? null;
    const placePersonality = (sv?.place_personality as string | null) ?? null;
    const signatureDishes = Array.isArray(sv?.signature_dishes) ? (sv.signature_dishes as string[]) : [];
    const languageSignals = Array.isArray(sv?.language_signals) ? (sv.language_signals as string[]) : [];

    // SceneSense
    const placeForPRL = await fetchPlaceForPRLBySlug(slug);
    const scenesenseResult = placeForPRL
      ? assembleSceneSenseFromMaterialized({
          placeForPRL,
          neighborhood: entity.neighborhood,
          category: entity.category ?? entity.category_rel?.slug ?? null,
          identitySignals: sv ? { place_personality: placePersonality, language_signals: languageSignals, signature_dishes: signatureDishes } : null,
        })
      : { prl: 1 as const, mode: 'LITE' as const, scenesense: null, prlResult: null as never };

    // Offering signals — read from derived_signals.identity_signals when available
    const offeringSignals = {
      servesBeer: null,           // future: google_places_attributes
      servesWine: null,           // future: google_places_attributes
      servesVegetarianFood: null, // future: google_places_attributes
      servesLunch: null,          // future: google_places_attributes
      servesDinner: null,         // future: google_places_attributes
      servesCocktails: null,      // future: google_places_attributes
      cuisinePosture: (sv?.cuisine_posture as string | null) ?? null,
      serviceModel: (sv?.service_model as string | null) ?? null,
      priceTier: (sv?.price_tier as string | null) ?? null,
      wineProgramIntent: (sv?.wine_program_intent as string | null) ?? null,
    };

    const menuUrl: string | null = entity.merchant_signals?.menu_url ?? null;
    const winelistUrl: string | null = entity.merchant_signals?.winelist_url ?? null;
    const reservationUrl: string | null =
      (entity.merchant_signals as { reservation_url?: string } | null)?.reservation_url ??
      entity.reservationUrl ??
      null;

    // Parse offering programs from derived_signals
    const opv = offeringProgramsRow?.signal_value as Record<string, unknown> | null ?? null;
    const PROGRAM_KEYS = [
      'food_program', 'wine_program', 'beer_program', 'cocktail_program',
      'non_alcoholic_program', 'coffee_tea_program', 'service_program',
    ] as const;
    const DEFAULT_PROGRAM = { maturity: 'unknown' as const, signals: [] };
    const offeringPrograms = opv
      ? Object.fromEntries(
          PROGRAM_KEYS.map((k) => {
            const raw = opv[k] as Record<string, unknown> | undefined;
            return [
              k,
              raw
                ? {
                    maturity: (raw.maturity as string) ?? 'unknown',
                    signals: Array.isArray(raw.signals) ? (raw.signals as string[]) : [],
                  }
                : DEFAULT_PROGRAM,
            ];
          })
        )
      : null;

    const location: PlacePageLocation = {
      id: entity.id,
      slug: entity.slug,
      name: entity.name,
      primaryVertical: entity.primary_vertical ?? null,
      category: VERTICAL_DISPLAY[entity.primary_vertical] ?? entity.category ?? null,
      neighborhood: entity.neighborhood ?? null,
      address: entity.address ?? null,
      latitude: entity.latitude ? Number(entity.latitude) : null,
      longitude: entity.longitude ? Number(entity.longitude) : null,
      phone: entity.phone ?? null,
      website: entity.website ?? null,
      instagram: entity.instagram ?? null,
      tiktok: entity.tiktok ?? null,
      hours: hours ?? null,
      priceLevel: entity.priceLevel ?? null,
      businessStatus: businessStatus ?? null,
      cuisineType: entity.cuisineType ?? null,
      googlePlaceId: entity.googlePlaceId ?? null,
      reservationUrl,
      menuUrl,
      winelistUrl,
      description: entity.description ?? null,
      descriptionSource: entity.description_source ?? null,
      tagline: entity.tagline ?? null,
      pullQuote: entity.pullQuote ?? null,
      pullQuoteAuthor: entity.pullQuoteAuthor ?? null,
      pullQuoteSource: entity.pullQuoteSource ?? null,
      pullQuoteUrl: entity.pullQuoteUrl ?? null,
      tips: entity.tips ?? [],
      curatorNote: curatorNote ?? null,
      curatorCreatorName: curatorCreatorName ?? null,
      photoUrl: photoUrls[0] ?? null,
      photoUrls,
      prl: scenesenseResult.prl,
      scenesense: scenesenseResult.scenesense ?? null,
      offeringSignals,
      offeringPrograms: offeringPrograms as PlacePageLocation['offeringPrograms'],
      placePersonality,
      signatureDishes,
      coverageSources: coverageSources.map((src) => ({
        sourceName: src.source_name,
        url: src.url,
        excerpt: src.excerpt ?? null,
        publishedAt: src.published_at ? src.published_at.toISOString() : null,
      })),
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
