/**
 * Admin Coverage Ops — tabbed operations dashboard.
 * Views: Overview, Missing Fields, Neighborhoods, Red Flags, Field Breakdown, Tier 2 Visit Facts.
 * All server-rendered from raw SQL (lib/admin/coverage/sql.ts).
 */

import Link from 'next/link';
import { runOne, runMany } from '@/lib/admin/coverage/run';
import {
  OVERVIEW_COUNTS_SQL,
  REACHABLE_NOT_ACTIVE_SANITY_SQL,
  REACHABLE_MISSING_FIELDS_SQL,
  REACHABLE_NEIGHBORHOOD_SCORECARD_SQL,
  REACHABLE_REDFLAGS_SQL,
  FIELDS_BREAKDOWN_REACHABLE_SQL,
  FIELDS_BREAKDOWN_ADDRESSABLE_SQL,
  FIELDS_BREAKDOWN_TOTALDB_SQL,
} from '@/lib/admin/coverage/sql';
import type {
  OverviewCounts,
  ReachableNotActiveSanity,
  MissingFieldRow,
  NeighborhoodScorecard,
  RedFlag,
  FieldBreakdown,
} from '@/lib/admin/coverage/types';
import { db } from '@/lib/db';
import { CopyCommandButton, RedFlagActions, Tier2PlaceActions, BulkActionBar } from './components/ActionButtons';

export const dynamic = 'force-dynamic';

// Tier 2 visit-facts detection (inline, same as CoverageContent)
type Tier2Issue =
  | 'missing_hours'
  | 'missing_price_level'
  | 'missing_menu_link'
  | 'missing_reservations'
  | 'operating_status_unknown'
  | 'google_says_closed';

const PRICE_LEVEL_VERTICALS = new Set(['EAT', 'COFFEE', 'WINE', 'DRINKS', 'BAKERY']);
const MENU_VERTICALS = new Set(['EAT', 'COFFEE', 'WINE', 'DRINKS', 'BAKERY', 'PURVEYORS']);
const RESERVATION_VERTICALS = new Set(['EAT', 'WINE', 'DRINKS', 'STAY']);

const TIER2_META: Record<Tier2Issue, { label: string; action: string }> = {
  missing_hours: { label: 'Missing Opening Hours', action: 'Run coverage:apply (Google details hours)' },
  missing_price_level: { label: 'Missing Price Level', action: 'Run coverage:apply (Google attrs/details)' },
  missing_menu_link: { label: 'Missing Menu Link', action: 'Run scan-merchant-surfaces → populate-canonical-state' },
  missing_reservations: { label: 'Missing Reservation Link', action: 'Run scan-merchant-surfaces → populate-canonical-state' },
  operating_status_unknown: { label: 'Operating Status Unknown', action: 'Run coverage:apply to refresh business status' },
  google_says_closed: { label: 'Google Says Closed', action: 'Verify closure, then run place:close if confirmed' },
};

function hasVal(v: unknown) { return v !== null && v !== undefined; }
function hasText(v: string | null | undefined) { return typeof v === 'string' && v.trim().length > 0; }
function canonFirst<T>(c: T | null | undefined, f: T | null | undefined): T | null {
  return c ?? f ?? null;
}

function detectTier2(place: {
  primary_vertical: string | null; googlePlaceId: string | null; businessStatus: string | null;
  hours: unknown; priceLevel: number | null; reservationUrl: string | null;
  canonical_state: { hours_json: unknown; price_level: number | null; reservation_url: string | null; menu_url: string | null } | null;
}): Tier2Issue[] {
  const issues: Tier2Issue[] = [];
  const v = place.primary_vertical;
  const ces = place.canonical_state;
  if (!hasVal(canonFirst(ces?.hours_json, place.hours))) issues.push('missing_hours');
  if (v && PRICE_LEVEL_VERTICALS.has(v) && !hasVal(canonFirst(ces?.price_level, place.priceLevel))) issues.push('missing_price_level');
  if (v && MENU_VERTICALS.has(v) && !hasText(ces?.menu_url)) issues.push('missing_menu_link');
  if (v && RESERVATION_VERTICALS.has(v) && !hasText(canonFirst(ces?.reservation_url, place.reservationUrl))) issues.push('missing_reservations');
  if (place.googlePlaceId && !hasText(place.businessStatus)) issues.push('operating_status_unknown');
  if (place.businessStatus === 'CLOSED_PERMANENTLY') issues.push('google_says_closed');
  return issues;
}

// ── Helpers ──
function bn(v: bigint | number): string { return Number(v).toLocaleString(); }
function pct(n: bigint | number, d: bigint | number): string {
  const num = Number(n), den = Number(d);
  if (den === 0) return '—';
  return `${((num / den) * 100).toFixed(1)}%`;
}

const VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'missing', label: 'Missing Fields' },
  { id: 'neighborhoods', label: 'Neighborhoods' },
  { id: 'redflags', label: 'Red Flags' },
  { id: 'breakdown', label: 'Field Breakdown' },
  { id: 'tier2', label: 'Tier 2 Visit Facts' },
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
            <p className="text-[#8B7355] text-sm">Data quality triage &amp; coverage gaps</p>
          </div>
          <Link href="/admin" className="text-sm text-[#8B7355] hover:text-[#36454F]">← Admin</Link>
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
        {view === 'missing' && <MissingFieldsView />}
        {view === 'neighborhoods' && <NeighborhoodsView />}
        {view === 'redflags' && <RedFlagsView />}
        {view === 'breakdown' && <BreakdownView />}
        {view === 'tier2' && <Tier2View />}
      </div>
    </div>
  );
}

// ── Overview ──
async function OverviewView() {
  const [counts, sanity] = await Promise.all([
    runOne<OverviewCounts>(OVERVIEW_COUNTS_SQL),
    runOne<ReachableNotActiveSanity>(REACHABLE_NOT_ACTIVE_SANITY_SQL),
  ]);

  const cards = [
    { label: 'Total DB', value: bn(counts.total_db) },
    { label: 'Addressable (has slug)', value: bn(counts.addressable) },
    { label: 'Reachable (on published list)', value: bn(counts.reachable) },
    { label: 'Dark Inventory', value: bn(counts.dark_inventory), sub: 'Addressable but not reachable' },
  ];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-xs text-[#8B7355] mb-1">{c.label}</div>
            <div className="text-2xl font-bold text-[#36454F]">{c.value}</div>
            {c.sub && <div className="text-xs text-[#8B7355] mt-1">{c.sub}</div>}
          </div>
        ))}
      </div>
      {Number(sanity.reachable_not_active) > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          ⚠ {bn(sanity.reachable_not_active)} reachable entities are closed/missing — sanity check failed
        </div>
      )}
    </>
  );
}

