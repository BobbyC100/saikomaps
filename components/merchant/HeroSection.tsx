'use client';

import { Share2, Camera } from 'lucide-react';
import styles from './HeroSection.module.css';

interface HeroSectionProps {
  name: string;
  category: string | null;
  neighborhood: string | null;
  price: string | null;
  isOpen: boolean | null;
  statusText: string | null; // "Open · Closes 12 AM" or "Closed · Opens 11 AM"
  photoUrl: string | null;
  photoCount: number;
  onHeroClick: () => void;
  onShareClick: () => void;
}

export function HeroSection({
  name,
  category,
  neighborhood,
  price,
  isOpen,
  statusText,
  photoUrl,
  photoCount,
  onHeroClick,
  onShareClick,
}: HeroSectionProps) {
  // Build meta row
  const metaParts = [category, neighborhood, price].filter(Boolean);
  const metaText = metaParts.join(' · ');

  return (
    <div className={styles.heroContainer}>
      {/* Hero Photo */}
      <div
        className={styles.heroPhoto}
        style={{
          backgroundImage: photoUrl
            ? `url(${photoUrl})`
            : 'linear-gradient(145deg, #E8E2D4, #D4CFC0)',
        }}
        onClick={onHeroClick}
      >
        {/* Photo Count Badge (bottom-left) */}
        {photoCount > 0 && (
          <button
            className={styles.photoCountBadge}
            onClick={(e) => {
              e.stopPropagation();
              onHeroClick();
            }}
          >
            <Camera className={styles.photoCountIcon} size={14} />
            <span className={styles.photoCountText}>{photoCount}</span>
          </button>
        )}

        {/* Share Button (top-right) */}
        <button
          className={styles.shareButton}
          onClick={(e) => {
            e.stopPropagation();
            onShareClick();
          }}
        >
          <Share2 className={styles.shareIcon} size={14} />
        </button>
      </div>

      {/* Hero Info */}
      <div className={styles.heroInfo}>
        {/* Name */}
        <h1 className={styles.placeName}>{name}</h1>

        {/* Meta Row */}
        {metaText && <div className={styles.metaRow}>{metaText}</div>}

        {/* Status */}
        {statusText && (
          <div className={styles.statusRow}>
            <span
              className={styles.statusDot}
              style={{
                background: isOpen ? '#4A7C59' : '#36454F',
                opacity: isOpen ? 1 : 0.5,
              }}
            />
            <span
              className={styles.statusText}
              style={{
                color: isOpen ? '#4A7C59' : '#36454F',
                opacity: isOpen ? 1 : 0.5,
              }}
            >
              {statusText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
