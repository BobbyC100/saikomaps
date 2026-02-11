'use client'

import React from 'react'
import { Search, X } from 'lucide-react'

interface ExploreSearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => void
}

export function ExploreSearchBar({ value, onChange, onSearch }: ExploreSearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) {
      onSearch(value.trim())
    }
  }

  const handleClear = () => {
    onChange('')
    onSearch('')
  }

  return (
    <section
      style={{
        padding: '32px 24px 24px',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <form onSubmit={handleSubmit}>
        <div
          style={{
            background: '#FFFDF7',
            border: '1px solid rgba(195, 176, 145, 0.3)',
            borderRadius: '12px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(139, 115, 85, 0.06)',
          }}
        >
          <Search size={20} color="#C3B091" style={{ opacity: 0.6, flexShrink: 0 }} />
          <input
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search maps, places, or neighborhoods..."
            style={{
              flex: 1,
              fontFamily: 'var(--font-libre)',
              fontSize: '15px',
              fontStyle: 'italic',
              color: '#36454F',
              border: 'none',
              background: 'transparent',
              outline: 'none',
            }}
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#C3B091',
                opacity: 0.6,
              }}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
