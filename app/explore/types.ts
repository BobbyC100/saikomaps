/**
 * Explore Page Types
 * For browse and search modes
 */

export type ExploreMode = 'browse' | 'search';
export type ViewMode = 'grid' | 'list';
export type CollectionScope = 'neighborhood' | 'region' | 'city';

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

export interface EntityCardData {
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
  places: EntityCardData[];
}

export interface FilterTab {
  id: string;
  label: string;
}

export interface CollectionFilters {
  scope: CollectionScope | 'all';
  vertical: string | 'all';
  region: string | 'all';
  neighborhood: string | 'all';
}

export interface CollectionListResponse {
  data: MapCardData[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CollectionFacetResponse {
  scopes: Array<{ key: CollectionScope; label: string; count: number }>;
  verticals: Array<{ key: string; label: string; count: number }>;
  regions: Array<{ key: string; label: string; count: number }>;
  neighborhoods: Array<{ key: string; label: string; count: number }>;
}

export const FILTERS: FilterTab[] = [
  { id: 'all', label: 'All' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'bars', label: 'Bars' },
  { id: 'neighborhoods', label: 'Neighborhoods' },
  { id: 'near-me', label: 'Near Me' },
];
