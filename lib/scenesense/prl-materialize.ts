/**
 * PRL Materializer v1 — DB-backed PlaceForPRL fetcher
 * Single source of truth for PRL computation. Used by API + cron evaluator.
 * Read-only. Deterministic.
 *
 * Resilient: if optional tables (place_photo_eval, energy_scores, place_tag_scores)
 * do not exist, falls back to minimal query using only core tables.
 * Identity signals (language_signals): sourced from derived_signals (Fields v2 path).
 * FieldsMembership FKs to entities.id directly.
 */

import { db } from '@/lib/db';
import type { PlaceForPRL } from './prl';

function isMissingTableError(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  return (
    err?.code === 'P2021' ||
    (typeof err?.message === 'string' && /does not exist|relation/.test(err.message))
  );
}

/** Minimal select: no place_photo_eval, energy_scores, place_tag_scores (avoids P2021 when tables missing) */
const MINIMAL_PLACE_SELECT = {
  id: true,
  slug: true,
  googlePlaceId: true,
  name: true,
  address: true,
  latitude: true,
  longitude: true,
  category: true,
  category_rel: { select: { slug: true } },
  hours: true,
  description: true,
  editorialSources: true,
  pullQuote: true,
  pullQuoteSource: true,
  googlePhotos: true,
  googlePlacesAttributes: true,
  prlOverride: true,
} as const;

/** Fetch a fully-populated PlaceForPRL by slug, or null if not found. Falls back to minimal on missing tables. */
export async function fetchPlaceForPRLBySlug(
  slug: string
): Promise<(PlaceForPRL & { prlOverride: number | null }) | null> {
  try {
    return await fetchPlaceForPRLBySlugFull(slug);
  } catch (e) {
    if (isMissingTableError(e)) {
      return fetchPlaceForPRLBySlugMinimal(slug);
    }
    throw e;
  }
}

async function fetchPlaceForPRLBySlugFull(
  slug: string
): Promise<(PlaceForPRL & { prlOverride: number | null }) | null> {
  const place = await db.entities.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      googlePlaceId: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      category: true,
      category_rel: { select: { slug: true } },
      hours: true,
      description: true,
      editorialSources: true,
      pullQuote: true,
      pullQuoteSource: true,
      tagline: true,
      tips: true,
      googlePhotos: true,
      status: true,
      prlOverride: true,
      googlePlacesAttributes: true,
      _count: {
        select: {
          place_photo_eval: true,
          energy_scores: true,
          place_tag_scores: true,
          map_places: true,
        },
      },
      place_photo_eval: {
        select: { tier: true, type: true },
      },
      energy_scores: {
        orderBy: { computedAt: 'desc' },
        take: 1,
        select: { energyScore: true },
      },
    },
  });

  if (!place) return null;

  const mapPlacesPublished = await db.map_places.count({
    where: {
      entityId: place.id,
      lists: { status: 'PUBLISHED' },
    },
  });

  const curatorNote = await getCuratorNoteForPlace(place.id);

  const categoryDisplay =
    place.category ?? (place.category_rel?.slug as string | null) ?? null;

  const googlePhotosArr = place.googlePhotos as unknown[] | null;
  const googlePhotosCount = Array.isArray(googlePhotosArr)
    ? googlePhotosArr.length
    : 0;

  const heroApproved = place.place_photo_eval.some((e) => e.tier === 'HERO');
  const hasInteriorOrContextApproved = place.place_photo_eval.some(
    (e) =>
      (e.tier === 'HERO' || e.tier === 'GALLERY') &&
      (e.type === 'INTERIOR' || e.type === 'CONTEXT')
  );

  const energyScore =
    place.energy_scores[0]?.energyScore != null
      ? place.energy_scores[0].energyScore
      : null;

  const hasTagScores = place._count.place_tag_scores > 0;

  const editorialArr = place.editorialSources as unknown[] | null;
  const hasEditorialSources = (editorialArr?.length ?? 0) > 0;
  const hasPullQuote = !!(place.pullQuote?.trim());
  const hasPullQuoteSource = !!(place.pullQuoteSource?.trim());
  // Also check the coverage_sources relational table (the current editorial system)
  const coverageSourcesCount = await db.coverage_sources.count({
    where: { entityId: place.id },
  });
  const hasCoverageSource =
    hasEditorialSources || hasPullQuote || hasPullQuoteSource || coverageSourcesCount > 0;

  let fieldsMembershipCount = 0;
  let hasLanguageSignals = false;

  // Primary: derived_signals (Fields v2 path) for language_signals detection
  const derivedIdentity = await db.derived_signals.findFirst({
    where: { entityId: place.id, signalKey: 'identity_signals' },
    orderBy: { computedAt: 'desc' },
    select: { signalValue: true },
  });
  if (derivedIdentity) {
    const sig = derivedIdentity.signalValue as Record<string, unknown> | null;
    hasLanguageSignals = Array.isArray(sig?.language_signals) && (sig!.language_signals as string[]).length > 0;
  }

  // FieldsMembership now FKs to entities.id directly — no golden_records lookup needed.
  fieldsMembershipCount = await db.fieldsMembership.count({
    where: { entityId: place.id, removedAt: null },
  });

  // derived_signals is the sole source for identity signals (golden_records dropped)

  const hasTagSignals = hasTagScores || hasLanguageSignals;

  const businessStatus =
    (place.googlePlacesAttributes as Record<string, string> | null)
      ?.business_status ?? 'OPERATIONAL';

  const result: PlaceForPRL & { prlOverride: number | null } = {
    name: place.name,
    category: categoryDisplay,
    address_street: place.address,
    lat:
      place.latitude != null ? Number(place.latitude) : null,
    lng:
      place.longitude != null ? Number(place.longitude) : null,
    lifecycle_status: 'ACTIVE',
    business_status: businessStatus as 'OPERATIONAL' | string,
    hours_json: place.hours,
    googlePhotosCount,
    userPhotosCount: 0,
    heroApproved,
    hasInteriorOrContextApproved,
    curatorPhotoOverride: false,
    description: place.description,
    curatorNote,
    energyScore,
    hasTagSignals,
    hasFormality: false,
    hasIdentitySignals: hasLanguageSignals,
    hasTemporalSignals: false,
    fieldsMembershipCount,
    appearsOnCount: mapPlacesPublished,
    hasCoverageSource,
    prlOverride: place.prlOverride,
  };

  return result;
}

