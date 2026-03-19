'use client';

/**
 * Coverage Operations — Triage Board
 * Phase 2 of Coverage Operations (COVOPS-APPROACH-V1).
 *
 * State management: ./use-coverage-ops.ts
 * Tool wiring:      ./tool-actions.ts
 * Types:            ./types.ts
 * Constants:        ./constants.ts
 */

import Link from 'next/link';
import { useState } from 'react';
import { useCoverageOps } from './use-coverage-ops';
import { TOOL_ACTIONS } from './tool-actions';
import {
  C, SEVERITY_STYLES, ISSUE_TYPE_LABELS, INLINE_EDITABLE,
  SUPPRESS_REASON, TOTAL_STAGES, STAGE_LABELS,
} from './constants';
import type {
  IssueRow, CompareEntity, EnrichProgress, ActionState,
  GoogleSaysClosedDetail, PotentialDuplicateDetail,
} from './types';

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function CoverageOpsPage() {
  const ops = useCoverageOps();

  if (ops.loading) {
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
            Triage board &middot; {ops.summary?.total_active ?? ops.issues.length} active issues across {new Set(ops.issues.map((i) => i.entity_id)).size} entities
          </p>
        </header>

        {/* Summary Stats */}
        <div className="rounded-xl p-5 shadow-sm mb-6" style={{ backgroundColor: C.cardBg }}>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <StatCard label="Active" value={ops.summary?.total_active ?? ops.issues.length} />
            <StatCard label="Blocking" value={ops.summary?.blocking_publish_entities ?? 0} color={C.red} />
            <StatCard label="Critical" value={ops.severityCounts.critical} color={C.red} />
            <StatCard label="High" value={ops.severityCounts.high} color={C.amber} />
            <StatCard label="Medium" value={ops.severityCounts.medium} color={C.muted} />
            <StatCard label="Low" value={ops.severityCounts.low} color="#A09078" />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={ops.filterSeverity}
            onChange={(e) => ops.setFilterSeverity(e.target.value)}
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
            value={ops.filterStatus}
            onChange={(e) => ops.setFilterStatus(e.target.value)}
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
              checked={ops.blockingOnly}
              onChange={(e) => ops.setBlockingOnly(e.target.checked)}
              className="rounded"
            />
            Blocking only
          </label>

          <div className="flex-1" />

          {/* Bulk Action Buttons */}
          {ops.bulkActions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: C.muted }}>Bulk:</span>
              {ops.bulkActions.map((ba) => (
                <button
                  key={ba.label}
                  onClick={() => ops.handleBulkAction(ba.issueTypes, ba.label)}
                  disabled={ops.bulkRunning !== null}
                  className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: C.accent, color: '#fff' }}
                >
                  {ops.bulkRunning === ba.label ? 'Running...' : `${ba.label} (${ba.count})`}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={ops.handleRescan}
            disabled={ops.scanning}
            className="px-4 py-1.5 rounded text-sm font-medium border disabled:opacity-50"
            style={{ borderColor: C.border, color: C.muted, backgroundColor: 'transparent' }}
          >
            {ops.scanning ? 'Scanning...' : 'Re-scan Issues'}
          </button>
        </div>

        {/* Problem Lanes */}
        {ops.lanes.map((lane) => (
          <div
            key={lane.cls}
            className="rounded-xl shadow-sm mb-5 overflow-hidden"
            style={{ backgroundColor: C.cardBg }}
          >
            <button
              onClick={() => ops.toggleLane(lane.cls)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[#F5F0E1]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg leading-none">{lane.icon}</span>
                <h2 className="text-base font-bold" style={{ color: C.text }}>{lane.label}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: C.bg, color: C.muted }}>
                  {lane.issues.length}
                </span>
              </div>
              <span style={{ color: C.muted }}>
                {ops.collapsedLanes.has(lane.cls) ? '▸' : '▾'}
              </span>
            </button>

            {!ops.collapsedLanes.has(lane.cls) && (
              <div className="divide-y" style={{ borderColor: `${C.border}33` }}>
                {lane.issues.map((issue) => (
                  <IssueRowComponent
                    key={issue.id}
                    issue={issue}
                    actionState={ops.actionStates[issue.id] ?? 'idle'}
                    enrichProgress={ops.enrichProgress[issue.entity_slug] ?? null}
                    onAction={() => ops.handleAction(issue)}
                    onSuppress={(reason) => ops.handleSuppress(issue.id, reason)}
                    onResolve={() => ops.handleResolve(issue.id)}
                    onInlineSave={(field, value) => ops.handleInlineSave(issue, field, value)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Empty state */}
        {ops.lanes.length === 0 && !ops.loading && (
          <div className="rounded-xl p-12 text-center shadow-sm" style={{ backgroundColor: C.cardBg }}>
            <p className="text-lg font-medium" style={{ color: C.green }}>All clear</p>
            <p className="text-sm mt-1" style={{ color: C.muted }}>No active issues match the current filters.</p>
          </div>
        )}

        {/* Suppressed Section */}
        {ops.suppressed.length > 0 && (
          <div className="rounded-xl shadow-sm mt-8 overflow-hidden" style={{ backgroundColor: C.cardBg, opacity: 0.7 }}>
            <button
              onClick={() => ops.setShowSuppressed(!ops.showSuppressed)}
              className="w-full flex items-center justify-between px-5 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: C.muted }}>Suppressed</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: C.bg, color: C.muted }}>
                  {ops.suppressed.length}
                </span>
              </div>
              <span className="text-xs" style={{ color: C.muted }}>
                {ops.showSuppressed ? '▾' : '▸'}
              </span>
            </button>
            {ops.showSuppressed && (
              <div className="divide-y" style={{ borderColor: `${C.border}33` }}>
                {ops.suppressed.map((issue) => (
                  <div key={issue.id} className="flex items-center gap-4 px-5 py-2.5">
                    <SeverityPill severity={issue.severity} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm" style={{ color: C.muted }}>{issue.entity_name}</span>
                      <span className="text-xs ml-2" style={{ color: '#A09078' }}>
                        {ISSUE_TYPE_LABELS[issue.issue_type] ?? issue.issue_type}
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: C.bg, color: C.muted }}>
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
      {ops.mergeState && (
        <MergeModal
          entityA={ops.mergeState.entityA}
          entityB={ops.mergeState.entityB}
          merging={ops.merging}
          onMerge={ops.handleMerge}
          onNotDuplicate={ops.handleNotDuplicate}
          onClose={() => ops.setMergeState(null)}
        />
      )}

      {/* Toast */}
      {ops.toast && (
        <div
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-sm"
          style={{
            backgroundColor: ops.toast.type === 'success' ? C.greenBg : C.redBg,
            color: ops.toast.type === 'success' ? C.green : C.red,
            border: `1px solid ${ops.toast.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
          }}
        >
          {ops.toast.message}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: `${C.border}66` }}>
      <div className="text-[11px] uppercase tracking-wider mb-0.5" style={{ color: C.muted }}>{label}</div>
      <div className="text-xl font-bold" style={{ color: color ?? C.text }}>{value.toLocaleString()}</div>
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
  issue, actionState, enrichProgress, onAction, onSuppress, onResolve, onInlineSave,
}: {
  issue: IssueRow;
  actionState: ActionState;
  enrichProgress: EnrichProgress | null;
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
      <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#F5F0E1]/40 transition-colors">
        <button
          onClick={() => setShowExtra(!showExtra)}
          className="text-xs shrink-0 w-4 text-center opacity-40 hover:opacity-100"
          style={{ color: C.muted }}
          title="Add extra info (coverage links, etc.)"
        >
          {showExtra ? '−' : '+'}
        </button>

        <SeverityPill severity={issue.severity} />

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
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0" style={{ backgroundColor: C.redBg, color: C.red }}>
                blocking
              </span>
            )}
          </div>
          <div className="text-xs truncate" style={{ color: C.muted }}>
            {ISSUE_TYPE_LABELS[issue.issue_type] ?? issue.issue_type}
            {issue.issue_type === 'google_says_closed' && issue.detail && (
              <span className="ml-1 font-semibold" style={{ color: C.red }}>
                ({(issue.detail as GoogleSaysClosedDetail).googleStatus === 'CLOSED_PERMANENTLY' ? 'Permanently' : 'Temporarily'})
              </span>
            )}
            {issue.issue_type === 'potential_duplicate' && issue.detail && (() => {
              const d = issue.detail as PotentialDuplicateDetail;
              return (
                <span className="ml-1" style={{ color: C.amber }}>
                  — possible duplicate of {d.duplicate_of_name}
                  {d.match_reasons && (
                    <span className="ml-1 opacity-70">[{d.match_reasons.join(', ')}]</span>
                  )}
                </span>
              );
            })()}
          </div>
          {enrichProgress && !enrichProgress.done && (
            <>
              <EnrichProgressBar progress={enrichProgress} />
              <div className="text-[9px] mt-0.5" style={{ color: C.muted }}>Running in background…</div>
            </>
          )}
          {enrichProgress?.done && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-semibold" style={{ color: C.green }}>
                ✓ Enrichment complete (stage {enrichProgress.stage}/{TOTAL_STAGES})
              </span>
            </div>
          )}
          {enrichProgress?.error && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-semibold" style={{ color: C.red }}>✗ {enrichProgress.error}</span>
            </div>
          )}
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
              onClick={() => { setInlineSaving(true); onInlineSave(editable.field, 'NONE'); }}
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
                backgroundColor: actionState === 'done' ? C.greenBg : actionState === 'error' ? C.redBg : C.accent,
                color: actionState === 'done' ? C.green : actionState === 'error' ? C.red : '#fff',
              }}
            >
              {actionState === 'idle' ? tool.label : actionState === 'running' ? '...' : actionState === 'done' ? tool.queuedLabel : 'Retry'}
            </button>
          ) : null}

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

      {/* Expandable extra info */}
      {showExtra && (
        <div className="px-5 py-2 ml-7 mb-1 rounded" style={{ backgroundColor: '#FAFAF5', border: `1px solid ${C.border}` }}>
          <div className="text-xs font-semibold mb-1.5" style={{ color: C.text }}>Add coverage link</div>
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
              <span className="text-xs" style={{ color: coverageMsg === 'Added' ? C.green : C.red }}>{coverageMsg}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EnrichProgressBar({ progress }: { progress: EnrichProgress }) {
  const currentStage = progress.stage ?? 0;
  const pct = Math.round((currentStage / TOTAL_STAGES) * 100);
  const currentLabel = currentStage > 0 ? STAGE_LABELS[currentStage] ?? `Stage ${currentStage}` : 'Starting…';
  const nextLabel = currentStage < TOTAL_STAGES ? STAGE_LABELS[currentStage + 1] ?? '' : '';

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${C.border}44`, maxWidth: 200 }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: currentStage > 0 ? C.accent : `${C.accent}80`,
            minWidth: currentStage >= 0 ? 6 : 0,
          }}
        />
      </div>
      <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: C.accent }}>
        {currentStage > 0 ? (
          <>{currentStage}/{TOTAL_STAGES}{' · '}{nextLabel ? `→ ${nextLabel}` : currentLabel}</>
        ) : (
          <><span className="inline-block animate-pulse">●</span> {currentLabel}</>
        )}
      </span>
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
  entityA, entityB, merging, onMerge, onNotDuplicate, onClose,
}: {
  entityA: CompareEntity; entityB: CompareEntity; merging: boolean;
  onMerge: (keepId: string, deleteId: string) => void;
  onNotDuplicate: () => void;
  onClose: () => void;
}) {
  const formatVal = (v: unknown) => {
    if (v === null || v === undefined) return '--';
    if (typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(v).toLocaleDateString();
    return String(v);
  };

  const renderSide = (entity: CompareEntity, other: CompareEntity) => (
    <div className="flex-1 rounded-lg border p-4" style={{ borderColor: C.border, backgroundColor: C.cardBg }}>
      <h3 className="text-base font-bold mb-1" style={{ color: C.text }}>{entity.name}</h3>
      <p className="text-xs mb-3" style={{ color: C.muted }}>{entity.slug}</p>

      <div className="flex gap-3 mb-4">
        {[
          { label: 'Surfaces', val: entity._counts.merchant_surfaces },
          { label: 'Artifacts', val: entity._counts.merchant_surface_artifacts },
          { label: 'Issues', val: entity._counts.coverage_issues },
        ].map((c) => (
          <div key={c.label} className="text-center rounded px-2 py-1" style={{ backgroundColor: C.bg }}>
            <div className="text-xs font-bold" style={{ color: C.text }}>{c.val}</div>
            <div className="text-[10px]" style={{ color: C.muted }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        {COMPARE_FIELDS.map(({ key, label }) => {
          const val = entity[key];
          const otherVal = other[key];
          const hasValue = val !== null && val !== undefined;
          const otherHas = otherVal !== null && otherVal !== undefined;
          const isUnique = hasValue && !otherHas;
          return (
            <div key={key} className="flex items-baseline gap-2">
              <span className="text-[10px] w-24 shrink-0 text-right" style={{ color: C.muted }}>{label}</span>
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
      <div className="absolute inset-0 bg-black/40" onClick={!merging ? onClose : undefined} />
      <div className="relative z-10 rounded-xl shadow-xl p-6 max-w-5xl w-[95vw] mx-4 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: C.bg }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: C.text }}>Duplicate Detected &mdash; Choose Which to Keep</h2>
          <button onClick={onClose} disabled={merging} className="text-lg px-2 hover:opacity-70" style={{ color: C.muted }}>&times;</button>
        </div>
        <p className="text-xs mb-4" style={{ color: C.muted }}>
          The other entity will be merged into the one you keep. All surfaces, artifacts, and issues will be reassigned. Missing fields will be gap-filled from the deleted entity.
        </p>
        <div className="flex gap-4">
          {renderSide(entityA, entityB)}
          {renderSide(entityB, entityA)}
        </div>
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
