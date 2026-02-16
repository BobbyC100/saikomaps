'use client';

import Link from 'next/link';
import React from 'react';
import { PlaceCardData, Signal, SignalType, computeInternalBadges } from './types';

interface HorizontalBentoCardProps {
  place: PlaceCardData;
}

export function HorizontalBentoCard({ place }: HorizontalBentoCardProps) {
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
    coverageSource,
    vibeTags = [],
    distanceMiles,
  } = place;
  
  // Compute internal badges (Badge Ship v1)
  const internalBadges = computeInternalBadges(place);
  
  // Merge: external badges first, then internal
  const allBadges = [...signals, ...internalBadges];

  // Gradient placeholder for missing photos
  const placeholderGradient = 'linear-gradient(135deg, #E8E2D4, #D4CFC0)';

  return (
    <Link
      href={`/place/${slug}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '35% 1fr',
        background: '#FFFDF7',
        borderRadius: 12,
        overflow: 'hidden',
        minHeight: 180,
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'inherit',
        boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)',
        transition: 'all 0.25s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 115, 85, 0.12)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.08)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Photo Area (Left 35%) */}
      <div
        style={{
          backgroundImage: photoUrl ? `url(${photoUrl})` : placeholderGradient,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: photoUrl ? 'saturate(0.88) contrast(1.05)' : 'none',
          minHeight: 180,
          position: 'relative',
        }}
      >
        {/* Signal Badges */}
        {allBadges.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              display: 'flex',
              gap: 4,
              flexWrap: 'wrap',
            }}
          >
            {allBadges.map((signal, idx) => (
              <div
                key={idx}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(8px)',
                  fontSize: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                {signal.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Area (Right 65%) */}
      <div
        style={{
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Card Name */}
        <h3
          style={{
            fontFamily: '"Libre Baskerville", Georgia, serif',
            fontSize: 17,
            fontStyle: 'italic',
            color: '#36454F',
            lineHeight: 1.25,
            margin: 0,
          }}
        >
          {name}
        </h3>

        {/* Meta Row: Category · Neighborhood · Cuisine · Price */}
        <div
          style={{
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: '#C3B091',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          <span>{category}</span>
          {neighborhood && (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{neighborhood}</span>
            </>
          )}
          {cuisine && (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{cuisine}</span>
            </>
          )}
          {price && (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{price}</span>
            </>
          )}
        </div>

        {/* Coverage Quote */}
        {coverageQuote && (
          <>
            <div
              style={{
                fontFamily: '"Libre Baskerville", Georgia, serif',
                fontSize: 12,
                fontStyle: 'italic',
                color: '#36454F',
                opacity: 0.7,
                lineHeight: 1.5,
                borderLeft: '2px solid #C3B091',
                paddingLeft: 10,
                margin: '4px 0',
              }}
            >
              {coverageQuote}
            </div>
            {coverageSource && (
              <div
                style={{
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: '#8B7355',
                  marginTop: -4,
                }}
              >
                — {coverageSource}
              </div>
            )}
          </>
        )}

        {/* Vibe Tags */}
        {vibeTags.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            {vibeTags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(195, 176, 145, 0.18)',
                  fontSize: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#8B7355',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer: Status | Distance */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(195, 176, 145, 0.15)',
            paddingTop: 8,
            marginTop: 'auto',
          }}
        >
          {/* Status Indicator */}
          {isOpen !== undefined && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: isOpen ? '#4A7C59' : '#36454F',
                fontWeight: 600,
                opacity: isOpen ? 1 : 0.4,
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
              {isOpen ? (
                <>
                  Open
                  {closesAt && <span style={{ fontWeight: 400 }}> · Closes {closesAt}</span>}
                </>
              ) : (
                <>
                  Closed
                  {opensAt && <span style={{ fontWeight: 400 }}> · Opens {opensAt}</span>}
                </>
              )}
            </div>
          )}

          {/* Distance */}
          {distanceMiles !== undefined && (
            <span
              style={{
                fontSize: 9,
                color: '#C3B091',
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
