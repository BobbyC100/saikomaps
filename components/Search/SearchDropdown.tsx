import React, { useEffect } from 'react'
import Link from 'next/link'
import { SearchResults } from '@/lib/hooks/useSearch'
import { RecentSearches } from './RecentSearches'
import { RecentSearch } from '@/lib/hooks/useRecentSearches'

interface SearchDropdownProps {
  results: SearchResults
  isLoading: boolean
  query: string
  isOpen: boolean
  selectedIndex: number
  recentSearches: RecentSearch[]
  onSelectRecent: (query: string) => void
  onRemoveRecent: (query: string) => void
  onNavigate: (url: string) => void
  dropdownRef: React.RefObject<HTMLDivElement>
}

export function SearchDropdown({
  results,
  isLoading,
  query,
  isOpen,
  selectedIndex,
  recentSearches,
  onSelectRecent,
  onRemoveRecent,
  onNavigate,
  dropdownRef,
}: SearchDropdownProps) {
  if (!isOpen) {
    return null
  }

  const hasResults = results.neighborhoods.length > 0 || results.places.length > 0
  const showRecent = query.length === 0 && recentSearches.length > 0

  // Popular neighborhoods for "no results" state
  const popularNeighborhoods = ['Silver Lake', 'Echo Park', 'DTLA']

  return (
    <div
      ref={dropdownRef}
      role="listbox"
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0,
        right: 0,
        background: '#FFFDF7',
        border: '1px solid rgba(195, 176, 145, 0.15)',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(139, 115, 85, 0.12)',
        maxHeight: '400px',
        overflowY: 'auto',
        zIndex: 1000,
      }}
    >
      {showRecent ? (
        <>
          <RecentSearches
            searches={recentSearches}
            onSelect={onSelectRecent}
            onRemove={onRemoveRecent}
          />
          <div
            style={{
              padding: '12px 16px',
              fontSize: '11px',
              color: '#C3B091',
              borderTop: '1px solid rgba(195, 176, 145, 0.15)',
            }}
          >
            ⌘K to search anywhere
          </div>
        </>
      ) : isLoading ? (
        <div
          style={{
            padding: '24px 16px',
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
              padding: '24px 16px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-libre)',
                fontSize: '14px',
                color: '#36454F',
                marginBottom: '4px',
              }}
            >
              No places found
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#C3B091',
              }}
            >
              Try a neighborhood or category
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(195, 176, 145, 0.15)' }}>
            <div
              style={{
                padding: '12px 16px 6px',
                fontSize: '9px',
                fontWeight: 600,
                color: '#C3B091',
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              BROWSE
            </div>
            <div
              style={{
                padding: '10px 16px',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              {popularNeighborhoods.map((hood) => (
                <Link
                  key={hood}
                  href={`/browse/${hood.toLowerCase().replace(/\s+/g, '-')}`}
                  style={{
                    fontSize: '12px',
                    color: '#36454F',
                    textDecoration: 'none',
                  }}
                  onClick={() => onNavigate(`/browse/${hood.toLowerCase().replace(/\s+/g, '-')}`)}
                >
                  {hood}
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : hasResults ? (
        <>
          {results.neighborhoods.length > 0 && (
            <>
              <div
                style={{
                  padding: '12px 16px 6px',
                  fontSize: '9px',
                  fontWeight: 600,
                  color: '#C3B091',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
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
                    role="option"
                    aria-selected={isSelected}
                    id={`search-option-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 16px',
                      background: isSelected ? 'rgba(195, 176, 145, 0.18)' : 'transparent',
                      borderRadius: isSelected ? '8px' : '0',
                      margin: isSelected ? '0 4px' : '0',
                      textDecoration: 'none',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(195, 176, 145, 0.12)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                    onClick={() => onNavigate(`/browse/${neighborhood.slug}`)}
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
                  padding: '12px 16px 6px',
                  fontSize: '9px',
                  fontWeight: 600,
                  color: '#C3B091',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  borderTop:
                    results.neighborhoods.length > 0
                      ? '1px solid rgba(195, 176, 145, 0.15)'
                      : 'none',
                  marginTop: results.neighborhoods.length > 0 ? '8px' : '0',
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
                    role="option"
                    aria-selected={isSelected}
                    id={`search-option-${actualIndex}`}
                    style={{
                      display: 'block',
                      padding: '10px 16px',
                      background: isSelected ? 'rgba(195, 176, 145, 0.18)' : 'transparent',
                      borderRadius: isSelected ? '8px' : '0',
                      margin: isSelected ? '0 4px' : '0',
                      textDecoration: 'none',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(195, 176, 145, 0.12)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                    onClick={() => onNavigate(`/place/${place.slug}`)}
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
  )
}
