/**
 * Coverage Audit Page (Public)
 * Moved from /admin/coverage to public access
 * Shows data quality metrics and geographic coverage
 */

import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function CoveragePage() {
  // Get coverage statistics
  const [totalPlaces, laCounty, orangeCounty, neighborhoods] = await Promise.all([
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
    })
  ])

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
      </div>
    </div>
  )
}
