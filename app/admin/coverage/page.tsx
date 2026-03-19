'use client';

/**
 * Unified Coverage Dashboard
 *
 * Three views:
 *   1. Pipeline Funnel — where are entities in the enrichment pipeline?
 *   2. Action Queue — what can I do right now, grouped by tool?
 *   3. Neighborhoods — where do I have/lack coverage?
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardData {
  totalEntities: number;
  statuses: { status: string; count: number }[];
  funnel: {
    total: number;
    has_website: number;
    has_gpid: number;
    has_coords: number;
    has_surfaces: number;
    has_identity_signals: number;
    has_tagline: number;
  };
  actions: ActionBatch[];
  neighborhoods: NeighborhoodRow[];
  recentActivity: { date: string; enriched: number; created: number }[];
}

interface ActionBatch {
  label: string;
  description: string;
  tool: string;
  issueTypes: string[];
  count: number;
  blocking: number;
  severity: string;
}

interface NeighborhoodRow {
  neighborhood: string;
  total: number;
  has_gpid: number;
  has_website: number;
  has_tagline: number;
  avg_completion: number;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const C = {
  bg: '#F5F0E1',
  card: '#FFFFFF',
  text: '#36454F',
  muted: '#8B7355',
  accent: '#5BA7A7',
  border: '#C3B091',
  green: '#166534',
  greenBg: '#DCFCE7',
  amber: '#92400E',
  amberBg: '#FEF3C7',
  red: '#991B1B',
  redBg: '#FEE2E2',
} as const;

type ViewTab = 'funnel' | 'actions' | 'neighborhoods';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CoverageDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewTab>('funnel');
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/coverage-dashboard');
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error('Failed to load dashboard', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.bg }}>
        <div className="text-lg" style={{ color: C.muted }}>Loading dashboard...</div>
      </div>
    );
  }

  const f = data.funnel;
  const candidateCount = data.statuses.find(s => s.status === 'CANDIDATE')?.count ?? 0;
  const openCount = data.statuses.find(s => s.status === 'OPEN')?.count ?? 0;

  // Run an action batch
  const runAction = async (action: ActionBatch) => {
    setRunningAction(action.tool);
    try {
      let res: Response;
      if (action.tool === 'smart-enrich') {
        // Can't batch smart-enrich through the API without entity list — redirect to triage
        setToast({ message: 'Use Coverage Ops triage board for individual entity actions', type: 'success' });
        setRunningAction(null);
        return;
      } else if (action.tool === 'seed-gpid-queue') {
        res = await fetch('/api/admin/tools/seed-gpid-queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 200 }),
        });
      } else if (action.tool.startsWith('enrich-stage-')) {
        const stage = parseInt(action.tool.split('-').pop()!, 10);
        // This is a bulk suggestion — redirect to triage
        setToast({ message: `Run "npm run enrich:place -- --batch=50 --only=${stage}" for bulk Stage ${stage}`, type: 'success' });
        setRunningAction(null);
        return;
      } else if (action.tool === 'discover-social') {
        const mode = action.issueTypes.includes('missing_website') ? 'website'
          : action.issueTypes.includes('missing_instagram') ? 'instagram'
          : action.issueTypes.includes('missing_tiktok') ? 'tiktok' : 'both';
        res = await fetch('/api/admin/tools/discover-social', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, limit: 50 }),
        });
      } else {
        setToast({ message: `Open Coverage Ops triage for "${action.label}" actions`, type: 'success' });
        setRunningAction(null);
        return;
      }

      if (res!.ok) {
        const result = await res!.json();
        const matched = result.matched ?? 0;
        const queued = result.queued ?? 0;
        setToast({
          message: `${action.label}: ${matched} resolved, ${queued} queued`,
          type: 'success',
        });
        // Refresh data
        setTimeout(() => fetchData(), 2000);
      } else {
        setToast({ message: `${action.label} failed`, type: 'error' });
      }
    } catch {
      setToast({ message: `${action.label} failed`, type: 'error' });
    }
    setRunningAction(null);
  };

  return (
    <div className="min-h-screen py-8 px-6" style={{ backgroundColor: C.bg }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <header className="mb-6">
          <nav className="flex items-center gap-2 text-sm mb-2" style={{ color: C.muted }}>
            <Link href="/admin" className="hover:underline">Admin</Link>
            <span>/</span>
            <span className="font-medium" style={{ color: C.text }}>Coverage</span>
          </nav>
          <h1 className="text-3xl font-bold" style={{ color: C.text }}>Coverage Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>
            {data.totalEntities.toLocaleString()} entities &middot; {openCount} active &middot; {candidateCount} candidates
          </p>
        </header>

        {/* Tab Bar */}
        <div className="flex gap-1 mb-6 rounded-lg p-1" style={{ backgroundColor: C.card }}>
          {([
            { key: 'funnel' as ViewTab, label: 'Pipeline' },
            { key: 'actions' as ViewTab, label: 'Actions' },
            { key: 'neighborhoods' as ViewTab, label: 'Neighborhoods' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: view === tab.key ? C.accent : 'transparent',
                color: view === tab.key ? '#fff' : C.muted,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* View: Pipeline Funnel */}
        {view === 'funnel' && (
          <div>
            {/* Funnel Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <FunnelCard label="Active Entities" value={f.total} sub={`${candidateCount} candidates pending`} />
              <FunnelCard label="Have Website" value={f.has_website} pct={f.total > 0 ? Math.round(f.has_website / f.total * 100) : 0} color={C.accent} />
              <FunnelCard label="Have GPID" value={f.has_gpid} pct={f.total > 0 ? Math.round(f.has_gpid / f.total * 100) : 0} color={C.accent} />
              <FunnelCard label="Have Coords" value={f.has_coords} pct={f.total > 0 ? Math.round(f.has_coords / f.total * 100) : 0} color={C.accent} />
            </div>

            {/* Enrichment Progress */}
            <div className="rounded-xl p-6 shadow-sm mb-6" style={{ backgroundColor: C.card }}>
              <h2 className="text-base font-bold mb-4" style={{ color: C.text }}>Enrichment Pipeline</h2>
              <div className="space-y-3">
                <FunnelBar label="Website discovered" value={f.has_website} total={f.total} color="#5BA7A7" />
                <FunnelBar label="GPID resolved" value={f.has_gpid} total={f.total} color="#5BA7A7" />
                <FunnelBar label="Coordinates" value={f.has_coords} total={f.total} color="#5BA7A7" />
                <FunnelBar label="Surfaces scraped" value={f.has_surfaces} total={f.total} color="#E07A5F" />
                <FunnelBar label="AI signals extracted" value={f.has_identity_signals} total={f.total} color="#E07A5F" />
                <FunnelBar label="Tagline generated" value={f.has_tagline} total={f.total} color="#166534" />
              </div>
            </div>

            {/* Recent Activity */}
            {data.recentActivity.length > 0 && (
              <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: C.card }}>
                <h2 className="text-base font-bold mb-4" style={{ color: C.text }}>Last 7 Days</h2>
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
          </div>
        )}

        {/* View: Action Queue */}
        {view === 'actions' && (
          <div>
            <div className="rounded-xl shadow-sm overflow-hidden mb-6" style={{ backgroundColor: C.card }}>
              <div className="px-5 py-3 border-b" style={{ borderColor: `${C.border}33` }}>
                <h2 className="text-base font-bold" style={{ color: C.text }}>What to do next</h2>
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>Grouped by tool. Click to run.</p>
              </div>

              <div className="divide-y" style={{ borderColor: `${C.border}22` }}>
                {data.actions.map((action) => (
                  <div key={action.tool} className="flex items-center gap-4 px-5 py-4 hover:bg-[#F5F0E1]/30 transition-colors">
                    {/* Severity dot */}
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: action.severity === 'critical' ? C.red
                          : action.severity === 'high' ? C.amber
                          : action.severity === 'medium' ? C.accent
                          : C.border,
                      }}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: C.text }}>
                          {action.count.toLocaleString()} entities
                        </span>
                        <span className="text-sm" style={{ color: C.muted }}>
                          need {action.label.toLowerCase()}
                        </span>
                        {action.blocking > 0 && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{ backgroundColor: C.redBg, color: C.red }}
                          >
                            {action.blocking} blocking
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: C.muted }}>{action.description}</p>
                    </div>

                    {/* Action button */}
                    {action.tool === 'manual' ? (
                      <Link
                        href="/admin/coverage-ops"
                        className="px-4 py-1.5 rounded text-xs font-semibold shrink-0"
                        style={{ backgroundColor: C.bg, color: C.muted, border: `1px solid ${C.border}` }}
                      >
                        Review
                      </Link>
                    ) : (
                      <button
                        onClick={() => runAction(action)}
                        disabled={runningAction !== null}
                        className="px-4 py-1.5 rounded text-xs font-semibold shrink-0 disabled:opacity-50 transition-colors"
                        style={{ backgroundColor: C.accent, color: '#fff' }}
                      >
                        {runningAction === action.tool ? 'Running...' : `Run (${action.count})`}
                      </button>
                    )}
                  </div>
                ))}

                {data.actions.length === 0 && (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm font-medium" style={{ color: C.green }}>All clear — no actions needed</p>
                  </div>
                )}
              </div>
            </div>

            {/* Link to full triage board */}
            <div className="text-center">
              <Link
                href="/admin/coverage-ops"
                className="text-sm hover:underline"
                style={{ color: C.accent }}
              >
                Open full triage board for individual entity actions →
              </Link>
            </div>
          </div>
        )}

        {/* View: Neighborhoods */}
        {view === 'neighborhoods' && (
          <div className="rounded-xl shadow-sm overflow-hidden" style={{ backgroundColor: C.card }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: `${C.border}33` }}>
              <h2 className="text-base font-bold" style={{ color: C.text }}>Coverage by Neighborhood</h2>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                Sorted by total entities. Neighborhoods with fewer than 2 entities are hidden.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}33` }}>
                    <th className="text-left px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider" style={{ color: C.muted }}>Neighborhood</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider" style={{ color: C.muted }}>Total</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider" style={{ color: C.muted }}>GPID</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider" style={{ color: C.muted }}>Website</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider" style={{ color: C.muted }}>Tagline</th>
                    <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-right" style={{ color: C.muted }}>Completion</th>
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
                      <td className="text-right px-3 py-2.5" style={{ color: C.text }}>{hood.total}</td>
                      <td className="text-right px-3 py-2.5" style={{ color: hood.has_gpid === hood.total ? C.green : C.muted }}>
                        {hood.has_gpid}
                      </td>
                      <td className="text-right px-3 py-2.5" style={{ color: hood.has_website === hood.total ? C.green : C.muted }}>
                        {hood.has_website}
                      </td>
                      <td className="text-right px-3 py-2.5" style={{ color: hood.has_tagline === hood.total ? C.green : C.muted }}>
                        {hood.has_tagline}
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-24 h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${C.border}33` }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${hood.avg_completion}%`,
                                backgroundColor: hood.avg_completion >= 70 ? C.green
                                  : hood.avg_completion >= 40 ? C.accent
                                  : C.amber,
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium w-10 text-right" style={{ color: C.muted }}>
                            {hood.avg_completion}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-sm"
          style={{
            backgroundColor: toast.type === 'success' ? C.greenBg : C.redBg,
            color: toast.type === 'success' ? C.green : C.red,
            border: `1px solid ${toast.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FunnelCard({ label, value, pct, sub, color }: {
  label: string; value: number; pct?: number; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: '#8B7355' }}>{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold" style={{ color: color ?? '#36454F' }}>
          {value.toLocaleString()}
        </span>
        {pct !== undefined && (
          <span className="text-xs font-medium" style={{ color: '#8B7355' }}>{pct}%</span>
        )}
      </div>
      {sub && <div className="text-xs mt-0.5" style={{ color: '#8B7355' }}>{sub}</div>}
    </div>
  );
}

function FunnelBar({ label, value, total, color }: {
  label: string; value: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-40 shrink-0 text-right" style={{ color: '#8B7355' }}>{label}</span>
      <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: '#C3B09122' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color, minWidth: value > 0 ? 4 : 0 }}
        />
      </div>
      <span className="text-xs font-semibold w-16 text-right" style={{ color: '#36454F' }}>
        {value.toLocaleString()} <span style={{ color: '#8B7355', fontWeight: 400 }}>/ {total}</span>
      </span>
      <span className="text-xs w-10 text-right font-medium" style={{ color: pct >= 80 ? '#166534' : pct >= 50 ? '#5BA7A7' : '#92400E' }}>
        {pct}%
      </span>
    </div>
  );
}
