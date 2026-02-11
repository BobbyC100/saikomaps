'use client'

import React from 'react'
import Link from 'next/link'
import { MapCardData } from '../types'

interface MapListItemProps {
  map: MapCardData
}

/**
 * MapListItem — List view variant (2-col grid on desktop)
 * Used in "By Neighborhood" section and list view mode
 */
export function MapListItem({ map }: MapListItemProps) {
  return (
    <Link
      href={`/map/${map.slug}`}
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
      {map.coverImageUrl && (
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '6px',
            backgroundImage: `url(${map.coverImageUrl})`,
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
          {map.title}
        </div>
        {map.tagline && (
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
            {map.tagline}
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
          {map.placeCount} {map.placeCount === 1 ? 'place' : 'places'} · {map.creatorName}
        </div>
      </div>

      {/* Badge (right side) */}
      {map.isCuratorPick && (
        <span
          style={{
            fontSize: '8px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            padding: '3px 8px',
            borderRadius: '4px',
            background: '#36454F',
            color: '#F5F0E1',
            flexShrink: 0,
            fontFamily: 'var(--font-dm-sans)',
            fontWeight: 600,
          }}
        >
          Curator Pick
        </span>
      )}
    </Link>
  )
}
