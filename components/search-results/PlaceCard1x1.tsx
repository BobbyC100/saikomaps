'use client';

import Link from 'next/link';
import { PlaceCardData } from './types';

interface PlaceCard1x1Props {
  place: PlaceCardData;
}

export function PlaceCard1x1({ place }: PlaceCard1x1Props) {
  const {
    slug,
    name,
    neighborhood,
    category,
    photoUrl,
    price,
    signals = [],
  } = place;

  const placeholderGradient = 'linear-gradient(135deg, #E8E2D4, #D4CFC0)';

  return (
    <Link
      href={`/place/${slug}`}
      className="card-place-1x1"
      style={{
        gridColumn: 'span 1',
        gridRow: 'span 1',
        background: '#FFFDF7',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Photo (60% height) */}
      <div
        style={{
          height: '60%',
          backgroundImage: photoUrl ? `url(${photoUrl})` : placeholderGradient,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        {/* Signal badges */}
        {signals.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              display: 'flex',
              gap: 4,
              flexWrap: 'wrap',
              maxWidth: 'calc(100% - 16px)',
            }}
          >
            {signals.slice(0, 1).map((signal, idx) => (
              <span
                key={idx}
                style={{
                  padding: '3px 6px',
                  borderRadius: 4,
                  background: 'rgba(0, 0, 0, 0.62)',
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#fff',
                  fontWeight: 650,
                  whiteSpace: 'nowrap',
                }}
              >
                {signal.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Info (40% height) */}
      <div
        style={{
          flex: 1,
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {/* Name */}
        <h3
          style={{
            fontFamily: '"Libre Baskerville", Georgia, serif',
            fontSize: 12,
            fontStyle: 'italic',
            color: '#36454F',
            lineHeight: 1.2,
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </h3>

        {/* Meta row */}
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: '#C3B091',
            opacity: 0.85,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {category}
          {price && ` · ${price}`}
        </div>
      </div>
    </Link>
  );
}
