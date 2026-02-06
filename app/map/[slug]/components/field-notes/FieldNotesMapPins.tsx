'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { BentoCardPopup } from './BentoCardPopup';
import type { PlaceCardData } from './PlaceCard';

interface PinPosition {
  x: number;
  y: number;
  place: PlaceCardData;
  index: number;
}

export type FieldNotesMapPinsVariant = 'split' | 'expanded';

interface FieldNotesMapPinsProps {
  map: google.maps.Map | null;
  mapDivRef: React.RefObject<HTMLDivElement | null>;
  places: PlaceCardData[];
  theme: 'light' | 'dark';
  /** 'split' = Bento popup on pin tap. 'expanded' = carousel sync, no popup */
  variant?: FieldNotesMapPinsVariant;
  activePlaceId?: string | null;
  onSelectPlace?: (id: string) => void;
  onClearSelection?: () => void;
}

/** Determine if a place is "featured" — first place or has curator descriptor */
function isFeatured(place: PlaceCardData, index: number): boolean {
  return index === 0 || !!(place.editorial?.quote_text || place.editorial?.tags?.length);
}

/** Determine if a pin is ghost (unlabeled, low opacity) — non-featured places */
function isGhost(place: PlaceCardData, index: number): boolean {
  return !isFeatured(place, index);
}

