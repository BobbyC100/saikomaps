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
  highlightedPlaceId?: string | null;
  mapSlug?: string;
  onSelectPlace?: (id: string) => void;
  onClearSelection?: () => void;
}

/** Determine if a place is "featured" — first place or has curator descriptor */
function isFeatured(place: PlaceCardData, index: number): boolean {
  return index === 0 || !!(place.editorial?.quote_text || place.editorial?.tags?.length);
}

/** Determine if a pin is ghost (unlabeled, low opacity) — only in split view for background density */
function isGhost(place: PlaceCardData, index: number, variant: FieldNotesMapPinsVariant): boolean {
  // In expanded view, never show ghost pins (all places are visible)
  if (variant === 'expanded') return false;
  // In split view, non-featured places can be ghost pins
  return !isFeatured(place, index);
}

export function FieldNotesMapPins({
  map,
  mapDivRef,
  places,
  theme,
  variant = 'split',
  activePlaceId: controlledActivePlaceId,
  highlightedPlaceId,
  mapSlug,
  onSelectPlace,
  onClearSelection,
}: FieldNotesMapPinsProps) {
  const [pinPositions, setPinPositions] = useState<PinPosition[]>([]);
  const [internalActivePlaceId, setInternalActivePlaceId] = useState<string | null>(null);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [mapRect, setMapRect] = useState({ width: 0, height: 0 });
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isExpanded = variant === 'expanded';
  // In expanded view, use controlled active ID for carousel sync, but also maintain internal state for popup
  const activePlaceId = isExpanded ? (controlledActivePlaceId ?? internalActivePlaceId) : internalActivePlaceId;
  
  const handleSetActive = (id: string | null) => {
    // Clear any pending hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // Always set internal state for popup
    setInternalActivePlaceId(id);
    setHoveredPlaceId(null); // Clear hover when clicking
    
    // In expanded view, also notify parent for carousel sync
    if (isExpanded) {
      if (id) onSelectPlace?.(id);
      else onClearSelection?.();
    }
  };

  const handlePinMouseEnter = (placeId: string) => {
    // Clear any pending timeout
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    
    // Delay before showing popup (prevents flicker on fast mouse movement)
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredPlaceId(placeId);
    }, 200);
  };

  const handlePinMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    
    // Delay before hiding (allows moving mouse to popup)
    hoverTimeoutRef.current = setTimeout(() => {
      if (!internalActivePlaceId) {
        setHoveredPlaceId(null);
      }
    }, 150);
  };

  const handlePopupMouseEnter = () => {
    // Keep popup open when hovering it
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handlePopupMouseLeave = () => {
    handlePinMouseLeave();
  };

  const updatePositions = useCallback(() => {
    if (!map || !mapDivRef.current) return;

    const rect = mapDivRef.current.getBoundingClientRect();
    setMapRect({ width: rect.width, height: rect.height });

    // Create overlay once and reuse
    if (!overlayRef.current) {
      const overlay = new google.maps.OverlayView();
      overlay.onAdd = function() {};
      overlay.draw = function() {};
      overlay.onRemove = function() {};
      overlay.setMap(map);
      overlayRef.current = overlay;
    }

    // Get projection and calculate positions
    const projection = overlayRef.current.getProjection();
    if (!projection) {
      // Projection not ready yet, try again on next frame
      requestAnimationFrame(updatePositions);
      return;
    }

    const positions: PinPosition[] = [];
    places.forEach((place, index) => {
      const pt = parseLatLng(place.latitude, place.longitude);
      if (!pt) return;
      const latLng = new google.maps.LatLng(pt.lat, pt.lng);
      const point = projection.fromLatLngToContainerPixel(latLng);
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
    return () => {
      listeners.forEach((l) => google.maps.event.removeListener(l));
      // Clean up overlay on unmount
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, [map, updatePositions]);

  const dark = theme === 'light' ? false : true;
  // Show popup for either active (clicked) or hovered place
  const popupPlaceId = activePlaceId || hoveredPlaceId;
  const activePlace = popupPlaceId ? places.find((p) => p.id === popupPlaceId) : null;
  const activePosition = popupPlaceId
    ? pinPositions.find((p) => p.place.id === popupPlaceId)
    : null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {/* Pins — pointer-events-auto so they're clickable */}
      {pinPositions.map(({ x, y, place, index }) => {
        const ghost = isGhost(place, index, variant);
        const featured = isFeatured(place, index);
        const active = place.id === activePlaceId;
        const highlighted = place.id === highlightedPlaceId;
        const hovered = place.id === hoveredPlaceId;

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
              handleSetActive(active ? null : place.id);
            }}
            onMouseEnter={() => {
              handlePinMouseEnter(place.id);
            }}
            onMouseLeave={handlePinMouseLeave}
          >
            {/* Pin dot */}
            <div
              data-pin-dot
              style={{
                // Expanded view: 20px default, 26px featured
                // Split view: smaller sizes for ghost pins
                width: ghost ? 10 : (isExpanded ? (featured ? 26 : 20) : (featured ? 18 : 14)),
                height: ghost ? 10 : (isExpanded ? (featured ? 26 : 20) : (featured ? 18 : 14)),
                borderRadius: '50%',
                backgroundColor: '#D64541',
                border: `${ghost ? 2 : 3}px solid ${dark ? '#1B2A3D' : '#F5F0E1'}`,
                boxShadow: active
                  ? dark
                    ? '0 0 0 5px rgba(214,69,65,0.2), 0 4px 16px rgba(214,69,65,0.5)'
                    : '0 0 0 5px rgba(214,69,65,0.15), 0 4px 16px rgba(214,69,65,0.5)'
                  : ghost
                    ? '0 1px 4px rgba(214,69,65,0.2)'
                    : featured
                      ? '0 3px 14px rgba(214,69,65,0.45)'
                      : '0 2px 10px rgba(214,69,65,0.4)',
                opacity: ghost ? 0.35 : 1,
                transform: active ? 'scale(1.2)' : (highlighted || hovered) ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            />
            {/* Label — only for non-ghost pins */}
            {!ghost && (
              <div
                data-pin-label
                style={{
                  fontFamily: "'Libre Baskerville', Georgia, serif",
                  fontSize: featured ? 24 : 20,
                  fontStyle: 'italic',
                  fontWeight: featured ? 700 : 500,
                  color: dark 
                    ? '#F5F0E1'
                    : '#36454F',
                  maxWidth: featured ? 140 : 120,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textAlign: 'center',
                  textShadow: dark
                    ? '-1px -1px 0 rgba(27,42,61,0.95), 1px -1px 0 rgba(27,42,61,0.95), -1px 1px 0 rgba(27,42,61,0.95), 1px 1px 0 rgba(27,42,61,0.95), 0 0 8px rgba(27,42,61,1), 0 0 16px rgba(27,42,61,0.9)'
                    : '-1px -1px 0 rgba(255,253,247,0.9), 1px -1px 0 rgba(255,253,247,0.9), -1px 1px 0 rgba(255,253,247,0.9), 1px 1px 0 rgba(255,253,247,0.9), 0 0 8px rgba(255,253,247,1), 0 0 16px rgba(255,253,247,0.8)',
                  opacity: active ? 0.95 : (highlighted || hovered) ? 0.9 : (featured ? 1 : 0.85),
                  transform: (active || highlighted || hovered) ? 'scale(1.02)' : 'scale(1)',
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                }}
              >
                {place.name}
              </div>
            )}
          </div>
        );
      })}

      {/* Popup — shows in both split and expanded views */}
      {activePlace && activePosition && mapRect.width > 0 && (
        <div
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        >
          <BentoCardPopup
            place={activePlace}
            theme={theme}
            pinPixelX={activePosition.x}
            pinPixelY={activePosition.y}
            mapRect={mapRect}
            mapSlug={mapSlug}
          />
        </div>
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
