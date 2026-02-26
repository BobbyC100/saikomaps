/**
 * PRL Materializer v1 — DB-backed PlaceForPRL fetcher
 * Single source of truth for PRL computation. Used by API + cron evaluator.
 * Read-only. Deterministic.
 *
 * Resilient: if optional tables (place_photo_eval, energy_scores, place_tag_scores)
 * do not exist, falls back to minimal query using only core tables + vibeTags bridge.
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
  vibeTags: true,
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
  const place = await db.places.findUnique({
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
      vibeTags: true,
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
        orderBy: { computed_at: 'desc' },
        take: 1,
        select: { energy_score: true },
      },
    },
  });

  if (!place) return null;

  const mapPlacesPublished = await db.map_places.count({
    where: {
      placeId: place.id,
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
    place.energy_scores[0]?.energy_score != null
      ? place.energy_scores[0].energy_score
      : null;

  const hasTagScores = place._count.place_tag_scores > 0;
  const hasLegacyVibeTags = (place.vibeTags?.length ?? 0) > 0;
  const hasTagSignals = hasTagScores || hasLegacyVibeTags; // v1 bridge

  const editorialArr = place.editorialSources as unknown[] | null;
  const hasEditorialSources = (editorialArr?.length ?? 0) > 0;
  const hasPullQuote = !!(place.pullQuote?.trim());
  const hasPullQuoteSource = !!(place.pullQuoteSource?.trim());
  const hasCoverageSource =
    hasEditorialSources || hasPullQuote || hasPullQuoteSource;

  let fieldsMembershipCount = 0;
  const gpid = place.googlePlaceId;
  if (gpid) {
    const gr = await db.golden_records.findFirst({
      where: { google_place_id: gpid },
      select: { canonical_id: true },
    });
    if (gr) {
      fieldsMembershipCount = await db.fieldsMembership.count({
        where: { entityId: gr.canonical_id, removedAt: null },
      });
    }
  }

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
    hasIdentitySignals: false,
    hasTemporalSignals: false,
    fieldsMembershipCount,
    appearsOnCount: mapPlacesPublished,
    hasCoverageSource,
    prlOverride: place.prlOverride,
  };

  return result;
}

/** Minimal fetch when optional tables (place_photo_eval, etc.) are missing. Uses vibeTags bridge. */
async function fetchPlaceForPRLBySlugMinimal(
  slug: string
): Promise<(PlaceForPRL & { prlOverride: number | null }) | null> {
  const place = await db.places.findUnique({
    where: { slug },
    select: MINIMAL_PLACE_SELECT,
  });
  if (!place) return null;

  let mapPlacesPublished = 0;
  let curatorNote: string | null = null;
  let fieldsMembershipCount = 0;

  try {
    mapPlacesPublished = await db.map_places.count({
      where: { placeId: place.id, lists: { status: 'PUBLISHED' } },
    });
  } catch {
    /* map_places may not exist */
  }
  try {
    curatorNote = await getCuratorNoteForPlace(place.id);
  } catch {
    /* skip */
  }
  const gpid = place.googlePlaceId;
  if (gpid) {
    try {
      const gr = await db.golden_records.findFirst({
        where: { google_place_id: gpid },
        select: { canonical_id: true },
      });
      if (gr) {
        fieldsMembershipCount = await db.fieldsMembership.count({
          where: { entityId: gr.canonical_id, removedAt: null },
        });
      }
    } catch {
      /* golden_records / FieldsMembership may not exist */
    }
  }

  const categoryDisplay =
    place.category ?? (place.category_rel?.slug as string | null) ?? null;
  const googlePhotosArr = place.googlePhotos as unknown[] | null;
  const googlePhotosCount = Array.isArray(googlePhotosArr) ? googlePhotosArr.length : 0;
  const hasLegacyVibeTags = (place.vibeTags?.length ?? 0) > 0;
  const editorialArr = place.editorialSources as unknown[] | null;
  const hasEditorialSources = (editorialArr?.length ?? 0) > 0;
  const hasPullQuote = !!(place.pullQuote?.trim());
  const hasPullQuoteSource = !!(place.pullQuoteSource?.trim());
  const hasCoverageSource = hasEditorialSources || hasPullQuote || hasPullQuoteSource;
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
    hasTagSignals: hasLegacyVibeTags, // v1 bridge: vibeTags only when optional tables missing
    hasFormality: false,
    hasIdentitySignals: false,
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
      placeId,
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

  const places = await db.places.findMany({
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
      vibeTags: true,
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
        orderBy: { computed_at: 'desc' },
        take: 1,
        select: { energy_score: true },
      },
    },
  });

  const placeIds = places.map((p) => p.id);

  const gpids = places.map((p) => p.googlePlaceId).filter(Boolean) as string[];

  const [mapCounts, goldenRecs] = await Promise.all([
    db.map_places.groupBy({
      by: ['placeId'],
      where: {
        placeId: { in: placeIds },
        lists: { status: 'PUBLISHED' },
      },
      _count: { id: true },
    }),
    gpids.length > 0
      ? db.golden_records.findMany({
          where: { google_place_id: { in: gpids } },
          select: { google_place_id: true, canonical_id: true },
        })
      : Promise.resolve([]),
  ]);

  const mapCountByPlace = new Map(
    mapCounts.map((m) => [m.placeId, m._count.id])
  );
  const canonicalIdByGpid = new Map(
    goldenRecs.map((g) => [g.google_place_id, g.canonical_id])
  );

  const curatorNotes = await Promise.all(
    placeIds.map((id) => getCuratorNoteForPlace(id))
  );
  const curatorNoteByPlace = new Map(
    placeIds.map((id, i) => [id, curatorNotes[i]])
  );

  const canonicalIds = [...new Set(goldenRecs.map((g) => g.canonical_id))];
  const fieldsCountByCid = new Map<string, number>();
  if (canonicalIds.length > 0) {
    const counts = await db.fieldsMembership.groupBy({
      by: ['entityId'],
      where: { entityId: { in: canonicalIds }, removedAt: null },
      _count: { id: true },
    });
    for (const c of counts) {
      fieldsCountByCid.set(c.entityId, c._count.id);
    }
  }

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
      place.energy_scores[0]?.energy_score != null
        ? place.energy_scores[0].energy_score
        : null;

    const hasTagScores = place._count.place_tag_scores > 0;
    const hasLegacyVibeTags = (place.vibeTags?.length ?? 0) > 0;
    const hasTagSignals = hasTagScores || hasLegacyVibeTags; // v1 bridge

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
      hasIdentitySignals: false,
      hasTemporalSignals: false,
      fieldsMembershipCount:
        fieldsCountByCid.get(
          canonicalIdByGpid.get(place.googlePlaceId ?? '') ?? ''
        ) ?? 0,
      appearsOnCount: mapCountByPlace.get(place.id) ?? 0,
      hasCoverageSource,
      slug: place.slug,
      prlOverride: place.prlOverride,
    };
  });
}

