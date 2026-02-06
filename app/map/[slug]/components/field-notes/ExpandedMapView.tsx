'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import Link from 'next/link';
import type { PlaceCardData } from './PlaceCard';
import { CardMetaRow } from './PlaceCard';
import { calculateSmartBounds } from '@/app/map/[slug]/lib/smart-bounds';
import { fieldNotesMapStyle } from '../../lib/fieldNotesMapStyle';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface ExpandedMapViewProps {
  title: string;
  mapSlug: string;
  places: PlaceCardData[];
  theme: 'light' | 'dark';
  onBack: () => void;
}

function parseLatLng(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined
): { lat: number; lng: number } | null {
  if (lat == null || lng == null) return null;
  const la = typeof lat === 'string' ? parseFloat(lat) : lat;
  const ln = typeof lng === 'string' ? parseFloat(lng) : lng;
  if (Number.isNaN(la) || Number.isNaN(ln)) return null;
  return { lat: la, lng: ln };
}

const CAROUSEL_HEIGHT = 180;
const TOP_BAR_HEIGHT = 56;

export function ExpandedMapView({ title, mapSlug, places, theme, onBack }: ExpandedMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefsRef = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);
  const [highlightedPlaceId, setHighlightedPlaceId] = useState<string | null>(null);
  const [outlierCount, setOutlierCount] = useState(0);
  const [showingAllBounds, setShowingAllBounds] = useState(false);

  const points = places
    .map((p) => parseLatLng(p.latitude, p.longitude))
    .filter((p): p is { lat: number; lng: number } => p != null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !mapRef.current || points.length === 0) return;

    const loader = new Loader({ apiKey: GOOGLE_MAPS_API_KEY, version: 'weekly' });

    loader.load().then((g) => {
      if (!mapRef.current) return;

      // Clear existing clusterer and markers
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      const map = new g.maps.Map(mapRef.current, {
        center: points[0],
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: fieldNotesMapStyle, // Use shared Field Notes style
      });

      const bounds = new g.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));

      if (points.length === 1) {
        map.setCenter(points[0]);
        map.setZoom(14);
        setOutlierCount(0);
      } else {
        // Use smart bounds to exclude outliers
        const { bounds: smartBounds, outliers, included } = calculateSmartBounds(points);
        setOutlierCount(outliers.length);
        
        // Calculate centroid (average position of all included points)
        const centroid = {
          lat: included.reduce((sum, p) => sum + p.lat, 0) / included.length,
          lng: included.reduce((sum, p) => sum + p.lng, 0) / included.length,
        };
        
        map.fitBounds(smartBounds, {
          top: 80,
          bottom: CAROUSEL_HEIGHT + 40,
          left: 20,    // Less padding on empty side
          right: 100,  // More padding where pins cluster
        });
        
        const listener = map.addListener('idle', () => {
          const zoom = map.getZoom();
          if (zoom != null && zoom > 15) {
            map.setZoom(15);
          }
          // Pan to centroid to center all pins in the view
          map.panTo(centroid);
          g.maps.event.removeListener(listener);
        });
      }

      // Create markers for each place
      const markers = points.map((point, i) => {
        const place = places[i];
        const marker = new g.maps.Marker({
          position: point,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            fillColor: theme === 'dark' ? '#F5F0E1' : '#D64541',
            fillOpacity: 1,
            strokeColor: theme === 'dark' ? '#1B2A3D' : '#F5F0E1',
            strokeWeight: 3,
            scale: 7,
            anchor: new g.maps.Point(0, 0),
            labelOrigin: new g.maps.Point(0, 3), // Position label just below pin center
          },
          label: {
            text: place.name,
            color: theme === 'dark' ? '#F5F0E1' : '#36454F',
            fontFamily: "'Libre Baskerville', Georgia, serif",
            fontSize: '11px',
            fontWeight: '500',
          },
          title: place.name,
        });

        marker.addListener('click', () => {
          setActivePlaceId(place.id);
          // Scroll carousel to card
          const cardEl = cardRefsRef.current.get(place.id);
          if (cardEl && carouselRef.current) {
            cardEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
        });

        return marker;
      });

      // Create clusterer with Field Notes styling
      const clusterer = new MarkerClusterer({
        map,
        markers,
        renderer: {
          render: ({ count, position }) => {
            return new g.maps.Marker({
              position,
              icon: {
                path: g.maps.SymbolPath.CIRCLE,
                fillColor: theme === 'dark' ? '#F5F0E1' : '#36454F',
                fillOpacity: 1,
                strokeColor: theme === 'dark' ? '#1B2A3D' : '#F5F0E1',
                strokeWeight: 3,
                scale: 18,
              },
              label: {
                text: String(count),
                color: theme === 'dark' ? '#1B2A3D' : '#F5F0E1',
                fontFamily: "'Libre Baskerville', Georgia, serif",
                fontWeight: '700',
                fontSize: '14px',
              },
              zIndex: Number(g.maps.Marker.MAX_ZINDEX) + count,
            });
          },
        },
      });

      // Add zoom in on cluster click
      clusterer.addListener('click', (event: any) => {
        const currentZoom = map.getZoom() || 10;
        const targetZoom = Math.min(currentZoom + 2, 18);
        map.setZoom(targetZoom);
        map.panTo(event.position);
      });

      markersRef.current = markers;
      clustererRef.current = clusterer;
      mapInstanceRef.current = map;
      setMapReady(true);
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
  }, [theme, points.length, places]);

  // Update marker styles when active place changes
  useEffect(() => {
    if (!mapReady || markersRef.current.length === 0) return;

    markersRef.current.forEach((marker, index) => {
      const place = places[index];
      const isActive = place.id === activePlaceId;
      
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: theme === 'dark' ? '#F5F0E1' : '#D64541',
        fillOpacity: 1,
        strokeColor: theme === 'dark' ? '#1B2A3D' : '#F5F0E1',
        strokeWeight: isActive ? 4 : 3,
        scale: isActive ? 10 : 7,
        anchor: new google.maps.Point(0, 0),
        labelOrigin: new google.maps.Point(0, 3), // Position label just below pin center
      });

      marker.setLabel({
        text: place.name,
        color: theme === 'dark' ? '#F5F0E1' : '#36454F',
        fontFamily: "'Libre Baskerville', Georgia, serif",
        fontSize: '11px',
        fontWeight: isActive ? '600' : '500',
      });
    });

    // Re-render clusters to update display
    if (clustererRef.current) {
      clustererRef.current.render();
    }
  }, [activePlaceId, mapReady, places, theme]);

  const dark = theme === 'dark';

  const handleSelectPlace = useCallback(
    (id: string) => {
      if (!id) return;
      setActivePlaceId(id);
      const place = places.find((p) => p.id === id);
      if (!place || !mapInstanceRef.current) return;

      // Scroll carousel to center the card
      const cardEl = cardRefsRef.current.get(id);
      if (cardEl && carouselRef.current) {
        cardEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }

      // Pan map to center the pin in visible area
      const pt = parseLatLng(place.latitude, place.longitude);
      if (pt) {
        mapInstanceRef.current.panTo({ lat: pt.lat, lng: pt.lng });
      }
    },
    [places]
  );

  const handleClearSelection = useCallback(() => {
    setActivePlaceId(null);
  }, []);

  const handleShowAllLocations = useCallback(() => {
    if (!mapInstanceRef.current || points.length === 0) return;
    
    // Calculate centroid of all points
    const centroid = {
      lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
      lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
    };
    
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    
    mapInstanceRef.current.fitBounds(bounds, {
      top: 80,
      bottom: CAROUSEL_HEIGHT + 40,
      left: 40,
      right: 40,
    });
    
    // Pan to centroid after bounds are set
    google.maps.event.addListenerOnce(mapInstanceRef.current, 'idle', () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo(centroid);
      }
    });
    
    setShowingAllBounds(true);
    setOutlierCount(0);
  }, [points]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Map canvas with native markers and clustering */}
      <div className="relative flex-1 w-full min-h-0">
        <div ref={mapRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-5 z-20"
        style={{
          background: 'transparent',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
          style={{
            color: dark ? 'var(--fn-parchment)' : 'var(--fn-charcoal)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = dark ? 'rgba(137,180,196,0.15)' : 'rgba(195,176,145,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label="Back to list"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div
          className="px-4 py-2 rounded-full backdrop-blur-md"
          style={{
            background: dark ? 'rgba(27,42,61,0.85)' : 'rgba(245,240,225,0.85)',
            border: dark ? '1px solid rgba(137,180,196,0.15)' : 'none',
            color: dark ? 'var(--fn-parchment)' : 'var(--fn-charcoal)',
            fontFamily: "'Libre Baskerville', Georgia, serif",
            fontSize: '14px',
            fontStyle: 'italic',
          }}
        >
          {title}
        </div>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-full transition-colors"
          style={{
            color: dark ? 'var(--fn-parchment)' : 'var(--fn-charcoal)',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '13px',
            fontWeight: 600,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = dark ? 'rgba(137,180,196,0.15)' : 'rgba(195,176,145,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          List
        </button>
      </div>

      {/* Bottom carousel — spec: ~140px height, backdrop blur, scroll-snap center */}
      <div
        ref={carouselRef}
        data-carousel
        className="absolute bottom-0 left-0 right-0 z-20 overflow-x-auto overflow-y-hidden"
        style={{
          height: CAROUSEL_HEIGHT,
          padding: '16px 0',
          background: dark ? 'rgba(21,32,48,0.85)' : 'rgba(245,240,225,0.85)',
          backdropFilter: 'blur(12px)',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`
          [data-carousel]::-webkit-scrollbar { display: none; }
        `}</style>
        <div
          role="tablist"
          className="flex gap-4"
          style={{
            minWidth: 'min-content',
            paddingLeft: 20,
            paddingRight: 20,
          }}
        >
          {places.map((place) => {
            const photoUrl = place.photoUrl;
            const categoryLabel = place.category || 'Place';
            const highlighted = place.id === activePlaceId || place.id === highlightedPlaceId;
            return (
              <Link
                key={place.id}
                ref={(el) => {
                  if (el) cardRefsRef.current.set(place.id, el);
                }}
                href={`/place/${place.placeSlug ?? place.id}?from=${mapSlug}`}
                role="tab"
                aria-label={`${place.name}, ${categoryLabel}`}
                aria-selected={highlighted}
                className="flex-shrink-0 w-[200px] rounded-[10px] overflow-hidden transition-all duration-200"
                style={{
                  scrollSnapAlign: 'start',
                  backgroundColor: dark ? 'rgba(30,47,68,0.95)' : '#FFFDF7',
                  border: dark ? '1px solid rgba(137,180,196,0.15)' : 'none',
                  boxShadow: highlighted
                    ? dark
                      ? '0 4px 12px rgba(195,176,145,0.25), 0 0 0 2px rgba(214,69,65,0.6)'
                      : '0 4px 12px rgba(195,176,145,0.25), 0 0 0 2px rgba(214,69,65,0.3)'
                    : dark
                      ? '0 2px 8px rgba(0,0,0,0.2)'
                      : '0 2px 8px rgba(139,115,85,0.1)',
                  transform: highlighted ? 'translateY(-2px)' : 'none',
                  height: 156, // 180px carousel - 24px padding
                }}
                onMouseEnter={() => setHighlightedPlaceId(place.id)}
                onMouseLeave={() => setHighlightedPlaceId(null)}
              >
                <div className="relative h-[116px] overflow-hidden">
                  {photoUrl ? (
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage: `url(${photoUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: dark
                          ? 'saturate(0.88) contrast(1.05) brightness(0.9)'
                          : 'saturate(0.88) contrast(1.05)',
                      }}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        background: dark
                          ? 'linear-gradient(135deg, #1B2A3D 0%, #1E2F44 100%)'
                          : 'linear-gradient(135deg, #EDE8D8 0%, #E2DCC8 100%)',
                        fontFamily: "'Libre Baskerville', Georgia, serif",
                        fontSize: '24px',
                        fontStyle: 'italic',
                        color: dark ? 'rgba(137, 180, 196, 0.35)' : '#C3B091',
                        opacity: dark ? 1 : 0.6,
                      }}
                    >
                      {place.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div
                    className="absolute bottom-0 left-0 right-0"
                    style={{
                      padding: '20px 10px 8px',
                      background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.55))',
                    }}
                  >
                    <h4
                      className="font-normal italic leading-tight truncate"
                      style={{
                        fontFamily: "'Libre Baskerville', Georgia, serif",
                        fontSize: 13,
                        color: '#FFFDF7',
                        textShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      {place.name}
                    </h4>
                  </div>
                </div>
                <div className="px-2.5 py-2.5">
                  <CardMetaRow place={place} dark={dark} fontSize={10} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Scale bar - bottom left */}
      <div
        className="absolute left-4 z-20 flex items-end gap-1"
        style={{ bottom: CAROUSEL_HEIGHT + 12, fontFamily: "'Courier New', monospace", fontSize: '8px' }}
      >
        <div
          className="w-12 h-0.5"
          style={{
            backgroundColor: dark ? '#89B4C4' : '#8B7355',
            opacity: 0.3,
          }}
        />
        <span
          style={{
            color: dark ? '#89B4C4' : '#8B7355',
            opacity: 0.5,
          }}
        >
          2 MI
        </span>
      </div>

      {/* Compass - bottom right */}
      <div
        className="absolute right-4 z-20 opacity-[0.25]"
        style={{ bottom: CAROUSEL_HEIGHT + 12, width: 28, height: 28 }}
      >
        <svg viewBox="0 0 40 40" fill="none">
          <line x1="20" y1="6" x2="20" y2="34" stroke="currentColor" strokeWidth="0.75" />
          <line x1="6" y1="20" x2="34" y2="20" stroke="currentColor" strokeWidth="0.75" />
          <polygon points="20,6 21.5,14 18.5,14" fill="currentColor" />
        </svg>
      </div>

      {/* Outlier indicator */}
      {outlierCount > 0 && !showingAllBounds && (
        <div
          className="absolute left-1/2 z-20 flex items-center gap-3"
          style={{
            bottom: CAROUSEL_HEIGHT + 20,
            transform: 'translateX(-50%)',
            background: dark ? 'rgba(30,47,68,0.95)' : 'rgba(255,253,247,0.95)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: '8px 16px',
            borderRadius: 20,
            fontFamily: "'Libre Baskerville', Georgia, serif",
            fontSize: 11,
            fontStyle: 'italic',
            color: dark ? 'rgba(137,180,196,0.8)' : '#8B7355',
            boxShadow: dark
              ? '0 2px 8px rgba(0,0,0,0.3)'
              : '0 2px 8px rgba(139,115,85,0.15)',
            border: dark ? '1px solid rgba(137,180,196,0.1)' : 'none',
          }}
        >
          <span>
            {outlierCount} more location{outlierCount > 1 ? 's' : ''} outside view
          </span>
          <button
            type="button"
            onClick={handleShowAllLocations}
            style={{
              background: 'none',
              border: 'none',
              color: '#D64541',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Show all
          </button>
        </div>
      )}
    </div>
  );
}
