'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  EmptyState,
  ExploreMapCard,
  MapListItem,
  SearchResultsHeader,
  SectionHeader,
  ViewToggle,
} from './components'
import type {
  CollectionFacetResponse,
  CollectionFilters,
  CollectionListResponse,
  MapCardData,
  ViewMode,
} from './types'

function safeQueryValue(value: string | null): string | 'all' {
  if (!value || value.trim().length === 0) return 'all'
  return value
}

function toLabel(value: string): string {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

export default function ExploreClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [cards, setCards] = useState<MapCardData[]>([])
  const [facets, setFacets] = useState<CollectionFacetResponse>({
    scopes: [],
    verticals: [],
    regions: [],
    neighborhoods: [],
  })
  const [viewMode, setViewMode] = useState<ViewMode>(
    searchParams?.get('mode') === 'list' ? 'list' : 'grid'
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState<number>(1)
  const [total, setTotal] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)

  const filters = useMemo<CollectionFilters>(
    () => ({
      scope: safeQueryValue(searchParams?.get('scope')) as CollectionFilters['scope'],
      vertical: safeQueryValue(searchParams?.get('vertical')),
      region: safeQueryValue(searchParams?.get('region')),
      neighborhood: safeQueryValue(searchParams?.get('neighborhood')),
    }),
    [searchParams]
  )

  const encodedBackTarget = useMemo(() => {
    const query = searchParams?.toString()
    const current = query ? `${pathname}?${query}` : pathname
    return encodeURIComponent(current)
  }, [pathname, searchParams])

  useEffect(() => {
    const mode = searchParams?.get('mode')
    if (mode === 'list' || mode === 'grid') {
      setViewMode(mode)
    }
  }, [searchParams])

  useEffect(() => {
    const rawPage = Number(searchParams?.get('page') || '1')
    if (Number.isFinite(rawPage) && rawPage > 0) {
      setPage(rawPage)
    } else {
      setPage(1)
    }
  }, [searchParams])

  useEffect(() => {
    let cancelled = false

    async function loadCollections() {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', '24')

      if (filters.scope !== 'all') params.set('scope', filters.scope)
      if (filters.vertical !== 'all') params.set('vertical', filters.vertical)
      if (filters.region !== 'all') params.set('region', filters.region)
      if (filters.neighborhood !== 'all') params.set('neighborhood', filters.neighborhood)

      try {
        const [listRes, facetRes] = await Promise.all([
          fetch(`/api/collections?${params.toString()}`, { cache: 'no-store' }),
          fetch('/api/collections/facets', { cache: 'no-store' }),
        ])

        if (!listRes.ok) {
          throw new Error('Failed to load collections')
        }
        if (!facetRes.ok) {
          throw new Error('Failed to load filters')
        }

        const listJson = (await listRes.json()) as CollectionListResponse
        const facetJson = (await facetRes.json()) as CollectionFacetResponse

        if (cancelled) return

        setCards(listJson.data || [])
        setTotal(listJson.pagination?.total || 0)
        setTotalPages(listJson.pagination?.totalPages || 1)
        setFacets(facetJson)
      } catch (loadError) {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load collections')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadCollections()
    return () => {
      cancelled = true
    }
  }, [filters, page])

  function updateUrl(next: Partial<CollectionFilters> & { mode?: ViewMode; page?: number }) {
    const params = new URLSearchParams(searchParams?.toString() || '')
    const resolved = {
      ...filters,
      ...next,
    }

    if (resolved.scope === 'all') params.delete('scope')
    else params.set('scope', resolved.scope)

    if (resolved.vertical === 'all') params.delete('vertical')
    else params.set('vertical', resolved.vertical)

    if (resolved.region === 'all') params.delete('region')
    else params.set('region', resolved.region)

    if (resolved.neighborhood === 'all') params.delete('neighborhood')
    else params.set('neighborhood', resolved.neighborhood)

    if (next.mode) params.set('mode', next.mode)
    if (typeof next.page === 'number' && next.page > 1) params.set('page', String(next.page))
    else if (typeof next.page === 'number') params.delete('page')

    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`)
  }

  function onFilterChange(key: keyof CollectionFilters, value: string) {
    updateUrl({ [key]: value, page: 1 })
  }

  function onViewModeChange(next: ViewMode) {
    setViewMode(next)
    updateUrl({ mode: next })
  }

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages) return
    updateUrl({ page: nextPage })
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F0E1', padding: '24px 24px 80px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <SectionHeader
          title="Explore Collections"
          rightElement={
            <ViewToggle value={viewMode} onChange={onViewModeChange} />
          }
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 16 }}>
          <select value={filters.scope} onChange={(e) => onFilterChange('scope', e.target.value)} style={{ padding: '8px 10px' }}>
            <option value="all">All scopes</option>
            {facets.scopes.map((scope) => (
              <option key={scope.key} value={scope.key}>
                {scope.label} ({scope.count})
              </option>
            ))}
          </select>
          <select value={filters.vertical} onChange={(e) => onFilterChange('vertical', e.target.value)} style={{ padding: '8px 10px' }}>
            <option value="all">All verticals</option>
            {facets.verticals.map((vertical) => (
              <option key={vertical.key} value={vertical.key}>
                {vertical.label} ({vertical.count})
              </option>
            ))}
          </select>
          <select value={filters.region} onChange={(e) => onFilterChange('region', e.target.value)} style={{ padding: '8px 10px' }}>
            <option value="all">All regions</option>
            {facets.regions.map((region) => (
              <option key={region.key} value={region.key}>
                {region.label} ({region.count})
              </option>
            ))}
          </select>
          <select
            value={filters.neighborhood}
            onChange={(e) => onFilterChange('neighborhood', e.target.value)}
            style={{ padding: '8px 10px' }}
          >
            <option value="all">All neighborhoods</option>
            {facets.neighborhoods.map((neighborhood) => (
              <option key={neighborhood.key} value={neighborhood.key}>
                {neighborhood.label} ({neighborhood.count})
              </option>
            ))}
          </select>
        </div>

        <SearchResultsHeader
          query={`${toLabel(filters.scope)} / ${toLabel(filters.vertical)} / ${toLabel(filters.region)}`}
          mapCount={cards.length}
          placeCount={total}
        />

        {error ? (
          <div style={{ color: '#8C3A32', padding: '24px 0' }}>{error}</div>
        ) : null}

        {isLoading ? (
          <div style={{ padding: '32px 0', color: '#8B7355' }}>Loading collections...</div>
        ) : cards.length === 0 ? (
          <EmptyState />
        ) : viewMode === 'list' ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {cards.map((map) => (
              <MapListItem
                key={map.id}
                map={map}
                href={`/map/${map.slug}?from=explore&back=${encodedBackTarget}`}
              />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {cards.map((map, index) => (
              <ExploreMapCard
                key={map.id}
                map={map}
                featured={index === 0}
                href={`/map/${map.slug}?from=explore&back=${encodedBackTarget}`}
              />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
          <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} style={{ padding: '8px 12px' }}>
            Previous
          </button>
          <div style={{ fontSize: 12, color: '#8B7355' }}>
            Page {page} of {totalPages} · {total} collections
          </div>
          <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= totalPages} style={{ padding: '8px 12px' }}>
            Next
          </button>
        </div>
      </div>
    </main>
  )
}
