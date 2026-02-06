'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-[#D64541]"></div>
            <div className="w-6 h-6 rounded-full bg-[#89B4C4]"></div>
            <div className="w-6 h-6 bg-white"></div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-xl text-white/60">Your maps at a glance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-[#2A2A2A] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
            <div className="text-sm font-medium text-white/50 uppercase tracking-wider mb-2">
              Total Maps
            </div>
            <div className="text-4xl font-bold text-white">{maps.length}</div>
          </div>
          <div className="bg-[#2A2A2A] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
            <div className="text-sm font-medium text-white/50 uppercase tracking-wider mb-2">
              Locations
            </div>
            <div className="text-4xl font-bold text-white">{totalLocations}</div>
          </div>
          <div className="bg-[#2A2A2A] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
            <div className="text-sm font-medium text-white/50 uppercase tracking-wider mb-2">
              Total Views
            </div>
            <div className="text-4xl font-bold text-white">{totalViews}</div>
          </div>
          <div className="bg-[#2A2A2A] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
            <div className="text-sm font-medium text-white/50 uppercase tracking-wider mb-2">
              Published
            </div>
            <div className="text-4xl font-bold text-[#89B4C4]">
              {publishedCount} / {maps.length || 1}
            </div>
          </div>
        </div>

        {/* My Maps */}
        <div className="bg-[#2A2A2A] border border-white/10 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">My Maps</h2>
          {isLoading ? (
            <p className="text-white/60">Loading maps...</p>
          ) : error ? (
            <p className="text-[#D64541]">{error}</p>
          ) : maps.length === 0 ? (
            <p className="text-white/60 mb-6">No maps yet. Create your first map to get started.</p>
          ) : (
            <div className="space-y-4">
              {maps.map((map) => (
                <div
                  key={map.id}
                  className="flex items-center justify-between gap-4 p-4 bg-[#1A1A1A] border border-white/10 rounded-lg hover:border-white/20 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-bold text-lg truncate">{map.title}</h3>
                    <p className="text-white/50 text-sm mt-1">
                      {map.locationCount} locations
                      {map.published && (
                        <>
                          {' · '}
                          <span className="text-[#89B4C4]">{map.viewCount} views</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        map.published
                          ? 'bg-[#89B4C4]/20 text-[#89B4C4]'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {map.published ? 'Published' : 'Draft'}
                    </span>
                    <Link
                      href={`/maps/${map.id}/edit`}
                      className="px-3 py-2 text-sm font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      Edit
                    </Link>
                    <Link
                      href={map.published ? `/map/${map.slug}` : `/create/${map.id}/preview`}
                      className="px-3 py-2 text-sm font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      {map.published ? 'View' : 'Preview'}
                    </Link>
                    {map.published && (
                      <Link
                        href={`/map/${map.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 text-sm font-medium text-[#89B4C4] hover:text-[#89B4C4]/80 bg-[#89B4C4]/10 hover:bg-[#89B4C4]/20 rounded-lg transition-colors"
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
        <div className="bg-[#2A2A2A] border border-white/10 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-4">
            <Link
              href="/maps/new"
              className="p-6 bg-[#D64541] rounded-lg hover:bg-[#C13D39] transition-colors text-center"
            >
              <div className="text-3xl mb-2">✨</div>
              <div className="text-white font-bold">Create New Map</div>
              <div className="text-white/70 text-sm mt-1">Start from scratch</div>
            </Link>
            <Link
              href="/test-add-location"
              className="p-6 bg-[#89B4C4] rounded-lg hover:bg-[#7CA4B4] transition-colors text-center"
            >
              <div className="text-3xl mb-2">🗺️</div>
              <div className="text-white font-bold">Add Location</div>
              <div className="text-white/70 text-sm mt-1">Test the feature</div>
            </Link>
            <Link
              href="/import"
              className="p-6 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-center"
            >
              <div className="text-3xl mb-2">📥</div>
              <div className="text-white font-bold">Import CSV</div>
              <div className="text-white/70 text-sm mt-1">Bulk import</div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
