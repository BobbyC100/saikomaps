'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { GlobalHeader } from '@/components/layouts/GlobalHeader';
import { GlobalFooter } from '@/components/layouts/GlobalFooter';
import { HeroSection } from '@/components/merchant/HeroSection';
import { GalleryLightbox } from '@/components/merchant/GalleryLightbox';
import { MerchantGrid } from './components/MerchantGrid';
import { parseHours } from './lib/parseHours';

interface EditorialSource {
  source_id?: string;
  publication?: string;
  title?: string;
  url: string;
  published_at?: string;
  trust_level?: string;
  content?: string;
  name?: string;
  excerpt?: string;
}

interface LocationData {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  description: string | null;
  category: string | null;
  neighborhood: string | null;
  cuisineType?: string | null;
  priceLevel: number | null;
  photoUrl: string | null;
  photoUrls?: string[];
  hours: unknown;
  googlePlaceId: string | null;
  googleMapsUri?: string | null;
  curatorNote?: string | null;
  curatorCreatorName?: string | null;
  sources?: EditorialSource[];
  vibeTags?: string[] | null;
  tips?: string[] | null;
  tagline?: string | null;
  pullQuote?: string | null;
  pullQuoteSource?: string | null;
  pullQuoteAuthor?: string | null;
  pullQuoteUrl?: string | null;
  pullQuoteType?: string | null;
  // Decision Onset System
  intentProfile?: string | null;
  intentProfileOverride?: boolean;
  reservationUrl?: string | null;
  slug?: string;
  restaurantGroup?: {
    name: string;
    slug: string;
  } | null;
  // Markets UI Gating
  placeType?: 'venue' | 'activity' | 'public';
  categorySlug?: string | null;
  marketSchedule?: any | null;
}

interface AppearsOnItem {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  creatorName: string;
  description?: string | null;
  placeCount?: number;
  authorType?: 'saiko' | 'user';
}

interface PlacePageData {
  location: LocationData;
  guide: { id: string; title: string; slug: string; creatorName: string } | null;
  appearsOn: AppearsOnItem[];
  isOwner: boolean;
}

export default function PlacePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<PlacePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'not-found' | 'server-error' | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/places/${slug}`, {
      cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'default',
      headers:
        process.env.NODE_ENV === 'development'
          ? { 'Cache-Control': 'no-cache' }
          : undefined,
    })
      .then(async (res) => {
        if (res.status === 404) {
          setError('not-found');
          return null;
        }
        if (!res.ok) {
          setError('server-error');
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json?.success && json.data) {
          setData(json.data);
        } else if (json === null) {
          // Error already set above
        } else {
          setError('not-found');
        }
      })
      .catch((err) => {
        console.error('Failed to load place:', err);
        setError('server-error');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // Share handler
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.location.name || 'Saiko Maps',
          text: data?.location.tagline || `Check out ${data?.location.name}`,
          url: window.location.href,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E1' }}>
        <GlobalHeader variant="immersive" onShare={handleShare} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-12 h-12 border-4 border-[#C3B091] border-t-transparent rounded-full animate-spin mx-auto mb-4"
            />
            <p style={{ color: '#36454F', opacity: 0.7 }}>Loading place details...</p>
          </div>
        </main>
        <GlobalFooter variant="minimal" />
      </div>
    );
  }

  // Error states
  if (error === 'not-found') {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E1' }}>
        <GlobalHeader variant="immersive" onShare={handleShare} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <h1 className="text-[#36454F] text-2xl font-semibold mb-3">Place Not Found</h1>
            <p className="text-[#36454F] opacity-70 mb-6">
              We couldn't find a place with the slug "{slug}". It may have been removed or the link might be incorrect.
            </p>
            <Link 
              href="/" 
              className="inline-block px-6 py-3 bg-[#C3B091] text-white rounded-lg hover:bg-[#B39F7F] transition-colors"
            >
              Browse Maps
            </Link>
          </div>
        </main>
        <GlobalFooter variant="minimal" />
      </div>
    );
  }

  if (error === 'server-error') {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E1' }}>
        <GlobalHeader variant="immersive" onShare={handleShare} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <h1 className="text-[#36454F] text-2xl font-semibold mb-3">Something Went Wrong</h1>
            <p className="text-[#36454F] opacity-70 mb-6">
              We encountered an error loading this place. Please try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-block px-6 py-3 bg-[#C3B091] text-white rounded-lg hover:bg-[#B39F7F] transition-colors"
            >
              Try Again
            </button>
          </div>
        </main>
        <GlobalFooter variant="minimal" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E1' }}>
        <GlobalHeader variant="immersive" onShare={handleShare} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[#36454F] text-lg mb-2">Place not found</p>
            <Link href="/" className="text-[#C3B091] hover:underline">
              Return to homepage
            </Link>
          </div>
        </main>
        <GlobalFooter variant="minimal" />
      </div>
    );
  }

  const { location } = data;
  const photoUrls = location.photoUrls ?? (location.photoUrl ? [location.photoUrl] : []);
  const { isOpen, statusText } = parseHours(location.hours);
  const priceSymbol = location.priceLevel
    ? '$'.repeat(Math.min(location.priceLevel, 4))
    : null;

  const openGallery = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div style={{ background: '#F5F0E1', minHeight: '100vh' }}>
      <GlobalHeader variant="immersive" onShare={handleShare} />

      <main style={{ maxWidth: 720, margin: '0 auto' }}>
        <HeroSection
          name={location.name}
          category={location.category}
          neighborhood={location.neighborhood}
          price={priceSymbol}
          isOpen={isOpen}
          statusText={statusText}
          photoUrl={photoUrls[0] ?? null}
          photoCount={photoUrls.length}
          onHeroClick={() => openGallery(0)}
          onShareClick={handleShare}
          hours={location.hours}
        />

        <MerchantGrid
          location={{
            id: location.id,
            name: location.name,
            slug: location.slug,
            address: location.address,
            latitude: location.latitude ? Number(location.latitude) : null,
            longitude: location.longitude ? Number(location.longitude) : null,
            category: location.category,
            neighborhood: location.neighborhood,
            tagline: location.tagline,
            description: location.description,
            photoUrls: location.photoUrls,
            vibeTags: location.vibeTags,
            curatorNote: location.curatorNote,
            pullQuote: location.pullQuote,
            pullQuoteSource: location.pullQuoteSource,
            hours: location.hours,
            cuisineType: location.cuisineType,
            tips: location.tips,
            priceLevel: location.priceLevel,
            sources: location.sources,
            instagram: location.instagram,
            phone: location.phone,
          }}
          onOpenGallery={openGallery}
        />
      </main>

      {lightboxOpen && photoUrls.length > 0 && (
        <GalleryLightbox
          photos={photoUrls}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <GlobalFooter variant="minimal" />
    </div>
  );
}
