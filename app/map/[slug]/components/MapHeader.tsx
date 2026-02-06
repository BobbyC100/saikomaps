'use client';

import { GlobalHeader } from '@/components/layouts/GlobalHeader';

interface MapHeaderProps {
  template: {
    bg: string;
    text: string;
  };
}

export function MapHeader({ template }: MapHeaderProps) {
  // Use GlobalHeader with immersive variant for map view
  return <GlobalHeader variant="immersive" />;
}
