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

export async function CoverageContent() {
  const [totalPlaces, laCounty, orangeCounty, neighborhoods, hoodVerticalRows] = await Promise.all([
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
      </div>
    </div>
  )
}
