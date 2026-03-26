import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { COLLECTION_DEFINITIONS, VERTICAL_DEFINITIONS } from '@/lib/collections/config'
import type { CollectionDefinition, CollectionSeedRecord } from '@/lib/collections/types'

function getSeedRecord(definition: CollectionDefinition): CollectionSeedRecord {
  return {
    slug: definition.slug,
    title: definition.title,
    subtitle: definition.subtitle,
    templateType: 'field-notes',
    scope: definition.scope,
    verticalKey: definition.verticalKey,
    regionKey: definition.regionKey ?? null,
    neighborhood: definition.neighborhood ?? null,
    city: definition.city ?? null,
    sortRank: definition.sortRank,
    isEditorialCollection: definition.isEditorialCollection,
    sourceNeighborhoods: definition.sourceNeighborhoods,
    maxEntities: definition.maxEntities,
  }
}

async function resolveEntityIds(definition: CollectionDefinition): Promise<string[]> {
  const vertical = VERTICAL_DEFINITIONS.find((item) => item.key === definition.verticalKey)
  if (!vertical) return []

  const rows = await db.entities.findMany({
    where: {
      status: 'OPEN',
      OR: [{ businessStatus: null }, { businessStatus: { not: 'CLOSED_PERMANENTLY' } }],
      primaryVertical: {
        in: vertical.primaryVerticals,
      },
      neighborhood: definition.sourceNeighborhoods.length
        ? {
            in: definition.sourceNeighborhoods,
          }
        : undefined,
    },
    select: {
      id: true,
    },
    orderBy: [{ overallConfidence: 'desc' }, { updatedAt: 'desc' }],
    take: definition.maxEntities,
  })

  return rows.map((row) => row.id)
}

export async function previewCollectionSync() {
  const previews = await Promise.all(
    COLLECTION_DEFINITIONS.map(async (definition) => {
      const entityIds = await resolveEntityIds(definition)
      const vertical = VERTICAL_DEFINITIONS.find((item) => item.key === definition.verticalKey)
      const verticalPoolCount = vertical
        ? await db.entities.count({
            where: {
              status: 'OPEN',
              OR: [{ businessStatus: null }, { businessStatus: { not: 'CLOSED_PERMANENTLY' } }],
              primaryVertical: { in: vertical.primaryVerticals },
            },
          })
        : 0

      const neighborhoodPoolCount = definition.sourceNeighborhoods.length
        ? await db.entities.count({
            where: {
              status: 'OPEN',
              OR: [{ businessStatus: null }, { businessStatus: { not: 'CLOSED_PERMANENTLY' } }],
              primaryVertical: { in: vertical?.primaryVerticals ?? [] },
              neighborhood: { in: definition.sourceNeighborhoods },
            },
          })
        : verticalPoolCount

      let reason: string | null = null
      if (entityIds.length === 0) {
        if (!vertical) reason = 'unknown_vertical_key'
        else if (verticalPoolCount === 0) reason = 'no_open_entities_in_vertical'
        else if (definition.sourceNeighborhoods.length > 0 && neighborhoodPoolCount === 0) {
          reason = 'no_vertical_entities_in_source_neighborhoods'
        } else {
          reason = 'no_entities_matched_selection_rules'
        }
      }

      return {
        slug: definition.slug,
        title: definition.title,
        scope: definition.scope,
        verticalKey: definition.verticalKey,
        sourceNeighborhoods: definition.sourceNeighborhoods.length,
        entityCount: entityIds.length,
        verticalPoolCount,
        neighborhoodPoolCount,
        reason,
      }
    })
  )
  return previews
}

export async function applyCollectionSync({ userId }: { userId: string }) {
  for (const definition of COLLECTION_DEFINITIONS) {
    const seed = getSeedRecord(definition)
    const entityIds = await resolveEntityIds(definition)

    const list = await db.lists.upsert({
      where: { slug: seed.slug },
      create: {
        id: randomUUID(),
        userId,
        title: seed.title,
        subtitle: seed.subtitle,
        slug: seed.slug,
        templateType: seed.templateType,
        published: true,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        updatedAt: new Date(),
        collectionScope: seed.scope,
        collectionVerticalKey: seed.verticalKey,
        collectionRegionKey: seed.regionKey,
        collectionNeighborhood: seed.neighborhood,
        collectionCity: seed.city,
        sortRank: seed.sortRank,
        isEditorialCollection: seed.isEditorialCollection,
        sourceNeighborhoods: seed.sourceNeighborhoods,
        maxEntities: seed.maxEntities,
      },
      update: {
        title: seed.title,
        subtitle: seed.subtitle,
        templateType: seed.templateType,
        published: true,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        updatedAt: new Date(),
        collectionScope: seed.scope,
        collectionVerticalKey: seed.verticalKey,
        collectionRegionKey: seed.regionKey,
        collectionNeighborhood: seed.neighborhood,
        collectionCity: seed.city,
        sortRank: seed.sortRank,
        isEditorialCollection: seed.isEditorialCollection,
        sourceNeighborhoods: seed.sourceNeighborhoods,
        maxEntities: seed.maxEntities,
      },
    })

    await db.map_places.deleteMany({
      where: {
        mapId: list.id,
        ...(entityIds.length > 0 ? { entityId: { notIn: entityIds } } : {}),
      },
    })

    for (let index = 0; index < entityIds.length; index += 1) {
      const entityId = entityIds[index]
      await db.map_places.upsert({
        where: {
          mapId_entityId: {
            mapId: list.id,
            entityId,
          },
        },
        create: {
          id: randomUUID(),
          mapId: list.id,
          entityId,
          orderIndex: index,
          updatedAt: new Date(),
        },
        update: {
          orderIndex: index,
          updatedAt: new Date(),
        },
      })
    }
  }
}
