'use client';

import Link from 'next/link';
import type { PlaceCardData } from './PlaceCard';

const POPUP_WIDTH = 310;
const PHOTO_WIDTH = 115;
const POPUP_MIN_HEIGHT = 130;
const POPUP_HEIGHT_ESTIMATE = 195;
const GAP_ABOVE_PIN = 14;

interface BentoCardPopupProps {
  place: PlaceCardData;
  theme: 'light' | 'dark';
  pinPixelX: number;
  pinPixelY: number;
  mapRect: { width: number; height: number };
  mapSlug?: string;
}

function getDirectionsUrl(place: PlaceCardData): string {
  const lat = place.latitude;
  const lng = place.longitude;
  if (lat != null && lng != null) {
    const la = typeof lat === 'string' ? parseFloat(lat) : lat;
    const ln = typeof lng === 'string' ? parseFloat(lng) : lng;
    if (!Number.isNaN(la) && !Number.isNaN(ln)) {
      return `https://www.google.com/maps/dir/?api=1&destination=${la},${ln}`;
    }
  }
  return '#';
}

export function BentoCardPopup({ place, theme, pinPixelX, pinPixelY, mapRect, mapSlug }: BentoCardPopupProps) {
  const dark = theme === 'dark';

  const popupLeft = Math.max(12, Math.min(mapRect.width - POPUP_WIDTH - 12, pinPixelX - POPUP_WIDTH / 2));
  const popupTop = Math.max(12, pinPixelY - POPUP_HEIGHT_ESTIMATE - GAP_ABOVE_PIN);

  const notchLeftRaw = pinPixelX - popupLeft - 7;
  const notchLeft = Math.max(16, Math.min(POPUP_WIDTH - 28, notchLeftRaw));

  const directionsUrl = getDirectionsUrl(place);

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback
    }
  };

  // Debug: Log photo URL

  return (
    <div
      role="dialog"
      aria-label={`${place.name} details`}
      className="absolute pointer-events-auto"
      style={{
        left: popupLeft,
        top: popupTop,
        width: POPUP_WIDTH,
        borderRadius: 12,
        overflow: 'hidden',
        zIndex: 15,
        pointerEvents: 'auto',
        backgroundColor: dark ? 'rgba(30, 47, 68, 0.96)' : '#FFFDF7',
        backdropFilter: dark ? 'blur(16px)' : undefined,
        WebkitBackdropFilter: dark ? 'blur(16px)' : undefined,
        border: dark ? '1px solid rgba(137,180,196,0.1)' : 'none',
        boxShadow: dark
          ? '0 4px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(137,180,196,0.05)'
          : '0 2px 8px rgba(139,115,85,0.08), 0 16px 48px rgba(139,115,85,0.14)',
        animation: 'fn-popupEnter 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        display: 'grid',
        gridTemplateColumns: `${PHOTO_WIDTH}px 1fr`,
        gridTemplateRows: '1fr auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Photo — left column, spans both rows */}
      <div
        style={{
          gridRow: '1 / 3',
          minHeight: POPUP_MIN_HEIGHT,
          backgroundImage: place.photoUrl ? `url(${place.photoUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: dark
            ? 'saturate(0.8) contrast(1.08) brightness(0.9)'
            : 'saturate(0.88) contrast(1.05)',
          display: place.photoUrl ? undefined : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: !place.photoUrl
            ? dark
              ? '#1E2F44'
              : '#EDE8D8'
            : undefined,
        }}
      >
        {!place.photoUrl && (
          <span
            style={{
              fontFamily: "'Libre Baskerville', Georgia, serif",
              fontSize: 28,
              fontStyle: 'italic',
              color: dark ? 'rgba(137,180,196,0.35)' : '#C3B091',
            }}
          >
            {place.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info section — right column, top row */}
      <div style={{ padding: '14px 16px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Place name */}
        <h4
          style={{
            fontFamily: "'Libre Baskerville', Georgia, serif",
            fontSize: 16,
            fontStyle: 'italic',
            color: dark ? '#F5F0E1' : '#36454F',
            lineHeight: 1.25,
            margin: 0,
          }}
        >
          {place.name}
        </h4>

        {/* Meta — category · neighborhood */}
        <div
          style={{
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: dark ? 'rgba(137,180,196,0.5)' : '#C3B091',
            marginTop: 2,
          }}
        >
          {place.category}
          {place.neighborhood && ` · ${place.neighborhood}`}
        </div>

        {/* Status indicator */}
        {place.status && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 4,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor:
                  place.status === 'open'
                    ? dark
                      ? '#6BBF8A'
                      : '#4A7C59'
                    : dark
                      ? 'rgba(137,180,196,0.3)'
                      : '#36454F',
                opacity: place.status === 'closed' ? 0.4 : 1,
              }}
            />
            <span
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600,
                color:
                  place.status === 'open'
                    ? dark
                      ? '#6BBF8A'
                      : '#4A7C59'
                    : dark
                      ? 'rgba(137,180,196,0.3)'
                      : '#36454F',
                opacity: place.status === 'closed' ? 0.4 : 1,
              }}
            >
              {place.status === 'open' ? 'Open' : 'Closed'}
            </span>
          </div>
        )}
      </div>

      {/* Action buttons — right column, below info */}
      <div
        style={{
          padding: '0 16px 10px',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 9,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            backgroundColor: dark ? '#F5F0E1' : '#36454F',
            color: dark ? '#1B2A3D' : '#F5F0E1',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = dark ? '#ebe5d4' : '#2a363e';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = dark ? '#F5F0E1' : '#36454F';
          }}
        >
          Directions
        </a>
        <button
          type="button"
          onClick={handleShare}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 9,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: dark ? 'rgba(137,180,196,0.1)' : 'rgba(195,176,145,0.15)',
            color: dark ? 'rgba(137,180,196,0.6)' : '#8B7355',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = dark ? 'rgba(137,180,196,0.18)' : 'rgba(195,176,145,0.28)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = dark ? 'rgba(137,180,196,0.1)' : 'rgba(195,176,145,0.15)';
          }}
        >
          Share
        </button>
      </div>

      {/* Merchant link footer — spans both columns */}
      <Link
        href={`/place/${place.placeSlug ?? place.id}${mapSlug ? `?from=${mapSlug}` : ''}`}
        style={{
          gridColumn: '1 / -1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '8px 16px',
          backgroundColor: dark ? 'rgba(137,180,196,0.05)' : 'rgba(195,176,145,0.08)',
          borderTop: dark ? '1px solid rgba(137,180,196,0.08)' : '1px solid rgba(195,176,145,0.15)',
          fontFamily: "'Libre Baskerville', Georgia, serif",
          fontSize: 10,
          fontStyle: 'italic',
          color: dark ? 'rgba(137,180,196,0.5)' : '#8B7355',
          textDecoration: 'none',
          transition: 'background-color 0.2s ease, color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = dark ? 'rgba(137,180,196,0.12)' : 'rgba(195,176,145,0.18)';
          e.currentTarget.style.color = dark ? '#89B4C4' : '#8B7355';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = dark ? 'rgba(137,180,196,0.05)' : 'rgba(195,176,145,0.08)';
          e.currentTarget.style.color = dark ? 'rgba(137,180,196,0.5)' : '#8B7355';
        }}
      >
        View full profile
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </Link>

      {/* Notch arrow */}
      <div
        style={{
          position: 'absolute',
          bottom: -7,
          left: notchLeft,
          width: 14,
          height: 14,
          backgroundColor: dark ? 'rgba(137,180,196,0.05)' : 'rgba(195,176,145,0.08)',
          transform: 'rotate(45deg)',
          boxShadow: dark ? '3px 3px 6px rgba(0,0,0,0.15)' : '3px 3px 6px rgba(139,115,85,0.06)',
        }}
      />
    </div>
  );
}
