'use client';

import Link from 'next/link';
import styles from './AlsoOnCard.module.css';

interface MapItem {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  creatorName: string;
}

interface AlsoOnCardProps {
  maps: MapItem[];
}

export function AlsoOnCard({ maps }: AlsoOnCardProps) {
  if (!maps || maps.length === 0) return null;

  // Deduplicate by slug and take first 3
  const uniqueMaps = maps
    .filter((map, index, self) => 
      index === self.findIndex((m) => m.slug === map.slug)
    )
    .slice(0, 3);

  if (uniqueMaps.length === 0) return null;

  return (
    <div className={`${styles.alsoOnCard} ${styles.col6}`}>
      <div className={styles.label}>ALSO ON</div>
      <div className={styles.listContainer}>
        {uniqueMaps.map((map) => (
          <Link
            key={map.id}
            href={`/map/${map.slug}`}
            className={styles.listItem}
          >
            {/* Thumbnail */}
            <div className={styles.thumbnail}>
              {map.coverImageUrl ? (
                <div
                  className={styles.thumbnailImage}
                  style={{ backgroundImage: `url(${map.coverImageUrl})` }}
                />
              ) : (
                <div className={styles.thumbnailPlaceholder}>
                  <svg className={styles.gridPattern} viewBox="0 0 48 48">
                    <defs>
                      <pattern
                        id={`grid-${map.id}`}
                        x="0"
                        y="0"
                        width="8"
                        height="8"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 8 0 L 0 0 0 8"
                          fill="none"
                          stroke="rgba(195, 176, 145, 0.2)"
                          strokeWidth="0.5"
                        />
                      </pattern>
                    </defs>
                    <rect width="48" height="48" fill="url(#grid-${map.id})" />
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div className={styles.info}>
              <div className={styles.title}>{map.title}</div>
              <div className={styles.author}>{map.creatorName}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
