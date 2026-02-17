/**
 * Also On Card - Stacked Vertical Layout
 * 
 * Displays maps this place appears on with:
 * - Image on top (120px, full width)
 * - Content below (type, title, description, attribution)
 * - 3-column grid layout
 * - Quiet pattern fallback for missing images
 */

'use client';

import Link from 'next/link';
import styles from './AlsoOnCard.module.css';

interface MapItem {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  creatorName: string;
  description?: string | null;
  placeCount?: number;
  authorType?: 'saiko' | 'user';
}

interface AlsoOnCardProps {
  maps: MapItem[];
  span?: number; // Grid column span (3 or 6)
}

export function AlsoOnCard({ maps, span = 6 }: AlsoOnCardProps) {
  if (!maps || maps.length === 0) return null;

  // Additional safety: filter out any maps without valid placeCount
  const validMaps = maps.filter(
    (map) => typeof map.placeCount === 'number' && map.placeCount > 0
  );

  if (validMaps.length === 0) return null;

  return (
    <div className={styles.alsoOnCard} style={{ gridColumn: `span ${span}` }}>
      <div className={styles.label}>ALSO ON</div>
      <div className={styles.mapsContainer}>
        {validMaps.map((map) => (
          <Link
            key={map.id}
            href={`/map/${map.slug}`}
            className={styles.mapCard}
          >
            {/* Hero Image */}
            <div className={styles.heroImage}>
              {map.coverImageUrl ? (
                <div
                  className={styles.heroImageBg}
                  style={{ backgroundImage: `url(${map.coverImageUrl})` }}
                />
              ) : (
                <div className={styles.heroImagePlaceholder}>
                  <svg className={styles.gridPattern} viewBox="0 0 120 80">
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
                    <rect width="120" height="80" fill="url(#grid-${map.id})" />
                  </svg>
                </div>
              )}
            </div>

            {/* Content */}
            <div className={styles.content}>
              {/* Type Label */}
              <div className={styles.typeLabel}>
                MAP · {map.placeCount} {map.placeCount === 1 ? 'PLACE' : 'PLACES'}
              </div>

              {/* Title */}
              <div className={styles.title}>{map.title}</div>

              {/* Description (if available) */}
              {map.description && (
                <div className={styles.description}>{map.description}</div>
              )}

              {/* Attribution */}
              <div className={styles.meta}>
                {map.authorType === 'saiko' ? (
                  <span className={styles.curatorBadge}>
                    <span className={styles.curatorStar}>★</span>
                    Curator Pick
                  </span>
                ) : (
                  <span>By @{map.creatorName}</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
