'use client';

import { QuietCardData } from './quietTypes';

interface QuietCard1x2Props {
  quiet: QuietCardData;
}

export function QuietCard1x2({ quiet }: QuietCard1x2Props) {
  const { content, label, icon } = quiet;

  // Icon SVG paths
  const icons = {
    info: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4M12 8h.01"/>
      </svg>
    ),
    star: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  };

  return (
    <div
      className="card-quiet-1x2"
      style={{
        gridColumn: 'span 1',
        gridRow: 'span 2',
        background: '#FFFDF7',
        border: '1px solid rgba(195, 176, 145, 0.28)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 14,
        gap: 12,
      }}
    >
      {/* Icon */}
      {icon && (
        <div
          style={{
            width: 26,
            height: 26,
            color: '#C3B091',
            opacity: 0.55,
          }}
        >
          {icons[icon]}
        </div>
      )}

      {/* Content text */}
      <p
        style={{
          fontFamily: '"Libre Baskerville", Georgia, serif',
          fontSize: 12,
          fontStyle: 'italic',
          color: '#36454F',
          opacity: 0.6,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {content}
      </p>

      {/* Label */}
      {label && (
        <span
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: '#C3B091',
            opacity: 0.85,
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
