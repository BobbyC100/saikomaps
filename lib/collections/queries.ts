import { db } from '@/lib/db'
import { REGION_DEFINITIONS, VERTICAL_DEFINITIONS } from '@/lib/collections/config'
import { toExploreCard } from '@/lib/collections/serializers'
import type { CollectionScope } from '@/lib/collections/types'

export type CollectionQueryFilters = {
  scope?: CollectionScope
  vertical?: string
  region?: string
  neighborhood?: string
}

export function normalizePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export function buildCollectionWhere(filters: CollectionQueryFilters = {}) {
  return {
    published: true,
    isEditorialCollection: true,
    ...(filters.scope ? { collectionScope: filters.scope } : {}),
    ...(filters.vertical ? { collectionVerticalKey: filters.vertical } : {}),
    ...(filters.region ? { collectionRegionKey: filters.region } : {}),
    ...(filters.neighborhood ? { collectionNeighborhood: filters.neighborhood } : {}),
  }
}

function isMissingCollectionColumnError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message || ''
  return (
    (message.includes('P2022') || message.includes('does not exist')) &&
    (message.includes('lists.collection_') ||
      message.includes('lists.is_editorial_collection') ||
      message.includes('The column `lists.'))
  )
}

export async function queryCollections({
  filters,
  page,
  pageSize,
}: {
  filters?: CollectionQueryFilters
  page: number
  pageSize: number
}) {
  const where = buildCollectionWhere(filters)
  const skip = (page - 1) * pageSize

  let rows: Array<Record<string, unknown>>
  let total: number

  try {
    ;[rows, total] = await Promise.all([
      db.lists.findMany({
        where,
        include: {
          users: {
            select: {
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              map_places: true,
            },
          },
        },
        orderBy: [{ sortRank: 'asc' }, { updatedAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      db.lists.count({ where }),
    ])
  } catch (error) {
    if (!isMissingCollectionColumnError(error)) {
      throw error
    }

    // Fallback for environments where collection metadata columns are not migrated yet.
    const fallbackWhere = { published: true }
    ;[rows, total] = await Promise.all([
      db.lists.findMany({
        where: fallbackWhere,
        select: {
          id: true,
          slug: true,
          title: true,
          subtitle: true,
          description: true,
          coverImageUrl: true,
          updatedAt: true,
          users: { select: { name: true, email: true } },
          _count: { select: { map_places: true } },
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      db.lists.count({ where: fallbackWhere }),
    ])
  }

  return {
    data: rows.map((row) => {
      const typedRow = row as Parameters<typeof toExploreCard>[0]
      return toExploreCard({
        ...typedRow,
        sortRank: typedRow.sortRank ?? null,
      })
    }),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }
}

export async function queryCollectionFacets() {
  const where = {
    published: true,
    isEditorialCollection: true,
  }

  let scopeRows: Array<{ collectionScope: string | null; _count: { _all: number } }>
  let verticalRows: Array<{ collectionVerticalKey: string | null; _count: { _all: number } }>
  let regionRows: Array<{ collectionRegionKey: string | null; _count: { _all: number } }>
  let neighborhoodRows: Array<{ collectionNeighborhood: string | null; _count: { _all: number } }>

  try {
    ;[scopeRows, verticalRows, regionRows, neighborhoodRows] = await Promise.all([
      db.lists.groupBy({
        by: ['collectionScope'],
        where,
        _count: { _all: true },
      }),
      db.lists.groupBy({
        by: ['collectionVerticalKey'],
        where,
        _count: { _all: true },
      }),
      db.lists.groupBy({
        by: ['collectionRegionKey'],
        where,
        _count: { _all: true },
      }),
      db.lists.groupBy({
        by: ['collectionNeighborhood'],
        where,
        _count: { _all: true },
      }),
    ])
  } catch (error) {
    if (!isMissingCollectionColumnError(error)) {
      throw error
    }

    // Fallback mode: columns not present yet, return empty facets rather than 500.
    return {
      scopes: [],
      verticals: [],
      regions: [],
      neighborhoods: [],
    }
  }

  const verticalLabelMap = new Map(VERTICAL_DEFINITIONS.map((item) => [item.key, item.label]))
  const regionLabelMap = new Map(REGION_DEFINITIONS.map((item) => [item.key, item.label]))
  const scopeLabelMap: Record<CollectionScope, string> = {
    city: 'City',
    region: 'Region',
    neighborhood: 'Neighborhood',
  }

  return {
    scopes: scopeRows
      .filter((row) => row.collectionScope)
      .map((row) => ({
        key: row.collectionScope as CollectionScope,
        label: scopeLabelMap[row.collectionScope as CollectionScope] ?? row.collectionScope!,
        count: row._count._all,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    verticals: verticalRows
      .filter((row) => row.collectionVerticalKey)
      .map((row) => ({
        key: row.collectionVerticalKey!,
        label: verticalLabelMap.get(row.collectionVerticalKey!) ?? row.collectionVerticalKey!,
        count: row._count._all,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    regions: regionRows
      .filter((row) => row.collectionRegionKey)
      .map((row) => ({
        key: row.collectionRegionKey!,
        label: regionLabelMap.get(row.collectionRegionKey!) ?? row.collectionRegionKey!,
        count: row._count._all,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    neighborhoods: neighborhoodRows
      .filter((row) => row.collectionNeighborhood)
      .map((row) => ({
        key: row.collectionNeighborhood!,
        label: row.collectionNeighborhood!,
        count: row._count._all,
      }))
      .sort((a, b) => b.count - a.count),
  }
}
