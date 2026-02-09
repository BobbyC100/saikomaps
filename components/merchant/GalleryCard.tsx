'use client';

import styles from './GalleryCard.module.css';

interface GalleryCardProps {
  photos: string[];
  onThumbnailClick: (index: number) => void;
}

export function GalleryCard({ photos, onThumbnailClick }: GalleryCardProps) {
  // Show first 6 photos
  const displayPhotos = photos.slice(0, 6);
  const overflow = photos.length > 6 ? photos.length - 6 : 0;

  if (displayPhotos.length === 0) return null;

  return (
    <div className={styles.galleryCard}>
      <div className={styles.thumbnailGrid}>
        {displayPhotos.map((photo, idx) => {
          const isLast = idx === 5 && overflow > 0;

          return (
            <div
              key={idx}
              className={styles.thumbnail}
              style={{
                backgroundImage: `url(${photo})`,
              }}
              onClick={() => onThumbnailClick(idx)}
            >
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
