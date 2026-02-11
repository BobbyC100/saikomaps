'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { GlobalHeader } from '@/components/layouts/GlobalHeader'
import { GlobalFooter } from '@/components/layouts/GlobalFooter'
import { ExploreSearchBar } from './components/ExploreSearchBar'
import { FilterTabs } from './components/FilterTabs'
import { ViewToggle } from './components/ViewToggle'
import { SectionHeader } from './components/SectionHeader'
import { ExploreMapCard } from './components/ExploreMapCard'
import { MapListItem } from './components/MapListItem'
import { PlaceListItem } from './components/PlaceListItem'
import { SearchResultsHeader } from './components/SearchResultsHeader'
import { EmptyState } from './components/EmptyState'
import { FILTERS, type MapCardData, type PlaceCardData, type ExploreMode, type ViewMode } from './types'

export default function ExplorePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') || ''
  
  const [searchValue, setSearchValue] = useState(query)
  const [activeFilter, setActiveFilter] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [loading, setLoading] = useState(false)
  
  // Determine mode
  const exploreMode: ExploreMode = query ? 'search' : 'browse'
  
  // Mock data (replace with API calls)
  const [maps, setMaps] = useState<MapCardData[]>([])
  const [places, setPlaces] = useState<PlaceCardData[]>([])

  // Update search value when URL changes
  useEffect(() => {
    setSearchValue(query)
  }, [query])

  // Handle search submission
  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push('/explore')
    }
  }

  // Handle filter change
  const handleFilterChange = (filterId: string) => {
    setActiveFilter(filterId)
    
    // Special handling for "Near Me"
    if (filterId === 'near-me') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Location granted:', position.coords)
            // Fetch nearby maps
          },
          (error) => {
            console.log('Location denied')
            alert('Location access denied. Use a neighborhood filter instead.')
            setActiveFilter('all')
          }
        )
      } else {
        alert('Geolocation not supported. Use a neighborhood filter instead.')
        setActiveFilter('all')
      }
    }
  }

  // Fetch data
  useEffect(() => {
    if (exploreMode === 'search' && query) {
      setLoading(true)
      // TODO: Call /api/search?q={query}
      // For now, mock empty results
      setTimeout(() => {
        setMaps([])
        setPlaces([])
        setLoading(false)
      }, 500)
    } else {
      // Browse mode - fetch sections
      setLoading(true)
      // TODO: Call /api/maps/popular, /api/maps/curated, etc.
      // For now, mock data
      setTimeout(() => {
        setMaps(getMockBrowseMaps())
        setPlaces([])
        setLoading(false)
      }, 500)
    }
  }, [query, exploreMode, activeFilter])

  // Browse Mode Render
  if (exploreMode === 'browse') {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F0E1' }}>
        <GlobalHeader variant="default" />
        
        <ExploreSearchBar
          value={searchValue}
          onChange={setSearchValue}
          onSearch={handleSearch}
        />
        
        <FilterTabs
          filters={FILTERS}
          active={activeFilter}
          onChange={handleFilterChange}
        />
        
        <main style={{ padding: '0 24px 48px', maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Section 1: Popular This Week */}
          <div style={{ marginBottom: '40px' }}>
            <SectionHeader
              title="Popular This Week"
              linkText="See all"
              linkHref="/explore/popular"
              rightElement={<ViewToggle value={viewMode} onChange={setViewMode} />}
            />
            
            {viewMode === 'grid' ? (
              <div className="map-grid">
                {maps.slice(0, 4).map((map) => (
                  <ExploreMapCard key={map.id} map={map} />
                ))}
              </div>
            ) : (
              <div className="map-list">
                {maps.slice(0, 4).map((map) => (
                  <MapListItem key={map.id} map={map} />
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Curator Picks (featured allowed here) */}
          <div style={{ marginBottom: '40px' }}>
            <SectionHeader
              title="Curator Picks"
              linkText="See all"
              linkHref="/explore/curated"
            />
            
            {viewMode === 'grid' ? (
              <div className="map-grid">
                {getCuratorPicks().map((map, idx) => (
                  <ExploreMapCard 
                    key={map.id} 
                    map={map} 
                    featured={idx === 0}  // First one can be featured
                  />
                ))}
              </div>
            ) : (
              <div className="map-list">
                {getCuratorPicks().map((map) => (
                  <MapListItem key={map.id} map={map} />
                ))}
              </div>
            )}
          </div>

          {/* Section 3: By Neighborhood (list view only) */}
          <div>
            <SectionHeader title="By Neighborhood" />
            <div className="map-list">
              {getByNeighborhood().map((map) => (
                <MapListItem key={map.id} map={map} />
              ))}
            </div>
          </div>

        </main>

        <GlobalFooter variant="standard" />

        {/* Responsive Grid Styles */}
        <style jsx>{`
          .map-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }

          .map-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1px;
            background: rgba(195, 176, 145, 0.15);
            border-radius: 12px;
            overflow: hidden;
          }

          @media (max-width: 900px) {
            .map-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          @media (max-width: 700px) {
            .map-list {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 500px) {
            .map-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    )
  }

  // Search Results Mode Render
  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E1' }}>
      <GlobalHeader variant="default" />
      
      <ExploreSearchBar
        value={searchValue}
        onChange={setSearchValue}
        onSearch={handleSearch}
      />
      
      <FilterTabs
        filters={FILTERS}
        active={activeFilter}
        onChange={handleFilterChange}
      />
      
      <main style={{ padding: '0 24px 48px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ fontSize: '12px', color: '#C3B091' }}>Loading...</div>
          </div>
        ) : maps.length === 0 && places.length === 0 ? (
          <EmptyState query={query} />
        ) : (
          <>
            {/* Search results header */}
            <SearchResultsHeader
              query={query}
              mapCount={maps.length}
              placeCount={places.length}
            />

            {/* Maps section */}
            {maps.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <SectionHeader
                  title="Maps"
                  rightElement={<ViewToggle value={viewMode} onChange={setViewMode} />}
                />
                
                {viewMode === 'grid' ? (
                  <div className="map-grid">
                    {/* Priority Zone: First 4 cards are peers (no featured) */}
                    {maps.slice(0, 4).map((map) => (
                      <ExploreMapCard key={map.id} map={map} featured={false} />
                    ))}
                    {/* After Priority Zone: Featured allowed */}
                    {maps.slice(4).map((map) => (
                      <ExploreMapCard key={map.id} map={map} featured={map.featured} />
                    ))}
                  </div>
                ) : (
                  <div className="map-list">
                    {maps.map((map) => (
                      <MapListItem key={map.id} map={map} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Places section */}
            {places.length > 0 && (
              <div>
                <SectionHeader
                  title={`Places matching "${query}"`}
                  linkText={`View all ${places.length}`}
                  linkHref={`/search?q=${query}`}
                />
                <div className="map-list">
                  {places.slice(0, 6).map((place) => (
                    <PlaceListItem key={place.id} place={place} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <GlobalFooter variant="standard" />

      {/* Responsive Grid Styles */}
      <style jsx>{`
        .map-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .map-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1px;
          background: rgba(195, 176, 145, 0.15);
          border-radius: 12px;
          overflow: hidden;
        }

        @media (max-width: 900px) {
          .map-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 700px) {
          .map-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 500px) {
          .map-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// MOCK DATA (Replace with API calls)
// ============================================================================

function getMockBrowseMaps(): MapCardData[] {
  return [
    {
      id: '1',
      slug: 'westside-date-spots',
      title: 'Westside Date Spots',
      tagline: 'Candlelit rooms and ocean views',
      placeCount: 18,
      creatorName: 'Maria Chen',
      isCuratorPick: false,
      coverImageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=250&fit=crop',
    },
    {
      id: '2',
      slug: 'taco-trail-east-la',
      title: 'Taco Trail: East LA',
      tagline: 'Street vendors to sit-down classics',
      placeCount: 42,
      creatorName: 'Alex Ramirez',
      isCuratorPick: false,
      coverImageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=250&fit=crop',
    },
    {
      id: '3',
      slug: 'bakeries-worth-drive',
      title: 'Bakeries Worth the Drive',
      tagline: 'Croissants, sourdough, and pastry perfection',
      placeCount: 15,
      creatorName: 'Jenny Park',
      isCuratorPick: false,
      coverImageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=250&fit=crop',
    },
    {
      id: '4',
      slug: 'south-la-soul-food',
      title: 'South LA Soul Food',
      tagline: 'Comfort food with deep roots',
      placeCount: 31,
      creatorName: 'Saiko',
      isCuratorPick: true,
      coverImageUrl: 'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=400&h=250&fit=crop',
    },
  ]
}

function getCuratorPicks(): MapCardData[] {
  return [
    {
      id: '5',
      slug: 'essential-sgv',
      title: 'The Essential SGV',
      tagline: 'Dim sum, dumplings, and regional Chinese across the 626',
      placeCount: 53,
      creatorName: 'Saiko',
      isCuratorPick: true,
      featured: true,
      coverImageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&h=400&fit=crop',
    },
    {
      id: '6',
      slug: 'late-night-eats',
      title: 'Late Night Eats',
      tagline: 'Open past midnight when you need it most',
      placeCount: 24,
      creatorName: 'Saiko',
      isCuratorPick: true,
      coverImageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=250&fit=crop',
    },
    {
      id: '7',
      slug: 'best-coffee-silver-lake',
      title: 'Best Coffee in Silver Lake',
      tagline: 'Third wave pours and quiet corners',
      placeCount: 12,
      creatorName: 'Saiko',
      isCuratorPick: true,
      coverImageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=250&fit=crop',
    },
  ]
}

function getByNeighborhood(): MapCardData[] {
  return [
    {
      id: '8',
      slug: 'silver-lake-essentials',
      title: 'Silver Lake Essentials',
      tagline: 'Coffee, wine bars, and the best breakfast tacos',
      placeCount: 28,
      creatorName: 'Saiko',
      isCuratorPick: true,
      coverImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=250&fit=crop',
    },
    {
      id: '9',
      slug: 'echo-park-hangs',
      title: 'Echo Park Hangs',
      tagline: 'Lake views, late nights, and locals-only spots',
      placeCount: 19,
      creatorName: 'Saiko',
      isCuratorPick: true,
      coverImageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=250&fit=crop',
    },
    {
      id: '10',
      slug: 'highland-park-crawl',
      title: 'Highland Park Crawl',
      tagline: 'York Blvd classics and Figueroa gems',
      placeCount: 33,
      creatorName: 'Dan Torres',
      isCuratorPick: false,
      coverImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=250&fit=crop',
    },
    {
      id: '11',
      slug: 'dtla-after-dark',
      title: 'DTLA After Dark',
      tagline: 'Rooftop bars, speakeasies, and 2am noodles',
      placeCount: 41,
      creatorName: 'Lisa Wong',
      isCuratorPick: false,
      coverImageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=250&fit=crop',
    },
  ]
}
