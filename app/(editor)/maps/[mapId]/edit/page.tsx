'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Plus } from 'lucide-react';
import {
  validateForPublish,
  getStepCompletion,
  errorsToRecord,
  mapToFormData,
  generateTitleFromPlaces,
  getAutoPlaceTypes,
  getAutoGeography,
  type MapFormData,
} from '@/lib/mapValidation';
import { useDebouncedCallback } from '@/lib/hooks/useDebouncedCallback';
import { SaikoLogo } from '@/components/ui/SaikoLogo';
import FloatingMiniNav from '@/components/editor/FloatingMiniNav';
import FloatingPublish from '@/components/editor/FloatingPublish';
import TitleSection from '@/components/editor/TitleSection';
import PlaceIndexSection from '@/components/editor/PlaceIndexSection';
import AddLocationModal from '@/components/AddLocationModal';

interface Location {
  id: string;
  name: string;
  descriptor: string;
  orderIndex: number;
}

interface MapPlaceWithPlace {
  id: string;
  descriptor?: string | null;
  orderIndex: number;
  place: { name: string; category?: string | null; neighborhood?: string | null; googlePhotos?: unknown };
}

const FIELD_TO_SECTION: Record<string, string> = {
  title: 'title',
  subtitle: 'title',
  places: 'places',
};

const TEMPLATE_OPTIONS = [
  { id: 'field-notes', name: 'Field Notes' },
  { id: 'field_notes', name: 'Field Notes' },
] as const;

function buildPatchPayload(data: Partial<MapFormData>, templateType?: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.subtitle !== undefined) payload.subtitle = data.subtitle;
  if (data.scopeGeography !== undefined) payload.scopeGeography = data.scopeGeography;
  if (data.scopePlaceTypes !== undefined) payload.scopePlaceTypes = data.scopePlaceTypes;
  if (data.scopeExclusions !== undefined) payload.scopeExclusions = data.scopeExclusions;
  if (templateType !== undefined) payload.templateType = templateType;
  return payload;
}

