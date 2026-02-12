'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { GlobalHeader } from '@/components/layouts/GlobalHeader';
import { GlobalFooter } from '@/components/layouts/GlobalFooter';
import { HeroSection } from '@/components/merchant/HeroSection';
import { ActionStrip } from '@/components/merchant/ActionStrip';
import { GalleryLightbox } from '@/components/merchant/GalleryLightbox';
import { HoursCard } from '@/components/merchant/HoursCard';
import { DetailsCard } from '@/components/merchant/DetailsCard';
import { CoverageCard } from '@/components/merchant/CoverageCard';
import { GalleryCard } from '@/components/merchant/GalleryCard';
import { CuratorCard } from '@/components/merchant/CuratorCard';
import { VibeCard } from '@/components/merchant/VibeCard';
import { AlsoOnCard } from '@/components/merchant/AlsoOnCard';

interface EditorialSource {
  source_id?: string;
  publication?: string;
  title?: string;
  url: string;
  published_at?: string;
  trust_level?: string;
  content?: string;
  // Legacy fields (old format)
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
}

interface AppearsOnItem {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  creatorName: string;
}

interface PlacePageData {
  location: LocationData;
  guide: { id: string; title: string; slug: string; creatorName: string } | null;
  appearsOn: AppearsOnItem[];
  isOwner: boolean;
}

function parseHours(hours: unknown): {
  today: string | null;
  isOpen: boolean | null;
  closesAt: string | null;
  opensAt: string | null;
  fullWeek: Array<{ day: string; short: string; hours: string }>;
  isIrregular: boolean;
} {
  const empty = { today: null, isOpen: null, closesAt: null, opensAt: null, fullWeek: [], isIrregular: false };
  if (!hours || (typeof hours === 'object' && !Object.keys(hours as object).length))
    return empty;

  const obj =
    typeof hours === 'string'
      ? (() => {
          try {
            return JSON.parse(hours);
          } catch {
            return null;
          }
        })()
      : (hours as Record<string, unknown>);
  if (!obj) return empty;

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortNames = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  // Parse full week
  const fullWeek: Array<{ day: string; short: string; hours: string }> = [];
  const weekdayText = (obj.weekday_text ?? obj.weekdayText) as string[] | undefined;
  
  // Check for irregular hours indicators
  const irregularPatterns = /by appointment|seasonal|varies|call ahead|check website|irregular/i;
  let isIrregular = false;
  
  if (weekdayText?.length) {
    for (let i = 0; i < weekdayText.length; i++) {
      const line = weekdayText[i] ?? '';
      if (irregularPatterns.test(line)) {
        isIrregular = true;
      }
      const match = line.match(/:\s*(.+)$/);
      fullWeek.push({
        day: dayNames[i] ?? '',
        short: shortNames[i] ?? '',
        hours: match ? match[1].trim() : line,
      });
    }
  } else {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    fullWeek.push(...days.map((day, idx) => {
      const dayHours = (obj[day] as string) || 'Closed';
      if (irregularPatterns.test(dayHours)) {
        isIrregular = true;
      }
      return {
        day: dayNames[idx] ?? '',
        short: shortNames[idx] ?? '',
        hours: dayHours,
      };
    }));
  }

  // If all days are irregular or missing proper hours format, mark as irregular
  const validHoursCount = fullWeek.filter(row => 
    row.hours !== 'Closed' && 
    /\d{1,2}/.test(row.hours) && 
    !irregularPatterns.test(row.hours)
  ).length;
  
  if (validHoursCount < 3) {
    isIrregular = true;
  }

  // Determine if open
  let isOpen: boolean | null = null;
  if (typeof obj.openNow === 'boolean') {
    isOpen = obj.openNow;
  } else if (typeof (obj as { open_now?: boolean }).open_now === 'boolean') {
    isOpen = (obj as { open_now: boolean }).open_now;
  } else {
    const todayRow = fullWeek[todayIndex];
    const todayHours = todayRow?.hours ?? null;
    isOpen = todayHours ? !todayHours.toLowerCase().includes('closed') : null;
  }

  // Extract close time from today's hours
  const todayRow = fullWeek[todayIndex];
  const todayHours = todayRow?.hours ?? null;
  
  // Check for 24-hour operation
  const is24Hours = todayHours?.toLowerCase().includes('open 24 hours') || 
                    todayHours?.toLowerCase().includes('24 hours') ||
                    todayHours?.toLowerCase().includes('24/7');
  
  const closeMatch = !is24Hours ? todayHours?.match(/[–-]\s*(\d{1,2}:?\d{0,2}\s*(?:AM|PM))/i) : null;
  let closesAt = closeMatch ? closeMatch[1].trim() : (is24Hours ? null : null);
  
  // Format close time to match "11 PM" style
  if (closesAt) {
    closesAt = closesAt.replace(/(\d+):00/, '$1').replace(/\s+/g, ' ');
  }

  // Extract open time (for when closed)
  const openMatch = todayHours?.match(/(\d{1,2}:?\d{0,2}\s*(?:AM|PM))\s*[–-]/i);
  let opensAt = openMatch ? openMatch[1].trim() : null;
  
  // If closed today, find next opening time
  if (!isOpen && (!opensAt || todayHours?.toLowerCase().includes('closed'))) {
    // Look for next day that's open
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (todayIndex + i) % 7;
      const nextDayHours = fullWeek[nextDayIndex]?.hours;
      if (nextDayHours && !nextDayHours.toLowerCase().includes('closed')) {
        const nextOpenMatch = nextDayHours.match(/(\d{1,2}:?\d{0,2}\s*(?:AM|PM))/i);
        if (nextOpenMatch) {
          opensAt = nextOpenMatch[1].trim();
          break;
        }
      }
    }
  }
  
  // Format open time
  if (opensAt) {
    opensAt = opensAt.replace(/(\d+):00/, '$1').replace(/\s+/g, ' ');
  }

  return { today: todayHours, isOpen, closesAt, opensAt, fullWeek, isIrregular };
}

