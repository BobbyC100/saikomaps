'use client';

import { useState, useMemo } from 'react';
import {
  CoverBlock,
  formatAreaVitals,
  SectionDivider,
  PlaceCard,
  FeaturedCard,
  MapToggle,
  FieldNotesNavBar,
  PageFooter,
  ExpandedMapView,
} from './index';
import { buildCoverPins, type CoverPin } from '../../lib/field-notes-utils';
import type { PlaceCardData } from './PlaceCard';
import { getPhotoRefFromStored, getGooglePhotoUrl } from '@/lib/google-places';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

function getPlacePhotoUrl(
  userPhotos: string[],
  googlePhotos: unknown,
  maxWidth: number = 400
): string | null {
  if (userPhotos?.length) return userPhotos[0];
  if (googlePhotos && Array.isArray(googlePhotos) && googlePhotos.length) {
    const ref = getPhotoRefFromStored(
      googlePhotos[0] as { photo_reference?: string; photoReference?: string; name?: string }
    );
    if (ref && GOOGLE_MAPS_API_KEY) {
      try {
        return getGooglePhotoUrl(ref, maxWidth);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function getTodayHours(hours: unknown): 'open' | 'closed' | null {
  if (!hours || (typeof hours === 'object' && Object.keys(hours as object).length === 0)) {
    return null;
  }
  const h = typeof hours === 'string' ? (() => { try { return JSON.parse(hours); } catch { return null; } })() : hours as Record<string, unknown>;
  if (!h) return null;
  if (typeof h.openNow === 'boolean') return h.openNow ? 'open' : 'closed';
  if (typeof (h as { open_now?: boolean }).open_now === 'boolean') {
    return (h as { open_now: boolean }).open_now ? 'open' : 'closed';
  }
  const today = new Date().getDay();
  const dayIndex = today === 0 ? 6 : today - 1;
  if (h?.periods && Array.isArray(h.periods)) {
    const period = (h.periods as Array<{ open?: { day?: number }; close?: { time?: string } }>).find(
      (p) => p.open?.day === dayIndex
    );
    if (!period) return null;
    if (period.open == null) return 'closed';
    const close = period.close?.time;
    if (!close) return 'open';
    const now = new Date();
    const currMins = now.getHours() * 60 + now.getMinutes();
    const [closeH, closeM] = [parseInt(close.slice(0, 2), 10), parseInt(close.slice(2, 4), 10)];
    const closeMins = closeH * 60 + closeM;
    return currMins < closeMins ? 'open' : 'closed';
  }
  const weekdayText = (h?.weekdayText ?? (h as { weekday_text?: string[] }).weekday_text) as string[] | undefined;
  if (weekdayText && Array.isArray(weekdayText)) {
    const todayStr = weekdayText[dayIndex];
    if (!todayStr) return null;
    return todayStr.toLowerCase().includes('closed') ? 'closed' : 'open';
  }
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const todayKey = days[dayIndex];
  const todayHours = (h as Record<string, string>)[todayKey];
  if (!todayHours) return null;
  return todayHours.toLowerCase().includes('closed') ? 'closed' : 'open';
}

/** Bento grid pattern: Row A 3+3, Row B 4+2, Row C 2+4, Row D 3+3, repeat */
const SPAN_PATTERNS: [number, number][] = [
  [3, 3], // Row A
  [4, 2], // Row B
  [2, 4], // Row C
  [3, 3], // Row D
];

export interface FieldNotesMapViewProps {
  title: string;
  description?: string | null;
  category: string;
  vibe?: string | null;
  theme: 'light' | 'dark';
  authorName: string;
  authorAvatar?: string | null;
  locations: Array<{
    id: string;
    placeSlug?: string;
    name: string;
    category: string | null;
    neighborhood?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
    userPhotos: string[];
    googlePhotos: unknown;
    hours: unknown;
    orderIndex: number;
    descriptor?: string | null;
    priceLevel?: number | null;
    cuisineType?: string | null;
  }>;
}

export function FieldNotesMapView({
  title,
  description,
  category,
  vibe,
  theme,
  authorName,
  authorAvatar,
  locations,
}: FieldNotesMapViewProps) {
  const [view, setView] = useState<'list' | 'map'>('list');

  const themeClass = theme === 'dark' ? 'dark' : '';

  const places: PlaceCardData[] = useMemo(() => {
    return locations.map((loc) => ({
      id: loc.id,
      placeSlug: loc.placeSlug,
      name: loc.name,
      category: loc.category,
      neighborhood: loc.neighborhood ?? null,
      latitude: loc.latitude,
      longitude: loc.longitude,
      photoUrl: getPlacePhotoUrl(loc.userPhotos, loc.googlePhotos, 600),
      status: getTodayHours(loc.hours) as 'open' | 'closed' | null,
      editorial: loc.descriptor
        ? { type: 'quote' as const, quote_text: loc.descriptor, quote_source: undefined }
        : undefined,
      priceLevel: loc.priceLevel ?? null,
      cuisineType: loc.cuisineType ?? null,
    }));
  }, [locations]);

  const coverPins: CoverPin[] = useMemo(
    () =>
      buildCoverPins(
        locations.map((l) => ({
          id: l.id,
          name: l.name,
          latitude: l.latitude,
          longitude: l.longitude,
          orderIndex: l.orderIndex,
        }))
      ),
    [locations]
  );

  const neighborhoods = useMemo(() => {
    const counts: Record<string, number> = {};
    locations.forEach((l) => {
      const n = l.neighborhood?.trim();
      if (n) counts[n] = (counts[n] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name]) => name);
  }, [locations]);

  const areaVitals = formatAreaVitals(neighborhoods);
  const topCategory = locations
    .map((l) => l.category)
    .filter(Boolean)
    .reduce((acc: Record<string, number>, c) => {
      acc[c as string] = (acc[c as string] || 0) + 1;
      return acc;
    }, {});
  const categoryLabel = Object.entries(topCategory).sort(([, a], [, b]) => b - a)[0]?.[0] || category;
  const categoryTag = neighborhoods.length > 0 ? `${categoryLabel} · ${neighborhoods[0]}` : categoryLabel;

  if (view === 'map') {
    return (
      <ExpandedMapView
        title={title}
        places={places}
        theme={theme}
        onBack={() => setView('list')}
      />
    );
  }

  const remainingPlaces = places.slice(1);

  return (
    <div
      className={`field-notes min-h-screen ${themeClass}`}
      style={{
        backgroundColor: theme === 'dark' ? 'var(--fn-navy)' : 'var(--fn-parchment)',
      }}
    >
      <FieldNotesNavBar theme={theme} />

      <div
        className="max-w-[820px] mx-auto px-5 pt-[76px] pb-[100px] grid gap-[14px] grid-cols-2 md:grid-cols-4 lg:grid-cols-6"
      >
        <CoverBlock
          theme={theme}
          category={categoryTag}
          title={title}
          description={description}
          authorName={authorName}
          authorAvatar={authorAvatar}
          areaVitals={areaVitals || undefined}
          vibeVitals={vibe || undefined}
          coverPins={coverPins}
          onCoverMapClick={() => setView('map')}
        />

        <SectionDivider label={`${places.length} Place${places.length !== 1 ? 's' : ''}`} />

        {places[0] && <FeaturedCard place={places[0]} theme={theme} />}

        {remainingPlaces.map((place, i) => {
          const isLastAndOdd =
            remainingPlaces.length % 2 === 1 && i === remainingPlaces.length - 1;
          const span = isLastAndOdd
            ? 6
            : (() => {
                const pairIndex = Math.floor(i / 2);
                const [spanA, spanB] = SPAN_PATTERNS[pairIndex % SPAN_PATTERNS.length];
                return i % 2 === 0 ? spanA : spanB;
              })();
          return (
            <PlaceCard
              key={place.id}
              place={place}
              span={span as 2 | 3 | 4 | 6}
              theme={theme}
            />
          );
        })}

        <PageFooter />
      </div>

      <MapToggle view="list" onClick={() => setView('map')} />
    </div>
  );
}
