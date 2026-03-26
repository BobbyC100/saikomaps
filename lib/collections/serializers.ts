import type { lists, users } from '@prisma/client'

type ListWithCountsAndUser = lists & {
  _count: { map_places: number }
  users: Pick<users, 'name' | 'email'>
}

export function toExploreCard(list: ListWithCountsAndUser) {
  return {
    id: list.id,
    slug: list.slug,
    title: list.title,
    tagline: list.subtitle ?? list.description ?? undefined,
    placeCount: list._count.map_places,
    creatorName: list.users.name || list.users.email.split('@')[0],
    isCuratorPick: (list.sortRank ?? 9999) <= 12,
    coverImageUrl: list.coverImageUrl ?? undefined,
    updatedAt: list.updatedAt,
  }
}
