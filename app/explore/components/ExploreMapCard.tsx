'use client'

import React from 'react'
import Link from 'next/link'
import { MapCardData } from '../types'

interface ExploreMapCardProps {
  map: MapCardData
  featured?: boolean
}

/**
 * ExploreMapCard — Standard grid card for Explore page
 * - Standard (2×1): Single column span
 * - Featured (2×2): 2 column span (only in browse mode, after Priority Zone)
 */
export function ExploreMapCard({ map, featured = false }: ExploreMapCardProps) {
  return (
    <Link
      href={`/map/${map.slug}`}
      className={`map-card ${featured ? 'featured' : ''}`}
      style={{
        background: '#FFFDF7',
        borderRadius: featured ? '12px' : '12px',
        overflow: 'hidden',
        border: '1px solid rgba(195, 176, 145, 0.15)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 115, 85, 0.12)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Image */}
      {map.coverImageUrl && (
        <div
          style={{
            aspectRatio: featured ? '16 / 9' : '16 / 10',
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
          {/* Badge overlay for featured curator picks */}
          {featured && map.isCuratorPick && (
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

      {/* Card body */}
      <div
        style={{
          padding: featured ? '20px' : '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: featured ? '8px' : '6px',
          flex: 1,
        }}
      >
        {/* Curator badge (non-featured only) */}
        {!featured && map.isCuratorPick && (
          <span
            style={{
              display: 'inline-block',
              fontSize: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: '4px 8px',
              borderRadius: '4px',
              background: '#36454F',
              color: '#F5F0E1',
              alignSelf: 'flex-start',
              marginBottom: '4px',
              fontFamily: 'var(--font-dm-sans)',
              fontWeight: 600,
            }}
          >
            Curator Pick
          </span>
        )}

        {/* Title */}
        <h3
          style={{
            fontFamily: 'var(--font-libre)',
            fontSize: featured ? '18px' : '14px',
            fontStyle: 'italic',
            color: '#36454F',
            margin: 0,
            lineHeight: featured ? 1.25 : 1.3,
          }}
        >
          {map.title}
        </h3>

        {/* Tagline */}
        {map.tagline && (
          <p
            style={{
              fontSize: featured ? '13px' : '12px',
              color: '#8B7355',
              margin: 0,
              lineHeight: 1.4,
              ...(featured ? {} : {
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }),
            }}
          >
            {map.tagline}
          </p>
        )}

        {/* Meta */}
        <div
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: '#C3B091',
            fontFamily: 'var(--font-dm-sans)',
            ...(featured ? {
              paddingTop: '12px',
              borderTop: '1px solid rgba(195, 176, 145, 0.2)',
              marginTop: 'auto',
            } : {}),
          }}
        >
          {map.placeCount} {map.placeCount === 1 ? 'place' : 'places'} · {map.creatorName}
        </div>
      </div>

      {/* Responsive styles */}
      <style jsx>{`
        .map-card.featured {
          grid-column: span 2;
        }

        @media (max-width: 500px) {
          .map-card.featured {
            grid-column: span 1;
          }
        }
      `}</style>
    </Link>
  )
}
