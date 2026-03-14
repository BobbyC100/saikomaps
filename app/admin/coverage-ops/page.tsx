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

interface CompareEntity {
  id: string;
  name: string;
  slug: string;
  googlePlaceId: string | null;
  website: string | null;
  phone: string | null;
  instagram: string | null;
  tiktok: string | null;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
  _counts: {
    merchant_surfaces: number;
    merchant_surface_artifacts: number;
    coverage_issues: number;
  };
}

interface MergeState {
  issueId: string;
  entityA: CompareEntity;
  entityB: CompareEntity;
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
  unresolved_identity: 'Unresolved Identity (insufficient signals)',
  enrichment_incomplete: 'Never Enriched',
  missing_coords: 'Missing Coordinates',
  missing_neighborhood: 'Missing Neighborhood',
  missing_website: 'Missing Website',
  missing_phone: 'Missing Phone',
  missing_instagram: 'Missing Instagram',
  missing_tiktok: 'Missing TikTok',
  missing_gpid: 'Missing GPID (not blocking)',
  google_says_closed: 'Google Says Closed',
  potential_duplicate: 'Potential Duplicate',
};

/** Maps issue types to the entity field that can be manually entered */
const INLINE_EDITABLE: Record<string, { field: string; placeholder: string }> = {
  unresolved_identity: { field: 'google_place_id', placeholder: 'ChIJ...' },
  missing_gpid: { field: 'google_place_id', placeholder: 'ChIJ...' },
  missing_website: { field: 'website', placeholder: 'https://...' },
  missing_phone: { field: 'phone', placeholder: '(213) 555-1234' },
  missing_instagram: { field: 'instagram', placeholder: '@handle' },
  missing_tiktok: { field: 'tiktok', placeholder: '@handle' },
};

const SUPPRESS_REASON = 'skipped';

/* ------------------------------------------------------------------ */
/*  Tool action wiring                                                 */
/* ------------------------------------------------------------------ */

interface ToolConfig {
  label: string;
  queuedLabel: string;
  isLink?: boolean;
  href?: string;
  invoke?: (issue: IssueRow) => Promise<Response>;
  /** If true, bulk action calls invoke() once (not per-issue) and marks all as done */
  batchOnce?: boolean;
}

