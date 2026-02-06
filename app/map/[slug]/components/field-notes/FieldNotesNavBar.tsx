'use client';

import Link from 'next/link';

interface FieldNotesNavBarProps {
  theme: 'light' | 'dark';
}

export function FieldNotesNavBar({ theme }: FieldNotesNavBarProps) {
  const dark = theme === 'dark';

  return (
    <nav
      className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-6 z-[100]"
      style={{
        backgroundColor: dark ? 'var(--fn-navy)' : 'var(--fn-parchment)',
        borderBottom: dark ? '1px solid rgba(137,180,196,0.1)' : '1px solid rgba(195,176,145,0.25)',
      }}
    >
      <Link href="/" className="flex items-center gap-2.5">
        {/* The Fold Logo - adapted for Field Notes theme */}
        <svg width="28" height="24" viewBox="0 0 38 32" fill="none">
          <path 
            d="M2 4 L13 2 L25 4 L36 2 L36 28 L25 30 L13 28 L2 30 Z" 
            fill={dark ? 'rgba(237, 232, 216, 0.95)' : '#FFFFFF'} 
            stroke={dark ? 'var(--fn-parchment)' : 'var(--fn-charcoal)'} 
            strokeWidth="1.2"
          />
          <line x1="13" y1="2" x2="13" y2="28" stroke={dark ? 'rgba(137,180,196,0.2)' : '#E5E5E5'} strokeWidth="0.8" strokeDasharray="2 2"/>
          <line x1="25" y1="4" x2="25" y2="30" stroke={dark ? 'rgba(137,180,196,0.2)' : '#E5E5E5'} strokeWidth="0.8" strokeDasharray="2 2"/>
          <path d="M25 8.5 C24 7.5 21 6 18 6.5 C14.5 7 13 9 13 11 C13 13.5 15.5 14.5 19 15.5 C22.5 16.5 25 17.5 25 20.5 C25 23 23 25.5 19 26 C15.5 26.5 13 25 12 24" stroke={dark ? 'var(--fn-ocean)' : '#E07A5F'} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
          <circle cx="25" cy="8.5" r="2.2" fill={dark ? 'var(--fn-ocean)' : '#E07A5F'}/>
          <circle cx="25" cy="8.5" r="0.9" fill={dark ? 'rgba(237, 232, 216, 0.95)' : '#FFFFFF'}/>
          <circle cx="19" cy="16" r="1.6" fill={dark ? 'var(--fn-ocean)' : '#E07A5F'}/>
          <circle cx="19" cy="16" r="0.6" fill={dark ? 'rgba(237, 232, 216, 0.95)' : '#FFFFFF'}/>
          <circle cx="12" cy="24" r="2.2" fill={dark ? 'var(--fn-ocean)' : '#E07A5F'}/>
          <circle cx="12" cy="24" r="0.9" fill={dark ? 'rgba(237, 232, 216, 0.95)' : '#FFFFFF'}/>
        </svg>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span
            style={{
              fontFamily: 'Instrument Serif, Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: '16px',
              lineHeight: 1,
              color: dark ? 'var(--fn-parchment)' : 'var(--fn-charcoal)',
            }}
          >
            SAIKO
          </span>
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              fontSize: '8px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              lineHeight: 1,
              color: dark ? 'rgba(137,180,196,0.6)' : 'var(--fn-khaki)',
            }}
          >
            MAPS
          </span>
        </div>
      </Link>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{
            color: dark ? 'rgba(137,180,196,0.6)' : 'var(--fn-khaki)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = dark ? 'rgba(137,180,196,0.1)' : 'rgba(195,176,145,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label="Share"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
          </svg>
        </button>
        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{
            color: dark ? 'rgba(137,180,196,0.6)' : 'var(--fn-khaki)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = dark ? 'rgba(137,180,196,0.1)' : 'rgba(195,176,145,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label="More options"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
