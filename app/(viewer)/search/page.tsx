'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GlobalHeader } from '@/components/layouts/GlobalHeader';
import {
  BentoGrid,
  PlaceCard1x1,
  PlaceCard1x2,
  PlaceCard2x1,
  PlaceCardData,
} from '@/components/search-results';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [places, setPlaces] = useState<PlaceCardData[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setPlaces([]);
      setNeighborhoods([]);
      return;
    }

    setLoading(true);
    setError(null);

    // Get user location if available
    let userLat: number | null = null;
    let userLng: number | null = null;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLat = position.coords.latitude;
          userLng = position.coords.longitude;
          fetchResults();
        },
        () => {
          // Geolocation failed, fetch without location
          fetchResults();
        }
      );
    } else {
      fetchResults();
    }

    async function fetchResults() {
      try {
        const params = new URLSearchParams(query ? { q: query } : {});
        if (userLat && userLng) {
          params.append('lat', userLat.toString());
          params.append('lng', userLng.toString());
        }

        const response = await fetch(`/api/search?${params.toString()}`);
        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        setPlaces(data.places || []);
        setNeighborhoods(data.neighborhoods || []);
      } catch (e) {
        setError('Failed to load results');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  }, [query]);

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap"
        rel="stylesheet"
      />

      <GlobalHeader variant="default" />

      <div
        style={{
          minHeight: '100vh',
          background: '#F5F0E1',
          padding: '40px 20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ maxWidth: 900, margin: '0 auto 30px' }}>
          <h1
            style={{
              fontFamily: '"Libre Baskerville", Georgia, serif',
              fontSize: 24,
              fontStyle: 'italic',
              color: '#36454F',
              marginBottom: 8,
            }}
          >
            {query ? `Results for "${query}"` : 'Search'}
          </h1>

          {loading && (
            <p style={{ fontSize: 13, color: '#8B7355' }}>Loading...</p>
          )}

          {error && (
            <p style={{ fontSize: 13, color: '#D64541' }}>{error}</p>
          )}

          {!loading && !error && places.length === 0 && query && query.length >= 2 && (
            <p style={{ fontSize: 13, color: '#8B7355' }}>
              No results found for "{query}"
            </p>
          )}

          {!loading && places.length > 0 && (
            <p style={{ fontSize: 13, color: '#6B7F59' }}>
              {places.length} place{places.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>

        {/* Neighborhoods (if any) */}
        {neighborhoods.length > 0 && (
          <div style={{ maxWidth: 900, margin: '0 auto 20px' }}>
            <div
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: '#8B7355',
                marginBottom: 8,
              }}
            >
              Neighborhoods
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {neighborhoods.map((hood) => (
                <a
                  key={hood.slug}
                  href={`/neighborhood/${hood.slug}`}
                  style={{
                    padding: '8px 14px',
                    background: '#FFFDF7',
                    borderRadius: 6,
                    fontSize: 12,
                    color: '#36454F',
                    textDecoration: 'none',
                    border: '1px solid rgba(195, 176, 145, 0.3)',
                    transition: 'all 0.2s',
                  }}
                >
                  {hood.name} ({hood.count})
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Bento Grid Results */}
        {places.length > 0 && (
          <BentoGrid mode="search">
            {/* Priority Zone: First 4 results as 1×2 cards (equal weight) */}
            {places.slice(0, 4).map((place) => (
              <PlaceCard1x2 key={place.slug} place={place} />
            ))}

            {/* Remaining results: Mix of 2×1 and 1×1 for variety */}
            {places.slice(4).map((place, idx) => {
              // Alternate between 2×1 and 1×1 for visual rhythm
              if (idx % 3 === 2) {
                return <PlaceCard1x1 key={place.slug} place={place} />;
              }
              return <PlaceCard2x1 key={place.slug} place={place} />;
            })}
          </BentoGrid>
        )}

        {/* Empty state */}
        {!loading && !query && (
          <div
            style={{
              maxWidth: 900,
              margin: '60px auto',
              textAlign: 'center',
              color: '#8B7355',
            }}
          >
            <p style={{ fontSize: 14, fontStyle: 'italic' }}>
              Enter a search query to see results
            </p>
          </div>
        )}
      </div>
    </>
  );
}
