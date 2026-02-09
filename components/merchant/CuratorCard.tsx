'use client';

import styles from './CuratorCard.module.css';

interface CuratorCardProps {
  note: string;
  span?: number; // Grid column span (3 or 4)
}

export function CuratorCard({ note, span = 3 }: CuratorCardProps) {
  if (!note) return null;

  // Scale text size based on note length
  const isShortNote = note.length < 100;
  const fontSize = isShortNote ? '15px' : '12px';

  return (
    <div 
      className={styles.curatorCard}
      style={{ gridColumn: `span ${span}` }}
    >
      <div className={styles.label}>CURATOR'S NOTE</div>
      <div className={styles.noteText} style={{ fontSize }}>{note}</div>
    </div>
  );
}
