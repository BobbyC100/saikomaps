/**
 * Admin Coverage Ops — 4-tab operations dashboard.
 * Tabs: Overview, Tier Health, Pipeline, Neighborhoods.
 * All server-rendered from raw SQL (lib/admin/coverage/sql.ts).
 */

import Link from 'next/link';
import { runOne, runMany } from '@/lib/admin/coverage/run';
import {
  OVERVIEW_COUNTS_SQL,
  TIER_COMPLETION_SQL,
  ENRICHMENT_STAGE_SQL,
  RECENT_RUNS_SQL,
  TIER_FIELD_STATS_SQL,
  TIER1_ISSUES_SQL,
  ALL_NEIGHBORHOOD_SCORECARD_SQL,
} from '@/lib/admin/coverage/sql';
import type {
  OverviewCounts,
  TierCompletion,
  EnrichmentStage,
  RecentRun,
  TierFieldStat,
  Tier1Issue,
  NeighborhoodScorecard,
} from '@/lib/admin/coverage/types';
import { CopyCommandButton, RedFlagActions } from './components/ActionButtons';

export const dynamic = 'force-dynamic';

// ── Helpers ──
function bn(v: bigint | number): string { return Number(v).toLocaleString(); }
function pct(n: bigint | number, d: bigint | number): string {
  const num = Number(n), den = Number(d);
  if (den === 0) return '—';
  return `${((num / den) * 100).toFixed(1)}%`;
}
function pctNum(n: bigint | number, d: bigint | number): number {
  const num = Number(n), den = Number(d);
  if (den === 0) return 0;
  return (num / den) * 100;
}
function pctColor(v: number): string {
  if (v >= 90) return 'text-green-600';
  if (v >= 60) return 'text-yellow-600';
  return 'text-red-600';
}
function barColor(v: number): string {
  if (v >= 90) return 'bg-green-500';
  if (v >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

const VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'tiers', label: 'Tier Health' },
  { id: 'pipeline', label: 'Enrichment Tools' },
  { id: 'neighborhoods', label: 'Neighborhoods' },
] as const;

type View = (typeof VIEWS)[number]['id'];

