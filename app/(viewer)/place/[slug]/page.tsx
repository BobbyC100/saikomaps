'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Instagram, MapPin, Globe, Phone } from 'lucide-react';
import { GlobalHeader } from '@/components/layouts/GlobalHeader';
import { GlobalFooter } from '@/components/layouts/GlobalFooter';
import styles from './place.module.css';


interface EditorialSource {
  source_id?: string;
  publication: string;
  title: string;
  url: string;
  published_at?: string;
  trust_level?: string;
  content?: string;
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
  fullWeek: Array<{ day: string; short: string; hours: string }>;
} {
  const empty = { today: null, isOpen: null, closesAt: null, fullWeek: [] };
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

  // Prefer openNow when available (Google Places, timezone-aware)
  if (typeof obj.openNow === 'boolean') {
    const fullWeek: Array<{ day: string; short: string; hours: string }> = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const shortNames = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    const weekdayText = (obj.weekday_text ?? obj.weekdayText) as string[] | undefined;
    if (weekdayText?.length) {
      for (let i = 0; i < weekdayText.length; i++) {
        const line = weekdayText[i] ?? '';
        const match = line.match(/:\s*(.+)$/);
        fullWeek.push({
          day: dayNames[i] ?? '',
          short: shortNames[i] ?? '',
          hours: match ? match[1].trim() : line,
        });
      }
    }
    const todayRow = fullWeek[todayIndex];
    const todayHours = todayRow?.hours ?? null;
    const closeMatch = todayHours?.match(/[–-]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)|[\d:]+\s*(?:AM|PM))/i);
    return {
      today: todayHours,
      isOpen: obj.openNow,
      closesAt: closeMatch ? closeMatch[1] : null,
      fullWeek,
    };
  }
  if (typeof (obj as { open_now?: boolean }).open_now === 'boolean') {
    const fullWeek: Array<{ day: string; short: string; hours: string }> = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const shortNames = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    const weekdayText = (obj.weekday_text ?? obj.weekdayText) as string[] | undefined;
    if (weekdayText?.length) {
      for (let i = 0; i < weekdayText.length; i++) {
        const line = weekdayText[i] ?? '';
        const match = line.match(/:\s*(.+)$/);
        fullWeek.push({
          day: dayNames[i] ?? '',
          short: shortNames[i] ?? '',
          hours: match ? match[1].trim() : line,
        });
      }
    }
    const todayRow = fullWeek[todayIndex];
    const todayHours = todayRow?.hours ?? null;
    const closeMatch = todayHours?.match(/[–-]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)|[\d:]+\s*(?:AM|PM))/i);
    return {
      today: todayHours,
      isOpen: (obj as { open_now: boolean }).open_now,
      closesAt: closeMatch ? closeMatch[1] : null,
      fullWeek,
    };
  }

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortNames = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  let fullWeek: Array<{ day: string; short: string; hours: string }> = [];

  const weekdayTextArr = (obj.weekday_text ?? obj.weekdayText) as string[] | undefined;
  if (Array.isArray(weekdayTextArr) && weekdayTextArr.length) {
    fullWeek = weekdayTextArr.map((line, idx) => {
      const match = line.match(/:\s*(.+)$/);
      return {
        day: dayNames[idx] ?? '',
        short: shortNames[idx] ?? '',
        hours: match ? match[1].trim() : line,
      };
    });
  } else {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    fullWeek = days.map((day, idx) => ({
      day: dayNames[idx],
      short: shortNames[idx],
      hours: (obj[day] as string) || 'Closed',
    }));
  }

  const todayRow = fullWeek[todayIndex];
  const todayHours = todayRow?.hours ?? null;
  const isOpen = todayHours ? !todayHours.toLowerCase().includes('closed') : null;
  const closeMatch = todayHours?.match(
    /[–-]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)|[\d:]+\s*(?:AM|PM))/i
  );
  const closesAt = closeMatch ? closeMatch[1] : null;

  return { today: todayHours, isOpen, closesAt, fullWeek };
}

function normalizeInstagram(handle: string | null | undefined): string | null {
  if (!handle) return null;
  let s = handle.trim();
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
  s = s.replace(/^@/, '');
  return s || null;
}

