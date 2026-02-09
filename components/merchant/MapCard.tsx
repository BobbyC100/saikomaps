'use client';

import styles from './MapCard.module.css';

interface MapCardProps {
  address: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  onMapClick: () => void;
}

export function MapCard({
  address,
  neighborhood,
  latitude,
  longitude,
  onMapClick,
}: MapCardProps) {
  if (!address && !latitude) return null;

  // Parse address into street and city/state
  const addressParts = address?.split(',').map((s) => s.trim()) || [];
  const street = addressParts[0] || '';
  const cityState = addressParts.slice(1).join(', ');

  return (
    <div className={`${styles.mapCard} ${styles.col6}`} onClick={onMapClick}>
      {/* Map Preview */}
      <div className={styles.mapPreview}>
        {/* Grid overlay pattern */}
        <svg className={styles.gridOverlay} viewBox="0 0 60 60">
          <defs>
            <pattern
              id="grid"
              x="0"
              y="0"
              width="12"
              height="12"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 12 0 L 0 0 0 12"
                fill="none"
                stroke="rgba(195, 176, 145, 0.15)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="60" height="60" fill="url(#grid)" />
        </svg>

        {/* Pin */}
        <div className={styles.pin} />
      </div>

      {/* Address Info */}
      <div className={styles.addressInfo}>
        <div className={styles.street}>{street}</div>
        <div className={styles.cityState}>
          {cityState || neighborhood}
        </div>
      </div>
    </div>
  );
}
