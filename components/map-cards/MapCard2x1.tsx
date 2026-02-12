'use client'

import React from 'react'
import Link from 'next/link'
import { MapCardData } from './types'

interface MapCard2x1Props {
  map: MapCardData
}

/**
 * MapCard2x1 — Horizontal layout for search results
 * - Grid span: 2 columns × 1 row
 * - Layout: Image left (35% width), content right
 * - Use: Search results, neighborhood pages, mixed grids
 */
export function MapCard2x1({ map }: MapCard2x1Props) {
  return (
    <Link
      href={`/map/${map.slug}`}
      className="map-card-2x1"
      style={{
        display: 'flex',
        background: '#FFFDF7',
        borderRadius: '6px',
        overflow: 'hidden',
        border: '2px solid #C3B091',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 115, 85, 0.15)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {map.coverImageUrl && (
        <div
          style={{
            width: '35%',
            minHeight: '140px',
            backgroundImage: `url(${map.coverImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'saturate(0.88) contrast(1.05)',
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Hidden img for SEO crawlers */}
          <img
            src={map.coverImageUrl}
            alt={`Cover image for ${map.title} map`}
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
          />
        </div>
      )}
      <div
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          gap: '6px',
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
            fontSize: '17px',
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
              fontSize: '12px',
              color: '#8B7355',
              lineHeight: 1.5,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
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
      </div>

      {/* Responsive styles */}
      <style jsx>{`
        .map-card-2x1 {
          grid-column: span 2;
        }

        @media (max-width: 600px) {
          .map-card-2x1 {
            grid-column: span 1;
            flex-direction: column;
          }
          .map-card-2x1 > div:first-child {
            width: 100% !important;
            height: 160px !important;
            min-height: auto !important;
          }
        }
      `}</style>
    </Link>
  )
}