export default function MapEditPage({ params }: { params: Promise<{ mapId: string }> }) {
  const router = useRouter();
  const [mapId, setMapId] = useState<string | null>(null);
  const [data, setData] = useState<MapFormData>({
    title: '',
    subtitle: '',
    scopeGeography: '',
    scopePlaceTypes: [],
    scopeExclusions: [],
  });
  const [places, setPlaces] = useState<Location[]>([]);
  const [mapPlacesWithPlace, setMapPlacesWithPlace] = useState<MapPlaceWithPlace[]>([]);
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isPublishing, setIsPublishing] = useState(false);
  const [templateType, setTemplateType] = useState<string>('field-notes');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [publishErrors, setPublishErrors] = useState<Record<string, string>>({});
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [aiSuggestedFields, setAiSuggestedFields] = useState<Record<string, boolean>>({});

  // Track which sections have been revealed (for animation - only animate on first reveal)
  const titleRevealedRef = useRef(false);

  useEffect(() => {
    params.then((p) => setMapId(p.mapId));
  }, [params]);

  const loadMap = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/maps/${id}`, { cache: 'no-store' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load map (${res.status})`);
      }
      const json = await res.json();
      const map = json.data;
      const formData = mapToFormData(map);
      setData(formData);
      setTemplateType(map.templateType || 'city_guide');
      const mpList = (map.mapPlaces || []) as MapPlaceWithPlace[];
      setMapPlacesWithPlace(mpList);
      setPlaces(
        mpList.map((mp) => ({
          id: mp.id,
          name: mp.place.name,
          descriptor: mp.descriptor || '',
          orderIndex: mp.orderIndex,
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mapId) loadMap(mapId);
  }, [mapId, loadMap]);

  // Auto-generate title placeholder when 2+ places and user hasn't manually edited
  const titlePlaceholder =
    !titleManuallyEdited && mapPlacesWithPlace.length >= 2
      ? generateTitleFromPlaces(mapPlacesWithPlace)
      : 'What this map is called';

  // Auto-populate scope when mapPlaces change (saved to DB, not shown in UI for V1)
  useEffect(() => {
    if (mapPlacesWithPlace.length < 1) return;

    setData((prev) => {
      const next = { ...prev };
      let changed = false;

      const autoGeo = getAutoGeography(mapPlacesWithPlace);
      if (autoGeo && prev.scopeGeography !== autoGeo) {
        next.scopeGeography = autoGeo;
        changed = true;
      }

      const autoTypes = getAutoPlaceTypes(mapPlacesWithPlace);
      if (autoTypes.length > 0 && JSON.stringify([...autoTypes].sort()) !== JSON.stringify([...prev.scopePlaceTypes].sort())) {
        next.scopePlaceTypes = autoTypes;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [mapPlacesWithPlace]);

  const saveMap = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!mapId) return;
      setSaveStatus('saving');
      try {
        const res = await fetch(`/api/maps/${mapId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Save failed (${res.status})`);
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error(err);
        setSaveStatus('idle');
      }
    },
    [mapId]
  );

  const debouncedSave = useDebouncedCallback((payload: Record<string, unknown>) => {
    saveMap(payload);
  }, 2000);

  const handleBlur = useCallback(() => {
    const payload = buildPatchPayload(data, templateType);
    if (Object.keys(payload).length > 0) {
      debouncedSave(payload);
    }
  }, [data, templateType, debouncedSave]);

  const updateField = useCallback(
    (field: keyof MapFormData, value: string | string[]) => {
      if (field === 'title') setTitleManuallyEdited(true);
      setData((prev) => {
        const next = { ...prev, [field]: value };
        debouncedSave(buildPatchPayload(next, templateType));
        return next;
      });
    },
    [debouncedSave, templateType]
  );

  const handleTemplateChange = useCallback(
    (value: string) => {
      setTemplateType(value);
      saveMap(buildPatchPayload(data, value));
    },
    [data, saveMap]
  );

  const handleDescriptorChange = useCallback((locationId: string, descriptor: string) => {
    setPlaces((prev) =>
      prev.map((p) => (p.id === locationId ? { ...p, descriptor } : p))
    );
    setMapPlacesWithPlace((prev) =>
      prev.map((mp) => (mp.id === locationId ? { ...mp, descriptor } : mp))
    );
  }, []);

  const handleDescriptorBlur = useCallback((mapPlaceId: string) => {
    const place = places.find((p) => p.id === mapPlaceId);
    if (!place?.descriptor.trim()) return;
    fetch(`/api/map-places/${mapPlaceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descriptor: place.descriptor }),
    }).catch(console.error);
  }, [places]);

  const handleRemovePlace = useCallback(
    async (mapPlaceId: string) => {
      if (!confirm('Remove this place?')) return;
      try {
        const res = await fetch(`/api/map-places/${mapPlaceId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        setPlaces((prev) => prev.filter((p) => p.id !== mapPlaceId));
        setMapPlacesWithPlace((prev) => prev.filter((mp) => mp.id !== mapPlaceId));
      } catch (err) {
        console.error(err);
      }
    },
    []
  );

  const handleReorderPlace = useCallback(
    async (mapPlaceId: string, direction: 'up' | 'down') => {
      const idx = places.findIndex((p) => p.id === mapPlaceId);
      if (idx < 0) return;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= places.length) return;

      const reordered = [...places];
      const [removed] = reordered.splice(idx, 1);
      reordered.splice(newIdx, 0, removed);
      const updated = reordered.map((p, i) => ({ ...p, orderIndex: i }));
      setPlaces(updated);

      setMapPlacesWithPlace((prev) => {
        const mpReordered = [...prev];
        const mpIdx = mpReordered.findIndex((mp) => mp.id === mapPlaceId);
        if (mpIdx < 0) return prev;
        const [mpRemoved] = mpReordered.splice(mpIdx, 1);
        mpReordered.splice(newIdx, 0, mpRemoved);
        return mpReordered.map((mp, i) => ({ ...mp, orderIndex: i }));
      });

      for (let i = 0; i < updated.length; i++) {
        await fetch(`/api/map-places/${updated[i].id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIndex: i }),
        });
      }
    },
    [places]
  );

  const completion = getStepCompletion(data, places.length, places);
  const { canPublish, errors: publishValidationErrors } = validateForPublish(
    data,
    places.length,
    places
  );

  const handlePublish = useCallback(async () => {
    if (!canPublish) {
      setPublishErrors(errorsToRecord(publishValidationErrors));
      const firstError = publishValidationErrors[0];
      if (firstError) {
        const sectionId = FIELD_TO_SECTION[firstError.field] || 'places';
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    if (!confirm('This map will be publicly visible. Publish now?')) return;

    setIsPublishing(true);
    setPublishErrors({});
    try {
      const effectiveTitle =
        data.title?.trim() ||
        (mapPlacesWithPlace.length >= 2 ? generateTitleFromPlaces(mapPlacesWithPlace) : 'Untitled Map');

      const res = await fetch(`/api/maps/${mapId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: effectiveTitle }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (res.status === 422 && json.errors) {
          setPublishErrors(errorsToRecord(json.errors));
          const first = json.errors[0];
          if (first) {
            const sectionId = FIELD_TO_SECTION[first.field] || 'places';
            document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          return;
        }
        throw new Error(json.error || 'Publish failed');
      }

      const slug = json.data?.slug || json.shareUrl?.replace('/map/', '');
      if (slug) router.push(`/map/${slug}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPublishing(false);
    }
  }, [canPublish, mapId, data.title, mapPlacesWithPlace, publishValidationErrors, router]);

  const handleSaveDraft = useCallback(() => {
    const payload = buildPatchPayload(data, templateType);
    saveMap(payload);
  }, [data, templateType, saveMap]);

  const handleAddSuccess = useCallback(() => {
    if (mapId) loadMap(mapId);
    setIsAddModalOpen(false);
  }, [mapId, loadMap]);

  const handleGenerateDetails = useCallback(async () => {
    if (mapPlacesWithPlace.length < 3) return;
    setIsGeneratingDetails(true);
    try {
      const placesPayload = mapPlacesWithPlace.map((mp) => {
        const p = mp.place as { name: string; address?: string | null; latitude?: unknown; longitude?: unknown; googleTypes?: string[]; category?: string | null };
        const lat = p.latitude != null ? Number(p.latitude) : 0;
        const lng = p.longitude != null ? Number(p.longitude) : 0;
        return {
          name: p.name,
          address: p.address ?? '',
          latitude: lat,
          longitude: lng,
          types: p.googleTypes ?? [],
          category: p.category ?? null,
        };
      });

      const res = await fetch('/api/ai/generate-map-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ places: placesPayload, mapId }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate details');

      const d = json.data;
      if (process.env.NODE_ENV === 'development') {
      }

      const suggested: Record<string, boolean> = {};
      const patchPayload: Record<string, unknown> = {};

      setData((prev) => {
        const next = { ...prev };
        if (!prev.title?.trim() && d?.title) {
          next.title = d.title;
          suggested.title = true;
          patchPayload.title = d.title;
        }
        if (!prev.subtitle?.trim() && (d?.description || d?.subtitle)) {
          next.subtitle = d.description ?? d.subtitle ?? '';
          suggested.subtitle = true;
          patchPayload.subtitle = next.subtitle;
        }
        if (!prev.scopeGeography?.trim() && d?.scope?.geography) {
          next.scopeGeography = d.scope.geography;
          suggested.scopeGeography = true;
          patchPayload.scopeGeography = d.scope.geography;
        }
        if (!prev.scopePlaceTypes?.length && Array.isArray(d?.scope?.placeTypes) && d.scope.placeTypes.length > 0) {
          next.scopePlaceTypes = d.scope.placeTypes;
          suggested.scopePlaceTypes = true;
          patchPayload.scopePlaceTypes = d.scope.placeTypes;
        }
        return next;
      });

      setAiSuggestedFields((prev) => ({ ...prev, ...suggested }));

      if (Object.keys(patchPayload).length > 0) {
        saveMap(patchPayload);
      }
    } catch (err) {
      console.error('Generate details error:', err);
      alert(err instanceof Error ? err.message : 'Failed to generate details');
    } finally {
      setIsGeneratingDetails(false);
    }
  }, [mapPlacesWithPlace, mapId, saveMap]);

  const sectionErrors = { ...publishErrors };

  const placeCount = places.length;
  const showTitleSection = placeCount >= 1;

  // Mark sections as revealed after first show (so we don't re-animate on every re-render)
  useEffect(() => {
    if (placeCount >= 1) titleRevealedRef.current = true;
  }, [placeCount]);

  if (isLoading || !mapId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF8F5' }}>
        <p className="text-[#6B6B6B]">Loading...</p>
      </div>
    );
  }

  // Empty state (0 places)
  if (placeCount === 0) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FAF8F5' }}>
        {/* Header */}
        <header
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ backgroundColor: '#fff', borderColor: '#efe9e3' }}
        >
          <Link href="/dashboard" className="flex items-center gap-3">
            <SaikoLogo href="/dashboard" />
          </Link>
          <Link
            href="/dashboard"
            className="text-sm transition-colors"
            style={{ color: '#6B6B6B' }}
          >
            ← Back to Dashboard
          </Link>
        </header>

        <main
          className="flex flex-col items-center justify-center px-6"
          style={{ minHeight: '65vh' }}
        >
          <div
            className="flex items-center justify-center w-24 h-24 rounded-2xl mb-8"
            style={{
              background: 'linear-gradient(135deg, rgba(107,184,196,0.2) 45%, rgba(212,120,92,0.2) 55%)',
            }}
          >
            <MapPin className="w-10 h-10" style={{ color: '#D4785C' }} />
          </div>
          <h1
            className="text-center mb-3"
            style={{
              fontFamily: 'Instrument Serif, serif',
              fontSize: '42px',
              fontWeight: 400,
              color: '#2D2D2D',
            }}
          >
            Drop your first spot
          </h1>
          <p
            className="text-center mb-8 max-w-md"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
              color: '#aaa',
            }}
          >
            Search for a place, paste a Google Maps link, or upload a CSV
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3.5 font-medium text-white rounded-[14px] transition-colors"
            style={{
              backgroundColor: '#D4785C',
              boxShadow: '0 4px 14px rgba(212,120,92,0.35)',
            }}
          >
            <Plus className="w-5 h-5" />
            Add a Place
          </button>
        </main>

        <FloatingPublish
          saveStatus={saveStatus}
          canPublish={false}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
          isPublishing={isPublishing}
        />

        <AddLocationModal
          listSlug={mapId}
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddSuccess}
        />
      </div>
    );
  }

  // Editor with places
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF8F5' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ backgroundColor: '#fff', borderColor: '#efe9e3' }}
      >
        <Link href="/dashboard" className="flex items-center gap-3">
          <SaikoLogo href="/dashboard" />
        </Link>
        <Link
          href="/dashboard"
          className="text-sm transition-colors hover:text-[#D4785C]"
          style={{ color: '#6B6B6B' }}
        >
          ← Back to Dashboard
        </Link>
      </header>

      {/* Floating mini-nav (1+ places) */}
      <FloatingMiniNav placeCount={placeCount} />

      {/* Floating publish */}
      <FloatingPublish
        saveStatus={saveStatus}
        canPublish={canPublish}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        isPublishing={isPublishing}
      />

      <main className="px-6 py-12">
        <div className="mx-auto space-y-12" style={{ maxWidth: '680px' }}>
          {/* 1. Places — always visible when 1+ */}
          <PlaceIndexSection
            mapPlaces={mapPlacesWithPlace}
            errors={sectionErrors}
            onAddPlace={() => setIsAddModalOpen(true)}
            onRemovePlace={handleRemovePlace}
            onReorderPlace={handleReorderPlace}
            onDescriptorChange={handleDescriptorChange}
            onDescriptorBlur={handleDescriptorBlur}
          />

          {/* SaikoAI: Suggest details (3+ places) */}
          {placeCount >= 3 && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleGenerateDetails}
                disabled={isGeneratingDetails}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: '#efe9e3',
                  color: '#6B6B6B',
                  backgroundColor: '#fff',
                }}
                onMouseEnter={(e) => {
                  if (!isGeneratingDetails) {
                    e.currentTarget.style.borderColor = '#D4785C';
                    e.currentTarget.style.color = '#D4785C';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#efe9e3';
                  e.currentTarget.style.color = '#6B6B6B';
                }}
              >
                {isGeneratingDetails ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-[#D4785C] border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>✨ Suggest details from your places</>
                )}
              </button>
            </div>
          )}

          {/* 2. Title section — progressive reveal at 1 place */}
          {showTitleSection && (
            <div
              id="title"
              className="scroll-mt-8 space-y-8"
              style={{
                animation: !titleRevealedRef.current ? 'sectionReveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) both' : undefined,
              }}
            >
              <TitleSection
                title={data.title}
                subtitle={data.subtitle ?? ''}
                titlePlaceholder={titlePlaceholder}
                errors={sectionErrors}
                onChange={(f, v) => updateField(f, v)}
                onBlur={handleBlur}
                aiSuggestedFields={aiSuggestedFields}
              />
              {/* Template / Style selector */}
              <div>
                <label
                  htmlFor="template-select"
                  className="block mb-2 font-medium"
                  style={{ fontFamily: 'Instrument Serif, serif', fontSize: '18px', color: '#2D2D2D' }}
                >
                  Map style
                </label>
                <select
                  id="template-select"
                  value={templateType}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full max-w-xs px-4 py-2.5 rounded-lg border-2 focus:outline-none focus:ring-0 focus:border-[#D4785C]"
                  style={{
                    borderColor: '#efe9e3',
                    color: '#2D2D2D',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                  }}
                >
                  {TEMPLATE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-sm" style={{ color: '#9A9A9A' }}>
                  Field Notes = bento list layout with hydro cover map
                </p>
              </div>
            </div>
          )}

        </div>
      </main>

      <AddLocationModal
        listSlug={mapId}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
