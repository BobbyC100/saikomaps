'use client'

import React from 'react'
import Link from 'next/link'
import { MapCardData } from './types'

interface MapCard2x2Props {
  map: MapCardData
}

/**
 * MapCard2x2 — Featured/Editorial layout
 * - Grid span: 2 columns × 2 rows
 * - Layout: Image top (full width), content below
 * - Use: Homepage features, "Map of the week", editorial surfaces
 */
export function MapCard2x2({ map }: MapCard2x2Props) {
  return (
    <Link
      href={`/map/${map.slug}`}
      className="map-card-2x2"
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#FFFDF7',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '2px solid #C3B091',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 6px 28px rgba(139, 115, 85, 0.18)'
        e.currentTarget.style.transform = 'translateY(-3px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Hero image with optional badge */}
      {map.coverImageUrl && (
        <div
          style={{
            height: '180px',
            backgroundImage: `url(${map.coverImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'saturate(0.88) contrast(1.05)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Hidden img for SEO crawlers */}
          <img
            src={map.coverImageUrl}
            alt={`Cover image for ${map.title} map`}
            style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
          />
          {map.authorType === 'saiko' && (
            <span
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                fontSize: '8px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                padding: '5px 10px',
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                borderRadius: '3px',
                fontWeight: 600,
                fontFamily: 'var(--font-dm-sans)',
              }}
            >
              Curator Pick
            </span>
          )}
        </div>
      )}

      <div
        style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          gap: '8px',
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
            fontSize: '22px',
            color: '#36454F',
            lineHeight: 1.25,
            margin: 0,
          }}
        >
          {map.title}
        </h3>

        {/* Description */}
        {map.description && (
          <p
            style={{
              fontSize: '13px',
              color: '#8B7355',
              lineHeight: 1.6,
              margin: 0,
              flex: 1,
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
            paddingTop: '12px',
            borderTop: '1px solid rgba(195, 176, 145, 0.2)',
            fontFamily: 'var(--font-dm-sans)',
          }}
        >
          {map.neighborhoods && map.neighborhoods.length > 0 && (
            <>
              <span>{map.neighborhoods.slice(0, 2).join(', ')}</span>
            </>
          )}
        </div>
      </div>

      {/* Responsive styles */}
      <style jsx>{`
        .map-card-2x2 {
          grid-column: span 2;
          grid-row: span 2;
        }

        @media (max-width: 900px) {
          .map-card-2x2 {
            grid-column: span 2;
            grid-row: span 1;
          }
          .map-card-2x2 > div:first-child {
            height: 160px !important;
          }
        }

        @media (max-width: 600px) {
          .map-card-2x2 {
            grid-column: span 1;
            grid-row: span 1;
          }
          .map-card-2x2 > div:first-child {
            height: 180px !important;
          }
          .map-card-2x2 > div:last-child {
            padding: 16px !important;
          }
        }
      `}</style>
    </Link>
  )
}
