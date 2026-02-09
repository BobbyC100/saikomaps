import { useState, useEffect } from 'react'

const STORAGE_KEY = 'saiko_recent_searches'
const MAX_RECENT = 5

export interface RecentSearch {
  query: string
  type: 'neighborhood' | 'place' | 'category'
  timestamp: number
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setRecentSearches(Array.isArray(parsed) ? parsed : [])
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error)
      setRecentSearches([])
    }
  }, [])

  // Add a search to recent history
  const addSearch = (query: string, type: RecentSearch['type']) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    setRecentSearches((prev) => {
      // Remove duplicate (case-insensitive)
      const filtered = prev.filter(
        (item) => item.query.toLowerCase() !== trimmedQuery.toLowerCase()
      )

      // Add new search at the beginning
      const updated = [
        { query: trimmedQuery, type, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENT)

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Failed to save recent searches:', error)
      }

      return updated
    })
  }

  // Remove a specific search from history
  const removeSearch = (query: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter(
        (item) => item.query.toLowerCase() !== query.toLowerCase()
      )

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Failed to save recent searches:', error)
      }

      return updated
    })
  }

  // Clear all recent searches
  const clearSearches = () => {
    setRecentSearches([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear recent searches:', error)
    }
  }

  return {
    recentSearches,
    addSearch,
    removeSearch,
    clearSearches,
  }
}
