/**
 * Tier 0 - Primary Action Set
 * Call · Reserve · Directions (high-weight actions)
 */

import { Coordinates } from '@/lib/types/merchant';

interface PrimaryActionSetProps {
  phone?: string;
  reservationUrl?: string;
  coordinates?: Coordinates;
  merchantName: string;
}

export function PrimaryActionSet({ 
  phone, 
  reservationUrl, 
  coordinates,
  merchantName 
}: PrimaryActionSetProps) {
  const hasAnyAction = phone || reservationUrl || coordinates;

  if (!hasAnyAction) {
    return null;
  }

  const directionsUrl = coordinates 
    ? `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`
    : undefined;

  return (
    <div className="primary-actions">
      {phone && (
        <a 
          href={`tel:${phone}`}
          className="action-button action-call"
          aria-label={`Call ${merchantName}`}
        >
          Call
        </a>
      )}
      {reservationUrl && (
        <a 
          href={reservationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="action-button action-reserve"
        >
          Reserve
        </a>
      )}
      {directionsUrl && (
        <a 
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="action-button action-directions"
        >
          Directions
        </a>
      )}
    </div>
  );
}
