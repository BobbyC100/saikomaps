/**
 * IdentityEnrichmentPanel
 *
 * Shown for `new_entity_review` items that have gone through the machine
 * identity enrichment gate. Surfaces what the machine found so the human is
 * confirming, not discovering.
 *
 * Layout:
 *   [Status banner]  — enrichment outcome + confidence
 *   [Intake record]  — what came in
 *   [Machine evidence] — top candidate, anchors, sufficiency rule
 *   [Run history]    — collapsible per-step log
 */

'use client';

import { useState } from 'react';
import type { HydratedRecord, EnrichmentRun } from '@/lib/review-queue';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SOURCE_LABELS: Record<string, string> = {
  google_candidate_search: 'Google Search',
  gpid_detection: 'GPID Detection',
  website_discovery: 'Website',
  instagram_discovery: 'Instagram',
  corroboration: 'Corroboration',
};

const RULE_LABELS: Record<string, string> = {
  rule1_gpid_name: 'GPID + name match',
  rule2_website_name_city: 'Website + name + city',
  rule3_instagram_name_city_corr: 'Instagram + name + city + corroborator',
  rule4_address_name_anchor: 'Address + name + web/GPID anchor',
};

function confidencePct(v: number | null): string {
  if (v == null) return '—';
  return `${Math.round(v * 100)}%`;
}

function statusBadgeClass(status: string | null): string {
  switch (status) {
    case 'sufficient':
      return 'bg-green-50 border-green-300 text-green-800';
    case 'needs_review':
      return 'bg-amber-50 border-amber-300 text-amber-800';
    case 'unresolved':
      return 'bg-red-50 border-red-300 text-red-800';
    default:
      return 'bg-gray-50 border-gray-200 text-gray-600';
  }
}

function statusLabel(status: string | null): string {
  switch (status) {
    case 'sufficient':   return 'Machine-sufficient — confirm identity';
    case 'needs_review': return 'Partial evidence — review required';
    case 'unresolved':   return 'No candidates found — discovery required';
    default:             return 'Enrichment pending';
  }
}

// ---------------------------------------------------------------------------
// Extract top candidate from runs
// ---------------------------------------------------------------------------

interface TopCandidate {
  name: string | null;
  gpid: string | null;
  website: string | null;
  instagram: string | null;
  address: string | null;
  phone: string | null;
  ruleFired: string | null;
  similarity: number | null;
}

