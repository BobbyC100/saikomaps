/**
 * Admin Coverage Dashboard
 * Diagnostic dashboard that explains failure, not just reports completeness.
 * Server component — all data fetched at render time via raw SQL.
 */

import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ResolutionHealth {
  active: number
  has_gpid: number
  has_coords: number
  has_neighborhood: number
  unresolved: number
}

interface TierRow {
  display_tier: string
  count: number
}

interface VerticalRow {
  primary_vertical: string
  count: number
}

interface SourceRow {
  source: string
  count: number
}

interface NeighborhoodRow {
  neighborhood: string
  total: number
  complete_count: number
  needs_work: number
  avg_completion_pct: number | null
}

interface MissingFieldsRow {
  missing_address: number
  missing_latitude: number
  missing_longitude: number
  missing_neighborhood: number
  missing_phone: number
  missing_website: number
  missing_instagram: number
  missing_hours: number
  total: number
}

interface ProblemRow {
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function serialize<T>(rows: T[]): T[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
      if (v === null || v === undefined) {
        out[k] = v
      } else if (typeof v === 'bigint') {
        out[k] = Number(v)
      } else if (typeof v === 'object' && typeof (v as any).toNumber === 'function') {
        out[k] = (v as any).toNumber()
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

function n(v: number | null | undefined): number {
  return v ?? 0
}

function pct(part: number, total: number): string {
  if (total === 0) return '0'
  return ((part / total) * 100).toFixed(1)
}

/* ------------------------------------------------------------------ */
/*  Data fetching                                                      */
/* ------------------------------------------------------------------ */

async function fetchData() {
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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TIER_META: Record<string, { label: string; color: string; bg: string }> = {
  healthy:    { label: 'Healthy',    color: '#166534', bg: '#DCFCE7' },
  needs_work: { label: 'Needs Work', color: '#92400E', bg: '#FEF3C7' },
  unresolved: { label: 'Unresolved', color: '#991B1B', bg: '#FEE2E2' },
}

const TIER_ORDER = ['healthy', 'needs_work', 'unresolved']

const REASON_PILLS: Record<string, { label: string; color: string; bg: string }> = {
  no_gpid:         { label: 'no GPID',   color: '#991B1B', bg: '#FEE2E2' },
  no_coords:       { label: 'no coords', color: '#991B1B', bg: '#FEE2E2' },
  no_website:      { label: 'no website', color: '#92400E', bg: '#FEF3C7' },
  no_neighborhood: { label: 'no hood',   color: '#92400E', bg: '#FEF3C7' },
  no_phone:        { label: 'no phone',  color: '#8B7355', bg: '#F5F0E1' },
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function AdminCoveragePage() {
  const {
    resolution,
    tierRows,
    verticalRows,
    sourceRows,
    neighborhoodRows,
    missingRows,
    problemRows,
  } = await fetchData()

  const tierMap = new Map(tierRows.map((r) => [r.display_tier, n(r.count)]))
  const totalEntities = TIER_ORDER.reduce((s, t) => s + (tierMap.get(t) ?? 0), 0)

  const mr = missingRows[0]
  const cesTotal = mr ? n(mr.total) : 0

  const coreFields = mr
    ? [
        { field: 'Address',      missing: n(mr.missing_address) },
        { field: 'Latitude',     missing: n(mr.missing_latitude) },
        { field: 'Longitude',    missing: n(mr.missing_longitude) },
        { field: 'Neighborhood', missing: n(mr.missing_neighborhood) },
        { field: 'Website',      missing: n(mr.missing_website) },
        { field: 'Phone',        missing: n(mr.missing_phone) },
        { field: 'Hours',        missing: n(mr.missing_hours) },
      ].sort((a, b) => b.missing - a.missing)
    : []

  const secondaryFields = mr
    ? [{ field: 'Instagram', missing: n(mr.missing_instagram) }]
    : []

  const resolutionRate = resolution.active > 0
    ? ((resolution.has_gpid / resolution.active) * 100).toFixed(1)
    : '0'

  return (
    <div className="min-h-screen bg-[#F5F0E1] py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-10">
          <nav className="flex items-center gap-2 text-sm text-[#8B7355] mb-2">
            <Link href="/admin" className="hover:text-[#36454F]">Admin</Link>
            <span>/</span>
            <span className="text-[#36454F] font-medium">Coverage</span>
          </nav>
          <h1 className="text-4xl font-bold text-[#36454F] mb-2">Coverage Dashboard</h1>
          <p className="text-[#8B7355]">
            Diagnostic overview across {totalEntities.toLocaleString()} active entities
          </p>
        </header>

        {/* Panel 0 — Resolution Health */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-lg font-bold text-[#36454F] mb-4">Resolution Health</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Active" value={resolution.active} />
            <StatCard
              label="Has GPID"
              value={resolution.has_gpid}
              subtitle={`${resolutionRate}% resolved`}
              color="#166534"
            />
            <StatCard label="Has Coords" value={resolution.has_coords} color="#166534" />
            <StatCard label="Has Neighborhood" value={resolution.has_neighborhood} color="#166534" />
            <StatCard label="Unresolved" value={resolution.unresolved} color="#991B1B" />
          </div>
        </div>

        {/* Panel 1 — Tier Summary (3 tiers) */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {TIER_ORDER.map((tier) => {
            const count = tierMap.get(tier) ?? 0
            const meta = TIER_META[tier]
            return (
              <div
                key={tier}
                className="rounded-xl p-6 shadow-sm"
                style={{ backgroundColor: meta.bg }}
              >
                <div className="text-sm mb-2" style={{ color: meta.color }}>
                  {meta.label}
                </div>
                <div className="text-3xl font-bold" style={{ color: meta.color }}>
                  {count.toLocaleString()}
                </div>
                <div className="text-sm mt-1" style={{ color: meta.color, opacity: 0.7 }}>
                  {pct(count, totalEntities)}% of total
                </div>
              </div>
            )
          })}
        </div>

        {/* Panel 1b — Source + Type Dimensions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Vertical breakdown */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-[#36454F] mb-3 uppercase tracking-wider">By Vertical</h3>
            <div className="space-y-2">
              {verticalRows.slice(0, 8).map((row) => (
                <div key={row.primary_vertical} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-medium text-[#36454F] truncate">{row.primary_vertical}</span>
                  <div className="flex-1 h-3 bg-[#C3B091]/20 rounded overflow-hidden">
                    <div
                      className="h-full bg-[#5BA7A7] rounded"
                      style={{ width: `${pct(row.count, totalEntities)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-mono text-[#36454F]">{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Source breakdown */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-[#36454F] mb-3 uppercase tracking-wider">By Source</h3>
            <div className="space-y-2">
              {sourceRows.slice(0, 8).map((row) => (
                <div key={row.source} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-medium text-[#36454F] truncate">{row.source}</span>
                  <div className="flex-1 h-3 bg-[#C3B091]/20 rounded overflow-hidden">
                    <div
                      className="h-full bg-[#8B7355] rounded"
                      style={{ width: `${pct(row.count, totalEntities)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-mono text-[#36454F]">{row.count}</span>
                </div>
              ))}
              {sourceRows.length === 0 && (
                <p className="text-xs text-[#8B7355]">No source data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Panel 2 — Neighborhood Breakdown (normalized, sorted by needs_work) */}
        <div className="bg-white rounded-xl p-8 shadow-sm mb-10">
          <h2 className="text-2xl font-bold text-[#36454F] mb-2">Neighborhood Breakdown</h2>
          <p className="text-xs text-[#8B7355] mb-6">Sorted by most work needed. Neighborhoods with fewer than 3 entities are dimmed.</p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#C3B091]/40">
              <thead>
                <tr>
                  {['Neighborhood', 'Total', 'Complete', 'Needs Work', 'Avg Completion'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-[#8B7355] uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C3B091]/20">
                {neighborhoodRows.map((row) => {
                  const isSmall = n(row.total) < 3
                  return (
                    <tr
                      key={row.neighborhood}
                      className="hover:bg-[#F5F0E1]/50"
                      style={{ opacity: isSmall ? 0.5 : 1 }}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-[#36454F]">
                        {row.neighborhood}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#36454F]">{n(row.total)}</td>
                      <td className="px-4 py-3 text-sm text-[#166534] font-medium">
                        {n(row.complete_count)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#92400E] font-medium">
                        {n(row.needs_work)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#36454F]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[100px] h-2 bg-[#C3B091]/20 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#5BA7A7] rounded-full"
                              style={{ width: `${n(row.avg_completion_pct)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs">
                            {n(row.avg_completion_pct)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel 3 — Missing Fields (Core vs Secondary) */}
        <div className="bg-white rounded-xl p-8 shadow-sm mb-10">
          <h2 className="text-2xl font-bold text-[#36454F] mb-2">Missing Fields</h2>
          <p className="text-sm text-[#8B7355] mb-6">
            Across {cesTotal.toLocaleString()} canonical entity state records
          </p>

          {/* Core fields */}
          <h3 className="text-xs font-bold text-[#36454F] mb-3 uppercase tracking-wider">
            Core Fields (affect publishability)
          </h3>
          <div className="space-y-3 mb-8">
            {coreFields.map(({ field, missing }) => {
              const missPct = cesTotal > 0 ? (missing / cesTotal) * 100 : 0
              return (
                <div key={field} className="flex items-center gap-4">
                  <span className="w-28 text-sm font-medium text-[#36454F]">{field}</span>
                  <div className="flex-1 h-5 bg-[#C3B091]/20 rounded overflow-hidden">
                    <div
                      className="h-full bg-[#92400E]/60 rounded"
                      style={{ width: `${missPct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-mono text-[#36454F]">
                    {missing}
                  </span>
                  <span className="w-16 text-right text-xs text-[#8B7355]">
                    {pct(missing, cesTotal)}%
                  </span>
                </div>
              )
            })}
          </div>

          {/* Secondary fields */}
          <h3 className="text-xs font-bold text-[#8B7355] mb-3 uppercase tracking-wider">
            Secondary Fields (nice to have)
          </h3>
          <div className="space-y-3">
            {secondaryFields.map(({ field, missing }) => {
              const missPct = cesTotal > 0 ? (missing / cesTotal) * 100 : 0
              return (
                <div key={field} className="flex items-center gap-4 opacity-70">
                  <span className="w-28 text-sm font-medium text-[#8B7355]">{field}</span>
                  <div className="flex-1 h-4 bg-[#C3B091]/20 rounded overflow-hidden">
                    <div
                      className="h-full bg-[#8B7355]/40 rounded"
                      style={{ width: `${missPct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-mono text-[#8B7355]">
                    {missing}
                  </span>
                  <span className="w-16 text-right text-xs text-[#8B7355]">
                    {pct(missing, cesTotal)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Panel 4 — Problem Records with "why broken" */}
        <div className="bg-white rounded-xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-[#36454F] mb-2">Problem Records</h2>
          <p className="text-sm text-[#8B7355] mb-6">
            Open entities in partial or sparse tiers, sorted by lowest completion
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#C3B091]/40">
              <thead>
                <tr>
                  {['Name', 'Neighborhood', 'Why Broken', 'Vertical', 'Stage', 'Completion'].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-left text-xs font-medium text-[#8B7355] uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C3B091]/20">
                {problemRows.map((row) => {
                  const reasons = (
                    Object.entries(REASON_PILLS) as [string, typeof REASON_PILLS[string]][]
                  ).filter(([key]) => (row as any)[key] === true)

                  return (
                    <tr key={row.id} className="hover:bg-[#F5F0E1]/50">
                      <td className="px-3 py-3 text-sm">
                        <Link
                          href={`/place/${row.slug}`}
                          className="text-[#5BA7A7] hover:underline font-medium"
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-sm text-[#36454F]">
                        {row.neighborhood ?? 'unknown'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {reasons.map(([key, meta]) => (
                            <span
                              key={key}
                              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{ backgroundColor: meta.bg, color: meta.color }}
                            >
                              {meta.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#8B7355] font-mono">
                        {row.vertical}
                      </td>
                      <td className="px-3 py-3 text-xs text-[#8B7355] font-mono">
                        {row.enrichment_stage}
                      </td>
                      <td className="px-3 py-3 text-sm font-mono text-[#36454F]">
                        {n(row.completion_pct)}%
                      </td>
                    </tr>
                  )
                })}
                {problemRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#8B7355]">
                      No problem records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  subtitle,
  color,
}: {
  label: string
  value: number
  subtitle?: string
  color?: string
}) {
  return (
    <div className="rounded-lg border border-[#C3B091]/40 p-4">
      <div className="text-xs text-[#8B7355] mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color: color ?? '#36454F' }}>
        {value.toLocaleString()}
      </div>
      {subtitle && (
        <div className="text-xs mt-0.5" style={{ color: color ?? '#8B7355' }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}
