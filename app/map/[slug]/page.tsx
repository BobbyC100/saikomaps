'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader } from '@googlemaps/js-api-loader';
import { Pencil, X } from 'lucide-react';
import { getMapTemplate, type MapTemplate } from '@/lib/map-templates';
import { EditLocationModal } from './components/EditLocationModal';
import { MapHeader } from './components/MapHeader';
import { TitleCard } from './components/TitleCard';

interface Location {
  id: string;
  name: string;
  address: string | null;
  category: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  userNote: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  userPhotos: string[];
  googlePhotos: unknown; // Json: array of { photo_reference } or similar
  orderIndex: number;
}

interface MapData {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  templateType: string;
  userId: string;
  creatorName?: string;
  coverImageUrl?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  isOwner?: boolean;
  locations: Location[];
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

function getLocationPhotoUrl(loc: Location): string | null {
  if (loc.userPhotos?.length) return loc.userPhotos[0];
  if (loc.googlePhotos && Array.isArray(loc.googlePhotos) && loc.googlePhotos.length) {
    const first = loc.googlePhotos[0] as { photo_reference?: string };
    const ref = first?.photo_reference;
    if (ref && GOOGLE_MAPS_API_KEY) {
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${ref}&key=${GOOGLE_MAPS_API_KEY}`;
    }
  }
  return null;
}

function parseLatLng(lat: number | string | null, lng: number | string | null): { lat: number; lng: number } | null {
  if (lat == null || lng == null) return null;
  const la = typeof lat === 'string' ? parseFloat(lat) : lat;
  const ln = typeof lng === 'string' ? parseFloat(lng) : lng;
  if (Number.isNaN(la) || Number.isNaN(ln)) return null;
  return { lat: la, lng: ln };
}

export default function PublicMapPage({ params }: { params: Promise<{ slug: string }> }) {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardsScrollRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const googleMapsRef = useRef<typeof google | null>(null);

  const template: MapTemplate = getMapTemplate(mapData?.templateType);
  const locations = mapData?.locations ?? [];
  const hasValidLocations = locations.some((loc) => parseLatLng(loc.latitude, loc.longitude));

  const scrollToCard = useCallback((index: number) => {
    setMobileView('list');
    setTimeout(() => {
      cardRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setActiveCardIndex(index);
    }, 100);
  }, []);

  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);
  
  const handleSaveLocation = useCallback(async (updatedData: Partial<Location>) => {
    if (!editingLocation || !mapData) return;
    
    setIsSaving(true);
    const originalLocation = { ...editingLocation };
    const locationId = editingLocation.id;
    
    try {
      // Optimistic update
      setMapData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          locations: prev.locations.map((l) =>
            l.id === locationId ? { ...l, ...updatedData } : l
          ),
        };
      });

      // Save to API
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update location');
      }

      setEditingLocation(null);
    } catch (error) {
      // Rollback on error
      setMapData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          locations: prev.locations.map((l) =>
            l.id === locationId ? originalLocation : l
          ),
        };
      });
      alert(`Failed to update location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  }, [editingLocation, mapData]);

  const handleDeleteLocation = useCallback(async (locationId: string) => {
    if (!mapData) return;
    
    if (!confirm('Are you sure you want to delete this location?')) {
      return;
    }

    setDeletingLocationId(locationId);
    
    try {
      // Optimistic update - remove from UI immediately
      setMapData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          locations: prev.locations.filter((l) => l.id !== locationId),
        };
      });

      // Delete from API
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete location');
      }

