'use client';

import styles from './WineCard.module.css';

interface WineCardProps {
  focus?: string; // e.g., "Italian natural wines"
  regions?: string[]; // e.g., ["Sicily", "Friuli"]
  priceRange?: string; // e.g., "$45-85"
  sommelier?: string; // e.g., "Jane Smith"
  description?: string; // Free-form description
  span?: number; // Grid column span (3 or 6)
}

export function WineCard({ 
  focus, 
  regions, 
  priceRange, 
  sommelier,
  description,
  span = 3 
}: WineCardProps) {
  // Don't render if no meaningful data
  if (!focus && !description && (!regions || regions.length === 0)) {
    return null;
  }

  return (
    <div 
      className={styles.wineCard}
      style={{ gridColumn: `span ${span}` }}
    >
      <div className={styles.label}>WINE PROGRAM</div>
      
      <div className={styles.content}>
        {focus && (
          <p className={styles.focus}>
            {focus}
          </p>
        )}
        
        {description && (
          <p className={styles.description}>
            {description}
          </p>
        )}
        
        {regions && regions.length > 0 && (
          <div className={styles.regions}>
            <span className={styles.regionsLabel}>Notable regions: </span>
            <span className={styles.regionsList}>{regions.join(', ')}</span>
          </div>
        )}
        
        {priceRange && (
          <div className={styles.priceRange}>
            {priceRange} bottles
          </div>
        )}
        
        {sommelier && (
          <div className={styles.sommelier}>
            Sommelier: {sommelier}
          </div>
        )}
      </div>
    </div>
  );
}
