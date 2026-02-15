/**
 * Neighborhood Page - Shows ranked places for a specific neighborhood
 * 
 * Uses EOS (Editorial Ordering System) for transparent, rule-based ranking
 * - Only shows places meeting inclusion criteria (2+ sources / chef rec / Gold)
 * - Max 20 places (anti-infinite scroll)
 * - Diversity filter applied (max 3 consecutive same cuisine)
 * - Deterministic ordering (no engagement signals)
 */

import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireActiveCityId } from '@/lib/active-city';
import { getRankedPlacesForNeighborhood } from '@/lib/queries/ranked-places';
import { GlobalHeader } from '@/components/layouts/GlobalHeader';
import { GlobalFooter } from '@/components/layouts/GlobalFooter';
import { BentoGrid, PlaceCard1x2, PlaceCard2x1, PlaceCard1x1 } from '@/components/search-results';
import type { PlaceCardData } from '@/components/search-results';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function NeighborhoodPage({ params }: PageProps) {
  const { slug } = await params;
  const cityId = await requireActiveCityId();

  // Find neighborhood by slug
  const neighborhood = await db.neighborhoods.findFirst({
    where: {
      slug,
      cityId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    }
  });

  if (!neighborhood) {
    notFound();
  }

  // Fetch ranked places using EOS
  const rankedPlaces = await getRankedPlacesForNeighborhood(neighborhood.id, {
    maxPlaces: 20,
    maxConsecutive: 3,
  });

  // Transform to PlaceCardData format
  const places: PlaceCardData[] = rankedPlaces.map((place) => ({
    slug: place.slug,
    name: place.name,
    neighborhood: place.neighborhoodRel?.name || place.neighborhood || '',
    address: place.address || '',
    category: place.category || undefined,
    cuisineType: place.cuisineType || undefined,
    description: place.description || undefined,
    tagline: place.tagline || undefined,
    priceLevel: place.priceLevel || undefined,
    googlePhotos: place.googlePhotos as any,
    instagram: place.instagram || undefined,
    website: place.website || undefined,
    phone: place.phone || undefined,
    // Editorial provenance
    sources: place.coverages.map(c => c.source.name),
  }));

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
              fontSize: 28,
              fontStyle: 'italic',
              color: '#36454F',
              marginBottom: 8,
            }}
          >
            {neighborhood.name}
          </h1>

          <p style={{ fontSize: 13, color: '#6B7F59' }}>
            {places.length} curated place{places.length !== 1 ? 's' : ''}
          </p>

          <p style={{ fontSize: 11, color: '#8B7355', marginTop: 8, fontStyle: 'italic' }}>
            Ranked by editorial consensus • Max 20 places
          </p>
        </div>

        {/* Places Grid */}
        {places.length === 0 ? (
          <div
            style={{
              maxWidth: 900,
              margin: '60px auto',
              textAlign: 'center',
              color: '#8B7355',
            }}
          >
            <p style={{ fontSize: 14, fontStyle: 'italic' }}>
              No curated places yet for {neighborhood.name}
            </p>
            <p style={{ fontSize: 12, marginTop: 8 }}>
              Places appear here after meeting inclusion criteria (2+ editorial sources)
            </p>
          </div>
        ) : (
          <BentoGrid mode="search">
            {/* Priority Zone: First 4 results as 1×2 cards */}
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
      </div>

      <GlobalFooter variant="standard" />
    </>
  );
}
