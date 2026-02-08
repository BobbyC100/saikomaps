'use client';

import { ReactNode } from 'react';

export type LayoutMode = 'search' | 'explore';

interface BentoGridProps {
  children: ReactNode;
  mode?: LayoutMode;
  maxWidth?: number;
}

export function BentoGrid({ children, mode = 'search', maxWidth = 900 }: BentoGridProps) {
  return (
    <>
      <div
        className="bento-grid"
        data-mode={mode}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridAutoRows: 120,
          gap: 12,
          gridAutoFlow: 'dense',
          maxWidth,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {children}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          /* Responsive breakpoints */
          
          /* Mobile (≤640px) - 1 column */
          @media (max-width: 640px) {
            .bento-grid {
              grid-template-columns: 1fr !important;
            }
            
            /* All cards span 1 column on mobile */
            .card-place-1x1,
            .card-place-1x2,
            .card-place-2x1,
            .card-place-2x2,
            .card-spotlight-1x2,
            .card-spotlight-2x1,
            .card-spotlight-2x2,
            .card-quiet-1x1,
            .card-quiet-1x2,
            .card-quiet-2x1 {
              grid-column: span 1 !important;
            }
            
            /* Vertical cards keep their height */
            .card-place-1x2,
            .card-place-2x2,
            .card-spotlight-1x2,
            .card-spotlight-2x2,
            .card-quiet-1x2 {
              grid-row: span 2 !important;
            }
            
            /* Horizontal cards flip to vertical layout on mobile */
            .card-place-2x1,
            .card-spotlight-2x1 {
              flex-direction: column !important;
            }
            .card-place-2x1 > div:first-child,
            .card-spotlight-2x1 > div:first-child {
              width: 100% !important;
              height: 120px !important;
            }
          }
          
          /* Tablet (641-900px) - 2 columns */
          @media (min-width: 641px) and (max-width: 900px) {
            .bento-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
            
            /* 2-wide cards span 2 columns */
            .card-place-2x1,
            .card-place-2x2,
            .card-spotlight-2x1,
            .card-spotlight-2x2,
            .card-quiet-2x1 {
              grid-column: span 2 !important;
            }
            
            /* 1-wide cards span 1 column */
            .card-place-1x1,
            .card-place-1x2,
            .card-spotlight-1x2,
            .card-quiet-1x1,
            .card-quiet-1x2 {
              grid-column: span 1 !important;
            }
          }
          
          /* Desktop (>900px) - 4 columns */
          @media (min-width: 901px) {
            .bento-grid {
              grid-template-columns: repeat(4, 1fr) !important;
            }
          }
          
          /* Hover effects for all cards */
          .card-place-1x1:hover,
          .card-place-1x2:hover,
          .card-place-2x1:hover,
          .card-place-2x2:hover,
          .card-spotlight-1x2:hover,
          .card-spotlight-2x1:hover,
          .card-spotlight-2x2:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(139, 115, 85, 0.15);
          }
        `
      }} />
    </>
  );
}