/** Minimal fetch when optional tables (place_photo_eval, etc.) are missing. */
async function fetchPlaceForPRLBySlugMinimal(
  slug: string
): Promise<(PlaceForPRL & { prlOverride: number | null }) | null> {
  const place = await db.entities.findUnique({
    where: { slug },
    select: MINIMAL_PLACE_SELECT,
  });
  if (!place) return null;

  let mapPlacesPublished = 0;
  let curatorNote: string | null = null;
  let fieldsMembershipCount = 0;

  try {
    mapPlacesPublished = await db.map_places.count({
      where: { entityId: place.id, lists: { status: 'PUBLISHED' } },
    });
  } catch {
    /* map_places may not exist */
  }
  try {
    curatorNote = await getCuratorNoteForPlace(place.id);
  } catch {
    /* skip */
  }
  let hasLanguageSignalsMinimal = false;
  try {
    const derivedIdentityMinimal = await db.derived_signals.findFirst({
      where: { entityId: place.id, signalKey: 'identity_signals' },
      orderBy: { computedAt: 'desc' },
      select: { signalValue: true },
    });
    if (derivedIdentityMinimal) {
      const sig = derivedIdentityMinimal.signalValue as Record<string, unknown> | null;
      hasLanguageSignalsMinimal = Array.isArray(sig?.language_signals) && (sig!.language_signals as string[]).length > 0;
    }

    // FieldsMembership now FKs to entities.id — query directly, no golden_records needed.
    fieldsMembershipCount = await db.fieldsMembership.count({
      where: { entityId: place.id, removedAt: null },
    });

  } catch {
    /* derived_signals or FieldsMembership may not exist */
  }

  const categoryDisplay =
    place.category ?? (place.category_rel?.slug as string | null) ?? null;
  const googlePhotosArr = place.googlePhotos as unknown[] | null;
  const googlePhotosCount = Array.isArray(googlePhotosArr) ? googlePhotosArr.length : 0;
  const editorialArr = place.editorialSources as unknown[] | null;
  const hasEditorialSources = (editorialArr?.length ?? 0) > 0;
  const hasPullQuote = !!(place.pullQuote?.trim());
  const hasPullQuoteSource = !!(place.pullQuoteSource?.trim());
  let coverageSourcesCountMinimal = 0;
  try {
    coverageSourcesCountMinimal = await db.coverage_sources.count({
      where: { entityId: place.id },
    });
  } catch {
    /* coverage_sources may not exist in minimal mode */
  }
  const hasCoverageSource =
    hasEditorialSources || hasPullQuote || hasPullQuoteSource || coverageSourcesCountMinimal > 0;
  const businessStatus =
    (place.googlePlacesAttributes as Record<string, string> | null)?.business_status ??
    'OPERATIONAL';

  return {
    name: place.name,
    category: categoryDisplay,
    address_street: place.address,
    lat: place.latitude != null ? Number(place.latitude) : null,
    lng: place.longitude != null ? Number(place.longitude) : null,
    lifecycle_status: 'ACTIVE',
    business_status: businessStatus as 'OPERATIONAL' | string,
    hours_json: place.hours,
    googlePhotosCount,
    userPhotosCount: 0,
    heroApproved: false,
    hasInteriorOrContextApproved: false,
    curatorPhotoOverride: false,
    description: place.description,
    curatorNote,
    energyScore: null,
    hasTagSignals: hasLanguageSignalsMinimal,
    hasFormality: false,
    hasIdentitySignals: hasLanguageSignalsMinimal,
    hasTemporalSignals: false,
    fieldsMembershipCount,
    appearsOnCount: mapPlacesPublished,
    hasCoverageSource,
    prlOverride: place.prlOverride,
  };
}

