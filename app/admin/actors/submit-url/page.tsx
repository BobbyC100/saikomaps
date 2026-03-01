'use client';

/**
 * Admin Actors → Submit URL
 * Phase 1: URL ingestion for operator extraction
 */

import { useState } from 'react';
import Link from 'next/link';

interface VenueFound {
  name: string;
  url?: string;
  address?: string;
}

interface ActorPreview {
  id: string;
  name: string;
  kind: string;
  slug: string | null;
  website: string | null;
  confidence: number | null;
  sources: unknown;
  visibility: string | null;
}

interface IngestResponse {
  success: boolean;
  data?: {
    actor: ActorPreview;
    confidence: number;
    operator_name_candidates: string[];
    canonical_domain: string;
    venues_found: VenueFound[];
  };
  error?: string;
  message?: string;
}

export default function SubmitUrlPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/actors/ingest-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      const data: IngestResponse = await res.json();
      setResult(data);
    } catch (err) {
      setResult({
        success: false,
        error: 'Request failed',
        message: err instanceof Error ? err.message : String(err),
      });
    }
    setLoading(false);
  };

  return (
    <div className="py-8 px-6">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-[#8B7355] mb-2">
            <Link href="/admin" className="hover:text-[#36454F]">
              Admin
            </Link>
            <span>/</span>
            <Link href="/admin/actors/submit-url" className="text-[#36454F] font-medium">
              Actors
            </Link>
            <span>/</span>
            <span className="text-[#36454F] font-medium">Submit URL</span>
          </nav>
          <h1 className="text-2xl font-bold text-[#36454F]">Submit URL</h1>
          <p className="text-[#8B7355] text-sm mt-1">
            Scrape operator page or place page, extract operator signals, upsert Actor(kind=operator)
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-[#36454F] mb-1">
              URL
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://gjelinagroup.com/about/"
              className="w-full px-4 py-2 border border-[#C3B091]/60 rounded-lg focus:ring-2 focus:ring-[#5BA7A7]/50 focus:border-[#5BA7A7]"
              disabled={loading}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-[#5BA7A7] text-white rounded-lg hover:bg-[#4a9696] disabled:opacity-50 font-medium"
          >
            {loading ? 'Ingesting…' : 'Submit'}
          </button>
        </form>

        {result && (
          <div className="mt-8 space-y-6">
            {!result.success ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
                <p className="font-medium">{result.error ?? 'Error'}</p>
                {result.message && <p className="text-sm mt-1">{result.message}</p>}
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-[#C3B091]/30 p-6">
                  <h2 className="text-lg font-semibold text-[#36454F] mb-4">Actor preview</h2>
                  {result.data?.actor && (
                    <dl className="grid gap-2 text-sm">
                      <div>
                        <dt className="text-[#8B7355]">Name</dt>
                        <dd className="font-medium text-[#36454F]">{result.data.actor.name}</dd>
                      </div>
                      <div>
                        <dt className="text-[#8B7355]">Slug</dt>
                        <dd className="font-mono text-[#36454F]">{result.data.actor.slug ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-[#8B7355]">Website</dt>
                        <dd>
                          {result.data.actor.website ? (
                            <a
                              href={result.data.actor.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#5BA7A7] hover:underline"
                            >
                              {result.data.actor.website}
                            </a>
                          ) : (
                            '—'
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#8B7355]">Confidence</dt>
                        <dd className="text-[#36454F]">
                          {result.data.confidence != null
                            ? (result.data.confidence * 100).toFixed(0) + '%'
                            : '—'}
                        </dd>
                      </div>
                      {result.data.actor.slug && (
                        <div className="space-y-1">
                          <div>
                            <dt className="text-[#8B7355]">View</dt>
                            <dd>
                              <Link
                                href={`/actor/${result.data.actor.slug}`}
                                className="text-[#5BA7A7] hover:underline"
                              >
                                /actor/{result.data.actor.slug}
                              </Link>
                            </dd>
                          </div>
                          <div>
                            <Link
                              href={`/admin/actors/${result.data.actor.slug}/candidates`}
                              className="text-sm text-[#5BA7A7] hover:underline"
                            >
                              Review link candidates →
                            </Link>
                          </div>
                        </div>
                      )}
                    </dl>
                  )}
                </div>

                {result.data?.operator_name_candidates && result.data.operator_name_candidates.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-[#C3B091]/30 p-6">
                    <h2 className="text-lg font-semibold text-[#36454F] mb-2">
                      Operator name candidates
                    </h2>
                    <ul className="text-sm text-[#8B7355] space-y-1">
                      {result.data.operator_name_candidates.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.data?.venues_found && result.data.venues_found.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-[#C3B091]/30 p-6">
                    <h2 className="text-lg font-semibold text-[#36454F] mb-2">Venues found</h2>
                    <ul className="text-sm space-y-2">
                      {result.data.venues_found.map((v, i) => (
                        <li key={i} className="flex flex-col">
                          <span className="font-medium text-[#36454F]">{v.name}</span>
                          {v.url && (
                            <a
                              href={v.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#5BA7A7] hover:underline truncate"
                            >
                              {v.url}
                            </a>
                          )}
                          {v.address && (
                            <span className="text-[#8B7355]">{v.address}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