      // Refresh map data to ensure consistency
      const refreshResponse = await fetch(`/api/maps/public/${mapData.slug}`);
      if (refreshResponse.ok) {
        const json = await refreshResponse.json();
        if (json?.data) {
          setMapData(json.data);
        }
      }
    } catch (error) {
      // Rollback on error - refresh to get correct state
      const refreshResponse = await fetch(`/api/maps/public/${mapData.slug}`);
      if (refreshResponse.ok) {
        const json = await refreshResponse.json();
        if (json?.data) {
          setMapData(json.data);
        }
      }
      alert(`Failed to delete location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingLocationId(null);
    }
  }, [mapData]);

  // Load map data
  useEffect(() => {
    let cancelled = false;
    params.then((p) => {
      fetch(`/api/maps/public/${p.slug}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (!cancelled && json?.data) {
            console.log('[MAP] Loaded map data:', {
              title: json.data.title,
              isOwner: json.data.isOwner,
              userId: json.data.userId,
            });
            setMapData(json.data);
            cardRefs.current = [];
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    });
    return () => { cancelled = true; };
  }, [params]);

  // Init Google Map (desktop: right panel; mobile: when view is 'map')
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !mapData || !mapContainerRef.current || !hasValidLocations) return;

    const points = locations
      .map((loc) => parseLatLng(loc.latitude, loc.longitude))
      .filter((p): p is { lat: number; lng: number } => p != null);

    if (points.length === 0) return;

    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
    });

    let map: google.maps.Map | null = null;
    const markers: google.maps.Marker[] = [];

    loader.load().then((g) => {
      googleMapsRef.current = g;
      if (!mapContainerRef.current) return;
      map = new g.maps.Map(mapContainerRef.current, {
        center: points[0],
        zoom: 12,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      mapInstanceRef.current = map;

      const bounds = new g.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      if (points.length > 1) map.fitBounds(bounds, 48);

      points.forEach((point, i) => {
        const marker = new g.maps.Marker({
          position: point,
          map,
          label: { text: String(i + 1), color: 'white', fontWeight: 'bold' },
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 22,
            fillColor: template.accent,
            fillOpacity: 1,
            strokeColor: template.bg === '#1A1A1A' ? '#fff' : '#333',
            strokeWeight: 2,
          },
        });
        marker.addListener('click', () => scrollToCard(i));
        markers.push(marker);
      });
      markersRef.current = markers;
    }).catch(() => {});

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      mapInstanceRef.current = null;
    };
  }, [mapData?.id, hasValidLocations, template.accent, template.bg, scrollToCard]);

  // Highlight active marker when card is in viewport
  useEffect(() => {
    const g = googleMapsRef.current;
    if (!g || markersRef.current.length === 0) return;
    const markers = markersRef.current;
    markers.forEach((marker, i) => {
      const isActive = i === activeCardIndex;
      marker.setIcon({
        path: g.maps.SymbolPath.CIRCLE,
        scale: isActive ? 26 : 22,
        fillColor: template.accent,
        fillOpacity: 1,
        strokeColor: template.bg === '#1A1A1A' ? '#fff' : '#333',
        strokeWeight: isActive ? 3 : 2,
      });
    });
  }, [activeCardIndex, template.accent, template.bg]);

  // IntersectionObserver: set active card when scrolling (desktop)
  useEffect(() => {
    if (locations.length === 0 || !cardsScrollRef.current) return;
    const root = cardsScrollRef.current;
    const refs = cardRefs.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = refs.indexOf(entry.target as HTMLDivElement);
          if (idx >= 0) setActiveCardIndex(idx);
        });
      },
      { root, rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );
    const timer = setTimeout(() => {
      refs.forEach((el) => el && observer.observe(el));
    }, 100);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [mapData?.id, locations.length]);

  // Debug log for ownership (must be before early returns)
  useEffect(() => {
    if (mapData) {
      console.log('[MAP] Owner check:', {
        mapDataIsOwner: mapData.isOwner,
        mapUserId: mapData.userId,
        willShowButtons: mapData.isOwner === true,
      });
    }
  }, [mapData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: template.bg }}>
        <div className="text-lg" style={{ color: template.text }}>Loading...</div>
      </div>
    );
  }

  if (!mapData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1A1A1A' }}>
        <div className="text-center">
          <div className="text-white text-2xl mb-4">Map not found</div>
          <Link href="/" className="text-[#89B4C4] hover:underline">Go home</Link>
        </div>
      </div>
    );
  }

  const isOwner = mapData?.isOwner ?? false;
  
  return (
    <div
      className={`min-h-screen ${template.fontClass}`}
      style={{ backgroundColor: template.bg, color: template.text }}
    >
      {/* Minimal Header - Logo only */}
      <MapHeader template={template} />

      {/* Split layout: cards left, map right (desktop); toggle (mobile) */}
      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-8rem)]">
        {/* Left: scrollable cards */}
        <div
          ref={cardsScrollRef}
          className={`flex-1 overflow-y-auto map-cards-scroll ${mobileView === 'map' ? 'hidden lg:block' : ''}`}
          style={{ maxHeight: '100%' }}
        >
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-6">
            {/* Title Card */}
            {mapData && (
              <TitleCard
                mapData={{
                  title: mapData.title,
                  subtitle: mapData.subtitle,
                  coverImageUrl: mapData.coverImageUrl,
                  creatorName: mapData.creatorName || 'Unknown',
                  createdAt: mapData.createdAt,
                  updatedAt: mapData.updatedAt,
                  locations: mapData.locations,
                  slug: mapData.slug,
                }}
                isOwner={isOwner}
                template={template}
                onEdit={() => {
                  // TODO: Navigate to edit page or open edit modal
                  console.log('Edit map');
                }}
              />
            )}

            {/* Mobile toggle */}
            <div className="flex lg:hidden gap-2 mb-6">
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${mobileView === 'list' ? 'text-white' : ''}`}
                style={{
                  backgroundColor: mobileView === 'list' ? template.accent : (template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                  color: mobileView === 'list' ? (template.bg === '#1A1A1A' ? '#1A1A1A' : '#fff') : template.text,
                }}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setMobileView('map')}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${mobileView === 'map' ? 'text-white' : ''}`}
                style={{
                  backgroundColor: mobileView === 'map' ? template.accent : (template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                  color: mobileView === 'map' ? (template.bg === '#1A1A1A' ? '#1A1A1A' : '#fff') : template.text,
                }}
              >
                Map
              </button>
            </div>

      {/* Split layout: cards left, map right (desktop); toggle (mobile) */}
      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-12rem)]">
        {/* Left: scrollable cards */}
        <div
          ref={cardsScrollRef}
          className={`flex-1 overflow-y-auto map-cards-scroll ${mobileView === 'map' ? 'hidden lg:block' : ''}`}
          style={{ maxHeight: '100%' }}
        >
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-6 space-y-6">
            {locations.map((loc, index) => {
              const photoUrl = getLocationPhotoUrl(loc);
              const latLng = parseLatLng(loc.latitude, loc.longitude);
              const description = loc.description || loc.userNote || null;
              
              // Ensure name is never empty or a URL
              // Check for various URL patterns
              const isUrl = loc.name && (
                loc.name.startsWith('http://') ||
                loc.name.startsWith('https://') ||
                loc.name.startsWith('www.') ||
                loc.name.includes('google.com/maps') ||
                loc.name.includes('maps.google.com') ||
                loc.name.match(/^https?:\/\//) // Catch any http/https pattern
              );
              
              // If name is a URL, try to extract a meaningful name
              let displayName = 'Untitled Location';
              if (loc.name && !isUrl) {
                displayName = loc.name.trim();
              } else if (isUrl && loc.name) {
                // Try to extract name from Google Maps URL
                const urlMatch = loc.name.match(/\/place\/([^/?]+)/);
                if (urlMatch) {
                  displayName = decodeURIComponent(urlMatch[1].replace(/\+/g, ' '));
                }
              }
              
              // Final fallback
              if (!displayName || displayName.length === 0) {
                displayName = 'Untitled Location';
              }

              return (
                <div
                  key={loc.id}
                  ref={(el) => {
                    if (cardRefs.current.length <= index) cardRefs.current.length = index + 1;
                    cardRefs.current[index] = el;
                  }}
                  className={`p-6 ${template.cardClass} transition-shadow relative`}
                  style={{
                    backgroundColor: template.bg === '#1A1A1A' ? '#2A2A2A' : template.bg === '#FDF6E3' ? '#FFFFFF' : template.bg === '#F5F0E1' ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                    borderColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    boxShadow: template.id === 'postcard' ? '0 4px 14px rgba(0,0,0,0.08)' : undefined,
                    color: template.text,
                    position: 'relative', // Ensure relative positioning for absolute children
                  }}
                >
                  {/* Edit and Delete buttons - top right corner (owner only) */}
                  {isOwner && (
                    <div className="absolute top-2 right-2 flex gap-2 z-30" style={{ pointerEvents: 'auto' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setEditingLocation(loc);
                        }}
                        className="rounded-lg hover:opacity-80 transition-opacity shadow-lg"
                        style={{ 
                          backgroundColor: 'transparent',
                          border: `2px solid ${template.accent}`,
                          color: template.accent,
                          width: '30px',
                          height: '30px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                          padding: 0,
                        }}
                        title="Edit location"
                        aria-label="Edit location"
                      >
                        <Pencil size={14} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDeleteLocation(loc.id);
                        }}
                        disabled={deletingLocationId === loc.id}
                        className="rounded-lg hover:opacity-80 transition-opacity shadow-lg"
                        style={{ 
                          backgroundColor: 'transparent',
                          border: '2px solid #E88B7C',
                          color: '#E88B7C',
                          width: '30px',
                          height: '30px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: deletingLocationId === loc.id ? 'wait' : 'pointer',
                          opacity: deletingLocationId === loc.id ? 0.6 : 1,
                          flexShrink: 0,
                          padding: 0,
                        }}
                        title="Delete location"
                        aria-label="Delete location"
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex gap-4">
                    <div
                      className="w-12 h-12 flex-shrink-0 rounded-lg flex items-center justify-center font-bold text-lg text-white"
                      style={{ backgroundColor: template.accent }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold mb-1" style={{ color: template.text }}>
                        {displayName}
                      </h2>
                      {loc.category && (
                        <span
                          className="inline-block px-2 py-0.5 text-xs font-medium rounded mb-2"
                          style={{ backgroundColor: `${template.accent}22`, color: template.accent }}
                        >
                          {loc.category}
                        </span>
                      )}
                    </div>
                  </div>
                  {photoUrl && (
                    <div className="mt-4 rounded-lg overflow-hidden aspect-video max-h-48">
                      <img
                        src={photoUrl}
                        alt={loc.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {description && (
                    <p className="mt-4 text-base leading-relaxed" style={{ color: template.textMuted }}>
                      {description}
                    </p>
                  )}
                  <div className="mt-4 space-y-2 text-sm">
                    {loc.address && !loc.address.startsWith('http') && !loc.address.startsWith('https') && !loc.address.includes('google.com/maps') && (
                      <div className="flex gap-2">
                        <span style={{ color: template.textMuted }}>📍</span>
                        <a
                          href={latLng ? `https://www.google.com/maps/search/?api=1&query=${latLng.lat},${latLng.lng}` : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          style={{ color: template.text }}
                        >
                          {loc.address}
                        </a>
                      </div>
                    )}
                    {loc.phone && (
                      <div className="flex gap-2">
                        <span style={{ color: template.textMuted }}>📞</span>
                        <a href={`tel:${loc.phone}`} className="hover:underline" style={{ color: template.text }}>{loc.phone}</a>
                      </div>
                    )}
                    {loc.website && (
                      <div className="flex gap-2">
                        <span style={{ color: template.textMuted }}>🌐</span>
                        <a href={loc.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate" style={{ color: template.text }}>
                          Visit Website
                        </a>
                      </div>
                    )}
                    {!loc.website && !loc.phone && (!loc.address || loc.address.startsWith('http') || loc.address.includes('google.com/maps')) && !latLng && (
                      <div className="text-xs italic" style={{ color: template.textMuted }}>
                        Additional details will be available after location enrichment
                      </div>
                    )}
                    {latLng && (
                      <div className="pt-2 border-t" style={{ borderColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${latLng.lat},${latLng.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                          style={{ color: template.textMuted }}
                        >
                          Open in Google Maps →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: sticky map (desktop) or full-screen (mobile when Map selected) */}
        <div
          className={`flex-shrink-0 w-full lg:w-1/2 lg:min-h-[400px] lg:sticky lg:top-0 ${mobileView === 'list' ? 'hidden lg:block' : ''}`}
          style={{ height: mobileView === 'map' ? '70vh' : '100%' }}
        >
          {GOOGLE_MAPS_API_KEY && hasValidLocations ? (
            <div ref={mapContainerRef} className="w-full h-full min-h-[300px]" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-center p-8"
              style={{ backgroundColor: template.bg === '#1A1A1A' ? '#252525' : 'rgba(0,0,0,0.04)', color: template.textMuted }}
            >
              {!GOOGLE_MAPS_API_KEY
                ? 'Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to show the map.'
                : 'Add locations with coordinates to see the map.'}
            </div>
          )}
        </div>
      </div>

      {/* Edit Location Modal */}
      {editingLocation && isOwner && (
        <EditLocationModal
          location={editingLocation}
          template={template}
          onClose={() => setEditingLocation(null)}
          onSave={handleSaveLocation}
          isSaving={isSaving}
        />
      )}

      {/* Minimal Footer */}
      <footer
        className="border-t py-6 mt-auto"
        style={{ borderColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs" style={{ color: template.textMuted }}>Saiko Maps</p>
        </div>
      </footer>
    </div>
  );
}