/** Get curator note from first map_place with descriptor for this place */
async function getCuratorNoteForPlace(placeId: string): Promise<string | null> {
  const mp = await db.map_places.findFirst({
    where: {
      entityId: placeId,
      descriptor: { not: null },
      lists: { status: 'PUBLISHED' },
    },
    select: { descriptor: true },
  });
  return mp?.descriptor?.trim() ?? null;
}

/** LA bbox rough (lat, lng) for laOnly filter */
const LA_BBOX = {
  latMin: 33.7,
  latMax: 34.2,
  lngMin: -118.7,
  lngMax: -118.1,
};

/** Fetch batch of PlaceForPRL. Read-only. Falls back to minimal on missing tables. */
export async function fetchPlaceForPRLBatch(args?: {
  limit?: number;
  laOnly?: boolean;
}): Promise<(PlaceForPRL & { slug: string; prlOverride: number | null })[]> {
  try {
    return await fetchPlaceForPRLBatchFull(args);
  } catch (e) {
    if (isMissingTableError(e)) {
      return fetchPlaceForPRLBatchMinimal(args);
    }
    throw e;
  }
}

async function fetchPlaceForPRLBatchFull(args?: {
  limit?: number;
  laOnly?: boolean;
}): Promise<(PlaceForPRL & { slug: string; prlOverride: number | null })[]> {
  const { limit = 500, laOnly = false } = args ?? {};

  const places = await db.entities.findMany({
    where: laOnly
      ? {
          latitude: { gte: LA_BBOX.latMin, lte: LA_BBOX.latMax },
          longitude: { gte: LA_BBOX.lngMin, lte: LA_BBOX.lngMax },
        }
      : undefined,
    take: limit,
    select: {
      id: true,
      slug: true,
      googlePlaceId: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      category: true,
      category_rel: { select: { slug: true } },
      hours: true,
      description: true,
      editorialSources: true,
      pullQuote: true,
      pullQuoteSource: true,
      tagline: true,
      tips: true,
      googlePhotos: true,
      googlePlacesAttributes: true,
      prlOverride: true,
      _count: {
        select: {
          place_photo_eval: true,
          energy_scores: true,
          place_tag_scores: true,
        },
      },
      place_photo_eval: {
        select: { tier: true, type: true },
      },
      energy_scores: {
        orderBy: { computedAt: 'desc' },
        take: 1,
        select: { energyScore: true },
      },
    },
  });

  const placeIds = places.map((p) => p.id);

  // derived_signals for language_signals (Fields v2 path)
  const derivedSignalsBatch = placeIds.length > 0
    ? await db.derived_signals.findMany({
        where: { entityId: { in: placeIds }, signalKey: 'identity_signals' },
        orderBy: { computedAt: 'desc' },
        select: { entityId: true, signalValue: true },
      })
    : [];
  const derivedLanguageByEntityId = new Map<string, boolean>();
  const seenEntityIdsBatch = new Set<string>();
  for (const d of derivedSignalsBatch) {
    if (seenEntityIdsBatch.has(d.entityId)) continue; // first = most recent (ordered desc)
    seenEntityIdsBatch.add(d.entityId);
    const sig = d.signalValue as Record<string, unknown> | null;
    derivedLanguageByEntityId.set(
      d.entityId,
      Array.isArray(sig?.language_signals) && (sig!.language_signals as string[]).length > 0,
    );
  }

  const [mapCounts, fieldsMembershipCounts] = await Promise.all([
    db.map_places.groupBy({
      by: ['entityId'],
      where: {
        entityId: { in: placeIds },
        lists: { status: 'PUBLISHED' },
      },
      _count: { id: true },
    }),
    placeIds.length > 0
      ? db.fieldsMembership.groupBy({
          by: ['entityId'],
          where: { entityId: { in: placeIds }, removedAt: null },
          _count: { id: true },
        })
      : Promise.resolve([]),
  ]);

  const mapCountByPlace = new Map(
    mapCounts.map((m) => [m.entityId, m._count.id])
  );
  const fieldsCountByEntityId = new Map(
    fieldsMembershipCounts.map((c) => [c.entityId, c._count.id])
  );

  const curatorNotes = await Promise.all(
    placeIds.map((id) => getCuratorNoteForPlace(id))
  );
  const curatorNoteByPlace = new Map(
    placeIds.map((id, i) => [id, curatorNotes[i]])
  );

  return places.map((place) => {
    const googlePhotosArr = place.googlePhotos as unknown[] | null;
    const googlePhotosCount = Array.isArray(googlePhotosArr)
      ? googlePhotosArr.length
      : 0;

    const heroApproved = place.place_photo_eval.some((e) => e.tier === 'HERO');
    const hasInteriorOrContextApproved = place.place_photo_eval.some(
      (e) =>
        (e.tier === 'HERO' || e.tier === 'GALLERY') &&
        (e.type === 'INTERIOR' || e.type === 'CONTEXT')
    );

    const energyScore =
      place.energy_scores[0]?.energyScore != null
        ? place.energy_scores[0].energyScore
        : null;

    const hasTagScores = place._count.place_tag_scores > 0;
    const hasLanguageSignalsBatch =
      derivedLanguageByEntityId.get(place.id) ?? false;
    const hasTagSignals = hasTagScores || hasLanguageSignalsBatch;

    const editorialArr = place.editorialSources as unknown[] | null;
    const hasEditorialSources = (editorialArr?.length ?? 0) > 0;
    const hasPullQuote = !!(place.pullQuote?.trim());
    const hasPullQuoteSource = !!(place.pullQuoteSource?.trim());
    const hasCoverageSource =
      hasEditorialSources || hasPullQuote || hasPullQuoteSource;

    const categoryDisplay =
      place.category ?? (place.category_rel?.slug as string | null) ?? null;

    const businessStatus =
      (place.googlePlacesAttributes as Record<string, string> | null)
        ?.business_status ?? 'OPERATIONAL';

    return {
      name: place.name,
      category: categoryDisplay,
      address_street: place.address,
      lat: place.latitude != null ? Number(place.latitude) : null,
      lng: place.longitude != null ? Number(place.longitude) : null,
      lifecycle_status: 'ACTIVE' as const,
      business_status: businessStatus,
      hours_json: place.hours,
      googlePhotosCount,
      userPhotosCount: 0,
      heroApproved,
      hasInteriorOrContextApproved,
      curatorPhotoOverride: false,
      description: place.description,
      curatorNote: curatorNoteByPlace.get(place.id) ?? null,
      energyScore,
      hasTagSignals,
      hasFormality: false,
      hasIdentitySignals: hasLanguageSignalsBatch,
      hasTemporalSignals: false,
      fieldsMembershipCount: fieldsCountByEntityId.get(place.id) ?? 0,
      appearsOnCount: mapCountByPlace.get(place.id) ?? 0,
      hasCoverageSource,
      slug: place.slug,
      prlOverride: place.prlOverride,
    };
  });
}

