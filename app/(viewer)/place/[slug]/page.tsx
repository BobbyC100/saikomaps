'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { GlobalHeader } from '@/components/layouts/GlobalHeader';
import { GlobalFooter } from '@/components/layouts/GlobalFooter';
import { GalleryLightbox } from '@/components/merchant/GalleryLightbox';
import { parseHours } from './lib/parseHours';
import { getOpenStateLabelV2 } from '@/lib/utils/get-open-state-label';
import { renderLocation } from '@/lib/voice/saiko';
import { getIdentitySublineV2 } from '@/lib/contracts/place-page.identity';
import './place.css';

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
  descriptionSource?: string | null;
  category: string | null;
  neighborhood: string | null;
  cuisineType?: string | null;
  priceLevel: number | null;
  photoUrl: string | null;
  photoUrls?: string[];
  hours: unknown;
  googlePlaceId: string | null;
  curatorNote?: string | null;
  curatorCreatorName?: string | null;
  sources?: EditorialSource[];
  prl?: number;
  scenesense?: {
    atmosphere: string[];
    energy: string[];
    scene: string[];
  } | null;
  tips?: string[] | null;
  tagline?: string | null;
  transitAccessible?: boolean | null;
  thematicTags?: string[] | null;
  contextualConnection?: string | null;
  curatorAttribution?: string | null;
  pullQuote?: string | null;
  pullQuoteSource?: string | null;
  pullQuoteAuthor?: string | null;
  pullQuoteUrl?: string | null;
  pullQuoteType?: string | null;
  reservationUrl?: string | null;
  menuUrl?: string | null;
  winelistUrl?: string | null;
  offeringSignals?: {
    servesBeer: boolean | null;
    servesWine: boolean | null;
    servesVegetarianFood: boolean | null;
    servesLunch: boolean | null;
    servesDinner: boolean | null;
    servesCocktails: boolean | null;
    cuisinePosture: string | null;
    serviceModel: string | null;
    priceTier: string | null;
    wineProgramIntent: string | null;
  } | null;
  slug?: string;
  primaryVertical?: string | null;
  placePersonality?: string | null;
  signatureDishes?: string[];
  offeringPrograms?: {
    food_program: { maturity: string; signals: string[] };
    wine_program: { maturity: string; signals: string[] };
    beer_program: { maturity: string; signals: string[] };
    cocktail_program: { maturity: string; signals: string[] };
    non_alcoholic_program: { maturity: string; signals: string[] };
    coffee_tea_program: { maturity: string; signals: string[] };
    service_program: { maturity: string; signals: string[] };
  } | null;
  primaryOperator?: { actorId: string; name: string; slug: string; website?: string } | null;
  placeType?: 'venue' | 'activity' | 'public';
  categorySlug?: string | null;
  marketSchedule?: unknown;
  coverageSources?: { sourceName: string; url: string; excerpt?: string | null; publishedAt?: string | null }[];
  recognitions?: { name: string; source?: string; year?: string }[] | null;
  appearancesAsSubject?: {
    id: string;
    hostPlaceId: string | null;
    hostPlace: { id: string; name: string; slug: string } | null;
    latitude: number | null;
    longitude: number | null;
    addressText: string | null;
    scheduleText: string;
    status: string;
  }[];
  appearancesAsHost?: {
    id: string;
    subjectPlaceId: string;
    subjectPlace: { id: string; name: string; slug: string } | null;
    scheduleText: string;
    status: string;
  }[];
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

const RECOGNITIONS_CAP = 5;

/** Google Maps "Map ↗": placeId preferred; fallback lat/lng; no Directions CTA. */
function buildMapRefUrl(
  googlePlaceId: string | null,
  latitude: number | null,
  longitude: number | null,
  address: string | null
): string | null {
  if (googlePlaceId) return `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}`;
  if (latitude != null && longitude != null) return `https://www.google.com/maps?q=${latitude},${longitude}`;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return null;
}

/* ── Appendix: TRACES provenance references ── */

type AppendixRefGroup = {
  section: string;
  label: string;
  anchorId: string;
  entries: { source: string }[];
};