/** Extract excerpt from first source (quote + provenance) */
function getExcerpt(sources: EditorialSource[] | undefined): string | null {
  const src = sources?.[0];
  if (!src?.content && !src?.publication) return null;
  const quote = src.content
    ? src.content.slice(0, 120).replace(/\s+\S*$/, '') + (src.content.length > 120 ? '…' : '')
    : null;
  const pub = src.publication || 'Source';
  return quote ? `"${quote}" — ${pub}` : null;
}

export default function PlacePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<PlacePageData | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F4F2' }}>
        <GlobalHeader variant="immersive" />
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
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F4F2' }}>
        <GlobalHeader variant="immersive" />
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
  const { today, isOpen, closesAt, fullWeek } = parseHours(location.hours);
  const hasCuratorNote = !!location.curatorNote?.trim();
  const hasPhotos = (location.photoUrls?.length ?? 0) > 0;
  const hasSources = (location.sources?.length ?? 0) > 0;
  const excerpt = getExcerpt(location.sources);
  const isSparse = !hasCuratorNote && !hasPhotos && !hasSources;
  const instagramHandle = normalizeInstagram(location.instagram);
  const curatorName = location.curatorCreatorName || data.guide?.creatorName || appearsOn[0]?.creatorName;

  const directionsUrl =
    location.latitude && location.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`
      : location.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`
        : null;

  const addressShort =
    location.address?.replace(/,\s*USA$/i, '').trim() ||
    (location.neighborhood ? `${location.neighborhood}` : null);
  // Split address for map card: street line + city/state/zip line
  const addressLines = addressShort
    ? (() => {
        const parts = addressShort.split(/,\s*/);
        if (parts.length >= 2) {
          return { line1: parts[0]!.trim(), line2: parts.slice(1).join(', ').trim() };
        }
        return { line1: addressShort, line2: null };
      })()
    : null;

  const vibeTag = location.category ?? null;
  const hasFullWeekHours = fullWeek.length > 0;
  const hasOnlyOpenNow = isOpen !== null && fullWeek.length === 0;
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const primaryMapSlug = appearsOn[0]?.slug ?? null;
  const viewOnMapUrl = primaryMapSlug ? `/map/${primaryMapSlug}?place=${slug}` : null;
  // Also On: dedupe by slug, max 3
  const appearsOnDeduped = Array.from(
    new Map(appearsOn.map((item) => [item.slug, item])).values()
  ).slice(0, 3);

  // Gallery: exclude hero image, show only additional photos
  const heroPhotoUrl = location.photoUrls?.[0] ?? null;
  const galleryPhotos = (location.photoUrls ?? []).slice(1);
  const hasGallery = galleryPhotos.length > 0;

  // Action cards: Website | Directions | Instagram (three equal cards)
  const actionCards: Array<{ type: 'website' | 'instagram' | 'directions' | 'call'; href: string; label: string; detail: string }> = [];
  
  // Website - use actual website or fall back to constructed Google Maps URI
  const websiteUrl = location.website && !location.website.includes('instagram.com') 
    ? location.website 
    : (location.googleMapsUri || 
       (location.googlePlaceId ? `https://www.google.com/maps/place/?q=place_id:${location.googlePlaceId}` : null));
    
  if (websiteUrl) {
    let websiteDetail = websiteUrl;
    try {
      const url = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
      websiteDetail = url.hostname.replace(/^www\./, '');
    } catch {
      // If URL parsing fails, just clean up the string
      websiteDetail = websiteUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] || websiteUrl;
    }
    actionCards.push({
      type: 'website',
      href: websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`,
      label: 'Website',
      detail: websiteDetail,
    });
  }
  
  // Directions
  if (directionsUrl) {
    actionCards.push({
      type: 'directions',
      href: directionsUrl,
      label: 'Directions',
      detail: addressShort?.split(',')[0] ?? 'Open in Maps',
    });
  }
  
  // Instagram - handle both the instagram field and check if website is actually instagram
  let finalInstagramHandle = instagramHandle;
  if (!finalInstagramHandle && location.website?.includes('instagram.com')) {
    // Extract handle from instagram URL in website field
    const match = location.website.match(/instagram\.com\/([^\/\?]+)/);
    if (match && match[1]) {
      finalInstagramHandle = match[1];
    }
  }
  
  // Always add Instagram card - if no handle, link to Instagram search
  if (finalInstagramHandle) {
    actionCards.push({
      type: 'instagram',
      href: `https://instagram.com/${finalInstagramHandle}`,
      label: 'Instagram',
      detail: `@${finalInstagramHandle}`,
    });
  } else {
    // No Instagram handle - create search link using business name
    const searchQuery = encodeURIComponent(location.name);
    actionCards.push({
      type: 'instagram',
      href: `https://www.instagram.com/explore/search/keyword/?q=${searchQuery}`,
      label: 'Instagram',
      detail: 'Search on Instagram',
    });
  }

  return (
    <div
      className={`min-h-screen flex flex-col ${styles.merchantPage} ${isSparse ? styles.sparse : ''}`}
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#F5F0E1',
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap"
        rel="stylesheet"
      />
      <GlobalHeader variant="immersive" />
      <main className="flex-1 flex justify-center pt-8 pb-3 px-4">
        <div style={{ maxWidth: '720px', width: '100%' }}>
          {/* Hero + Meta */}
          <div
            style={{
              backgroundColor: '#FFFDF7',
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                height: 180,
                background: 'linear-gradient(135deg, #EDE8D8 0%, #E2DCC8 100%)',
                position: 'relative',
              }}
            >
              {hasPhotos ? (
                <img
                  src={location.photoUrls![0]}
                  alt={location.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 48,
                    fontFamily: '"Libre Baskerville", serif',
                    fontStyle: 'italic',
                    color: 'rgba(195,176,145,0.5)',
                  }}
                >
                  {location.name.charAt(0)}
                </div>
              )}
            </div>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(195,176,145,0.15)' }}>
              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 400,
                  fontFamily: '"Libre Baskerville", serif',
                  fontStyle: 'italic',
                  color: '#36454F',
                  margin: '0 0 8px',
                  lineHeight: 1.2,
                }}
              >
                {location.name}
              </h1>
              {/* Meta row — same pattern as cards: Category · Neighborhood · Cuisine · Price · ● Open */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                }}
              >
                <span style={{ color: '#6B7F59' }}>{location.category ?? 'Place'}</span>
                {location.neighborhood && (
                  <>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#C3B091', flexShrink: 0 }} />
                    <span style={{ color: '#C3B091' }}>{location.neighborhood}</span>
                  </>
                )}
                {location.cuisineType && (
                  <>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#C3B091', flexShrink: 0 }} />
                    <span style={{ color: '#C3B091' }}>{location.cuisineType}</span>
                  </>
                )}
                {location.priceLevel != null && location.priceLevel >= 1 && (
                  <>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#C3B091', flexShrink: 0 }} />
                    <span style={{ color: '#C3B091', letterSpacing: '0.5px' }}>
                      {'$'.repeat(Math.min(4, location.priceLevel))}
                    </span>
                  </>
                )}
                {isOpen !== null && (
                  <>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#C3B091', flexShrink: 0 }} />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: isOpen ? '#4A7C59' : 'rgba(54,69,79,0.4)',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 9,
                          letterSpacing: '0.5px',
                          fontWeight: 600,
                          color: isOpen ? '#4A7C59' : 'rgba(54,69,79,0.6)',
                        }}
                      >
                        {isOpen ? 'Open' : 'Closed'}
                      </span>
                      {closesAt && isOpen && (
                        <span style={{ fontSize: 10, color: 'rgba(54,69,79,0.6)', fontWeight: 400 }}>
                          {' '}· {closesAt}
                        </span>
                      )}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bento Grid */}
          <div className={styles.bentoGrid}>
            {/* Action Cards: Website | Instagram | Directions (3 equal cards) */}
            {actionCards.length > 0 && (
              <div className={styles.actionCardsRow}>
                {actionCards.map((card) => (
                  <a
                    key={card.type}
                    href={card.href}
                    target={card.type === 'website' || card.type === 'instagram' ? '_blank' : undefined}
                    rel={card.type === 'website' || card.type === 'instagram' ? 'noopener noreferrer' : undefined}
                    className={styles.actionCard}
                  >
                    <span className={styles.actionIcon}>
                      {card.type === 'website' && <Globe size={20} strokeWidth={1.5} />}
                      {card.type === 'instagram' && <Instagram size={20} strokeWidth={1.5} />}
                      {card.type === 'directions' && <MapPin size={20} strokeWidth={1.5} />}
                    </span>
                    <span className={styles.actionLabel}>{card.label}</span>
                    <span className={styles.actionDetail}>{card.detail}</span>
                  </a>
                ))}
              </div>
            )}

            {/* Tier 1 — Row 4: Photo gallery bento collage */}
            {hasGallery && (
              <div className={`${styles.bentoBlock} ${styles.span6}`} style={{ padding: 8 }}>
                {galleryPhotos.length === 1 ? (
                  <div className={styles.galleryBento1}>
                    <div className={styles.galleryPhoto} style={{ backgroundImage: `url(${galleryPhotos[0]})` }} />
                  </div>
                ) : galleryPhotos.length === 2 ? (
                  <div className={styles.galleryBento2}>
                    <div className={styles.galleryPhoto} style={{ backgroundImage: `url(${galleryPhotos[0]})` }} />
                    <div className={styles.galleryPhoto} style={{ backgroundImage: `url(${galleryPhotos[1]})` }} />
                  </div>
                ) : galleryPhotos.length === 3 ? (
                  <div className={styles.galleryBento3}>
                    <div className={`${styles.galleryPhoto} ${styles.galleryPhotoHero}`} style={{ backgroundImage: `url(${galleryPhotos[0]})` }} />
                    <div className={styles.galleryPhoto} style={{ backgroundImage: `url(${galleryPhotos[1]})` }} />
                    <div className={styles.galleryPhoto} style={{ backgroundImage: `url(${galleryPhotos[2]})` }} />
                  </div>
                ) : (
                  <div className={styles.galleryBento4}>
                    <div className={`${styles.galleryPhoto} ${styles.galleryPhotoHero}`} style={{ backgroundImage: `url(${galleryPhotos[0]})` }} />
                    <div className={styles.galleryPhoto} style={{ backgroundImage: `url(${galleryPhotos[1]})` }} />
                    <div className={styles.galleryPhoto} style={{ backgroundImage: `url(${galleryPhotos[2]})` }} />
                    <div className={`${styles.galleryPhoto} ${styles.galleryOverflow}`} style={{ backgroundImage: `url(${galleryPhotos[3]})` }}>
                      <span className={styles.galleryOverflowCount}>+{galleryPhotos.length - 3}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tier 2 — Row 5: Curator's Note | Coverage Quote+Vibe (side by side) */}
            {(hasCuratorNote || excerpt || vibeTag) && (
              <>
                {hasCuratorNote && (
                  <div
                    className={`${styles.bentoBlock} ${styles.fieldNoteBlock} ${(excerpt || vibeTag) ? styles.span3 : styles.span6}`}
                  >
                    <div className={styles.blockLabel}>Curator&apos;s Note</div>
                    <p className={styles.fieldNoteText}>{location.curatorNote}</p>
                    {curatorName && <div className={styles.fieldNoteAttribution}>— {curatorName}</div>}
                  </div>
                )}
                {(excerpt || vibeTag) && (
                  <div
                    className={`${styles.bentoBlock} ${styles.excerptBlock} ${hasCuratorNote ? styles.span3 : styles.span6}`}
                  >
                    {excerpt && <div>{excerpt}</div>}
                    {vibeTag && (
                      <div className={styles.excerptVibeTag}>
                        VIBE · {vibeTag}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Tier 3: Hours | Map | Call | Coverage — 4 equal cells */}
            {/* Hours */}
            {(hasFullWeekHours || hasOnlyOpenNow) && (
              <div className={`${styles.bentoBlock} ${styles.hoursBlock}`}>
                <div className={styles.blockLabel}>Hours</div>
                {hasFullWeekHours ? (
                  <div className={styles.hoursGrid}>
                    {fullWeek.map((row, idx) => {
                      const isToday = idx === todayIndex;
                      const statusInline = isToday && isOpen !== null;
                      return (
                        <div
                          key={row.day}
                          className={`${styles.hoursRow} ${isToday ? styles.hoursRowToday : ''}`}
                        >
                          <span className={styles.hoursRowDay}>{row.short}</span>
                          <span className={styles.hoursRowHours}>
                            {row.hours}
                            {statusInline && (
                              <>
                                {' '}
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    fontSize: 9,
                                    color: isOpen ? '#4A7C59' : 'rgba(54,69,79,0.6)',
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 5,
                                      height: 5,
                                      borderRadius: '50%',
                                      background: isOpen ? '#4A7C59' : 'rgba(54,69,79,0.4)',
                                      flexShrink: 0,
                                    }}
                                  />
                                  {isOpen ? 'Open' : 'Closed'}
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  isOpen !== null && (
                    <div className={styles.hoursStatusCompact}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: isOpen ? '#4A7C59' : '#36454F',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 600 }}>
                        {isOpen ? 'Open now' : 'Closed now'}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Map */}
            {(addressShort || viewOnMapUrl) && (
              <div className={`${styles.bentoBlock} ${styles.mapTile}`}>
                <div className={styles.mapTileStyled}>
                  <div className={styles.mapTileWaterWash} />
                  <svg className={styles.mapTileTopo} viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden>
                    <path d="M0,65 Q40,30 80,50 Q120,65 160,40 Q180,30 200,45" fill="none" stroke="rgba(137,180,196,0.18)" strokeWidth="1.5" />
                    <path d="M0,80 Q50,45 100,60 Q140,75 200,55" fill="none" stroke="rgba(137,180,196,0.1)" strokeWidth="1" />
                  </svg>
                  <div className={`${styles.mapRoad} ${styles.mapRoadPrimary}`} style={{ top: '46%', left: 0, right: 0, height: '1px' }} />
                  <div className={styles.mapRoad} style={{ top: 0, bottom: 0, left: '56%', width: '1px' }} />
                  <div className={styles.mapRoadDiagonal} />
                  <div className={styles.mapPinIcon}>
                    <MapPin size={18} strokeWidth={1.5} style={{ color: '#D64541' }} />
                  </div>
                </div>
                <div className={styles.mapTileContent}>
                  {addressLines && (
                    <div className={styles.mapAddressBlock}>
                      <div className={styles.mapAddressLine1}>{addressLines.line1}</div>
                      {addressLines.line2 && <div className={styles.mapAddressLine2}>{addressLines.line2}</div>}
                    </div>
                  )}
                  {viewOnMapUrl && (
                    <Link href={viewOnMapUrl} className={styles.mapLinkView}>
                      View on map →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Call */}
            {location.phone && (
              <a href={`tel:${location.phone}`} className={`${styles.bentoBlock} ${styles.callBlock}`}>
                <span className={styles.actionIcon}>
                  <Phone size={22} strokeWidth={1.5} />
                </span>
                <span className={styles.actionLabel}>Call</span>
                <span className={styles.actionDetail}>{location.phone}</span>
              </a>
            )}

            {/* Coverage */}
            {hasSources && (
              <div className={`${styles.bentoBlock} ${styles.coverageBlock}`}>
                <div className={styles.blockLabel}>Coverage</div>
                {location.sources!.map((src, i) => (
                  <a
                    key={src.source_id || i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.coverageLink}
                  >
                    <span className={styles.coverageSource}>{src.publication}</span>
                    <span className={styles.coverageTitle}>{src.title}</span>
                  </a>
                ))}
              </div>
            )}

            {/* Best For */}
            {location.description && (
              <div className={`${styles.bentoBlock} ${styles.bestForBlock} ${styles.span6}`}>
                {location.description}
              </div>
            )}

            {/* Also On */}
            {appearsOnDeduped.length > 0 && (
              <div className={`${styles.bentoBlock} ${styles.span6}`}>
                <div className={styles.blockLabel}>Also on</div>
                <div className={styles.alsoOnLinks}>
                  {appearsOnDeduped.map((item) => (
                    <Link
                      key={item.id}
                      href={`/map/${item.slug}`}
                      className={styles.alsoOnLink}
                    >
                      {item.title} ↗
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <GlobalFooter variant="minimal" />
    </div>
  );
}