function normalizeInstagram(handle: string | null | undefined): string | null {
  if (!handle) return null;
  let s = handle.trim();
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
  s = s.replace(/^@/, '');
  return s || null;
}

export default function PlacePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<PlacePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const loadPlace = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setFetchError(null);
    fetch(`/api/places/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'not_found' : 'server_error');
        return res.json();
      })
      .then((json) => {
        if (json.success && json.data) setData(json.data);
      })
      .catch((err) => {
        console.error('Failed to load place:', err);
        setFetchError(err.message === 'not_found' ? 'not_found' : 'server_error');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    loadPlace();
  }, [loadPlace]);

  // Gallery handlers
  const openGallery = (index: number = 0) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

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

  if (fetchError === 'server_error') {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E1' }}>
        <GlobalHeader variant="immersive" onShare={handleShare} />
        <main className="flex-1 flex items-center justify-center">
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#36454F', marginBottom: '8px' }}>
              Something went wrong
            </div>
            <p style={{ fontSize: '14px', color: '#8B7355', marginBottom: '24px', maxWidth: '320px' }}>
              We couldn't load this place. Please try again.
            </p>
            <button
              onClick={loadPlace}
              style={{
                padding: '10px 24px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#F5F0E1',
                background: '#36454F',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
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
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div
              style={{
                fontSize: '48px',
                fontFamily: 'var(--font-libre), Georgia, serif',
                fontStyle: 'italic',
                color: '#C3B091',
                marginBottom: '8px',
              }}
            >
              404
            </div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#36454F', marginBottom: '8px' }}>
              Place not found
            </div>
            <p style={{ fontSize: '14px', color: '#8B7355', marginBottom: '24px', maxWidth: '320px' }}>
              This place may have been removed or doesn't exist.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Link
                href="/"
                style={{
                  padding: '10px 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#F5F0E1',
                  background: '#36454F',
                  borderRadius: '6px',
                  textDecoration: 'none',
                }}
              >
                Go Home
              </Link>
              <Link
                href="/explore"
                style={{
                  padding: '10px 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#36454F',
                  background: 'transparent',
                  border: '1px solid #C3B091',
                  borderRadius: '6px',
                  textDecoration: 'none',
                }}
              >
                Explore Maps
              </Link>
            </div>
          </div>
        </main>
        <GlobalFooter variant="minimal" />
      </div>
    );
  }

  const { location, appearsOn } = data;
  const { today, isOpen, closesAt, opensAt, fullWeek, isIrregular } = parseHours(location.hours);
  const instagramHandle = normalizeInstagram(location.instagram);

  // Extract Instagram from website field if direct field is empty
  let finalInstagramHandle = instagramHandle;
  if (!finalInstagramHandle && location.website?.includes('instagram.com')) {
    const match = location.website.match(/instagram\.com\/([^\/\?]+)/);
    if (match && match[1]) {
      finalInstagramHandle = match[1];
    }
  }

  // Price symbol
  const priceSymbol = location.priceLevel
    ? '$'.repeat(Math.min(location.priceLevel, 3))
    : null;

  // Status text
  const statusText = isOpen
    ? `Open${closesAt ? ` · Closes ${closesAt}` : ''}`
    : `Closed${opensAt ? ` · Opens ${opensAt}` : ''}`;

  // Graceful degradation checks
  const hasCoverage = (() => {
    // Has pull quote?
    if (location.pullQuote?.trim()) return true;
    
    // Has source with actual content (full article)?
    const firstSource = location.sources?.[0];
    if (firstSource?.content && firstSource.content.length >= 100) {
      return true; // CoverageCard will extract quote from content
    }
    
    // Has valid excerpt? (not just metadata)
    if (firstSource?.excerpt) {
      const excerpt = firstSource.excerpt || '';
      const sourceName = firstSource.publication || firstSource.name || '';
      
      // Valid excerpt must be at least 50 chars and not just source name
      const isValidExcerpt = excerpt.length >= 50 && 
        !(sourceName && excerpt.toLowerCase().includes(sourceName.toLowerCase()));
      
      if (isValidExcerpt) return true;
    }
    
    return false;
  })();
  const hasCurator = !!location.curatorNote?.trim();
  const hasGallery = (location.photoUrls?.length ?? 0) > 1; // More than just hero
  

  // Service options — awaiting Google Places fields (delivery, takeout, dineIn)
  const serviceOptions: string[] = [];

  // Reservations note
  const reservationsNote = location.reservationUrl
    ? 'Recommended'
    : null;

  // Deduplicate appearsOn by slug, max 3
  const seenSlugs = new Set<string>();
  const appearsOnDeduped = appearsOn
    .filter((item) => {
      if (seenSlugs.has(item.slug)) return false;
      seenSlugs.add(item.slug);
      return true;
    })
    .slice(0, 3);

  return (
    <div style={{ background: '#F5F0E1', minHeight: '100vh' }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap"
        rel="stylesheet"
      />

      <GlobalHeader variant="immersive" onShare={handleShare} />

      <main style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Hero Section */}
        <HeroSection
          name={location.name}
          category={location.category}
          neighborhood={location.neighborhood}
          price={priceSymbol}
          isOpen={isOpen}
          statusText={statusText}
          photoUrl={location.photoUrls?.[0] || null}
          photoCount={location.photoUrls?.length || 0}
          onHeroClick={() => openGallery(0)}
          onShareClick={handleShare}
          hours={location.hours}
        />

        {/* Action Strip */}
        <ActionStrip
          latitude={location.latitude ? Number(location.latitude) : null}
          longitude={location.longitude ? Number(location.longitude) : null}
          phone={location.phone}
          instagram={finalInstagramHandle}
        />

        {/* Bento Grid */}
        <div
          style={{
            padding: '16px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 12,
          }}
        >
          {/* Row 1: Hours (2) + Details (4) OR Hours (6) */}
          <HoursCard
            todayHours={today}
            isOpen={isOpen}
            statusText={statusText}
            fullWeek={fullWeek}
            isIrregular={isIrregular}
            span={2}
          />

          <DetailsCard
            address={location.address}
            neighborhood={location.neighborhood}
            website={location.website}
            restaurantGroupName={location.restaurantGroup?.name}
            restaurantGroupSlug={location.restaurantGroup?.slug}
            serviceOptions={serviceOptions}
            reservationsNote={reservationsNote}
            span={4}
          />

          {/* Row 2: Coverage (3-5) */}
          {hasCoverage && (
            <CoverageCard
              pullQuote={location.pullQuote}
              pullQuoteSource={location.pullQuoteSource}
              pullQuoteAuthor={location.pullQuoteAuthor}
              pullQuoteUrl={location.pullQuoteUrl}
              sources={location.sources}
              vibeTag={location.vibeTags?.[0] || null}
            />
          )}

          {/* Row 3: Gallery (3 or 6) + Curator (3) */}
          {hasGallery && (
            <GalleryCard
              photos={location.photoUrls!.slice(1)} // Exclude hero
              placeName={location.name}
              onThumbnailClick={(idx) => openGallery(idx + 1)}
              span={hasCurator ? 3 : 6}
            />
          )}

          {hasCurator && (
            <CuratorCard 
              note={location.curatorNote!} 
              span={3}
            />
          )}

          {/* Row 4: Vibe (6) */}
          {location.vibeTags && location.vibeTags.length > 0 && (
            <VibeCard vibeTags={location.vibeTags} />
          )}

          {/* Row 5: Also On (6) */}
          {appearsOnDeduped.length > 0 && (
            <AlsoOnCard maps={appearsOnDeduped} />
          )}
        </div>
      </main>

      <GlobalFooter variant="minimal" />

      {/* Gallery Lightbox */}
      {lightboxOpen && location.photoUrls && (
        <GalleryLightbox
          photos={location.photoUrls}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
