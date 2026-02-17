/**
 * Data Coverage Audit Page
 * /admin/coverage
 * 
 * Internal admin surface for measuring structural completeness across cohorts:
 * - Reachable: places on published lists
 * - Addressable: active places with slugs
 * - Total DB: all active places
 */

import Link from 'next/link';
import { CoverageNav } from './components/CoverageNav';
import { SimpleTable } from './components/SimpleTable';
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
  MissingFieldWithTier,
  FieldTier,
  NeighborhoodScorecard,
  NeighborhoodScorecardWithPct,
  RedFlag,
  FieldBreakdown,
  CrossCohortRow,
} from '@/lib/admin/coverage/types';

interface PageProps {
  searchParams: { view?: string; limit?: string };
}

export default async function CoveragePage({ searchParams }: PageProps) {
  const view = searchParams.view || 'overview';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Data Coverage Audit</h1>
        <p className="text-gray-600 mt-1">
          Structural completeness analysis across cohorts (Reachable → Addressable → Total DB)
        </p>
      </div>

      <CoverageNav currentView={view} />

      {view === 'overview' && <OverviewView />}
      {view === 'missing' && <MissingFieldsView />}
      {view === 'neighborhoods' && <NeighborhoodsView limit={searchParams.limit} />}
      {view === 'redflags' && <RedFlagsView />}
      {view === 'breakdown' && <FieldBreakdownView />}
    </div>
  );
}

// ============================================================================
// OVERVIEW VIEW
// ============================================================================

async function OverviewView() {
  const counts = await runOne<OverviewCounts>(OVERVIEW_COUNTS_SQL);
  const sanity = await runOne<ReachableNotActiveSanity>(REACHABLE_NOT_ACTIVE_SANITY_SQL);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Cohort Counts</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total DB" value={counts.total_db} description="Active places" />
        <StatCard label="Addressable" value={counts.addressable} description="Has slug" />
        <StatCard label="Reachable" value={counts.reachable} description="On published lists" />
        <StatCard 
          label="Dark Inventory" 
          value={counts.dark_inventory} 
          description="Addressable but not reachable"
          highlight
        />
      </div>

      {Number(sanity.reachable_not_active) > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Data Quality Warning</h3>
              <div className="mt-2 text-sm text-yellow-700">
                {sanity.reachable_not_active.toString()} places on published lists are not active or don't exist. This requires cleanup.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-sm text-gray-600">
        <h3 className="font-medium text-gray-900 mb-2">Cohort Definitions</h3>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Total DB:</strong> All active places (status != PERMANENTLY_CLOSED)</li>
          <li><strong>Addressable:</strong> Active places with a slug (publicly addressable)</li>
          <li><strong>Reachable:</strong> Places appearing on at least one PUBLISHED list</li>
          <li><strong>Dark Inventory:</strong> Places with slugs but not yet featured on any published list</li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  description, 
  highlight = false 
}: { 
  label: string; 
  value: bigint; 
  description: string;
  highlight?: boolean;
}) {
  return (
    <div className={`border rounded-lg p-4 ${highlight ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${highlight ? 'text-blue-600' : 'text-gray-900'}`}>
        {value.toString()}
      </div>
      <div className="text-xs text-gray-500 mt-1">{description}</div>
    </div>
  );
}

// ============================================================================
// MISSING FIELDS VIEW
// ============================================================================

async function MissingFieldsView() {
  const rows = await runMany<MissingFieldRow>(REACHABLE_MISSING_FIELDS_SQL);

  // Map fields to tiers
  const tierMap: Record<string, FieldTier> = {
    slug: 'Tier 1',
    name: 'Tier 1',
    latlng: 'Tier 1',
    google_place_id: 'Tier 1',
    hours: 'Tier 2',
    phone: 'Tier 2',
    website: 'Tier 2',
    instagram: 'Tier 3',
    neighborhood: 'Tier 3',
  };

  const rowsWithTier: MissingFieldWithTier[] = rows.map((row) => ({
    ...row,
    tier: tierMap[row.field] || 'Tier 3',
  }));

  const columns = [
    { key: 'tier', label: 'Tier' },
    { key: 'field', label: 'Field' },
    { key: 'missing', label: 'Missing Count' },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Missing Fields — Reachable Cohort</h2>
      <p className="text-sm text-gray-600 mb-6">
        Count of reachable places missing each field. Sorted by missing count (worst first).
      </p>

      <div className="mb-6 bg-gray-50 border rounded p-4 text-sm">
        <h3 className="font-medium mb-2">Field Tiers</h3>
        <ul className="space-y-1">
          <li><strong>Tier 1:</strong> Critical for core functionality (slug, name, latlng, google_place_id)</li>
          <li><strong>Tier 2:</strong> Important for UX (hours, phone, website)</li>
          <li><strong>Tier 3:</strong> Enhanced features (instagram, neighborhood)</li>
        </ul>
      </div>

      <SimpleTable columns={columns} rows={rowsWithTier} />
    </div>
  );
}

// ============================================================================
// NEIGHBORHOODS VIEW
// ============================================================================

