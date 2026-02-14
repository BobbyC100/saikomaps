/**
 * Tier 5 - House Card
 * CRITICAL: Fixed placement (always last)
 * Saiko editorial voice / closing thought
 */

import { House } from '@/lib/types/merchant';

interface HouseCardProps {
  house: House;
}

export function HouseCard({ house }: HouseCardProps) {
  // Guard: only render if house content exists
  if (!house || !house.text) {
    return null;
  }

  return (
    <div className="house-card">
      <div className="house-content">
        <p className="house-text">{house.text}</p>
        {house.tagline && (
          <p className="house-tagline">{house.tagline}</p>
        )}
      </div>
    </div>
  );
}
