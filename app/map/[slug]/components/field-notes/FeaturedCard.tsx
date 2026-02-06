'use client';

import Link from 'next/link';
import type { PlaceCardData } from './PlaceCard';
import { CardMetaRow } from './PlaceCard';

interface FeaturedCardProps {
  place: PlaceCardData;
  theme: 'light' | 'dark';
}

export function FeaturedCard({ place, theme }: FeaturedCardProps) {
  const dark = theme === 'dark';
  const href = `/place/${place.placeSlug ?? place.id}`;
  const photoHeight = 280;

  return (
    <Link
      href={href}
      className="col-span-2 md:col-span-4 lg:col-span-6 block rounded-xl overflow-hidden transition-all duration-300 animate-[fn-fadeUp_0.5s_ease-out_both]"
      style={{
        backgroundColor: dark ? 'rgba(30,47,68,0.96)' : 'var(--fn-white)',
        border: dark ? '1px solid rgba(137,180,196,0.1)' : 'none',
        boxShadow: dark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 4px rgba(139,115,85,0.06)',
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
      {/* Photo section with name overlay — 280px for featured */}
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
