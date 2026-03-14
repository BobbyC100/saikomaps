'use client';

/**
 * Coverage Operations — Triage Board
 * Phase 2 of Coverage Operations (COVOPS-APPROACH-V1).
 *
 * Reads from entity_issues table. Each issue row has an action button
 * wired to a Phase 0 resolution tool. Operators see what's broken and
 * click one button to fix it.
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface IssueRow {
  id: string;
  entity_id: string;
  entity_name: string;
  entity_slug: string;
  problem_class: string;
  issue_type: string;
  status: string;
  severity: string;
  blocking_publish: boolean;
  recommended_tool: string | null;
  detail: Record<string, unknown> | null;
  suppressed_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface SummaryData {
  total_active: number;
  blocking_publish_entities: number;
  by_type: { issue_type: string; severity: string; count: number }[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const C = {
  bg: '#F5F0E1',
  cardBg: '#FFFFFF',
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
};

const SEVERITY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: '#FEE2E2', color: '#991B1B', label: 'CRIT' },
  high: { bg: '#FEF3C7', color: '#92400E', label: 'HIGH' },
  medium: { bg: '#F5F0E1', color: '#8B7355', label: 'MED' },
  low: { bg: '#F5F0E1', color: '#A09078', label: 'LOW' },
};

const LANE_META: Record<string, { icon: string; label: string; order: number }> = {
  identity: { icon: '⊕', label: 'Identity', order: 0 },
  location: { icon: '◎', label: 'Location', order: 1 },
  contact: { icon: '☎', label: 'Contact', order: 2 },
  social: { icon: '◉', label: 'Social', order: 3 },
  editorial: { icon: '◈', label: 'Editorial', order: 4 },
};

const ISSUE_TYPE_LABELS: Record<string, string> = {
  unresolved_identity: 'Unresolved Identity (no GPID)',
  enrichment_incomplete: 'Never Enriched',
  missing_coords: 'Missing Coordinates',
  missing_neighborhood: 'Missing Neighborhood',
  missing_website: 'Missing Website',
  missing_phone: 'Missing Phone',
  missing_instagram: 'Missing Instagram',
};

const SUPPRESS_REASONS = [
  { value: 'confirmed_none', label: 'Confirmed none' },
  { value: 'not_applicable', label: 'Not applicable' },
  { value: 'wont_fix', label: "Won't fix" },
];

/* ------------------------------------------------------------------ */
/*  Tool action wiring                                                 */
/* ------------------------------------------------------------------ */

interface ToolConfig {
  label: string;
  queuedLabel: string;
  isLink?: boolean;
  href?: string;
  invoke?: (issue: IssueRow) => Promise<Response>;
}

