'use client'

import React from 'react'
import { FilterTab } from '../types'

interface FilterTabsProps {
  filters: FilterTab[]
  active: string
  onChange: (filterId: string) => void
}

export function FilterTabs({ filters, active, onChange }: FilterTabsProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        padding: '0 24px 24px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {filters.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onChange(filter.id)}
          style={{
            padding: '8px 16px',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            borderRadius: '20px',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: 'none',
            background: active === filter.id ? '#36454F' : 'rgba(195, 176, 145, 0.15)',
            color: active === filter.id ? '#F5F0E1' : '#8B7355',
            fontFamily: 'var(--font-dm-sans)',
            fontWeight: 600,
          }}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
