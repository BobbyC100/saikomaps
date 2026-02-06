'use client';

import Link from 'next/link';

interface SaikoLogoProps {
  href?: string;
  className?: string;
  /** 'light' for dark backgrounds (white text), 'dark' for light backgrounds (dark text) */
  variant?: 'light' | 'dark';
}

export function SaikoLogo({ href = '/', className = '', variant = 'dark' }: SaikoLogoProps) {
  const logoStroke = variant === 'light' ? '#FFFFFF' : '#1A1A1A';
  const logoFill = variant === 'light' ? 'rgba(255,255,255,0.95)' : '#FFFFFF';
  const saikoColor = variant === 'light' ? '#FFFFFF' : '#1A1A1A';
  const mapsColor = variant === 'light' ? 'rgba(255,255,255,0.6)' : '#9A9A9A';
  
  const logoContent = (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* The Fold SVG Logo */}
      <svg width="36" height="30" viewBox="0 0 38 32" fill="none">
        <path d="M2 4 L13 2 L25 4 L36 2 L36 28 L25 30 L13 28 L2 30 Z" fill={logoFill} stroke={logoStroke} strokeWidth="1.2"/>
        <line x1="13" y1="2" x2="13" y2="28" stroke="#E5E5E5" strokeWidth="0.8" strokeDasharray="2 2"/>
        <line x1="25" y1="4" x2="25" y2="30" stroke="#E5E5E5" strokeWidth="0.8" strokeDasharray="2 2"/>
        <path d="M25 8.5 C24 7.5 21 6 18 6.5 C14.5 7 13 9 13 11 C13 13.5 15.5 14.5 19 15.5 C22.5 16.5 25 17.5 25 20.5 C25 23 23 25.5 19 26 C15.5 26.5 13 25 12 24" stroke="#E07A5F" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <circle cx="25" cy="8.5" r="2.2" fill="#E07A5F"/>
        <circle cx="25" cy="8.5" r="0.9" fill={logoFill}/>
        <circle cx="19" cy="16" r="1.6" fill="#E07A5F"/>
        <circle cx="19" cy="16" r="0.6" fill={logoFill}/>
        <circle cx="12" cy="24" r="2.2" fill="#E07A5F"/>
        <circle cx="12" cy="24" r="0.9" fill={logoFill}/>
      </svg>
      
      {/* Wordmark - HORIZONTAL LAYOUT */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span
          style={{
            fontFamily: 'Instrument Serif, Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: '20px',
            lineHeight: 1,
            color: saikoColor,
          }}
        >
          SAIKO
        </span>
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500,
            fontSize: '9px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            lineHeight: 1,
            color: mapsColor,
          }}
        >
          MAPS
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none' }}>
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
