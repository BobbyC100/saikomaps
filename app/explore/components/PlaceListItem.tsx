'use client'

import React from 'react'
import Link from 'next/link'
import { PlaceCardData } from '../types'

interface PlaceListItemProps {
  place: PlaceCardData
}

/**
 * PlaceListItem — For search results "Places matching {query}" section
 * Meta format: {neighborhood} · On {mapCount} maps
 */
export function PlaceListItem({ place }: PlaceListItemProps) {
  return (
    <Link
      href={`/place/${place.slug}`}
      style={{
        background: '#FFFDF7',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 253, 247, 0.8)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#FFFDF7'
      }}
    >
      {/* Thumbnail */}
      {place.thumbnailUrl && (
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '6px',
            backgroundImage: `url(${place.thumbnailUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'saturate(0.88) contrast(1.05)',
            flexShrink: 0,
          }}
        />
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-libre)',
            fontSize: '13px',
            fontStyle: 'italic',
            color: '#36454F',
            marginBottom: '2px',
          }}
        >
          {place.name}
        </div>
        {place.tagline && (
          <div
            style={{
              fontSize: '11px',
              color: '#8B7355',
              marginBottom: '3px',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {place.tagline}
          </div>
        )}
        <div
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: '#C3B091',
            fontFamily: 'var(--font-dm-sans)',
          }}
        >
          {place.neighborhood} · On {place.mapCount} {place.mapCount === 1 ? 'map' : 'maps'}
        </div>
      </div>
    </Link>
  )
}