/** Minimal batch when optional tables are missing. */
async function fetchPlaceForPRLBatchMinimal(args?: {
  limit?: number;
  laOnly?: boolean;
}): Promise<(PlaceForPRL & { slug: string; prlOverride: number | null })[]> {
  const { limit = 500, laOnly = false } = args ?? {};

  const places = await db.entities.findMany({
    where: laOnly
      ? {
          latitude: { gte: LA_BBOX.latMin, lte: LA_BBOX.latMax },
          longitude: { gte: LA_BBOX.lngMin, lte: LA_BBOX.lngMax },
        }
      : undefined,
    take: limit,
    select: { ...MINIMAL_PLACE_SELECT, slug: true },
  });

  const placeIds = places.map((p) => p.id);

  let mapCountByPlace = new Map<string, number>();
  let derivedLangByEntityIdMinimal = new Map<string, boolean>();
  let fieldsCountByEntityIdMinimal = new Map<string, number>();
  const curatorNoteByPlace = new Map<string, string | null>();

  try {
    // Primary: derived_signals for language_signals
    const derivedSignalsMinimal = placeIds.length > 0
      ? await db.derived_signals.findMany({
          where: { entityId: { in: placeIds }, signalKey: 'identity_signals' },
          orderBy: { computedAt: 'desc' },
          select: { entityId: true, signalValue: true },
        })
      : [];
    const seenMinimal = new Set<string>();
    const derivedLangTemp = new Map<string, boolean>();
    for (const d of derivedSignalsMinimal) {
      if (seenMinimal.has(d.entityId)) continue;
      seenMinimal.add(d.entityId);
      const sig = d.signalValue as Record<string, unknown> | null;
      derivedLangTemp.set(
        d.entityId,
        Array.isArray(sig?.language_signals) && (sig!.language_signals as string[]).length > 0,
      );
    }
    derivedLangByEntityIdMinimal = derivedLangTemp;

    const [mapCounts, fieldsCounts] = await Promise.all([
      db.map_places.groupBy({
        by: ['entityId'],
        where: { entityId: { in: placeIds }, lists: { status: 'PUBLISHED' } },
        _count: { id: true },
      }),
      placeIds.length > 0
        ? db.fieldsMembership.groupBy({
            by: ['entityId'],
            where: { entityId: { in: placeIds }, removedAt: null },
            _count: { id: true },
          }).catch(() => [] as { entityId: string; _count: { id: number } }[])
        : Promise.resolve([]),
    ]);
    mapCountByPlace = new Map(mapCounts.map((m) => [m.entityId, m._count.id]));
    fieldsCountByEntityIdMinimal = new Map(fieldsCounts.map((c) => [c.entityId, c._count.id]));

    const notes = await Promise.all(
      placeIds.map((id) =>
        getCuratorNoteForPlace(id).catch(() => null)
      )
    );
    placeIds.forEach((id, i) => curatorNoteByPlace.set(id, notes[i]));
  } catch {
    /* map_places or derived_signals may not exist */
  }

  return places.map((place) => {
    const googlePhotosArr = place.googlePhotos as unknown[] | null;
    const googlePhotosCount = Array.isArray(googlePhotosArr)
      ? googlePhotosArr.length
      : 0;
    const hasLanguageSignalsBatchMinimal =
      derivedLangByEntityIdMinimal.get(place.id) ?? false;
    const editorialArr = place.editorialSources as unknown[] | null;
    const hasEditorialSources = (editorialArr?.length ?? 0) > 0;
    const hasPullQuote = !!(place.pullQuote?.trim());
    const hasPullQuoteSource = !!(place.pullQuoteSource?.trim());
    const hasCoverageSource =
      hasEditorialSources || hasPullQuote || hasPullQuoteSource;
    const categoryDisplay =
      place.category ?? (place.category_rel?.slug as string | null) ?? null;
    const businessStatus =
      (place.googlePlacesAttributes as Record<string, string> | null)
        ?.business_status ?? 'OPERATIONAL';

    return {
      name: place.name,
      category: categoryDisplay,
      address_street: place.address,
      lat: place.latitude != null ? Number(place.latitude) : null,
      lng: place.longitude != null ? Number(place.longitude) : null,
      lifecycle_status: 'ACTIVE' as const,
      business_status: businessStatus,
      hours_json: place.hours,
      googlePhotosCount,
      userPhotosCount: 0,
      heroApproved: false,
      hasInteriorOrContextApproved: false,
      curatorPhotoOverride: false,
      description: place.description,
      curatorNote: curatorNoteByPlace.get(place.id) ?? null,
      energyScore: null,
      hasTagSignals: hasLanguageSignalsBatchMinimal,
      hasFormality: false,
      hasIdentitySignals: hasLanguageSignalsBatchMinimal,
      hasTemporalSignals: false,
      fieldsMembershipCount: fieldsCountByEntityIdMinimal.get(place.id) ?? 0,
      appearsOnCount: mapCountByPlace.get(place.id) ?? 0,
      hasCoverageSource,
      slug: place.slug,
      prlOverride: place.prlOverride,
    };
  });
}
