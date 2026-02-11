export interface ExploreMap {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  placeCount: number;
  coverPhotos: string[];
  curatorName: string;
  curatorId: string;
  neighborhoods: string[];
  categories: string[];
  publishedAt: string | null;
  viewCount: number;
}

export interface ExploreFilters {
  q?: string;
  neighborhood?: string;
  category?: string;
  sort?: 'recent' | 'popular' | 'alphabetical';
}

export interface ExplorePagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ExploreResponse {
  success: boolean;
  data: {
    maps: ExploreMap[];
    pagination: ExplorePagination;
  };
}
