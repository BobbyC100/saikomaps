'use client';

/**
 * Entity Profile Page — Admin
 * /admin/entity/[id]
 *
 * Canonical single-entity admin view. Shows all field states (populated / missing / low-confidence),
 * interpretation cache entries (tagline, pull quote, voice descriptor, TimeFOLD),
 * derived signals, coverage sources, and entity issues.
 *
 * TimeFOLD editorial gate: approve / suppress / propose temporal signal.
 *
 * Spec: docs/ENTITY-PROFILE-SPEC.md
 */

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

// ---------------------------------------------------------------------------
// Theme — matches admin layout + coverage-ops palette
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EntityDetail {
  id: string;
  slug: string;
  name: string;
  googlePlaceId: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  hours: unknown;
  description: string | null;
  priceLevel: number | null;
  neighborhood: string | null;
  category: string | null;
  primaryVertical: string | null;
  cuisineType: string | null;
  status: string;
  operatingStatus: string | null;
  enrichmentStatus: string | null;
  publicationStatus: string | null;
  businessStatus: string | null;
  tagline: string | null;
  pullQuote: string | null;
  pullQuoteAuthor: string | null;
  pullQuoteSource: string | null;
  pullQuoteUrl: string | null;
  tips: string[];
  reservationUrl: string | null;
  entityType: string;
  createdAt: string;
  updatedAt: string;
  prlOverride: number | null;
  confidence: Record<string, unknown> | null;
}

interface InterpretationEntry {
  content: Record<string, unknown>;
  promptVersion: string | null;
  generatedAt: string;
}

interface CoverageSource {
  id: string;
  publicationName: string;
  url: string;
  articleTitle: string | null;
  publishedAt: string | null;
  enrichmentStage: string;
  isAlive: boolean;
}

interface EntityIssue {
  id: string;
  issueType: string;
  severity: string;
  resolved: boolean;
  createdAt: string;
}

interface EntityProfileData {
  entity: EntityDetail;
  derivedSignals: {
    identitySignals: Record<string, unknown> | null;
    identitySignalsAt: string | null;
    offeringPrograms: Record<string, unknown> | null;
    offeringProgramsAt: string | null;
  };
  interpretations: Record<string, InterpretationEntry>;
  coverageSources: CoverageSource[];
  issues: EntityIssue[];
  _counts: {
    merchantSurfaces: number;
    coverageSources: number;
    issues: number;
  };
}

// ---------------------------------------------------------------------------
// Field definitions — what the field grid shows
// ---------------------------------------------------------------------------

interface FieldDef {
  key: string;
  label: string;
  editable?: boolean;
  patchField?: string; // field name for PATCH API (if different from key)
  placeholder?: string;
}

const IDENTITY_FIELDS: FieldDef[] = [
  { key: 'googlePlaceId', label: 'Google Place ID', editable: true, patchField: 'google_place_id', placeholder: 'ChIJ...' },
  { key: 'address', label: 'Address' },
  { key: 'neighborhood', label: 'Neighborhood', editable: true, placeholder: 'e.g. Silver Lake' },
  { key: 'category', label: 'Category' },
  { key: 'primaryVertical', label: 'Vertical' },
  { key: 'cuisineType', label: 'Cuisine Type' },
];

const CONTACT_FIELDS: FieldDef[] = [
  { key: 'phone', label: 'Phone', editable: true, placeholder: '(213) 555-1234' },
  { key: 'website', label: 'Website', editable: true, placeholder: 'https://...' },
  { key: 'instagram', label: 'Instagram', editable: true, placeholder: '@handle' },
  { key: 'tiktok', label: 'TikTok', editable: true, placeholder: '@handle' },
];

const STATUS_FIELDS: FieldDef[] = [
  { key: 'status', label: 'Status', editable: true },
  { key: 'operatingStatus', label: 'Operating Status' },
  { key: 'enrichmentStatus', label: 'Enrichment Status' },
  { key: 'publicationStatus', label: 'Publication Status' },
  { key: 'businessStatus', label: 'Business Status (Google)' },
];

