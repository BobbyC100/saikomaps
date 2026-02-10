/**
 * Map Card Types
 * For displaying maps (curated collections) in search results and editorial surfaces
 */

export interface MapCardData {
  slug: string;
  title: string;
  description?: string;
  placeCount: number;
  coverImageUrl?: string;
  neighborhoods?: string[];  // e.g. ["Silver Lake", "Echo Park"]
  authorType: 'saiko' | 'user';
  authorUsername?: string;  // Required if authorType === 'user'
}

export interface MapCardProps {
  map: MapCardData;
  variant?: '2x1' | '2x2' | 'title-block';
  compact?: boolean; // For title-block only
}
