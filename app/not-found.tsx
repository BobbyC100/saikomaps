/**
 * Global 404 — Not Found page
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        background: '#F5F0E1',
        color: '#36454F',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '72px',
          fontFamily: 'var(--font-libre), Georgia, serif',
          fontStyle: 'italic',
          color: '#C3B091',
          lineHeight: 1,
          marginBottom: '16px',
        }}
      >
        404
      </div>
      <h1
        style={{
          fontFamily: 'var(--font-libre), Georgia, serif',
          fontStyle: 'italic',
          fontSize: '24px',
          fontWeight: 400,
          margin: '0 0 12px',
          color: '#36454F',
        }}
      >
        Page not found
      </h1>
      <p
        style={{
          fontSize: '14px',
          color: '#8B7355',
          maxWidth: '360px',
          lineHeight: 1.5,
          margin: '0 0 32px',
        }}
      >
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <Link
          href="/"
          style={{
            padding: '10px 24px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#F5F0E1',
            background: '#36454F',
            borderRadius: '6px',
            textDecoration: 'none',
            letterSpacing: '0.5px',
          }}
        >
          Go Home
        </Link>
        <Link
          href="/explore"
          style={{
            padding: '10px 24px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#36454F',
            background: 'transparent',
            border: '1px solid #C3B091',
            borderRadius: '6px',
            textDecoration: 'none',
            letterSpacing: '0.5px',
          }}
        >
          Explore Maps
        </Link>
      </div>
    </div>
  );
}
