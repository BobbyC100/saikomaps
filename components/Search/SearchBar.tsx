'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useSearch } from '@/lib/hooks/useSearch'
import { useRecentSearches } from '@/lib/hooks/useRecentSearches'
import { SearchDropdown } from './SearchDropdown'

interface SearchBarProps {
  variant?: 'desktop' | 'mobile'
}

export function SearchBar({ variant = 'desktop' }: SearchBarProps) {
  const router = useRouter()
  const [isFocused, setIsFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { query, setQuery, results, isLoading, clearSearch } = useSearch()
  const { recentSearches, addSearch, removeSearch } = useRecentSearches()

  const isOpen = isFocused && (query.length > 0 || recentSearches.length > 0)
  const totalResults = results.neighborhoods.length + results.places.length

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

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
            setIsFocused(false)
            inputRef.current?.blur()
          }
          break
        case 'Tab':
          if (isOpen) {
            e.preventDefault()
            setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalResults))
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, query, totalResults, clearSearch])

  // Global keyboard shortcut (/ or Cmd+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.metaKey && e.key === 'k')) && !isFocused) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isFocused])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
      setIsFocused(false)
      inputRef.current?.blur()
    }
  }

  const handleSelectRecent = (recentQuery: string) => {
    setQuery(recentQuery)
    inputRef.current?.focus()
  }

  const handleNavigate = (url: string) => {
    clearSearch()
    setIsFocused(false)
    inputRef.current?.blur()
    
    // Add to recent searches based on URL
    if (url.startsWith('/place/')) {
      const place = results.places.find(p => url.includes(p.slug))
      if (place) addSearch(place.name, 'place')
    } else if (url.startsWith('/browse/')) {
      const neighborhood = results.neighborhoods.find(n => url.includes(n.slug))
      if (neighborhood) addSearch(neighborhood.name, 'neighborhood')
    }
  }

  const width = isFocused ? '360px' : '280px'

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: variant === 'mobile' ? '100%' : width,
        transition: 'width 0.2s ease',
      }}
    >
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="search-dropdown"
        aria-owns="search-dropdown"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: '#FFFDF7',
          border: isFocused ? '1px solid #C3B091' : '1px solid rgba(195, 176, 145, 0.3)',
          borderRadius: '12px',
          height: '40px',
          padding: '0 16px',
          transition: 'border 0.2s ease',
        }}
      >
        <Search size={16} color="#C3B091" style={{ marginRight: '10px', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search places..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          aria-autocomplete="list"
          aria-activedescendant={isOpen ? `search-option-${selectedIndex}` : undefined}
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

      <SearchDropdown
        results={results}
        isLoading={isLoading}
        query={query}
        isOpen={isOpen}
        selectedIndex={selectedIndex}
        recentSearches={recentSearches}
        onSelectRecent={handleSelectRecent}
        onRemoveRecent={removeSearch}
        onNavigate={handleNavigate}
        dropdownRef={dropdownRef}
      />
    </div>
  )
}
