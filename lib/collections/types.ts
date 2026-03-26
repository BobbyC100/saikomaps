import type { PrimaryVertical } from '@prisma/client'

export type CollectionScope = 'city' | 'region' | 'neighborhood'

export interface RegionDefinition {
  key: string
  label: string
  neighborhoods: string[]
}

export interface VerticalDefinition {
  key: string
  label: string
  description: string
  primaryVerticals: PrimaryVertical[]
}

export interface CollectionDefinition {
  key: string
  slug: string
  title: string
  subtitle: string
  scope: CollectionScope
  verticalKey: string
  regionKey?: string
  neighborhood?: string
  city?: string
  sortRank: number
  isEditorialCollection: boolean
  sourceNeighborhoods: string[]
  maxEntities: number
}

export interface CollectionSeedRecord {
  slug: string
  title: string
  subtitle: string
  templateType: string
  scope: CollectionScope
  verticalKey: string
  regionKey: string | null
  neighborhood: string | null
  city: string | null
  sortRank: number
  isEditorialCollection: boolean
  sourceNeighborhoods: string[]
  maxEntities: number
}
