/**
 * Shared coverage audit content (used by /coverage and /admin/coverage)
 */

import { db } from '@/lib/db'

/** Normalize for display: empty/null neighborhood → "(none)", null primary_vertical → "(unmapped)" */
function normHood(neighborhood: string | null) {
  const t = neighborhood?.trim()
  return t === '' || t == null ? '(none)' : t
}
function normVertical(primary_vertical: string | null) {
  return primary_vertical == null ? '(unmapped)' : primary_vertical
}

type Tier2VisitFactIssue =
  | 'missing_hours'
  | 'missing_price_level'
  | 'missing_menu_link'
  | 'missing_reservations'
  | 'operating_status_unknown'
  | 'google_says_closed'

const PRICE_LEVEL_VERTICALS = new Set(['EAT', 'COFFEE', 'WINE', 'DRINKS', 'BAKERY'])
const MENU_VERTICALS = new Set(['EAT', 'COFFEE', 'WINE', 'DRINKS', 'BAKERY', 'PURVEYORS'])
const RESERVATION_VERTICALS = new Set(['EAT', 'WINE', 'DRINKS', 'STAY'])

const TIER2_ISSUE_META: Record<Tier2VisitFactIssue, { label: string; action: string }> = {
  missing_hours: {
    label: 'Missing Opening Hours',
    action: 'Run `coverage:apply` (Google details hours) and re-run coverage audit.',
  },
  missing_price_level: {
    label: 'Missing Price Level',
    action: 'Run `coverage:apply` (Google attrs/details) and re-run coverage audit.',
  },
  missing_menu_link: {
    label: 'Missing Menu Link',
    action: 'Run `scan-merchant-surfaces` then `populate-canonical-state`.',
  },
  missing_reservations: {
    label: 'Missing Reservation Link',
    action: 'Run `scan-merchant-surfaces` then `populate-canonical-state`.',
  },
  operating_status_unknown: {
    label: 'Operating Status Unknown',
    action: 'Run `coverage:apply` to refresh Google business status.',
  },
  google_says_closed: {
    label: 'Google Says Closed',
    action: 'Verify closure, then run `place:close` if confirmed.',
  },
}

function hasValue(v: unknown): boolean {
  return v !== null && v !== undefined
}

function hasNonEmptyText(v: string | null | undefined): boolean {
  return typeof v === 'string' && v.trim().length > 0
}

function canonicalFirst<T>(canonical: T | null | undefined, fallback: T | null | undefined): T | null {
  if (canonical !== null && canonical !== undefined) return canonical
  if (fallback !== null && fallback !== undefined) return fallback
  return null
}

function detectTier2Issues(place: {
  primary_vertical: string | null
  googlePlaceId: string | null
  businessStatus: string | null
  hours: unknown
  priceLevel: number | null
  reservationUrl: string | null
  canonical_state: {
    hours_json: unknown
    price_level: number | null
    reservation_url: string | null
    menu_url: string | null
  } | null
}): Tier2VisitFactIssue[] {
  const issues: Tier2VisitFactIssue[] = []
  const primaryVertical = place.primary_vertical
  const ces = place.canonical_state

  if (!hasValue(canonicalFirst(ces?.hours_json, place.hours))) {
    issues.push('missing_hours')
  }

  if (primaryVertical && PRICE_LEVEL_VERTICALS.has(primaryVertical)) {
    if (!hasValue(canonicalFirst(ces?.price_level, place.priceLevel))) {
      issues.push('missing_price_level')
    }
  }

  if (primaryVertical && MENU_VERTICALS.has(primaryVertical) && !hasNonEmptyText(ces?.menu_url)) {
    issues.push('missing_menu_link')
  }

  if (primaryVertical && RESERVATION_VERTICALS.has(primaryVertical)) {
    if (!hasNonEmptyText(canonicalFirst(ces?.reservation_url, place.reservationUrl))) {
      issues.push('missing_reservations')
    }
  }

  if (place.googlePlaceId && !hasNonEmptyText(place.businessStatus)) {
    issues.push('operating_status_unknown')
  }

  if (place.businessStatus === 'CLOSED_PERMANENTLY') {
    issues.push('google_says_closed')
  }

  return issues
}

