'use client';

/**
 * Admin Appearances — create/edit place appearances
 * Subject (pop-up/mobile) appears at host place OR raw location (sidewalk)
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface PlaceOption {
  id: string;
  name: string;
  slug: string;
}

interface AppearanceItem {
  id: string;
  subjectPlaceId: string;
  hostPlaceId: string | null;
  latitude: number | null;
  longitude: number | null;
  addressText: string | null;
  scheduleText: string;
  status: string;
  subjectPlace: { id: string; name: string; slug: string };
  hostPlace: { id: string; name: string; slug: string } | null;
}

type Mode = 'host' | 'location';

function usePlaceSearch() {
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setPlaces([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/places/search?q=${encodeURIComponent(q)}`, {
        credentials: 'include',
      });
      if (res.redirected || res.headers.get('content-type')?.includes('text/html')) {
        setPlaces([]);
        return;
      }
      const data = await res.json();
      setPlaces(data.places ?? []);
    } catch {
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { places, loading, search };
}

export default function AdminAppearancesPage() {
  const [mode, setMode] = useState<Mode>('host');
  const [subjectQuery, setSubjectQuery] = useState('');
  const [subjectSelectedId, setSubjectSelectedId] = useState('');
  const [subjectBlurred, setSubjectBlurred] = useState(false);
  const [hostQuery, setHostQuery] = useState('');
  const [hostSelectedId, setHostSelectedId] = useState('');
  const [hostBlurred, setHostBlurred] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [addressText, setAddressText] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [scheduleText, setScheduleText] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'ENDED' | 'ANNOUNCED'>('ACTIVE');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string; data?: unknown } | null>(null);
  const [list, setList] = useState<AppearanceItem[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const subjectSearch = usePlaceSearch();
  const hostSearch = usePlaceSearch();

  useEffect(() => {
    subjectSearch.search(subjectQuery);
  }, [subjectQuery, subjectSearch.search]);
  useEffect(() => {
    if (mode === 'host') hostSearch.search(hostQuery);
  }, [mode, hostQuery, hostSearch.search]);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch('/api/admin/appearances', { credentials: 'include' });
      if (res.redirected || res.headers.get('content-type')?.includes('text/html')) {
        setList([]);
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setList(data.data);
      }
    } catch {
      setList([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setSaving(true);
    setResult(null);

    const payload: Record<string, unknown> = {
      subjectPlaceId: subjectSelectedId,
      scheduleText: scheduleText.trim(),
      status,
    };

    if (mode === 'host') {
      if (!hostSelectedId.trim()) {
        setResult({ success: false, error: 'Select a host place' });
        setSaving(false);
        return;
      }
      payload.hostPlaceId = hostSelectedId.trim();
    } else {
      const lat = latitude.trim() ? parseFloat(latitude) : null;
      const lng = longitude.trim() ? parseFloat(longitude) : null;
      const addr = addressText.trim() || null;
      if (lat == null || Number.isNaN(lat) || lng == null || Number.isNaN(lng) || !addr) {
        setResult({
          success: false,
          error: 'Enter address, latitude, and longitude for specific location',
        });
        setSaving(false);
        return;
      }
      payload.latitude = lat;
      payload.longitude = lng;
      payload.addressText = addr;
    }

    try {
      const res = await fetch('/api/admin/appearances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      if (res.redirected || res.headers.get('content-type')?.includes('text/html')) {
        setResult({ success: false, error: 'Login required' });
        setSaving(false);
        return;
      }
      let data: { success?: boolean; error?: string; data?: unknown };
      try {
        data = await res.json();
      } catch {
        setResult({ success: false, error: 'Login required' });
        setSaving(false);
        return;
      }
      setResult({ success: Boolean(data.success), error: data.error, data: data.data });
      if (data.success) {
        setSubjectSelectedId('');
        setSubjectQuery('');
        setSubjectBlurred(false);
        setHostSelectedId('');
        setHostQuery('');
        setHostBlurred(false);
        setSubmitAttempted(false);
        setAddressText('');
        setLatitude('');
        setLongitude('');
        setScheduleText('');
        fetchList();
      }
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Request failed',
      });
    } finally {
      setSaving(false);
    }
  };

  const selectSubject = (p: PlaceOption) => {
    setSubjectSelectedId(p.id);
    setSubjectQuery(p.name);
    setSubjectBlurred(false);
    subjectSearch.search('');
  };
  const selectHost = (p: PlaceOption) => {
    setHostSelectedId(p.id);
    setHostQuery(p.name);
    setHostBlurred(false);
    hostSearch.search('');
  };

  const showSubjectError =
    subjectQuery.length > 0 &&
    !subjectSelectedId &&
    (subjectBlurred || submitAttempted);
  const showHostError =
    mode === 'host' &&
    hostQuery.length > 0 &&
    !hostSelectedId &&
    (hostBlurred || submitAttempted);

  return (
    <div className="py-8 px-6">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-[#8B7355] mb-2">
            <Link href="/admin" className="hover:text-[#36454F]">
              Admin
            </Link>
            <span>/</span>
            <span className="text-[#36454F] font-medium">Appearances</span>
          </nav>
          <h1 className="text-2xl font-bold text-[#36454F]">Place Appearances</h1>
          <p className="text-[#8B7355] text-sm mt-1">
            Subject (pop-up/mobile) appears at a host place or raw location
          </p>
        </header>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-[#36454F] mb-1">
              Subject (pop-up / mobile concept) *
            </label>
            <input
              type="text"
              value={subjectQuery}
              onChange={(e) => {
                setSubjectQuery(e.target.value);
                if (!e.target.value) setSubjectSelectedId('');
              }}
              onBlur={() => setSubjectBlurred(true)}
              placeholder="Search by name or slug..."
              className="w-full px-4 py-2 border border-[#C3B091]/60 rounded-lg focus:ring-2 focus:ring-[#5BA7A7]/50 focus:border-[#5BA7A7]"
            />
            {subjectSearch.places.length > 0 && (
              <ul className="mt-1 border border-[#C3B091]/40 rounded-lg divide-y divide-[#C3B091]/30 bg-white max-h-40 overflow-y-auto">
                {subjectSearch.places.map((p) => (
                  <li
                    key={p.id}
                    className="px-4 py-2 cursor-pointer hover:bg-[#F5F0E1]/60 text-sm"
                    onClick={() => selectSubject(p)}
                  >
                    {p.name} <span className="text-[#8B7355]">({p.slug})</span>
                  </li>
                ))}
              </ul>
            )}
            {subjectSelectedId ? (
              <p className="text-xs text-[#5BA7A7] mt-1">Selected: {subjectQuery}</p>
            ) : showSubjectError ? (
              <p className="text-sm text-amber-700 mt-1">Select a place from dropdown.</p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#36454F] mb-2">Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'host'}
                  onChange={() => setMode('host')}
                />
                <span>Hosted at a Place</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'location'}
                  onChange={() => setMode('location')}
                />
                <span>Specific location (sidewalk)</span>
              </label>
            </div>
          </div>

          {mode === 'host' && (
            <div>
              <label className="block text-sm font-medium text-[#36454F] mb-1">
                Host Place *
              </label>
              <input
                type="text"
                value={hostQuery}
                onChange={(e) => {
                  setHostQuery(e.target.value);
                  if (!e.target.value) setHostSelectedId('');
                }}
                onBlur={() => setHostBlurred(true)}
                placeholder="Search by name or slug..."
                className="w-full px-4 py-2 border border-[#C3B091]/60 rounded-lg focus:ring-2 focus:ring-[#5BA7A7]/50 focus:border-[#5BA7A7]"
              />
              <p className="text-xs text-[#8B7355] mt-1">Type to search, then select a result (required).</p>
              {showHostError && (
                <p className="text-sm text-amber-700 mt-1">Please select a host place from the dropdown.</p>
              )}
              {hostSearch.places.length > 0 && (
                <ul className="mt-1 border border-[#C3B091]/40 rounded-lg divide-y divide-[#C3B091]/30 bg-white max-h-40 overflow-y-auto">
                  {hostSearch.places.map((p) => (
                    <li
                      key={p.id}
                      className="px-4 py-2 cursor-pointer hover:bg-[#F5F0E1]/60 text-sm"
                      onClick={() => selectHost(p)}
                    >
                      {p.name} <span className="text-[#8B7355]">({p.slug})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {mode === 'location' && (
            <>
              <div>
                <label className="block text-sm font-medium text-[#36454F] mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder="e.g. Sunset Blvd sidewalk near ___"
                  className="w-full px-4 py-2 border border-[#C3B091]/60 rounded-lg focus:ring-2 focus:ring-[#5BA7A7]/50 focus:border-[#5BA7A7]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#36454F] mb-1">
                    Latitude *
                  </label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="34.0522"
                    className="w-full px-4 py-2 border border-[#C3B091]/60 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#36454F] mb-1">
                    Longitude *
                  </label>
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="-118.2437"
                    className="w-full px-4 py-2 border border-[#C3B091]/60 rounded-lg"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-[#36454F] mb-1">
              Schedule *
            </label>
            <input
              type="text"
              name="scheduleText"
              id="appearance-schedule"
              value={scheduleText}
              onChange={(e) => setScheduleText(e.target.value)}
              placeholder="e.g. Thurs 8am–12pm"
              className="w-full px-4 py-2 border border-[#C3B091]/60 rounded-lg focus:ring-2 focus:ring-[#5BA7A7]/50 focus:border-[#5BA7A7]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#36454F] mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'ENDED' | 'ANNOUNCED')}
              className="w-full px-4 py-2 border border-[#C3B091]/60 rounded-lg"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="ANNOUNCED">ANNOUNCED</option>
              <option value="ENDED">ENDED</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={
              saving ||
              !subjectSelectedId ||
              !scheduleText.trim() ||
              (mode === 'host' && !hostSelectedId) ||
              (mode === 'location' &&
                (!addressText.trim() ||
                  !latitude.trim() ||
                  !longitude.trim() ||
                  Number.isNaN(parseFloat(latitude)) ||
                  Number.isNaN(parseFloat(longitude))))
            }
            className="w-full py-2 px-4 bg-[#5BA7A7] text-white rounded-lg hover:bg-[#4a9696] disabled:opacity-50 font-medium"
          >
            {saving ? 'Creating…' : 'Create Appearance'}
          </button>

          {result && (
            <div
              className={
                result.success
                  ? 'bg-green-50 border border-green-200 rounded-lg p-4 text-green-800'
                  : 'bg-red-50 border border-red-200 rounded-lg p-4 text-red-800'
              }
            >
              <p className="font-medium">{result.success ? 'Created' : result.error}</p>
            </div>
          )}
        </form>

        <section>
          <h2 className="text-lg font-semibold text-[#36454F] mb-3">Existing Appearances</h2>
          {listLoading ? (
            <p className="text-[#8B7355] text-sm">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-[#8B7355] text-sm">No appearances yet.</p>
          ) : (
            <ul className="space-y-3">
              {list.map((a) => (
                <li
                  key={a.id}
                  className="border border-[#C3B091]/40 rounded-lg p-4 bg-white/60"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-[#36454F]">
                        {a.subjectPlace.name} →{' '}
                        {a.hostPlace ? (
                          <Link
                            href={`/place/${a.hostPlace.slug}`}
                            className="text-[#5BA7A7] hover:underline"
                          >
                            {a.hostPlace.name}
                          </Link>
                        ) : (
                          <span className="text-[#8B7355]">{a.addressText ?? '(raw location)'}</span>
                        )}
                      </p>
                      <p className="text-sm text-[#8B7355] mt-1">{a.scheduleText}</p>
                      <p className="text-xs text-[#8B7355] mt-0.5">
                        Status: {a.status} · ID: {a.id.slice(0, 8)}
                      </p>
                    </div>
                    <Link
                      href={`/place/${a.subjectPlace.slug}`}
                      className="text-sm text-[#5BA7A7] hover:underline"
                    >
                      View subject
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
