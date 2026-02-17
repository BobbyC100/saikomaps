'use client';

import styles from './VibeCard.module.css';

interface VibeCardProps {
  vibeTags: string[] | null;
  span?: number; // Grid column span (2, 3, or 6)
}

export function VibeCard({ vibeTags, span = 6 }: VibeCardProps) {
  if (!vibeTags || vibeTags.length === 0) return null;

  return (
    <div 
      className={styles.vibeCard}
      style={{ gridColumn: `span ${span}` }}
    >
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