const TOOL_ACTIONS: Record<string, ToolConfig> = {
  unresolved_identity: {
    label: 'GPID Queue \u2192',
    queuedLabel: '',
    isLink: true,
    href: '/admin/gpid-queue',
  },
  enrichment_incomplete: {
    label: 'Enrich',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch(`/api/admin/enrich/${issue.entity_slug}`, { method: 'POST' }),
  },
  missing_coords: {
    label: 'Run Stage 1',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/enrich-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: issue.entity_slug, stage: 1 }),
      }),
  },
  missing_neighborhood: {
    label: 'Derive',
    queuedLabel: 'Done',
    invoke: (issue) =>
      fetch('/api/admin/tools/derive-neighborhood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId: issue.entity_id }),
      }),
  },
  missing_website: {
    label: 'Run Stage 6',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/enrich-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: issue.entity_slug, stage: 6 }),
      }),
  },
  missing_phone: {
    label: 'Run Stage 1',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/enrich-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: issue.entity_slug, stage: 1 }),
      }),
  },
  missing_instagram: {
    label: 'Backfill IG',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/instagram-discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ingest', slug: issue.entity_slug }),
      }),
  },
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function CoverageOpsPage() {
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [suppressed, setSuppressed] = useState<IssueRow[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [blockingOnly, setBlockingOnly] = useState(false);

  // Lane collapse state
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());
  const [showSuppressed, setShowSuppressed] = useState(false);

  // Action button states per issue id
  const [actionStates, setActionStates] = useState<Record<string, 'idle' | 'running' | 'done' | 'error'>>({});

  // ── Data fetching ──

  const fetchData = useCallback(async () => {
    try {
      const [detailRes, summaryRes] = await Promise.all([
        fetch('/api/admin/tools/scan-issues?detail=true'),
        fetch('/api/admin/tools/scan-issues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'summary' }),
        }),
      ]);

      if (detailRes.ok) {
        const data = await detailRes.json();
        setIssues(data.issues ?? []);
        setSuppressed(data.suppressed ?? []);
      }

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary({
          total_active: data.total_active,
          blocking_publish_entities: data.blocking_publish_entities,
          by_type: data.by_type,
        });
      }
    } catch (err) {
      console.error('Failed to fetch coverage ops data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ── Handlers ──

  const handleRescan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/admin/tools/scan-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' }),
      });
      if (res.ok) {
        const data = await res.json();
        setToast({
          message: `Scan complete: ${data.issues_created} new, ${data.issues_resolved} resolved`,
          type: 'success',
        });
        await fetchData();
      } else {
        setToast({ message: 'Scan failed', type: 'error' });
      }
    } catch {
      setToast({ message: 'Scan failed', type: 'error' });
    }
    setScanning(false);
  };

  const handleAction = async (issue: IssueRow) => {
    const tool = TOOL_ACTIONS[issue.issue_type];
    if (!tool?.invoke) return;

    setActionStates((prev) => ({ ...prev, [issue.id]: 'running' }));
    try {
      const res = await tool.invoke(issue);
      if (res.ok) {
        setActionStates((prev) => ({ ...prev, [issue.id]: 'done' }));
        setToast({
          message: `${tool.queuedLabel === 'Done' ? 'Completed' : 'Queued'}: ${ISSUE_TYPE_LABELS[issue.issue_type] ?? issue.issue_type} for ${issue.entity_name}`,
          type: 'success',
        });
      } else {
        setActionStates((prev) => ({ ...prev, [issue.id]: 'error' }));
        setToast({ message: `Failed for ${issue.entity_name}`, type: 'error' });
      }
    } catch {
      setActionStates((prev) => ({ ...prev, [issue.id]: 'error' }));
      setToast({ message: `Failed for ${issue.entity_name}`, type: 'error' });
    }
  };

  const handleSuppress = async (issueId: string, reason: string) => {
    try {
      const res = await fetch('/api/admin/tools/scan-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suppress', issueId, reason }),
      });
      if (res.ok) {
        const removed = issues.find((i) => i.id === issueId);
        setIssues((prev) => prev.filter((i) => i.id !== issueId));
        if (removed) {
          setSuppressed((prev) => [...prev, { ...removed, status: 'suppressed', suppressed_reason: reason }]);
        }
        setSummary((prev) =>
          prev ? { ...prev, total_active: prev.total_active - 1 } : prev,
        );
        setToast({ message: 'Issue suppressed', type: 'success' });
      }
    } catch {
      setToast({ message: 'Failed to suppress', type: 'error' });
    }
  };

  const handleResolve = async (issueId: string) => {
    try {
      const res = await fetch('/api/admin/tools/scan-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', issueId }),
      });
      if (res.ok) {
        setIssues((prev) => prev.filter((i) => i.id !== issueId));
        setSummary((prev) =>
          prev ? { ...prev, total_active: prev.total_active - 1 } : prev,
        );
        setToast({ message: 'Issue resolved', type: 'success' });
      }
    } catch {
      setToast({ message: 'Failed to resolve', type: 'error' });
    }
  };

  const toggleLane = (cls: string) => {
    setCollapsedLanes((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  };

  // ── Filtering ──

  const filteredIssues = issues.filter((i) => {
    if (filterSeverity && i.severity !== filterSeverity) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    if (blockingOnly && !i.blocking_publish) return false;
    return true;
  });

  // Group by problem_class
  const lanes = Object.entries(LANE_META)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([cls, meta]) => ({
      cls,
      ...meta,
      issues: filteredIssues.filter((i) => i.problem_class === cls),
    }))
    .filter((lane) => lane.issues.length > 0);

  // Severity counts for stat cards
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const issue of issues) {
    if (issue.severity in severityCounts) {
      severityCounts[issue.severity as keyof typeof severityCounts]++;
    }
  }

  // ── Loading state ──

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.bg }}>
        <div className="text-lg" style={{ color: C.muted }}>
          Loading Coverage Operations...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-6" style={{ backgroundColor: C.bg }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <nav className="flex items-center gap-2 text-sm mb-2" style={{ color: C.muted }}>
            <Link href="/admin" className="hover:underline" style={{ color: C.muted }}>
              Admin
            </Link>
            <span>/</span>
            <span style={{ color: C.text }} className="font-medium">
              Coverage Ops
            </span>
          </nav>
          <h1 className="text-3xl font-bold mb-1" style={{ color: C.text }}>
            Coverage Operations
          </h1>
          <p className="text-sm" style={{ color: C.muted }}>
            Triage board &middot; {summary?.total_active ?? issues.length} active issues across {new Set(issues.map((i) => i.entity_id)).size} entities
          </p>
        </header>

        {/* Summary Stats */}
        <div className="rounded-xl p-5 shadow-sm mb-6" style={{ backgroundColor: C.cardBg }}>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <StatCard label="Active" value={summary?.total_active ?? issues.length} />
            <StatCard
              label="Blocking"
              value={summary?.blocking_publish_entities ?? 0}
              color={C.red}
            />
            <StatCard label="Critical" value={severityCounts.critical} color={C.red} />
            <StatCard label="High" value={severityCounts.high} color={C.amber} />
            <StatCard label="Medium" value={severityCounts.medium} color={C.muted} />
            <StatCard label="Low" value={severityCounts.low} color="#A09078" />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="text-sm border rounded px-2 py-1.5"
            style={{ borderColor: C.border, color: C.text, backgroundColor: C.cardBg }}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border rounded px-2 py-1.5"
            style={{ borderColor: C.border, color: C.text, backgroundColor: C.cardBg }}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="needs_automation">Needs Automation</option>
            <option value="processing">Processing</option>
            <option value="needs_human">Needs Human</option>
          </select>

          <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: C.muted }}>
            <input
              type="checkbox"
              checked={blockingOnly}
              onChange={(e) => setBlockingOnly(e.target.checked)}
              className="rounded"
            />
            Blocking only
          </label>

          <div className="flex-1" />

          <button
            onClick={handleRescan}
            disabled={scanning}
            className="px-4 py-1.5 rounded text-sm font-medium border disabled:opacity-50"
            style={{ borderColor: C.border, color: C.muted, backgroundColor: 'transparent' }}
          >
            {scanning ? 'Scanning...' : 'Re-scan Issues'}
          </button>
        </div>

        {/* Problem Lanes */}
        {lanes.map((lane) => (
          <div
            key={lane.cls}
            className="rounded-xl shadow-sm mb-5 overflow-hidden"
            style={{ backgroundColor: C.cardBg }}
          >
            {/* Lane Header */}
            <button
              onClick={() => toggleLane(lane.cls)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[#F5F0E1]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg leading-none">{lane.icon}</span>
                <h2 className="text-base font-bold" style={{ color: C.text }}>
                  {lane.label}
                </h2>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: C.bg, color: C.muted }}
                >
                  {lane.issues.length}
                </span>
              </div>
              <span style={{ color: C.muted }}>
                {collapsedLanes.has(lane.cls) ? '▸' : '▾'}
              </span>
            </button>

            {/* Issue Rows */}
            {!collapsedLanes.has(lane.cls) && (
              <div
                className="divide-y"
                style={{ borderColor: `${C.border}33` }}
              >
                {lane.issues.map((issue) => (
                  <IssueRowComponent
                    key={issue.id}
                    issue={issue}
                    actionState={actionStates[issue.id] ?? 'idle'}
                    onAction={() => handleAction(issue)}
                    onSuppress={(reason) => handleSuppress(issue.id, reason)}
                    onResolve={() => handleResolve(issue.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Empty state */}
        {lanes.length === 0 && !loading && (
          <div
            className="rounded-xl p-12 text-center shadow-sm"
            style={{ backgroundColor: C.cardBg }}
          >
            <p className="text-lg font-medium" style={{ color: C.green }}>
              All clear
            </p>
            <p className="text-sm mt-1" style={{ color: C.muted }}>
              No active issues match the current filters.
            </p>
          </div>
        )}

        {/* Suppressed Section */}
        {suppressed.length > 0 && (
          <div
            className="rounded-xl shadow-sm mt-8 overflow-hidden"
            style={{ backgroundColor: C.cardBg, opacity: 0.7 }}
          >
            <button
              onClick={() => setShowSuppressed(!showSuppressed)}
              className="w-full flex items-center justify-between px-5 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: C.muted }}>
                  Suppressed
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: C.bg, color: C.muted }}
                >
                  {suppressed.length}
                </span>
              </div>
              <span className="text-xs" style={{ color: C.muted }}>
                {showSuppressed ? '▾' : '▸'}
              </span>
            </button>
            {showSuppressed && (
              <div className="divide-y" style={{ borderColor: `${C.border}33` }}>
                {suppressed.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-center gap-4 px-5 py-2.5"
                  >
                    <SeverityPill severity={issue.severity} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm" style={{ color: C.muted }}>
                        {issue.entity_name}
                      </span>
                      <span className="text-xs ml-2" style={{ color: '#A09078' }}>
                        {ISSUE_TYPE_LABELS[issue.issue_type] ?? issue.issue_type}
                      </span>
                    </div>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: C.bg, color: C.muted }}
                    >
                      {issue.suppressed_reason ?? 'suppressed'}
                    </span>
                  </div>
                ))}
              </div>
            )}
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

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: `${C.border}66` }}
    >
      <div className="text-[11px] uppercase tracking-wider mb-0.5" style={{ color: C.muted }}>
        {label}
      </div>
      <div className="text-xl font-bold" style={{ color: color ?? C.text }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function SeverityPill({ severity }: { severity: string }) {
  const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.low;
  return (
    <span
      className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded w-10 text-center shrink-0"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  );
}

function IssueRowComponent({
  issue,
  actionState,
  onAction,
  onSuppress,
  onResolve,
}: {
  issue: IssueRow;
  actionState: 'idle' | 'running' | 'done' | 'error';
  onAction: () => void;
  onSuppress: (reason: string) => void;
  onResolve: () => void;
}) {
  const [suppressOpen, setSuppressOpen] = useState(false);
  const tool = TOOL_ACTIONS[issue.issue_type];

  return (
    <div
      className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#F5F0E1]/40 transition-colors"
    >
      {/* Severity */}
      <SeverityPill severity={issue.severity} />

      {/* Entity info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/place/${issue.entity_slug}`}
            className="text-sm font-medium hover:underline truncate"
            style={{ color: C.accent }}
            target="_blank"
          >
            {issue.entity_name}
          </Link>
          {issue.blocking_publish && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
              style={{ backgroundColor: C.redBg, color: C.red }}
            >
              blocking
            </span>
          )}
        </div>
        <div className="text-xs truncate" style={{ color: C.muted }}>
          {ISSUE_TYPE_LABELS[issue.issue_type] ?? issue.issue_type}
        </div>
      </div>

      {/* Action Button */}
      <div className="flex items-center gap-2 shrink-0">
        {tool?.isLink ? (
          <Link
            href={tool.href ?? '#'}
            className="px-3 py-1 rounded text-xs font-semibold"
            style={{ backgroundColor: C.accent, color: '#fff' }}
          >
            {tool.label}
          </Link>
        ) : tool?.invoke ? (
          <button
            onClick={onAction}
            disabled={actionState === 'running' || actionState === 'done'}
            className="px-3 py-1 rounded text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{
              backgroundColor:
                actionState === 'done'
                  ? C.greenBg
                  : actionState === 'error'
                    ? C.redBg
                    : C.accent,
              color:
                actionState === 'done'
                  ? C.green
                  : actionState === 'error'
                    ? C.red
                    : '#fff',
            }}
          >
            {actionState === 'idle'
              ? tool.label
              : actionState === 'running'
                ? '...'
                : actionState === 'done'
                  ? tool.queuedLabel
                  : 'Retry'}
          </button>
        ) : null}

        {/* Resolve */}
        <button
          onClick={onResolve}
          className="text-xs hover:underline"
          style={{ color: C.muted }}
          title="Mark as resolved"
        >
          Resolve
        </button>

        {/* Suppress */}
        <div className="relative">
          <button
            onClick={() => setSuppressOpen(!suppressOpen)}
            className="text-xs hover:underline"
            style={{ color: C.muted }}
            title="Suppress this issue"
          >
            Suppress
          </button>
          {suppressOpen && (
            <>
              {/* Backdrop to close */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSuppressOpen(false)}
              />
              <div
                className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-md border py-1 min-w-[140px]"
                style={{ backgroundColor: C.cardBg, borderColor: C.border }}
              >
                {SUPPRESS_REASONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => {
                      onSuppress(r.value);
                      setSuppressOpen(false);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[#F5F0E1] transition-colors"
                    style={{ color: C.text }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
