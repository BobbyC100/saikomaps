/**
 * Coverage Dashboard — Data Access Layer
 *
 * Extracted from app/admin/coverage/page.tsx to keep raw SQL out of
 * presentation components. All queries are SELECT-only, designed for <5s.
 */

import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// ============================================================================
// Types
// ============================================================================

export interface ResolutionHealth {
  active: number
  has_gpid: number
  has_coords: number
  has_neighborhood: number
  unresolved: number
}

export interface TierRow {
  display_tier: string
  count: number
}

export interface VerticalRow {
  primary_vertical: string
  count: number
}

export interface SourceRow {
  source: string
  count: number
}

export interface NeighborhoodRow {
  neighborhood: string
  total: number
  complete_count: number
  needs_work: number
  avg_completion_pct: number | null
}

export interface MissingFieldsRow {
  missing_address: number
  missing_latitude: number
  missing_longitude: number
  missing_neighborhood: number
  missing_phone: number
  missing_website: number
  missing_instagram: number
  missing_tiktok: number
  missing_hours: number
  total: number
}

export interface ProblemRow {
  id: string
  name: string
  slug: string
  neighborhood: string | null
  enrichment_tier: string
  completion_pct: number | null
  no_gpid: boolean
  no_coords: boolean
  no_website: boolean
  no_neighborhood: boolean
  no_phone: boolean
  vertical: string
  enrichment_stage: string
}

export interface CoverageDashboardData {
  resolution: ResolutionHealth
  tierRows: TierRow[]
  verticalRows: VerticalRow[]
  sourceRows: SourceRow[]
  neighborhoodRows: NeighborhoodRow[]
  missingRows: MissingFieldsRow[]
  problemRows: ProblemRow[]
}

// ============================================================================
// Helpers
// ============================================================================

function serialize<T>(rows: T[]): T[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
      if (v === null || v === undefined) {
        out[k] = v
      } else if (typeof v === 'bigint') {
        out[k] = Number(v)
      } else if (typeof v === 'object' && typeof (v as { toNumber?: () => number }).toNumber === 'function') {
        out[k] = (v as { toNumber: () => number }).toNumber()
      } else {
        out[k] = v
      }
    }
    return out as T
  })
}

/** Neighborhood normalization SQL expression — must use Prisma.sql for raw fragment embedding.
 *  Canonical source of truth for aliases: lib/geo/normalize-neighborhood.ts
 *  Keep this SQL CASE in sync with NEIGHBORHOOD_ALIASES in that module. */
const NEIGHBORHOOD_NORM = Prisma.sql`
  CASE LOWER(TRIM(COALESCE(t.neighborhood, 'unknown')))
    WHEN 'art district' THEN 'arts district'
    WHEN 'downtown los angeles' THEN 'downtown'
    WHEN 'south los angeles' THEN 'south central'
    WHEN 'dtla' THEN 'downtown'
    WHEN 'east la' THEN 'east los angeles'
    WHEN 'north hollywood' THEN 'noho'
    WHEN 'weho' THEN 'west hollywood'
    ELSE LOWER(TRIM(COALESCE(t.neighborhood, 'unknown')))
  END
`

// ============================================================================
// Main query function
// ============================================================================

