/**
 * Coverage Card Component
 * 
 * Shows editorial coverage with internal priority:
 * 1. Pull Quote (best case)
 * 2. Extract from sources array (runtime extraction)
 * 
 * Merchant Page v2: Dynamic sizing (3-5 columns based on quote length)
 */

'use client';

import { extractQuoteFromSources } from '@/lib/extractQuote';
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
  pullQuoteUrl?: string | null;
  sources?: EditorialSource[];
  vibeTag?: string | null;
  span?: number; // Grid column span (parent controls layout)
}

export function CoverageCard({
  pullQuote,
  pullQuoteSource,
  pullQuoteAuthor,
  pullQuoteUrl,
  sources = [],
  vibeTag,
  span,
}: CoverageCardProps) {
  // Priority 1: Use explicit pullQuote if available
  let displayQuote = pullQuote?.trim() || null;
  let displaySource = pullQuoteSource || null;
  let displayUrl = pullQuoteUrl || null;
  
  // Priority 2: Extract from sources array
  if (!displayQuote && sources.length > 0) {
    const extracted = extractQuoteFromSources(sources);
    if (extracted) {
      displayQuote = extracted.quote;
      displaySource = extracted.source;
      displayUrl = extracted.url ?? null;
    }
  }
  
  // If still no quote, don't render the card
  if (!displayQuote) {
    return null;
  }
  
  // Use parent-controlled span, or fallback to dynamic sizing
  const isShortQuote = displayQuote.length < 120;
  const columnSpan = span ?? (isShortQuote ? 3 : displayQuote.length < 180 ? 4 : 5);

  return (
    <div
      className={styles.coverageCard}
      style={{ gridColumn: `span ${columnSpan}` }}
    >
      {/* Source Label */}
      <div className={styles.label}>
        {displaySource?.toUpperCase() || 'EDITORIAL'}
      </div>

      {/* Quote */}
      <blockquote
        className={styles.quote}
        style={{ fontSize: isShortQuote ? '13px' : '12px' }}
      >
        &ldquo;{displayQuote}&rdquo;
      </blockquote>

      {/* Primary source link */}
      {displayUrl && (
        <a
          href={displayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.readMore}
        >
          Read more
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 17L17 7M7 7h10v10" />
          </svg>
        </a>
      )}

      {/* Optional vibe tag */}
      {vibeTag && <div className={styles.vibeTag}>{vibeTag}</div>}
    </div>
  );
}
