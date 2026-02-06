'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { computeBounds } from '../../lib/field-notes-utils';
import { fieldNotesMapStyle } from '../../lib/fieldNotesMapStyle';

export interface PlacePoint {
  id: string;
  name: string;
  latitude: number | string | null;
  longitude: number | string | null;
  isFeatured?: boolean;
}

interface CoverMapProps {
  places: PlacePoint[];
  theme: 'light' | 'dark';
  onClick?: () => void;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

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

export function CoverMapGoogle({ places, theme, onClick }: CoverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const points = places
    .map((p) => parseLatLng(p.latitude, p.longitude))
    .filter((p): p is { lat: number; lng: number } => p != null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('CoverMapGoogle: Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
      setMapError(true);
      return;
    }
    
    if (!mapRef.current || points.length === 0) return;

    const loader = new Loader({ 
      apiKey: GOOGLE_MAPS_API_KEY, 
      version: 'weekly'
    });

    loader.load()
      .then((g) => {
      if (!mapRef.current) return;

      // Clear existing markers
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      const map = new g.maps.Map(mapRef.current, {
        center: points[0],
        zoom: 12,
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        keyboardShortcuts: false, // Disable keyboard shortcuts
        gestureHandling: 'none', // Disable all interactions
        styles: fieldNotesMapStyle,
      });

      // Calculate smart bounds using IQR outlier detection (extra tight for cover map)
      // This excludes geographic outliers to zoom in on the core cluster
      const smartBounds = computeBounds(points, true); // true = tight zoom
      
      // Convert to Google Maps LatLngBounds
      const bounds = new g.maps.LatLngBounds(
        new g.maps.LatLng(smartBounds.minLat, smartBounds.minLng),
        new g.maps.LatLng(smartBounds.maxLat, smartBounds.maxLng)
      );

      if (points.length === 1) {
        map.setCenter(points[0]);
        map.setZoom(14);
      } else {
        // Calculate centroid from all points
        const centroid = {
          lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
          lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
        };

        // Fit to smart bounds (excludes outliers) with minimal padding
        map.fitBounds(bounds, { top: 20, bottom: 20, left: 20, right: 20 });
        
        g.maps.event.addListenerOnce(map, 'idle', () => {
          // Center on centroid but don't force zoom out
          map.panTo(centroid);
        });
      }

      // Create individual markers (no clustering, no labels for cover map)
      const markers = points.map((point, i) => {
        const place = places[i];

        const marker = new g.maps.Marker({
          position: point,
          map, // Add directly to map
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            fillColor: '#D64541', // Saiko red
            fillOpacity: 1,
            strokeColor: '#F5F0E1', // Parchment border
            strokeWeight: 2,
            scale: 6, // Same size for all pins
            anchor: new g.maps.Point(0, 0),
          },
          title: place.name, // Only on hover
        });

        return marker;
      });

      markersRef.current = markers;
      mapInstanceRef.current = map;
      setMapReady(true);
    })
    .catch((error) => {
      console.error('CoverMapGoogle: Failed to load Google Maps', error);
      setMapError(true);
    });

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      mapInstanceRef.current = null;
      setMapReady(false);
    };
  }, [places, points.length, theme]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className="group relative overflow-hidden cursor-pointer h-[200px] md:h-[260px]"
      style={{
        background: theme === 'light'
          ? 'linear-gradient(135deg, #EDE9DF 0%, #F0ECE2 50%, #E6E0D4 100%)'
          : 'linear-gradient(135deg, #172536 0%, #1E2F44 50%, #1B2A3D 100%)',
      }}
    >
      {/* Google Map */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full" />

      {/* Loading state */}
      {!mapReady && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="text-xs uppercase tracking-wider"
            style={{ 
              color: theme === 'light' ? '#8B7355' : '#89B4C4',
              opacity: 0.4 
            }}
          >
            Loading map...
          </div>
        </div>
      )}

      {/* Error state */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="text-xs uppercase tracking-wider"
            style={{ 
              color: theme === 'light' ? '#8B7355' : '#89B4C4',
              opacity: 0.4 
            }}
          >
            Map unavailable
          </div>
        </div>
      )}

      {/* Ocean wash overlay on left (keep the aesthetic) */}
      <div
        className="absolute top-0 left-0 h-full pointer-events-none"
        style={{
          width: '14%',
          background: theme === 'light'
            ? 'linear-gradient(90deg, rgba(107,150,176,0.18) 0%, transparent 100%)'
            : 'linear-gradient(90deg, rgba(137,180,196,0.1) 0%, transparent 100%)',
        }}
      />

      {/* Scale bar */}
      <div
        className="absolute bottom-4 left-6 flex items-end gap-1 pointer-events-none z-10"
        style={{ fontFamily: "'Courier New', monospace", fontSize: '7px' }}
      >
        <div
          className="relative w-11 h-0.5"
          style={{
            backgroundColor: theme === 'light' ? '#8B7355' : '#89B4C4',
            opacity: theme === 'light' ? 0.25 : 0.3,
          }}
        >
          <div
            className="absolute bottom-0 left-0 w-px h-1.5"
            style={{
              backgroundColor: theme === 'light' ? '#8B7355' : '#89B4C4',
              opacity: theme === 'light' ? 0.25 : 0.3,
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-px h-1.5"
            style={{
              backgroundColor: theme === 'light' ? '#8B7355' : '#89B4C4',
              opacity: theme === 'light' ? 0.25 : 0.3,
            }}
          />
        </div>
        <span
          style={{
            color: theme === 'light' ? '#8B7355' : '#89B4C4',
            opacity: theme === 'light' ? 0.35 : 0.4,
            letterSpacing: '1px',
          }}
        >
          2 MI
        </span>
      </div>

      {/* Compass */}
      <div
        className="absolute bottom-4 right-4 opacity-[0.3] pointer-events-none z-10"
        style={{ width: 32, height: 32 }}
      >
        <svg viewBox="0 0 40 40" fill="none">
          <line
            x1="20"
            y1="6"
            x2="20"
            y2="34"
            stroke={theme === 'light' ? '#8B7355' : '#89B4C4'}
            strokeWidth="0.75"
            opacity="0.35"
          />
          <line
            x1="6"
            y1="20"
            x2="34"
            y2="20"
            stroke={theme === 'light' ? '#8B7355' : '#89B4C4'}
            strokeWidth="0.75"
            opacity="0.35"
          />
          <polygon
            points="20,6 21.5,14 18.5,14"
            fill={theme === 'light' ? '#8B7355' : '#89B4C4'}
            opacity="0.35"
          />
        </svg>
      </div>

      {/* Expand hint */}
      <div
        className="absolute top-3.5 right-4 px-2.5 py-1.5 rounded-md text-[9px] font-semibold uppercase tracking-wider opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none z-10"
        style={{
          background: theme === 'light' ? 'rgba(54,69,79,0.6)' : 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          color: 'var(--fn-parchment)',
        }}
      >
        Expand Map
      </div>
    </div>
  );
}