export async function fetchCoverageDashboardData(): Promise<CoverageDashboardData> {
  const [
    resolutionRows,
    tierRows,
    verticalRows,
    sourceRows,
    neighborhoodRows,
    missingRows,
    problemRows,
  ] = await Promise.all([
    // Panel 0 — Resolution Health
    db.$queryRaw<ResolutionHealth[]>`
      SELECT
        COUNT(*)::int AS active,
        COUNT(CASE WHEN google_place_id IS NOT NULL THEN 1 END)::int AS has_gpid,
        COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END)::int AS has_coords,
        COUNT(CASE WHEN neighborhood IS NOT NULL THEN 1 END)::int AS has_neighborhood,
        COUNT(CASE WHEN google_place_id IS NULL AND latitude IS NULL THEN 1 END)::int AS unresolved
      FROM entities
      WHERE status != 'CANDIDATE'
    `.then(serialize),

    // Panel 1 — Tier Summary (3-tier: healthy / needs_work / unresolved)
    db.$queryRaw<TierRow[]>`
      SELECT
        CASE
          WHEN e.google_place_id IS NULL THEN 'unresolved'
          WHEN t.enrichment_tier IN ('complete', 'substantial') THEN 'healthy'
          ELSE 'needs_work'
        END AS display_tier,
        COUNT(*)::int AS count
      FROM entity_enrichment_tiers t
      JOIN entities e ON e.id = t.id
      WHERE e.status != 'CANDIDATE'
      GROUP BY display_tier
    `.then(serialize),

    // Panel 1b — Vertical breakdown
    db.$queryRaw<VerticalRow[]>`
      SELECT COALESCE(primary_vertical::text, 'unknown') AS primary_vertical, COUNT(*)::int AS count
      FROM entities WHERE status != 'CANDIDATE'
      GROUP BY primary_vertical ORDER BY count DESC
    `.then(serialize),

    // Panel 1c — Source breakdown
    db.$queryRaw<SourceRow[]>`
      SELECT
        COALESCE(source_val, 'unknown') AS source,
        COUNT(*)::int AS count
      FROM entities e
      LEFT JOIN LATERAL jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(COALESCE(e.editorial_sources->'sources', '[]'::jsonb)) = 'array'
             THEN COALESCE(e.editorial_sources->'sources', '[]'::jsonb)
             ELSE '[]'::jsonb END
      ) AS source_val ON true
      WHERE e.status != 'CANDIDATE'
      GROUP BY source_val
      ORDER BY count DESC
      LIMIT 10
    `.then(serialize),

    // Panel 2 — Neighborhood Breakdown (normalized, sorted by needs_work)
    db.$queryRaw<NeighborhoodRow[]>`
      SELECT
        ${NEIGHBORHOOD_NORM} AS neighborhood,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN t.enrichment_tier = 'complete' THEN 1 END)::int AS complete_count,
        COUNT(CASE WHEN t.enrichment_tier IN ('partial', 'sparse') THEN 1 END)::int AS needs_work,
        ROUND(AVG(t.field_completion) * 100, 1)::float8 AS avg_completion_pct
      FROM entity_enrichment_tiers t
      JOIN entities e ON e.id = t.id
      WHERE e.status != 'CANDIDATE'
      GROUP BY ${NEIGHBORHOOD_NORM}
      ORDER BY needs_work DESC, total DESC
    `.then(serialize),

    // Panel 3 — Missing Fields
    db.$queryRaw<MissingFieldsRow[]>`
      SELECT
        COUNT(CASE WHEN address IS NULL THEN 1 END)::int AS missing_address,
        COUNT(CASE WHEN latitude IS NULL THEN 1 END)::int AS missing_latitude,
        COUNT(CASE WHEN longitude IS NULL THEN 1 END)::int AS missing_longitude,
        COUNT(CASE WHEN neighborhood IS NULL THEN 1 END)::int AS missing_neighborhood,
        COUNT(CASE WHEN phone IS NULL THEN 1 END)::int AS missing_phone,
        COUNT(CASE WHEN website IS NULL THEN 1 END)::int AS missing_website,
        COUNT(CASE WHEN instagram IS NULL THEN 1 END)::int AS missing_instagram,
        COUNT(CASE WHEN tiktok IS NULL THEN 1 END)::int AS missing_tiktok,
        COUNT(CASE WHEN hours_json IS NULL THEN 1 END)::int AS missing_hours,
        COUNT(*)::int AS total
      FROM canonical_entity_state
    `.then(serialize),

    // Panel 4 — Problem Records with "why broken" columns
    db.$queryRaw<ProblemRow[]>`
      SELECT
        e.id,
        e.name,
        e.slug,
        ${NEIGHBORHOOD_NORM} AS neighborhood,
        t.enrichment_tier,
        ROUND(t.field_completion * 100, 1)::float8 AS completion_pct,
        CASE WHEN e.google_place_id IS NULL THEN true ELSE false END AS no_gpid,
        CASE WHEN e.latitude IS NULL OR e.longitude IS NULL THEN true ELSE false END AS no_coords,
        CASE WHEN e.website IS NULL THEN true ELSE false END AS no_website,
        CASE WHEN e.neighborhood IS NULL THEN true ELSE false END AS no_neighborhood,
        CASE WHEN e.phone IS NULL THEN true ELSE false END AS no_phone,
        COALESCE(e.primary_vertical::text, 'EAT') AS vertical,
        COALESCE(e.enrichment_stage, 'none') AS enrichment_stage
      FROM entity_enrichment_tiers t
      JOIN entities e ON e.id = t.id
      WHERE t.enrichment_tier IN ('partial', 'sparse')
        AND e.status = 'OPEN'
      ORDER BY t.field_completion ASC
      LIMIT 50
    `.then(serialize),
  ])

  return {
    resolution: resolutionRows[0],
    tierRows,
    verticalRows,
    sourceRows,
    neighborhoodRows,
    missingRows,
    problemRows,
  }
}
