'use client';

import styles from './QuietCard.module.css';

interface QuietCardProps {
  neighborhood?: string | null;
  category?: string | null;
  span?: number;
}

export function QuietCard({ neighborhood, category, span = 6 }: QuietCardProps) {
  const text = neighborhood && category
    ? `Discover more ${category} spots in ${neighborhood}`
    : neighborhood
      ? `Explore more in ${neighborhood}`
      : category
        ? `Discover more ${category} spots`
        : 'Discover more on Saiko Maps';

  return (
    <div className={styles.quietCard} style={{ gridColumn: `span ${span}` }}>
      <p className={styles.text}>{text}</p>
    </div>
  );
}
