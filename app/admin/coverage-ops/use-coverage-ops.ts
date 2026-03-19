/**
 * Coverage Operations — State Management Hook
 *
 * Encapsulates all data fetching, action handlers, polling, filtering,
 * and derived state for the Coverage Ops triage board.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  IssueRow, SummaryData, CompareEntity, MergeState,
  EnrichProgress, ActionState, PotentialDuplicateDetail,
} from './types';
import { TOOL_ACTIONS } from './tool-actions';
import { LANE_META, SUPPRESS_REASON, SECTION_META, ISSUE_SECTION, ISSUE_NEED_LABELS } from './constants';
import type { Section } from './types';

export function useCoverageOps() {
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
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});

  // Bulk action state
  const [bulkRunning, setBulkRunning] = useState<string | null>(null);

  // Enrichment progress tracking (keyed by entity slug)
  const [enrichProgress, setEnrichProgress] = useState<Record<string, EnrichProgress>>({});
  const enrichPollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const enrichTimeouts = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

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

  // ── Enrichment polling ──

  const startEnrichPolling = useCallback((slug: string) => {
    if (enrichPollTimers.current[slug]) return;

    setEnrichProgress((prev) => ({
      ...prev,
      [slug]: { slug, stage: null, done: false },
    }));

    let pollAttempts = 0;
    const poll = async () => {
      pollAttempts++;
      try {
        const res = await fetch(`/api/admin/enrich/${slug}`);
        if (!res.ok) return;
        const data = await res.json();
        const stageNum = data.enrichment_stage ? parseInt(data.enrichment_stage, 10) : null;

        setEnrichProgress((prev) => ({
          ...prev,
          [slug]: { slug, stage: stageNum, done: data.done },
        }));

        if (data.done) {
          clearInterval(enrichPollTimers.current[slug]);
          delete enrichPollTimers.current[slug];
          fetch('/api/admin/tools/scan-issues', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'scan', slug }),
          }).then(() => fetchData()).catch(() => fetchData());
        }
      } catch {
        // keep polling on transient errors
      }
    };

    // Delay first poll, then every 2 seconds
    const initialTimeout = setTimeout(() => poll(), 3500);
    enrichTimeouts.current.add(initialTimeout);

    enrichPollTimers.current[slug] = setInterval(poll, 2000);

    // Safety timeout: stop polling after 5 minutes
    const safetyTimeout = setTimeout(() => {
      if (enrichPollTimers.current[slug]) {
        clearInterval(enrichPollTimers.current[slug]);
        delete enrichPollTimers.current[slug];
        setEnrichProgress((prev) => {
          const cur = prev[slug];
          if (cur && !cur.done) {
            return { ...prev, [slug]: { ...cur, done: true, error: 'Polling timeout' } };
          }
          return prev;
        });
      }
    }, 5 * 60 * 1000);
    enrichTimeouts.current.add(safetyTimeout);
  }, [fetchData]);

  // Cleanup ALL timers on unmount (intervals + timeouts)
  useEffect(() => {
    return () => {
      Object.values(enrichPollTimers.current).forEach(clearInterval);
      enrichTimeouts.current.forEach(clearTimeout);
    };
  }, []);

  // Initial data load
  useEffect(() => { fetchData(); }, [fetchData]);

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

  const handleAction = async (issue: IssueRow) => {
    // Special case: potential_duplicate opens merge modal
    if (issue.issue_type === 'potential_duplicate') {
      const dupDetail = issue.detail as PotentialDuplicateDetail | null;
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
        const wasSaved = isCompleted && Object.values(data.results ?? {}).some((r: Record<string, unknown>) => r.saved);
        const gpidMatched = data?.action === 'seed-gpid-queue' && (data?.matched ?? 0) > 0;
        const gpidQueued = data?.action === 'seed-gpid-queue' && (data?.queued ?? 0) > 0;

        setActionStates((prev) => ({ ...prev, [issue.id]: 'done' }));

        // Entity patch actions (e.g., google_says_closed → Mark Closed) return
        // { entityId, field, value } — resolve the issue and re-scan.
        const isEntityPatch = data?.entityId && data?.field;
        if (isEntityPatch) {
          await handleResolve(issue.id);
          setToast({ message: `Updated ${issue.entity_name}`, type: 'success' });
          if (issue.entity_id) {
            fetch('/api/admin/tools/scan-issues', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'scan', entityId: issue.entity_id }),
            }).then(() => fetchData());
          }
        } else if (wasSaved || gpidMatched) {
          await handleResolve(issue.id);
          if (gpidMatched) {
            setToast({ message: `GPID found for ${issue.entity_name}`, type: 'success' });
          } else {
            const discovered = Object.values(data.results).map((r: Record<string, unknown>) => r.discovered).filter(Boolean).join(', ');
            setToast({ message: `Found ${discovered} for ${issue.entity_name}`, type: 'success' });
          }
          if (issue.entity_id) {
            fetch('/api/admin/tools/scan-issues', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'scan', entityId: issue.entity_id }),
            }).then(() => fetchData());
          }
        } else if (gpidQueued) {
          setToast({ message: `${issue.entity_name}: queued for human GPID review`, type: 'success' });
        } else if (isCompleted && !wasSaved) {
          const reasoning = Object.values(data.results ?? {}).map((r: Record<string, unknown>) => r.reasoning).filter(Boolean).join('; ');
          setToast({ message: `${issue.entity_name}: ${reasoning || 'Not found'}`, type: 'error' });
        } else {
          setToast({
            message: `${tool.queuedLabel === 'Done' ? 'Completed' : 'Queued'}: ${issue.issue_type} for ${issue.entity_name}`,
            type: 'success',
          });
          if (data?.status === 'queued' && issue.entity_slug) {
            startEnrichPolling(issue.entity_slug);
          }
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
        await handleResolve(issue.id);
        setToast({ message: `Saved ${field} for ${issue.entity_name}`, type: 'success' });
      } else {
        const data = await res.json().catch(() => null);
        const errorMsg = data?.error ?? `Failed to save ${field}`;
        setToast({ message: errorMsg, type: 'error' });
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
      setMergeState({ issueId: issue.id, entityA: data.a, entityB: data.b });
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

  const handleBulkAction = async (issueTypes: string[], bulkLabel: string) => {
    const typeSet = new Set(issueTypes);
    const matching = filteredIssues.filter(
      (i) => typeSet.has(i.issue_type) && TOOL_ACTIONS[i.issue_type]?.invoke && (!actionStates[i.id] || actionStates[i.id] === 'idle'),
    );
    if (matching.length === 0) return;

    setBulkRunning(bulkLabel);
    let succeeded = 0;
    let failed = 0;
    let resolved = 0;

    // Prefer bulkInvoke (single API call) over sequential invoke (N calls)
    const firstTool = TOOL_ACTIONS[matching[0].issue_type];
    if (firstTool?.bulkInvoke) {
      for (const issue of matching) {
        setActionStates((prev) => ({ ...prev, [issue.id]: 'running' }));
      }
      try {
        const res = await firstTool.bulkInvoke(matching);
        if (res.ok) {
          const data = await res.json().catch(() => null);
          const matchedCount = data?.matched ?? 0;
          succeeded = matching.length;

          // Auto-resolve issues where GPID was found
          if (matchedCount > 0) {
            // Refresh the full dashboard to pick up resolved issues
            await fetchData();
          }

          for (const issue of matching) {
            setActionStates((prev) => ({ ...prev, [issue.id]: 'done' }));
          }
        } else {
          for (const issue of matching) {
            setActionStates((prev) => ({ ...prev, [issue.id]: 'error' }));
          }
          failed = matching.length;
        }
      } catch {
        for (const issue of matching) {
          setActionStates((prev) => ({ ...prev, [issue.id]: 'error' }));
        }
        failed = matching.length;
      }
    } else if (firstTool?.batchOnce) {
      // Legacy batchOnce path (deprecated, use bulkInvoke)
      for (const issue of matching) {
        setActionStates((prev) => ({ ...prev, [issue.id]: 'running' }));
      }
      try {
        const res = await firstTool.invoke!(matching[0]);
        const newState = res.ok ? 'done' : 'error';
        for (const issue of matching) {
          setActionStates((prev) => ({ ...prev, [issue.id]: newState as ActionState }));
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
      const entityIdsToRescan = new Set<string>();
      for (const issue of matching) {
        const tool = TOOL_ACTIONS[issue.issue_type];
        if (!tool?.invoke) continue;
        setActionStates((prev) => ({ ...prev, [issue.id]: 'running' }));
        try {
          const res = await tool.invoke(issue);
          if (res.ok) {
            const data = await res.json().catch(() => null);
            setActionStates((prev) => ({ ...prev, [issue.id]: 'done' }));
            succeeded++;

            const gpidMatched = data?.action === 'seed-gpid-queue' && (data?.matched ?? 0) > 0;
            const wasSaved = data?.status === 'completed' && Object.values(data?.results ?? {}).some((r: Record<string, unknown>) => r.saved);
            const isEntityPatch = data?.entityId && data?.field;

            if (isEntityPatch || gpidMatched || wasSaved) {
              await handleResolve(issue.id);
              resolved++;
              if (issue.entity_id) entityIdsToRescan.add(issue.entity_id);
            }

            if (data?.status === 'queued' && issue.entity_slug) {
              startEnrichPolling(issue.entity_slug);
            }
          } else {
            setActionStates((prev) => ({ ...prev, [issue.id]: 'error' }));
            failed++;
          }
        } catch {
          setActionStates((prev) => ({ ...prev, [issue.id]: 'error' }));
          failed++;
        }
      }

      if (entityIdsToRescan.size > 0) {
        await Promise.allSettled(
          [...entityIdsToRescan].map((eid) =>
            fetch('/api/admin/tools/scan-issues', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'scan', entityId: eid }),
            })
          )
        );
        await fetchData();
      }
    }

    setBulkRunning(null);
    const resolvedMsg = resolved > 0 ? `, ${resolved} resolved` : '';
    setToast({
      message: `Bulk ${bulkLabel}: ${succeeded} processed${resolvedMsg}${failed ? `, ${failed} failed` : ''}`,
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

  // ── Derived state ──

  const filteredIssues = issues.filter((i) => {
    if (filterSeverity && i.severity !== filterSeverity) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    if (blockingOnly && !i.blocking_publish) return false;
    return true;
  });

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

  const lanes = Object.entries(LANE_META)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([cls, meta]) => ({
      cls,
      ...meta,
      issues: filteredIssues.filter((i) => i.problem_class === cls),
    }))
    .filter((lane) => lane.issues.length > 0);

  // Need-oriented sections (Actions tab redesign)
  // For completeness section: the detail API limits to 500 rows (high-severity first),
  // so low-severity completeness issues may not be in `issues`. Use summary counts instead.
  const completenessTypes = new Set(
    Object.entries(ISSUE_SECTION).filter(([, s]) => s === 'completeness').map(([t]) => t),
  );

  const sections: Section[] = Object.entries(SECTION_META)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, meta]) => {
      if (key === 'completeness' && summary?.by_type) {
        // Build completeness section from summary counts (not individual rows)
        const summaryGroups = summary.by_type
          .filter((t) => completenessTypes.has(t.issue_type))
          .sort((a, b) => b.count - a.count);
        if (summaryGroups.length === 0) return null;
        const totalCount = summaryGroups.reduce((s, g) => s + g.count, 0);
        return {
          key,
          label: meta.label,
          accent: meta.accent,
          accentBg: meta.accentBg,
          accentBorder: meta.accentBorder,
          issues: [], // no individual rows for completeness
          byType: summaryGroups.map((g) => ({
            issue_type: g.issue_type,
            label: ISSUE_NEED_LABELS[g.issue_type] ?? g.issue_type,
            issues: [], // summary-only
            summaryCount: g.count,
          })),
          entityCount: totalCount, // approximate (issues, not unique entities)
        };
      }

      const sectionIssues = filteredIssues.filter(
        (i) => (ISSUE_SECTION[i.issue_type] ?? 'completeness') === key,
      );
      const grouped: Record<string, IssueRow[]> = {};
      for (const issue of sectionIssues) {
        if (!grouped[issue.issue_type]) grouped[issue.issue_type] = [];
        grouped[issue.issue_type].push(issue);
      }
      const entityIds = new Set(sectionIssues.map((i) => i.entity_id));
      return {
        key,
        label: meta.label,
        accent: meta.accent,
        accentBg: meta.accentBg,
        accentBorder: meta.accentBorder,
        issues: sectionIssues,
        byType: Object.entries(grouped)
          .sort(([, a], [, b]) => b.length - a.length)
          .map(([type, issues]) => ({
            issue_type: type,
            label: ISSUE_NEED_LABELS[type] ?? type,
            issues,
          })),
        entityCount: entityIds.size,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null && (s.issues.length > 0 || s.byType.length > 0)) as Section[];

  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const issue of issues) {
    if (issue.severity in severityCounts) {
      severityCounts[issue.severity as keyof typeof severityCounts]++;
    }
  }

  return {
    // State
    issues, suppressed, summary, loading, scanning, toast,
    filterSeverity, filterStatus, blockingOnly,
    collapsedLanes, showSuppressed,
    actionStates, bulkRunning, enrichProgress,
    mergeState, merging,

    // Setters
    setFilterSeverity, setFilterStatus, setBlockingOnly,
    setShowSuppressed, setMergeState,

    // Handlers
    handleRescan, handleAction, handleInlineSave,
    handleSuppress, handleResolve, handleBulkAction,
    handleMerge, handleNotDuplicate,
    toggleLane,

    // Derived
    filteredIssues, bulkActions, lanes, sections, severityCounts,
  };
}