/** Minimal batch when optional tables are missing. Uses vibeTags bridge only. */
async function fetchPlaceForPRLBatchMinimal(args?: {
  limit?: number;
  laOnly?: boolean;
}): Promise<(PlaceForPRL & { slug: string; prlOverride: number | null })[]> {
  const { limit = 500, laOnly = false } = args ?? {};

  const places = await db.places.findMany({
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
  const gpids = places.map((p) => p.googlePlaceId).filter(Boolean) as string[];

  let mapCountByPlace = new Map<string, number>();
  let canonicalIdByGpid = new Map<string, string>();
  let fieldsCountByCid = new Map<string, number>();
  const curatorNoteByPlace = new Map<string, string | null>();

  try {
    const [mapCounts, goldenRecs] = await Promise.all([
      db.map_places.groupBy({
        by: ['placeId'],
        where: { placeId: { in: placeIds }, lists: { status: 'PUBLISHED' } },
        _count: { id: true },
      }),
      gpids.length > 0
        ? db.golden_records.findMany({
            where: { google_place_id: { in: gpids } },
            select: { google_place_id: true, canonical_id: true },
          })
        : Promise.resolve([]),
    ]);
    mapCountByPlace = new Map(mapCounts.map((m) => [m.placeId, m._count.id]));
    const grMap = new Map<string, string>();
    for (const g of goldenRecs) {
      if (g.google_place_id && g.canonical_id) {
        grMap.set(g.google_place_id, g.canonical_id);
      }
    }
    canonicalIdByGpid = grMap;

    const canonicalIds = [...new Set(goldenRecs.map((g) => g.canonical_id))];
    if (canonicalIds.length > 0) {
      try {
        const counts = await db.fieldsMembership.groupBy({
          by: ['entityId'],
          where: { entityId: { in: canonicalIds }, removedAt: null },
          _count: { id: true },
        });
        for (const c of counts) {
          fieldsCountByCid.set(c.entityId, c._count.id);
        }
      } catch {
        /* FieldsMembership may not exist */
      }
    }

    const notes = await Promise.all(
      placeIds.map((id) =>
        getCuratorNoteForPlace(id).catch(() => null)
      )
    );
    placeIds.forEach((id, i) => curatorNoteByPlace.set(id, notes[i]));
  } catch {
    /* map_places / golden_records may not exist */
  }

  return places.map((place) => {
    const googlePhotosArr = place.googlePhotos as unknown[] | null;
    const googlePhotosCount = Array.isArray(googlePhotosArr)
      ? googlePhotosArr.length
      : 0;
    const hasLegacyVibeTags = (place.vibeTags?.length ?? 0) > 0;
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
      hasTagSignals: hasLegacyVibeTags, // v1 bridge
      hasFormality: false,
      hasIdentitySignals: false,
      hasTemporalSignals: false,
      fieldsMembershipCount:
        fieldsCountByCid.get(
          canonicalIdByGpid.get(place.googlePlaceId ?? '') ?? ''
        ) ?? 0,
      appearsOnCount: mapCountByPlace.get(place.id) ?? 0,
      hasCoverageSource,
      slug: place.slug,
      prlOverride: place.prlOverride,
    };
  });
}
