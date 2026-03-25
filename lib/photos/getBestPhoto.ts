import { db } from '@/lib/db'
import { getGooglePhotoUrl, getPhotoRefFromStored } from '@/lib/google-places'

const PHOTO_TYPE_RANKING: Record<string, number> = {
  INTERIOR: 0,
  FOOD: 1,
  BAR_DRINKS: 3,
  CROWD_ENERGY: 4,
  DETAIL: 5,
  EXTERIOR: 6,
}

type BestPhotoOptions = {
  preferredPhotoTypes?: string[]
}

function toGooglePhotoUrls(googlePhotos: unknown): string[] {
  if (!googlePhotos || !Array.isArray(googlePhotos)) return []

  const photosWithArea = googlePhotos
    .map((raw) => {
      const obj = raw as {
        width?: number
        height?: number
      }
      const width = typeof obj.width === 'number' ? obj.width : 0
      const height = typeof obj.height === 'number' ? obj.height : 0

      return {
        raw,
        area: width * height,
        hasSize: width > 0 && height > 0,
      }
    })
    .sort((a, b) => {
      if (a.hasSize !== b.hasSize) return a.hasSize ? -1 : 1
      return b.area - a.area
    })

  const urls: string[] = []
  for (const photo of photosWithArea) {
    const ref = getPhotoRefFromStored(photo.raw as Record<string, unknown>)
    if (!ref) continue

    try {
      urls.push(getGooglePhotoUrl(ref, 1200))
    } catch {
      // Skip malformed refs.
    }
  }

  return urls
}

function buildRanking(preferredPhotoTypes: string[] = []): Record<string, number> {
  if (preferredPhotoTypes.length === 0) return PHOTO_TYPE_RANKING

  const preferred = new Set(preferredPhotoTypes.map((value) => value.toUpperCase()))
  const ranking: Record<string, number> = {}

  let rank = 0
  for (const type of preferred) {
    ranking[type] = rank++
  }
  for (const [type, defaultRank] of Object.entries(PHOTO_TYPE_RANKING)) {
    if (ranking[type] === undefined) ranking[type] = defaultRank + preferred.size
  }

  return ranking
}

function isLikelyImageUrl(url: string): boolean {
  return /^https?:\/\//.test(url) && !url.includes('instagram.com/p/')
}

export async function getBestPhoto(entityId: string, options: BestPhotoOptions = {}): Promise<string | null> {
  const entity = await db.entities.findUnique({
    where: { id: entityId },
    select: {
      id: true,
      googlePhotos: true,
      instagram_accounts: {
        select: { instagramUserId: true },
        take: 1,
      },
    },
  })

  if (!entity) return null

  const instagramUserId = entity.instagram_accounts[0]?.instagramUserId

  if (instagramUserId) {
    const ranking = buildRanking(options.preferredPhotoTypes)
    const media = await db.instagram_media.findMany({
      where: { instagramUserId },
      select: { mediaUrl: true, permalink: true, photoType: true, timestamp: true },
      orderBy: { timestamp: 'desc' },
      take: 12,
    })

    const rankedMedia = media
      .sort((a, b) => {
        const rankA = a.photoType ? (ranking[a.photoType] ?? 999) : 999
        const rankB = b.photoType ? (ranking[b.photoType] ?? 999) : 999
        return rankA - rankB
      })
      .find((item) => item.mediaUrl && isLikelyImageUrl(item.mediaUrl))

    const instagramUrl = rankedMedia?.mediaUrl ?? null
    if (instagramUrl) return instagramUrl
  }

  const googlePhotoUrls = toGooglePhotoUrls(entity.googlePhotos)
  return googlePhotoUrls[0] ?? null
}
