/**
 * Global Footer Component
 * Supports standard (with About link) and minimal (map view) variants
 * Based on approved design spec
 */

'use client'

import React from 'react'
import Link from 'next/link'

interface GlobalFooterProps {
  variant?: 'standard' | 'minimal'
}

export function GlobalFooter({ variant = 'standard' }: GlobalFooterProps) {
  // Minimal variant (map/merchant view) - border only
  if (variant === 'minimal') {
    return (
      <footer
        style={{
          padding: '12px 24px',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #F0F0F0',
        }}
      />
    )
  }

  // Standard variant - wordmark + About link
  return (
    <footer
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #F0F0F0',
      }}
    >
      <span
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: '#6B6B6B',
        }}
      >
        Saiko Maps
      </span>
      <Link
        href="/about"
        style={{
          fontSize: '13px',
          color: '#9A9A9A',
          textDecoration: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#6B6B6B'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#9A9A9A'
        }}
      >
        About
      </Link>
    </footer>
  )
}