const DESCRIPTION_SOURCE_LABELS: Record<string, string> = {
  website: 'Restaurant website',
  editorial: 'Saiko editorial',
  google_editorial: 'Google Places editorial',
  synthesis: 'AI synthesis',
};

/** Build appendix reference groups keyed to page sections. */
function buildAppendixReferences(location: LocationData): AppendixRefGroup[] {
  const groups: AppendixRefGroup[] = [];

  // ── ABOUT ──
  const aboutEntries: { source: string }[] = [];
  if (location.description) {
    const label = DESCRIPTION_SOURCE_LABELS[location.descriptionSource ?? ''] ?? 'Saiko editorial';
    aboutEntries.push({ source: label });
  }
  if (location.curatorNote) {
    aboutEntries.push({ source: location.curatorCreatorName || 'Curator note' });
  }
  if (location.pullQuote) {
    const src = [location.pullQuoteSource, location.pullQuoteAuthor].filter(Boolean).join(' — ') || 'Editorial';
    aboutEntries.push({ source: src });
  }
  if (location.tips && location.tips.length > 0) {
    aboutEntries.push({ source: 'Saiko tips' });
  }
  if (aboutEntries.length > 0) {
    groups.push({ section: 'about', label: 'About Sources', anchorId: 'ledger-about', entries: aboutEntries });
  }

  // ── OFFERING ──
  const offeringEntries: { source: string }[] = [];
  if (location.offeringPrograms) {
    offeringEntries.push({ source: 'Enrichment pipeline' });
  }
  if (location.offeringSignals) {
    offeringEntries.push({ source: 'Google Places' });
  }
  if (location.signatureDishes && location.signatureDishes.length > 0) {
    offeringEntries.push({ source: 'Enrichment pipeline — signature dishes' });
  }
  if (location.cuisineType && !location.offeringPrograms) {
    offeringEntries.push({ source: 'Google Places — cuisine type' });
  }
  if (offeringEntries.length > 0) {
    groups.push({ section: 'offering', label: 'Offering Sources', anchorId: 'ledger-offering', entries: offeringEntries });
  }

  // ── SCENE ──
  const sceneEntries: { source: string }[] = [];
  if (location.placePersonality?.trim()) {
    sceneEntries.push({ source: 'Identity Signals AI' });
  }
  if (location.scenesense?.scene && location.scenesense.scene.length > 0) {
    sceneEntries.push({ source: 'SceneSense engine' });
  }
  if (sceneEntries.length > 0) {
    groups.push({ section: 'scene', label: 'Scene Sources', anchorId: 'ledger-scene', entries: sceneEntries });
  }

  // ── ATMOSPHERE ──
  if (location.scenesense?.atmosphere && location.scenesense.atmosphere.length > 0) {
    groups.push({
      section: 'atmosphere',
      label: 'Atmosphere Sources',
      anchorId: 'ledger-atmosphere',
      entries: [{ source: 'SceneSense engine' }],
    });
  }

  // ── ENERGY ──
  if (location.scenesense?.energy && location.scenesense.energy.length > 0) {
    groups.push({
      section: 'energy',
      label: 'Energy Sources',
      anchorId: 'ledger-energy',
      entries: [{ source: 'SceneSense engine' }],
    });
  }

  return groups;
}

const OFFERING_CAP = 4;

const PRICE_PHRASES: Record<string, string> = {
  '$': 'Budget-friendly pricing',
  '$$': 'Moderate price range',
  '$$$': 'Higher-end pricing',
  '$$$$': 'Fine-dining price point',
};

const SERVICE_MODEL_PHRASES: Record<string, string> = {
  'tasting-menu': 'Tasting menu format',
  'a-la-carte': 'À la carte ordering',
  'small-plates': 'Small plates and sharing format',
  'family-style': 'Family-style service',
  'counter': 'Counter service',
};

const WINE_INTENT_PHRASES: Record<string, string> = {
  'natural': 'Producer-driven natural wine list',
  'classic': 'Traditional wine program with regional depth',
  'eclectic': 'Eclectic, wide-ranging wine list',
  'minimal': 'Compact, curated wine selection',
};

