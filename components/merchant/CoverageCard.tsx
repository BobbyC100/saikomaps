/**
 * Coverage Card Component
 * 
 * Shows editorial coverage with internal priority:
 * 1. Pull Quote (best case)
 * 2. Excerpt from first source (fallback)
 * 3. Source list only (minimal case)
 * 
 * Merchant Page v2: 4-col card with vibe tag
 */

'use client';

import styles from './CoverageCard.module.css';

interface EditorialSource {
  source_id?: string;
  publication?: string;
  title?: string;
  url: string;
  published_at?: string;
  trust_level?: string;
  content?: string;
  // Legacy fields
  name?: string;
  excerpt?: string;
}

interface CoverageCardProps {
  pullQuote?: string | null;
  pullQuoteSource?: string | null;
  pullQuoteAuthor?: string | null;
  sources?: EditorialSource[];
  vibeTag?: string | null; // Optional first vibe tag to display
}

export function CoverageCard({
  pullQuote,
  pullQuoteSource,
  pullQuoteAuthor,
  sources = [],
  vibeTag,
}: CoverageCardProps) {
  const hasPullQuote = !!pullQuote?.trim();
  const firstSource = sources[0];
  const hasExcerpt = !!(firstSource?.content || firstSource?.excerpt);
  const hasSources = sources.length > 0;

  // Don't render if no content at all
  if (!hasPullQuote && !hasExcerpt && !hasSources) {
    return null;
  }

  // Determine source label (uppercase publication name)
  let sourceLabel = '';
  if (hasPullQuote && pullQuoteSource) {
    sourceLabel = pullQuoteSource.toUpperCase();
  } else if (hasExcerpt || hasSources) {
    sourceLabel = (firstSource?.publication || firstSource?.name || 'COVERAGE').toUpperCase();
  }

  return (
    <div className={`${styles.coverageCard} ${styles.col4}`}>
      {/* Source label */}
      {sourceLabel && <div className={styles.label}>{sourceLabel}</div>}

      {/* Priority 1: Pull Quote (best case) */}
      {hasPullQuote && (
        <div className={styles.quote}>
          &ldquo;{pullQuote}&rdquo;
        </div>
      )}

      {/* Priority 2: Excerpt from first source (fallback) */}
      {!hasPullQuote && hasExcerpt && (
        <div className={styles.quote}>
          &ldquo;{(() => {
            const content = firstSource.content || firstSource.excerpt || '';
            if (content.length <= 150) return content;
            // Truncate to ~150 chars at sentence or word boundary
            const truncated = content.slice(0, 150);
            const lastSentence = truncated.lastIndexOf('. ');
            const lastSpace = truncated.lastIndexOf(' ');
            const cutPoint = lastSentence > 100 ? lastSentence + 1 : lastSpace;
            return truncated.slice(0, cutPoint) + '…';
          })()}&rdquo;
        </div>
      )}

      {/* Priority 3: Source list only (minimal case) */}
      {!hasPullQuote && !hasExcerpt && hasSources && (
        <div className={styles.sourceList}>
          {sources
            .filter((src) => (src.publication && src.title) || (src.name && src.excerpt))
            .slice(0, 3)
            .map((src, i) => (
              <div key={src.source_id || i} className={styles.sourceItem}>
                {src.title || src.excerpt}
              </div>
            ))}
        </div>
      )}

      {/* Optional vibe tag */}
      {vibeTag && <div className={styles.vibeTag}>{vibeTag}</div>}
    </div>
  );
}
