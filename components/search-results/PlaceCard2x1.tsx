'use client';

import Link from 'next/link';
import { PlaceCardData, Signal, getPersonalityLabel, computeInternalBadges } from './types';

interface PlaceCard2x1Props {
  place: PlaceCardData;
}

export function PlaceCard2x1({ place }: PlaceCard2x1Props) {
  const {
    slug,
    name,
    neighborhood,
    category,
    photoUrl,
    price,
    cuisine,
    isOpen,
    closesAt,
    opensAt,
    signals = [],
    coverageQuote,
    vibeTags = [],
    distanceMiles,
    placePersonality,
  } = place;
  
  const personalityLabel = getPersonalityLabel(placePersonality);
  
  // Compute internal badges (Badge Ship v1)
  const internalBadges = computeInternalBadges(place);
  
  // Merge: external badges first, then internal
  const allBadges = [...signals, ...internalBadges];

  const placeholderGradient = 'linear-gradient(135deg, #E8E2D4, #D4CFC0)';

  return (
    <Link
      href={`/place/${slug}`}
      className="card-place-2x1"
      style={{
        gridColumn: 'span 2',
        gridRow: 'span 1',
        background: '#FFFDF7',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'row',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Photo (40% width) */}
      <div
        style={{
          width: '40%',
          backgroundImage: photoUrl ? `url(${photoUrl})` : placeholderGradient,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {/* Signal badges */}
        {allBadges.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              maxWidth: 'calc(100% - 20px)',
            }}
          >
            {allBadges.map((signal, idx) => (
              <span
                key={idx}
                style={{
                  padding: '4px 8px',
                  borderRadius: 5,
                  background: 'rgba(0, 0, 0, 0.62)',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
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

      {/* Info (60% width) */}
      <div
        style={{
          flex: 1,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          minWidth: 0,
        }}
      >
        {/* Name */}
        <h3
          style={{
            fontFamily: '"Libre Baskerville", Georgia, serif',
            fontSize: 14,
            fontStyle: 'italic',
            color: '#36454F',
            lineHeight: 1.2,
            margin: 0,
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
          }}
        >
          {category}
          {neighborhood && ` · ${neighborhood}`}
          {cuisine && ` · ${cuisine}`}
          {price && ` · ${price}`}
          {personalityLabel && ` · ${personalityLabel}`}
        </div>

        {/* Coverage quote */}
        {coverageQuote && (
          <div
            style={{
              fontFamily: '"Libre Baskerville", Georgia, serif',
              fontSize: 11,
              fontStyle: 'italic',
              color: '#36454F',
              opacity: 0.65,
              lineHeight: 1.4,
              borderLeft: '2px solid #C3B091',
              paddingLeft: 8,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {coverageQuote}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 8,
            borderTop: '1px solid rgba(195, 176, 145, 0.18)',
            gap: 8,
          }}
        >
          {/* Status */}
          {isOpen !== undefined && (
            <div
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: isOpen ? '#4A7C59' : '#36454F',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
                opacity: isOpen ? 1 : 0.5,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: isOpen ? '#4A7C59' : '#36454F',
                  flexShrink: 0,
                }}
              />
              {isOpen ? 'Open' : 'Closed'}
            </div>
          )}

          {/* Distance */}
          {distanceMiles !== undefined && (
            <span
              style={{
                fontSize: 10,
                color: '#C3B091',
                whiteSpace: 'nowrap',
                letterSpacing: '0.5px',
              }}
            >
              {distanceMiles.toFixed(1)} mi
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
