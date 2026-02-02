'use client';

import Link from 'next/link';
import Image from 'next/image';

interface MapHeaderProps {
  template: {
    bg: string;
    text: string;
  };
}

export function MapHeader({ template }: MapHeaderProps) {
  // Logo links to homepage (can be enhanced later to check auth state)
  const logoHref = '/';

  return (
    <header
      className="border-b"
      style={{
        borderColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href={logoHref} className="flex items-center gap-3">
          <Image src="/saiko-logo.png" alt="Saiko Maps" width={40} height={40} />
          <span className="font-bold text-xl tracking-tight" style={{ color: template.text }}>
            SAIKO MAPS
          </span>
        </Link>
      </div>
    </header>
  );
}
