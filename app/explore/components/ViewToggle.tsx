'use client'

import React from 'react'

interface ViewToggleProps {
  value: 'grid' | 'list'
  onChange: (value: 'grid' | 'list') => void
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        background: 'rgba(195, 176, 145, 0.15)',
        padding: '4px',
        borderRadius: '8px',
      }}
    >
      <button
        type="button"
        onClick={() => onChange('grid')}
        style={{
          padding: '6px 12px',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          border: 'none',
          background: value === 'grid' ? '#FFFDF7' : 'transparent',
          color: value === 'grid' ? '#36454F' : '#8B7355',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          fontFamily: 'var(--font-dm-sans)',
          fontWeight: 500,
        }}
      >
        Grid
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        style={{
          padding: '6px 12px',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          border: 'none',
          background: value === 'list' ? '#FFFDF7' : 'transparent',
          color: value === 'list' ? '#36454F' : '#8B7355',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          fontFamily: 'var(--font-dm-sans)',
          fontWeight: 500,
        }}
      >
        List
      </button>
    </div>
  )
}