const CUISINE_POSTURE_PHRASES: Record<string, string> = {
  'produce-driven': 'Seasonal, produce-driven kitchen',
  'protein-centric': 'Protein-focused menu',
  'carb-forward': 'Carb-forward comfort cooking',
  'seafood-focused': 'Seafood-centered menu',
  'balanced': 'Balanced, broadly composed menu',
};

/** Maturity → display label. 'none' and 'unknown' are suppressed. */
const MATURITY_LABELS: Record<string, Record<string, string>> = {
  wine_program: {
    dedicated: 'Dedicated wine program',
    considered: 'Considered wine selection',
    incidental: 'Wine available',
  },
  beer_program: {
    dedicated: 'Dedicated beer program',
    considered: 'Considered beer selection',
    incidental: 'Beer available',
  },
  cocktail_program: {
    dedicated: 'Dedicated cocktail program',
    considered: 'Considered cocktail menu',
    incidental: 'Cocktails available',
  },
  food_program: {
    dedicated: 'Dedicated food program',
    considered: 'Considered food offering',
    incidental: 'Food available',
  },
};

function buildOfferingLines(location: LocationData): { label: string; sentence: string }[] {
  const lines: { label: string; sentence: string }[] = [];
  const os = location.offeringSignals;
  const op = location.offeringPrograms;

  // Food line: offeringPrograms.food_program > cuisine_posture > cuisineType
  const foodMaturity = op?.food_program?.maturity;
  if (foodMaturity && MATURITY_LABELS.food_program[foodMaturity]) {
    // If we have cuisine_posture, prefer the richer phrase; maturity is the gate
    if (os?.cuisinePosture && CUISINE_POSTURE_PHRASES[os.cuisinePosture]) {
      lines.push({ label: 'Food', sentence: CUISINE_POSTURE_PHRASES[os.cuisinePosture] });
    } else {
      lines.push({ label: 'Food', sentence: MATURITY_LABELS.food_program[foodMaturity] });
    }
  } else if (os?.cuisinePosture && CUISINE_POSTURE_PHRASES[os.cuisinePosture]) {
    lines.push({ label: 'Food', sentence: CUISINE_POSTURE_PHRASES[os.cuisinePosture] });
  } else if (location.cuisineType) {
    lines.push({ label: 'Food', sentence: `${location.cuisineType} kitchen` });
  }

  // Wine line: offeringPrograms.wine_program > wineProgramIntent > Google drink signals
  const wineMaturity = op?.wine_program?.maturity;
  if (wineMaturity && MATURITY_LABELS.wine_program[wineMaturity]) {
    lines.push({ label: 'Wine', sentence: MATURITY_LABELS.wine_program[wineMaturity] });
  } else if (os?.wineProgramIntent && os.wineProgramIntent !== 'none' && WINE_INTENT_PHRASES[os.wineProgramIntent]) {
    lines.push({ label: 'Wine', sentence: WINE_INTENT_PHRASES[os.wineProgramIntent] });
  } else if (os?.servesWine === true) {
    lines.push({ label: 'Wine', sentence: 'Wine list available' });
  }

  // Cocktail line: offeringPrograms.cocktail_program > skip
  const cocktailMaturity = op?.cocktail_program?.maturity;
  if (cocktailMaturity && MATURITY_LABELS.cocktail_program[cocktailMaturity]) {
    lines.push({ label: 'Cocktails', sentence: MATURITY_LABELS.cocktail_program[cocktailMaturity] });
  } else if (os?.servesCocktails === true) {
    lines.push({ label: 'Cocktails', sentence: 'Cocktails available' });
  }

  // Beer line: offeringPrograms.beer_program > Google beer signal
  const beerMaturity = op?.beer_program?.maturity;
  if (beerMaturity && MATURITY_LABELS.beer_program[beerMaturity]) {
    lines.push({ label: 'Beer', sentence: MATURITY_LABELS.beer_program[beerMaturity] });
  } else if (os?.servesBeer === true) {
    lines.push({ label: 'Beer', sentence: 'Beer available' });
  }

  // Service line: enriched service_model > skip if generic
  if (os?.serviceModel && SERVICE_MODEL_PHRASES[os.serviceModel]) {
    lines.push({ label: 'Service', sentence: SERVICE_MODEL_PHRASES[os.serviceModel] });
  }

  // Price line: enriched price_tier > entity priceLevel fallback
  if (os?.priceTier && PRICE_PHRASES[os.priceTier]) {
    lines.push({ label: 'Price', sentence: PRICE_PHRASES[os.priceTier] });
  } else if (location.priceLevel != null && location.priceLevel >= 1 && location.priceLevel <= 4) {
    const tier = '$'.repeat(location.priceLevel);
    if (PRICE_PHRASES[tier]) {
      lines.push({ label: 'Price', sentence: PRICE_PHRASES[tier] });
    }
  }

  return lines.slice(0, OFFERING_CAP);
}

