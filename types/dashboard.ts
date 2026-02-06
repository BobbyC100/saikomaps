export interface DashboardStats {
  totalGuides: number;
  totalLocations: number;
  totalViews: number;
  publishedGuides: number;
  draftGuides: number;
}

export interface List {
  id: string;
  title: string;
  slug: string;
  description?: string;
  isPublished: boolean;
  locationCount: number;
  viewCount: number;
  template: 'field-notes' | 'field_notes';
  createdAt: Date;
  updatedAt: Date;
}
