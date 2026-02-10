'use client';

import { GlobalHeader } from '@/components/layouts/GlobalHeader';

interface MapHeaderProps {
  template: {
    bg: string;
    text: string;
  };
  onShare?: () => void;
}

export function MapHeader({ template, onShare }: MapHeaderProps) {
  // Use GlobalHeader with immersive variant for map view
  return <GlobalHeader variant="immersive" onShare={onShare} />;
}
