/**
 * Shared TypeScript Types
 * Common type definitions used throughout the app
 */

import { User, List, Location, ImportJob } from '@prisma/client'

// ============================================
// USER TYPES
// ============================================

export type SubscriptionTier = 'free' | 'personal' | 'business'

export interface UserProfile extends User {
  listCount?: number
}

// ============================================
// LIST TYPES
// ============================================

export type TemplateType = 'field-notes' | 'field_notes'
export type AccessLevel = 'public' | 'password' | 'private'

export interface ListWithLocations extends List {
  locations: Location[]
  user: User
}

export interface ListMetadata {
  locationCount: number
  categories: string[]
  lastUpdated: Date
}

// ============================================
// LOCATION TYPES
// ============================================

export interface GooglePlaceData {
  placeId: string
  name: string
  address: string
  latitude: number
  longitude: number
  phone?: string
  website?: string
  hours?: Record<string, string>
  description?: string
  photos?: string[]
  rating?: number
  priceLevel?: number
}

export interface LocationFormData {
  name: string
  address?: string
  category?: string
  userNote?: string
}

// ============================================
// IMPORT TYPES
// ============================================

export type ImportStatus = 'processing' | 'completed' | 'failed'

export interface CSVRow {
  Title: string
  URL?: string
  Address?: string
  Comment?: string
  [key: string]: string | undefined
}

export interface ImportPreview {
  totalRows: number
  validRows: number
  duplicates: number
  locations: Array<{
    name: string
    address?: string
    url?: string
    comment?: string
  }>
  costEstimate?: { totalCost?: number }
}

export interface ImportProgress extends ImportJob {
  percentage: number
  currentLocation?: string
  list?: { id: string; slug: string }
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ============================================
// FORM TYPES
// ============================================

export interface CreateListFormData {
  title: string
  subtitle?: string
  templateType: TemplateType
  accessLevel: AccessLevel
  password?: string
}

export interface UpdateListFormData {
  title?: string
  subtitle?: string
  introText?: string
  coverImageUrl?: string
  primaryColor?: string
  secondaryColor?: string
  accessLevel?: AccessLevel
}

// ============================================
// AI-GENERATED MAP METADATA
// ============================================

export interface GeneratedMapDetails {
  title: string;
  description: string;
  scope: {
    geography: string;
    placeTypes: string[];
  };
}

// ============================================
// GOOGLE PLACES API TYPES
// ============================================

export interface PlacesSearchRequest {
  query: string
  location?: {
    lat: number
    lng: number
  }
  radius?: number
}

export interface PlacesSearchResult {
  placeId: string
  name: string
  address: string
  types: string[]
}


