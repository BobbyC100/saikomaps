'use client';

import type { SceneSenseOutput } from '@/lib/scenesense/types';
import styles from './VibeCard.module.css';

interface SceneSenseCardProps {
  scenesense: SceneSenseOutput;
  span?: number;
}

const SURFACE_LABELS: Record<keyof SceneSenseOutput, string> = {
  vibe: 'VIBE',
  atmosphere: 'ATMOSPHERE',
  ambiance: 'AMBIANCE',
  scene: 'SCENE',
};

/** Render statements with dot separators per spec */
function StatementList({ statements }: { statements: string[] }) {
  if (statements.length === 0) return null;
  return (
    <span className={styles.tagsContainer}>
      {statements.map((s, i) => (
        <span key={i}>
          {i > 0 && <span style={{ margin: '0 6px', color: '#C3B091' }}>·</span>}
          <span className={styles.tag}>{s}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * SceneSense card — displays vibe, atmosphere, ambiance, scene per PRL mode.
 * Max 2/surface (Lite) or 4/surface (Full) enforced upstream.
 */
export function SceneSenseCard({ scenesense, span = 6 }: SceneSenseCardProps) {
  const sections = (['vibe', 'atmosphere', 'ambiance', 'scene'] as const)
    .map((key) => ({
      key,
      label: SURFACE_LABELS[key],
      statements: scenesense[key],
    }))
    .filter((s) => s.statements.length > 0);

  if (sections.length === 0) return null;

  return (
    <div
      className={styles.vibeCard}
      style={{ gridColumn: `span ${span}` }}
    >
      {sections.map(({ key, label, statements }) => (
        <div key={key} className="mb-3 last:mb-0">
          <div className={styles.label}>{label}</div>
          <StatementList statements={statements} />
        </div>
      ))}
    </div>
  );
}
