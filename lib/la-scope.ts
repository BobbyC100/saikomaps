/**
 * LA-only scoping: resolve place IDs from v_places_la_bbox_golden.
 * Use when scripts need to restrict to LA County places with golden_record linkage.
 */

import { db } from '@/lib/db';

export interface GetPlaceIdsOptions {
  laOnly?: boolean;
  ids?: string[] | null;
  limit?: number | null;
}

/**
 * Resolve the place ID set for script scope.
 * - If ids provided: validate exist and return (with optional limit).
 * - Else if laOnly: query v_places_la_bbox_golden for place IDs.
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