async function NeighborhoodsView({ limit }: { limit?: string }) {
  const rows = await runMany<NeighborhoodScorecard>(REACHABLE_NEIGHBORHOOD_SCORECARD_SQL);

  const rowsWithPct: NeighborhoodScorecardWithPct[] = rows.map((row) => ({
    ...row,
    tier1_pct: Number(row.places) > 0 
      ? (Number(row.tier1_complete) / Number(row.places)) * 100 
      : 0,
  }));

  const displayRows = limit === 'all' ? rowsWithPct : rowsWithPct.slice(0, 25);
  const showAllLink = limit !== 'all' && rowsWithPct.length > 25;

  const columns = [
    { key: 'neighborhood', label: 'Neighborhood' },
    { key: 'places', label: 'Places' },
    { key: 'tier1_complete', label: 'Tier 1 Complete' },
    { key: 'tier1_pct', label: 'Tier 1 %' },
    { key: 'has_slug', label: 'Has Slug' },
    { key: 'has_name', label: 'Has Name' },
    { key: 'has_latlng', label: 'Has Lat/Lng' },
    { key: 'has_google_id', label: 'Has Google ID' },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Neighborhoods — Reachable Quality Ranking</h2>
      <p className="text-sm text-gray-600 mb-6">
        Neighborhoods with 5+ reachable places, sorted by Tier 1 completeness (worst first).
        Tier 1 = slug + name + latlng + google_place_id.
      </p>

      <SimpleTable columns={columns} rows={displayRows} />

      {showAllLink && (
        <div className="mt-4 text-center">
          <Link 
            href="/admin/coverage?view=neighborhoods&limit=all"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Show all {rowsWithPct.length} neighborhoods
          </Link>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// RED FLAGS VIEW
// ============================================================================

async function RedFlagsView() {
  const rows = await runMany<RedFlag>(REACHABLE_REDFLAGS_SQL);

  const columns = [
    { key: 'severity', label: 'Severity' },
    { key: 'name', label: 'Name' },
    { key: 'slug_link', label: 'Slug' },
    { key: 'neighborhood', label: 'Neighborhood' },
    { key: 'reasons', label: 'Issues' },
  ];

  const rowsWithLinks = rows.map((row) => ({
    ...row,
    slug_link: row.slug || row.id,
  }));

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Red Flags — Tier 1 Failures</h2>
      <p className="text-sm text-gray-600 mb-6">
        Reachable places missing critical Tier 1 fields. Sorted by severity (most issues first). Limited to 200 rows.
      </p>

      <div className="mb-6">
        <SimpleTable columns={columns} rows={rowsWithLinks} />
      </div>

      {rows.length === 200 && (
        <div className="text-sm text-gray-600 italic">
          Showing first 200 results. Total may be higher.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FIELD BREAKDOWN VIEW
// ============================================================================

async function FieldBreakdownView() {
  const [reachable, addressable, totalDb] = await Promise.all([
    runOne<FieldBreakdown>(FIELDS_BREAKDOWN_REACHABLE_SQL),
    runOne<FieldBreakdown>(FIELDS_BREAKDOWN_ADDRESSABLE_SQL),
    runOne<FieldBreakdown>(FIELDS_BREAKDOWN_TOTALDB_SQL),
  ]);

  const fields = [
    'slug',
    'name',
    'latlng',
    'google_id',
    'hours',
    'phone',
    'website',
    'instagram',
    'neighborhood',
  ];

  const crossCohortRows: CrossCohortRow[] = fields.map((field) => {
    const fieldKey = `has_${field}` as keyof FieldBreakdown;
    
    const reachableCount = reachable[fieldKey] as bigint;
    const reachableTotal = reachable.total;
    const reachablePct = Number(reachableTotal) > 0 
      ? (Number(reachableCount) / Number(reachableTotal)) * 100 
      : 0;

    const addressableCount = addressable[fieldKey] as bigint;
    const addressableTotal = addressable.total;
    const addressablePct = Number(addressableTotal) > 0 
      ? (Number(addressableCount) / Number(addressableTotal)) * 100 
      : 0;

    const totalDbCount = totalDb[fieldKey] as bigint;
    const totalDbTotal = totalDb.total;
    const totalDbPct = Number(totalDbTotal) > 0 
      ? (Number(totalDbCount) / Number(totalDbTotal)) * 100 
      : 0;

    return {
      field,
      reachable_count: reachableCount,
      reachable_pct: reachablePct,
      addressable_count: addressableCount,
      addressable_pct: addressablePct,
      total_db_count: totalDbCount,
      total_db_pct: totalDbPct,
    };
  });

  const columns = [
    { key: 'field', label: 'Field' },
    { key: 'reachable_count', label: 'Reachable Count' },
    { key: 'reachable_pct', label: 'Reachable %' },
    { key: 'addressable_count', label: 'Addressable Count' },
    { key: 'addressable_pct', label: 'Addressable %' },
    { key: 'total_db_count', label: 'Total DB Count' },
    { key: 'total_db_pct', label: 'Total DB %' },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Field Breakdown — Cross-Cohort Comparison</h2>
      <p className="text-sm text-gray-600 mb-6">
        Field completeness across all three cohorts. Shows count and percentage for each field.
      </p>

      <div className="mb-4 text-sm">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium">Reachable</div>
            <div className="text-2xl font-bold text-gray-900">{reachable.total.toString()}</div>
            <div className="text-xs text-gray-500">On published lists</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium">Addressable</div>
            <div className="text-2xl font-bold text-gray-900">{addressable.total.toString()}</div>
            <div className="text-xs text-gray-500">Has slug</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium">Total DB</div>
            <div className="text-2xl font-bold text-gray-900">{totalDb.total.toString()}</div>
            <div className="text-xs text-gray-500">All active</div>
          </div>
        </div>
      </div>

      <SimpleTable columns={columns} rows={crossCohortRows} />
    </div>
  );
}
