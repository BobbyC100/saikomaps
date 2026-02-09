import { useState, useEffect, useCallback, useRef } from 'react'

export interface SearchPlace {
  name: string
  slug: string
  neighborhood: string | null
  category: string | null
  cuisine: string | null
}

export interface SearchNeighborhood {
  name: string
  slug: string
  count: number
}

export interface SearchResults {
  neighborhoods: SearchNeighborhood[]
  places: SearchPlace[]
}

interface UseSearchOptions {
  debounceMs?: number
  minChars?: number
}

export function useSearch(options: UseSearchOptions = {}) {
  const { debounceMs = 150, minChars = 2 } = options

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({
    neighborhoods: [],
    places: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Perform the search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minChars) {
      setResults({ neighborhoods: [], places: [] })
      setIsLoading(false)
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data: SearchResults = await response.json()
      setResults(data)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      console.error('Search error:', err)
      setError('Search failed. Please try again.')
      setResults({ neighborhoods: [], places: [] })
    } finally {
      setIsLoading(false)
    }
  }, [minChars])

  // Debounced search effect
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (query.length === 0) {
      setResults({ neighborhoods: [], places: [] })
      setIsLoading(false)
      return
    }

    if (query.length < minChars) {
      return
    }

    // Set loading immediately
    setIsLoading(true)

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      performSearch(query)
    }, debounceMs)

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, debounceMs, minChars, performSearch])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults({ neighborhoods: [], places: [] })
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clearSearch,
  }
}
