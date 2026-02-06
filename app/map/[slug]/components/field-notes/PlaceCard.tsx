'use client';

import Link from 'next/link';

export interface PlaceCardData {
  id: string;
  placeSlug?: string;
  name: string;
  category: string | null;
  neighborhood: string | null;
  cuisineType?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  photoUrl?: string | null;
  status?: 'open' | 'closed' | null;
  editorial?: {
    type: 'quote' | 'tags';
    quote_text?: string;
    quote_source?: string;
    tags?: string[];
  };
  priceLevel?: number | null;
}

interface PlaceCardProps {
  place: PlaceCardData;
  span: 2 | 3 | 4 | 6;
  theme: 'light' | 'dark';
}

/** Shared meta row: Category · Area · Cuisine · Price · ● Open. Skip nulls, no orphan dots. */
export function CardMetaRow({
  place,
  dark,
  fontSize = 10,
}: {
  place: PlaceCardData;
  dark: boolean;
  fontSize?: number;
}) {
  const parts: React.ReactNode[] = [];
  const add = (label: string, style: 'tag' | 'area') => {
    if (parts.length > 0) {
      parts.push(
        <span
          key={`dot-${parts.length}`}
          style={{
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: dark ? 'rgba(137,180,196,0.3)' : '#C3B091',
            flexShrink: 0,
          }}
        />
      );
    }
    const color = style === 'tag' ? (dark ? '#9CAF88' : '#6B7F59') : (dark ? 'rgba(137,180,196,0.5)' : '#C3B091');
    parts.push(
      <span key={label} style={{ fontSize, textTransform: 'uppercase', letterSpacing: '1.2px', color }}>
        {label}
      </span>
    );
  };

  const cat = place.category || 'Place';
  add(cat, 'tag');
  if (place.neighborhood) add(place.neighborhood, 'area');
  if (place.cuisineType) add(place.cuisineType, 'area');
  if (place.priceLevel != null && place.priceLevel >= 1) {
    if (parts.length > 0) {
      parts.push(
        <span
          key="dot-price"
          style={{
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: dark ? 'rgba(137,180,196,0.3)' : '#C3B091',
            flexShrink: 0,
          }}
        />
      );
    }
    parts.push(
      <span key="price" style={{ fontSize, color: dark ? 'rgba(137,180,196,0.5)' : '#C3B091', letterSpacing: '0.5px' }}>
        ${'$'.repeat(Math.min(4, place.priceLevel))}
      </span>
    );
  }
  if (place.status) {
    if (parts.length > 0) {
      parts.push(
        <span
          key="dot-status"
          style={{
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: dark ? 'rgba(137,180,196,0.3)' : '#C3B091',
            flexShrink: 0,
          }}
        />
      );
    }
    const isOpen = place.status === 'open';
    const dotColor = isOpen ? (dark ? '#6BBF8A' : '#4A7C59') : (dark ? 'rgba(137,180,196,0.3)' : 'rgba(54,69,79,0.4)');
    const textColor = isOpen ? (dark ? '#6BBF8A' : '#4A7C59') : (dark ? 'rgba(137,180,196,0.3)' : 'rgba(54,69,79,0.4)');
    parts.push(
      <span key="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        <span style={{ fontSize: fontSize - 1, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, color: textColor }}>
          {place.status === 'open' ? 'Open' : 'Closed'}
        </span>
      </span>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {parts}
    </div>
  );
}

export function PlaceCard({ place, span, theme }: PlaceCardProps) {
  const dark = theme === 'dark';
  const href = `/place/${place.placeSlug ?? place.id}`;

  const photoHeight = 220;
  const spanClass =
    span === 2
      ? 'col-span-2 md:col-span-2 lg:col-span-2'
      : span === 3
        ? 'col-span-2 md:col-span-2 lg:col-span-3'
        : span === 4
          ? 'col-span-2 md:col-span-4 lg:col-span-4'
          : 'col-span-2 md:col-span-4 lg:col-span-6';

  return (
    <Link
      href={href}
      className={`block rounded-xl overflow-hidden transition-all duration-300 ${spanClass}`}
      style={{
        backgroundColor: dark ? 'rgba(30,47,68,0.96)' : 'var(--fn-white)',
        border: dark ? '1px solid rgba(137,180,196,0.1)' : 'none',
        boxShadow: dark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 4px rgba(139,115,85,0.06)',
        animation: 'fn-fadeUp 0.5s ease-out both',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = dark
          ? '0 8px 24px rgba(0,0,0,0.3)'
          : '0 4px 12px rgba(195,176,145,0.25), 0 12px 32px rgba(139,115,85,0.12)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = dark
          ? '0 2px 8px rgba(0,0,0,0.2)'
          : '0 1px 4px rgba(139,115,85,0.06)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Photo section with name overlay */}
      <div className="relative w-full overflow-hidden" style={{ height: photoHeight }}>
        {place.photoUrl ? (
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `url(${place.photoUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'saturate(0.88) contrast(1.05)',
            }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: dark
                ? 'linear-gradient(135deg, #1B2A3D 0%, #1E2F44 100%)'
                : 'linear-gradient(135deg, #EDE8D8 0%, #E2DCC8 100%)',
              fontFamily: "'Libre Baskerville', Georgia, serif",
              fontSize: '36px',
              fontStyle: 'italic',
              color: dark ? 'rgba(137, 180, 196, 0.35)' : '#C3B091',
              opacity: dark ? 1 : 0.6,
            }}
          >
            {place.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            padding: '40px 18px 14px',
            background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.55))',
          }}
        >
          <h3
            style={{
              fontFamily: "'Libre Baskerville', Georgia, serif",
              fontSize: 18,
              fontStyle: 'italic',
              color: '#FFFDF7',
              lineHeight: 1.25,
              textShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
            }}
          >
            {place.name}
          </h3>
        </div>
      </div>

      {/* Info section — compact meta row + optional creator note */}
      <div style={{ padding: '10px 18px 14px' }}>
        <CardMetaRow place={place} dark={dark} />
        {place.editorial?.type === 'quote' && place.editorial.quote_text && (
          <p
            style={{
              fontFamily: "'Libre Baskerville', Georgia, serif",
              fontSize: 12,
              fontStyle: 'italic',
              lineHeight: 1.55,
              color: dark ? '#F5F0E1' : '#36454F',
              opacity: dark ? 0.5 : 0.6,
              marginTop: 8,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            &quot;{place.editorial.quote_text}&quot;
          </p>
        )}
      </div>
    </Link>
  );
}