const TOOL_ACTIONS: Record<string, ToolConfig> = {
  unresolved_identity: {
    label: 'Find GPID',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/seed-gpid-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId: issue.entity_id }),
      }),
  },
  missing_gpid: {
    label: 'Find GPID',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/seed-gpid-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId: issue.entity_id }),
      }),
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
    label: 'Discover Web',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/discover-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'website', slug: issue.entity_slug }),
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
    label: 'Discover IG',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/discover-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'instagram', slug: issue.entity_slug }),
      }),
  },
  missing_tiktok: {
    label: 'Discover TikTok',
    queuedLabel: 'Queued',
    invoke: (issue) =>
      fetch('/api/admin/tools/discover-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'tiktok', slug: issue.entity_slug }),
      }),
  },
  google_says_closed: {
    label: 'Mark Closed',
    queuedLabel: 'Done',
    invoke: async (issue) => {
      const googleStatus = (issue.detail as any)?.googleStatus;
      const newStatus = googleStatus === 'CLOSED_PERMANENTLY' ? 'PERMANENTLY_CLOSED' : 'CLOSED';
      return fetch(`/api/admin/entities/${issue.entity_id}/patch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'status', value: newStatus }),
      });
    },
  },
  potential_duplicate: {
    label: 'Review / Merge',
    queuedLabel: 'Done',
    // invoke is not used — handled by special case in handleAction
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

  // Bulk action state
  const [bulkRunning, setBulkRunning] = useState<string | null>(null);

  // Merge modal state
  const [mergeState, setMergeState] = useState<MergeState | null>(null);
  const [merging, setMerging] = useState(false);

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
    // Special case: potential_duplicate opens merge modal
    if (issue.issue_type === 'potential_duplicate') {
      const dupDetail = issue.detail as { duplicate_of_id?: string } | null;
      if (dupDetail?.duplicate_of_id) {
        openMergeModal(issue, dupDetail.duplicate_of_id);
      }
      return;
    }

    const tool = TOOL_ACTIONS[issue.issue_type];
    if (!tool?.invoke) return;

    setActionStates((prev) => ({ ...prev, [issue.id]: 'running' }));
    try {
      const res = await tool.invoke(issue);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const isCompleted = data?.status === 'completed';
        const wasSaved = isCompleted && Object.values(data.results ?? {}).some((r: any) => r.saved);

        setActionStates((prev) => ({ ...prev, [issue.id]: 'done' }));

        if (wasSaved) {
          // Data was written inline — auto-resolve this issue
          await handleResolve(issue.id);
          const discovered = Object.values(data.results).map((r: any) => r.discovered).filter(Boolean).join(', ');
          setToast({ message: `Found ${discovered} for ${issue.entity_name}`, type: 'success' });
        } else if (isCompleted && !wasSaved) {
          const reasoning = Object.values(data.results ?? {}).map((r: any) => r.reasoning).filter(Boolean).join('; ');
          setToast({ message: `${issue.entity_name}: ${reasoning || 'Not found'}`, type: 'error' });
        } else {
          setToast({
            message: `${tool.queuedLabel === 'Done' ? 'Completed' : 'Queued'}: ${ISSUE_TYPE_LABELS[issue.issue_type] ?? issue.issue_type} for ${issue.entity_name}`,
            type: 'success',
          });
        }
      } else {
        setActionStates((prev) => ({ ...prev, [issue.id]: 'error' }));
        setToast({ message: `Failed for ${issue.entity_name}`, type: 'error' });
      }
    } catch {
      setActionStates((prev) => ({ ...prev, [issue.id]: 'error' }));
      setToast({ message: `Failed for ${issue.entity_name}`, type: 'error' });
    }
  };

  const handleInlineSave = async (issue: IssueRow, field: string, value: string) => {
    try {
      const res = await fetch(`/api/admin/entities/${issue.entity_id}/patch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value }),
      });
      if (res.ok) {
        // Auto-resolve this issue since we just provided the data
        await handleResolve(issue.id);
        setToast({ message: `Saved ${field} for ${issue.entity_name}`, type: 'success' });
      } else {
        const data = await res.json().catch(() => null);
        const errorMsg = data?.error ?? `Failed to save ${field}`;
        setToast({ message: errorMsg, type: 'error' });

        // On 409 conflict for google_place_id, open merge flow
        if (res.status === 409 && field === 'google_place_id' && data?.conflictEntityId) {
          openMergeModal(issue, data.conflictEntityId);
        }
      }
    } catch {
      setToast({ message: `Failed to save ${field}`, type: 'error' });
    }
  };

  const openMergeModal = async (issue: IssueRow, conflictEntityId: string) => {
    try {
      const res = await fetch(
        `/api/admin/entities/compare?a=${issue.entity_id}&b=${conflictEntityId}`,
      );
      if (!res.ok) {
        setToast({ message: 'Failed to load comparison data', type: 'error' });
        return;
      }
      const data = await res.json();
      setMergeState({
        issueId: issue.id,
        entityA: data.a,
        entityB: data.b,
      });
    } catch {
      setToast({ message: 'Failed to load comparison data', type: 'error' });
    }
  };

  const handleMerge = async (keepId: string, deleteId: string) => {
    setMerging(true);
    try {
      const res = await fetch('/api/admin/entities/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepId, deleteId }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setToast({
          message: `Merged: kept "${data?.keptName}", deleted "${data?.deletedName}"`,
          type: 'success',
        });
        setMergeState(null);
        // Refresh data to reflect merge
        await fetchData();
      } else {
        setToast({ message: data?.error ?? 'Merge failed', type: 'error' });
      }
    } catch {
      setToast({ message: 'Merge failed', type: 'error' });
    }
    setMerging(false);
  };

  const handleNotDuplicate = async () => {
    if (!mergeState) return;
    setMerging(true);
    try {
      const res = await fetch('/api/admin/tools/scan-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suppress',
          issueId: mergeState.issueId,
          reason: 'not_duplicate',
        }),
      });
      if (res.ok) {
        setToast({ message: 'Marked as not a duplicate', type: 'success' });
        setMergeState(null);
        await fetchData();
      } else {
        const data = await res.json().catch(() => null);
        setToast({ message: data?.error ?? 'Failed to dismiss', type: 'error' });
      }
    } catch {
      setToast({ message: 'Failed to dismiss', type: 'error' });
    }
    setMerging(false);
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

  const handleBulkAction = async (issueTypes: string[], bulkLabel: string) => {
    const typeSet = new Set(issueTypes);
    const matching = filteredIssues.filter(
      (i) => typeSet.has(i.issue_type) && TOOL_ACTIONS[i.issue_type]?.invoke && (!actionStates[i.id] || actionStates[i.id] === 'idle'),
    );
    if (matching.length === 0) return;

    setBulkRunning(bulkLabel);
    let succeeded = 0;
    let failed = 0;

    // Check if any of these issue types use batchOnce — if so, invoke once and mark all done
    const firstTool = TOOL_ACTIONS[matching[0].issue_type];
    if (firstTool?.batchOnce) {
      for (const issue of matching) {
        setActionStates((prev) => ({ ...prev, [issue.id]: 'running' }));
      }
      try {
        const res = await firstTool.invoke!(matching[0]);
        const newState = res.ok ? 'done' : 'error';
        for (const issue of matching) {
          setActionStates((prev) => ({ ...prev, [issue.id]: newState as 'done' | 'error' }));
        }
        succeeded = res.ok ? matching.length : 0;
        failed = res.ok ? 0 : matching.length;
      } catch {
        for (const issue of matching) {
          setActionStates((prev) => ({ ...prev, [issue.id]: 'error' }));
        }
        failed = matching.length;
      }
    } else {
      // Run sequentially to avoid overwhelming the server
      for (const issue of matching) {
        const tool = TOOL_ACTIONS[issue.issue_type];
        if (!tool?.invoke) continue;
        setActionStates((prev) => ({ ...prev, [issue.id]: 'running' }));
        try {
          const res = await tool.invoke(issue);
          if (res.ok) {
            setActionStates((prev) => ({ ...prev, [issue.id]: 'done' }));
            succeeded++;
          } else {
            setActionStates((prev) => ({ ...prev, [issue.id]: 'error' }));
            failed++;
          }
        } catch {
          setActionStates((prev) => ({ ...prev, [issue.id]: 'error' }));
          failed++;
        }
      }
    }

    setBulkRunning(null);
    setToast({
      message: `Bulk ${bulkLabel}: ${succeeded} queued${failed ? `, ${failed} failed` : ''}`,
      type: failed > 0 ? 'error' : 'success',
    });
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

  // Compute which bulk actions are available, grouped by tool label
  // (e.g. missing_coords + missing_phone both use "Run Stage 1" → one button)
  const bulkActions = (() => {
    const byLabel: Record<string, { issueTypes: string[]; count: number }> = {};
    for (const issue of filteredIssues) {
      const tool = TOOL_ACTIONS[issue.issue_type];
      if (!tool?.invoke) continue;
      const key = tool.label;
      if (!byLabel[key]) byLabel[key] = { issueTypes: [], count: 0 };
      if (!byLabel[key].issueTypes.includes(issue.issue_type)) {
        byLabel[key].issueTypes.push(issue.issue_type);
      }
      byLabel[key].count++;
    }
    return Object.entries(byLabel)
      .filter(([, v]) => v.count > 1)
      .map(([label, v]) => ({
        issueTypes: v.issueTypes,
        label,
        count: v.count,
      }));
  })();

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

          {/* Bulk Action Buttons */}
          {bulkActions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: C.muted }}>Bulk:</span>
              {bulkActions.map((ba) => (
                <button
                  key={ba.label}
                  onClick={() => handleBulkAction(ba.issueTypes, ba.label)}
                  disabled={bulkRunning !== null}
                  className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: C.accent, color: '#fff' }}
                >
                  {bulkRunning === ba.label
                    ? `Running...`
                    : `${ba.label} (${ba.count})`}
                </button>
              ))}
            </div>
          )}

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
                    onInlineSave={(field, value) => handleInlineSave(issue, field, value)}
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

      {/* Merge Modal */}
      {mergeState && (
        <MergeModal
          entityA={mergeState.entityA}
          entityB={mergeState.entityB}
          merging={merging}
          onMerge={handleMerge}
          onNotDuplicate={handleNotDuplicate}
          onClose={() => setMergeState(null)}
        />
      )}

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
  onInlineSave,
}: {
  issue: IssueRow;
  actionState: 'idle' | 'running' | 'done' | 'error';
  onAction: () => void;
  onSuppress: (reason: string) => void;
  onResolve: () => void;
  onInlineSave: (field: string, value: string) => void;
}) {
  const [inlineValue, setInlineValue] = useState('');
  const [inlineSaving, setInlineSaving] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [coverageUrl, setCoverageUrl] = useState('');
  const [coverageSaving, setCoverageSaving] = useState(false);
  const [coverageMsg, setCoverageMsg] = useState('');
  const tool = TOOL_ACTIONS[issue.issue_type];
  const editable = INLINE_EDITABLE[issue.issue_type];

  const handleInlineSubmit = () => {
    if (!editable || !inlineValue.trim()) return;
    setInlineSaving(true);
    onInlineSave(editable.field, inlineValue.trim());
  };

  const handleAddCoverage = async () => {
    if (!coverageUrl.trim()) return;
    setCoverageSaving(true);
    setCoverageMsg('');
    try {
      const res = await fetch(`/api/admin/entities/${issue.entity_id}/coverage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: coverageUrl.trim() }),
      });
      if (res.ok) {
        setCoverageMsg('Added');
        setCoverageUrl('');
      } else {
        const data = await res.json();
        setCoverageMsg(data.error ?? 'Failed');
      }
    } catch {
      setCoverageMsg('Error');
    }
    setCoverageSaving(false);
  };

  return (
    <div>
    <div
      className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#F5F0E1]/40 transition-colors"
    >
      {/* Expand toggle */}
      <button
        onClick={() => setShowExtra(!showExtra)}
        className="text-xs shrink-0 w-4 text-center opacity-40 hover:opacity-100"
        style={{ color: C.muted }}
        title="Add extra info (coverage links, etc.)"
      >
        {showExtra ? '−' : '+'}
      </button>

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
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(issue.entity_name + ' Los Angeles')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs shrink-0 opacity-40 hover:opacity-100 transition-opacity"
            style={{ color: C.muted }}
            title={`Google "${issue.entity_name} Los Angeles"`}
          >
            search
          </a>
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
          {issue.issue_type === 'google_says_closed' && issue.detail && (
            <span className="ml-1 font-semibold" style={{ color: C.red }}>
              ({(issue.detail as any).googleStatus === 'CLOSED_PERMANENTLY' ? 'Permanently' : 'Temporarily'})
            </span>
          )}
          {issue.issue_type === 'potential_duplicate' && issue.detail && (
            <span className="ml-1" style={{ color: C.amber }}>
              — possible duplicate of {(issue.detail as any).duplicate_of_name}
              {(issue.detail as any).match_reasons && (
                <span className="ml-1 opacity-70">
                  [{((issue.detail as any).match_reasons as string[]).join(', ')}]
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Inline Edit Field */}
      {editable && (
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="text"
            value={inlineValue}
            onChange={(e) => setInlineValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInlineSubmit()}
            placeholder={editable.placeholder}
            disabled={inlineSaving}
            className="text-xs border rounded px-2 py-1 w-40"
            style={{ borderColor: C.border, color: C.text, backgroundColor: '#fff' }}
          />
          <button
            onClick={handleInlineSubmit}
            disabled={!inlineValue.trim() || inlineSaving}
            className="px-2 py-1 rounded text-xs font-semibold disabled:opacity-30"
            style={{ backgroundColor: C.greenBg, color: C.green }}
          >
            {inlineSaving ? '...' : 'Save'}
          </button>
          <button
            onClick={() => {
              setInlineSaving(true);
              onInlineSave(editable.field, 'NONE');
            }}
            disabled={inlineSaving}
            className="px-2 py-1 rounded text-xs font-medium disabled:opacity-30"
            style={{ backgroundColor: C.bg, color: C.muted, border: `1px solid ${C.border}` }}
            title={`Confirm this entity has no ${editable.field}`}
          >
            None
          </button>
        </div>
      )}

      {/* "Still Open" override for google_says_closed */}
      {issue.issue_type === 'google_says_closed' && (
        <button
          onClick={() => onSuppress('confirmed_open')}
          className="px-2 py-1 rounded text-xs font-medium shrink-0"
          style={{ backgroundColor: C.greenBg, color: C.green, border: `1px solid ${C.border}` }}
          title="Override: this place is actually still open"
        >
          Still Open
        </button>
      )}

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
        ) : (tool?.invoke || issue.issue_type === 'potential_duplicate') ? (
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

        {/* Suppress */}
        <button
          onClick={() => onSuppress(SUPPRESS_REASON)}
          className="text-xs hover:underline"
          style={{ color: C.muted }}
          title="Hide this issue (not worth fixing right now)"
        >
          Skip
        </button>
      </div>
    </div>

    {/* Expandable extra info section */}
    {showExtra && (
      <div
        className="px-5 py-2 ml-7 mb-1 rounded"
        style={{ backgroundColor: '#FAFAF5', border: `1px solid ${C.border}` }}
      >
        <div className="text-xs font-semibold mb-1.5" style={{ color: C.text }}>
          Add coverage link
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={coverageUrl}
            onChange={(e) => setCoverageUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCoverage()}
            placeholder="https://eater.com/..."
            disabled={coverageSaving}
            className="text-xs border rounded px-2 py-1 flex-1"
            style={{ borderColor: C.border, color: C.text, backgroundColor: '#fff' }}
          />
          <button
            onClick={handleAddCoverage}
            disabled={!coverageUrl.trim() || coverageSaving}
            className="px-2 py-1 rounded text-xs font-semibold disabled:opacity-30"
            style={{ backgroundColor: C.accent, color: '#fff' }}
          >
            {coverageSaving ? '...' : 'Add'}
          </button>
          {coverageMsg && (
            <span className="text-xs" style={{ color: coverageMsg === 'Added' ? C.green : C.red }}>
              {coverageMsg}
            </span>
          )}
        </div>
      </div>
    )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Merge Modal                                                        */
/* ------------------------------------------------------------------ */

const COMPARE_FIELDS: { key: keyof CompareEntity; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'slug', label: 'Slug' },
  { key: 'googlePlaceId', label: 'Google Place ID' },
  { key: 'website', label: 'Website' },
  { key: 'phone', label: 'Phone' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'neighborhood', label: 'Neighborhood' },
  { key: 'address', label: 'Address' },
  { key: 'latitude', label: 'Latitude' },
  { key: 'longitude', label: 'Longitude' },
  { key: 'createdAt', label: 'Created' },
  { key: 'updatedAt', label: 'Updated' },
];

function MergeModal({
  entityA,
  entityB,
  merging,
  onMerge,
  onNotDuplicate,
  onClose,
}: {
  entityA: CompareEntity;
  entityB: CompareEntity;
  merging: boolean;
  onMerge: (keepId: string, deleteId: string) => void;
  onNotDuplicate: () => void;
  onClose: () => void;
}) {
  const formatVal = (v: unknown) => {
    if (v === null || v === undefined) return '--';
    if (typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(v).toLocaleDateString();
    }
    return String(v);
  };

  const renderSide = (entity: CompareEntity, other: CompareEntity) => (
    <div
      className="flex-1 rounded-lg border p-4"
      style={{ borderColor: C.border, backgroundColor: C.cardBg }}
    >
      <h3 className="text-base font-bold mb-1" style={{ color: C.text }}>
        {entity.name}
      </h3>
      <p className="text-xs mb-3" style={{ color: C.muted }}>{entity.slug}</p>

      {/* Counts */}
      <div className="flex gap-3 mb-4">
        {[
          { label: 'Surfaces', val: entity._counts.merchant_surfaces },
          { label: 'Artifacts', val: entity._counts.merchant_surface_artifacts },
          { label: 'Issues', val: entity._counts.coverage_issues },
        ].map((c) => (
          <div
            key={c.label}
            className="text-center rounded px-2 py-1"
            style={{ backgroundColor: C.bg }}
          >
            <div className="text-xs font-bold" style={{ color: C.text }}>{c.val}</div>
            <div className="text-[10px]" style={{ color: C.muted }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Fields */}
      <div className="space-y-1.5">
        {COMPARE_FIELDS.map(({ key, label }) => {
          const val = entity[key];
          const otherVal = other[key];
          const hasValue = val !== null && val !== undefined;
          const otherHas = otherVal !== null && otherVal !== undefined;
          // Highlight if this side has a value the other doesn't
          const isUnique = hasValue && !otherHas;
          return (
            <div key={key} className="flex items-baseline gap-2">
              <span className="text-[10px] w-24 shrink-0 text-right" style={{ color: C.muted }}>
                {label}
              </span>
              <span
                className="text-xs truncate"
                style={{
                  color: hasValue ? C.text : '#C3B09188',
                  fontWeight: isUnique ? 600 : 400,
                  backgroundColor: isUnique ? C.greenBg : 'transparent',
                  padding: isUnique ? '0 4px' : 0,
                  borderRadius: 3,
                }}
              >
                {formatVal(val)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Keep button */}
      <button
        onClick={() => onMerge(entity.id, other.id)}
        disabled={merging}
        className="mt-4 w-full py-2 rounded text-sm font-semibold disabled:opacity-50 transition-colors"
        style={{ backgroundColor: C.accent, color: '#fff' }}
      >
        {merging ? 'Merging...' : 'Keep this one'}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={!merging ? onClose : undefined}
      />

      {/* Modal */}
      <div
        className="relative z-10 rounded-xl shadow-xl p-6 max-w-5xl w-[95vw] mx-4 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: C.bg }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: C.text }}>
            Duplicate Detected &mdash; Choose Which to Keep
          </h2>
          <button
            onClick={onClose}
            disabled={merging}
            className="text-lg px-2 hover:opacity-70"
            style={{ color: C.muted }}
          >
            &times;
          </button>
        </div>

        <p className="text-xs mb-4" style={{ color: C.muted }}>
          The other entity will be merged into the one you keep. All surfaces, artifacts,
          and issues will be reassigned. Missing fields will be gap-filled from the deleted entity.
        </p>

        <div className="flex gap-4">
          {renderSide(entityA, entityB)}
          {renderSide(entityB, entityA)}
        </div>

        {/* Not a duplicate */}
        <div className="mt-4 text-center">
          <button
            onClick={onNotDuplicate}
            disabled={merging}
            className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50 transition-colors"
            style={{ backgroundColor: C.bg, color: C.muted, border: `1px solid ${C.border}` }}
          >
            Not a duplicate — these are different places
          </button>
        </div>
      </div>
    </div>
  );
}
