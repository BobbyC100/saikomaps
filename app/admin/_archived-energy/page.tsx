/**
 * Admin Energy Dashboard — CTO Spec §9
 * Histogram of energy_score, coverage %, avg confidence, last compute timestamp
 */

import { db } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminEnergyPage() {
  const [totalPlaces, energyRows, lastCompute] = await Promise.all([
    db.entities.count(),
    db.energy_scores.findMany({
      where: { version: 'energy_v1' },
      select: { energy_score: true, energy_confidence: true },
    }),
    db.energy_scores.findFirst({
      where: { version: 'energy_v1' },
      orderBy: { computed_at: 'desc' },
      select: { computed_at: true },
    }),
  ]);

  const coverageCount = energyRows.length;
  const coveragePct = totalPlaces > 0 ? Math.round((coverageCount / totalPlaces) * 100) : 0;
  const avgConfidence =
    energyRows.length > 0
      ? Math.round(
          (energyRows.reduce((s, r) => s + r.energy_confidence, 0) / energyRows.length) * 100
        ) / 100
      : 0;

  const histogram: Record<string, number> = {};
  for (let b = 0; b < 100; b += 10) {
    const key = `${b}-${b + 9}`;
    histogram[key] = energyRows.filter((r) => r.energy_score >= b && r.energy_score < b + 10).length;
  }
  histogram['100'] = energyRows.filter((r) => r.energy_score === 100).length;

  return (
    <div className="min-h-screen bg-[#F5F0E1] py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-[#36454F] mb-2">Energy Engine</h1>
          <p className="text-[#8B7355]">Baseline energy classification (v1)</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-[#8B7355] mb-2">Coverage</div>
            <div className="text-3xl font-bold text-[#36454F]">{coveragePct}%</div>
            <div className="text-sm text-[#8B7355] mt-1">
              {coverageCount.toLocaleString()} / {totalPlaces.toLocaleString()} places
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-[#8B7355] mb-2">Avg confidence</div>
            <div className="text-3xl font-bold text-[#36454F]">{avgConfidence}</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-[#8B7355] mb-2">Last compute</div>
            <div className="text-lg font-medium text-[#36454F]">
              {lastCompute?.computed_at
                ? new Date(lastCompute.computed_at).toLocaleString()
                : 'Never'}
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm flex items-center">
            <Link
              href="/admin/energy/inspect"
              className="text-[#5BA7A7] hover:underline font-medium"
            >
              Inspect by place →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-[#36454F] mb-6">Energy score histogram (0–100)</h2>
          <div className="space-y-3">
            {Object.entries(histogram).map(([range, count]) => {
              const max = Math.max(...Object.values(histogram), 1);
              const pct = Math.round((count / max) * 100);
              return (
                <div key={range} className="flex items-center gap-4">
                  <span className="w-16 text-[#36454F] font-mono text-sm">{range}</span>
                  <div className="flex-1 h-6 bg-[#C3B091]/20 rounded overflow-hidden">
                    <div
                      className="h-full bg-[#5BA7A7]/70 rounded"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-[#8B7355] font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
