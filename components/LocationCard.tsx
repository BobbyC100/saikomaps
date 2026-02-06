import Link from 'next/link';
import { Instagram, Pencil, X } from 'lucide-react';
import { CATEGORY_LABELS, type SaikoCategory } from '@/lib/categoryMapping';

/** Mini gallery: main photo + small stack (thumb + +N badge). */
function LocationCardGallery({
  name,
  imageUrl,
  photoGallery,
}: {
  name: string;
  imageUrl?: string | null;
  photoGallery?: { mainUrl: string | null; thumbUrls: string[]; totalCount: number };
}) {
  const gallery = photoGallery && (photoGallery.mainUrl || photoGallery.thumbUrls.length > 0);
  const hasPhotos = gallery || imageUrl;

  if (!hasPhotos) {
    return (
      <div
        className="w-full flex-1 h-[160px] flex items-center justify-center text-white text-2xl font-medium rounded-lg min-w-0 overflow-hidden"
        style={{ backgroundColor: '#E07A5F', borderRadius: '8px' }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  if (!gallery && imageUrl) {
    return (
      <div className="w-full flex-1 h-[160px] min-w-0 overflow-hidden rounded-lg">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
          style={{ borderRadius: '8px' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  const { mainUrl, thumbUrls, totalCount } = photoGallery!;
  const thumb1 = thumbUrls[0];
  const moreCount = totalCount - 1 - thumbUrls.length;
  const showMoreBadge = moreCount > 0;

  if (!thumb1) {
    return (
      <div className="w-full flex-1 h-[160px] min-w-0 overflow-hidden rounded-lg">
        <img
          src={mainUrl || imageUrl || ''}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
    );
  }

  return (
    <div
      className="w-full flex-1 h-[160px] min-w-0 grid gap-1.5 overflow-hidden rounded-lg"
      style={{ gridTemplateColumns: '1.5fr 1fr' }}
    >
      <div className="relative min-h-0 overflow-hidden rounded-l-lg">
        <img
          src={mainUrl || imageUrl || ''}
          alt={name}
          className="w-full h-full object-cover"
          style={{ minHeight: 0 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
      <div className="relative min-h-0 flex flex-col gap-1.5">
        <img
          src={thumb1}
          alt=""
          className="flex-1 min-h-0 w-full object-cover rounded-tr-lg"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {showMoreBadge && (
          <div
            className="absolute bottom-1.5 right-1.5 left-1.5 flex items-center justify-center bg-black/50 py-1 rounded"
          >
            <span className="text-white text-xs font-medium">+{moreCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function getCategoryLabel(category: string | null | undefined): string {
  if (!category?.trim()) return '';
  const lower = category.toLowerCase().trim();
  const key = lower as SaikoCategory;
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
  return category.trim().charAt(0).toUpperCase() + category.trim().slice(1).toLowerCase();
}

interface LocationCardProps {
  location: {
    id: string;
    placeSlug?: string;
    name: string;
    address?: string | null;
    category?: string | null;
    instagram?: string | null;
    hours?: Record<string, string> | null;
    imageUrl?: string | null;
    photoGallery?: { mainUrl: string | null; thumbUrls: string[]; totalCount: number };
    latitude?: number | string | null;
    longitude?: number | string | null;
  };
  index?: number;
  isOwner?: boolean;
  isActive?: boolean;
  onEdit?: (location: LocationCardProps['location']) => void;
  onDelete?: (locationId: string) => void;
  cardRef?: (el: HTMLAnchorElement | null) => void;
}

export function LocationCard({ location, isOwner, onEdit, onDelete, cardRef }: LocationCardProps) {
  const getTodayHours = (hours: unknown): { isOpen: boolean | null } => {
    if (!hours || (typeof hours === 'object' && Object.keys(hours as object).length === 0)) {
      return { isOpen: null };
    }
    const hoursObj = typeof hours === 'string' ? (() => { try { return JSON.parse(hours); } catch { return null; } })() : hours as Record<string, unknown>;
    if (!hoursObj) return { isOpen: null };

    if (typeof hoursObj.openNow === 'boolean') return { isOpen: hoursObj.openNow };
    if (typeof (hoursObj as { open_now?: boolean }).open_now === 'boolean') {
      return { isOpen: (hoursObj as { open_now: boolean }).open_now };
    }

    const today = new Date().getDay();
    const dayIndex = today === 0 ? 6 : today - 1;

    if (hoursObj?.periods && Array.isArray(hoursObj.periods)) {
      const period = (hoursObj.periods as Array<{ open?: { day?: number }; close?: { time?: string } }>).find((p) => p.open?.day === dayIndex);
      if (!period) return { isOpen: null };
      if (period.open == null) return { isOpen: false };
      const close = period.close?.time;
      if (!close) return { isOpen: true };
      const now = new Date();
      const currMins = now.getHours() * 60 + now.getMinutes();
      const closeH = parseInt(close.slice(0, 2), 10);
      const closeM = parseInt(close.slice(2, 4), 10);
      const closeMins = closeH * 60 + closeM;
      return { isOpen: currMins < closeMins };
    }

    const weekdayText = (hoursObj?.weekdayText ?? (hoursObj as { weekday_text?: string[] }).weekday_text) as string[] | undefined;
    if (weekdayText && Array.isArray(weekdayText)) {
      const todayStr = weekdayText[dayIndex];
      if (!todayStr) return { isOpen: null };
      const isClosed = todayStr.toLowerCase().includes('closed');
      return { isOpen: isClosed ? false : true };
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const todayKey = days[dayIndex];
    const todayHours = (hoursObj as Record<string, string>)[todayKey];
    if (!todayHours) return { isOpen: null };
    return { isOpen: todayHours.toLowerCase().includes('closed') ? false : true };
  };

  const { isOpen } = getTodayHours(location.hours);

  const normalizeInstagram = (handle: string | null | undefined): string | null => {
    if (!handle) return null;
    let normalized = handle.trim();
    normalized = normalized.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
    normalized = normalized.replace(/^@/, '');
    return normalized || null;
  };

  const instagramHandle = normalizeInstagram(location.instagram);
  const categoryLabel = getCategoryLabel(location.category);

  return (
    <div className="relative">
      {isOwner && (onEdit || onDelete) && (
        <div
          className="absolute top-2 right-2 flex gap-1.5 z-30"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onEdit(location);
              }}
              className="p-1.5 rounded hover:opacity-80 transition-opacity"
              style={{ color: '#B0A99F', backgroundColor: 'transparent' }}
              title="Edit location"
              aria-label="Edit location"
            >
              <Pencil size={16} strokeWidth={2} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (confirm(`Delete "${location.name}"?`)) {
                  onDelete(location.id);
                }
              }}
              className="p-1.5 rounded hover:opacity-80 transition-opacity"
              style={{ color: '#B0A99F', backgroundColor: 'transparent' }}
              title="Delete location"
              aria-label="Delete location"
            >
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      )}

      <Link
        href={`/place/${location.placeSlug ?? location.id}`}
        ref={cardRef}
        className="block border rounded-lg p-0 overflow-hidden hover:border-[#E07A5F]/50 transition-all bg-white"
        style={{
          border: '1px solid #E5E5E5',
        }}
      >
        <div className="relative">
          <LocationCardGallery
            name={location.name}
            imageUrl={location.imageUrl}
            photoGallery={location.photoGallery}
          />
        </div>

        <div className="p-4">
          <h3
            className="font-semibold text-[#1A1A1A]"
            style={{ fontSize: '20px', fontWeight: 600 }}
          >
            {location.name}
          </h3>

          <div
            className="mt-1 flex flex-wrap items-center gap-1"
            style={{ fontSize: '13px', color: '#8A8580' }}
          >
            {categoryLabel && <span>{categoryLabel}</span>}
            {categoryLabel && isOpen !== null && <span style={{ color: '#C4BFB9' }}>·</span>}
            {isOpen !== null && (
              <span
                style={{
                  color: isOpen ? '#4A9B6E' : '#B85450',
                  fontWeight: 500,
                }}
              >
                {isOpen ? 'Open' : 'Closed'}
              </span>
            )}
          </div>

          {instagramHandle && (
            <a
              href={`https://instagram.com/${instagramHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-[13px] hover:opacity-80"
              style={{ color: '#8A8580' }}
              onClick={(e) => e.stopPropagation()}
            >
              <Instagram size={14} />
              @{instagramHandle}
            </a>
          )}
        </div>
      </Link>
    </div>
  );
}
