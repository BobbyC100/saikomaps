'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Bookmark, Share2, MapPin } from 'lucide-react';

interface UtilitiesCellProps {
  slug: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function UtilitiesCell({
  slug,
  name,
  address,
  latitude,
  longitude,
}: UtilitiesCellProps) {
  const { data: session, status } = useSession();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAuthenticated = status === 'authenticated' && !!session?.user;

  useEffect(() => {
    if (!isAuthenticated || !slug) return;
    fetch(`/api/user/saved-places?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json?.saved !== undefined) setSaved(json.saved);
      })
      .catch(() => {});
  }, [isAuthenticated, slug]);

  const handleSave = async () => {
    if (!isAuthenticated || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/user/saved-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (res.ok && json?.saved !== undefined) {
        setSaved(json.saved);
      }
    } catch {
      // fail silently
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: name || 'Saiko Maps',
          text: `Check out ${name}`,
          url: typeof window !== 'undefined' ? window.location.href : '',
        });
      } catch (err: unknown) {
        if ((err as { name?: string })?.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      navigator.clipboard?.writeText(
        typeof window !== 'undefined' ? window.location.href : ''
      );
      alert('Link copied to clipboard!');
    }
  };

  const directionsUrl =
    latitude != null && longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      : address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
        : null;

  return (
    <div className="flex flex-wrap gap-3">
      {isAuthenticated && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 border border-[#C3B091] text-[#36454F] rounded hover:bg-[#C3B091]/10 transition-colors disabled:opacity-60"
          aria-label={saved ? 'Remove from saved' : 'Save place'}
        >
          <Bookmark
            size={18}
            fill={saved ? '#C3B091' : 'transparent'}
            stroke={saved ? '#C3B091' : 'currentColor'}
          />
          <span>{saved ? 'Saved' : 'Save place'}</span>
        </button>
      )}
      <button
        type="button"
        onClick={handleShare}
        className="flex items-center gap-2 px-4 py-2 border border-[#36454F]/30 text-[#36454F] rounded hover:bg-[#36454F]/5 transition-colors"
        aria-label="Share"
      >
        <Share2 size={18} />
        <span>Share</span>
      </button>
      {directionsUrl && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 border border-[#36454F]/30 text-[#36454F] rounded hover:bg-[#36454F]/5 transition-colors"
        >
          <MapPin size={18} />
          <span>Get directions</span>
        </a>
      )}
    </div>
  );
}
