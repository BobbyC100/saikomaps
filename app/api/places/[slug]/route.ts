/**
 * API Route: Place Details by Slug
 * GET /api/places/[slug]
 * Returns canonical PlacePageData — shape is locked by lib/contracts/place-page.ts.
 * Drift is caught by tests/contracts/place-page.contract.test.ts.
 *
 * Read strategy (hybrid — entities + evidence layer):
 *   Identity/operational fields read from entities table columns (post-26-migration state).
 *   derived_signals wired for identity_signals + offering_programs.
 *   interpretation_cache wired for tagline + pull_quote (ERA Stage 7 output) + timefold,
 *     with entities columns as fallback for non-enriched places.
 *   canonical_entity_state reads pending — next phase of Fields v2 cutover.
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
import type { PlacePageData, PlacePageLocation, PlacePageCoverageHighlights } from '@/lib/contracts/place-page';
import { materializeCoverageEvidence } from '@/lib/coverage/normalize-evidence';

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
        primaryVertical: true,
        thematicTags: true,
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
        descriptionSource: true,
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
          select: { menuUrl: true, winelistUrl: true, reservationUrl: true },
        },
        reservation_provider_matches: {
          where: { isRenderable: true },
          select: { provider: true, bookingUrl: true, confidenceLevel: true },
          take: 1,
          orderBy: { matchScore: 'desc' },
        },
        canonical_state: {
          select: {
            eventsUrl: true,
            cateringUrl: true,
            eventInquiryEmail: true,
            eventInquiryFormUrl: true,
          },
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

    // Get photo URLs: prioritize Instagram media (if EAT/HOSPITALITY), fall back to Google Photos
    let photoUrls: string[] = [];

    // Try Instagram media first for EAT and HOSPITALITY verticals
    const instagramEligibleVerticals = ['EAT', 'HOSPITALITY'];
    if (instagramEligibleVerticals.includes(entity.primaryVertical || '')) {
      try {
        // First, check if entity has an instagram_accounts record
        const instagramAccount = await db.instagram_accounts.findFirst({
          where: { entityId: entity.id },
          select: { id: true, instagramUserId: true, username: true },
        });

        if (instagramAccount) {
          // First try to get 6 classified photos (best 6 curated by vision model)
          const classifiedMedia = await db.instagram_media.findMany({
            where: {
              instagramUserId: instagramAccount.instagramUserId,
              photoType: { isNot: null }, // Only photos that have been classified
            },
            select: {
              mediaUrl: true,
            },
            take: 6,
            orderBy: {
              classifiedAt: 'desc',
            },
          });

          if (classifiedMedia.length > 0) {
            photoUrls = classifiedMedia
              .filter((m) => m.mediaUrl)
              .map((m) => m.mediaUrl as string);
          } else {
            // Fall back to 12 most recent media if none are classified yet
            const recentMedia = await db.instagram_media.findMany({
              where: {
                instagramUserId: instagramAccount.instagramUserId,
                mediaType: 'IMAGE', // Only images, not videos
              },
              select: {
                mediaUrl: true,
              },
              take: 6,
              orderBy: {
                timestamp: 'desc',
              },
            });

            if (recentMedia.length > 0) {
              photoUrls = recentMedia
                .filter((m) => m.mediaUrl)
                .map((m) => m.mediaUrl as string);
            }
          }
        }
      } catch (err) {
        // Log error and fall through to Google Photos if Instagram query fails
        console.error(`[places API] Instagram media query failed for ${entity.slug}:`, err instanceof Error ? err.message : err);
        if (process.env.DEBUG_INSTAGRAM === '1') {
          console.error(`[places API] Full error:`, err);
        }
      }
    }

    // Fall back to Google Photos if no Instagram media found
    if (photoUrls.length === 0 && entity.googlePhotos && Array.isArray(entity.googlePhotos as unknown[])) {
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

    const [activeOverlays, placeCounts, coverageSources, identitySignalsRow, offeringProgramsRow, taglineRow, pullQuoteRow, voiceDescriptorRow, timefoldRow] = await Promise.all([
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
        : Promise.resolve([] as any),
      db.coverage_sources.findMany({
        where: { entityId: entity.id, isAlive: true },
        select: {
          publicationName: true,
          url: true,
          articleTitle: true,
          publishedAt: true,
          enrichmentStage: true,
          extractions: {
            where: { isCurrent: true },
            select: { pullQuotes: true, accolades: true },
            take: 1,
          },
        },
        orderBy: { createdAt: 'asc' },
      }).catch(() => [] as any[]),
      db.derived_signals.findFirst({
        where: { entityId: entity.id, signalKey: 'identity_signals' },
        select: { signalValue: true },
        orderBy: { computedAt: 'desc' },
      }).catch(() => null),
      db.derived_signals.findFirst({
        where: { entityId: entity.id, signalKey: 'offering_programs' },
        select: { signalValue: true },
        orderBy: { computedAt: 'desc' },
      }).catch(() => null),
      // Tagline from interpretation_cache (ERA Stage 7 output)
      db.interpretation_cache.findFirst({
        where: { entityId: entity.id, outputType: 'TAGLINE', isCurrent: true },
        select: { content: true },
        orderBy: { generatedAt: 'desc' },
      }).catch(() => null),
      // Pull quote from interpretation_cache
      db.interpretation_cache.findFirst({
        where: { entityId: entity.id, outputType: 'PULL_QUOTE', isCurrent: true },
        select: { content: true },
        orderBy: { generatedAt: 'desc' },
      }).catch(() => null),
      // VOICE_DESCRIPTOR from interpretation_cache (About description, Tiers 2-3)
      db.interpretation_cache.findFirst({
        where: { entityId: entity.id, outputType: 'VOICE_DESCRIPTOR', isCurrent: true },
        select: { content: true, promptVersion: true },
        orderBy: { generatedAt: 'desc' },
      }).catch(() => null),
      // TIMEFOLD from interpretation_cache (temporal signal: STABILITY / NEWNESS)
      db.interpretation_cache.findFirst({
        where: { entityId: entity.id, outputType: 'TIMEFOLD', isCurrent: true },
        select: { content: true },
        orderBy: { generatedAt: 'desc' },
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
      placeCount: (countLookup.get(mp.lists!.id) ?? 0) as number,
      authorType: (mp.lists!.users?.email?.includes('@saiko.com') ? 'saiko' : 'user') as 'saiko' | 'user',
    }));

    const curatorMapPlace = publishedMapPlaces.find((mp) => mp.descriptor?.trim());
    const curatorNote = curatorMapPlace?.descriptor?.trim() ?? null;
    const curatorCreatorName =
      curatorMapPlace?.lists?.users?.name ||
      curatorMapPlace?.lists?.users?.email?.split('@')[0] ||
      null;

    // Identity signals — extract all fields from derived_signals.identity_signals
    const sv = identitySignalsRow?.signalValue as Record<string, unknown> | null ?? null;
    const placePersonality = (sv?.place_personality as string | null) ?? null;
    const signatureDishes = Array.isArray(sv?.signature_dishes) ? (sv.signature_dishes as string[]) : [];
    const languageSignals = Array.isArray(sv?.language_signals) ? (sv.language_signals as string[]) : [];
    const keyProducers = Array.isArray(sv?.key_producers) ? (sv.key_producers as string[]) : [];
    const originStoryType = (sv?.origin_story_type as string | null) ?? null;

    // SceneSense
    const placeForPRL = await fetchPlaceForPRLBySlug(slug);
    const scenesenseResult = placeForPRL
      ? assembleSceneSenseFromMaterialized({
          placeForPRL,
          neighborhood: entity.neighborhood,
          category: entity.category ?? (entity as any).category_rel?.slug ?? null,
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

    const menuUrl: string | null = entity.merchant_signals?.menuUrl ?? null;
    const winelistUrl: string | null = entity.merchant_signals?.winelistUrl ?? null;

    // Reservation: prefer validated provider match, fall back to merchant_signals, then entities.
    // Render policy: don't over-gate. If a URL exists, render. Validation upgrades the label, not the gate.
    const providerMatch = entity.reservation_provider_matches?.[0] ?? null;
    const reservationUrl: string | null =
      providerMatch?.bookingUrl ??
      (entity.merchant_signals as { reservationUrl?: string } | null)?.reservationUrl ??
      entity.reservationUrl ??
      null;

    // Provider tier policy:
    // Tier 1 (resy, opentable, tock, sevenrooms) → "Reserve on [Provider]"
    // Tier 2 (yelp, toast, anything else) → generic "Reserve"
    const TIER_1 = new Set(['resy', 'opentable', 'tock', 'sevenrooms']);
    const BUTTON_LABELS: Record<string, string> = {
      resy: 'Reserve on Resy',
      opentable: 'Reserve on OpenTable',
      tock: 'Reserve on Tock',
      sevenrooms: 'Reserve on SevenRooms',
    };
    const provider = providerMatch?.provider ?? null;
    const reservationProvider: string | null = provider;
    const reservationProviderLabel: string | null =
      provider && TIER_1.has(provider) ? (BUTTON_LABELS[provider] ?? null) : null;

    // Parse offering programs from derived_signals
    const opv = offeringProgramsRow?.signalValue as Record<string, unknown> | null ?? null;
    const PROGRAM_KEYS = [
      'food_program', 'wine_program', 'beer_program', 'cocktail_program',
      'non_alcoholic_program', 'coffee_tea_program', 'service_program',
      'private_dining_program', 'group_dining_program', 'catering_program',
      'dumpling_program', 'sushi_raw_fish_program', 'ramen_noodle_program', 'taco_program', 'pizza_program',
    ] as const;
    const DEFAULT_PROGRAM = { programClass: 'food' as const, maturity: 'unknown' as const, signals: [] };
    const offeringPrograms = opv
      ? Object.fromEntries(
          PROGRAM_KEYS.map((k) => {
            const raw = opv[k] as Record<string, unknown> | undefined;
            return [
              k,
              raw
                ? {
                    programClass: (raw.program_class as string) ?? 'food',
                    maturity: (raw.maturity as string) ?? 'unknown',
                    signals: Array.isArray(raw.signals) ? (raw.signals as string[]) : [],
                  }
                : DEFAULT_PROGRAM,
            ];
          })
        )
      : null;

    // --- Parks-specific data ---
    let parkAmenities: string[] = [];
    let parkFacilities: { id: string; name: string; slug: string; category: string | null }[] = [];
    let parentPark: { id: string; name: string; slug: string } | null = null;

    if (entity.primaryVertical === 'PARKS') {
      // Amenities from thematicTags (written by matching pass)
      parkAmenities = (entity.thematicTags ?? []).filter(Boolean) as string[];

      // Child facilities (if this is a parent park)
      try {
        const childRels = await db.parkFacilityRelationship.findMany({
          where: { parentEntityId: entity.id, relationshipType: 'CONTAINS' },
          include: { childEntity: { select: { id: true, name: true, slug: true, category: true } } },
        });
        parkFacilities = childRels.map((r) => ({
          id: r.childEntity.id,
          name: r.childEntity.name,
          slug: r.childEntity.slug,
          category: r.childEntity.category,
        }));
      } catch {
        // Table may not exist yet — graceful fallback
      }

      // Parent park (if this is a facility)
      try {
        const parentRel = await db.parkFacilityRelationship.findFirst({
          where: { childEntityId: entity.id, relationshipType: 'CONTAINS' },
          include: { parentEntity: { select: { id: true, name: true, slug: true } } },
        });
        if (parentRel) {
          parentPark = {
            id: parentRel.parentEntity.id,
            name: parentRel.parentEntity.name,
            slug: parentRel.parentEntity.slug,
          };
        }
      } catch {
        // Table may not exist yet — graceful fallback
      }
    }

    const location: PlacePageLocation = {
      id: entity.id,
      slug: entity.slug,
      name: entity.name,
      primaryVertical: entity.primaryVertical ?? null,
      category: VERTICAL_DISPLAY[entity.primaryVertical] ?? entity.category ?? (entity as any).category_rel?.slug ?? null,
      neighborhood: entity.neighborhood ?? null,
      address: entity.address ?? null,
      latitude: entity.latitude ? Number(entity.latitude) : null,
      longitude: entity.longitude ? Number(entity.longitude) : null,
      phone: entity.phone && entity.phone.toUpperCase() !== 'NONE' ? entity.phone : null,
      website: entity.website ?? null,
      instagram: entity.instagram ?? null,
      tiktok: entity.tiktok ?? null,
      hours: hours ?? null,
      priceLevel: entity.priceLevel ?? null,
      businessStatus: businessStatus ?? null,
      cuisineType: entity.cuisineType ?? null,
      googlePlaceId: entity.googlePlaceId ?? null,
      reservationUrl,
      reservationProvider,
      reservationProviderLabel,
      menuUrl,
      winelistUrl,
      // Description: VOICE_DESCRIPTOR (interpretation_cache) → entities.description fallback
      description: (() => {
        const vd = voiceDescriptorRow?.content as { text?: string } | null;
        return vd?.text ?? entity.description ?? null;
      })(),
      descriptionSource: (() => {
        if (voiceDescriptorRow?.promptVersion) return voiceDescriptorRow.promptVersion;
        return entity.descriptionSource ?? null;
      })(),
      // Tagline: interpretation_cache (ERA) → entities fallback
      tagline: (() => {
        const tc = taglineRow?.content as { text?: string } | null;
        return tc?.text ?? entity.tagline ?? null;
      })(),
      // Pull quote: interpretation_cache → entities fallback
      pullQuote: (() => {
        const pq = pullQuoteRow?.content as { text?: string; author?: string; source_name?: string; source_url?: string } | null;
        return pq?.text ?? entity.pullQuote ?? null;
      })(),
      pullQuoteAuthor: (() => {
        const pq = pullQuoteRow?.content as { author?: string } | null;
        return pq?.author ?? entity.pullQuoteAuthor ?? null;
      })(),
      pullQuoteSource: (() => {
        const pq = pullQuoteRow?.content as { source_name?: string } | null;
        return pq?.source_name ?? entity.pullQuoteSource ?? null;
      })(),
      pullQuoteUrl: (() => {
        const pq = pullQuoteRow?.content as { source_url?: string } | null;
        return pq?.source_url ?? entity.pullQuoteUrl ?? null;
      })(),
      tips: entity.tips ?? [],
      curatorNote: curatorNote ?? null,
      curatorCreatorName: curatorCreatorName ?? null,
      photoUrl: photoUrls[0] ?? null,
      photoUrls,
      prl: scenesenseResult.prl,
      scenesense: scenesenseResult.scenesense ?? null,
      // TimeFOLD: only surface if editorial gate has approved
      timefold: (() => {
        const tf = timefoldRow?.content as { class?: string; phrase?: string; approved_by?: string | null } | null;
        if (!tf?.class || !tf?.phrase) return null;
        return {
          class: tf.class as 'STABILITY' | 'NEWNESS',
          phrase: tf.phrase,
          approvedBy: tf.approved_by ?? null,
        };
      })(),
      offeringSignals,
      offeringPrograms: offeringPrograms as unknown as PlacePageLocation['offeringPrograms'],
      eventsUrl: entity.canonical_state?.eventsUrl ?? null,
      cateringUrl: entity.canonical_state?.cateringUrl ?? null,
      eventInquiryEmail: entity.canonical_state?.eventInquiryEmail ?? null,
      eventInquiryFormUrl: entity.canonical_state?.eventInquiryFormUrl ?? null,
      placePersonality,
      signatureDishes,
      keyProducers,
      originStoryType,
      coverageSources: coverageSources.map((src: any) => {
        // Extract first pull quote excerpt from extractions if available
        const extraction = src.extractions?.[0];
        const pullQuotes = extraction?.pullQuotes as { text: string; context?: string }[] | null;
        const excerpt = pullQuotes?.[0]?.text ?? null;
        return {
          sourceName: src.publicationName,
          url: src.url,
          excerpt,
          publishedAt: src.publishedAt ? src.publishedAt.toISOString() : null,
        };
      }),
      coverageHighlights: await (async (): Promise<PlacePageCoverageHighlights | null> => {
        try {
          const evidence = await materializeCoverageEvidence(entity.id);
          if (!evidence) return null;
          return {
            sourceCount: evidence.sourceCount,
            tier1Count: evidence.provenance.tier1Sources,
            tier2Count: evidence.provenance.tier2Sources,
            people: evidence.facts.people
              .filter((p) => p.stalenessBand === 'current' || p.stalenessBand === 'aging')
              .slice(0, 5)
              .map((p) => ({ name: p.name, role: p.role })),
            accolades: evidence.facts.accolades
              .slice(0, 5)
              .map((a) => ({ name: a.name, year: a.year, type: a.type })),
            dishes: evidence.facts.dishes.slice(0, 6).map((d) => d.text),
            originStory: evidence.facts.originStoryFacts
              ? {
                  foundingYear: evidence.facts.originStoryFacts.foundingYear
                    ? parseInt(evidence.facts.originStoryFacts.foundingYear, 10) || null
                    : null,
                  founderNames: evidence.facts.originStoryFacts.founderNames,
                  geographicOrigin: evidence.facts.originStoryFacts.geographicOrigin,
                }
              : null,
          };
        } catch {
          // Non-fatal: coverage highlights are supplementary
          return null;
        }
      })(),
      // Parks-specific
      amenities: parkAmenities.length > 0 ? parkAmenities : undefined,
      parkFacilities: parkFacilities.length > 0 ? parkFacilities : undefined,
      parentPark: parentPark ?? undefined,
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
