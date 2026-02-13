'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { GlobalHeader } from '@/components/layouts/GlobalHeader';
import { GlobalFooter } from '@/components/layouts/GlobalFooter';
import { HeroSection } from '@/components/merchant/HeroSection';
import { ActionStrip } from '@/components/merchant/ActionStrip';
import { GalleryLightbox } from '@/components/merchant/GalleryLightbox';
import { HoursCard } from '@/components/merchant/HoursCard';
import { CoverageCard } from '@/components/merchant/CoverageCard';
import { GalleryCard } from '@/components/merchant/GalleryCard';
import { CuratorCard } from '@/components/merchant/CuratorCard';
import { VibeCard } from '@/components/merchant/VibeCard';
import { DetailsCard } from '@/components/merchant/DetailsCard';
import { MapTitleBlock } from '@/components/map-cards/MapTitleBlock';
import { QuietCard } from '@/components/merchant/QuietCard';
import { SourcesCard } from '@/components/merchant/SourcesCard';

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
  googlePlacesAttributes?: {
    accessibility?: string[];
    service_options?: string[];
    highlights?: string[];
    popular_for?: string[];
    offerings?: string[];
    dining_options?: string[];
    amenities?: string[];
    atmosphere?: string[];
    crowd?: string[];
    planning?: string[];
    payments?: string[];
    children?: string[];
    parking?: string[];
    pets?: string[];
  } | null;
}

interface AppearsOnItem {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  creatorName: string;
  placeCount: number;
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

  // Helper: parse a time string like "5:00 PM" or "11:00\u202fPM" into minutes since midnight
  const parseTimeToMinutes = (timeStr: string): number | null => {
    const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*[\u2009\u202f ]*(AM|PM)/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Helper: extract open and close times from a range string like "5:00 – 11:00 PM"
  const extractTimeRange = (hoursStr: string | null | undefined): { openTime: string | null; closeTime: string | null } => {
    if (!hoursStr || hoursStr.toLowerCase().includes('closed')) return { openTime: null, closeTime: null };

    // Match range: "5:00 – 11:00 PM" or "5:00 AM – 11:00 PM"
    const rangeMatch = hoursStr.match(/(\d{1,2}:?\d{0,2})\s*(?:AM|PM)?\s*[\u2009\u202f ]*[–\-]\s*[\u2009\u202f ]*(\d{1,2}:?\d{0,2})\s*[\u2009\u202f ]*(AM|PM)/i);
    if (!rangeMatch) return { openTime: null, closeTime: null };

    const openRaw = rangeMatch[1];
    const closeRaw = rangeMatch[2];
    const closePeriod = rangeMatch[3];

    // Check if the opening time has its own AM/PM
    const withPeriod = hoursStr.match(/(\d{1,2}:?\d{0,2})\s*[\u2009\u202f ]*(AM|PM)\s*[\u2009\u202f ]*[–\-]/i);
    const openTime = withPeriod
      ? `${withPeriod[1]} ${withPeriod[2]}`
      : `${openRaw} ${closePeriod}`;
    const closeTime = `${closeRaw} ${closePeriod}`;

    return { openTime, closeTime };
  };

  const todayRow = fullWeek[todayIndex];
  const todayHours = todayRow?.hours ?? null;

  // Check for 24-hour operation
  const is24Hours = todayHours?.toLowerCase().includes('open 24 hours') ||
                    todayHours?.toLowerCase().includes('24 hours') ||
                    todayHours?.toLowerCase().includes('24/7');

  // Compute open/closed from current time vs today's hours range
  const { openTime: todayOpenTime, closeTime: todayCloseTime } = extractTimeRange(todayHours);

  let isOpen: boolean | null = null;
  if (is24Hours) {
    isOpen = true;
  } else if (todayHours?.toLowerCase().includes('closed')) {
    isOpen = false;
  } else if (todayOpenTime && todayCloseTime) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const openMin = parseTimeToMinutes(todayOpenTime);
    const closeMin = parseTimeToMinutes(todayCloseTime);
    if (openMin !== null && closeMin !== null) {
      if (closeMin > openMin) {
        // Normal range: e.g. 5 PM – 11 PM
        isOpen = nowMinutes >= openMin && nowMinutes < closeMin;
      } else {
        // Overnight range: e.g. 10 PM – 2 AM
        isOpen = nowMinutes >= openMin || nowMinutes < closeMin;
      }
    }
  }
  // Fallback to stale openNow if we couldn't compute
  if (isOpen === null) {
    if (typeof obj.openNow === 'boolean') {
      isOpen = obj.openNow;
    } else if (typeof (obj as { open_now?: boolean }).open_now === 'boolean') {
      isOpen = (obj as { open_now: boolean }).open_now;
    }
  }

  // Format close time
  let closesAt = todayCloseTime;
  if (closesAt) {
    closesAt = closesAt.replace(/(\d+):00/, '$1').replace(/\s+/g, ' ');
  }

  // Determine opens at time
  let opensAt = todayOpenTime;

