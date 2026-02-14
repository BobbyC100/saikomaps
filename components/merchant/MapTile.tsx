/**
 * Tier 3 - Map Tile
 * CRITICAL: Small/reference-only
 * NO "Get Directions" CTA (belongs in Tier 0)
 */

import { Coordinates } from '@/lib/types/merchant';

interface MapTileProps {
  coordinates: Coordinates;
  merchantName: string;
}

export function MapTile({ coordinates, merchantName }: MapTileProps) {
  // Guard: only render if coordinates exist
  if (!coordinates) {
    return null;
  }

  // Static map image URL (using a placeholder service)
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.lat},${coordinates.lng}&zoom=15&size=600x300&markers=color:red%7C${coordinates.lat},${coordinates.lng}&key=YOUR_API_KEY`;

  return (
    <div className="map-tile">
      <h3 className="map-title">Location</h3>
      <div className="map-container">
        <img
          src={mapUrl}
          alt={`Map showing location of ${merchantName}`}
          className="map-image"
        />
      </div>
      {/* CRITICAL: No "Get Directions" button - belongs in Tier 0 */}
    </div>
  );
}