// ── Missing Fields ──
async function MissingFieldsView() {
  const rows = await runMany<MissingFieldRow>(REACHABLE_MISSING_FIELDS_SQL);
  const TIER1 = new Set(['slug', 'name', 'latlng', 'google_place_id']);
  const TIER2 = new Set(['hours', 'phone', 'website']);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-[#36454F] mb-1">Missing Fields — Reachable Cohort</h2>
          <p className="text-sm text-[#8B7355]">Places on at least one published list</p>
        </div>
        <div className="flex gap-2">
          <CopyCommandButton command="npm run coverage:apply:neon -- --apply" label="Copy: coverage:apply" variant="warning" />
          <CopyCommandButton command="npm run enrich:google" label="Copy: enrich:google" />
        </div>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#C3B091]/40">
            <th className="py-2 pr-4 text-[#8B7355] font-medium">Field</th>
            <th className="py-2 pr-4 text-[#8B7355] font-medium">Tier</th>
            <th className="py-2 text-[#8B7355] font-medium text-right">Missing</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const tier = TIER1.has(r.field) ? 'Tier 1' : TIER2.has(r.field) ? 'Tier 2' : 'Tier 3';
            const missing = Number(r.missing);
            return (
              <tr key={r.field} className="border-b border-[#C3B091]/20">
                <td className="py-2 pr-4 text-[#36454F] font-mono text-xs">{r.field}</td>
                <td className="py-2 pr-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    tier === 'Tier 1' ? 'bg-red-100 text-red-700' :
                    tier === 'Tier 2' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-stone-100 text-stone-600'
                  }`}>{tier}</span>
                </td>
                <td className={`py-2 text-right font-medium ${missing > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {bn(r.missing)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Neighborhoods ──
async function NeighborhoodsView() {
  const rows = await runMany<NeighborhoodScorecard>(REACHABLE_NEIGHBORHOOD_SCORECARD_SQL);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm overflow-x-auto">
      <h2 className="text-xl font-bold text-[#36454F] mb-1">Neighborhood Scorecard — Reachable</h2>
      <p className="text-sm text-[#8B7355] mb-4">Neighborhoods with 5+ places, sorted by Tier 1 completion (worst first)</p>
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

// ── Red Flags ──
async function RedFlagsView() {
  const rows = await runMany<RedFlag>(REACHABLE_REDFLAGS_SQL);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-[#36454F] mb-1">Red Flags — Reachable Tier 1 Failures</h2>
          <p className="text-sm text-[#8B7355]">Places on published lists missing critical fields (top 200 by severity)</p>
        </div>
        <CopyCommandButton command="npm run coverage:apply:neon -- --apply" label="Copy: coverage:apply (bulk fix)" variant="warning" />
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#C3B091]/40">
            <th className="py-2 pr-3 text-[#8B7355] font-medium">Name</th>
            <th className="py-2 pr-3 text-[#8B7355] font-medium">Slug</th>
            <th className="py-2 pr-3 text-[#8B7355] font-medium">Neighborhood</th>
            <th className="py-2 pr-3 text-[#8B7355] font-medium text-center">Severity</th>
            <th className="py-2 pr-3 text-[#8B7355] font-medium">Issues</th>
            <th className="py-2 text-[#8B7355] font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-[#C3B091]/20">
              <td className="py-2 pr-3 text-[#36454F] font-medium">{r.name || '(no name)'}</td>
              <td className="py-2 pr-3 text-[#36454F] font-mono text-xs">{r.slug ?? '(none)'}</td>
              <td className="py-2 pr-3 text-[#8B7355]">{r.neighborhood}</td>
              <td className="py-2 pr-3 text-center">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  Number(r.severity) >= 3 ? 'bg-red-100 text-red-700' :
                  Number(r.severity) >= 2 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-stone-100 text-stone-600'
                }`}>{String(r.severity)}</span>
              </td>
              <td className="py-2 pr-3">
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(r.reasons) ? r.reasons : []).map((reason) => (
                    <span key={reason} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">
                      {reason}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-2 text-right">
                <RedFlagActions placeId={r.id} slug={r.slug} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="text-center text-[#8B7355] py-8">No Tier 1 red flags found.</p>
      )}
    </div>
  );
}

// ── Field Breakdown ──
async function BreakdownView() {
  const [reachable, addressable, totalDb] = await Promise.all([
    runOne<FieldBreakdown>(FIELDS_BREAKDOWN_REACHABLE_SQL),
    runOne<FieldBreakdown>(FIELDS_BREAKDOWN_ADDRESSABLE_SQL),
    runOne<FieldBreakdown>(FIELDS_BREAKDOWN_TOTALDB_SQL),
  ]);

  const fields = ['slug', 'name', 'latlng', 'google_id', 'hours', 'phone', 'website', 'instagram', 'neighborhood'] as const;
  const fieldKey = (f: string) => `has_${f}` as keyof FieldBreakdown;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm overflow-x-auto">
      <h2 className="text-xl font-bold text-[#36454F] mb-1">Field Breakdown — Cross-Cohort</h2>
      <p className="text-sm text-[#8B7355] mb-4">Coverage comparison across Reachable / Addressable / Total DB</p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#C3B091]/40">
            <th className="py-2 pr-4 text-[#8B7355] font-medium">Field</th>
            <th className="py-2 pr-4 text-[#8B7355] font-medium text-right">Reachable</th>
            <th className="py-2 pr-4 text-[#8B7355] font-medium text-right">%</th>
            <th className="py-2 pr-4 text-[#8B7355] font-medium text-right">Addressable</th>
            <th className="py-2 pr-4 text-[#8B7355] font-medium text-right">%</th>
            <th className="py-2 pr-4 text-[#8B7355] font-medium text-right">Total DB</th>
            <th className="py-2 text-[#8B7355] font-medium text-right">%</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-[#C3B091]/40 bg-stone-50">
            <td className="py-2 pr-4 text-[#36454F] font-medium italic">Total</td>
            <td className="py-2 pr-4 text-right text-[#36454F] font-medium">{bn(reachable.total)}</td>
            <td className="py-2 pr-4 text-right text-[#8B7355]">—</td>
            <td className="py-2 pr-4 text-right text-[#36454F] font-medium">{bn(addressable.total)}</td>
            <td className="py-2 pr-4 text-right text-[#8B7355]">—</td>
            <td className="py-2 pr-4 text-right text-[#36454F] font-medium">{bn(totalDb.total)}</td>
            <td className="py-2 text-right text-[#8B7355]">—</td>
          </tr>
          {fields.map((f) => {
            const k = fieldKey(f);
            return (
              <tr key={f} className="border-b border-[#C3B091]/20">
                <td className="py-2 pr-4 text-[#36454F] font-mono text-xs">{f}</td>
                <td className="py-2 pr-4 text-right text-[#36454F]">{bn(reachable[k])}</td>
                <td className="py-2 pr-4 text-right text-[#8B7355]">{pct(reachable[k], reachable.total)}</td>
                <td className="py-2 pr-4 text-right text-[#36454F]">{bn(addressable[k])}</td>
                <td className="py-2 pr-4 text-right text-[#8B7355]">{pct(addressable[k], addressable.total)}</td>
                <td className="py-2 pr-4 text-right text-[#36454F]">{bn(totalDb[k])}</td>
                <td className="py-2 text-right text-[#8B7355]">{pct(totalDb[k], totalDb.total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Tier 2 Visit Facts ──
async function Tier2View() {
  const tier2Rows = await db.entities.findMany({
    select: {
      id: true, slug: true, name: true, neighborhood: true,
      primary_vertical: true, googlePlaceId: true, businessStatus: true,
      hours: true, priceLevel: true, reservationUrl: true,
      canonical_state: {
        select: { hours_json: true, price_level: true, reservation_url: true, menu_url: true },
      },
    },
  });

  // Aggregate counts
  const counts: Record<Tier2Issue, number> = {
    missing_hours: 0, missing_price_level: 0, missing_menu_link: 0,
    missing_reservations: 0, operating_status_unknown: 0, google_says_closed: 0,
  };

  // Per-place issue list for drill-down
  const placeIssues: { id: string; slug: string | null; name: string; neighborhood: string | null; issues: Tier2Issue[] }[] = [];

  for (const row of tier2Rows) {
    const issues = detectTier2(row);
    for (const i of issues) counts[i]++;
    if (issues.length > 0) {
      placeIssues.push({ id: row.id, slug: row.slug, name: row.name, neighborhood: row.neighborhood, issues });
    }
  }

  // Sort by most issues first
  placeIssues.sort((a, b) => b.issues.length - a.issues.length);

  return (
    <>
      {/* Summary table */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-xl font-bold text-[#36454F] mb-1">Tier 2 Visit Facts Summary</h2>
        <p className="text-sm text-[#8B7355] mb-4">
          Canonical-first detection (canonical_entity_state → entities fallback) with vertical applicability gates
        </p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#C3B091]/40">
              <th className="py-2 pr-4 text-[#8B7355] font-medium">Issue</th>
              <th className="py-2 pr-4 text-[#8B7355] font-medium text-right">Count</th>
              <th className="py-2 pr-4 text-[#8B7355] font-medium">Action</th>
              <th className="py-2 text-[#8B7355] font-medium text-right">Run</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(TIER2_META) as Tier2Issue[]).map((key) => (
              <tr key={key} className="border-b border-[#C3B091]/20">
                <td className="py-2 pr-4 text-[#36454F]">
                  <div className="font-medium">{TIER2_META[key].label}</div>
                  <div className="text-xs text-[#8B7355] font-mono mt-0.5">{key}</div>
                </td>
                <td className={`py-2 pr-4 text-right font-medium ${counts[key] > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {counts[key].toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-[#8B7355] text-sm">{TIER2_META[key].action}</td>
                <td className="py-2 text-right">
                  <BulkActionBar issueType={key} count={counts[key]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-place drill-down */}
      <div className="bg-white rounded-xl p-6 shadow-sm overflow-x-auto">
        <h2 className="text-xl font-bold text-[#36454F] mb-1">Places with Issues ({placeIssues.length})</h2>
        <p className="text-sm text-[#8B7355] mb-4">Sorted by number of issues (worst first)</p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#C3B091]/40">
              <th className="py-2 pr-3 text-[#8B7355] font-medium">Name</th>
              <th className="py-2 pr-3 text-[#8B7355] font-medium">Slug</th>
              <th className="py-2 pr-3 text-[#8B7355] font-medium">Neighborhood</th>
              <th className="py-2 pr-3 text-[#8B7355] font-medium">Issues</th>
              <th className="py-2 text-[#8B7355] font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {placeIssues.slice(0, 100).map((p) => (
              <tr key={p.id} className="border-b border-[#C3B091]/20">
                <td className="py-2 pr-3 text-[#36454F] font-medium">{p.name}</td>
                <td className="py-2 pr-3 font-mono text-xs text-[#36454F]">
                  {p.slug ? (
                    <Link href={`/place/${p.slug}`} className="text-blue-600 hover:underline">{p.slug}</Link>
                  ) : '(none)'}
                </td>
                <td className="py-2 pr-3 text-[#8B7355]">{p.neighborhood ?? '(none)'}</td>
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap gap-1">
                    {p.issues.map((issue) => (
                      <span key={issue} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">
                        {TIER2_META[issue].label}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2 text-right">
                  <Tier2PlaceActions placeId={p.id} slug={p.slug} issues={p.issues} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {placeIssues.length > 100 && (
          <p className="text-sm text-[#8B7355] mt-4">Showing first 100 of {placeIssues.length} places.</p>
        )}
      </div>
    </>
  );
}
