'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { getMapTemplate, MAP_TEMPLATES, type MapTemplate } from '@/lib/map-templates';
import { DEV_SHOW_ALL_UI } from '@/lib/config';
import { saikoMapStyle } from '@/lib/mapStyle';
import { getGooglePhotoUrl, getPhotoRefFromStored } from '@/lib/google-places';
import { getMarkerIcon } from '@/lib/categoryMapping';
import { EditLocationModal } from './components/EditLocationModal';
import { MapHeader } from './components/MapHeader';
import { TitleCard } from './components/TitleCard';
import { FieldNotesMapView } from './components/field-notes/FieldNotesMapView';
import { SkateLayerToggle } from './components/SkateLayerToggle';
import { SkateSpotDetailPanel, type SkateSpot } from './components/SkateSpotDetailPanel';
import { GlobalFooter } from '@/components/layouts/GlobalFooter';
import { LocationCard } from '@/components/LocationCard';

interface Location {
  id: string;
  placeSlug?: string;
  name: string;
  address: string | null;
  category: string | null;
  neighborhood?: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  hours: Record<string, string> | null;
  description: string | null;
  descriptor?: string | null; // Curator's editorial (MapPlace)
  userNote: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  userPhotos: string[];
  googlePhotos: unknown;
  orderIndex: number;
  priceLevel?: number | null;
  cuisineType?: string | null;
}

interface MapPlaceWithPlace {
  id: string;
  descriptor: string | null;
  userNote: string | null;
  userPhotos: string[];
  orderIndex: number;
  place: {
    id: string;
    slug: string;
    name: string;
    address: string | null;
    category: string | null;
    neighborhood?: string | null;
    phone: string | null;
    website: string | null;
    instagram: string | null;
    hours: unknown;
    description: string | null;
    latitude: unknown;
    longitude: unknown;
    googlePhotos: unknown;
    priceLevel?: number | null;
    cuisineType?: string | null;
  };
}

