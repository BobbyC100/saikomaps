'use client';

/**
 * Admin Intake — /admin/intake
 *
 * Two modes:
 *  - Single: paste a name + optional fields → create or match entity
 *  - CSV: drop the intake spreadsheet → batch create/match
 *
 * After creation, "Enrich" button triggers ERA pipeline in background.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IntakeEntity {
  id: string;
  slug: string;
  name: string;
  status: string;
}

interface IntakeCandidate {
  id: string;
  slug: string;
  name: string;
}

interface IntakeResult {
  input: string;
  outcome: 'created' | 'matched' | 'ambiguous';
  entity?: IntakeEntity;
  candidates?: IntakeCandidate[];
}

interface IntakeSummary {
  total: number;
  created: number;
  matched: number;
  ambiguous: number;
}

type EnrichState = 'idle' | 'queued' | 'enriching' | 'done' | 'error';

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  bg: '#F5F0E1',
  text: '#36454F',
  muted: '#8B7355',
  accent: '#5BA7A7',
  border: '#C3B091',
  cardBg: '#FDFAF3',
  green: '#166534',
  greenBg: '#DCFCE7',
  amber: '#92400E',
  amberBg: '#FEF3C7',
  red: '#991B1B',
  redBg: '#FEE2E2',
};

// ─── Outcome badge ────────────────────────────────────────────────────────────

function OutcomeBadge({ outcome }: { outcome: IntakeResult['outcome'] }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    created:   { bg: C.greenBg,  color: C.green,  label: 'Created'   },
    matched:   { bg: C.amberBg,  color: C.amber,  label: 'Matched'   },
    ambiguous: { bg: C.redBg,    color: C.red,    label: 'Ambiguous' },
  };
  const s = styles[outcome];
  return (
    <span
      style={{ backgroundColor: s.bg, color: s.color }}
      className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
    >
      {s.label}
    </span>
  );
}

// ─── Results table ────────────────────────────────────────────────────────────

const ENRICH_LABEL: Record<EnrichState, string> = {
  idle:      'Enrich →',
  queued:    'Starting…',
  enriching: 'Enriching…',
  done:      '✓ Enriched',
  error:     'Error — retry',
};

function ResultsTable({ results }: { results: IntakeResult[] }) {
  const router = useRouter();
  const [enrichStates, setEnrichStates] = useState<Record<string, EnrichState>>({});
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  // overrides: input name → new result, for rows force-created from ambiguous state
  const [overrides, setOverrides] = useState<Record<string, IntakeResult>>({});
  const [forceCreateLoading, setForceCreateLoading] = useState<Record<string, boolean>>({});

  // Start polling DB for enrichment_stage after triggering
  const startPolling = useCallback((slug: string) => {
    if (pollRefs.current[slug]) return; // already polling
    setEnrichStates((s) => ({ ...s, [slug]: 'enriching' }));
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/enrich/${slug}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.done) {
          setEnrichStates((s) => ({ ...s, [slug]: 'done' }));
          clearInterval(pollRefs.current[slug]);
          delete pollRefs.current[slug];
          // Navigate to the place page after a brief moment to show ✓ Enriched
          setTimeout(() => router.push(`/place/${slug}`), 1200);
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 4000); // poll every 4 s
    pollRefs.current[slug] = interval;

    // Safety cap: stop polling after 10 min regardless
    setTimeout(() => {
      if (pollRefs.current[slug]) {
        clearInterval(pollRefs.current[slug]);
        delete pollRefs.current[slug];
        setEnrichStates((s) => s[slug] === 'enriching' ? { ...s, [slug]: 'error' } : s);
      }
    }, 10 * 60 * 1000);
  }, []);

  // Clean up intervals on unmount
  useEffect(() => {
    const refs = pollRefs.current;
    return () => { Object.values(refs).forEach(clearInterval); };
  }, []);

  const handleForceCreate = useCallback(async (name: string) => {
    setForceCreateLoading((s) => ({ ...s, [name]: true }));
    try {
      const res = await fetch('/api/admin/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, forceCreate: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      const created: IntakeResult = data.results?.[0];
      if (created) setOverrides((s) => ({ ...s, [name]: created }));
    } catch {
      // leave in ambiguous state on failure — user can retry
    } finally {
      setForceCreateLoading((s) => ({ ...s, [name]: false }));
    }
  }, []);

  const handleEnrich = useCallback(async (slug: string) => {
    setEnrichStates((s) => ({ ...s, [slug]: 'queued' }));
    try {
      const res = await fetch(`/api/admin/enrich/${slug}`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      startPolling(slug);
    } catch {
      setEnrichStates((s) => ({ ...s, [slug]: 'error' }));
    }
  }, [startPolling]);

  return (
    <div className="mt-6 overflow-x-auto rounded-lg border" style={{ borderColor: C.border }}>
      <table className="w-full text-sm" style={{ color: C.text }}>
        <thead>
          <tr style={{ backgroundColor: C.bg, borderBottom: `1px solid ${C.border}` }}>
            <th className="text-left px-4 py-2 font-semibold">Name</th>
            <th className="text-left px-4 py-2 font-semibold">Outcome</th>
            <th className="text-left px-4 py-2 font-semibold">Slug</th>
            <th className="text-left px-4 py-2 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {results.map((rawRow, i) => {
            const r = overrides[rawRow.input] ?? rawRow;
            const slug = r.entity?.slug;
            const enrichState = slug ? enrichStates[slug] ?? 'idle' : 'idle';
            const isForceLoading = forceCreateLoading[r.input];
            const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(r.input + ' Los Angeles')}`;
            return (
              <tr
                key={i}
                style={{ backgroundColor: i % 2 === 0 ? C.cardBg : C.bg, borderBottom: `1px solid ${C.border}` }}
              >
                <td className="px-4 py-2 font-medium">{r.input}</td>
                <td className="px-4 py-2">
                  <OutcomeBadge outcome={r.outcome} />
                </td>
                <td className="px-4 py-2 font-mono text-xs" style={{ color: C.muted }}>
                  {slug ? (
                    <a
                      href={`/place/${slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: C.accent }}
                      className="hover:underline"
                    >
                      {slug}
                    </a>
                  ) : (
                    r.candidates && r.candidates.length > 0 ? (
                      <span>
                        Possible matches:{' '}
                        {r.candidates.map((c) => (
                          <a
                            key={c.id}
                            href={`/place/${c.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: C.accent }}
                            className="hover:underline mr-2"
                          >
                            {c.name}
                          </a>
                        ))}
                      </span>
                    ) : '—'
                  )}
                </td>
                <td className="px-4 py-2">
                  {r.outcome === 'created' && slug && (
                    <button
                      onClick={() => enrichState === 'idle' || enrichState === 'error' ? handleEnrich(slug) : undefined}
                      disabled={enrichState === 'queued' || enrichState === 'enriching' || enrichState === 'done'}
                      style={{
                        backgroundColor: enrichState === 'done'  ? C.greenBg  :
                                         enrichState === 'idle'  ? C.accent   : C.bg,
                        color:           enrichState === 'done'  ? C.green    :
                                         enrichState === 'idle'  ? '#fff'     : C.muted,
                        border: `1px solid ${C.border}`,
                      }}
                      className="px-3 py-1 rounded text-xs font-semibold transition-colors disabled:cursor-not-allowed"
                    >
                      {ENRICH_LABEL[enrichState]}
                    </button>
                  )}
                  {r.outcome === 'ambiguous' && (
                    <span className="flex items-center gap-2">
                      <a
                        href={googleSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Search Google to verify"
                        style={{ color: C.muted }}
                        className="text-xs hover:underline"
                      >
                        🔍 Verify
                      </a>
                      <button
                        onClick={() => handleForceCreate(r.input)}
                        disabled={isForceLoading}
                        style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}` }}
                        className="px-3 py-1 rounded text-xs font-semibold hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isForceLoading ? 'Creating…' : 'Create Anyway'}
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar({ summary }: { summary: IntakeSummary }) {
  return (
    <div className="flex gap-4 mt-4 text-sm" style={{ color: C.muted }}>
      <span><strong style={{ color: C.text }}>{summary.total}</strong> processed</span>
      <span style={{ color: C.green }}><strong>{summary.created}</strong> created</span>
      <span style={{ color: C.amber }}><strong>{summary.matched}</strong> matched</span>
      {summary.ambiguous > 0 && (
        <span style={{ color: C.red }}><strong>{summary.ambiguous}</strong> ambiguous</span>
      )}
    </div>
  );
}

// ─── Single entry form ────────────────────────────────────────────────────────

function SingleForm({ onResults }: { onResults: (r: IntakeResult[], s: IntakeSummary) => void }) {
  const [form, setForm] = useState({
    name: '', googlePlaceId: '', website: '', instagram: '', neighborhood: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() && !form.website.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim() || undefined,
          googlePlaceId: form.googlePlaceId.trim() || undefined,
          website: form.website.trim() || undefined,
          instagram: form.instagram.trim() || undefined,
          neighborhood: form.neighborhood.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Intake failed');
      onResults(data.results, data.summary);
      setForm({ name: '', googlePlaceId: '', website: '', instagram: '', neighborhood: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof typeof form, label: string, placeholder: string, required = false) => (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: C.muted }}>
        {label}{required && <span style={{ color: C.red }}> *</span>}
      </label>
      <input
        type="text"
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 rounded border text-sm outline-none focus:ring-1"
        style={{
          backgroundColor: C.cardBg,
          borderColor: C.border,
          color: C.text,
          '--tw-ring-color': C.accent,
        } as React.CSSProperties}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs" style={{ color: C.muted }}>
        Provide a name, a website URL, or both. Website alone will auto-resolve the name from the page title.
      </p>
      {field('name', 'Place Name', 'République')}
      <div className="grid grid-cols-2 gap-3">
        {field('googlePlaceId', 'Google Place ID', 'ChIJSRKFQeTHwoARQlQFbEnqvZo')}
        {field('neighborhood', 'Neighborhood', 'Mid-Wilshire')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field('website', 'Website', 'https://republiquela.com')}
        {field('instagram', 'Instagram Handle', '@republiquecafe')}
      </div>
      {error && (
        <p className="text-xs" style={{ color: C.red }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || (!form.name.trim() && !form.website.trim())}
        style={{ backgroundColor: C.accent, color: '#fff' }}
        className="px-5 py-2 rounded text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        {loading ? 'Processing…' : 'Add Place →'}
      </button>
    </form>
  );
}

// ─── CSV drop form ────────────────────────────────────────────────────────────

function CSVForm({ onResults }: { onResults: (r: IntakeResult[], s: IntakeSummary) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = async (f: File) => {
    setFile(f);
    const text = await f.text();
    const lines = text.trim().split('\n').slice(1, 6); // first 5 data rows
    setPreview(lines.map((l) => l.split(',')[0]?.replace(/^"|"$/g, '') || '').filter(Boolean));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  }, []);

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/intake', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Intake failed');
      onResults(data.results, data.summary);
      setFile(null);
      setPreview([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
        style={{
          borderColor: isDragging ? C.accent : C.border,
          backgroundColor: isDragging ? '#EDF9F9' : C.cardBg,
          color: C.muted,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
        />
        {file ? (
          <p className="font-medium" style={{ color: C.text }}>
            📄 {file.name}
          </p>
        ) : (
          <>
            <p className="font-medium">Drop CSV here or click to browse</p>
            <p className="text-xs mt-1">Columns: Name, Google Place ID, Website, Instagram Handle, Neighborhood</p>
          </>
        )}
      </div>

      {preview.length > 0 && (
        <div className="text-xs" style={{ color: C.muted }}>
          <p className="font-semibold mb-1" style={{ color: C.text }}>Preview (first {preview.length} rows):</p>
          <ul className="space-y-0.5">
            {preview.map((name, i) => <li key={i}>· {name}</li>)}
          </ul>
        </div>
      )}

      {error && <p className="text-xs" style={{ color: C.red }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!file || loading}
        style={{ backgroundColor: C.accent, color: '#fff' }}
        className="px-5 py-2 rounded text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        {loading ? `Processing ${file?.name}…` : 'Import CSV →'}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntakePage() {
  const [tab, setTab] = useState<'single' | 'csv'>('single');
  const [results, setResults] = useState<IntakeResult[] | null>(null);
  const [summary, setSummary] = useState<IntakeSummary | null>(null);

  const handleResults = (r: IntakeResult[], s: IntakeSummary) => {
    setResults(r);
    setSummary(s);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10" style={{ color: C.text }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: C.text }}>Place Intake</h1>
        <p className="mt-1 text-sm" style={{ color: C.muted }}>
          Add new places one at a time or drop a CSV. Duplicates are detected automatically.
          New places are created as <code className="text-xs font-mono">CANDIDATE</code> — click Enrich to run the ERA pipeline.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: C.border }}>
        {(['single', 'csv'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-semibold -mb-px transition-colors"
            style={{
              color: tab === t ? C.accent : C.muted,
              borderBottom: tab === t ? `2px solid ${C.accent}` : '2px solid transparent',
            }}
          >
            {t === 'single' ? 'Single Entry' : 'CSV Import'}
          </button>
        ))}
      </div>

      {/* Form area */}
      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}
      >
        {tab === 'single'
          ? <SingleForm onResults={handleResults} />
          : <CSVForm onResults={handleResults} />
        }
      </div>

      {/* Results */}
      {results && summary && (
        <div className="mt-8">
          <h2 className="text-base font-bold" style={{ color: C.text }}>Results</h2>
          <SummaryBar summary={summary} />
          <ResultsTable results={results} />
        </div>
      )}
    </div>
  );
}
