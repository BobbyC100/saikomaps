'use client';

import Link from 'next/link';

export interface MapCardProps {
  id: string;
  title: string;
  slug: string;
  placeCount: number;
  coverPhotos: string[];
  curatorName: string;
  curatorAvatar?: string;
}

const PLACEHOLDER_PHOTOS = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=250&fit=crop',
];

/**
 * MapCard — Reusable map card for homepage, explore, profile
 * 4-up photo mosaic or single hero photo
 */
export function MapCard({
  title,
  slug,
  placeCount,
  coverPhotos,
  curatorName,
}: MapCardProps) {
  const photos = coverPhotos?.length ? coverPhotos : PLACEHOLDER_PHOTOS;
  const initials = (curatorName || '?').charAt(0).toUpperCase();

  return (
    <Link
      href={`/map/${slug}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#FFFDF7',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid rgba(195, 176, 145, 0.15)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 115, 85, 0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: 2,
          height: 160,
        }}
      >
        {photos.slice(0, 4).map((url, i) => (
          <div
            key={i}
            style={{
              backgroundImage: `url(${url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'saturate(0.88) contrast(1.05)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Hidden img for SEO crawlers */}
            <img
              src={url}
              alt={i === 0 ? `${title} map cover` : `${title} photo ${i + 1}`}
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
            />
          </div>
        ))}
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h3
          style={{
            fontFamily: 'var(--font-libre), Georgia, serif',
            fontSize: 15,
            fontStyle: 'italic',
            color: '#36454F',
            lineHeight: 1.3,
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </h3>
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: '#C3B091',
          }}
        >
          {placeCount} {placeCount === 1 ? 'place' : 'places'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#C3B091',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFDF7',
              fontSize: 9,
              fontWeight: 500,
            }}
          >
            {initials}
          </div>
          <span style={{ fontSize: 11, color: '#8B7355' }}>by {curatorName}</span>
        </div>
      </div>
    </Link>
  );
}
