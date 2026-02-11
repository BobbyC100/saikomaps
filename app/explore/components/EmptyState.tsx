'use client'

import React from 'react'
import { Search } from 'lucide-react'

interface EmptyStateProps {
  query?: string
}

export function EmptyState({ query }: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '64px 24px',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          margin: '0 auto 16px',
          opacity: 0.3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Search size={48} color="#8B7355" strokeWidth={1.5} />
      </div>
      <div
        style={{
          fontFamily: 'var(--font-libre)',
          fontSize: '16px',
          fontStyle: 'italic',
          color: '#36454F',
          marginBottom: '8px',
        }}
      >
        No maps or places found
      </div>
      <div
        style={{
          fontSize: '12px',
          color: '#C3B091',
        }}
      >
        Try a different search term or browse our curator picks
      </div>
    </div>
  )
}
