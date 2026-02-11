/**
 * Explore Page Types
 * For browse and search modes
 */

export type ExploreMode = 'browse' | 'search';
export type ViewMode = 'grid' | 'list';

export interface MapCardData {
  id: string;
  slug: string;
  title: string;
  tagline?: string;  // 1-line description
  placeCount: number;
  creatorName: string;
  isCuratorPick: boolean;
  coverImageUrl?: string;
  featured?: boolean;  // Only in browse mode, after first section
  updatedAt?: Date;
}

export interface PlaceCardData {
  id: string;
  slug: string;
  name: string;
  tagline?: string;  // From Voice Engine or editorial
  neighborhood: string;
  mapCount: number;  // "On X maps"
  thumbnailUrl?: string;
}

export interface SearchResults {
  query: string;
  maps: MapCardData[];
  places: PlaceCardData[];
}

export interface FilterTab {
  id: string;
  label: string;
}

export const FILTERS: FilterTab[] = [
  { id: 'all', label: 'All' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'bars', label: 'Bars' },
  { id: 'neighborhoods', label: 'Neighborhoods' },
  { id: 'near-me', label: 'Near Me' },
];
