'use client';

import Link from 'next/link';
import { SpotlightCardData } from './spotlightTypes';

interface SpotlightCard2x2Props {
  spotlight: SpotlightCardData;
}

export function SpotlightCard2x2({ spotlight }: SpotlightCard2x2Props) {
  const { href, label, headline, subhead, photoUrl } = spotlight;

  return (
    <Link
      href={href}
      className="card-spotlight-2x2"
      style={{
        gridColumn: 'span 2',
        gridRow: 'span 2',
        background: '#2C1810',
        border: '3px solid #8B7355',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Photo (50% height) */}
      {photoUrl && (
        <div
          style={{
            height: '50%',
            backgroundImage: `url(${photoUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Content (50% height) */}
      <div
        style={{
          flex: 1,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        {/* Label */}
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: '#CC5500',
            opacity: 0.85,
          }}
        >
          {label}
        </div>

        {/* Headline */}
        <h3
          style={{
            fontFamily: '"Libre Baskerville", Georgia, serif',
            fontSize: 20,
            fontStyle: 'italic',
            color: '#F5E6D3',
            textShadow: '0 1px 0 rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)',
            margin: 0,
          }}
        >
          {headline}
        </h3>

        {/* Subhead */}
        {subhead && (
          <p
            style={{
              fontSize: 11,
              color: 'rgba(245, 230, 211, 0.55)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {subhead}
          </p>
        )}
      </div>
    </Link>
  );
}
