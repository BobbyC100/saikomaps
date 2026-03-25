import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { generateSlug } from '@/lib/utils'
import {
  ALLOWED_IMAGE_HOSTS,
  CARD_FALLBACK_IMAGES,
  FALLBACK_CARD_IMAGE,
  FEATURED_NEIGHBORHOOD_BACKUPS,
  FEATURED_COLLECTION_SLUGS,
  FEATURED_NEIGHBORHOODS,
  FEATURED_VERTICALS,
  IMAGE_OVERRIDES,
  NEIGHBORHOOD_WIKIMEDIA_IMAGES,
} from '@/lib/homepage/config'
import { isImageUrlReachable } from '@/lib/homepage/image-health'
import { getBestPhoto } from '@/lib/photos/getBestPhoto'

export type NeighborhoodCardData = {
  name: string
  count: number
  imageUrl: string
  href: string
}

export type CategoryCardData = {
  title: string
  description: string
  count: number
  imageUrl: string
  href: string
}

export type CollectionCardData = {
  title: string
  description: string
  count: number
  imageUrl: string
  href: string
}

export type HomepageData = {
  neighborhoods: NeighborhoodCardData[]
  categories: CategoryCardData[]
  collections: CollectionCardData[]
}

const DEBUG_HOMEPAGE_IMAGES = process.env.DEBUG_HOMEPAGE_IMAGES === '1'

const CATEGORY_PHOTO_PREFERENCES: Record<string, string[]> = {
  WINE: ['BAR_DRINKS', 'INTERIOR', 'DETAIL', 'FOOD'],
  COFFEE: ['INTERIOR', 'FOOD', 'DETAIL'],
  EAT: ['FOOD', 'INTERIOR', 'DETAIL'],
  DRINKS: ['BAR_DRINKS', 'CROWD_ENERGY', 'INTERIOR'],
  CULTURE: ['EXTERIOR', 'INTERIOR', 'DETAIL'],
  SHOP: ['INTERIOR', 'DETAIL', 'EXTERIOR'],
  ACTIVITY: ['EXTERIOR', 'CROWD_ENERGY', 'INTERIOR'],
  PARKS: ['EXTERIOR', 'CROWD_ENERGY', 'DETAIL'],
  STAY: ['INTERIOR', 'EXTERIOR', 'DETAIL'],
  NATURE: ['EXTERIOR', 'DETAIL'],
  BAKERY: ['INTERIOR', 'FOOD', 'DETAIL'],
}

const OPEN_ENTITY_FILTER: Prisma.entitiesWhereInput = {
  OR: [
    { businessStatus: null },
    { businessStatus: { not: 'CLOSED_PERMANENTLY' } },
  ],
}

type CandidateEntity = {
  id: string
  updatedAt: Date
  googlePhotoCount: number
  instagramUserId: string | null
}

type CardType = 'neighborhood' | 'category' | 'collection'

type ImageDecisionContext = {
  cardType: CardType
  cardKey: string
  cardLabel: string
  representativeEntityId: string | null
}

function debugImageLog(event: string, payload: Record<string, unknown>): void {
  if (!DEBUG_HOMEPAGE_IMAGES) return
  console.log(`[homepage-images] ${event}`, payload)
}

function isAllowedImageUrl(url: string): boolean {
  if (url.startsWith('/')) return true

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    if (ALLOWED_IMAGE_HOSTS.has(hostname)) return true
    if (hostname.endsWith('.cdninstagram.com')) return true
    if (hostname.endsWith('.googleusercontent.com')) return true

    return false
  } catch {
    return false
  }
}

function toSafeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return isAllowedImageUrl(url) ? url : null
}

function isLocalImagePath(url: string): boolean {
  return url.startsWith('/')
}

function isWikimediaUrl(url: string): boolean {
  try {
    return new URL(url).hostname === 'upload.wikimedia.org'
  } catch {
    return false
  }
}