export async function CoverageContent() {
  const [totalPlaces, laCounty, orangeCounty, neighborhoods, hoodVerticalRows, tier2Rows] = await Promise.all([
    db.golden_records.count({
      where: { lifecycle_status: 'ACTIVE' }
    }),
    db.golden_records.count({
      where: {
        lifecycle_status: 'ACTIVE',
        county: 'Los Angeles'
      }
    }),
    db.golden_records.count({
      where: {
        lifecycle_status: 'ACTIVE',
        county: 'Orange'
      }
    }),
    db.golden_records.groupBy({
      by: ['neighborhood'],
      where: {
        lifecycle_status: 'ACTIVE',
        neighborhood: { not: null }
      },
      _count: true,
      orderBy: {
        _count: {
          neighborhood: 'desc'
        }
      },
      take: 20
    }),
    // Places: neighborhood × primary_vertical (reporting uses primary_vertical)
    db.entities.groupBy({
      by: ['neighborhood', 'primary_vertical'],
      _count: true
    }),
    db.entities.findMany({
      select: {
        id: true,
        primary_vertical: true,
        googlePlaceId: true,
        businessStatus: true,
        hours: true,
        priceLevel: true,
        reservationUrl: true,
        canonical_state: {
          select: {
            hours_json: true,
            price_level: true,
            reservation_url: true,
            menu_url: true
          }
        }
      }
    })
  ])

  const hoodVertical = hoodVerticalRows
    .map((r) => ({
      neighborhood: normHood(r.neighborhood),
      primary_vertical: normVertical(r.primary_vertical),
      places: r._count
    }))
    .sort((a, b) => {
      const nh = (a.neighborhood ?? '').localeCompare(b.neighborhood ?? '')
      if (nh !== 0) return nh
      return b.places - a.places
    })

  const tier2Counts = {
    missing_hours: 0,
    missing_price_level: 0,
    missing_menu_link: 0,
    missing_reservations: 0,
    operating_status_unknown: 0,
    google_says_closed: 0,
  } as Record<Tier2VisitFactIssue, number>

  for (const row of tier2Rows) {
    for (const issue of detectTier2Issues(row)) {
      tier2Counts[issue]++
    }
  }

  const tier2Table = (Object.keys(TIER2_ISSUE_META) as Tier2VisitFactIssue[]).map((issueType) => ({
    issueType,
    label: TIER2_ISSUE_META[issueType].label,
    count: tier2Counts[issueType],
    action: TIER2_ISSUE_META[issueType].action
  }))

  return (
    <div className="min-h-screen bg-[#F5F0E1] py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-[#36454F] mb-2">Coverage Audit</h1>
          <p className="text-[#8B7355]">Geographic coverage and data quality metrics</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-[#8B7355] mb-2">Total Places</div>
            <div className="text-3xl font-bold text-[#36454F]">{totalPlaces.toLocaleString()}</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-[#8B7355] mb-2">LA County</div>
            <div className="text-3xl font-bold text-[#36454F]">{laCounty.toLocaleString()}</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-[#8B7355] mb-2">Orange County</div>
            <div className="text-3xl font-bold text-[#36454F]">{orangeCounty.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-[#36454F] mb-6">Top Neighborhoods</h2>
          <div className="space-y-3">
            {neighborhoods.map((n) => (
              <div key={n.neighborhood} className="flex justify-between items-center py-2 border-b border-[#C3B091]/20">
                <span className="text-[#36454F]">{n.neighborhood}</span>
                <span className="text-[#8B7355] font-medium">{n._count} places</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-sm mt-8">
          <h2 className="text-2xl font-bold text-[#36454F] mb-6">Places by neighborhood × primary_vertical</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#C3B091]/40">
                  <th className="py-2 pr-4 text-[#8B7355] font-medium">Neighborhood</th>
                  <th className="py-2 pr-4 text-[#8B7355] font-medium">Primary vertical</th>
                  <th className="py-2 text-[#8B7355] font-medium text-right">Places</th>
                </tr>
              </thead>
              <tbody>
                {hoodVertical.map((r, i) => (
                  <tr key={`${r.neighborhood}-${r.primary_vertical}-${i}`} className="border-b border-[#C3B091]/20">
                    <td className="py-2 pr-4 text-[#36454F]">{r.neighborhood}</td>
                    <td className="py-2 pr-4 text-[#36454F]">{r.primary_vertical}</td>
                    <td className="py-2 text-[#8B7355] font-medium text-right">{r.places.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-sm mt-8">
          <h2 className="text-2xl font-bold text-[#36454F] mb-2">Tier 2 Visit Facts Issues</h2>
          <p className="text-[#8B7355] mb-6">
            Canonical-first detection (`canonical_entity_state` with `entities` fallback) with `primary_vertical`
            applicability gates.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#C3B091]/40">
                  <th className="py-2 pr-4 text-[#8B7355] font-medium">Issue</th>
                  <th className="py-2 pr-4 text-[#8B7355] font-medium text-right">Count</th>
                  <th className="py-2 text-[#8B7355] font-medium">Current workflow</th>
                </tr>
              </thead>
              <tbody>
                {tier2Table.map((row) => (
                  <tr key={row.issueType} className="border-b border-[#C3B091]/20">
                    <td className="py-2 pr-4 text-[#36454F]">
                      <div className="font-medium">{row.label}</div>
                      <div className="text-xs text-[#8B7355] mt-1">{row.issueType}</div>
                    </td>
                    <td className="py-2 pr-4 text-right text-[#36454F] font-medium">{row.count.toLocaleString()}</td>
                    <td className="py-2 text-[#36454F]">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
