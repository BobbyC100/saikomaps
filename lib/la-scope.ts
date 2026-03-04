/**
 * LA-only scoping: resolve place IDs / canonical IDs from v_places_la_bbox_golden.
 * Use when scripts need to restrict to LA County places with golden_record linkage.
 *
 * Standard LA bbox (matches v_places_la_bbox_golden):
 *   lat 33.70–34.85, lng -118.95 to -117.60
 */

import { db } from '@/lib/db';

export const LA_BBOX = {
  latMin: 33.7,
  latMax: 34.85,
  lngMin: -118.95,
  lngMax: -117.6,
} as const;

export interface GetPlaceIdsOptions {
  laOnly?: boolean;
  ids?: string[] | null;
  limit?: number | null;
}

/**
 * Resolve the entity ID set for script scope.
 * - If ids provided: validate exist and return (with optional limit).
 * - Else if laOnly: query v_places_la_bbox_golden for entity IDs.
 * - Else: return null (caller uses script default logic).
 */
export async function getPlaceIds(options: GetPlaceIdsOptions): Promise<string[] | null> {
  const { laOnly, ids, limit } = options;

  if (ids?.length) {
    const found = await db.entities.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const idSet = new Set(found.map((p) => p.id));
    const missing = ids.filter((id) => !idSet.has(id));
    if (missing.length > 0) {
      throw new Error(`Place IDs not found: ${missing.join(', ')}`);
    }
    const result = ids.filter((id) => idSet.has(id));
    return limit ? result.slice(0, limit) : result;
  }

  if (laOnly) {
    const rows = await db.$queryRaw<[{ id: string }]>`
      SELECT id FROM public.v_places_la_bbox_golden
    `;
    const result = rows.map((r) => r.id);
    return limit ? result.slice(0, limit) : result;
  }

  return null;
}

export interface GetLaCanonicalIdsOptions {
  limit?: number | null;
}

/**
 * Get golden_records.canonical_id for LA scope (bbox).
 * Use for scripts that query golden_records directly (e.g. scrape-menus).
 */
export async function getLaCanonicalIds(
  options?: GetLaCanonicalIdsOptions
): Promise<string[]> {
  const limit = options?.limit ?? null;
  const rows = await db.$queryRaw<[{ canonical_id: string }]>`
    SELECT gr.canonical_id
    FROM golden_records gr
    WHERE gr.lat IS NOT NULL
      AND gr.lng IS NOT NULL
      AND gr.lat >= ${LA_BBOX.latMin}
      AND gr.lat <= ${LA_BBOX.latMax}
      AND gr.lng >= ${LA_BBOX.lngMin}
      AND gr.lng <= ${LA_BBOX.lngMax}
  `;
  const result = rows.map((r) => r.canonical_id);
  return limit ? result.slice(0, limit) : result;
}

/**
 * Reusable Prisma where clause for entities (LA-only).
 * Returns { id: { in: string[] } } or {} if not LA.
 */
export async function getLaEntityWhere(options?: {
  laOnly: boolean;
  limit?: number | null;
}): Promise<{ id?: { in: string[] } }> {
  if (!options?.laOnly) return {};
  const ids = await getPlaceIds({ laOnly: true, limit: options.limit ?? null });
  if (!ids?.length) return {};
  return { id: { in: ids } };
}

export interface GetLaSlugsOptions {
  dbView?: string;
}

/**
 * Get slugs of places in LA scope (v_places_la_bbox_golden).
 * Use for filtering gold CSVs or eval by place_slug.
 */
export async function getLaSlugs(options?: GetLaSlugsOptions): Promise<string[]> {
  const view = options?.dbView ?? 'public.v_places_la_bbox_golden';
  const rows = await db.$queryRawUnsafe<[{ slug: string }]>(
    `SELECT slug FROM ${view} WHERE slug IS NOT NULL ORDER BY slug`
  );
  return rows.map((r) => r.slug);
}
