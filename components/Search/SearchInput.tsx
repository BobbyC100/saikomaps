'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

interface SearchInputProps {
  variant?: 'full' | 'expanded'
  initialQuery?: string
  onClose?: () => void
  className?: string
  style?: React.CSSProperties
}

/**
 * Simple form-based search input (V1)
 * - Submits to /search?q=... on Enter
 * - No live dropdown suggestions
 * - Can be closed with X button or Escape key
 */
export function SearchInput({ 
  variant = 'full',
  initialQuery = '',
  onClose,
  className = '',
  style = {}
}: SearchInputProps) {
  const [query, setQuery] = useState(initialQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  // Handle Escape key to close (if closeable)
  useEffect(() => {
    if (!onClose) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Auto-focus for expanded variant
  useEffect(() => {
    if (variant === 'expanded') {
      inputRef.current?.focus()
    }
  }, [variant])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`
    }
  }

  const handleClear = () => {
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={className}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        maxWidth: variant === 'expanded' ? '720px' : '100%',
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          background: '#FFFDF7',
          border: '1px solid rgba(195, 176, 145, 0.3)',
          borderRadius: '8px',
          height: '44px',
          padding: '0 16px',
        }}
      >
        <Search size={18} color="#C3B091" style={{ marginRight: '12px', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="search"
          name="q"
          placeholder="Search places..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search for places"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-dm-sans)',
            fontSize: '15px',
            color: '#1A1A1A',
          }}
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              color: '#C3B091',
              opacity: 0.6,
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.6'
            }}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '-48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            color: '#C3B091',
          }}
          aria-label="Close search"
        >
          <X size={20} />
        </button>
      )}
    </form>
  )
}
