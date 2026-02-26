'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface QueuePlace {
  place_id: string;
  slug: string;
  name: string;
  google_place_id: string | null;
}

interface Photo {
  photo_ref: string;
  width_px: number;
  height_px: number;
  url: string;
  fallback?: boolean;
  aspect?: number;
  score?: number;
}

interface PlacePhotosResponse {
  place: { id: string; slug: string; name: string; google_place_id: string | null };
  photos: Photo[];
  portraitFallbackUsed?: number;
}

const TIERS = ['HERO', 'GALLERY', 'REJECT'] as const;
const TYPES = ['EXTERIOR', 'INTERIOR', 'CONTEXT', 'FOOD'] as const;

function PhotoEvalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = (searchParams.get('mode') ?? 'default') === 'editorial' ? 'editorial' : 'default';

  const [queue, setQueue] = useState<QueuePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [placeData, setPlaceData] = useState<PlacePhotosResponse | null>(null);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [tags, setTags] = useState<Record<string, { tier: string; type: string }>>({});
  const [saving, setSaving] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    placesReviewed: 0,
    totalHeroTags: 0,
    placesWithHero: 0,
  });

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/photo-eval/queue');
      const data = await res.json();
      setQueue(Array.isArray(data) ? data : []);
      setCurrentIndex(0);
      setSessionStats({ placesReviewed: 0, totalHeroTags: 0, placesWithHero: 0 });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    if (queue.length === 0 || currentIndex >= queue.length) {
      setPlaceData(null);
      return;
    }
    const p = queue[currentIndex];
    if (!p?.place_id || !p.google_place_id) {
      setPlaceData(null);
      return;
    }
    const controller = new AbortController();
    setLoadingPlace(true);
    setTags({});
    const qs = mode === 'editorial' ? '?mode=editorial' : '';
    fetch(`/api/admin/photo-eval/${p.place_id}${qs}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (!controller.signal.aborted) setPlaceData(d);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') console.error(e);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingPlace(false);
      });
    return () => controller.abort();
  }, [queue, currentIndex, mode]);

  const current = queue[currentIndex];

  const handleNext = async () => {
    if (!placeData?.photos.length) {
      setCurrentIndex((i) => i + 1);
      setSessionStats((s) => ({ ...s, placesReviewed: s.placesReviewed + 1 }));
      return;
    }
    const allTiered = placeData.photos.every((ph) => tags[ph.photo_ref]?.tier);
    if (!allTiered) return;
    setSaving(true);
    try {
      const heroCount = placeData.photos.filter((ph) => tags[ph.photo_ref]?.tier === 'HERO').length;
      await fetch('/api/admin/photo-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: placeData.place.id,
          google_place_id: placeData.place.google_place_id,
          requested_max_width_px: 1600,
          photos: placeData.photos.map((ph) => ({
            photo_ref: ph.photo_ref,
            width_px: ph.width_px,
            height_px: ph.height_px,
            tier: tags[ph.photo_ref].tier,
            type: tags[ph.photo_ref].type || undefined,
          })),
        }),
      });
      setSessionStats((s) => ({
        ...s,
        placesReviewed: s.placesReviewed + 1,
        totalHeroTags: s.totalHeroTags + heroCount,
        placesWithHero: s.placesWithHero + (heroCount > 0 ? 1 : 0),
      }));
      setCurrentIndex((i) => i + 1);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleSkip = () => {
    setCurrentIndex((i) => i + 1);
    setSessionStats((s) => ({ ...s, placesReviewed: s.placesReviewed + 1 }));
  };

  const allTiered = placeData?.photos.every((ph) => tags[ph.photo_ref]?.tier) ?? false;

  // Done state
  if (!loading && queue.length > 0 && currentIndex >= queue.length) {
    const reviewed = sessionStats.placesReviewed || queue.length;
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Done</h1>
          <div className="text-gray-600 mb-6 space-y-1">
            <p>Places reviewed: {reviewed}</p>
            <p>Total HERO tags: {sessionStats.totalHeroTags}</p>
            <p>Places with ≥1 HERO tag: {sessionStats.placesWithHero}</p>
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => router.push('/admin/photo-eval')}
              className={`px-4 py-2 text-sm rounded-md ${mode === 'default' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Default
            </button>
            <button
              onClick={() => router.push('/admin/photo-eval?mode=editorial')}
              className={`px-4 py-2 text-sm rounded-md ${mode === 'editorial' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Editorial
            </button>
          </div>
          <button
            onClick={fetchQueue}
            className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            Reload queue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Photo Eval</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/admin/photo-eval')}
              className={`px-4 py-2 text-sm rounded-md ${
                mode === 'default'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Default
            </button>
            <button
              onClick={() => router.push('/admin/photo-eval?mode=editorial')}
              className={`px-4 py-2 text-sm rounded-md ${
                mode === 'editorial'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Editorial
            </button>
            <button
              onClick={fetchQueue}
              className="text-sm text-gray-600 hover:text-gray-900 underline ml-2"
            >
              Reload queue
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading queue...</p>
        ) : !current ? (
          <p className="text-gray-500">No places in queue.</p>
        ) : loadingPlace ? (
          <p className="text-gray-500">Loading place...</p>
        ) : placeData ? (
          <>
            <div className="mb-4 text-gray-700">
              Place {currentIndex + 1} of {queue.length}: <strong>{placeData.place.name}</strong>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Showing {placeData.photos.length}/8
              {(placeData.portraitFallbackUsed ?? 0) > 0 && (
                <> ({placeData.portraitFallbackUsed} fallback portrait{(placeData.portraitFallbackUsed ?? 0) !== 1 ? 's' : ''})</>
              )}
              {' '}after minDim≥900 filter.
            </p>

            {placeData.photos.length === 0 ? (
              <p className="text-gray-500 mb-4">No qualifying photos.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {placeData.photos.map((ph) => (
                  <div key={ph.photo_ref} className="bg-white rounded-lg overflow-hidden shadow-sm">
                    <img
                      src={ph.url}
                      alt=""
                      className="w-full object-cover"
                      style={{ aspectRatio: `${ph.width_px} / ${ph.height_px}` }}
                    />
                    <div className="p-2 space-y-1">
                      <div className="text-xs text-gray-500">
                        {ph.width_px}×{ph.height_px}
                        {typeof ph.score === 'number' && (
                          <span className="ml-1 text-blue-600">score {ph.score}</span>
                        )}
                      </div>
                      <select
                        value={tags[ph.photo_ref]?.tier ?? ''}
                        onChange={(e) =>
                          setTags((t) => ({
                            ...t,
                            [ph.photo_ref]: { ...t[ph.photo_ref], tier: e.target.value },
                          }))
                        }
                        className="w-full text-sm border rounded px-2 py-1"
                      >
                        <option value="">Tier (required)</option>
                        {TIERS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <select
                        value={tags[ph.photo_ref]?.type ?? ''}
                        onChange={(e) =>
                          setTags((t) => ({
                            ...t,
                            [ph.photo_ref]: { ...t[ph.photo_ref], type: e.target.value },
                          }))
                        }
                        className="w-full text-sm border rounded px-2 py-1"
                      >
                        <option value="">Type (optional)</option>
                        {TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleNext}
                disabled={(placeData.photos.length > 0 && !allTiered) || saving}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Next'}
              </button>
              <button
                onClick={handleSkip}
                disabled={saving}
                className="px-6 py-2 text-gray-600 hover:text-gray-900"
              >
                Skip
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function PhotoEvalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">Loading...</div>}>
      <PhotoEvalContent />
    </Suspense>
  );
}