  // If closed today, find next opening time
  if (!isOpen && (!opensAt || todayHours?.toLowerCase().includes('closed'))) {
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (todayIndex + i) % 7;
      const nextDayHours = fullWeek[nextDayIndex]?.hours;
      const { openTime: nextOpen } = extractTimeRange(nextDayHours);
      if (nextOpen) {
        opensAt = nextOpen;
        break;
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/places/${slug}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) setData(json.data);
      })
      .catch((err) => console.error('Failed to load place:', err))
      .finally(() => setLoading(false));
  }, [slug]);

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
  

  // --- Facts bucket (from Google Places attributes) ---
  const gpa = location.googlePlacesAttributes;
  const serviceOptions = gpa?.service_options ?? [];
  const parkingItems = gpa?.parking ?? [];
  const parkingNote = parkingItems.length > 0 ? parkingItems.join(', ') : null;
  const isAccessible = (gpa?.accessibility?.length ?? 0) > 0;

  // Reservations note
  const reservationsNote = location.reservationUrl
    ? 'Recommended'
    : gpa?.planning?.some(p => p.toLowerCase().includes('reservation'))
      ? 'Accepted'
      : null;

  // --- Vibes bucket (merge vibeTags + atmosphere + highlights + crowd) ---
  const vibeBucket = [
    ...(location.vibeTags ?? []),
    ...(gpa?.atmosphere ?? []),
    ...(gpa?.highlights ?? []),
    ...(gpa?.crowd ?? []),
  ];
  // Deduplicate (case-insensitive)
  const vibeTagsSeen = new Set<string>();
  const mergedVibeTags = vibeBucket.filter(tag => {
    const key = tag.toLowerCase();
    if (vibeTagsSeen.has(key)) return false;
    vibeTagsSeen.add(key);
    return true;
  });

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
            alignItems: 'start',
          }}
        >
          {/* Row 1: Hours + Details (Facts) */}
          <HoursCard
            todayHours={today}
            isOpen={isOpen}
            statusText={statusText}
            fullWeek={fullWeek}
            isIrregular={isIrregular}
            span={2}
          />

          {/* Facts card — highest hierarchy after hours */}
          <DetailsCard
            website={location.website}
            restaurantGroupName={location.restaurantGroup?.name}
            restaurantGroupSlug={location.restaurantGroup?.slug}
            serviceOptions={serviceOptions}
            reservationsNote={reservationsNote}
            parkingNote={parkingNote}
            isAccessible={isAccessible}
            offerings={gpa?.offerings ?? null}
            diningOptions={gpa?.dining_options ?? null}
            petsNote={gpa?.pets?.length ? gpa.pets.join(', ') : null}
            span={4}
          />

          {/* Row 2: Coverage + Sources */}
          {hasCoverage && (
            <CoverageCard
              pullQuote={location.pullQuote}
              pullQuoteSource={location.pullQuoteSource}
              pullQuoteAuthor={location.pullQuoteAuthor}
              pullQuoteUrl={location.pullQuoteUrl}
              sources={location.sources}
              vibeTag={location.vibeTags?.[0] || null}
              span={(location.sources?.length ?? 0) >= 2 ? 4 : 6}
            />
          )}

          {(location.sources?.length ?? 0) >= 2 && (
            <SourcesCard sources={location.sources!} span={hasCoverage ? 2 : 6} />
          )}

          {/* Row 3: Gallery + Curator + quiet fill */}
          {hasGallery && (
            <GalleryCard
              photos={location.photoUrls!.slice(1)} // Exclude hero
              onThumbnailClick={(idx) => openGallery(idx + 1)}
              span={hasCurator ? 3 : 6}
            />
          )}

          {hasCurator && (
            <CuratorCard
              note={location.curatorNote!}
              span={hasGallery ? 3 : 6}
            />
          )}

          {/* Vibes (merged: vibeTags + atmosphere + highlights + crowd) */}
          {mergedVibeTags.length > 0 && (
            <VibeCard vibeTags={mergedVibeTags} />
          )}

          {/* Also On — compact map cards */}
          {appearsOnDeduped.length > 0 && (
            <>
              <div style={{ gridColumn: 'span 6', fontSize: 9, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#C3B091', marginTop: 4 }}>
                ALSO ON
              </div>
              {appearsOnDeduped.map((item) => (
                <div key={item.id} style={{ gridColumn: `span ${appearsOnDeduped.length === 1 ? 6 : appearsOnDeduped.length === 2 ? 3 : 2}` }}>
                  <MapTitleBlock
                    compact
                    map={{
                      slug: item.slug,
                      title: item.title,
                      placeCount: item.placeCount || 0,
                      coverImageUrl: item.coverImageUrl ?? undefined,
                      authorType: 'user',
                      authorUsername: item.creatorName,
                    }}
                  />
                </div>
              ))}
            </>
          )}

          {/* Quiet card — fills bottom of grid */}
          <QuietCard
            neighborhood={location.neighborhood}
            category={location.category}
          />
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
