'use client';

import styles from './CuratorCard.module.css';

interface CuratorCardProps {
  note: string;
}

export function CuratorCard({ note }: CuratorCardProps) {
  if (!note) return null;

  return (
    <div className={styles.curatorCard}>
      <div className={styles.label}>CURATOR'S NOTE</div>
      <div className={styles.noteText}>{note}</div>
    </div>
  );
}
