'use client'

import React from 'react'

interface SearchResultsHeaderProps {
  query: string
  mapCount: number
  placeCount: number
}

export function SearchResultsHeader({ query, mapCount, placeCount }: SearchResultsHeaderProps) {
  return (
    <div
      style={{
        padding: '16px 0',
        borderBottom: '1px solid rgba(195, 176, 145, 0.2)',
        marginBottom: '24px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-libre)',
          fontSize: '20px',
          fontStyle: 'italic',
          color: '#36454F',
          marginBottom: '4px',
        }}
      >
        "{query}"
      </div>
      <div
        style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: '#C3B091',
          fontFamily: 'var(--font-dm-sans)',
        }}
      >
        {mapCount} {mapCount === 1 ? 'map' : 'maps'} · {placeCount} {placeCount === 1 ? 'place' : 'places'}
      </div>
    </div>
  )
}
