'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Settings, Plus, User, Lock, Download, LogOut } from 'lucide-react';

interface MapItem {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  locationCount: number;
  viewCount?: number;
  createdAt: string;
  updatedAt: string;
  coverPhotos: string[];
}

interface SavedMapItem {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  locationCount: number;
  creatorName: string;
  coverPhotos: string[];
}

interface UserData {
  name: string | null;
  avatarUrl: string | null;
  curatorNote: string | null;
  scopePills: string[];
  coverageSources: string[];
}

interface ProfilePageClientProps {
  user: UserData;
  userMaps: MapItem[];
  savedMaps: SavedMapItem[];
  stats: { mapCount: number; placeCount: number; savedCount: number };
}

type SortOption = 'recent' | 'az' | 'places';

export function ProfilePageClient({
  user,
  userMaps,
  savedMaps,
  stats,
}: ProfilePageClientProps) {
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

  const sortedMaps = [...userMaps].sort((a, b) => {
    if (sortBy === 'recent') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (sortBy === 'az') return a.title.localeCompare(b.title);
    return b.locationCount - a.locationCount;
  });

  const displayName = user.name || 'My Maps';
  const initials = (displayName?.match(/\b\w/g) || ['?']).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-[#F5F0E1]">
      {/* Curator Header */}
      <header className="py-8 px-6 sm:px-10 max-w-[1200px] mx-auto">
        <div className="curator-top-row flex items-start gap-4 sm:gap-5">
          <div
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-[#FFFDF7] text-xl sm:text-2xl font-medium shrink-0 bg-[#C3B091] overflow-hidden"
            aria-hidden
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
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
            <h1 className="font-[var(--font-libre),Georgia,serif] text-[22px] sm:text-[28px] italic text-[#36454F] mb-1.5">
              {displayName}&apos;s Maps
            </h1>
            {user.curatorNote && (
              <p className="text-sm text-[#8B7355] leading-relaxed max-w-[440px] mb-3.5 line-clamp-2">
                {user.curatorNote}
              </p>
            )}
            {user.scopePills.length > 0 && (
              <div className="flex gap-1.5 flex-wrap items-center">
                {user.scopePills.slice(0, 5).map((pill) => (
                  <span
                    key={pill}
                    className="px-3 py-1.5 bg-[#FFFDF7] rounded-full text-[11px] text-[#8B7355] font-medium"
                  >
                    {pill}
                  </span>
                ))}
                {user.scopePills.length > 5 && (
                  <span className="px-3 py-1.5 bg-[#FFFDF7] rounded-full text-[11px] text-[#8B7355] font-medium">
                    +{user.scopePills.length - 5}
                  </span>
                )}
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 pt-5 mt-5 border-t border-[#C3B091]/20 flex-wrap">
          <span className="text-xs text-[#8B7355]">
            <strong className="font-semibold text-[#36454F]">{stats.mapCount}</strong> maps
            <span className="mx-2 opacity-40">·</span>
            <strong className="font-semibold text-[#36454F]">{stats.placeCount}</strong> places
            <span className="mx-2 opacity-40">·</span>
            <strong className="font-semibold text-[#36454F]">{stats.savedCount}</strong> saved
          </span>
          {user.coverageSources.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-[#8B7355]">
              {user.coverageSources.join(' · ')}
            </div>
          )}
        </div>
      </header>

      <main className="px-6 sm:px-10 pb-16 max-w-[1200px] mx-auto">
        {/* My Maps Section */}
        <section className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-4">
              <span className="text-[10px] uppercase tracking-[2px] text-[#C3B091] font-medium">My Maps</span>
              {userMaps.length > 0 && (
                <div className="flex items-center gap-1 hidden sm:flex">
                  {(['recent', 'az', 'places'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSortBy(opt)}
                      className={`px-2.5 py-1 rounded-full text-[10px] transition-colors ${
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
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#36454F] rounded-lg text-[10px] uppercase tracking-wide font-semibold text-[#F5F0E1] hover:bg-[#8B7355] hover:-translate-y-[1px] transition-all w-fit"
            >
              <Plus size={14} />
              New Map
            </Link>
          </div>

          {userMaps.length === 0 ? (
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
                    {(map.coverPhotos.length ? map.coverPhotos : [
                      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=150&fit=crop',
                      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=200&h=150&fit=crop',
                      'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200&h=150&fit=crop',
                      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200&h=150&fit=crop',
                    ]).map((url, i) => (
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
          {savedMaps.length === 0 ? (
            <div className="bg-[#FFFDF7] rounded-xl border border-dashed border-[#C3B091]/35 p-10 text-center">
              <p className="text-sm text-[#8B7355]">Maps you save from other curators will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {savedMaps.map((map) => (
                <Link
                  key={map.id}
                  href={map.published ? `/map/${map.slug}` : '#'}
                  className="bg-[#FFFDF7] rounded-xl overflow-hidden no-underline text-inherit shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col"
                >
                  <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-[140px] bg-[#C3B091]">
                    {(map.coverPhotos.length ? map.coverPhotos : [
                      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=150&fit=crop',
                      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=200&h=150&fit=crop',
                      'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200&h=150&fit=crop',
                      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200&h=150&fit=crop',
                    ]).map((url, i) => (
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
                      {map.locationCount} places · by {map.creatorName}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
