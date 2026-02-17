'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';

interface MapItem {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  locationCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMaps() {
      try {
        const res = await fetch('/api/maps');
        if (!res.ok) {
          setError('Could not load maps');
          return;
        }
        const json = await res.json();
        setMaps(json.data ?? []);
      } catch {
        setError('Could not load maps');
      } finally {
        setIsLoading(false);
      }
    }
    loadMaps();
  }, []);

  const totalLocations = maps.reduce((sum, m) => sum + m.locationCount, 0);
  const totalViews = maps.reduce((sum, m) => sum + m.viewCount, 0);
  const publishedCount = maps.filter((m) => m.published).length;

  return (
    <DashboardLayout>
      <div className="space-y-12">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-normal text-[var(--charcoal)] mb-2" style={{ fontFamily: 'var(--font-libre)', fontStyle: 'italic' }}>Dashboard</h1>
          <p className="text-[var(--charcoal)]/60 text-sm">Your maps at a glance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-[var(--warm-white)] border border-[var(--charcoal)]/10 rounded-xl p-6 transition-colors">
            <div className="text-sm font-medium text-[var(--charcoal)]/60 uppercase tracking-wider mb-2">
              Total Maps
            </div>
            <div className="text-4xl font-bold text-[var(--charcoal)]">{maps.length}</div>
          </div>
          <div className="bg-[var(--warm-white)] border border-[var(--charcoal)]/10 rounded-xl p-6 transition-colors">
            <div className="text-sm font-medium text-[var(--charcoal)]/60 uppercase tracking-wider mb-2">
              Locations
            </div>
            <div className="text-4xl font-bold text-[var(--charcoal)]">{totalLocations}</div>
          </div>
          <div className="bg-[var(--warm-white)] border border-[var(--charcoal)]/10 rounded-xl p-6 transition-colors">
            <div className="text-sm font-medium text-[var(--charcoal)]/60 uppercase tracking-wider mb-2">
              Total Views
            </div>
            <div className="text-4xl font-bold text-[var(--charcoal)]">{totalViews}</div>
          </div>
          <div className="bg-[var(--warm-white)] border border-[var(--charcoal)]/10 rounded-xl p-6 transition-colors">
            <div className="text-sm font-medium text-[var(--charcoal)]/60 uppercase tracking-wider mb-2">
              Published
            </div>
            <div className="text-4xl font-bold text-[var(--leather)]">
              {publishedCount} / {maps.length || 1}
            </div>
          </div>
        </div>

        {/* My Maps */}
        <div className="bg-[var(--warm-white)] border border-[var(--charcoal)]/10 rounded-xl p-8">
          <h2 className="text-lg font-semibold text-[var(--charcoal)] uppercase tracking-wider mb-6">My Maps</h2>
          {isLoading ? (
            <p className="text-[var(--charcoal)]/60">Loading maps...</p>
          ) : error ? (
            <p className="text-[var(--error)]">{error}</p>
          ) : maps.length === 0 ? (
            <p className="text-[var(--charcoal)]/60 mb-6">No maps yet. Create your first map to get started.</p>
          ) : (
            <div className="space-y-4">
              {maps.map((map) => (
                <div
                  key={map.id}
                  className="flex items-center justify-between gap-4 p-4 bg-white border border-[var(--charcoal)]/10 rounded-xl transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[var(--charcoal)] font-semibold text-lg truncate">{map.title}</h3>
                    <p className="text-[var(--charcoal)]/50 text-sm mt-1">
                      {map.locationCount} locations
                      {map.published && (
                        <>
                          {' · '}
                          <span className="text-[var(--leather)]">{map.viewCount} views</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`px-2 py-1 text-xs font-medium uppercase tracking-wider`}
                      style={{
                        borderRadius: '12px',
                        ...(map.published
                          ? { backgroundColor: 'rgba(139, 115, 85, 0.15)', color: 'var(--leather)' }
                          : { backgroundColor: 'rgba(54, 69, 79, 0.08)', color: 'var(--charcoal)' }),
                      }}
                    >
                      {map.published ? 'Published' : 'Draft'}
                    </span>
                    <Link
                      href={`/maps/${map.id}/edit`}
                      className="px-3 py-2 text-sm font-semibold text-[var(--charcoal)]/80 hover:text-[var(--charcoal)] uppercase tracking-wider border border-[var(--charcoal)]/20 hover:border-[var(--charcoal)]/40 transition-colors"
                      style={{ borderRadius: '12px' }}
                    >
                      Edit
                    </Link>
                    <Link
                      href={map.published ? `/map/${map.slug}` : `/create/${map.id}/preview`}
                      className="px-3 py-2 text-sm font-semibold text-[var(--charcoal)]/80 hover:text-[var(--charcoal)] uppercase tracking-wider border border-[var(--charcoal)]/20 hover:border-[var(--charcoal)]/40 transition-colors"
                      style={{ borderRadius: '12px' }}
                    >
                      {map.published ? 'View' : 'Preview'}
                    </Link>
                    {map.published && (
                      <Link
                        href={`/map/${map.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 text-sm font-semibold text-[var(--leather)] hover:opacity-90 uppercase tracking-wider border border-[var(--leather)]/30 hover:border-[var(--leather)]/50 transition-colors"
                        style={{ borderRadius: '12px' }}
                      >
                        Open
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-[var(--warm-white)] border border-[var(--charcoal)]/10 rounded-xl p-8">
          <h2 className="text-lg font-semibold text-[var(--charcoal)] uppercase tracking-wider mb-6">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-4">
            <Link
              href="/maps/new"
              className="p-6 rounded-xl text-center transition-colors bg-[var(--charcoal)] text-[var(--parchment)] hover:opacity-90"
              style={{ borderRadius: '12px', boxShadow: '0 10px 28px rgba(0,0,0,.10)' }}
            >
              <div className="text-3xl mb-2">✨</div>
              <div className="font-semibold text-sm tracking-wider uppercase">Create New Map</div>
              <div className="text-[var(--parchment)]/70 text-xs mt-1">Start from scratch</div>
            </Link>
            <Link
              href="/test-add-location"
              className="p-6 rounded-xl text-center transition-colors border border-[var(--leather)]/40 text-[var(--leather)] hover:bg-[var(--leather)]/10"
              style={{ borderRadius: '12px' }}
            >
              <div className="text-3xl mb-2">🗺️</div>
              <div className="font-semibold text-sm tracking-wider uppercase">Add Location</div>
              <div className="text-[var(--charcoal)]/60 text-xs mt-1">Test the feature</div>
            </Link>
            <Link
              href="/import"
              className="p-6 rounded-xl text-center transition-colors border border-[var(--charcoal)]/20 text-[var(--charcoal)]/80 hover:border-[var(--charcoal)]/40 hover:bg-[var(--charcoal)]/5"
              style={{ borderRadius: '12px' }}
            >
              <div className="text-3xl mb-2">📥</div>
              <div className="font-semibold text-sm tracking-wider uppercase">Import CSV</div>
              <div className="text-[var(--charcoal)]/60 text-xs mt-1">Bulk import</div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
