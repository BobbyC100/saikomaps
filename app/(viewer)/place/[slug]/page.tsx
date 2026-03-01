'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { GlobalHeader } from '@/components/layouts/GlobalHeader';
import { GlobalFooter } from '@/components/layouts/GlobalFooter';
import { GalleryLightbox } from '@/components/merchant/GalleryLightbox';
import { parseHours } from './lib/parseHours';
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
  vibeTags?: string[] | null;
  prl?: number;
  scenesense?: {
    vibe: string[];
    atmosphere: string[];
    ambiance: string[];
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
  slug?: string;
  primaryOperator?: { actorId: string; name: string; slug: string; website?: string } | null;
  placeType?: 'venue' | 'activity' | 'public';
  categorySlug?: string | null;
  marketSchedule?: unknown;
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
const LEDGER_CAP_PER_GROUP = 10;

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

/** Build section-scoped ledger entries for v1. Order: Description → Curator → Tips → Quote → Recognitions → Record. */
function buildLedgerEntries(location: LocationData, appearsOnCount: number): { section: string; entries: { source: string; role: string; date?: string }[] }[] {
  const groups: { section: string; entries: { source: string; role: string; date?: string }[] }[] = [];

  if (location.description) {
    groups.push({ section: 'description', entries: [{ source: 'Saiko', role: 'Description' }] });
  }
  if (location.curatorNote) {
    groups.push({ section: 'curator', entries: [{ source: location.curatorCreatorName || 'Saiko', role: 'Curator note' }] });
  }
  if (location.tips && location.tips.length > 0) {
    groups.push({ section: 'tips', entries: [{ source: 'Saiko', role: 'Tips' }] });
  }
  if (location.pullQuote) {
    const src = [location.pullQuoteSource, location.pullQuoteAuthor].filter(Boolean).join(' — ') || 'Editorial';
    groups.push({ section: 'quote', entries: [{ source: src, role: 'Quote' }] });
  }
  const recs = location.recognitions ?? [];
  if (recs.length > 0) {
    groups.push({
      section: 'recognitions',
      entries: recs.slice(0, LEDGER_CAP_PER_GROUP).map((r) => ({ source: r.source ?? 'Editorial', role: r.name, date: r.year })),
    });
  }
  if (appearsOnCount > 0) {
    groups.push({
      section: 'record',
      entries: [{ source: 'Saiko', role: `Appears on ${appearsOnCount} map${appearsOnCount !== 1 ? 's' : ''}` }],
    });
  }

  return groups;
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
  const photoUrls = location.photoUrls ?? (location.photoUrl ? [location.photoUrl] : []);
  const { isOpen, statusText, today, openNowExplicit } = parseHours(location.hours);
  const signalsList = location.vibeTags ?? [];
  const sublineParts = [location.category, location.neighborhood].filter(Boolean) as string[];
  const mapRefUrl = buildMapRefUrl(location.googlePlaceId, location.latitude, location.longitude, location.address);
  const recognitions = (location.recognitions ?? []).slice(0, RECOGNITIONS_CAP);
  const ledgerGroups = buildLedgerEntries(location, appearsOn.length);

  const openGallery = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const statusLabel = openNowExplicit && isOpen !== null ? (isOpen ? 'Open' : 'Closed') : null;
  const hasFacts = statusLabel || statusText || today || location.address || location.website || !!location.primaryOperator;

  return (
    <div style={{ background: '#F5F0E1', minHeight: '100vh' }}>
      <GlobalHeader variant="immersive" onShare={handleShare} />

      <main id="place-page">
        <div id="document-frame">
          <section id="unsupported-tablet" aria-hidden="true">
            <p>Tablet view is not yet supported. Please use a desktop or mobile device.</p>
          </section>

          <div id="page-canvas">
            {/* Top Section: Identity (left) + Rail (right) */}
            <section id="top-section">
              <div id="identity-column">
                <h1 id="place-title">{location.name}</h1>
                {sublineParts.length > 0 && (
                  <p id="identity-subline">{sublineParts.join(' · ')}</p>
                )}
                {signalsList.length > 0 && (
                  <p id="identity-signals">{signalsList.join(' · ')}</p>
                )}
                {location.description && (
                  <div id="identity-description" className="section-with-provenance">
                    <p>{location.description}</p>
                    <a href="#ledger-description" className="provenance-diamond" aria-label="Sources for this section" />
                  </div>
                )}
                {hasFacts && (
                  <div id="facts-band">
                    {statusLabel && <span>{statusLabel}</span>}
                    {(statusText ?? today) && <span>{statusText ?? today}</span>}
                    {location.address && <span>{location.address}</span>}
                    {location.website && (
                      <a href={location.website} target="_blank" rel="noopener noreferrer">Website</a>
                    )}
                    {location.primaryOperator && (
                      <Link href={`/actor/${location.primaryOperator.slug}`}>
                        Part of the {location.primaryOperator.name} family
                      </Link>
                    )}
                    {mapRefUrl && (
                      <a href={mapRefUrl} target="_blank" rel="noopener noreferrer">Map ↗</a>
                    )}
                  </div>
                )}
              </div>

              <aside id="rail-column">
                {signalsList.length > 0 && (
                  <div className="rail-block">
                    <strong>Signals</strong>
                    <p style={{ margin: '4px 0 0' }}>{signalsList.join(' · ')}</p>
                  </div>
                )}
                {appearsOn.length > 0 && (
                  <div className="rail-block">
                    <strong>Record</strong>
                    <p style={{ margin: '4px 0 0' }}>Appears on {appearsOn.length} map{appearsOn.length !== 1 ? 's' : ''}</p>
                  </div>
                )}
              </aside>
            </section>

            {/* Editorial Stack: Curator Note → Tips → Quote */}
            <div id="editorial-stack">
              {location.curatorNote && (
                <>
                  <article id="curator-note" className="editorial-block section-with-provenance">
                    <p>{location.curatorNote}</p>
                    {location.curatorCreatorName && <p className="curator-byline">{location.curatorCreatorName}</p>}
                    <a href="#ledger-curator" className="provenance-diamond" aria-label="Sources for this section" />
                  </article>
                  <hr />
                </>
              )}
              {location.tips && location.tips.length > 0 && (
                <>
                  <section id="tips" className="editorial-block section-with-provenance">
                    <ul id="tips-list">
                      {location.tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                    <a href="#ledger-tips" className="provenance-diamond" aria-label="Sources for this section" />
                  </section>
                  <hr />
                </>
              )}
              {location.pullQuote && (
                <blockquote id="pull-quote" className="editorial-block section-with-provenance">
                  <p>&ldquo;{location.pullQuote}&rdquo;</p>
                  <cite>
                    {[location.pullQuoteSource, location.pullQuoteAuthor].filter(Boolean).join(' — ')}
                  </cite>
                  <a href="#ledger-quote" className="provenance-diamond" aria-label="Sources for this section" />
                </blockquote>
              )}
            </div>

            {/* Photos Section */}
            {photoUrls.length > 0 && (
              <section id="photos-section">
                <h2>Photos</h2>
                <div id="photos-grid">
                  {photoUrls.map((url, i) => (
                    <div key={i} className="photo-tile" role="button" tabIndex={0} onClick={() => openGallery(i)} onKeyDown={(e) => e.key === 'Enter' && openGallery(i)}>
                      <img src={url} alt="" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Where to find this (subject appearances) */}
            {location.appearancesAsSubject && location.appearancesAsSubject.length > 0 && (
              <section id="appearances-as-subject" className="section-with-provenance">
                <h2>Where to find this</h2>
                <ul id="appearances-as-subject-list" className="space-y-2">
                  {location.appearancesAsSubject.map((a) => (
                    <li key={a.id}>
                      {a.hostPlace ? (
                        <Link href={`/place/${a.hostPlace.slug}`} className="text-[#5BA7A7] hover:underline">
                          {a.hostPlace.name}
                        </Link>
                      ) : (
                        <span>{a.addressText ?? 'Specific location'}</span>
                      )}
                      <span className="text-[#8B7355] ml-2">— {a.scheduleText}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Currently hosting / Appearances here */}
            {location.appearancesAsHost && location.appearancesAsHost.length > 0 && (
              <section id="appearances-as-host" className="section-with-provenance">
                <h2>Currently hosting</h2>
                <ul id="appearances-as-host-list" className="space-y-2">
                  {location.appearancesAsHost.map((a) => (
                    <li key={a.id}>
                      {a.subjectPlace ? (
                        <Link href={`/place/${a.subjectPlace.slug}`} className="text-[#5BA7A7] hover:underline">
                          {a.subjectPlace.name}
                        </Link>
                      ) : (
                        <span>Place</span>
                      )}
                      <span className="text-[#8B7355] ml-2">— {a.scheduleText}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Recognitions (capped, hide if 0) */}
            {recognitions.length > 0 && (
              <section id="recognitions-section" className="section-with-provenance">
                <h2>Recognitions</h2>
                <ul id="recognitions-list">
                  {recognitions.map((rec, i) => (
                    <li key={i}>{rec.name}{rec.source ? ` — ${rec.source}` : ''}{rec.year ? ` (${rec.year})` : ''}</li>
                  ))}
                </ul>
                <a href="#ledger-recognitions" className="provenance-diamond" aria-label="Sources for this section" />
              </section>
            )}

            {/* Reference Ledger */}
            <footer id="reference-ledger">
              <h2 id="ledger-anchor">Reference Ledger</h2>
              {ledgerGroups.map((group) => (
                <div key={group.section} className="ledger-group" id={`ledger-${group.section}`}>
                  <h3>{group.section === 'record' ? 'Record' : group.section.charAt(0).toUpperCase() + group.section.slice(1)}</h3>
                  <ul className="ledger-entries">
                    {group.entries.slice(0, LEDGER_CAP_PER_GROUP).map((entry, i) => (
                      <li key={i}>
                        {entry.source} — {entry.role}
                        {entry.date && <span className="ledger-date">{entry.date}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="methodology-link">
                <Link href="/sources">Methodology / Sources</Link>
              </p>
            </footer>
          </div>
        </div>
      </main>

      {lightboxOpen && photoUrls.length > 0 && (
        <GalleryLightbox photos={photoUrls} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
      )}

      <GlobalFooter variant="minimal" />
    </div>
  );
}
