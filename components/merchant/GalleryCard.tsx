'use client';

import styles from './GalleryCard.module.css';

interface GalleryCardProps {
  photos: string[];
  placeName?: string;
  onThumbnailClick: (index: number) => void;
  span?: number; // Grid column span (3 or 6)
}

export function GalleryCard({ photos, placeName, onThumbnailClick, span = 3 }: GalleryCardProps) {
  // Show first 6 photos in 2×3 grid
  const displayPhotos = photos.slice(0, 6);
  const overflow = photos.length > 6 ? photos.length - 6 : 0;

  if (displayPhotos.length === 0) return null;

  return (
    <div 
      className={styles.galleryCard}
      style={{ gridColumn: `span ${span}` }}
    >
      <div className={styles.thumbnailGrid}>
        {displayPhotos.map((photo, idx) => {
          const isLast = idx === displayPhotos.length - 1 && overflow > 0;

          return (
            <div
              key={idx}
              className={styles.thumbnail}
              style={{
                backgroundImage: `url(${photo})`,
              }}
              onClick={() => onThumbnailClick(idx)}
              role="img"
              aria-label={placeName ? `Photo ${idx + 1} of ${placeName}` : `Photo ${idx + 1}`}
            >
              {/* Hidden img for SEO crawlers */}
              <img
                src={photo}
                alt={placeName ? `${placeName} photo ${idx + 1}` : `Photo ${idx + 1}`}
                style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
              />
              {isLast && (
                <div className={styles.overflowOverlay}>
                  <span className={styles.overflowText}>+{overflow}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
