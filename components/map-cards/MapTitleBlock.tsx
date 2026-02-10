'use client'

import React from 'react'
import Link from 'next/link'
import { MapCardData } from './types'

interface MapTitleBlockProps {
  map: MapCardData
  compact?: boolean
}

/**
 * MapTitleBlock — Standalone (No Image)
 * - Grid span: Flexible (single column)
 * - Layout: Text only, no image
 * - Use: Sidebars, "Featured on X maps" links, fallback when no image
 */
export function MapTitleBlock({ map, compact = false }: MapTitleBlockProps) {
  return (
    <Link
      href={`/map/${map.slug}`}
      className="map-title-block"
      style={{
        background: '#FFFDF7',
        borderRadius: '6px',
        padding: compact ? '14px 16px' : '20px',
        border: '2px solid #C3B091',
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '4px' : '8px',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(139, 115, 85, 0.12)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Type label */}
      <div
        style={{
          fontSize: '9px',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: '#8B7355',
          fontWeight: 600,
          fontFamily: 'var(--font-dm-sans)',
        }}
      >
        Map · {map.placeCount} {map.placeCount === 1 ? 'place' : 'places'}
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily: 'var(--font-libre)',
          fontStyle: 'italic',
          fontSize: compact ? '15px' : '18px',
          color: '#36454F',
          lineHeight: 1.3,
          margin: 0,
        }}
      >
        {map.title}
      </h3>

      {/* Description */}
      {map.description && (
        <p
          style={{
            fontSize: compact ? '11px' : '12px',
            color: '#8B7355',
            lineHeight: 1.5,
            margin: 0,
            ...(compact && {
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }),
          }}
        >
          {map.description}
        </p>
      )}

      {/* Meta row */}
      <div
        style={{
          fontSize: '9px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: '#C3B091',
          display: 'flex',
          gap: '8px',
          marginTop: '4px',
          fontFamily: 'var(--font-dm-sans)',
          flexWrap: 'wrap',
        }}
      >
        {map.authorType === 'saiko' ? (
          <span
            className="curator-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: '3px 8px',
              background: 'rgba(195, 176, 145, 0.2)',
              borderRadius: '3px',
              color: '#8B7355',
              fontWeight: 600,
            }}
          >
            ★ Curator Pick
          </span>
        ) : (
          <span>By @{map.authorUsername}</span>
        )}
        {map.neighborhoods && map.neighborhoods.length > 0 && (
          <>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{map.neighborhoods.slice(0, 2).join(', ')}</span>
          </>
        )}
      </div>

      {/* Responsive styles */}
      <style jsx>{`
        @media (max-width: 600px) {
          .map-title-block {
            padding: 16px !important;
          }
        }
      `}</style>
    </Link>
  )
}
