'use client';

import styles from './SourcesCard.module.css';

interface EditorialSource {
  publication?: string;
  name?: string;
  url: string;
  published_at?: string;
}

interface SourcesCardProps {
  sources: EditorialSource[];
  span?: number;
}

export function SourcesCard({ sources, span = 2 }: SourcesCardProps) {
  if (!sources || sources.length === 0) return null;

  // Deduplicate by publication name
  const seen = new Set<string>();
  const unique = sources.filter(s => {
    const key = (s.publication || s.name || s.url).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className={styles.sourcesCard} style={{ gridColumn: `span ${span}` }}>
      <div className={styles.label}>COVERAGE</div>
      <div className={styles.list}>
        {unique.map((src, i) => (
          <a
            key={i}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sourceLink}
          >
            {src.publication || src.name || 'Source'}
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}
