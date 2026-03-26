import { generateSlug } from '@/lib/utils'
import { LOCKED_CITY_NAME, REGION_DEFINITIONS } from '@/lib/collections/config/regions'
import { VERTICAL_DEFINITIONS } from '@/lib/collections/config/verticals'
import type { CollectionDefinition } from '@/lib/collections/types'

export const LOCKED_COLLECTION_COUNT = 85

function toTitleCase(value: string): string {
  return value
    .split(/\s+/g)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

const allNeighborhoods = REGION_DEFINITIONS.flatMap((region) => region.neighborhoods)

const cityCollections: CollectionDefinition[] = VERTICAL_DEFINITIONS.map((vertical, index) => ({
  key: `city-${vertical.key}`,
  slug: `city-${vertical.key}-${generateSlug(LOCKED_CITY_NAME)}`,
  title: `${vertical.label} in ${LOCKED_CITY_NAME}`,
  subtitle: `City-level ${vertical.label.toLowerCase()} collection`,
  scope: 'city',
  verticalKey: vertical.key,
  city: LOCKED_CITY_NAME,
  sortRank: index + 1,
  isEditorialCollection: true,
  sourceNeighborhoods: allNeighborhoods,
  maxEntities: 36,
}))

const regionCollections: CollectionDefinition[] = REGION_DEFINITIONS.flatMap((region, regionIndex) => {
  const verticalIndexes = [
    regionIndex % VERTICAL_DEFINITIONS.length,
    (regionIndex + 4) % VERTICAL_DEFINITIONS.length,
    (regionIndex + 8) % VERTICAL_DEFINITIONS.length,
  ]

  return verticalIndexes.map((verticalIndex, offset) => {
    const vertical = VERTICAL_DEFINITIONS[verticalIndex]
    return {
      key: `region-${region.key}-${vertical.key}`,
      slug: `region-${region.key}-${vertical.key}`,
      title: `${vertical.label} in ${region.label}`,
      subtitle: `${region.label} regional collection`,
      scope: 'region' as const,
      verticalKey: vertical.key,
      regionKey: region.key,
      city: LOCKED_CITY_NAME,
      sortRank: 100 + regionIndex * 3 + offset,
      isEditorialCollection: true,
      sourceNeighborhoods: region.neighborhoods,
      maxEntities: 30,
    }
  })
})

const neighborhoodCollections: CollectionDefinition[] = allNeighborhoods
  .slice(0, 34)
  .map((neighborhood, index) => {
    const vertical = VERTICAL_DEFINITIONS[index % VERTICAL_DEFINITIONS.length]
    const region = REGION_DEFINITIONS.find((item) => item.neighborhoods.includes(neighborhood))
    return {
      key: `neighborhood-${generateSlug(neighborhood)}-${vertical.key}`,
      slug: `neighborhood-${generateSlug(neighborhood)}-${vertical.key}`,
      title: `${vertical.label} in ${toTitleCase(neighborhood)}`,
      subtitle: `${toTitleCase(neighborhood)} neighborhood collection`,
      scope: 'neighborhood' as const,
      verticalKey: vertical.key,
      regionKey: region?.key,
      neighborhood,
      city: LOCKED_CITY_NAME,
      sortRank: 300 + index,
      isEditorialCollection: true,
      sourceNeighborhoods: [neighborhood],
      maxEntities: 24,
    }
  })

export const COLLECTION_DEFINITIONS: CollectionDefinition[] = [
  ...cityCollections,
  ...regionCollections,
  ...neighborhoodCollections,
]

if (COLLECTION_DEFINITIONS.length !== LOCKED_COLLECTION_COUNT) {
  throw new Error(
    `Expected ${LOCKED_COLLECTION_COUNT} collection definitions, found ${COLLECTION_DEFINITIONS.length}`
  )
}
