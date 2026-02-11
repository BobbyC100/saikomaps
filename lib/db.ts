/**
 * Prisma Database Client
 * Singleton pattern to prevent multiple instances in development
 *
 * Aliases: db.list → db.lists, db.user → db.users (for backward compatibility)
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export const db = new Proxy(prisma, {
  get(target, prop: string) {
    if (prop === 'list') return target.lists
    if (prop === 'user') return target.users
    if (prop === 'mapPlace') return target.map_places
    if (prop === 'place') return target.places
    if (prop === 'location') return target.locations
    if (prop === 'importJob') return target.import_jobs
    if (prop === 'person') return target.people
    if (prop === 'restaurantGroup') return target.restaurant_groups
    return (target as unknown as Record<string, unknown>)[prop]
  },
}) as PrismaClient & {
  list: typeof prisma.lists
  user: typeof prisma.users
  mapPlace: typeof prisma.map_places
  place: typeof prisma.places
  location: typeof prisma.locations
  importJob: typeof prisma.import_jobs
  person: typeof prisma.people
  restaurantGroup: typeof prisma.restaurant_groups
}


