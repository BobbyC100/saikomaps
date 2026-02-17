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
  span?: number; // Grid column span (from resolver)
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
  
  // Use span from resolver if provided, otherwise use dynamic sizing
  let columnSpan: number;
  if (span !== undefined) {
    columnSpan = span;
  } else {
    // Legacy: Dynamic sizing based on quote length
    const isShortQuote = displayQuote.length < 120;
    const isMediumQuote = displayQuote.length < 180;
    columnSpan = isShortQuote ? 3 : isMediumQuote ? 4 : 5;
  }
  
  const isShortQuote = displayQuote.length < 120;

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
      
      {/* Optional: Link to full article */}
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
