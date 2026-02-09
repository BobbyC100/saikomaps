'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowLeft } from 'lucide-react'
import { useSearch } from '@/lib/hooks/useSearch'
import { useRecentSearches } from '@/lib/hooks/useRecentSearches'
import Link from 'next/link'

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const router = useRouter()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const { query, setQuery, results, isLoading, clearSearch } = useSearch()
  const { recentSearches, addSearch, removeSearch } = useRecentSearches()

  const hasResults = results.neighborhoods.length > 0 || results.places.length > 0
  const showRecent = query.length === 0 && recentSearches.length > 0
  const totalResults = results.neighborhoods.length + results.places.length

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalResults))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + totalResults) % Math.max(1, totalResults))
          break
        case 'Enter':
          e.preventDefault()
          handleEnterKey()
          break
        case 'Escape':
          e.preventDefault()
          if (query.length > 0) {
            clearSearch()
          } else {
            onClose()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, query, totalResults, clearSearch, onClose])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  const handleEnterKey = () => {
    if (totalResults === 0) return

    let url = ''

    if (selectedIndex < results.neighborhoods.length) {
      // Selected a neighborhood
      const neighborhood = results.neighborhoods[selectedIndex]
      url = `/browse/${neighborhood.slug}`
      addSearch(neighborhood.name, 'neighborhood')
    } else {
      // Selected a place
      const placeIndex = selectedIndex - results.neighborhoods.length
      const place = results.places[placeIndex]
      url = `/place/${place.slug}`
      addSearch(place.name, 'place')
    }

    if (url) {
      router.push(url)
      clearSearch()
      onClose()
    }
  }

  const handleSelectRecent = (recentQuery: string) => {
    setQuery(recentQuery)
  }

  const handleNavigate = (url: string, itemName: string, type: 'place' | 'neighborhood') => {
    addSearch(itemName, type)
    clearSearch()
    onClose()
  }

  if (!isOpen) return null

  // Popular neighborhoods for "no results" state
  const popularNeighborhoods = ['Silver Lake', 'Echo Park', 'DTLA']

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#F5F0E1',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.25s ease-out',
      }}
    >
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(195, 176, 145, 0.15)',
          background: '#FFFDF7',
          height: '56px',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            color: '#36454F',
          }}
          aria-label="Close search"
        >
          <ArrowLeft size={20} />
        </button>

        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: '#FFFDF7',
            border: '1px solid rgba(195, 176, 145, 0.3)',
            borderRadius: '12px',
            height: '44px',
            padding: '0 16px',
          }}
        >
          <Search size={16} color="#C3B091" style={{ marginRight: '10px', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search places..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'var(--font-libre)',
              fontSize: '14px',
              color: '#36454F',
              fontStyle: query.length === 0 ? 'italic' : 'normal',
            }}
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearSearch()
                inputRef.current?.focus()
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#C3B091',
              }}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
        }}
      >
        {showRecent ? (
          <>
            <div
              style={{
                fontSize: '9px',
                fontWeight: 600,
                color: '#C3B091',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              RECENT
            </div>
            {recentSearches.map((search) => (
              <div
                key={search.query}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: '#FFFDF7',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                }}
                onClick={() => handleSelectRecent(search.query)}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-libre)',
                    fontSize: '14px',
                    color: '#36454F',
                  }}
                >
                  {search.query}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeSearch(search.query)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#C3B091',
                  }}
                  aria-label={`Remove ${search.query}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            <div
              style={{
                marginTop: '24px',
                fontSize: '9px',
                fontWeight: 600,
                color: '#C3B091',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              BROWSE BY NEIGHBORHOOD
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}
            >
              {popularNeighborhoods.map((hood) => (
                <Link
                  key={hood}
                  href={`/browse/${hood.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={onClose}
                  style={{
                    padding: '16px',
                    background: '#FFFDF7',
                    borderRadius: '8px',
                    textAlign: 'center',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-libre)',
                    fontSize: '12px',
                    color: '#36454F',
                  }}
                >
                  {hood}
                </Link>
              ))}
            </div>
          </>
        ) : isLoading ? (
          <div
            style={{
              padding: '48px 16px',
              textAlign: 'center',
              color: '#C3B091',
              fontSize: '14px',
            }}
          >
            Searching...
          </div>
        ) : !hasResults && query.length >= 2 ? (
          <>
            <div
              style={{
                padding: '48px 16px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-libre)',
                  fontSize: '16px',
                  color: '#36454F',
                  marginBottom: '8px',
                }}
              >
                No places found
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#C3B091',
                }}
              >
                Try a neighborhood or category
              </div>
            </div>

            <div
              style={{
                fontSize: '9px',
                fontWeight: 600,
                color: '#C3B091',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              BROWSE
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}
            >
              {popularNeighborhoods.map((hood) => (
                <Link
                  key={hood}
                  href={`/browse/${hood.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={onClose}
                  style={{
                    padding: '16px',
                    background: '#FFFDF7',
                    borderRadius: '8px',
                    textAlign: 'center',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-libre)',
                    fontSize: '12px',
                    color: '#36454F',
                  }}
                >
                  {hood}
                </Link>
              ))}
            </div>
          </>
        ) : hasResults ? (
          <>
            {results.neighborhoods.length > 0 && (
              <>
                <div
                  style={{
                    fontSize: '9px',
                    fontWeight: 600,
                    color: '#C3B091',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginBottom: '12px',
                  }}
                >
                  NEIGHBORHOODS
                </div>
                {results.neighborhoods.map((neighborhood, index) => {
                  const isSelected = selectedIndex === index
                  return (
                    <Link
                      key={neighborhood.slug}
                      href={`/browse/${neighborhood.slug}`}
                      onClick={() => handleNavigate(`/browse/${neighborhood.slug}`, neighborhood.name, 'neighborhood')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: isSelected ? 'rgba(195, 176, 145, 0.18)' : '#FFFDF7',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        textDecoration: 'none',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-libre)',
                          fontSize: '14px',
                          color: '#36454F',
                        }}
                      >
                        {neighborhood.name}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#C3B091',
                        }}
                      >
                        {neighborhood.count}
                      </span>
                    </Link>
                  )
                })}
              </>
            )}

            {results.places.length > 0 && (
              <>
                <div
                  style={{
                    fontSize: '9px',
                    fontWeight: 600,
                    color: '#C3B091',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginBottom: '12px',
                    marginTop: results.neighborhoods.length > 0 ? '24px' : '0',
                  }}
                >
                  PLACES
                </div>
                {results.places.map((place, index) => {
                  const actualIndex = results.neighborhoods.length + index
                  const isSelected = selectedIndex === actualIndex
                  return (
                    <Link
                      key={place.slug}
                      href={`/place/${place.slug}`}
                      onClick={() => handleNavigate(`/place/${place.slug}`, place.name, 'place')}
                      style={{
                        display: 'block',
                        padding: '12px 16px',
                        background: isSelected ? 'rgba(195, 176, 145, 0.18)' : '#FFFDF7',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        textDecoration: 'none',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--font-libre)',
                          fontSize: '14px',
                          color: '#36454F',
                        }}
                      >
                        {place.name}
                      </div>
                      {(place.cuisine || place.category) && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#C3B091',
                            marginTop: '2px',
                          }}
                        >
                          {[place.cuisine, place.category].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