interface MapData {
  id: string;
  title: string;
  subtitle: string | null;
  description?: string | null;
  descriptionSource?: string | null;
  slug: string;
  templateType: string;
  userId: string;
  creatorName?: string;
  coverImageUrl?: string | null;
  introText?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  isOwner?: boolean;
  mapPlaces?: MapPlaceWithPlace[];
  locations?: Location[]; // Computed from mapPlaces for compatibility
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

function getLocationPhotoUrl(loc: Location, maxWidth: number = 400): string | null {
  if (loc.userPhotos?.length) return loc.userPhotos[0];
  if (loc.googlePhotos && Array.isArray(loc.googlePhotos) && loc.googlePhotos.length) {
    const ref = getPhotoRefFromStored(loc.googlePhotos[0] as { photo_reference?: string; photoReference?: string; name?: string });
    if (ref && GOOGLE_MAPS_API_KEY) {
      try {
        return getGooglePhotoUrl(ref, maxWidth);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Exclude Street View / photosphere photos (attribution is just "Google"). */
function filterStreetViewPhotos(
  photos: Array<{ html_attributions?: string[]; photo_reference?: string; photoReference?: string; name?: string }>
): typeof photos {
  return photos.filter((p) => {
    const attrs = p.html_attributions;
    if (!attrs || attrs.length === 0) return true;
    if (attrs.length > 1) return true; // Multiple attributions = likely user photos
    const text = (attrs[0] || '').replace(/<[^>]+>/g, '').trim();
    if (!text) return true;
    // Exclude if sole attribution is "Google" (Street View)
    if (/^Google$/i.test(text)) return false;
    return true;
  });
}

/** Get up to 3 photo URLs for gallery: main (400px) + 2 thumbs (200px). Excludes Street View photos. */
function getLocationPhotoGallery(loc: Location): {
  mainUrl: string | null;
  thumbUrls: string[];
  totalCount: number;
} {
  if (loc.userPhotos?.length) {
    return {
      mainUrl: loc.userPhotos[0],
      thumbUrls: loc.userPhotos.slice(1, 3),
      totalCount: loc.userPhotos.length,
    };
  }
  const raw = loc.googlePhotos && Array.isArray(loc.googlePhotos) ? loc.googlePhotos : [];
  const filtered = filterStreetViewPhotos(raw as Array<{ html_attributions?: string[]; photo_reference?: string; photoReference?: string; name?: string }>);
  const arr = filtered.length > 0 ? filtered : raw;
  if (!arr.length || !GOOGLE_MAPS_API_KEY) {
    return { mainUrl: null, thumbUrls: [], totalCount: 0 };
  }
  const mainRef = getPhotoRefFromStored(arr[0] as { photo_reference?: string; photoReference?: string; name?: string });
  const mainUrl = mainRef ? (() => { try { return getGooglePhotoUrl(mainRef, 400); } catch { return null; } })() : null;
  const thumbUrls: string[] = [];
  for (let i = 1; i < Math.min(3, arr.length); i++) {
    const ref = getPhotoRefFromStored(arr[i] as { photo_reference?: string; photoReference?: string; name?: string });
    if (ref) {
      try {
        const url = getGooglePhotoUrl(ref, 200);
        if (url) thumbUrls.push(url);
      } catch { /* skip */ }
    }
  }
  return { mainUrl, thumbUrls, totalCount: arr.length };
}

/** Get 3 hero photos from first 3 places (for collage when map has 3+ places). */
function getHeroCollageUrls(locations: Location[]): string[] {
  const urls: string[] = [];
  for (let i = 0; i < Math.min(3, locations.length); i++) {
    const u = getLocationPhotoUrl(locations[i], 600);
    if (u) urls.push(u);
  }
  return urls;
}

function parseLatLng(lat: number | string | null, lng: number | string | null): { lat: number; lng: number } | null {
  if (lat == null || lng == null) return null;
  const la = typeof lat === 'string' ? parseFloat(lat) : lat;
  const ln = typeof lng === 'string' ? parseFloat(lng) : lng;
  if (Number.isNaN(la) || Number.isNaN(ln)) return null;
  return { lat: la, lng: ln };
}

export default function PublicMapPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const devOwner = searchParams.get('devOwner') === '1';
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const cardsScrollRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const googleMapsRef = useRef<typeof google | null>(null);
  const skateMarkersRef = useRef<google.maps.Marker[]>([]);
  const skateClustererRef = useRef<MarkerClusterer | null>(null);

  let template: MapTemplate = getMapTemplate(mapData?.templateType);
  // Flatten mapPlaces to locations (place + mapPlace curator data)
  const locations: Location[] = (mapData?.mapPlaces ?? mapData?.locations ?? []).map((mp: MapPlaceWithPlace | Location) => {
    if ('place' in mp && mp.place) {
      const p = mp.place;
      return {
        id: mp.id,
        placeSlug: p.slug,
        name: p.name,
        address: p.address,
        category: p.category,
        neighborhood: (p as { neighborhood?: string }).neighborhood ?? null,
        phone: p.phone,
        website: p.website,
        instagram: p.instagram,
        hours: (p.hours as Record<string, string>) ?? null,
        description: p.description,
        descriptor: mp.descriptor,
        userNote: mp.userNote,
        latitude: p.latitude,
        longitude: p.longitude,
        userPhotos: mp.userPhotos ?? [],
        googlePhotos: p.googlePhotos,
        orderIndex: mp.orderIndex,
        priceLevel: p.priceLevel ?? null,
        cuisineType: p.cuisineType ?? null,
      } as Location;
    }
    return mp as Location;
  });
  const hasValidLocations = locations.some((loc) => parseLatLng(loc.latitude, loc.longitude));

  // Override black/yellow monocle template to use postcard colors instead
  if (template.id === 'monocle') {
    template = MAP_TEMPLATES.postcard;
  }

  const scrollToCard = useCallback((index: number) => {
    setMobileView('list');
    setActiveCardIndex(index);
    setTimeout(() => {
      cardRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);
  const [skateLayerOn, setSkateLayerOn] = useState(true);
  const [activeSkateSpot, setActiveSkateSpot] = useState<SkateSpot | null>(null);
  const [mapReady, setMapReady] = useState(false);
  
  const handleSaveLocation = useCallback(async (updatedData: Partial<Location>) => {
    if (!editingLocation || !mapData) return;
    
    setIsSaving(true);
    const originalLocation = { ...editingLocation };
    const locationId = editingLocation.id;
    
    try {
      // Optimistic update (mapPlaces + nested place)
      setMapData((prev) => {
        if (!prev?.mapPlaces) return prev;
        return {
          ...prev,
          mapPlaces: prev.mapPlaces.map((mp) =>
            mp.id === locationId
              ? {
                  ...mp,
                  descriptor: updatedData.descriptor ?? mp.descriptor,
                  userNote: updatedData.userNote ?? mp.userNote,
                  userPhotos: updatedData.userPhotos ?? mp.userPhotos,
                  place:
                    updatedData.neighborhood !== undefined || updatedData.priceLevel !== undefined || updatedData.cuisineType !== undefined
                      ? {
                          ...mp.place,
                          neighborhood: updatedData.neighborhood !== undefined ? updatedData.neighborhood : mp.place.neighborhood,
                          priceLevel: updatedData.priceLevel !== undefined ? updatedData.priceLevel : mp.place.priceLevel,
                          cuisineType: updatedData.cuisineType !== undefined ? updatedData.cuisineType : mp.place.cuisineType,
                        }
                      : mp.place,
                }
              : mp
          ),
        };
      });

      // Save to API (mapPlace id)
      const response = await fetch(`/api/map-places/${locationId}`, {
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
        if (!prev?.mapPlaces) return prev;
        return {
          ...prev,
          mapPlaces: prev.mapPlaces.map((mp) =>
            mp.id === locationId
              ? {
                  ...mp,
                  descriptor: originalLocation.descriptor ?? mp.descriptor,
                  userNote: originalLocation.userNote ?? mp.userNote,
                  userPhotos: originalLocation.userPhotos ?? mp.userPhotos,
                  place: {
                    ...mp.place,
                    neighborhood: originalLocation.neighborhood ?? mp.place.neighborhood,
                    priceLevel: originalLocation.priceLevel ?? mp.place.priceLevel,
                    cuisineType: originalLocation.cuisineType ?? mp.place.cuisineType,
                  },
                }
              : mp
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
      // Optimistic update - remove from UI immediately (mapPlaces)
      setMapData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          mapPlaces: (prev.mapPlaces ?? []).filter((mp) => mp.id !== locationId),
        };
      });

      // Delete from API (mapPlace id - removes from map, does not delete Place)
      const response = await fetch(`/api/map-places/${locationId}`, {
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
      fetch(`/api/maps/public/${p.slug}${devOwner ? '?devOwner=1' : ''}`)
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
  }, [params, devOwner]);

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
    let clusterer: MarkerClusterer | null = null;

    loader.load().then((g) => {
      googleMapsRef.current = g;
      if (!mapContainerRef.current) return;
      
      // Clear existing markers and clusterer
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      map = new g.maps.Map(mapContainerRef.current, {
        center: points[0],
        zoom: 12,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: saikoMapStyle,
      });
      mapInstanceRef.current = map;

      const bounds = new g.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      if (points.length === 1) {
        map.setCenter(points[0]);
        map.setZoom(14);
      } else {
        map.fitBounds(bounds, { top: 80, bottom: 40, left: 0, right: 40 });
        const idleListener = map.addListener('idle', () => {
          const zoom = map.getZoom();
          if (zoom != null && zoom > 15) map.setZoom(15);
          g.maps.event.removeListener(idleListener);
        });
      }

      // Create markers with category icons
      const markers = points.map((point, i) => {
        const loc = locations[i];
        const category = loc?.category || 'eat';
        const marker = new g.maps.Marker({
          position: point,
          icon: {
            url: getMarkerIcon(category),
            scaledSize: new g.maps.Size(36, 36),
            anchor: new g.maps.Point(18, 18),
          },
        });
        marker.addListener('click', () => scrollToCard(i));
        return marker;
      });

      // Smooth zoom function
      const smoothZoom = (targetZoom: number, targetCenter?: google.maps.LatLng) => {
        if (!map) return;
        
        const currentZoom = map.getZoom() || 10;
        const zoomDiff = targetZoom - currentZoom;
        if (Math.abs(zoomDiff) < 0.1) return; // Already at target zoom
        
        const steps = Math.abs(zoomDiff) * 4; // More steps = smoother
        const duration = 400; // Total animation time in ms
        const stepDuration = duration / steps;
        
        let step = 0;
        
        // Ease to center first if provided
        if (targetCenter) {
          map.panTo(targetCenter);
        }
        
        const interval = setInterval(() => {
          if (!map) return;
          step++;
          const progress = step / steps;
          // Ease-out cubic for smooth deceleration
          const eased = 1 - Math.pow(1 - progress, 3);
          const newZoom = currentZoom + (zoomDiff * eased);
          
          map.setZoom(newZoom);
          
          if (step >= steps) {
            clearInterval(interval);
            map.setZoom(targetZoom); // Ensure exact final zoom
          }
        }, stepDuration);
      };

      // Create clusterer with custom coral styling
      clusterer = new MarkerClusterer({
        map,
        markers,
        renderer: {
          render: ({ count, position }) => {
            return new g.maps.Marker({
              position,
              icon: {
                path: g.maps.SymbolPath.CIRCLE,
                fillColor: '#E07A5F',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
                scale: 20,
              },
              label: {
                text: String(count),
                color: 'white',
                fontWeight: 'bold',
                fontSize: '12px',
              },
              zIndex: Number(g.maps.Marker.MAX_ZINDEX) + count,
            });
          },
        },
      });

      // Add smooth zoom on cluster click
      clusterer.addListener('click', (event: any) => {
        if (!map) return;
        const clusterCenter = event.position as google.maps.LatLng;
        const currentZoom = map.getZoom() || 10;
        const maxZoom = 18;
        const targetZoom = Math.min(currentZoom + 2, maxZoom);
        smoothZoom(targetZoom, clusterCenter);
      });

      markersRef.current = markers;
      clustererRef.current = clusterer;
      setMapReady(true);
    }).catch((error) => {
      console.error('Error loading Google Maps:', error);
    });

    return () => {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      mapInstanceRef.current = null;
      setMapReady(false);
    };
  }, [mapData?.id, hasValidLocations, template.accent, template.bg, scrollToCard, locations]);

  // Skate layer: fetch spots and add markers when layer is on
  useEffect(() => {
    const map = mapInstanceRef.current;
    const g = googleMapsRef.current;
    if (!map || !g || !skateLayerOn) {
      if (skateClustererRef.current) {
        skateClustererRef.current.clearMarkers();
        skateClustererRef.current = null;
      }
      skateMarkersRef.current.forEach((m) => m.setMap(null));
      skateMarkersRef.current = [];
      return;
    }

    let cancelled = false;
    fetch('/api/spots/geojson?layer=SKATE')
      .then((res) => res.ok ? res.json() : null)
      .then((fc: { features?: Array<{ geometry: { coordinates: [number, number] }; properties: Record<string, unknown> }> }) => {
        if (cancelled || !fc?.features?.length) return;
        const markers = fc.features.map((f) => {
          const [lng, lat] = f.geometry.coordinates;
          const props = f.properties || {};
          const marker = new g.maps.Marker({
            position: { lat, lng },
            map,
            icon: {
              url: '/markers/skate.svg',
              scaledSize: new g.maps.Size(32, 32),
              anchor: new g.maps.Point(16, 16),
            },
            zIndex: 100,
          });
          marker.addListener('click', () => {
            setActiveSkateSpot({
              id: String(props.id),
              name: String(props.name || ''),
              slug: props.slug ? String(props.slug) : null,
              spotType: props.spotType ? String(props.spotType) : null,
              tags: Array.isArray(props.tags) ? props.tags.map(String) : [],
              surface: props.surface ? String(props.surface) : null,
              skillLevel: null,
              description: props.description ? String(props.description) : null,
              region: props.region ? String(props.region) : null,
              source: String(props.source || 'OSM'),
              sourceUrl: props.sourceUrl ? String(props.sourceUrl) : null,
            });
          });
          return marker;
        });
        const clusterer = new MarkerClusterer({
          map,
          markers,
          renderer: {
            render: ({ count, position }) =>
              new g.maps.Marker({
                position,
                icon: {
                  path: g.maps.SymbolPath.CIRCLE,
                  fillColor: '#3D5A80',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 2,
                  scale: 18,
                },
                label: { text: String(count), color: 'white', fontWeight: 'bold', fontSize: '11px' },
                zIndex: 101,
              }),
          },
        });
        skateMarkersRef.current = markers;
        skateClustererRef.current = clusterer;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (skateClustererRef.current) {
        skateClustererRef.current.clearMarkers();
        skateClustererRef.current = null;
      }
      skateMarkersRef.current.forEach((m) => m.setMap(null));
      skateMarkersRef.current = [];
    };
  }, [skateLayerOn, mapData?.id, hasValidLocations, mapReady]);

  // Highlight active marker when card is in viewport (scale up category icon)
  useEffect(() => {
    const g = googleMapsRef.current;
    if (!g || markersRef.current.length === 0 || !clustererRef.current) return;
    const markers = markersRef.current;
    markers.forEach((marker, i) => {
      const isActive = i === activeCardIndex;
      const loc = locations[i];
      const category = loc?.category || 'eat';
      const size = isActive ? 44 : 36;
      marker.setIcon({
        url: getMarkerIcon(category),
        scaledSize: new g.maps.Size(size, size),
        anchor: new g.maps.Point(size / 2, size / 2),
      });
    });
    clustererRef.current.render();
  }, [activeCardIndex, template.accent, template.bg, locations]);

  // IntersectionObserver: set active card when scrolling (desktop)
  useEffect(() => {
    if (locations.length === 0 || !cardsScrollRef.current) return;
    const root = cardsScrollRef.current;
    const refs = cardRefs.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = refs.indexOf(entry.target as HTMLAnchorElement);
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="text-lg" style={{ color: '#1A1A1A' }}>Loading...</div>
      </div>
    );
  }

  if (!mapData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="text-center">
          <div className="text-[#1A1A1A] text-2xl mb-4">Map not found</div>
          <Link href="/" className="text-[#E07A5F] hover:underline">Go home</Link>
        </div>
      </div>
    );
  }

  // Field Notes template: list-first bento layout with expanded map toggle
  const isFieldNotes =
    mapData.templateType?.toLowerCase().replace(/\s+/g, '-') === 'field-notes' ||
    mapData.templateType?.toLowerCase() === 'field_notes';
  if (isFieldNotes && locations.length > 0) {
    const fnLocations = locations.map((loc) => ({
      id: loc.id,
      placeSlug: loc.placeSlug,
      name: loc.name,
      category: loc.category,
      neighborhood: loc.neighborhood ?? null,
      latitude: loc.latitude,
      longitude: loc.longitude,
      userPhotos: loc.userPhotos ?? [],
      googlePhotos: loc.googlePhotos,
      hours: loc.hours,
      orderIndex: loc.orderIndex,
      descriptor: loc.descriptor,
      priceLevel: loc.priceLevel ?? null,
      cuisineType: loc.cuisineType ?? null,
    }));
    return (
      <FieldNotesMapView
        title={mapData.title}
        description={mapData.description ?? mapData.subtitle}
        category={mapData.subtitle ?? 'Places'}
        vibe={mapData.introText ?? undefined}
        theme="light"
        authorName={mapData.creatorName ?? 'Unknown'}
        authorAvatar={undefined}
        locations={fnLocations}
      />
    );
  }

  const isOwner = mapData?.isOwner ?? false;
  const showOwnerUI = DEV_SHOW_ALL_UI || isOwner;
  
  // Always use white background
  const pageBg = '#FFFFFF';
  
  return (
    <div
      className={`min-h-screen ${template.fontClass}`}
      style={{ backgroundColor: pageBg, color: template.text }}
    >
      {/* Minimal Header - Logo only */}
      <MapHeader template={template} />

      {/* Split layout: below 768px stack (map top 300px, cards below); above 768px ~55% cards / 45% map */}
      <div className="flex flex-col md:flex-row md:h-[calc(100vh-8rem)]">
        {/* Map: below 768px on top (300px when list, 70vh when map view); above 768px right panel ~42% */}
        <div
          className={`flex-shrink-0 w-full md:flex-[0_0_42%] md:h-full md:min-h-[400px] md:sticky md:top-0 order-first md:order-last ${mobileView === 'map' ? 'h-[70vh]' : 'h-[300px]'} md:h-full`}
        >
          {GOOGLE_MAPS_API_KEY && hasValidLocations ? (
            <div className="relative w-full h-full min-h-[300px]">
              <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
              <div className="absolute top-3 right-3 z-10">
                <SkateLayerToggle on={skateLayerOn} onChange={setSkateLayerOn} />
              </div>
              {activeSkateSpot && (
                <div className="absolute bottom-3 left-3 right-3 z-10 max-w-sm">
                  <SkateSpotDetailPanel spot={activeSkateSpot} onClose={() => setActiveSkateSpot(null)} />
                </div>
              )}
            </div>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-center p-8"
              style={{ backgroundColor: 'rgba(0,0,0,0.04)', color: template.textMuted }}
            >
              {!GOOGLE_MAPS_API_KEY
                ? 'Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to show the map.'
                : 'Add locations with coordinates to see the map.'}
            </div>
          )}
        </div>

        {/* Left: scrollable cards ~58% width */}
        <div
          ref={cardsScrollRef}
          className={`flex-1 overflow-y-auto map-cards-scroll md:min-w-0 md:flex-[1_1_58%] order-last md:order-first ${mobileView === 'map' ? 'hidden md:block' : ''}`}
          style={{ maxHeight: '100%', backgroundColor: '#FFFFFF' }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-6" style={{ backgroundColor: '#FFFFFF' }}>
            {/* Title Card */}
            {mapData && (
              <TitleCard
                mapData={{
                  id: mapData.id,
                  title: mapData.title,
                  subtitle: mapData.subtitle,
                  description: mapData.description,
                  descriptionSource: mapData.descriptionSource,
                  coverImageUrl: mapData.coverImageUrl || (locations.length > 0 ? getLocationPhotoUrl(locations[0], 600) : null),
                  coverImageUrls: locations.length >= 3 ? getHeroCollageUrls(locations) : undefined,
                  creatorName: mapData.creatorName || 'Unknown',
                  createdAt: mapData.createdAt,
                  updatedAt: mapData.updatedAt,
                  locations,
                  slug: mapData.slug,
                }}
                isOwner={showOwnerUI}
                template={template}
                onEdit={mapData.id ? () => router.push(`/maps/${mapData.id}/edit`) : undefined}
                onDescriptionUpdate={(desc, source) => {
                  setMapData((prev) => prev ? { ...prev, description: desc, descriptionSource: source } : null);
                }}
                devOwner={devOwner}
              />
            )}

            {/* Mobile toggle (below 768px) */}
            <div className="flex md:hidden gap-2 mb-6">
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${mobileView === 'list' ? 'text-white' : ''}`}
                style={{
                  backgroundColor: mobileView === 'list' ? (template.accent === '#FFD500' ? '#E8998D' : template.accent) : (template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
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

            {/* Location Cards */}
            <div className="space-y-6">
              {locations.map((loc, index) => {
                const gallery = getLocationPhotoGallery(loc);
                
                return (
                  <LocationCard
                    key={loc.id}
                    location={{
                      id: loc.id,
                      placeSlug: loc.placeSlug,
                      name: loc.name,
                      address: loc.address,
                      category: loc.category,
                      instagram: loc.instagram,
                      hours: loc.hours,
                      imageUrl: gallery.mainUrl,
                      photoGallery: gallery,
                      latitude: loc.latitude,
                      longitude: loc.longitude,
                    }}
                    isActive={activeCardIndex === index}
                    isOwner={showOwnerUI}
                    onEdit={showOwnerUI ? ((clickedLoc) => {
                      const fullLocation = locations.find(l => l.id === clickedLoc.id);
                      if (fullLocation) setEditingLocation(fullLocation);
                    }) : undefined}
                    onDelete={showOwnerUI ? handleDeleteLocation : undefined}
                    cardRef={(el) => {
                      if (cardRefs.current.length <= index) cardRefs.current.length = index + 1;
                      cardRefs.current[index] = el;
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Edit Location Modal */}
      {editingLocation && showOwnerUI && (
        <EditLocationModal
          location={editingLocation}
          template={template}
          onClose={() => setEditingLocation(null)}
          onSave={handleSaveLocation}
          isSaving={isSaving}
        />
      )}

      {/* Minimal Footer */}
      <GlobalFooter variant="minimal" />
    </div>
  );
}
