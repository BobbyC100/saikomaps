'use client';

/**
 * Admin Actors → [slug] → Candidates
 * List PENDING candidates; Approve, Reject, Search & Attach
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface PlaceRef {
  id: string;
  name: string;
  slug: string;
}

interface Candidate {
  id: string;
  candidateName: string;
  candidateUrl: string | null;
  candidateAddress: string | null;
  sourceUrl: string;
  placeId: string | null;
  place: PlaceRef | null;
  matchScore: number;
  matchReason: string | null;
  confidenceBucket: string | null;
  status: string;
  rejectionReason: string | null;
  existingPrimaryOperator?: { id: string; name: string } | null;
}

export default function ActorCandidatesPage() {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  const [actorId, setActorId] = useState<string | null>(null);
  const [actorName, setActorName] = useState<string>('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [attachPlaceId, setAttachPlaceId] = useState<Record<string, string>>({});
  const [placeSearchResults, setPlaceSearchResults] = useState<Record<string, { id: string; name: string; slug: string }[]>>({});

  const fetchActorBySlug = useCallback(async (s: string) => {
    const res = await fetch(`/api/actors/${encodeURIComponent(s)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.actor ? { id: data.data.actor.id, name: data.data.actor.name } : null;
  }, []);

  const fetchCandidates = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/actors/${id}/candidates?status=PENDING`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.candidates ?? [];
  }, []);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    fetchActorBySlug(slug).then((actor) => {
      if (cancelled || !actor) {
        setActorId(null);
        setCandidates([]);
        setLoading(false);
        return;
      }
      setActorId(actor.id);
      setActorName(actor.name);
      fetchCandidates(actor.id).then((list) => {
        if (!cancelled) setCandidates(list);
        setLoading(false);
      });
    });
    return () => { cancelled = true; };
  }, [slug, fetchActorBySlug, fetchCandidates]);

  const handleApprove = async (c: Candidate) => {
    if (!c.placeId) return;
    setActionLoading(c.id);
    try {
      const res = await fetch(`/api/admin/actors/candidates/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', placeId: c.placeId }),
      });
      if (res.ok && actorId) {
        setCandidates(await fetchCandidates(actorId));
      }
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  const handleReject = async (c: Candidate) => {
    setActionLoading(c.id);
    try {
      const res = await fetch(`/api/admin/actors/candidates/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason: rejectReason[c.id] || undefined }),
      });
      if (res.ok && actorId) {
        setCandidates(await fetchCandidates(actorId));
      }
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  const handleAttach = async (c: Candidate) => {
    const placeId = attachPlaceId[c.id]?.trim();
    if (!placeId) return;
    setActionLoading(c.id);
    try {
      const res = await fetch(`/api/admin/actors/candidates/${c.id}/attach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId }),
      });
      if (res.ok && actorId) {
        setCandidates(await fetchCandidates(actorId));
        setAttachPlaceId((prev) => ({ ...prev, [c.id]: '' }));
        setPlaceSearchResults((prev) => ({ ...prev, [c.id]: [] }));
      }
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  const searchPlaces = async (candidateId: string, q: string) => {
    if (!q.trim()) {
      setPlaceSearchResults((prev) => ({ ...prev, [candidateId]: [] }));
      return;
    }
    try {
      const res = await fetch(`/api/admin/places/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setPlaceSearchResults((prev) => ({
        ...prev,
        [candidateId]: Array.isArray(data.places) ? data.places : [],
      }));
    } catch {
      setPlaceSearchResults((prev) => ({ ...prev, [candidateId]: [] }));
    }
  };

  const rerunMatching = async () => {
    if (!actorId) return;
    setActionLoading('rerun');
    try {
      const res = await fetch(`/api/admin/actors/${actorId}/candidates`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates ?? await fetchCandidates(actorId));
      }
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  if (!slug) {
    return (
      <div className="py-8 px-6">
        <p className="text-[#8B7355]">Missing actor slug.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-8 px-6">
        <p className="text-[#8B7355]">Loading…</p>
      </div>
    );
  }

  if (!actorId) {
    return (
      <div className="py-8 px-6">
        <p className="text-[#8B7355]">Actor not found.</p>
        <Link href="/admin/actors/submit-url" className="text-[#5BA7A7] hover:underline mt-2 inline-block">
          Submit URL
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8 px-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-[#8B7355] mb-2">
            <Link href="/admin" className="hover:text-[#36454F]">Admin</Link>
            <span>/</span>
            <Link href="/admin/actors/submit-url" className="hover:text-[#36454F]">Actors</Link>
            <span>/</span>
            <Link href={`/actor/${slug}`} className="hover:text-[#36454F]">{actorName || slug}</Link>
            <span>/</span>
            <span className="text-[#36454F] font-medium">Candidates</span>
          </nav>
          <h1 className="text-2xl font-bold text-[#36454F]">Link candidates</h1>
          <p className="text-[#8B7355] text-sm mt-1">
            Approve, reject, or manually attach venue candidates to places
          </p>
          <button
            type="button"
            onClick={rerunMatching}
            disabled={!!actionLoading}
            className="mt-2 text-sm text-[#5BA7A7] hover:underline disabled:opacity-50"
          >
            {actionLoading === 'rerun' ? 'Running…' : 'Re-run matching'}
          </button>
        </header>

        {candidates.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center text-[#8B7355]">
            No PENDING candidates. Submit a URL on the Actors page to ingest venues.
          </div>
        ) : (
          <ul className="space-y-4">
            {candidates.map((c) => (
              <li
                key={c.id}
                className="bg-white rounded-xl shadow-sm border border-[#C3B091]/30 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[#36454F]">{c.candidateName}</p>
                    {c.candidateUrl && (
                      <a
                        href={c.candidateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#5BA7A7] hover:underline truncate block"
                      >
                        {c.candidateUrl}
                      </a>
                    )}
                    <p className="text-xs text-[#8B7355]">Source: {c.sourceUrl}</p>
                    <p className="text-xs text-[#8B7355]">
                      Match: {(c.matchScore * 100).toFixed(0)}% — {c.matchReason ?? '—'}
                      {c.confidenceBucket && (
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          c.confidenceBucket === 'HIGH' ? 'bg-green-100 text-green-800' :
                          c.confidenceBucket === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {c.confidenceBucket}
                        </span>
                      )}
                    </p>
                    {c.place && (
                      <p className="text-sm mt-1">
                        Suggested place:{' '}
                        <Link
                          href={`/place/${c.place.slug}`}
                          className="text-[#5BA7A7] hover:underline"
                        >
                          {c.place.name}
                        </Link>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {c.placeId ? (
                      <div className="flex flex-col gap-1 items-end">
                        {c.existingPrimaryOperator && (
                          <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                            Place is currently linked to <strong>{c.existingPrimaryOperator.name}</strong>. Approving will make this operator primary.
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (c.existingPrimaryOperator && !window.confirm('This place is already linked to another operator as primary. Approving will make this operator primary instead. Continue?')) return;
                            handleApprove(c);
                          }}
                          disabled={!!actionLoading}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading === c.id ? '…' : 'Approve'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          placeholder="Place name or slug to search"
                          value={attachPlaceId[c.id] ?? ''}
                          onChange={(e) => setAttachPlaceId((prev) => ({ ...prev, [c.id]: e.target.value }))}
                          onBlur={() => {
                            const v = (attachPlaceId[c.id] ?? '').trim();
                            if (v) searchPlaces(c.id, v);
                          }}
                          className="text-sm border rounded px-2 py-1 w-48"
                        />
                        {placeSearchResults[c.id]?.length > 0 && (
                          <ul className="text-xs mt-1 max-h-24 overflow-y-auto">
                            {placeSearchResults[c.id].slice(0, 5).map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttachPlaceId((prev) => ({ ...prev, [c.id]: p.id }));
                                    setPlaceSearchResults((prev) => ({ ...prev, [c.id]: [] }));
                                  }}
                                  className="text-[#5BA7A7] hover:underline text-left"
                                >
                                  {p.name} ({p.slug})
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAttach(c)}
                          disabled={
                            !!actionLoading ||
                            !(
                              attachPlaceId[c.id]?.trim() &&
                              (placeSearchResults[c.id]?.some((p) => p.id === attachPlaceId[c.id]) ||
                                attachPlaceId[c.id].length >= 20)
                            )
                          }
                          className="px-3 py-1.5 bg-[#5BA7A7] text-white text-sm rounded-lg hover:bg-[#4a9696] disabled:opacity-50"
                        >
                          {actionLoading === c.id ? '…' : 'Attach'}
                        </button>
                      </>
                    )}
                    <input
                      type="text"
                      placeholder="Rejection reason (optional)"
                      value={rejectReason[c.id] ?? ''}
                      onChange={(e) => setRejectReason((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      className="text-sm border rounded px-2 py-1 w-48"
                    />
                    <button
                      type="button"
                      onClick={() => handleReject(c)}
                      disabled={!!actionLoading}
                      className="px-3 py-1.5 bg-gray-200 text-gray-800 text-sm rounded-lg hover:bg-gray-300 disabled:opacity-50"
                    >
                      {actionLoading === c.id ? '…' : 'Reject'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
