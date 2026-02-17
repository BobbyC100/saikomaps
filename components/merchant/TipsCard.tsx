'use client';

import styles from './TipsCard.module.css';

interface TipsCardProps {
  tips: string[];
  span?: number; // Grid column span (3 or 6)
}

export function TipsCard({ tips, span = 3 }: TipsCardProps) {
  if (!tips || tips.length === 0) return null;

  return (
    <div 
      className={styles.tipsCard}
      style={{ gridColumn: `span ${span}` }}
    >
      <div className={styles.label}>TIPS</div>
      <ul className={styles.tipsList}>
        {tips.map((tip, idx) => (
          <li key={idx} className={styles.tipItem}>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}
