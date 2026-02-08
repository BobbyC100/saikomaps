'use client';

import Link from 'next/link';
import { SpotlightCardData } from './spotlightTypes';

interface SpotlightCard1x2Props {
  spotlight: SpotlightCardData;
}

export function SpotlightCard1x2({ spotlight }: SpotlightCard1x2Props) {
  const { href, label, headline, subhead, photoUrl } = spotlight;

  return (
    <Link
      href={href}
      className="card-spotlight-1x2"
      style={{
        gridColumn: 'span 1',
        gridRow: 'span 2',
        background: '#1E3A4C',
        border: '3px solid #1E3A4C',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Photo (45% height) */}
      {photoUrl && (
        <div
          style={{
            height: '45%',
            backgroundImage: `url(${photoUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Content (55% height) */}
      <div
        style={{
          flex: 1,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {/* Label */}
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: '#89B4C4',
            opacity: 0.7,
          }}
        >
          {label}
        </div>

        {/* Headline */}
        <h3
          style={{
            fontFamily: '"Libre Baskerville", Georgia, serif',
            fontSize: 15,
            fontStyle: 'italic',
            color: '#F5F0E1',
            textShadow: '0 1px 0 rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {headline}
        </h3>

        {/* Subhead */}
        {subhead && (
          <p
            style={{
              fontSize: 10,
              color: 'rgba(245, 240, 225, 0.5)',
              lineHeight: 1.4,
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
