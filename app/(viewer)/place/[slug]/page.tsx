'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Instagram, MapPin, Globe, Phone } from 'lucide-react';
import { GlobalHeader } from '@/components/layouts/GlobalHeader';
import { GlobalFooter } from '@/components/layouts/GlobalFooter';
import { QuietCard } from '@/app/components/merchant/QuietCard';
import { SaikoStamp } from '@/app/components/SaikoStamp';
import { BackToMapButton } from '@/components/BackToMapButton';
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
  vibeTags?: string[] | null;
  tips?: string[] | null;
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
} {
  const empty = { today: null, isOpen: null, closesAt: null, opensAt: null, fullWeek: [] };
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
  } else {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    fullWeek.push(...days.map((day, idx) => ({
      day: dayNames[idx] ?? '',
      short: shortNames[idx] ?? '',
      hours: (obj[day] as string) || 'Closed',
    })));
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

  return { today: todayHours, isOpen, closesAt, opensAt, fullWeek };
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
  const { today, isOpen, closesAt, opensAt, fullWeek } = parseHours(location.hours);
  const hasCuratorNote = !!location.curatorNote?.trim();
  const hasPhotos = (location.photoUrls?.length ?? 0) > 0;
  const hasSources = (location.sources?.length ?? 0) > 0;
  const hasVibeTags = (location.vibeTags?.length ?? 0) > 0;
  const hasTips = (location.tips?.length ?? 0) > 0;
  const excerpt = getExcerpt(location.sources);
  const isSparse = !hasCuratorNote && !hasPhotos && !hasSources && !hasVibeTags && !hasTips;
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
  const is24Hours = fullWeek[todayIndex]?.hours?.toLowerCase().includes('24') ?? false;
  const primaryMapSlug = appearsOn[0]?.slug ?? null;
  const viewOnMapUrl = primaryMapSlug ? `/map/${primaryMapSlug}?place=${slug}` : null;
  
  // Also On: dedupe by slug (filter to unique slugs only), max 3
  const seenSlugs = new Set<string>();
  const appearsOnDeduped = appearsOn
    .filter((item) => {
      if (seenSlugs.has(item.slug)) {
        return false; // Skip duplicates
      }
      seenSlugs.add(item.slug);
      return true;
    })
    .slice(0, 3);

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

  // Calculate grid occupancy for Quiet Cards
  // Count grid columns occupied by content (6-column grid)
  let occupiedColumns = 0;
  
  // Action cards row: full width (6 columns)
  if (actionCards.length > 0) occupiedColumns += 6;
  
  // Gallery: full width (6 columns)
  if (hasGallery) occupiedColumns += 6;
  
  // Tier 2 row: Curator's Note + Excerpt/Vibe (side by side when both exist)
  // Curator's Note: 3 columns when paired, 6 when alone
  // Excerpt: 3 columns when paired with note, otherwise variable
  // Vibe: 3 columns
  if (hasCuratorNote && (excerpt || hasVibeTags)) {
    occupiedColumns += 3; // Curator's note (left)
    occupiedColumns += 3; // Excerpt or Vibe (right)
  } else if (hasCuratorNote) {
    occupiedColumns += 6; // Curator's note full width
  } else if (excerpt && hasVibeTags) {
    occupiedColumns += 3; // Excerpt (left)
    occupiedColumns += 3; // Vibe (right)
  } else if (excerpt) {
    occupiedColumns += 3; // Excerpt alone
  } else if (hasVibeTags) {
    occupiedColumns += 3; // Vibe alone
  }
  
  // Tier 3 row: Hours + Map + Call
  // Calculate actual columns based on what's present
  let tier3Columns = 0;
  if (hasFullWeekHours || hasOnlyOpenNow) tier3Columns += 2;
  if (addressShort) tier3Columns += 2;
  if (location.phone) tier3Columns += 2;
  occupiedColumns += tier3Columns;
  
  // Tips block: 2 columns
  if (hasTips) occupiedColumns += 2;
  
  // Coverage Row: 3 columns Coverage + 3 columns (2 stacked Quiet Cards) = 6 total (complete row)
  // This is a special nested row structure, so we count it as 6 columns (one complete row)
  if (hasSources) occupiedColumns += 6;
  
  // Best For: 6 columns
  if (location.description) occupiedColumns += 6;
  
  // Calculate Quiet Cards to fill ONLY partial rows BEFORE Also On
  // Don't add unnecessary full rows - only fill gaps
  const currentRowPosition = occupiedColumns % 6;
  const emptyCellsInCurrentRow = currentRowPosition === 0 ? 0 : 6 - currentRowPosition;
  
  // Generate Quiet Cards - each spans full 6 columns
  const quietCardCount = emptyCellsInCurrentRow > 0 ? 1 : 0;
  
  const quietCards = Array.from({ length: quietCardCount }, (_, i) => ({
    key: `quiet-${i}`,
    variant: ['topo', 'texture', 'minimal'][i % 3] as 'topo' | 'texture' | 'minimal',
  }));
  
  // Add Quiet Cards to occupied columns (full row)
  occupiedColumns += quietCardCount > 0 ? 6 : 0;
  
  // Also On: 6 columns - renders LAST, no cards after this
  if (appearsOnDeduped.length > 0) occupiedColumns += 6;

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

            {/* Tier 2 — Row 5: Curator's Note | Excerpt | Vibe (flexible layout) */}
            {(hasCuratorNote || excerpt || hasVibeTags) && (
              <>
                {/* Curator's Note */}
                {hasCuratorNote && (
                  <div
                    className={`${styles.bentoBlock} ${styles.fieldNoteBlock} ${(excerpt || hasVibeTags) ? styles.span3 : styles.span6}`}
                  >
                    <div className={styles.blockLabel}>Curator&apos;s Note</div>
                    <p className={styles.fieldNoteText}>{location.curatorNote}</p>
                    {curatorName && <div className={styles.fieldNoteAttribution}>— {curatorName}</div>}
                  </div>
                )}
                
                {/* Excerpt block (quote from editorial source) */}
                {excerpt && (
                  <div
                    className={`${styles.bentoBlock} ${styles.excerptBlock} ${hasCuratorNote ? styles.span3 : (hasVibeTags ? styles.span3 : styles.span6)}`}
                  >
                    <div>{excerpt}</div>
                  </div>
                )}
                
                {/* Vibe block (tags with dot separators) */}
                {hasVibeTags && !excerpt && (
                  <div
                    className={`${styles.bentoBlock} ${styles.vibeBlock} ${hasCuratorNote ? styles.span3 : styles.span6}`}
                  >
                    <div className={styles.blockLabel}>Vibe</div>
                    <div className={styles.vibeTags}>
                      {location.vibeTags!.map((tag, i) => (
                        <span key={i}>{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Tier 3 Row: Hours | Map | Call */}
            {((hasFullWeekHours || hasOnlyOpenNow) || addressShort || location.phone) && (
              <div className={`${styles.tier3Row} ${
                !(hasFullWeekHours || hasOnlyOpenNow) ? styles.noHours : 
                !location.phone ? styles.noPhone : 
                !(hasFullWeekHours || hasOnlyOpenNow) && !location.phone ? styles.onlyMap : ''
              }`}>
                {/* Hours Card */}
                {(hasFullWeekHours || hasOnlyOpenNow) && (
                  <div className={`${styles.bentoBlock} ${styles.hoursBlock}`}>
                    <div className={styles.blockLabel}>HOURS</div>
                    {hasFullWeekHours ? (
                      <>
                        <div className={styles.hoursGrid}>
                          {/* Left column: M, T, W, Th */}
                          <div className={styles.hoursColumn}>
                            {fullWeek.slice(0, 4).map((row, idx) => {
                              const isToday = idx === todayIndex;
                              return (
                                <div
                                  key={row.day}
                                  className={`${styles.hoursRow} ${isToday ? styles.hoursRowToday : ''}`}
                                >
                                  <span className={styles.hoursRowDay}>{row.short}</span>
                                  <span className={styles.hoursRowHours}>{row.hours}</span>
                                </div>
                              );
                            })}
                          </div>
                          {/* Right column: F, S, Su */}
                          <div className={styles.hoursColumn}>
                            {fullWeek.slice(4, 7).map((row, idx) => {
                              const actualIdx = idx + 4;
                              const isToday = actualIdx === todayIndex;
                              return (
                                <div
                                  key={row.day}
                                  className={`${styles.hoursRow} ${isToday ? styles.hoursRowToday : ''}`}
                                >
                                  <span className={styles.hoursRowDay}>{row.short}</span>
                                  <span className={styles.hoursRowHours}>{row.hours}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {isOpen !== null && (
                          <div className={styles.hoursStatusFooter}>
                            <div className={`${styles.hoursStatusDot} ${!isOpen ? 'closed' : ''}`} />
                            <div className={`${styles.hoursStatusText} ${!isOpen ? 'closed' : ''}`}>
                              {isOpen 
                                ? (is24Hours 
                                   ? 'Open 24 Hours' 
                                   : `Open${closesAt ? ` · Closes ${closesAt}` : ''}`)
                                : `Closed${opensAt ? ` · Opens ${opensAt}` : ''}`
                              }
                            </div>
                          </div>
                        )}
                      </>
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

                {/* Map Card */}
                {addressShort && (
                  <a
                    href={directionsUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.bentoBlock} ${styles.mapCard}`}
                  >
                    <div className={styles.mapCardLabel}>MAP</div>
                    <div className={styles.mapTileStyled}>
                      <div className={`${styles.mapRoad} ${styles.mapRoadHorizontal}`} style={{ top: '40%' }} />
                      <div className={`${styles.mapRoad} ${styles.mapRoadHorizontal}`} style={{ top: '65%' }} />
                      <div className={`${styles.mapRoad} ${styles.mapRoadVertical}`} style={{ left: '35%' }} />
                      <div className={`${styles.mapRoad} ${styles.mapRoadVertical}`} style={{ left: '68%' }} />
                      <div className={styles.mapPinDot} />
                    </div>
                    {addressLines && (
                      <div className={styles.mapAddressBlock}>
                        <div className={styles.mapAddressLine1}>{addressLines.line1}</div>
                        {addressLines.line2 && <div className={styles.mapAddressLine2}>{addressLines.line2}</div>}
                      </div>
                    )}
                  </a>
                )}

                {/* Call Card */}
                {location.phone && (
                  <a href={`tel:${location.phone}`} className={`${styles.bentoBlock} ${styles.callCard}`}>
                    <div className={styles.callCardLabel}>CALL</div>
                    <div className={styles.callCardContent}>
                      <div className={styles.callCardIcon}>
                        <Phone size={32} strokeWidth={1.5} />
                      </div>
                      <div className={styles.callCardNumber}>{location.phone}</div>
                    </div>
                  </a>
                )}
              </div>
            )}

            {/* Coverage row with nested quiet cards on right */}
            {hasSources && (
              <div className={`${styles.coverageRow}`}>
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
                <div className={styles.coverageQuietStack}>
                  <QuietCard 
                    variant="texture" 
                    span={3} 
                    className={styles.coverageQuietCard}
                    noMinHeight={true}
                  />
                  <QuietCard 
                    variant="minimal" 
                    span={3} 
                    className={styles.coverageQuietCard}
                    noMinHeight={true}
                  />
                </div>
              </div>
            )}

            {/* Best For */}
            {location.description && (
              <div className={`${styles.bentoBlock} ${styles.bestForBlock} ${styles.span6}`}>
                {location.description}
              </div>
            )}

            {/* Quiet Cards — Fill any remaining space in current row BEFORE Also On */}
            {quietCards.map((card) => (
              <QuietCard 
                key={card.key} 
                variant={card.variant} 
                span={6} 
                className={`${styles.bentoBlock} ${styles.quietCard}`}
              />
            ))}

            {/* Also On — LAST element in bento grid, nothing after this */}
            {appearsOnDeduped.length > 0 && (
              <div className={`${styles.bentoBlock} ${styles.span6}`}>
                <div className={styles.blockLabel}>Also on</div>
                <div className={styles.alsoOnLinks}>
                  {appearsOnDeduped.map((item) => (
                    <Link
                      key={item.slug}
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

          {/* Saiko Stamp — Brand footer below the grid */}
          <SaikoStamp />
        </div>
      </main>

      {/* Floating Back to Map button — shows only if navigated from a map */}
      <BackToMapButton />
    </div>
  );
}