async function isUsableImageUrl(url: string): Promise<boolean> {
  if (isLocalImagePath(url)) return true
  return isImageUrlReachable(url)
}

async function getCandidateEntities(
  where: Prisma.entitiesWhereInput,
  take = 24
): Promise<CandidateEntity[]> {
  const candidates = await (async () => {
    try {
      return await db.entities.findMany({
        where,
        select: {
          id: true,
          updatedAt: true,
          googlePhotos: true,
          instagram_accounts: {
            select: { instagramUserId: true },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take,
      })
    } catch {
      // Local DBs may not have Instagram tables yet.
      return db.entities.findMany({
        where,
        select: {
          id: true,
          updatedAt: true,
          googlePhotos: true,
        },
        orderBy: { updatedAt: 'desc' },
        take,
      })
    }
  })()

  return candidates.map((entity) => ({
    id: entity.id,
    updatedAt: entity.updatedAt,
    googlePhotoCount: Array.isArray(entity.googlePhotos) ? entity.googlePhotos.length : 0,
    instagramUserId:
      'instagram_accounts' in entity && Array.isArray(entity.instagram_accounts)
        ? entity.instagram_accounts[0]?.instagramUserId ?? null
        : null,
  }))
}

async function scoreCandidates(
  candidates: CandidateEntity[],
  preferredPhotoTypes: string[]
): Promise<CandidateEntity[]> {
  const instagramIds = candidates.map((c) => c.instagramUserId).filter((id): id is string => Boolean(id))

  const [totalMediaRows, preferredMediaRows] = await Promise.all([
    instagramIds.length > 0
      ? db.instagram_media
          .groupBy({
            by: ['instagramUserId'],
            where: { instagramUserId: { in: instagramIds } },
            _count: { id: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
    instagramIds.length > 0 && preferredPhotoTypes.length > 0
      ? db.instagram_media
          .groupBy({
            by: ['instagramUserId'],
            where: {
              instagramUserId: { in: instagramIds },
              photoType: { in: preferredPhotoTypes },
            },
            _count: { id: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ])

  const totalByInstagram = new Map(totalMediaRows.map((row) => [row.instagramUserId, row._count.id]))
  const preferredByInstagram = new Map(preferredMediaRows.map((row) => [row.instagramUserId, row._count.id]))

  return [...candidates].sort((a, b) => {
    const aTotal = a.instagramUserId ? (totalByInstagram.get(a.instagramUserId) ?? 0) : 0
    const bTotal = b.instagramUserId ? (totalByInstagram.get(b.instagramUserId) ?? 0) : 0
    const aPreferred = a.instagramUserId ? (preferredByInstagram.get(a.instagramUserId) ?? 0) : 0
    const bPreferred = b.instagramUserId ? (preferredByInstagram.get(b.instagramUserId) ?? 0) : 0

    const scoreA =
      Math.min(aPreferred, 8) * 6 + Math.min(aTotal, 12) * 2 + Math.min(a.googlePhotoCount, 10) * 1.5
    const scoreB =
      Math.min(bPreferred, 8) * 6 + Math.min(bTotal, 12) * 2 + Math.min(b.googlePhotoCount, 10) * 1.5

    if (scoreA !== scoreB) return scoreB - scoreA
    return b.updatedAt.getTime() - a.updatedAt.getTime()
  })
}

async function chooseRepresentativeEntityId(
  where: Prisma.entitiesWhereInput,
  preferredPhotoTypes: string[],
  usedEntityIds: Set<string>,
  contextLabel: string
): Promise<string | null> {
  const candidates = await getCandidateEntities(where)
  const ranked = await scoreCandidates(candidates, preferredPhotoTypes)

  for (const candidate of ranked) {
    if (usedEntityIds.has(candidate.id)) continue
    debugImageLog('representative_entity_selected', {
      contextLabel,
      selectedEntityId: candidate.id,
      candidateCount: ranked.length,
      duplicateAvoidanceApplied: usedEntityIds.size > 0,
      preferredPhotoTypes,
      topCandidateIds: ranked.slice(0, 5).map((row) => row.id),
    })
    return candidate.id
  }

  const fallbackEntityId = ranked[0]?.id ?? null
  debugImageLog('representative_entity_selected', {
    contextLabel,
    selectedEntityId: fallbackEntityId,
    candidateCount: ranked.length,
    duplicateAvoidanceApplied: true,
    preferredPhotoTypes,
    topCandidateIds: ranked.slice(0, 5).map((row) => row.id),
    reason: 'all candidates already used; falling back to top-ranked',
  })
  return fallbackEntityId
}

async function resolveCardImage(
  overrideKey: string,
  representativeEntityId: string | null,
  fallbackImage?: string | null,
  preferredPhotoTypes: string[] = [],
  context?: ImageDecisionContext
): Promise<string> {
  const attempts: Array<{ source: string; url: string | null; usable: boolean; reason?: string }> = []

  const finalize = (imageUrl: string, selectedSource: string, fallbackReason?: string): string => {
    if (context) {
      debugImageLog('card_image_decision', {
        cardType: context.cardType,
        cardKey: context.cardKey,
        cardLabel: context.cardLabel,
        representativeEntityId: context.representativeEntityId,
        selectedSource,
        selectedUrl: imageUrl,
        fallbackReason: fallbackReason ?? null,
        preferredPhotoTypes,
        attempts,
      })
    }
    return imageUrl
  }

  const overridden = toSafeImageUrl(IMAGE_OVERRIDES[overrideKey])
  if (overridden) {
    const usable = isWikimediaUrl(overridden) ? true : await isUsableImageUrl(overridden)
    attempts.push({ source: 'override', url: overridden, usable })
    if (usable) return finalize(overridden, 'override')
  } else {
    attempts.push({ source: 'override', url: null, usable: false, reason: 'no override configured' })
  }

  if (representativeEntityId) {
    const photo = await getBestPhoto(representativeEntityId, { preferredPhotoTypes })
    const safePhoto = toSafeImageUrl(photo)
    if (safePhoto) {
      const usable = await isUsableImageUrl(safePhoto)
      attempts.push({ source: 'representative_entity', url: safePhoto, usable })
      if (usable) return finalize(safePhoto, 'representative_entity')
    } else {
      attempts.push({
        source: 'representative_entity',
        url: photo ?? null,
        usable: false,
        reason: 'image missing or disallowed host',
      })
    }
  } else {
    attempts.push({ source: 'representative_entity', url: null, usable: false, reason: 'no representative entity' })
  }

  const safeFallback = toSafeImageUrl(fallbackImage)
  if (safeFallback) {
    const usable = await isUsableImageUrl(safeFallback)
    attempts.push({ source: 'content_fallback', url: safeFallback, usable })
    if (usable) return finalize(safeFallback, 'content_fallback')
  } else {
    attempts.push({ source: 'content_fallback', url: fallbackImage ?? null, usable: false, reason: 'no safe fallback image' })
  }

  const perCardFallback = toSafeImageUrl(CARD_FALLBACK_IMAGES[overrideKey])
  if (perCardFallback) {
    const usable = await isUsableImageUrl(perCardFallback)
    attempts.push({ source: 'card_fallback', url: perCardFallback, usable })
    if (usable) return finalize(perCardFallback, 'card_fallback')
  } else {
    attempts.push({ source: 'card_fallback', url: null, usable: false, reason: 'no per-card fallback configured' })
  }

  attempts.push({ source: 'global_fallback', url: FALLBACK_CARD_IMAGE, usable: true })
  return finalize(FALLBACK_CARD_IMAGE, 'global_fallback', 'all upstream sources unusable')
}

async function resolveGeoCardImage(
  geoImageUrl: string | null,
  overrideKey: string,
  representativeEntityId: string | null,
  context?: ImageDecisionContext
): Promise<string> {
  const attempts: Array<{ source: string; url: string | null; usable: boolean; reason?: string }> = []

  const finalize = (imageUrl: string, selectedSource: string, fallbackReason?: string): string => {
    if (context) {
      debugImageLog('card_image_decision', {
        cardType: context.cardType,
        cardKey: context.cardKey,
        cardLabel: context.cardLabel,
        representativeEntityId: context.representativeEntityId,
        pipeline: 'geo',
        selectedSource,
        selectedUrl: imageUrl,
        fallbackReason: fallbackReason ?? null,
        attempts,
      })
    }
    return imageUrl
  }

  const safeGeo = toSafeImageUrl(geoImageUrl)
  if (safeGeo) {
    // Curated Wikimedia geo URLs are treated as trusted to avoid
    // transient 429 rate-limit checks blanking neighborhood imagery.
    const usable = isWikimediaUrl(safeGeo) ? true : await isUsableImageUrl(safeGeo)
    attempts.push({ source: 'wikimedia', url: safeGeo, usable })
    if (usable) return finalize(safeGeo, 'wikimedia')
  } else {
    attempts.push({ source: 'wikimedia', url: geoImageUrl, usable: false, reason: 'no curated wikimedia image' })
  }

  const override = toSafeImageUrl(IMAGE_OVERRIDES[overrideKey])
  if (override) {
    const usable = await isUsableImageUrl(override)
    attempts.push({ source: 'override', url: override, usable })
    if (usable) return finalize(override, 'override')
  } else {
    attempts.push({ source: 'override', url: null, usable: false, reason: 'no override configured' })
  }

  if (representativeEntityId) {
    const photo = await getBestPhoto(representativeEntityId, { preferredPhotoTypes: [] })
    const safePhoto = toSafeImageUrl(photo)
    if (safePhoto) {
      const usable = await isUsableImageUrl(safePhoto)
      attempts.push({ source: 'representative_entity', url: safePhoto, usable })
      if (usable) return finalize(safePhoto, 'representative_entity')
    } else {
      attempts.push({
        source: 'representative_entity',
        url: photo ?? null,
        usable: false,
        reason: 'image missing or disallowed host',
      })
    }
  } else {
    attempts.push({ source: 'representative_entity', url: null, usable: false, reason: 'no representative entity' })
  }

  const perCardFallback = toSafeImageUrl(CARD_FALLBACK_IMAGES[overrideKey])
  if (perCardFallback) {
    const usable = await isUsableImageUrl(perCardFallback)
    attempts.push({ source: 'card_fallback', url: perCardFallback, usable })
    if (usable) return finalize(perCardFallback, 'card_fallback')
  } else {
    attempts.push({ source: 'card_fallback', url: null, usable: false, reason: 'no per-card fallback configured' })
  }

  attempts.push({ source: 'global_fallback', url: FALLBACK_CARD_IMAGE, usable: true })
  return finalize(FALLBACK_CARD_IMAGE, 'global_fallback', 'all upstream geo sources unusable')
}

export async function getNeighborhoods(usedEntityIds: Set<string> = new Set()): Promise<NeighborhoodCardData[]> {
  const curatedCandidates = [...FEATURED_NEIGHBORHOODS, ...FEATURED_NEIGHBORHOOD_BACKUPS]

  const counts = await db.entities.groupBy({
    by: ['neighborhood'],
    where: {
      neighborhood: { in: curatedCandidates },
      ...OPEN_ENTITY_FILTER,
    },
    _count: { id: true },
  })

  const countByNeighborhood = new Map(
    counts
      .filter((row) => typeof row.neighborhood === 'string')
      .map((row) => [row.neighborhood as string, row._count.id])
  )

  const primaryWithCount = FEATURED_NEIGHBORHOODS.filter((name) => (countByNeighborhood.get(name) ?? 0) > 0)
  const backupsWithCount = FEATURED_NEIGHBORHOOD_BACKUPS.filter(
    (name) => (countByNeighborhood.get(name) ?? 0) > 0 && !primaryWithCount.includes(name as (typeof FEATURED_NEIGHBORHOODS)[number])
  )
  const selectedNames = [...primaryWithCount, ...backupsWithCount].slice(0, 4)

  const neighborhoods = await Promise.all(
    selectedNames.map(async (name) => {
      const representativeEntityId = await chooseRepresentativeEntityId(
        {
          neighborhood: name,
          ...OPEN_ENTITY_FILTER,
        },
        [],
        usedEntityIds,
        `neighborhood:${name}`
      )
      if (representativeEntityId) usedEntityIds.add(representativeEntityId)

      const slug = generateSlug(name)
      const imageUrl = await resolveGeoCardImage(NEIGHBORHOOD_WIKIMEDIA_IMAGES[slug] ?? null, slug, representativeEntityId, {
        cardType: 'neighborhood',
        cardKey: slug,
        cardLabel: name,
        representativeEntityId,
      })
      const count = countByNeighborhood.get(name) ?? 0

      return {
        name,
        count,
        imageUrl,
        href: `/explore?neighborhood=${slug}`,
      }
    })
  )

  return neighborhoods
}

export async function getCategories(usedEntityIds: Set<string> = new Set()): Promise<CategoryCardData[]> {
  const counts = await db.entities.groupBy({
    by: ['primaryVertical'],
    where: {
      ...OPEN_ENTITY_FILTER,
    },
    _count: { id: true },
  })

  const countByVertical = new Map(counts.map((row) => [row.primaryVertical, row._count.id]))
  const featuredNonZero = FEATURED_VERTICALS.filter((item) => (countByVertical.get(item.vertical) ?? 0) > 0)

  const used = new Set(featuredNonZero.map((item) => item.vertical))
  const fallbackVerticals = counts
    .filter((row) => row._count.id > 0 && !used.has(row.primaryVertical))
    .sort((a, b) => b._count.id - a._count.id)
    .slice(0, Math.max(0, 4 - featuredNonZero.length))
    .map((row) => ({
      vertical: row.primaryVertical,
      label: row.primaryVertical
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase()),
      description: 'Curated places from this vertical',
    }))

  const selectedVerticals = [...featuredNonZero, ...fallbackVerticals].slice(0, 4).map((item) => ({
    source: 'vertical' as const,
    key: `vertical-${item.vertical.toLowerCase()}`,
    vertical: item.vertical,
    label: item.label,
    description: item.description,
    count: countByVertical.get(item.vertical) ?? 0,
  }))

  const slotsRemaining = Math.max(0, 4 - selectedVerticals.length)
  let categoryFallbacks: Array<{
    source: 'category'
    key: string
    category: string
    label: string
    description: string
    count: number
  }> = []

  if (slotsRemaining > 0) {
    const categoryRows = await db.entities.groupBy({
      by: ['category'],
      where: {
        ...OPEN_ENTITY_FILTER,
        category: { not: null },
      },
      _count: { id: true },
    })

    const usedLabels = new Set(selectedVerticals.map((item) => item.label.toLowerCase()))
    categoryFallbacks = categoryRows
      .filter((row) => typeof row.category === 'string' && row.category.trim().length > 0 && row._count.id > 0)
      .sort((a, b) => b._count.id - a._count.id)
      .filter((row) => !usedLabels.has((row.category as string).trim().toLowerCase()))
      .slice(0, slotsRemaining)
      .map((row) => {
        const category = (row.category as string).trim()
        return {
          source: 'category' as const,
          key: `category-${generateSlug(category)}`,
          category,
          label: category
            .toLowerCase()
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase()),
          description: 'Curated places from this category',
          count: row._count.id,
        }
      })
  }

  const selectedCategories = [...selectedVerticals, ...categoryFallbacks].slice(0, 4)

  return Promise.all(
    selectedCategories.map(async (item) => {
      const preferredPhotoTypes =
        item.source === 'vertical'
          ? CATEGORY_PHOTO_PREFERENCES[item.vertical] ?? ['INTERIOR', 'EXTERIOR', 'DETAIL']
          : ['INTERIOR', 'EXTERIOR', 'DETAIL', 'FOOD', 'BAR_DRINKS', 'CROWD_ENERGY']
      const representativeEntityId =
        item.source === 'vertical'
          ? await chooseRepresentativeEntityId(
              {
                primaryVertical: item.vertical,
                ...OPEN_ENTITY_FILTER,
              },
              preferredPhotoTypes,
              usedEntityIds,
              `category:vertical:${item.vertical}`
            )
          : await chooseRepresentativeEntityId(
              {
                category: item.category,
                ...OPEN_ENTITY_FILTER,
              },
              [],
              usedEntityIds,
              `category:category:${item.category}`
            )
      if (representativeEntityId) usedEntityIds.add(representativeEntityId)

      const imageUrl = await resolveCardImage(
        item.key,
        representativeEntityId,
        undefined,
        preferredPhotoTypes,
        {
          cardType: 'category',
          cardKey: item.key,
          cardLabel: item.label,
          representativeEntityId,
        }
      )

      return {
        title: item.label,
        description: item.description,
        count: item.count,
        imageUrl,
        href: `/explore?category=${generateSlug(item.label)}`,
      }
    })
  )
}

export async function getCollections(usedEntityIds: Set<string> = new Set()): Promise<CollectionCardData[]> {
  const hasCuratedSlugs = FEATURED_COLLECTION_SLUGS.length > 0

  const lists = await db.lists.findMany({
    where: {
      published: true,
      ...(hasCuratedSlugs ? { slug: { in: FEATURED_COLLECTION_SLUGS } } : {}),
    },
    select: {
      slug: true,
      title: true,
      subtitle: true,
      description: true,
      coverImageUrl: true,
      _count: { select: { map_places: true } },
      map_places: {
        select: { entityId: true },
        orderBy: { orderIndex: 'asc' },
        take: 12,
      },
    },
    orderBy: hasCuratedSlugs ? { updatedAt: 'desc' } : { publishedAt: 'desc' },
    take: hasCuratedSlugs ? FEATURED_COLLECTION_SLUGS.length : 4,
  })

  const ordered = hasCuratedSlugs
    ? FEATURED_COLLECTION_SLUGS
        .map((slug) => lists.find((list) => list.slug === slug))
        .filter((list): list is (typeof lists)[number] => Boolean(list))
    : lists

  const cards = await Promise.all(
    ordered.slice(0, 4).map(async (list) => {
      const representativeEntityId =
        list.map_places.find((row) => !usedEntityIds.has(row.entityId))?.entityId ??
        list.map_places[0]?.entityId ??
        null
      if (representativeEntityId) usedEntityIds.add(representativeEntityId)

      const imageUrl = await resolveCardImage(list.slug, representativeEntityId, list.coverImageUrl, [], {
        cardType: 'collection',
        cardKey: list.slug,
        cardLabel: list.title,
        representativeEntityId,
      })

      return {
        title: list.title,
        description: list.subtitle ?? list.description ?? '',
        count: list._count.map_places,
        imageUrl,
        href: `/map/${list.slug}`,
      }
    })
  )

  return cards
}

export async function getHomepageData(): Promise<HomepageData> {
  const usedEntityIds = new Set<string>()

  const neighborhoods = await getNeighborhoods(usedEntityIds)
  const categories = await getCategories(usedEntityIds)
  const collections = await getCollections(usedEntityIds)

  return {
    neighborhoods,
    categories,
    collections,
  }
}
