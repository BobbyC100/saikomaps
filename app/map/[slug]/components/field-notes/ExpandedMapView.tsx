'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import Link from 'next/link';
import { FieldNotesMapPins } from './FieldNotesMapPins';
import type { PlaceCardData } from './PlaceCard';
import { CardMetaRow } from './PlaceCard';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

/** Field Notes light mode — warm parchment, ocean water, leather roads */
const fieldNotesLightStyle: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#F0ECE2' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#B8D4DE' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#89B4C4' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#DDD5C4' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#C3B091' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#E6DFD0' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#EDE8DA' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5A6B78' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F5F0E1' }, { weight: 3 }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#D4DEC8' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#7A9A6B' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#E8E2D4' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#C3B091' }, { weight: 0.5 }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#8B7355' }] },
];

/** Field Notes dark mode — navy, deep ocean, muted cream roads */
const fieldNotesDarkStyle: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1B2A3D' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#142233' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4A7D96' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#243548' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#2D4058' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#1F3349' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#1C2E42' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#89A0B0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1B2A3D' }, { weight: 3 }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1A2E28' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#4A7C59' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1E2F44' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2D4058' }, { weight: 0.5 }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#5A7A8A' }] },
];

interface ExpandedMapViewProps {
  title: string;
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

const CAROUSEL_HEIGHT = 140;
const TOP_BAR_HEIGHT = 56;

export function ExpandedMapView({ title, places, theme, onBack }: ExpandedMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefsRef = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);

  const points = places
    .map((p) => parseLatLng(p.latitude, p.longitude))
    .filter((p): p is { lat: number; lng: number } => p != null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !mapRef.current || points.length === 0) return;

    const loader = new Loader({ apiKey: GOOGLE_MAPS_API_KEY, version: 'weekly' });

    loader.load().then((g) => {
      if (!mapRef.current) return;

      const map = new g.maps.Map(mapRef.current, {
        center: points[0],
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: theme === 'dark' ? fieldNotesDarkStyle : fieldNotesLightStyle,
      });

      const bounds = new g.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));

      if (points.length === 1) {
        map.setCenter(points[0]);
        map.setZoom(14);
      } else {
        map.fitBounds(bounds, {
          top: 80,
          bottom: CAROUSEL_HEIGHT + 40,
          left: 40,
          right: 40,
        });
        const listener = map.addListener('idle', () => {
          const zoom = map.getZoom();
          if (zoom != null && zoom > 15) {
            map.setZoom(15);
          }
          g.maps.event.removeListener(listener);
        });
      }

      mapInstanceRef.current = map;
      setMapReady(true);
    });

    return () => {
      mapInstanceRef.current = null;
      setMapReady(false);
    };
  }, [theme, points.length, places]);

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Map canvas + pins overlay */}
      <div className="relative flex-1 w-full min-h-0">
        <div ref={mapRef} className="absolute inset-0 w-full h-full" />
        {mapReady && mapInstanceRef.current && (
          <FieldNotesMapPins
            map={mapInstanceRef.current}
            mapDivRef={mapRef}
            places={places}
            theme={theme}
            variant="expanded"
            activePlaceId={activePlaceId}
            onSelectPlace={handleSelectPlace}
            onClearSelection={handleClearSelection}
          />
        )}
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
            const highlighted = place.id === activePlaceId;
            return (
              <Link
                key={place.id}
                ref={(el) => {
                  if (el) cardRefsRef.current.set(place.id, el);
                }}
                href={`/place/${place.placeSlug ?? place.id}`}
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
                      ? '0 0 0 2px rgba(214,69,65,0.6), 0 2px 8px rgba(0,0,0,0.2)'
                      : '0 0 0 2px #D64541, 0 2px 8px rgba(139,115,85,0.1)'
                    : dark
                      ? '0 2px 8px rgba(0,0,0,0.2)'
                      : '0 2px 8px rgba(139,115,85,0.1)',
                  transform: highlighted ? 'translateY(-2px)' : 'none',
                }}
              >
                <div className="relative h-[75px] overflow-hidden">
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
                <div className="px-2 py-2">
                  <CardMetaRow place={place} dark={dark} fontSize={9} />
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
    </div>
  );
}