export function FieldNotesMapPins({
  map,
  mapDivRef,
  places,
  theme,
  variant = 'split',
  activePlaceId: controlledActivePlaceId,
  onSelectPlace,
  onClearSelection,
}: FieldNotesMapPinsProps) {
  const [pinPositions, setPinPositions] = useState<PinPosition[]>([]);
  const [internalActivePlaceId, setInternalActivePlaceId] = useState<string | null>(null);
  const [mapRect, setMapRect] = useState({ width: 0, height: 0 });

  const isExpanded = variant === 'expanded';
  const activePlaceId = isExpanded ? controlledActivePlaceId ?? null : internalActivePlaceId;
  const handleSetActive = (id: string | null) => {
    if (isExpanded) {
      if (id) onSelectPlace?.(id);
      else onClearSelection?.();
    } else {
      setInternalActivePlaceId(id);
    }
  };

  const updatePositions = useCallback(() => {
    if (!map || !mapDivRef.current) return;
    const projection = map.getProjection();
    if (!projection) return;

    const rect = mapDivRef.current.getBoundingClientRect();
    setMapRect({ width: rect.width, height: rect.height });

    const positions: PinPosition[] = [];
    places.forEach((place, index) => {
      const pt = parseLatLng(place.latitude, place.longitude);
      if (!pt) return;
      const latLng = new google.maps.LatLng(pt.lat, pt.lng);
      const point = projection.fromLatLngToDivPixel(latLng);
      if (point) {
        positions.push({ x: point.x, y: point.y, place, index });
      }
    });
    setPinPositions(positions);
  }, [map, mapDivRef, places]);

  useEffect(() => {
    if (!map) return;
    updatePositions();
    const listeners: google.maps.MapsEventListener[] = [
      map.addListener('idle', updatePositions),
      map.addListener('zoom_changed', updatePositions),
      map.addListener('center_changed', updatePositions),
      map.addListener('click', () => handleSetActive(null)),
    ];
    return () => listeners.forEach((l) => google.maps.event.removeListener(l));
  }, [map, updatePositions]);

  const dark = theme === 'light' ? false : true;
  const activePlace = activePlaceId ? places.find((p) => p.id === activePlaceId) : null;
  const activePosition = activePlaceId
    ? pinPositions.find((p) => p.place.id === activePlaceId)
    : null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {/* Pins — pointer-events-auto so they're clickable */}
      {pinPositions.map(({ x, y, place, index }) => {
        const ghost = isGhost(place, index);
        const featured = isFeatured(place, index);
        const active = place.id === activePlaceId;

        return (
          <div
            key={place.id}
            className="absolute pointer-events-auto cursor-pointer"
            style={{
              left: x,
              top: y,
              transform: 'translate(-50%, -100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              zIndex: active ? 15 : 4,
              transition: 'transform 0.2s ease, z-index 0s',
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (isExpanded) {
                if (active) onClearSelection?.();
                else onSelectPlace?.(place.id);
              } else {
                handleSetActive(active ? null : place.id);
              }
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              const dot = el.querySelector('[data-pin-dot]');
              const label = el.querySelector('[data-pin-label]');
              if (dot) {
                (dot as HTMLElement).style.transform = 'scale(1.15)';
                (dot as HTMLElement).style.boxShadow = '0 3px 12px rgba(214,69,65,0.45)';
              }
              if (label && !ghost) {
                (label as HTMLElement).style.opacity = featured ? '0.9' : '0.75';
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              const dot = el.querySelector('[data-pin-dot]');
              const label = el.querySelector('[data-pin-label]');
              if (dot && !active) {
                (dot as HTMLElement).style.transform = 'scale(1)';
                (dot as HTMLElement).style.boxShadow = ghost
                  ? '0 1px 4px rgba(214,69,65,0.2)'
                  : featured
                    ? '0 2px 10px rgba(214,69,65,0.4)'
                    : '0 2px 8px rgba(214,69,65,0.35)';
              }
              if (label && !ghost) {
                (label as HTMLElement).style.opacity = featured ? '0.7' : '0.5';
              }
            }}
          >
            {/* Pin dot */}
            <div
              data-pin-dot
              style={{
                width: ghost ? 10 : featured ? 18 : 14,
                height: ghost ? 10 : featured ? 18 : 14,
                borderRadius: '50%',
                backgroundColor: '#D64541',
                border: `${ghost ? 2 : 2.5}px solid ${dark ? '#1B2A3D' : '#F5F0E1'}`,
                boxShadow: active
                  ? dark
                    ? '0 0 0 4px rgba(214,69,65,0.2), 0 3px 12px rgba(214,69,65,0.5)'
                    : '0 0 0 4px rgba(214,69,65,0.15), 0 3px 12px rgba(214,69,65,0.45)'
                  : ghost
                    ? '0 1px 4px rgba(214,69,65,0.2)'
                    : featured
                      ? '0 2px 10px rgba(214,69,65,0.4)'
                      : '0 2px 8px rgba(214,69,65,0.35)',
                opacity: ghost ? 0.35 : 1,
                transform: active ? 'scale(1.2)' : 'scale(1)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            />
            {/* Label — only for non-ghost pins */}
            {!ghost && (
              <div
                data-pin-label
                style={{
                  fontFamily: "'Libre Baskerville', Georgia, serif",
                  fontSize: featured ? 10 : 8,
                  fontStyle: 'italic',
                  fontWeight: featured ? 700 : 400,
                  color: dark ? (featured ? 'rgba(245,240,225,0.6)' : 'rgba(245,240,225,0.45)') : (featured ? 'rgba(54,69,79,0.7)' : 'rgba(54,69,79,0.5)'),
                  maxWidth: featured ? 100 : 80,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textAlign: 'center',
                  textShadow: dark
                    ? '0 0 6px rgba(27,42,61,0.95), 0 0 12px rgba(27,42,61,0.6)'
                    : '0 0 6px rgba(245,240,225,0.95), 0 0 12px rgba(245,240,225,0.6)',
                  opacity: active ? 0.9 : (featured ? 0.7 : 0.5),
                  transition: 'opacity 0.2s ease',
                }}
              >
                {place.name}
              </div>
            )}
          </div>
        );
      })}

      {/* Popup — only in split-view */}
      {!isExpanded && activePlace && activePosition && mapRect.width > 0 && (
        <BentoCardPopup
          place={activePlace}
          theme={theme}
          pinPixelX={activePosition.x}
          pinPixelY={activePosition.y}
          mapRect={mapRect}
        />
      )}
    </div>
  );
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
