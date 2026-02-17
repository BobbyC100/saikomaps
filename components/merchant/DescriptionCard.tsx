'use client';

import styles from './CuratorCard.module.css'; // Reuse curator card styles

interface DescriptionCardProps {
  content: string;
  isCurator: boolean; // true if curator_note, false if about_copy
  span?: number; // Grid column span (3 by default)
}

/**
 * DescriptionCard - System B
 * 
 * Shows curator_note (priority) or about_copy.
 * Always shown when data exists (no hiding).
 */
export function DescriptionCard({ content, isCurator, span = 3 }: DescriptionCardProps) {
  if (!content) return null;

  // Scale text size based on content length
  const isShortNote = content.length < 100;
  const fontSize = isShortNote ? '15px' : '12px';

  return (
    <div 
      className={styles.curatorCard}
      style={{ gridColumn: `span ${span}` }}
    >
      <div className={styles.label}>
        {isCurator ? "CURATOR'S NOTE" : "ABOUT"}
      </div>
      <div className={styles.noteText} style={{ fontSize }}>{content}</div>
    </div>
  );
}
