'use client';

import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import styles from './GalleryLightbox.module.css';

interface GalleryLightboxProps {
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}

export function GalleryLightbox({
  photos,
  initialIndex,
  onClose,
}: GalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, onClose]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className={styles.closeButton} onClick={onClose}>
          <X size={24} />
        </button>

        {/* Navigation Buttons */}
        {photos.length > 1 && (
          <>
            <button
              className={`${styles.navButton} ${styles.prevButton}`}
              onClick={goToPrevious}
            >
              <ChevronLeft size={32} />
            </button>

            <button
              className={`${styles.navButton} ${styles.nextButton}`}
              onClick={goToNext}
            >
              <ChevronRight size={32} />
            </button>
          </>
        )}

        {/* Image */}
        <div className={styles.imageContainer}>
          <img
            src={photos[currentIndex]}
            alt={`Photo ${currentIndex + 1}`}
            className={styles.image}
          />
        </div>

        {/* Counter */}
        <div className={styles.counter}>
          {currentIndex + 1} / {photos.length}
        </div>
      </div>
    </div>
  );
}
