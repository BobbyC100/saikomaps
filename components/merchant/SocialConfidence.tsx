/**
 * Social Confidence Section
 * 
 * DEPRECATED: This component is being replaced by Grid System v1.
 * - Curator's Note now renders as standalone 3-col card
 * - Coverage (Pull Quote/Excerpt/Sources) now in CoverageCard
 * - Instagram removed (belongs in Primary Action Set only)
 * 
 * This component kept temporarily for backward compatibility.
 */

'use client';

import styles from './SocialConfidence.module.css';

interface SocialConfidenceProps {
  curatorNote?: string | null;
  curatorName?: string | null;
  pullQuote?: string | null;
  pullQuoteSource?: string | null;
  pullQuoteAuthor?: string | null;
  instagram?: string | null; // IGNORED - Instagram belongs in Primary Action Set only
}

export function SocialConfidence({
  curatorNote,
  curatorName,
}: SocialConfidenceProps) {
  const hasCuratorNote = !!curatorNote?.trim();

  // Don't render if no content
  if (!hasCuratorNote) {
    return null;
  }

  return (
    <div className={styles.curatorNoteCard}>
      <div className={styles.blockLabel}>Curator&apos;s Note</div>
      <p className={styles.curatorNoteText}>{curatorNote}</p>
      {curatorName && (
        <div className={styles.curatorNoteAttribution}>— {curatorName}</div>
      )}
    </div>
  );
}
