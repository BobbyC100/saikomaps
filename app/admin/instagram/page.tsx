'use client';

import { useState, useEffect } from 'react';

interface Place {
  canonical_id: string;
  name: string;
  neighborhood: string | null;
  category: string | null;
  instagram_handle: string | null;
  website: string | null;
  google_place_id: string | null;
  source_tier?: number;
}

export default function InstagramAdminPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'tier1' | 'tier2'>('tier1');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const pageSize = 20;

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    fetchPlaces();
  }, [filter, page]);

  async function fetchPlaces() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/instagram?filter=${filter}&page=${page}&limit=${pageSize}`
      );
      const data = await res.json();
      setPlaces(data.places);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch places:', error);
    }
    setLoading(false);
  }

  async function updateInstagram(canonicalId: string, handle: string, placeName: string) {
    setSaving(canonicalId);
    try {
      const res = await fetch('/api/admin/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canonical_id: canonicalId, instagram_handle: handle }),
      });

      const data = await res.json();

      if (res.ok) {
        
        // Remove from list (it now has Instagram)
        setPlaces(places.filter(p => p.canonical_id !== canonicalId));
        setTotal(total - 1);
        
        // Show success toast
        setToast({
          message: `✅ Saved ${placeName} → @${handle}`,
          type: 'success',
        });
      } else {
        console.error('❌ Failed to save:', data);
        setToast({
          message: `❌ ${data.error || 'Failed to save'}`,
          type: 'error',
        });
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      setToast({
        message: '❌ Network error - check console',
        type: 'error',
      });
    }
    setSaving(null);
  }

  async function markAsClosed(canonicalId: string, placeName: string) {
    if (!confirm(`Mark "${placeName}" as permanently closed?`)) return;
    
    setSaving(canonicalId);
    try {
      const res = await fetch(`/api/admin/places/${canonicalId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PERMANENTLY_CLOSED' }),
      });

      const data = await res.json();

      if (res.ok) {
        
        // Remove from list
        setPlaces(places.filter(p => p.canonical_id !== canonicalId));
        setTotal(total - 1);
        
        // Show success toast
        setToast({
          message: `✅ Marked "${placeName}" as closed`,
          type: 'success',
        });
      } else {
        console.error('❌ Failed to mark as closed:', data);
        setToast({
          message: `❌ ${data.error || 'Failed to mark as closed'}`,
          type: 'error',
        });
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      setToast({
        message: '❌ Network error - check console',
        type: 'error',
      });
    }
    setSaving(null);
  }

  async function markAsNoInstagram(canonicalId: string, placeName: string) {
    setSaving(canonicalId);
    try {
      const res = await fetch('/api/admin/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canonical_id: canonicalId, no_instagram: true }),
      });

      const data = await res.json();

      if (res.ok) {
        
        // Remove from list
        setPlaces(places.filter(p => p.canonical_id !== canonicalId));
        setTotal(total - 1);
        
        // Show success toast
        setToast({
          message: `✅ "${placeName}" marked as no Instagram`,
          type: 'success',
        });
      } else {
        console.error('❌ Failed to mark as no Instagram:', data);
        setToast({
          message: `❌ ${data.error || 'Failed to mark as no Instagram'}`,
          type: 'error',
        });
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      setToast({
        message: '❌ Network error - check console',
        type: 'error',
      });
    }
    setSaving(null);
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
          <div
            className={`px-6 py-3 rounded-lg shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Instagram Backfill Tool
          </h1>
          <p className="text-gray-600">
            Manually add Instagram handles for places missing them. Focus on Tier 1/2 sources.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => { setFilter('tier1'); setPage(1); }}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filter === 'tier1'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tier 1 Only
            </button>
            <button
              onClick={() => { setFilter('tier2'); setPage(1); }}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filter === 'tier2'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tier 2 Only
            </button>
            <button
              onClick={() => { setFilter('all'); setPage(1); }}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All LA County
            </button>
          </div>
          <div className="text-sm text-gray-600">
            {total} places missing Instagram
          </div>
        </div>

        {/* Places List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {places.map((place) => (
                <PlaceCard
                  key={place.canonical_id}
                  place={place}
                  onSave={updateInstagram}
                  onClose={markAsClosed}
                  onNoInstagram={markAsNoInstagram}
                  saving={saving === place.canonical_id}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PlaceCard({
  place,
  onSave,
  onClose,
  onNoInstagram,
  saving,
}: {
  place: Place;
  onSave: (id: string, handle: string, placeName: string) => void;
  onClose: (id: string, placeName: string) => void;
  onNoInstagram: (id: string, placeName: string) => void;
  saving: boolean;
}) {
  const [handle, setHandle] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (handle.trim()) {
      // Remove @ if present
      const cleanHandle = handle.trim().replace(/^@/, '');
      onSave(place.canonical_id, cleanHandle, place.name);
      setHandle('');
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{place.name}</h3>
            {place.source_tier && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                place.source_tier === 1
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                Tier {place.source_tier}
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-600 space-y-1">
            {place.neighborhood && (
              <div>📍 {place.neighborhood}</div>
            )}
            {place.category && (
              <div>🍽️ {place.category}</div>
            )}
            {place.website && (
              <div>
                🌐{' '}
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {place.website}
                </a>
              </div>
            )}
            {place.google_place_id && (
              <div>
                🔍{' '}
                <a
                  href={`https://www.google.com/maps/place/?q=place_id:${place.google_place_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google Maps
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                @
              </span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="instagram_handle"
                className="pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={saving}
              />
            </div>
            <button
              type="submit"
              disabled={!handle.trim() || saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </form>
          
          <div className="flex gap-2">
            <button
              onClick={() => onNoInstagram(place.canonical_id, place.name)}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              No Instagram
            </button>
            <button
              onClick={() => onClose(place.canonical_id, place.name)}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Mark as Closed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