// ── Page ──
export default async function AdminCoveragePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const view = (VIEWS.some((v) => v.id === sp.view) ? sp.view : 'overview') as View;

  return (
    <div className="min-h-screen bg-[#F5F0E1] py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#36454F]">Coverage Ops</h1>
            <p className="text-[#8B7355] text-sm">Data quality triage &amp; enrichment pipeline</p>
          </div>
          <Link href="/admin" className="text-sm text-[#8B7355] hover:text-[#36454F]">&larr; Admin</Link>
        </header>

        {/* Tab nav */}
        <nav className="flex space-x-1 border-b border-[#C3B091]/40 mb-8">
          {VIEWS.map((v) => (
            <Link
              key={v.id}
              href={`/admin/coverage?view=${v.id}`}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                view === v.id
                  ? 'border-[#36454F] text-[#36454F]'
                  : 'border-transparent text-[#8B7355] hover:text-[#36454F] hover:border-[#C3B091]'
              }`}
            >
              {v.label}
            </Link>
          ))}
        </nav>

        {/* View content */}
        {view === 'overview' && <OverviewView />}
        {view === 'tiers' && <TierHealthView />}
        {view === 'pipeline' && <PipelineView />}
        {view === 'neighborhoods' && <NeighborhoodsView />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1: OVERVIEW (enhanced with tier bars + enrichment funnel)
// ══════════════════════════════════════════════════════════════════════════════

async function OverviewView() {
  const [counts, tiers, stages] = await Promise.all([
    runOne<OverviewCounts>(OVERVIEW_COUNTS_SQL),
    runOne<TierCompletion>(TIER_COMPLETION_SQL),
    runMany<EnrichmentStage>(ENRICHMENT_STAGE_SQL),
  ]);

  const total = Number(counts.total_db);
  const gpidPct = total > 0 ? ((Number(counts.has_gpid) / total) * 100).toFixed(0) : '0';

  const cards = [
    { label: 'Total Entities', value: bn(counts.total_db), sub: `${bn(counts.neighborhoods)} neighborhoods` },
    { label: 'OPEN', value: bn(counts.open_count), sub: 'Enriched / active' },
    { label: 'CANDIDATE', value: bn(counts.candidate_count), sub: 'Needs enrichment' },
    { label: 'Has GPID', value: bn(counts.has_gpid), sub: `${gpidPct}% identified` },
    { label: 'Published', value: bn(counts.reachable), sub: 'On a list' },
  ];

  // Tier completion bars
  const tierBars = [
    { label: 'Tier 1 — Identity', desc: 'slug + name + latlng + GPID', complete: Number(tiers.tier1_complete), total: Number(tiers.total) },
    { label: 'Tier 2 — Operational', desc: 'hours + phone + website', complete: Number(tiers.tier2_complete), total: Number(tiers.total) },
    { label: 'Tier 3 — Enrichment', desc: 'instagram + neighborhood', complete: Number(tiers.tier3_complete), total: Number(tiers.total) },
  ];

  // Enrichment funnel from stage data
  const noneCount = stages.find(s => s.stage === 'none')?.count ?? 0;
  const completeCount = stages.find(s => s.stage === '7')?.count ?? 0;
  const inProgressCount = stages
    .filter(s => s.stage !== 'none' && s.stage !== '7')
    .reduce((sum, s) => sum + s.count, 0);
  const publishedCount = Number(counts.reachable);

  const funnel = [
    { label: 'Never Enriched', count: noneCount, color: 'bg-stone-200 text-stone-700' },
    { label: 'In Progress', count: inProgressCount, color: 'bg-blue-100 text-blue-700' },
    { label: 'Fully Enriched', count: completeCount, color: 'bg-green-100 text-green-700' },
    { label: 'Published', count: publishedCount, color: 'bg-emerald-100 text-emerald-700' },
  ];

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-xs text-[#8B7355] mb-1">{c.label}</div>
            <div className="text-2xl font-bold text-[#36454F]">{c.value}</div>
            {c.sub && <div className="text-xs text-[#8B7355] mt-1">{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* Tier completion bars */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-bold text-[#36454F] mb-4">Tier Completion</h2>
        <div className="space-y-4">
          {tierBars.map((t) => {
            const p = t.total > 0 ? (t.complete / t.total) * 100 : 0;
            return (
              <div key={t.label}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-medium text-[#36454F]">{t.label}</span>
                    <span className="text-xs text-[#8B7355] ml-2">{t.desc}</span>
                  </div>
                  <span className={`text-sm font-bold ${pctColor(p)}`}>
                    {bn(t.complete)} / {bn(t.total)} ({p.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-3">
                  <div className={`h-3 rounded-full transition-all ${barColor(p)}`} style={{ width: `${Math.min(p, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enrichment funnel */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#36454F] mb-4">Enrichment Funnel</h2>
        <div className="flex items-center gap-2">
          {funnel.map((f, i) => (
            <div key={f.label} className="flex items-center gap-2">
              <div className={`rounded-lg px-4 py-3 text-center ${f.color}`}>
                <div className="text-2xl font-bold">{f.count.toLocaleString()}</div>
                <div className="text-xs font-medium mt-0.5">{f.label}</div>
              </div>
              {i < funnel.length - 1 && (
                <svg className="w-5 h-5 text-[#C3B091]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2: TIER HEALTH (replaces Missing Fields, Red Flags, Field Breakdown, Tier 2)
// ══════════════════════════════════════════════════════════════════════════════

async function TierHealthView() {
  const [fieldStats, tier1Issues, stages] = await Promise.all([
    runMany<TierFieldStat>(TIER_FIELD_STATS_SQL),
    runMany<Tier1Issue>(TIER1_ISSUES_SQL),
    runMany<EnrichmentStage>(ENRICHMENT_STAGE_SQL),
  ]);

  const tierGroups = [
    { tier: 1, label: 'Tier 1 — Identity', desc: 'slug, name, latlng, GPID' },
    { tier: 2, label: 'Tier 2 — Operational', desc: 'hours, phone, website, price, menu, reservation' },
    { tier: 3, label: 'Tier 3 — Enrichment', desc: 'instagram, neighborhood, description' },
  ];

  // Compute avg coverage per tier for summary strip
  const tierSummaries = tierGroups.map((group) => {
    const fields = fieldStats.filter((f) => Number(f.tier) === group.tier);
    const avgCoverage = fields.length > 0
      ? fields.reduce((sum, f) => sum + pctNum(f.has, f.total), 0) / fields.length
      : 0;
    return { ...group, avgCoverage, fieldCount: fields.length };
  });

  // ERA stage data
  const totalEntities = stages.reduce((sum, s) => sum + s.count, 0);
  const stageLabels: Record<string, string> = {
    'none': 'Not Started',
    '1': 'Stage 1 — Google Identity',
    '2': 'Stage 2 — Surface Discovery',
    '3': 'Stage 3 — Surface Fetch',
    '4': 'Stage 4 — Surface Parse',
    '5': 'Stage 5 — AI Identity',
    '6': 'Stage 6 — Website Enrichment',
    '7': 'Stage 7 — Tagline Gen (Complete)',
  };

  return (
    <div className="space-y-6">
      {/* ── Summary strip: all tiers at a glance ── */}
      <div className="grid grid-cols-3 gap-4">
        {tierSummaries.map((t) => (
          <div key={t.tier} className="bg-white rounded-xl p-5 shadow-sm text-center">
            <div className="text-xs text-[#8B7355] mb-1">{t.label}</div>
            <div className={`text-3xl font-bold ${pctColor(t.avgCoverage)}`}>{t.avgCoverage.toFixed(0)}%</div>
            <div className="text-xs text-[#8B7355] mt-1">{t.desc}</div>
            <div className="mt-3 w-full bg-stone-100 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full ${barColor(t.avgCoverage)}`} style={{ width: `${Math.min(t.avgCoverage, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── ERA Pipeline Progress ── */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#36454F] mb-1">ERA Pipeline Progress</h2>
        <p className="text-sm text-[#8B7355] mb-4">{totalEntities} entities — how far through the enrichment pipeline</p>
        <div className="space-y-2">
          {stages.map((s) => {
            const p = totalEntities > 0 ? (s.count / totalEntities) * 100 : 0;
            const isNone = s.stage === 'none';
            const isComplete = s.stage === '7';
            return (
              <div key={s.stage} className="flex items-center gap-3">
                <div className="w-56 text-sm text-[#36454F] truncate font-medium">
                  {stageLabels[s.stage] ?? `Stage ${s.stage}`}
                </div>
                <div className="flex-1 bg-stone-100 rounded-full h-5 relative">
                  <div
                    className={`h-5 rounded-full transition-all ${isComplete ? 'bg-green-500' : isNone ? 'bg-stone-300' : 'bg-blue-400'}`}
                    style={{ width: `${Math.max(p, 1)}%` }}
                  />
                </div>
                <div className={`w-20 text-right text-sm font-bold ${isComplete ? 'text-green-600' : isNone ? 'text-stone-500' : 'text-blue-600'}`}>
                  {s.count.toLocaleString()}
                </div>
                <div className="w-14 text-right text-xs text-[#8B7355]">{p.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Per-tier field breakdowns ── */}
      {tierGroups.map((group) => {
        const fields = fieldStats.filter((f) => Number(f.tier) === group.tier);
        const avgCoverage = fields.length > 0
          ? fields.reduce((sum, f) => sum + pctNum(f.has, f.total), 0) / fields.length
          : 0;

        return (
          <div key={group.tier} className="bg-white rounded-xl p-6 shadow-sm">
            {/* Tier header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#36454F]">{group.label}</h2>
                <p className="text-sm text-[#8B7355]">{group.desc}</p>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${pctColor(avgCoverage)}`}>{avgCoverage.toFixed(1)}%</div>
                <div className="text-xs text-[#8B7355]">avg field coverage</div>
              </div>
            </div>

            {/* Field stats table */}
            <table className="w-full text-left text-sm mb-4">
              <thead>
                <tr className="border-b border-[#C3B091]/40">
                  <th className="py-2 pr-4 text-[#8B7355] font-medium">Field</th>
                  <th className="py-2 pr-4 text-[#8B7355] font-medium text-right">Has</th>
                  <th className="py-2 pr-4 text-[#8B7355] font-medium text-right">Missing</th>
                  <th className="py-2 pr-4 text-[#8B7355] font-medium text-right">Coverage</th>
                  <th className="py-2 text-[#8B7355] font-medium" style={{ width: '40%' }}>Bar</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => {
                  const p = pctNum(f.has, f.total);
                  return (
                    <tr key={f.field} className="border-b border-[#C3B091]/20">
                      <td className="py-2 pr-4 text-[#36454F] font-mono text-xs">{f.field}</td>
                      <td className="py-2 pr-4 text-right text-green-600 font-medium">{Number(f.has).toLocaleString()}</td>
                      <td className={`py-2 pr-4 text-right font-medium ${Number(f.missing) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {Number(f.missing).toLocaleString()}
                      </td>
                      <td className={`py-2 pr-4 text-right font-medium ${pctColor(p)}`}>{p.toFixed(1)}%</td>
                      <td className="py-2">
                        <div className="w-full bg-stone-100 rounded-full h-2">
                          <div className={`h-2 rounded-full ${barColor(p)}`} style={{ width: `${Math.min(p, 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Tier 1 drill-down: entities with issues */}
            {group.tier === 1 && tier1Issues.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-[#36454F] hover:text-[#8B7355]">
                  {tier1Issues.length} entities with Tier 1 issues (expand)
                </summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#C3B091]/40">
                        <th className="py-2 pr-3 text-[#8B7355] font-medium">Name</th>
                        <th className="py-2 pr-3 text-[#8B7355] font-medium">Slug</th>
                        <th className="py-2 pr-3 text-[#8B7355] font-medium">Neighborhood</th>
                        <th className="py-2 pr-3 text-[#8B7355] font-medium text-center">Status</th>
                        <th className="py-2 pr-3 text-[#8B7355] font-medium">Issues</th>
                        <th className="py-2 text-[#8B7355] font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tier1Issues.map((e) => (
                        <tr key={e.id} className="border-b border-[#C3B091]/20">
                          <td className="py-2 pr-3 text-[#36454F] font-medium">{e.name || '(no name)'}</td>
                          <td className="py-2 pr-3 font-mono text-xs text-[#36454F]">{e.slug ?? '(none)'}</td>
                          <td className="py-2 pr-3 text-[#8B7355]">{e.neighborhood}</td>
                          <td className="py-2 pr-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              e.entity_status === 'CANDIDATE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                            }`}>{e.entity_status}</span>
                          </td>
                          <td className="py-2 pr-3">
                            <div className="flex flex-wrap gap-1">
                              {(Array.isArray(e.issues) ? e.issues : []).map((issue) => (
                                <span key={issue} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">{issue}</span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2 text-right">
                            <RedFlagActions placeId={e.id} slug={e.slug} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3: PIPELINE (enrichment stage histogram + tool inventory + recent runs)
// ══════════════════════════════════════════════════════════════════════════════

// Static tool inventory
const TOOL_INVENTORY = [
  { name: 'Social discovery', command: 'node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/discover-social.ts --mode=instagram --limit=50', cost: 'Free', fields: 'instagram, tiktok handles', costColor: 'text-green-600' },
  { name: 'Website fetch + parse', command: 'node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/scan-merchant-surfaces.ts', cost: 'Free', fields: 'menu, reservation, hours, phone, about', costColor: 'text-green-600' },
  { name: 'Populate canonical', command: 'node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/populate-canonical-state.ts', cost: 'Free', fields: 'Evidence → canonical_entity_state', costColor: 'text-green-600' },
  { name: 'Website enrichment', command: 'npm run enrich:website', cost: 'Free', fields: 'Website crawl + parse', costColor: 'text-green-600' },
  { name: 'Menu URL sync', command: 'npm run signals:menu:sync:local', cost: 'Free', fields: 'menu_url from merchant signals', costColor: 'text-green-600' },
  { name: 'ERA pipeline (full)', command: 'node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/enrich-place.ts --slug=SLUG', cost: 'OpenAI $$', fields: 'All stages (1-7)', costColor: 'text-yellow-600' },
  { name: 'ERA: identity signals', command: 'node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/enrich-place.ts --slug=SLUG --only=5', cost: 'OpenAI $', fields: 'AI identity extraction', costColor: 'text-yellow-600' },
  { name: 'ERA: tagline gen', command: 'node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/enrich-place.ts --slug=SLUG --only=7', cost: 'OpenAI $', fields: 'Tagline generation', costColor: 'text-yellow-600' },
  { name: 'Google enrich', command: 'npm run enrich:google', cost: 'Google $', fields: 'Google Places identity data', costColor: 'text-red-600' },
  { name: 'Coverage apply (Google)', command: 'npm run coverage:apply:neon -- --apply --limit=50', cost: 'Google $$', fields: 'hours, phone, latlng, photos, price_level', costColor: 'text-red-600' },
];

async function PipelineView() {
  const recentRuns = await runMany<RecentRun>(RECENT_RUNS_SQL);

  return (
    <div className="space-y-6">
      {/* Tool inventory */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#36454F] mb-1">Tool Inventory</h2>
        <p className="text-sm text-[#8B7355] mb-4">All enrichment tools — free tools first, paid as fallback</p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#C3B091]/40">
              <th className="py-2 pr-4 text-[#8B7355] font-medium">Tool</th>
              <th className="py-2 pr-4 text-[#8B7355] font-medium">Cost</th>
              <th className="py-2 pr-4 text-[#8B7355] font-medium">Fields</th>
              <th className="py-2 text-[#8B7355] font-medium text-right">Run</th>
            </tr>
          </thead>
          <tbody>
            {TOOL_INVENTORY.map((tool) => (
              <tr key={tool.name} className="border-b border-[#C3B091]/20">
                <td className="py-2.5 pr-4 text-[#36454F] font-medium">{tool.name}</td>
                <td className={`py-2.5 pr-4 text-xs font-bold ${tool.costColor}`}>{tool.cost}</td>
                <td className="py-2.5 pr-4 text-[#8B7355] text-xs">{tool.fields}</td>
                <td className="py-2.5 text-right">
                  <CopyCommandButton command={tool.command} label="Copy" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent runs */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#36454F] mb-1">Recent Enrichment Runs</h2>
        <p className="text-sm text-[#8B7355] mb-4">Last 15 entries from place_coverage_status</p>
        {recentRuns.length === 0 ? (
          <p className="text-center text-[#8B7355] py-8">No enrichment runs recorded yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#C3B091]/40">
                <th className="py-2 pr-3 text-[#8B7355] font-medium">Entity</th>
                <th className="py-2 pr-3 text-[#8B7355] font-medium">Slug</th>
                <th className="py-2 pr-3 text-[#8B7355] font-medium">Source</th>
                <th className="py-2 pr-3 text-[#8B7355] font-medium text-center">Status</th>
                <th className="py-2 text-[#8B7355] font-medium text-right">Last Attempt</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((r) => (
                <tr key={r.id} className="border-b border-[#C3B091]/20">
                  <td className="py-2 pr-3 text-[#36454F] font-medium">{r.entity_name}</td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {r.slug ? (
                      <Link href={`/place/${r.slug}`} className="text-blue-600 hover:underline">{r.slug}</Link>
                    ) : '(none)'}
                  </td>
                  <td className="py-2 pr-3 text-[#8B7355] text-xs">{r.source ?? '—'}</td>
                  <td className="py-2 pr-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.run_status === 'COMPLETE' ? 'bg-green-100 text-green-700' :
                      r.run_status === 'ERROR' ? 'bg-red-100 text-red-700' :
                      'bg-stone-100 text-stone-600'
                    }`}>{r.run_status ?? 'PENDING'}</span>
                  </td>
                  <td className="py-2 text-right text-xs text-[#8B7355]">
                    {r.last_attempt_at ? new Date(r.last_attempt_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4: NEIGHBORHOODS (kept as-is)
// ══════════════════════════════════════════════════════════════════════════════

async function NeighborhoodsView() {
  const rows = await runMany<NeighborhoodScorecard>(ALL_NEIGHBORHOOD_SCORECARD_SQL);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm overflow-x-auto">
      <h2 className="text-xl font-bold text-[#36454F] mb-1">Neighborhood Scorecard</h2>
      <p className="text-sm text-[#8B7355] mb-4">Neighborhoods with 3+ entities, sorted by Tier 1 completion (worst first)</p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#C3B091]/40">
            <th className="py-2 pr-3 text-[#8B7355] font-medium">Neighborhood</th>
            <th className="py-2 pr-3 text-[#8B7355] font-medium text-right">Places</th>
            <th className="py-2 pr-3 text-[#8B7355] font-medium text-right">Tier 1 %</th>
            <th className="py-2 pr-3 text-[#8B7355] font-medium text-right">Slug</th>
            <th className="py-2 pr-3 text-[#8B7355] font-medium text-right">Name</th>
            <th className="py-2 pr-3 text-[#8B7355] font-medium text-right">LatLng</th>
            <th className="py-2 pr-3 text-[#8B7355] font-medium text-right">GPID</th>
            <th className="py-2 pr-3 text-[#8B7355] font-medium text-right">Hours</th>
            <th className="py-2 pr-3 text-[#8B7355] font-medium text-right">Phone</th>
            <th className="py-2 text-[#8B7355] font-medium text-right">Website</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const places = Number(r.places ?? r.entities);
            const t1pct = places > 0 ? (Number(r.tier1_complete) / places) * 100 : 0;
            return (
              <tr key={r.neighborhood} className="border-b border-[#C3B091]/20">
                <td className="py-2 pr-3 text-[#36454F] font-medium">{r.neighborhood}</td>
                <td className="py-2 pr-3 text-right text-[#36454F]">{bn(places)}</td>
                <td className={`py-2 pr-3 text-right font-medium ${t1pct < 80 ? 'text-red-600' : t1pct < 100 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {t1pct.toFixed(0)}%
                </td>
                <td className="py-2 pr-3 text-right text-[#8B7355]">{bn(r.has_slug)}</td>
                <td className="py-2 pr-3 text-right text-[#8B7355]">{bn(r.has_name)}</td>
                <td className="py-2 pr-3 text-right text-[#8B7355]">{bn(r.has_latlng)}</td>
                <td className="py-2 pr-3 text-right text-[#8B7355]">{bn(r.has_google_id)}</td>
                <td className="py-2 pr-3 text-right text-[#8B7355]">{bn(r.has_hours)}</td>
                <td className="py-2 pr-3 text-right text-[#8B7355]">{bn(r.has_phone)}</td>
                <td className="py-2 text-right text-[#8B7355]">{bn(r.has_website)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
