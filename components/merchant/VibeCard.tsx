'use client';

import styles from './VibeCard.module.css';

interface VibeCardProps {
  vibeTags: string[] | null;
}

export function VibeCard({ vibeTags }: VibeCardProps) {
  if (!vibeTags || vibeTags.length === 0) return null;

  return (
    <div className={`${styles.vibeCard} ${styles.col6}`}>
      <div className={styles.label}>VIBE</div>
      <div className={styles.tagsContainer}>
        {vibeTags.map((tag, idx) => (
          <span key={idx} className={styles.tag}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
