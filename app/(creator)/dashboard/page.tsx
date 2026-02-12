'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Settings, Plus, User, Lock, Download, LogOut } from 'lucide-react';

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

interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  curatorNote: string | null;
  scopePills: string[];
  coverageSources: string[];
  createdAt: string;
  stats: {
    mapsCount: number;
    placesCount: number;
    savedCount: number;
  };
}

type SortOption = 'recent' | 'az' | 'places';

const PLACEHOLDER_PHOTOS = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=150&fit=crop',
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=200&h=150&fit=crop',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200&h=150&fit=crop',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200&h=150&fit=crop',
];

export default function DashboardPage() {
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [mapsRes, profileRes] = await Promise.all([
          fetch('/api/maps'),
          fetch('/api/profile'),
        ]);

        if (!mapsRes.ok) {
          setError('Could not load maps');
          return;
        }
        const mapsJson = await mapsRes.json();
        setMaps(mapsJson.data ?? []);

        if (profileRes.ok) {
          const profileJson = await profileRes.json();
          setProfile(profileJson.data ?? null);
        }
      } catch {
        setError('Could not load data');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const sortedMaps = [...maps].sort((a, b) => {
    if (sortBy === 'recent') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (sortBy === 'az') return a.title.localeCompare(b.title);
    return b.locationCount - a.locationCount;
  });

  const displayName = profile?.name || 'My Maps';
  const initials = (displayName?.match(/\b\w/g) || ['?']).slice(0, 2).join('').toUpperCase();

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F5F0E1]">
        {/* Curator Header */}
        <header className="py-8 px-10 max-w-[1200px] mx-auto">
          <div className="curator-top-row flex items-start gap-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-[#FFFDF7] text-2xl font-medium shrink-0 bg-[#C3B091] overflow-hidden"
              aria-hidden
            >
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt=""
                  width={64}
                  height={64}
                  className="rounded-full object-cover w-full h-full"
                />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-[var(--font-libre),Georgia,serif] text-[28px] italic text-[#36454F] mb-1.5">
                {displayName}&apos;s Maps
              </h1>
              {profile?.curatorNote && (
                <p className="text-sm text-[#8B7355] leading-relaxed max-w-[440px] mb-3.5 line-clamp-2">
                  {profile.curatorNote}
                </p>
              )}
              {profile?.scopePills && profile.scopePills.length > 0 && (
                <div className="flex gap-1.5 flex-wrap items-center">
                  {profile.scopePills.map((pill) => (
                    <span key={pill} className="px-3 py-1.5 bg-[#FFFDF7] rounded-full text-[11px] text-[#8B7355] font-medium">
                      {pill}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="relative shrink-0" ref={settingsRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSettingsOpen((o) => !o);
                }}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[#C3B091] hover:bg-[#C3B091]/15 hover:text-[#8B7355] transition-colors mt-1"
                aria-label="Settings"
                aria-expanded={settingsOpen}
                aria-haspopup="true"
              >
                <Settings size={18} />
              </button>
              <div
                className={`absolute top-full right-0 mt-2 min-w-[180px] py-1.5 px-1.5 rounded-[10px] bg-[#FFFDF7] shadow-[0_4px_20px_rgba(139,115,85,0.15),0_0_0_1px_rgba(195,176,145,0.1)] transition-all duration-150 z-[100] ${
                  settingsOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'
                }`}
                role="menu"
              >
                <Link
                  href="/profile/edit"
                  className="flex items-center gap-2.5 py-2.5 px-3 rounded-md text-[13px] text-[#36454F] hover:bg-[#C3B091]/12 transition-colors"
                  role="menuitem"
                  onClick={() => setSettingsOpen(false)}
                >
                  <User size={16} className="text-[#C3B091] shrink-0" />
                  Edit profile
                </Link>
                <Link
                  href="/profile/privacy"
                  className="flex items-center gap-2.5 py-2.5 px-3 rounded-md text-[13px] text-[#36454F] hover:bg-[#C3B091]/12 transition-colors"
                  role="menuitem"
                  onClick={() => setSettingsOpen(false)}
                >
                  <Lock size={16} className="text-[#C3B091] shrink-0" />
                  Privacy
                </Link>
                <Link
                  href="/profile/export"
                  className="flex items-center gap-2.5 py-2.5 px-3 rounded-md text-[13px] text-[#36454F] hover:bg-[#C3B091]/12 transition-colors"
                  role="menuitem"
                  onClick={() => setSettingsOpen(false)}
                >
                  <Download size={16} className="text-[#C3B091] shrink-0" />
                  Export data
                </Link>
                <div className="h-px bg-[#C3B091]/20 my-1.5" />
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false);
                    signOut({ callbackUrl: '/' });
                  }}
                  className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-md text-[13px] text-[#D64541] hover:bg-[#D64541]/10 transition-colors text-left"
                  role="menuitem"
                >
                  <LogOut size={16} className="text-[#D64541] shrink-0" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 pt-5 mt-5 border-t border-[#C3B091]/20 flex-wrap">
            <span className="text-xs text-[#8B7355]">
              <strong className="font-semibold text-[#36454F]">{profile?.stats.mapsCount ?? 0}</strong> maps
              <span className="mx-2 opacity-40">·</span>
              <strong className="font-semibold text-[#36454F]">{profile?.stats.placesCount ?? 0}</strong> places
              <span className="mx-2 opacity-40">·</span>
              <strong className="font-semibold text-[#36454F]">{profile?.stats.savedCount ?? 0}</strong> saved
            </span>
            {profile?.coverageSources && profile.coverageSources.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-[#8B7355]">
                {profile.coverageSources.join(' · ')}
              </div>
            )}
          </div>
        </header>

        <main className="px-10 pb-16 max-w-[1200px] mx-auto">
          {/* My Maps Section */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-5 gap-4">
              <div className="flex items-center gap-4">
                <span className="text-[10px] uppercase tracking-[2px] text-[#C3B091] font-medium">My Maps</span>
                {maps.length > 0 && (
                  <div className="flex items-center gap-1 hidden sm:flex">
                    {(['recent', 'az', 'places'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSortBy(opt)}
                        className={`px-3 py-2 rounded-full text-[10px] transition-colors min-h-[44px] ${
                          sortBy === opt
                            ? 'bg-[#FFFDF7] text-[#8B7355] font-medium'
                            : 'text-[#C3B091] hover:text-[#8B7355]'
                        }`}
                      >
                        {opt === 'recent' ? 'Recent' : opt === 'az' ? 'A–Z' : 'Most places'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Link
                href="/maps/new"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#36454F] rounded-lg text-[10px] uppercase tracking-wide font-semibold text-[#F5F0E1] hover:bg-[#8B7355] hover:-translate-y-[1px] transition-all"
              >
                <Plus size={14} />
                New Map
              </Link>
            </div>

            {isLoading ? (
              <div className="bg-[#FFFDF7] rounded-xl border border-dashed border-[#C3B091]/40 p-12 text-center">
                <p className="text-sm text-[#8B7355]">Loading maps...</p>
              </div>
            ) : error ? (
              <div className="bg-[#FFFDF7] rounded-xl border border-dashed border-[#C3B091]/40 p-12 text-center">
                <p className="text-sm text-[#D64541]">{error}</p>
              </div>
            ) : maps.length === 0 ? (
              <div className="bg-[#FFFDF7] rounded-xl border border-dashed border-[#C3B091]/35 p-10 text-center">
                <p className="text-sm text-[#8B7355] mb-5">You haven&apos;t created any maps yet.</p>
                <Link
                  href="/maps/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#36454F] rounded-lg text-[11px] uppercase tracking-wide font-semibold text-[#F5F0E1] hover:bg-[#8B7355] hover:-translate-y-[1px] transition-all"
                >
                  <Plus size={14} />
                  Create your first map
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {sortedMaps.map((map) => (
                  <Link
                    key={map.id}
                    href={map.published ? `/map/${map.slug}` : `/create/${map.id}/preview`}
                    className="bg-[#FFFDF7] rounded-xl overflow-hidden no-underline text-inherit shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col"
                  >
                    <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-[140px] bg-[#C3B091]">
                      {PLACEHOLDER_PHOTOS.map((url, i) => (
                        <div
                          key={i}
                          className="bg-cover bg-center"
                          style={{ backgroundImage: `url(${url})`, filter: 'saturate(0.88) contrast(1.05)' }}
                        />
                      ))}
                    </div>
                    <div className="p-4 flex flex-col gap-1.5 flex-1">
                      <h3 className="font-[var(--font-libre),Georgia,serif] text-[15px] italic text-[#36454F] leading-tight">
                        {map.title}
                      </h3>
                      <div className="text-[10px] uppercase tracking-wide text-[#C3B091]">
                        {map.locationCount} places
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <div className="h-px bg-[#C3B091]/25 my-10" />

          {/* Saved Maps Section */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[10px] uppercase tracking-[2px] text-[#C3B091] font-medium">Saved Maps</span>
            </div>
            <div className="bg-[#FFFDF7] rounded-xl border border-dashed border-[#C3B091]/35 p-10 text-center">
              <p className="text-sm text-[#8B7355]">Maps you save from other curators will appear here.</p>
            </div>
          </section>
        </main>
      </div>
    </DashboardLayout>
  );
}
