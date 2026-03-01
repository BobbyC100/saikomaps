'use client';

/**
 * GPID Resolution Queue — Identity → GPID Queue
 * Human-in-the-loop for unresolved Google Place ID matches
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface GpidCandidate {
  google_place_id?: string;
  name?: string;
  formatted_address?: string;
  lat?: number;
  lng?: number;
  types?: string[];
  business_status?: string;
}

interface GpidCandidatesJson {
  candidates?: GpidCandidate[];
  num_candidates?: number;
  [key: string]: unknown;
}

interface GpidQueueItem {
  id: string;
  place_id: string;
  candidate_gpid: string | null;
  resolver_status: string;
  reason_code: string | null;
  similarity_score: number | null;
  candidates_json: GpidCandidatesJson | null;
  human_status: string;
  human_note: string | null;
  place?: {
    id: string;
    name: string;
    slug: string;
    googlePlaceId: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

const RESOLVER_STATUS_OPTIONS = ['MATCH', 'AMBIGUOUS', 'NO_MATCH', 'ERROR'] as const;
const REASON_CODES = ['TEXT_LOW_SIM', 'TEXT_MULTI_RESULTS', 'TEXT_ZERO_RESULTS', 'NEARBY_STRONG_MATCH', 'TEXT_SINGLE_HIGH_SIM', 'NEARBY_API_ERROR', 'TEXT_API_ERROR'];

export default function GpidQueuePage() {
  const [items, setItems] = useState<GpidQueueItem[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterReason, setFilterReason] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<GpidQueueItem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [manualGpid, setManualGpid] = useState('');
  const [selectedCandidateGpid, setSelectedCandidateGpid] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('human_status', 'PENDING');
      params.set('sort', 'similarity_desc');
      if (filterStatus) params.set('resolver_status', filterStatus);
      if (filterReason) params.set('reason_code', filterReason);
      const res = await fetch(`/api/admin/gpid-queue?${params}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items ?? []);
        setStats(data.stats ?? { pending: 0, approved: 0, rejected: 0 });
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [filterStatus, filterReason]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    setManualGpid('');
    setSelectedCandidateGpid(null);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedItem(null);
      return;
    }
    const found = items.find((i) => i.id === selectedId);
    if (found) {
      setSelectedItem(found);
      return;
    }
    fetch(`/api/admin/gpid-queue/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setSelectedItem(d))
      .catch(() => setSelectedItem(null));
  }, [selectedId, items]);

  const handleApprove = async () => {
    if (!selectedItem) return;
    const gpidToApply =
      selectedItem.candidate_gpid ?? selectedCandidateGpid ?? manualGpid.trim();
    if (!gpidToApply || gpidToApply.length < 20) return;
    setActionLoading('approve');
    try {
      const res = await fetch(`/api/admin/gpid-queue/${selectedItem.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateGpid: gpidToApply }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
        setSelectedId(null);
        setSelectedItem(null);
        setManualGpid('');
        setSelectedCandidateGpid(null);
        setStats((s) => ({ ...s, pending: Math.max(0, s.pending - 1), approved: s.approved + 1 }));
      }
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    setActionLoading('reject');
    try {
      const res = await fetch(`/api/admin/gpid-queue/${selectedItem.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
        setSelectedId(null);
        setSelectedItem(null);
        setStats((s) => ({ ...s, pending: Math.max(0, s.pending - 1), rejected: s.rejected + 1 }));
      }
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  const handleMarkAmbiguous = async () => {
    if (!selectedItem) return;
    setActionLoading('ambiguous');
    try {
      const res = await fetch(`/api/admin/gpid-queue/${selectedItem.id}/mark-ambiguous`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
        setSelectedId(null);
        setSelectedItem(null);
        setStats((s) => ({ ...s, pending: Math.max(0, s.pending - 1), rejected: s.rejected + 1 }));
      }
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  const handleSkip = async () => {
    if (!selectedItem) return;
    setActionLoading('skip');
    try {
      await fetch(`/api/admin/gpid-queue/${selectedItem.id}/skip`, { method: 'POST' });
      setSelectedId(null);
      setSelectedItem(null);
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  return (
    <div className="py-8 px-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[#36454F]">GPID Resolution Queue</h1>
          <p className="text-[#8B7355] text-sm mt-1">
            Unresolved identity items — approve GPID, reject (no match), or mark ambiguous
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <span className="text-sm text-[#8B7355]">
            Pending: <strong>{stats.pending}</strong>
          </span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border rounded px-2 py-1 bg-white"
          >
            <option value="">All statuses</option>
            {RESOLVER_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filterReason}
            onChange={(e) => setFilterReason(e.target.value)}
            className="text-sm border rounded px-2 py-1 bg-white"
          >
            <option value="">All reasons</option>
            {REASON_CODES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={fetchQueue}
            disabled={loading}
            className="text-sm text-[#5BA7A7] hover:underline disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-[#8B7355]">Loading...</p>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center text-[#8B7355]">
            No pending items. Run the backfill script to seed the queue from resolver output.
          </div>
        ) : (
          <div className="flex gap-6">
            <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F0E1] text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium text-[#36454F]">Place</th>
                    <th className="px-4 py-2 font-medium text-[#36454F]">Current GPID</th>
                    <th className="px-4 py-2 font-medium text-[#36454F]">Candidate</th>
                    <th className="px-4 py-2 font-medium text-[#36454F]">Status</th>
                    <th className="px-4 py-2 font-medium text-[#36454F]">Reason</th>
                    <th className="px-4 py-2 font-medium text-[#36454F]">Similarity</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`border-t border-[#C3B091]/30 cursor-pointer hover:bg-[#F5F0E1]/50 ${
                        selectedId === item.id ? 'bg-[#F5F0E1]' : ''
                      }`}
                    >
                      <td className="px-4 py-2">
                        <Link
                          href={`/place/${item.place?.slug ?? item.place_id}`}
                          target="_blank"
                          className="text-[#5BA7A7] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.place?.name ?? item.place_id}
                        </Link>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-[#8B7355]">
                        {item.place?.googlePlaceId ? `${item.place.googlePlaceId.slice(0, 20)}…` : '—'}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {item.candidate_gpid ? `${item.candidate_gpid.slice(0, 20)}…` : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            item.resolver_status === 'MATCH'
                              ? 'bg-green-100 text-green-800'
                              : item.resolver_status === 'AMBIGUOUS'
                                ? 'bg-amber-100 text-amber-800'
                                : item.resolver_status === 'NO_MATCH'
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.resolver_status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[#8B7355]">{item.reason_code ?? '—'}</td>
                      <td className="px-4 py-2">
                        {item.similarity_score != null ? `${Math.round(item.similarity_score)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedItem && (
              <div className="w-96 shrink-0 bg-white rounded-xl shadow-sm border border-[#C3B091]/30 overflow-hidden">
                <div className="p-4 border-b border-[#C3B091]/30">
                  <h3 className="font-semibold text-[#36454F]">{selectedItem.place?.name ?? selectedItem.place_id}</h3>
                  {selectedItem.place?.address && (
                    <p className="text-sm text-[#8B7355] mt-1">{selectedItem.place.address}</p>
                  )}
                  {(() => {
                    const lat = Number(selectedItem.place?.latitude);
                    const lng = Number(selectedItem.place?.longitude);
                    return Number.isFinite(lat) && Number.isFinite(lng) ? (
                      <p className="text-xs text-[#8B7355] mt-1">
                        {lat.toFixed(4)}, {lng.toFixed(4)}
                      </p>
                    ) : (
                      <p className="text-xs text-[#8B7355] mt-1">—</p>
                    );
                  })()}
                  <p className="text-xs text-[#8B7355] mt-2">
                    Status: {selectedItem.resolver_status} · Reason: {selectedItem.reason_code ?? '—'}
                  </p>
                  {(() => {
                    const cj = selectedItem.candidates_json as GpidCandidatesJson | null | undefined;
                    const candidates = Array.isArray(cj?.candidates) ? cj.candidates : [];
                    if (candidates.length > 0) {
                      return (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-[#36454F] mb-1">Select candidate:</p>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {candidates.map((candidate, idx) => {
                              const gpid = candidate.google_place_id ?? '';
                              const isSelected = selectedCandidateGpid === gpid;
                              return (
                                <button
                                  key={gpid || idx}
                                  type="button"
                                  onClick={() => setSelectedCandidateGpid(isSelected ? null : gpid)}
                                  className={`w-full text-left text-xs p-2 rounded border transition-colors ${
                                    isSelected
                                      ? 'border-[#5BA7A7] bg-[#5BA7A7]/10'
                                      : 'border-[#C3B091]/40 hover:border-[#5BA7A7]/50'
                                  }`}
                                >
                                  <span className="font-medium text-[#36454F]">{candidate.name ?? '—'}</span>
                                  {candidate.formatted_address && (
                                    <p className="text-[#8B7355] truncate mt-0.5">{candidate.formatted_address}</p>
                                  )}
                                  {gpid && (
                                    <p className="font-mono text-[10px] text-[#8B7355] mt-0.5 truncate">
                                      {gpid.slice(0, 28)}…
                                    </p>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {selectedItem.candidates_json != null &&
                  !Array.isArray((selectedItem.candidates_json as GpidCandidatesJson)?.candidates) ? (
                    <details className="mt-2">
                      <summary className="text-xs text-[#5BA7A7] cursor-pointer">Candidates JSON</summary>
                      <pre className="mt-1 text-xs bg-[#F5F0E1] p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(selectedItem.candidates_json, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
                <div className="p-4 flex flex-col gap-2">
                  {(!selectedItem.candidate_gpid || selectedItem.resolver_status === 'AMBIGUOUS') && (
                    <input
                      type="text"
                      placeholder="Manual GPID (paste from candidates)"
                      value={manualGpid}
                      onChange={(e) => setManualGpid(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg font-mono"
                    />
                  )}
                  {(selectedItem.candidate_gpid ||
                    selectedCandidateGpid ||
                    manualGpid.trim().length >= 20) && (
                    <button
                      onClick={handleApprove}
                      disabled={!!actionLoading}
                      className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {actionLoading === 'approve' ? '…' : 'Approve → Apply GPID'}
                    </button>
                  )}
                  <button
                    onClick={handleReject}
                    disabled={!!actionLoading}
                    className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 text-sm font-medium"
                  >
                    {actionLoading === 'reject' ? '…' : 'Reject (NO_MATCH)'}
                  </button>
                  <button
                    onClick={handleMarkAmbiguous}
                    disabled={!!actionLoading}
                    className="w-full py-2 px-4 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 disabled:opacity-50 text-sm font-medium"
                  >
                    {actionLoading === 'ambiguous' ? '…' : 'Mark AMBIGUOUS'}
                  </button>
                  <button
                    onClick={handleSkip}
                    disabled={!!actionLoading}
                    className="w-full py-2 px-4 text-[#8B7355] hover:text-[#36454F] disabled:opacity-50 text-sm"
                  >
                    {actionLoading === 'skip' ? '…' : 'Skip'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