const ISSUE_LABELS: Record<string, string> = {
  unresolved_identity: 'Unresolved Identity',
  enrichment_incomplete: 'Never Enriched',
  missing_coords: 'Missing Coordinates',
  missing_neighborhood: 'Missing Neighborhood',
  missing_hours: 'Missing Hours',
  missing_price_level: 'Missing Price Level',
  missing_menu_link: 'Missing Menu Link',
  missing_reservations: 'Missing Reservation Link',
  operating_status_unknown: 'Operating Status Unknown',
  missing_website: 'Missing Website',
  missing_phone: 'Missing Phone',
  missing_instagram: 'Missing Instagram',
  missing_tiktok: 'Missing TikTok',
  missing_gpid: 'Missing GPID',
  google_says_closed: 'Google Says Closed',
  potential_duplicate: 'Potential Duplicate',
  missing_events_surface: 'Missing Events Surface',
};

const SEVERITY_COLORS: Record<string, { bg: string; color: string }> = {
  critical: { bg: '#FEE2E2', color: '#991B1B' },
  high: { bg: '#FEF3C7', color: '#92400E' },
  medium: { bg: '#F5F0E1', color: '#8B7355' },
  low: { bg: '#F5F0E1', color: '#A09078' },
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function EntityProfilePage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<EntityProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Inline edit state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // TimeFOLD state
  const [timefoldAction, setTimefoldAction] = useState<string | null>(null);
  const [proposingClass, setProposingClass] = useState<'STABILITY' | 'NEWNESS'>('STABILITY');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchEntity = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/admin/entities/${id}/detail`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || `Failed to load entity (${res.status})`);
        return;
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError('Network error loading entity');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEntity();
  }, [fetchEntity]);

  // --- Inline field patch ---
  const patchField = async (field: string, value: string | null) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/entities/${id}/patch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value }),
      });
      if (res.ok) {
        showToast(`Updated ${field}`);
        await fetchEntity(); // refresh
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`Error: ${err.error || 'Failed to save'}`);
      }
    } catch {
      showToast('Network error saving field');
    } finally {
      setSaving(false);
      setEditingField(null);
    }
  };

  // --- TimeFOLD actions ---
  const timefoldAct = async (action: string, extra?: Record<string, unknown>) => {
    setTimefoldAction(action);
    try {
      const res = await fetch(`/api/admin/entities/${id}/timefold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) {
        showToast(`TimeFOLD: ${action} successful`);
        await fetchEntity();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`Error: ${err.error || 'Failed'}`);
      }
    } catch {
      showToast('Network error');
    } finally {
      setTimefoldAction(null);
    }
  };

  // --- Loading / Error states ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.bg }}>
        <div className="text-lg" style={{ color: C.muted }}>Loading entity...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.bg }}>
        <div className="text-center">
          <div className="text-lg mb-2" style={{ color: C.red }}>{error || 'Entity not found'}</div>
          <Link href="/admin" className="text-sm underline" style={{ color: C.accent }}>Back to Admin</Link>
        </div>
      </div>
    );
  }

  const { entity, derivedSignals, interpretations, coverageSources, issues, _counts } = data;
  const timefold = interpretations.TIMEFOLD ?? null;
  const timefoldContent = timefold?.content as { class?: string; phrase?: string; proposed_by?: string; approved_by?: string | null } | null;

  return (
    <div className="min-h-screen py-10 px-6" style={{ backgroundColor: C.bg }}>
      <div className="max-w-5xl mx-auto">
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-sm font-medium"
            style={{ backgroundColor: C.accent, color: '#fff' }}>
            {toast}
          </div>
        )}

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-2" style={{ color: C.muted }}>
          <Link href="/admin" className="hover:underline">Admin</Link>
          <span>/</span>
          <span style={{ color: C.text }} className="font-medium">Entity Profile</span>
        </nav>

        {/* ============================================================= */}
        {/*  HEADER STRIP                                                  */}
        {/* ============================================================= */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-1" style={{ color: C.text }}>{entity.name}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: C.muted }}>
            <span className="font-mono text-xs" style={{ opacity: 0.7 }}>{entity.slug}</span>
            <span>·</span>
            {entity.neighborhood && <span>{entity.neighborhood}</span>}
            {entity.category && <><span>·</span><span>{entity.category}</span></>}
            {entity.primaryVertical && <><span>·</span><span className="uppercase text-xs tracking-wide">{entity.primaryVertical}</span></>}
            <span>·</span>
            <StatusBadge label={entity.status} />
            {entity.publicationStatus && <StatusBadge label={entity.publicationStatus} />}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: C.muted }}>
            {entity.googlePlaceId && <span className="font-mono">GPID: {entity.googlePlaceId}</span>}
            <span>Created {new Date(entity.createdAt).toLocaleDateString()}</span>
            <span>Updated {new Date(entity.updatedAt).toLocaleDateString()}</span>
          </div>
          {/* Quick counts */}
          <div className="flex items-center gap-4 mt-3 text-xs">
            <CountBadge label="Surfaces" count={_counts.merchantSurfaces} />
            <CountBadge label="Coverage" count={_counts.coverageSources} />
            <CountBadge label="Open Issues" count={_counts.issues} warn={_counts.issues > 0} />
          </div>
          {/* Link to consumer page */}
          <div className="mt-3">
            <Link
              href={`/place/${entity.slug}`}
              className="text-xs underline"
              style={{ color: C.accent }}
              target="_blank"
            >
              View consumer page ↗
            </Link>
          </div>
        </header>

        {/* ============================================================= */}
        {/*  FIELD GRID                                                    */}
        {/* ============================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Identity */}
          <FieldSection title="Identity" fields={IDENTITY_FIELDS} entity={entity}
            editingField={editingField} editValue={editValue} saving={saving}
            onEdit={(key, val) => { setEditingField(key); setEditValue(val ?? ''); }}
            onCancel={() => setEditingField(null)}
            onChange={setEditValue}
            onSave={(field, patchField) => patchField ? patchField : null}
            onPatch={patchField}
          />

          {/* Contact & Social */}
          <FieldSection title="Contact & Social" fields={CONTACT_FIELDS} entity={entity}
            editingField={editingField} editValue={editValue} saving={saving}
            onEdit={(key, val) => { setEditingField(key); setEditValue(val ?? ''); }}
            onCancel={() => setEditingField(null)}
            onChange={setEditValue}
            onSave={(field, patchField) => patchField ? patchField : null}
            onPatch={patchField}
          />

          {/* Status */}
          <FieldSection title="Status & State" fields={STATUS_FIELDS} entity={entity}
            editingField={editingField} editValue={editValue} saving={saving}
            onEdit={(key, val) => { setEditingField(key); setEditValue(val ?? ''); }}
            onCancel={() => setEditingField(null)}
            onChange={setEditValue}
            onSave={(field, patchField) => patchField ? patchField : null}
            onPatch={patchField}
          />

          {/* Additional Fields */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: C.cardBg, borderColor: C.border }}>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{ color: C.muted }}>Additional</h3>
            <FieldRow label="Price Level" value={entity.priceLevel != null ? String(entity.priceLevel) : null} />
            <FieldRow label="Hours" value={entity.hours ? 'Populated' : null} />
            <FieldRow label="Reservation URL" value={entity.reservationUrl} />
            <FieldRow label="Entity Type" value={entity.entityType} />
            <FieldRow label="PRL Override" value={entity.prlOverride != null ? String(entity.prlOverride) : null} />
          </div>
        </div>

        {/* ============================================================= */}
        {/*  INTERPRETATION LAYER                                          */}
        {/* ============================================================= */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4" style={{ color: C.text }}>Interpretation Layer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InterpretationCard
              label="Tagline"
              entry={interpretations.TAGLINE}
              fallback={entity.tagline}
            />
            <InterpretationCard
              label="Pull Quote"
              entry={interpretations.PULL_QUOTE}
              fallback={entity.pullQuote}
            />
            <InterpretationCard
              label="Voice Descriptor"
              entry={interpretations.VOICE_DESCRIPTOR}
              fallback={entity.description}
            />
            <InterpretationCard
              label="SceneSense PRL"
              entry={interpretations.SCENESENSE_PRL}
              fallback={null}
            />
          </div>
        </section>

        {/* ============================================================= */}
        {/*  TIMEFOLD — Editorial Gate                                     */}
        {/* ============================================================= */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4" style={{ color: C.text }}>
            Temporal Signal
            <span className="text-xs font-normal ml-2 uppercase tracking-wide" style={{ color: C.muted }}>TimeFOLD</span>
          </h2>
          <div className="rounded-lg p-5 border" style={{ backgroundColor: C.cardBg, borderColor: C.border }}>
            {timefoldContent ? (
              <>
                {/* Current proposal */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <span className="text-xs uppercase tracking-wide font-medium px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: timefoldContent.class === 'STABILITY' ? C.greenBg : C.amberBg,
                        color: timefoldContent.class === 'STABILITY' ? C.green : C.amber,
                      }}>
                      {timefoldContent.class}
                    </span>
                    <p className="mt-2 text-lg" style={{ color: C.text }}>{timefoldContent.phrase}</p>
                    <p className="text-xs mt-1" style={{ color: C.muted }}>
                      Proposed by: {timefoldContent.proposed_by ?? 'system'}
                      {timefoldContent.approved_by && timefoldContent.approved_by !== '__suppressed' && (
                        <> · Approved by: {timefoldContent.approved_by}</>
                      )}
                      {timefoldContent.approved_by === '__suppressed' && (
                        <span style={{ color: C.red }}> · Suppressed</span>
                      )}
                      {!timefoldContent.approved_by && (
                        <span style={{ color: C.amber }}> · Awaiting approval</span>
                      )}
                    </p>
                    {timefold?.generatedAt && (
                      <p className="text-xs mt-0.5" style={{ color: C.muted, opacity: 0.7 }}>
                        Generated: {new Date(timefold.generatedAt).toLocaleString()}
                        {timefold.promptVersion && <> · v{timefold.promptVersion}</>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: C.border }}>
                  {!timefoldContent.approved_by && (
                    <>
                      <button
                        onClick={() => timefoldAct('approve')}
                        disabled={!!timefoldAction}
                        className="px-3 py-1.5 text-xs font-medium rounded"
                        style={{ backgroundColor: C.green, color: '#fff', opacity: timefoldAction ? 0.5 : 1 }}
                      >
                        {timefoldAction === 'approve' ? 'Approving...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => timefoldAct('suppress')}
                        disabled={!!timefoldAction}
                        className="px-3 py-1.5 text-xs font-medium rounded"
                        style={{ backgroundColor: C.red, color: '#fff', opacity: timefoldAction ? 0.5 : 1 }}
                      >
                        {timefoldAction === 'suppress' ? 'Suppressing...' : 'Suppress'}
                      </button>
                    </>
                  )}
                  {timefoldContent.approved_by === '__suppressed' && (
                    <button
                      onClick={() => timefoldAct('approve')}
                      disabled={!!timefoldAction}
                      className="px-3 py-1.5 text-xs font-medium rounded"
                      style={{ backgroundColor: C.accent, color: '#fff', opacity: timefoldAction ? 0.5 : 1 }}
                    >
                      Un-suppress & Approve
                    </button>
                  )}
                  {timefoldContent.approved_by && timefoldContent.approved_by !== '__suppressed' && (
                    <button
                      onClick={() => timefoldAct('suppress')}
                      disabled={!!timefoldAction}
                      className="px-3 py-1.5 text-xs font-medium rounded"
                      style={{ backgroundColor: C.red, color: '#fff', opacity: timefoldAction ? 0.5 : 1 }}
                    >
                      Suppress
                    </button>
                  )}
                </div>
              </>
            ) : (
              /* No proposal — offer to create one */
              <div>
                <p className="text-sm mb-3" style={{ color: C.muted }}>
                  No temporal signal proposed for this entity.
                </p>
                <p className="text-xs mb-4" style={{ color: C.muted, opacity: 0.7 }}>
                  One line. No dates. Write what this place means right now.
                </p>
                <div className="flex items-center gap-3">
                  <select
                    value={proposingClass}
                    onChange={(e) => setProposingClass(e.target.value as 'STABILITY' | 'NEWNESS')}
                    className="text-sm border rounded px-2 py-1.5"
                    style={{ borderColor: C.border, color: C.text }}
                  >
                    <option value="STABILITY">STABILITY — &quot;Established local presence.&quot;</option>
                    <option value="NEWNESS">NEWNESS — &quot;Recently opened.&quot;</option>
                  </select>
                  <button
                    onClick={() => timefoldAct('propose', { class: proposingClass })}
                    disabled={!!timefoldAction}
                    className="px-3 py-1.5 text-xs font-medium rounded"
                    style={{ backgroundColor: C.accent, color: '#fff', opacity: timefoldAction ? 0.5 : 1 }}
                  >
                    {timefoldAction === 'propose' ? 'Proposing...' : 'Propose'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ============================================================= */}
        {/*  DERIVED SIGNALS                                               */}
        {/* ============================================================= */}
        {(derivedSignals.identitySignals || derivedSignals.offeringPrograms) && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: C.text }}>Derived Signals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {derivedSignals.identitySignals && (
                <SignalCard
                  title="Identity Signals"
                  data={derivedSignals.identitySignals}
                  computedAt={derivedSignals.identitySignalsAt}
                />
              )}
              {derivedSignals.offeringPrograms && (
                <SignalCard
                  title="Offering Programs"
                  data={derivedSignals.offeringPrograms}
                  computedAt={derivedSignals.offeringProgramsAt}
                />
              )}
            </div>
          </section>
        )}

        {/* ============================================================= */}
        {/*  ISSUES                                                        */}
        {/* ============================================================= */}
        {issues.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: C.text }}>
              Issues
              <span className="text-sm font-normal ml-2" style={{ color: C.muted }}>
                ({issues.filter(i => !i.resolved).length} open)
              </span>
            </h2>
            <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: C.cardBg, borderColor: C.border }}>
              {issues.filter(i => !i.resolved).map((issue) => (
                <div key={issue.id} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0"
                  style={{ borderColor: C.border }}>
                  <span className="text-xs px-2 py-0.5 rounded font-medium uppercase"
                    style={SEVERITY_COLORS[issue.severity] ?? SEVERITY_COLORS.low}>
                    {issue.severity}
                  </span>
                  <span className="text-sm" style={{ color: C.text }}>
                    {ISSUE_LABELS[issue.issueType] ?? issue.issueType}
                  </span>
                  <span className="text-xs ml-auto" style={{ color: C.muted }}>
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================= */}
        {/*  COVERAGE SOURCES                                              */}
        {/* ============================================================= */}
        {coverageSources.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: C.text }}>
              Coverage Sources
              <span className="text-sm font-normal ml-2" style={{ color: C.muted }}>({coverageSources.length})</span>
            </h2>
            <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: C.cardBg, borderColor: C.border }}>
              {coverageSources.map((src) => (
                <div key={src.id} className="px-4 py-3 border-b last:border-b-0" style={{ borderColor: C.border }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: C.text }}>{src.publicationName}</span>
                    <a href={src.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs underline" style={{ color: C.accent }}>
                      ↗
                    </a>
                    {src.publishedAt && (
                      <span className="text-xs ml-auto" style={{ color: C.muted }}>
                        {new Date(src.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {src.articleTitle && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: C.muted }}>{src.articleTitle}</p>
                  )}
                  <span className="text-xs" style={{ color: C.muted }}>{src.enrichmentStage}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================= */}
        {/*  EDITORIAL (entity-level tagline, pull quote, tips)            */}
        {/* ============================================================= */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4" style={{ color: C.text }}>Editorial Fields (Entity Table)</h2>
          <div className="rounded-lg p-4 border" style={{ backgroundColor: C.cardBg, borderColor: C.border }}>
            <FieldRow label="Tagline (entity)" value={entity.tagline} />
            <FieldRow label="Pull Quote" value={entity.pullQuote} />
            {entity.pullQuoteAuthor && <FieldRow label="Pull Quote Author" value={entity.pullQuoteAuthor} />}
            {entity.pullQuoteSource && <FieldRow label="Pull Quote Source" value={entity.pullQuoteSource} />}
            <FieldRow label="Description" value={entity.description ? `${entity.description.substring(0, 120)}${entity.description.length > 120 ? '...' : ''}` : null} />
            <FieldRow label="Tips" value={entity.tips?.length ? `${entity.tips.length} tip(s)` : null} />
          </div>
        </section>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ label }: { label: string }) {
  const lower = label.toLowerCase();
  const isGood = ['open', 'published', 'operational', 'enriched'].some(s => lower.includes(s));
  const isBad = ['closed', 'suspended', 'rejected'].some(s => lower.includes(s));
  return (
    <span className="text-xs px-2 py-0.5 rounded font-medium uppercase tracking-wide"
      style={{
        backgroundColor: isBad ? C.redBg : isGood ? C.greenBg : C.amberBg,
        color: isBad ? C.red : isGood ? C.green : C.amber,
      }}>
      {label}
    </span>
  );
}

function CountBadge({ label, count, warn }: { label: string; count: number; warn?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color: warn ? C.amber : C.muted }}>
      <strong>{count}</strong> {label}
    </span>
  );
}

function FieldRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-b-0" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
      <span className="text-xs" style={{ color: C.muted }}>{label}</span>
      {value ? (
        <span className="text-sm text-right max-w-[60%] truncate" style={{ color: C.text }}>{value}</span>
      ) : (
        <span className="text-xs italic" style={{ color: C.red, opacity: 0.6 }}>missing</span>
      )}
    </div>
  );
}

function FieldSection({
  title, fields, entity, editingField, editValue, saving,
  onEdit, onCancel, onChange, onPatch,
}: {
  title: string;
  fields: FieldDef[];
  entity: EntityDetail;
  editingField: string | null;
  editValue: string;
  saving: boolean;
  onEdit: (key: string, val: string | null) => void;
  onCancel: () => void;
  onChange: (val: string) => void;
  onSave: (field: string, patchField: string | null) => string | null;
  onPatch: (field: string, value: string | null) => void;
}) {
  return (
    <div className="rounded-lg p-4 border" style={{ backgroundColor: C.cardBg, borderColor: C.border }}>
      <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{ color: C.muted }}>{title}</h3>
      {fields.map((f) => {
        const raw = (entity as unknown as Record<string, unknown>)[f.key];
        const val = raw != null ? String(raw) : null;
        const isEditing = editingField === f.key;
        const patchAs = f.patchField ?? f.key;

        return (
          <div key={f.key} className="flex items-center justify-between py-1.5 border-b last:border-b-0"
            style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <span className="text-xs" style={{ color: C.muted }}>{f.label}</span>
            <div className="flex items-center gap-1.5">
              {isEditing ? (
                <>
                  <input
                    className="text-sm border rounded px-2 py-0.5"
                    style={{ borderColor: C.border, width: 180 }}
                    value={editValue}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={f.placeholder}
                    autoFocus
                    disabled={saving}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onPatch(patchAs, editValue || null);
                      if (e.key === 'Escape') onCancel();
                    }}
                  />
                  <button
                    onClick={() => onPatch(patchAs, editValue || null)}
                    disabled={saving}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: C.accent, color: '#fff' }}
                  >
                    {saving ? '...' : 'Save'}
                  </button>
                  <button
                    onClick={onCancel}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: C.border, color: C.text }}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  {val ? (
                    <span className="text-sm text-right max-w-[200px] truncate" style={{ color: C.text }}>{val}</span>
                  ) : (
                    <span className="text-xs italic" style={{ color: C.red, opacity: 0.6 }}>missing</span>
                  )}
                  {f.editable && (
                    <button
                      onClick={() => onEdit(f.key, val)}
                      className="text-xs px-1.5 py-0.5 rounded opacity-40 hover:opacity-100 transition-opacity"
                      style={{ color: C.accent }}
                    >
                      edit
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InterpretationCard({ label, entry, fallback }: {
  label: string;
  entry?: InterpretationEntry;
  fallback: string | null;
}) {
  const content = entry?.content as { text?: string } | null;
  const text = content?.text ?? fallback;
  const source = entry ? `interpretation_cache (v${entry.promptVersion ?? '?'})` : (fallback ? 'entity fallback' : null);

  return (
    <div className="rounded-lg p-4 border" style={{ backgroundColor: C.cardBg, borderColor: C.border }}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: C.muted }}>{label}</h4>
        {entry && (
          <span className="text-xs" style={{ color: C.green }}>●</span>
        )}
        {!entry && fallback && (
          <span className="text-xs" style={{ color: C.amber }}>○</span>
        )}
        {!entry && !fallback && (
          <span className="text-xs" style={{ color: C.red, opacity: 0.5 }}>—</span>
        )}
      </div>
      {text ? (
        <p className="text-sm line-clamp-3" style={{ color: C.text }}>{text}</p>
      ) : (
        <p className="text-xs italic" style={{ color: C.muted }}>Not generated</p>
      )}
      {source && (
        <p className="text-xs mt-2" style={{ color: C.muted, opacity: 0.6 }}>
          Source: {source}
          {entry?.generatedAt && <> · {new Date(entry.generatedAt).toLocaleDateString()}</>}
        </p>
      )}
    </div>
  );
}

function SignalCard({ title, data, computedAt }: {
  title: string;
  data: Record<string, unknown>;
  computedAt: string | null;
}) {
  // Show top-level keys and their values (truncated)
  const entries = Object.entries(data).filter(([, v]) => v != null);

  return (
    <div className="rounded-lg p-4 border" style={{ backgroundColor: C.cardBg, borderColor: C.border }}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: C.muted }}>{title}</h4>
        {computedAt && (
          <span className="text-xs" style={{ color: C.muted, opacity: 0.6 }}>
            {new Date(computedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="space-y-1">
        {entries.slice(0, 12).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span style={{ color: C.muted }}>{key.replace(/_/g, ' ')}</span>
            <span className="max-w-[60%] truncate text-right" style={{ color: C.text }}>
              {typeof val === 'string' ? val : Array.isArray(val) ? val.join(', ') : JSON.stringify(val)}
            </span>
          </div>
        ))}
        {entries.length > 12 && (
          <p className="text-xs" style={{ color: C.muted }}>+{entries.length - 12} more fields</p>
        )}
      </div>
    </div>
  );
}
