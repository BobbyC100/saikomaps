/**
 * Quiet Card - Visual fill for incomplete rows
 * 
 * Patterns match saiko-place-page-v3-3-final.html spec:
 * - 'grid': Map grid pattern
 * - 'mon': Geometric mon (dots)
 * 
 * Critical: Span-1 is ONLY allowed for Quiet cards
 */
'use client';

import styles from './QuietCard.module.css';

interface QuietCardProps {
  variant?: 'grid' | 'mon';
  span?: 1 | 2 | 3;
  className?: string;
}

export function QuietCard({ 
  variant = 'grid', 
  span = 2, 
  className = '' 
}: QuietCardProps) {
  return (
    <div
      className={`${styles.quietCard} ${styles[`pattern-${variant}`]} ${className}`}
      style={{
        gridColumn: `span ${span}`,
      }}
      aria-hidden="true"
      data-quiet-card={variant}
      data-span={span}
    />
  );
}
