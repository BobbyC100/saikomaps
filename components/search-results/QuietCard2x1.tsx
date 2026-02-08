'use client';

import { QuietCardData } from './quietTypes';

interface QuietCard2x1Props {
  quiet: QuietCardData;
}

export function QuietCard2x1({ quiet }: QuietCard2x1Props) {
  const { number, content } = quiet;

  return (
    <div
      className="card-quiet-2x1"
      style={{
        gridColumn: 'span 2',
        gridRow: 'span 1',
        background: '#FFFDF7',
        border: '1px solid rgba(195, 176, 145, 0.28)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 16,
        gap: 10,
      }}
    >
      {/* Large number */}
      {number && (
        <div
          style={{
            fontFamily: '"Libre Baskerville", Georgia, serif',
            fontSize: 30,
            fontWeight: 700,
            color: '#36454F',
            opacity: 0.18,
            lineHeight: 1,
          }}
        >
          {number}
        </div>
      )}

      {/* Content text */}
      <span
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: '#36454F',
          opacity: 0.5,
        }}
      >
        {content}
      </span>
    </div>
  );
}
