'use client';

/**
 * Coverage Dashboard v2
 *
 * Single scrollable layout (replaces three-tab structure):
 *   1. Header — entity counts (total, published, ingested)
 *   2. Gaps & Recommended Actions — what needs attention, grouped by bucket
 *   3. Neighborhood Overview — per-neighborhood completeness with bucket breakdowns
 *   4. System Summary — counts by the three entity state axes + recent activity
 *
 * See: docs/architecture/coverage-dashboard-v2-spec.md
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types (v2 API shape)
// ---------------------------------------------------------------------------

interface DashboardData {
  totalEntities: number;
  publishedCount: number;
  notEnrichedCount: number;
  systemSummary: {
    operatingStatus: StatusCount[];
    enrichmentStatus: StatusCount[];
    publicationStatus: StatusCount[];
  };
  neighborhoods: NeighborhoodRow[];
  gaps: GapItem[];
  recentActivity: { date: string; enriched: number; created: number }[];
}

interface StatusCount {
  status: string;
  count: number;
}

interface NeighborhoodRow {
  neighborhood: string;
  total: number;
  published: number;
  identity_pct: number;
  access_pct: number;
  offering_pct: number;
  verticals: Record<string, number>;
}

interface GapItem {
  gap_type: string;
  bucket: string;
  entity_count: number;
  neighborhoods_affected: string[];
  recommended_source: string;
  cost: string;
  already_attempted: number;
}

// ---------------------------------------------------------------------------
// Colors — preserving the existing warm cream/teal aesthetic
// ---------------------------------------------------------------------------

const C = {
  bg: '#F5F0E1',
  card: '#FFFFFF',
  text: '#36454F',
  muted: '#8B7355',
  accent: '#5BA7A7',
  border: '#C3B091',
  green: '#4A7C59',
  greenBg: '#E8F5E9',
  amber: '#D4A574',
  amberBg: '#FFF3E0',
  red: '#C75050',
  redBg: '#FFEBEE',
} as const;

// ---------------------------------------------------------------------------
// Human-readable labels for gap types and sources
// ---------------------------------------------------------------------------

const GAP_LABELS: Record<string, string> = {
  missing_gpid: 'Missing Google Place ID',
  missing_coords: 'Missing Coordinates',
  missing_website: 'Missing Website',
  missing_hours: 'Missing Hours',
  missing_phone: 'Missing Phone',
  missing_instagram: 'Missing Instagram',
  missing_reservation_url: 'Missing Reservation URL',
  missing_menu: 'Missing Menu URL',
  missing_scenesense: 'Missing SceneSense',
  missing_editorial: 'Missing Editorial Coverage',
  missing_offering_programs: 'Missing Offering Programs',
};

const SOURCE_LABELS: Record<string, string> = {
  google_places_api: 'Google Places API',
  social_discovery_ai: 'AI Social Discovery',
  website_crawl: 'Website Crawl',
  ai_extraction: 'AI Extraction',
  editorial_discovery: 'Editorial Discovery',
  manual: 'Manual Review',
};

const BUCKET_LABELS: Record<string, string> = {
  identity: 'Identity',
  access: 'Access',
  offering: 'Offering',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CoverageDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/coverage-dashboard');
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message ?? `Request failed (${res.status})`);
      }
      setData(await res.json());
    } catch (e) {
      console.error('Failed to load dashboard', e);
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.bg }}>
        <div className="text-lg" style={{ color: C.muted }}>Loading dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: C.bg }}>
        <div className="rounded-xl p-6 shadow-sm max-w-lg w-full text-center" style={{ backgroundColor: C.card }}>
          <h2 className="text-lg font-semibold mb-2" style={{ color: C.text }}>Dashboard failed to load</h2>
          <p className="text-sm mb-4" style={{ color: C.muted }}>
            {error ?? 'No dashboard data was returned.'}
          </p>
          <button
            type="button"
            onClick={fetchData}
            className="px-4 py-2 rounded text-sm font-medium"
            style={{ backgroundColor: C.accent, color: '#fff' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Group gaps by bucket
  const gapsByBucket: Record<string, GapItem[]> = {};
  for (const gap of data.gaps) {
    if (!gapsByBucket[gap.bucket]) gapsByBucket[gap.bucket] = [];
    gapsByBucket[gap.bucket].push(gap);
  }

  return (
    <div className="min-h-screen py-8 px-6" style={{ backgroundColor: C.bg }}>
      <div className="max-w-6xl mx-auto">

        {/* ================================================================ */}
        {/* 1. Page Header */}
        {/* ================================================================ */}
        <header className="mb-8">
          <nav className="flex items-center gap-2 text-sm mb-2" style={{ color: C.muted }}>
            <Link href="/admin" className="hover:underline">Admin</Link>
            <span>/</span>
            <span className="font-medium" style={{ color: C.text }}>Coverage</span>
          </nav>
          <h1 className="text-3xl font-bold" style={{ color: C.text }}>Coverage Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>
            {data.totalEntities.toLocaleString()} entities &middot;{' '}
            {data.publishedCount.toLocaleString()} published &middot;{' '}
            {data.notEnrichedCount.toLocaleString()} not enriched
          </p>
        </header>

        {/* ================================================================ */}
        {/* 2. Gaps & Recommended Actions */}
        {/* ================================================================ */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold" style={{ color: C.text }}>Gaps & Recommended Actions</h2>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>
              What needs attention across the system, grouped by completeness bucket. Free actions first.
            </p>
          </div>

          {data.gaps.length === 0 ? (
            <div className="rounded-xl p-8 shadow-sm text-center" style={{ backgroundColor: C.card }}>
              <p className="text-sm font-medium" style={{ color: C.green }}>All clear — no gaps detected</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['identity', 'access', 'offering'] as const).map((bucket) => {
                const bucketGaps = gapsByBucket[bucket] ?? [];
                if (bucketGaps.length === 0) return null;
                return (
                  <div key={bucket} className="rounded-xl shadow-sm overflow-hidden" style={{ backgroundColor: C.card }}>
                    <div className="px-5 py-3 border-b" style={{ borderColor: `${C.border}33` }}>
                      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: C.muted }}>
                        {BUCKET_LABELS[bucket]}
                      </h3>
                    </div>
                    <div className="divide-y" style={{ borderColor: `${C.border}15` }}>
                      {bucketGaps.map((gap) => (
                        <GapCard key={gap.gap_type} gap={gap} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ================================================================ */}
        {/* 3. Neighborhood Overview */}
        {/* ================================================================ */}
        <section className="mb-8">
          <div className="rounded-xl shadow-sm overflow-hidden" style={{ backgroundColor: C.card }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: `${C.border}33` }}>
              <h2 className="text-base font-bold" style={{ color: C.text }}>Neighborhood Overview</h2>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                Sorted by total entities. Neighborhoods with fewer than 2 entities are hidden.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}33` }}>
                    <th className="text-left px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider" style={{ color: C.muted }}>Neighborhood</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider" style={{ color: C.muted }}>Entities</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider" style={{ color: C.muted }}>Published</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider" style={{ color: C.muted }}>Identity %</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider" style={{ color: C.muted }}>Access %</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider" style={{ color: C.muted }}>Offering %</th>
                    <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider" style={{ color: C.muted }}>Verticals</th>
                  </tr>
                </thead>
                <tbody>
                  {data.neighborhoods.map((hood) => (
                    <tr
                      key={hood.neighborhood}
                      className="hover:bg-[#F5F0E1]/30 transition-colors"
                      style={{
                        borderBottom: `1px solid ${C.border}22`,
                        opacity: hood.neighborhood === 'unknown' ? 0.5 : 1,
                      }}
                    >
                      <td className="px-5 py-2.5 font-medium" style={{ color: C.text }}>
                        {hood.neighborhood}
                      </td>
                      <td className="text-right px-3 py-2.5" style={{ color: C.text }}>
                        {hood.total}
                      </td>
                      <td className="text-right px-3 py-2.5" style={{ color: C.text }}>
                        {hood.published}
                      </td>
                      <td className="text-right px-3 py-2.5">
                        <PctCell value={hood.identity_pct} />
                      </td>
                      <td className="text-right px-3 py-2.5">
                        <PctCell value={hood.access_pct} />
                      </td>
                      <td className="text-right px-3 py-2.5">
                        <PctCell value={hood.offering_pct} />
                      </td>
                      <td className="px-5 py-2.5">
                        <VerticalTags verticals={hood.verticals} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* 4. System Summary */}
        {/* ================================================================ */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold" style={{ color: C.text }}>System Summary</h2>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>
              Entity state distribution across the three independent axes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Operating Status */}
            <StateCard
              title="Operating Status"
              items={data.systemSummary.operatingStatus}
              colorMap={{
                SOFT_OPEN: C.amberBg,
                OPERATING: C.greenBg,
                TEMPORARILY_CLOSED: C.amberBg,
                PERMANENTLY_CLOSED: C.redBg,
                NULL: '#F3F4F6',
              }}
              textColorMap={{
                SOFT_OPEN: C.amber,
                OPERATING: C.green,
                TEMPORARILY_CLOSED: C.amber,
                PERMANENTLY_CLOSED: C.red,
                NULL: C.muted,
              }}
            />

            {/* Enrichment Status */}
            <StateCard
              title="Enrichment Status"
              items={data.systemSummary.enrichmentStatus}
              colorMap={{
                INGESTED: C.amberBg,
                ENRICHING: '#DBEAFE',
                ENRICHED: C.greenBg,
                NULL: '#F3F4F6',
              }}
              textColorMap={{
                INGESTED: C.amber,
                ENRICHING: '#1E40AF',
                ENRICHED: C.green,
                NULL: C.muted,
              }}
            />

            {/* Publication Status */}
            <StateCard
              title="Publication Status"
              items={data.systemSummary.publicationStatus}
              colorMap={{
                PUBLISHED: C.greenBg,
                UNPUBLISHED: C.amberBg,
                NULL: '#F3F4F6',
              }}
              textColorMap={{
                PUBLISHED: C.green,
                UNPUBLISHED: C.amber,
                NULL: C.muted,
              }}
            />
          </div>

          {/* Recent Activity */}
          {data.recentActivity.length > 0 && (
            <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: C.card }}>
              <h3 className="text-base font-bold mb-4" style={{ color: C.text }}>Last 7 Days</h3>
              <div className="flex gap-2 items-end h-24">
                {data.recentActivity.map((day) => {
                  const max = Math.max(...data.recentActivity.map(d => d.enriched + d.created), 1);
                  const h = Math.max(((day.enriched + day.created) / max) * 80, 2);
                  const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t" style={{ height: h, backgroundColor: C.accent, opacity: 0.8 }} />
                      <span className="text-[10px]" style={{ color: C.muted }}>{dayLabel}</span>
                      <span className="text-[10px] font-medium" style={{ color: C.text }}>
                        {day.enriched + day.created > 0 ? day.enriched + day.created : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Link to full triage board */}
        <div className="text-center pb-4">
          <Link
            href="/admin/coverage-ops"
            className="text-sm hover:underline"
            style={{ color: C.accent }}
          >
            Open full triage board for individual entity actions &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single gap card within a bucket column */
function GapCard({ gap }: { gap: GapItem }) {
  const isFree = gap.cost === 'free';
  const costColor = isFree ? C.green : gap.cost === 'low' ? C.amber : C.amber;
  const costBg = isFree ? C.greenBg : C.amberBg;

  return (
    <div className="px-5 py-3.5">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-sm font-semibold" style={{ color: C.text }}>
          {GAP_LABELS[gap.gap_type] ?? gap.gap_type}
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
          style={{ backgroundColor: costBg, color: costColor }}
        >
          {gap.cost}
        </span>
      </div>
      <div className="text-xs mb-1.5" style={{ color: C.muted }}>
        <span className="font-semibold" style={{ color: C.text }}>{gap.entity_count}</span> entities affected
      </div>
      {gap.neighborhoods_affected.length > 0 && (
        <div className="text-[10px] mb-2" style={{ color: C.muted }}>
          {gap.neighborhoods_affected.slice(0, 4).join(', ')}
          {gap.neighborhoods_affected.length > 4 && ` +${gap.neighborhoods_affected.length - 4} more`}
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: C.muted }}>
          {SOURCE_LABELS[gap.recommended_source] ?? gap.recommended_source}
        </span>
        <button
          className="px-3 py-1 rounded text-[10px] font-semibold opacity-50 cursor-not-allowed"
          style={{
            backgroundColor: isFree ? C.accent : C.bg,
            color: isFree ? '#fff' : C.muted,
            border: isFree ? 'none' : `1px solid ${C.border}`,
          }}
          disabled
          title="Enrichment orchestration coming soon"
        >
          {isFree ? 'Run' : 'Run (paid)'}
        </button>
      </div>
    </div>
  );
}

/** Color-coded percentage cell for the neighborhood table */
function PctCell({ value }: { value: number }) {
  const color = value >= 70 ? C.green : value >= 40 ? C.amber : C.red;
  const bg = value >= 70 ? C.greenBg : value >= 40 ? C.amberBg : C.redBg;
  return (
    <span
      className="inline-block text-xs font-medium px-2 py-0.5 rounded"
      style={{ color, backgroundColor: bg }}
    >
      {value}%
    </span>
  );
}

/** Compact vertical tag list for neighborhood table */
function VerticalTags({ verticals }: { verticals: Record<string, number> }) {
  const sorted = Object.entries(verticals)
    .filter(([k]) => k !== 'UNKNOWN' && k !== 'null')
    .sort(([, a], [, b]) => b - a);
  const top = sorted.slice(0, 4);
  const rest = sorted.length - top.length;

  if (top.length === 0) return <span className="text-[10px]" style={{ color: C.muted }}>—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {top.map(([vertical, count]) => (
        <span
          key={vertical}
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ backgroundColor: `${C.border}22`, color: C.text }}
        >
          {vertical} {count}
        </span>
      ))}
      {rest > 0 && (
        <span className="text-[10px] px-1.5 py-0.5" style={{ color: C.muted }}>
          +{rest}
        </span>
      )}
    </div>
  );
}

/** State axis card for system summary */
function StateCard({ title, items, colorMap, textColorMap }: {
  title: string;
  items: StatusCount[];
  colorMap: Record<string, string>;
  textColorMap: Record<string, string>;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <div className="rounded-xl p-5 shadow-sm" style={{ backgroundColor: C.card }}>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.muted }}>{title}</h3>
      <div className="space-y-2">
        {items.map((item) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          const bgColor = colorMap[item.status] ?? '#F3F4F6';
          const txtColor = textColorMap[item.status] ?? C.muted;
          return (
            <div key={item.status} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium" style={{ color: C.text }}>
                    {item.status === 'NULL' ? 'Not set' : item.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: txtColor }}>
                    {item.count.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${C.border}22` }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: bgColor, minWidth: item.count > 0 ? 4 : 0 }}
                  />
                </div>
              </div>
              <span className="text-[10px] font-medium w-8 text-right" style={{ color: C.muted }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