function extractTopCandidate(runs: EnrichmentRun[]): TopCandidate {
  const out: TopCandidate = {
    name: null, gpid: null, website: null, instagram: null,
    address: null, phone: null, ruleFired: null, similarity: null,
  };

  for (const run of runs) {
    const j = run.result_json ?? {};

    if (run.source_name === 'google_candidate_search') {
      out.name = j.best_candidate_name ?? out.name;
      out.similarity = j.best_score ?? out.similarity;
    }

    if (run.source_name === 'gpid_detection') {
      out.gpid = j.gpid_found ?? out.gpid;
      if (j.place_details) {
        out.website = j.place_details.website ?? out.website;
        out.phone = j.place_details.phone ?? out.phone;
        out.address = j.place_details.address ?? out.address;
        out.name = j.place_details.name ?? out.name;
      }
      out.ruleFired = j.sufficiency_check?.ruleFired ?? out.ruleFired;
    }

    if (run.source_name === 'website_discovery') {
      out.website = j.website_found ?? out.website;
      out.ruleFired = j.sufficiency_check?.ruleFired ?? out.ruleFired;
    }

    if (run.source_name === 'instagram_discovery') {
      out.instagram = j.instagram_found ?? out.instagram;
      out.ruleFired = j.sufficiency_check?.ruleFired ?? out.ruleFired;
    }

    if (run.source_name === 'corroboration') {
      // Prefer final anchors for completeness
      const anchors = j.final_anchors ?? {};
      out.gpid = anchors.gpid ?? out.gpid;
      out.website = anchors.website ?? out.website;
      out.instagram = anchors.instagram ?? out.instagram;
      out.address = anchors.verifiedAddress ?? out.address;
      out.phone = anchors.phone ?? out.phone;
      out.ruleFired = j.sufficiency_check?.ruleFired ?? out.ruleFired;
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AnchorPill({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold w-20 shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-800 font-mono break-all">{value}</span>
    </div>
  );
}

function RunHistoryRow({ run }: { run: EnrichmentRun }) {
  const [open, setOpen] = useState(false);

  const statusDot =
    run.decision_status === 'sufficient'
      ? 'bg-green-500'
      : run.decision_status === 'needs_review'
        ? 'bg-amber-400'
        : 'bg-gray-300';

  return (
    <div className="border border-gray-100 rounded-md overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />
        <span className="text-sm font-medium text-gray-700 flex-1">
          {SOURCE_LABELS[run.source_name] ?? run.source_name}
        </span>
        {run.searched_name && (
          <span className="text-xs text-gray-400 truncate max-w-[160px]">
            "{run.searched_name}"
            {run.searched_city ? ` · ${run.searched_city}` : ''}
          </span>
        )}
        <span className="text-xs text-gray-500 shrink-0">
          {confidencePct(run.identity_confidence)} · {run.anchor_count} anchors
        </span>
        <span className="text-gray-300 ml-1">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <pre className="text-[11px] text-gray-600 whitespace-pre-wrap break-all leading-relaxed font-mono">
            {JSON.stringify(run.result_json, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

interface IdentityEnrichmentPanelProps {
  item: {
    queue_id: string;
    conflict_type: string;
    identity_enrichment_status: string | null;
    identity_anchor_count: number | null;
    latest_identity_confidence: number | null;
    enrichment_runs: EnrichmentRun[];
    recordA: HydratedRecord;
  };
}

export function IdentityEnrichmentPanel({ item }: IdentityEnrichmentPanelProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const status = item.identity_enrichment_status;
  const candidate = extractTopCandidate(item.enrichment_runs);
  const record = item.recordA;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">

      {/* Status banner */}
      <div className={`px-6 py-3 border-b ${statusBadgeClass(status)} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest">
            {statusLabel(status)}
          </span>
          {candidate.ruleFired && (
            <span className="text-xs opacity-70">
              via {RULE_LABELS[candidate.ruleFired] ?? candidate.ruleFired}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span>
            confidence{' '}
            <strong>{confidencePct(item.latest_identity_confidence)}</strong>
          </span>
          <span>
            anchors{' '}
            <strong>{item.identity_anchor_count ?? '—'}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-gray-100">

        {/* Left: intake record */}
        <div className="px-6 py-5">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3">
            Intake record · {record.source_name.replace(/_/g, ' ')}
          </p>
          <p className="text-lg font-semibold text-gray-900 mb-3">{record.name}</p>
          <div className="space-y-0">
            <AnchorPill label="Address" value={record.address ?? null} />
            <AnchorPill label="City" value={record.raw_json?.address_city ?? null} />
            <AnchorPill label="Neighborhood" value={record.neighborhood ?? null} />
            <AnchorPill label="Category" value={record.category ?? null} />
            <AnchorPill label="Phone" value={record.phone ?? null} />
            <AnchorPill label="Website" value={record.raw_json?.website ?? null} />
            <AnchorPill label="Instagram" value={record.raw_json?.instagram ?? null} />
          </div>
        </div>

        {/* Right: machine-found candidate */}
        <div className="px-6 py-5">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3">
            Machine candidate
          </p>

          {candidate.name ? (
            <>
              <p className="text-lg font-semibold text-gray-900 mb-3">{candidate.name}</p>
              <div className="space-y-0">
                <AnchorPill label="GPID" value={candidate.gpid} />
                <AnchorPill label="Address" value={candidate.address} />
                <AnchorPill label="Phone" value={candidate.phone} />
                <AnchorPill label="Website" value={candidate.website} />
                <AnchorPill label="Instagram" value={candidate.instagram} />
                {candidate.similarity != null && (
                  <AnchorPill
                    label="Name sim"
                    value={`${Math.round(candidate.similarity * 100)}%`}
                  />
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic mt-2">No candidate found</p>
          )}
        </div>
      </div>

      {/* Enrichment run history (collapsible) */}
      {item.enrichment_runs.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className="w-full px-6 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Machine lookup history · {item.enrichment_runs.length} step
              {item.enrichment_runs.length !== 1 ? 's' : ''}
            </span>
            <span className="text-gray-400 text-xs">{historyOpen ? '▲ hide' : '▼ show'}</span>
          </button>

          {historyOpen && (
            <div className="px-6 pb-5 space-y-2">
              {item.enrichment_runs.map((run) => (
                <RunHistoryRow key={run.id} run={run} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer hint */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          new entity · no prior canonical record
        </span>
        {status === 'sufficient' && (
          <span className="text-xs text-green-700 font-medium">
            Machine found a strong match — use Same Place to confirm, Different to reject
          </span>
        )}
        {status === 'needs_review' && (
          <span className="text-xs text-amber-700 font-medium">
            Partial evidence — human judgment required
          </span>
        )}
        {status === 'unresolved' && (
          <span className="text-xs text-red-700 font-medium">
            No candidates found — consider flagging for manual lookup
          </span>
        )}
      </div>
    </div>
  );
}