export default function PlacePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<PlacePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'not-found' | 'server-error' | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(new Set());

  const handlePhotoError = useCallback((url: string) => {
    setFailedPhotos((prev) => new Set(prev).add(url));
  }, []);

  const openGallery = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/places/${slug}`, {
      cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'default',
      headers: process.env.NODE_ENV === 'development' ? { 'Cache-Control': 'no-cache' } : undefined,
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
        if (json?.success && json.data) setData(json.data);
        else if (json === null) {}
        else setError('not-found');
      })
      .catch((err) => {
        console.error('Failed to load place:', err);
        setError('server-error');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.location.name || 'Saiko Maps',
          text: data?.location.tagline || `Check out ${data?.location.name}`,
          url: window.location.href,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') console.error('Share failed:', err);
      }
    } else {
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
            <div className="w-12 h-12 border-4 border-[#C3B091] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p style={{ color: '#36454F', opacity: 0.7 }}>Loading place details...</p>
          </div>
        </main>
        <GlobalFooter variant="minimal" />
      </div>
    );
  }

  if (error === 'not-found') {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E1' }}>
        <GlobalHeader variant="immersive" onShare={handleShare} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <h1 className="text-[#36454F] text-2xl font-semibold mb-3">Place Not Found</h1>
            <p className="text-[#36454F] opacity-70 mb-6">
              We couldn&apos;t find a place with the slug &quot;{slug}&quot;. It may have been removed or the link might be incorrect.
            </p>
            <Link href="/" className="inline-block px-6 py-3 bg-[#C3B091] text-white rounded-lg hover:bg-[#B39F7F] transition-colors">
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
            <p className="text-[#36454F] opacity-70 mb-6">We encountered an error loading this place. Please try again.</p>
            <button onClick={() => window.location.reload()} className="inline-block px-6 py-3 bg-[#C3B091] text-white rounded-lg hover:bg-[#B39F7F] transition-colors">
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
            <Link href="/" className="text-[#C3B091] hover:underline">Return to homepage</Link>
          </div>
        </main>
        <GlobalFooter variant="minimal" />
      </div>
    );
  }

  const { location, guide, appearsOn } = data;
  const rawPhotoUrls = location.photoUrls ?? (location.photoUrl ? [location.photoUrl] : []);
  const validPhotos = rawPhotoUrls.filter((url) => url && !failedPhotos.has(url));

  const parsedHours = parseHours(location.hours);
  const { label: openStateLabel } = getOpenStateLabelV2(parsedHours, new Date(), { showTime: true });

  // Identity Line — canonical structural sentence
  const identitySubline =
    getIdentitySublineV2({
      neighborhood: location.neighborhood ?? null,
      primaryVertical: location.primaryVertical ?? null,
      cuisineType: location.cuisineType ?? null,
      offeringSignals: location.offeringSignals ?? null,
    }) ?? renderLocation({ neighborhood: location.neighborhood, category: location.category });

  const energyPhrase = location.scenesense?.atmosphere?.[0] ?? null;
  const hasSignalsSentence = !!(openStateLabel || energyPhrase);
  const mapRefUrl = buildMapRefUrl(location.googlePlaceId, location.latitude, location.longitude, location.address);
  const recognitions = (location.recognitions ?? []).slice(0, RECOGNITIONS_CAP);
  const appendixGroups = buildAppendixReferences(location);
  const phoneUrl = location.phone ? `tel:${location.phone.replace(/\D/g, '')}` : null;

  // Sidebar: Hours
  const fullWeekHours = parsedHours.fullWeek;
  const hasHours = fullWeekHours.length > 0;
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Sidebar: Links
  // Instagram is shown in the header action row — exclude it here to avoid duplication
  const sidebarLinks: { label: string; url: string }[] = [];
  if (mapRefUrl) sidebarLinks.push({ label: 'Directions', url: mapRefUrl });
  if (location.menuUrl) sidebarLinks.push({ label: 'Menu', url: location.menuUrl });
  if (location.winelistUrl) sidebarLinks.push({ label: 'Wine list', url: location.winelistUrl });
  if (phoneUrl) sidebarLinks.push({ label: 'Call', url: phoneUrl });

  // Sidebar: Scene / Atmosphere / Ambiance
  const sceneText = location.placePersonality?.trim() || null;
  const sceneTags = location.scenesense?.scene ?? [];
  const atmosphereTags = location.scenesense?.atmosphere ?? [];
  const energyTags = location.scenesense?.energy ?? [];
  const hasScene = !!(sceneText || sceneTags.length);
  const hasAtmosphere = atmosphereTags.length > 0;
  const hasEnergy = energyTags.length > 0;

  // Primary CTAs
  const hasPrimaryCtas = !!(location.reservationUrl || location.website || location.instagram);

  // More Maps
  const moreMapsCards = appearsOn.slice(0, 3);

  // Offering (Price row is surfaced in Scene instead)
  const offeringRows = buildOfferingLines(location);
  const priceText = offeringRows.find(r => r.label === 'Price')?.sentence ?? null;

  return (
    <div style={{ background: '#F5F0E1', minHeight: '100vh' }}>
      <GlobalHeader variant="immersive" onShare={handleShare} />

      <main id="place-page">
        <div id="document-frame">
          <div id="page-canvas">

            {/* ═══ TWO-COLUMN BODY ═══ */}
            <div id="two-column-body">

              {/* ─── LEFT: MAIN COLUMN ─── */}
              <div id="main-column">
                <h1 id="place-title" className="sk-display">{location.name}</h1>
                {identitySubline && (
                  <p id="identity-subline" className="sk-identity">{identitySubline}</p>
                )}
                {hasSignalsSentence && (
                  <p id="identity-signals" className="sk-identity">
                    {openStateLabel && <em>{openStateLabel}</em>}
                    {openStateLabel && energyPhrase && ' — '}
                    {energyPhrase}
                  </p>
                )}

                {hasPrimaryCtas && (
                  <div id="primary-ctas">
                    {location.reservationUrl && (
                      <a href={location.reservationUrl} target="_blank" rel="noopener noreferrer">Reserve <span className="action-arrow">↗</span></a>
                    )}
                    {location.website && (
                      <a href={location.website} target="_blank" rel="noopener noreferrer">Website <span className="action-arrow">↗</span></a>
                    )}
                    {location.instagram && (
                      <a href={`https://instagram.com/${location.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer">Instagram <span className="action-arrow">↗</span></a>
                    )}
                  </div>
                )}

                {location.description && (
                  <>
                    <div className="sk-section-header"><span>About</span></div>
                    <div id="identity-description">
                      <p>{location.description}</p>
                    </div>
                  </>
                )}

                {offeringRows.length > 0 && (
                  <>
                    <div className="sk-section-header"><span>Offering</span></div>
                    <div id="offering-signals-rows">
                      {offeringRows.filter(r => r.label !== 'Price').map((row) => (
                        <div key={row.label} className="offering-row">
                          <span className="offering-label">{row.label}</span>
                          <p className="offering-sentence">{row.sentence}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {location.signatureDishes && location.signatureDishes.length > 0 && (
                  <>
                    <div className="sk-section-header"><span>Known For</span></div>
                    <ul id="signature-dishes-list">
                      {location.signatureDishes.map((dish) => (
                        <li key={dish}>{dish}</li>
                      ))}
                    </ul>
                  </>
                )}

                {location.pullQuote && (
                  <>
                    <div className="sk-section-header"><span>Coverage</span></div>
                    <blockquote id="pull-quote">
                      <p>&ldquo;{location.pullQuote}&rdquo;</p>
                      <cite>
                        {[location.pullQuoteSource, location.pullQuoteAuthor].filter(Boolean).join(' — ')}
                      </cite>
                    </blockquote>
                  </>
                )}

                {location.curatorNote && (
                  <>
                    <div className="sk-section-header"><span>Curator Note</span></div>
                    <article id="curator-note">
                      <p>{location.curatorNote}</p>
                      {location.curatorCreatorName && <p className="curator-byline">{location.curatorCreatorName}</p>}
                    </article>
                  </>
                )}

                {location.tips && location.tips.length > 0 && (
                  <>
                    <div className="sk-section-header"><span>Tips</span></div>
                    <ul id="tips-list">
                      {location.tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* ─── RIGHT: SIDEBAR COLUMN ─── */}
              <aside id="sidebar-column">
                <div className="sidebar-spacer" aria-hidden="true" />

                {hasAtmosphere && (
                  <>
                    <div className="sk-section-header"><span>Atmosphere</span></div>
                    <div className="sidebar-tag-block">
                      {atmosphereTags.map((tag, i) => (
                        <p key={i}>{tag}</p>
                      ))}
                    </div>
                  </>
                )}

                {hasEnergy && (
                  <>
                    <div className="sk-section-header"><span>Energy</span></div>
                    <div className="sidebar-tag-block">
                      {energyTags.map((tag, i) => (
                        <p key={i}>{tag}</p>
                      ))}
                    </div>
                  </>
                )}

                {sidebarLinks.filter(l => l.url !== phoneUrl).length > 0 && (
                  <>
                    <div className="sk-section-header"><span>Links</span></div>
                    <div id="links-block">
                      <ul className="links-list">
                        {sidebarLinks.filter(l => l.url !== phoneUrl).map((link) => (
                          <li key={link.label}>
                            <a href={link.url} target="_blank" rel="noopener noreferrer">
                              {link.label} <span className="action-arrow">↗</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {(hasScene || priceText) && (
                  <>
                    <div className="sk-section-header"><span>Scene</span></div>
                    <div className="sidebar-tag-block">
                      {sceneText && <p>{sceneText}</p>}
                      {sceneTags.length > 0 && (
                        <p className="tag-line">{sceneTags.join(' · ')}</p>
                      )}
                      {priceText && <p>{priceText}</p>}
                    </div>
                  </>
                )}
              </aside>
            </div>

            {/* ═══ FULL-WIDTH SECTIONS ═══ */}

            {validPhotos.length > 0 && <hr className="heavy-rule" />}

            {validPhotos.length > 0 && (
              <section id="photos-section">
                <h2 className="sk-section-header"><span>Photos</span></h2>
                <div id="photos-grid">
                  {validPhotos.slice(0, 6).map((url, i) => (
                    <div key={url} className={`photo-tile photo-tile-${i + 1}`} role="button" tabIndex={0} onClick={() => openGallery(i)} onKeyDown={(e) => e.key === 'Enter' && openGallery(i)}>
                      <img src={url} alt="" onError={() => handlePhotoError(url)} />
                    </div>
                  ))}
                </div>

                {/* ── Right utility rail: Hours → Address → Phone ── */}
                <div id="photos-utility-rail">
                  {/* Practical reference only — Links and Scene live in the sidebar above */}
                  {hasHours && (
                    <>
                      <div className="sk-section-header"><span>Hours</span></div>
                      <div id="hours-block">
                        <div className="hours-table">
                          {fullWeekHours.map((row) => (
                            <div key={row.day} className={`hours-row sk-utility sk-utility-tabular${row.day === todayDayName ? ' hours-row-today' : ''}`}>
                              <span className="hours-day">{row.short}</span>
                              <span className="hours-time">{row.hours}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {location.address && (
                    <>
                      <div className="sk-section-header"><span>Address</span></div>
                      <div id="address-block">
                        <p className="address-text">{location.address}</p>
                        {mapRefUrl && (
                          <a href={mapRefUrl} target="_blank" rel="noopener noreferrer" className="map-link">
                            Map <span className="action-arrow">↗</span>
                          </a>
                        )}
                      </div>
                    </>
                  )}

                  {phoneUrl && location.phone && (
                    <>
                      <div className="sk-section-header"><span>Phone</span></div>
                      <div id="phone-block">
                        <a href={phoneUrl} className="phone-link">
                          Call {location.phone} <span className="action-arrow">↗</span>
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}

            {moreMapsCards.length > 0 && <hr className="heavy-rule" />}

            {moreMapsCards.length > 0 && (
              <section id="more-maps">
                <h2>More Maps</h2>
                <div id="more-maps-grid">
                  {moreMapsCards.map((map) => (
                    <Link key={map.id} href={`/map/${map.slug}`} className="map-card">
                      {map.coverImageUrl && (
                        <div className="map-card-image" style={{ backgroundImage: `url(${map.coverImageUrl})` }} />
                      )}
                      <div className="map-card-body">
                        <span className="map-card-type">
                          MAP · {map.placeCount ?? 0} {(map.placeCount ?? 0) === 1 ? 'PLACE' : 'PLACES'}
                        </span>
                        <span className="map-card-title">{map.title}</span>
                        <span className="map-card-creator">
                          {map.authorType === 'saiko' ? 'Curator Pick' : `By ${map.creatorName}`}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {recognitions.length > 0 && (
              <section id="recognitions-section">
                <h2>Recognitions</h2>
                <ul id="recognitions-list">
                  {recognitions.map((rec, i) => (
                    <li key={i}>{rec.name}{rec.source ? ` — ${rec.source}` : ''}{rec.year ? ` (${rec.year})` : ''}</li>
                  ))}
                </ul>
              </section>
            )}

            <hr className="heavy-rule" />

            <footer id="place-appendix">
              {/* INDEX column */}
              <nav id="appendix-index" aria-label="Appendix navigation">
                <h2>Index</h2>
                <ul>
                  {appendixGroups.map((group) => (
                    <li key={group.anchorId}>
                      <a href={`#${group.anchorId}`}>{group.label}</a>
                    </li>
                  ))}
                  <li><a href="#appendix-methodology">Methodology</a></li>
                </ul>
                <div className="reference-legend">
                  <svg className="legend-globe" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                  <span>Section references<br/>Links to source entry in References</span>
                </div>
              </nav>

              {/* REFERENCES column */}
              <div id="appendix-references">
                <h2>References</h2>
                {appendixGroups.map((group) => (
                  <div key={group.anchorId} className="appendix-ref-group" id={group.anchorId}>
                    <h3>{group.label}</h3>
                    <ul className="appendix-ref-entries">
                      {group.entries.map((entry, i) => (
                        <li key={i}>{entry.source}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div id="appendix-methodology" className="appendix-ref-group">
                  <h3>Methodology</h3>
                  <p><Link href="/sources">How Saiko assembles place pages</Link></p>
                </div>
              </div>

              {/* COVERAGE column */}
              <div id="appendix-coverage">
                <h2>Coverage</h2>
                {location.coverageSources && location.coverageSources.length > 0 ? (
                  <ul className="coverage-entries">
                    {location.coverageSources.map((cs) => (
                      <li key={cs.url} className="coverage-entry">
                        <span className="coverage-source-name">{cs.sourceName}</span>
                        {cs.excerpt && <p className="coverage-excerpt">{cs.excerpt}</p>}
                        {cs.publishedAt && (
                          <span className="coverage-date">
                            {new Date(cs.publishedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        <a href={cs.url} target="_blank" rel="noopener noreferrer" className="coverage-read-link">
                          Read article <span className="action-arrow">↗</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="coverage-empty">No coverage sources yet.</p>
                )}
              </div>

              {/* PLATE MARK */}
              <p id="plate-mark">Saiko Fields: TRACES — Los Angeles</p>
            </footer>
          </div>
        </div>
      </main>

      {lightboxOpen && validPhotos.length > 0 && (
        <GalleryLightbox photos={validPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
      )}

      <GlobalFooter variant="minimal" />
    </div>
  );
}
