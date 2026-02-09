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
            <div
              className={styles.thumbnail}
              style={{
                backgroundImage: map.coverImageUrl
                  ? `url(${map.coverImageUrl})`
                  : 'linear-gradient(145deg, #E8E2D4, #D4CFC0)',
              }}
            />

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
