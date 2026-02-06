'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface BackToMapButtonProps {
  /**
   * Optional: Pass the map slug directly if you have it in scope.
   * Otherwise, will use the 'from' URL param.
   */
  mapSlug?: string;
}

export function BackToMapButton({ mapSlug: propMapSlug }: BackToMapButtonProps = {}) {
  const searchParams = useSearchParams();
  const fromParam = searchParams.get('from');
  const [mapSlug, setMapSlug] = useState<string | null>(null);

  useEffect(() => {
    // If props provided, use those
    if (propMapSlug) {
      setMapSlug(propMapSlug);
      return;
    }

    // Otherwise, check URL param
    if (fromParam) {
      setMapSlug(fromParam);
    }
  }, [fromParam, propMapSlug]);

  // Don't render if no map context
  if (!mapSlug) return null;

  return (
    <Link
      href={`/map/${mapSlug}`}
      style={{
        position: 'absolute',
        top: 80,
        left: 24,
        background: 'transparent',
        color: '#36454F',
        fontFamily: "'Libre Baskerville', Georgia, serif",
        fontSize: 14,
        fontStyle: 'italic',
        padding: '8px 0',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'color 0.2s ease',
        zIndex: 50,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#D64541';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#36454F';
      }}
    >
      <span style={{ fontStyle: 'normal' }}>←</span> Map
    </Link>
  );
}
