#!/usr/bin/env node
/**
 * Promote golden_records → places. Only script allowed to write to places in this flow.
 * Rules: confidence >= threshold, lat/lng present. Requires --commit and --allow-places-write.
 * Default: dry-run.
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { categoryToPrimaryVertical } from '@/lib/primaryVertical'

const DEFAULT_CONFIDENCE_THRESHOLD = 0.7

function parseArgs(): {
  batchId: string | null
  commit: boolean
  allowPlacesWrite: boolean
  confidenceThreshold: number
} {
  const args = process.argv.slice(2)
  const batchIdx = args.indexOf('--batch')
  const batchId = batchIdx >= 0 ? args[batchIdx + 1] : null
  const commit = args.includes('--commit')
  const allowPlacesWrite = args.includes('--allow-places-write')
  const thresholdIdx = args.indexOf('--threshold')
  const confidenceThreshold =
    thresholdIdx >= 0 ? parseFloat(args[thresholdIdx + 1]) : DEFAULT_CONFIDENCE_THRESHOLD
  return { batchId, commit, allowPlacesWrite, confidenceThreshold }
}

async function main() {
  const { batchId, commit, allowPlacesWrite, confidenceThreshold } = parseArgs()

  if (!commit || !allowPlacesWrite) {
    console.log('Dry run (no writes). Use --commit and --allow-places-write to promote.')
  }

  const whereClause: any = {
    confidence: { gte: confidenceThreshold },
  }
  if (batchId) {
    whereClause.resolution_links = {
      some: {
        raw_record: { intake_batch_id: batchId },
      },
    }
  }

  const allCandidates = await db.golden_records.findMany({
    where: whereClause,
    select: {
      canonical_id: true,
      slug: true,
      name: true,
      lat: true,
      lng: true,
      address_street: true,
      neighborhood: true,
      category: true,
      phone: true,
      website: true,
      instagram_handle: true,
      hours_json: true,
      description: true,
      google_place_id: true,
      vibe_tags: true,
      confidence: true,
      promotion_status: true,
    },
  })

  const ALLOWED_PROMOTION = ['PENDING', 'VERIFIED', 'PUBLISHED']
  // Prisma doesn't support { not: null } on optional Decimal; promotion_status can be TEXT vs enum locally — filter in app
  const candidates = allCandidates.filter(
    (g) =>
      g.lat != null &&
      g.lng != null &&
      (ALLOWED_PROMOTION as string[]).includes(String(g.promotion_status ?? ''))
  )

  // Identity precedence: google_place_id > slug. Build maps and keep them updated so re-runs don't duplicate.
  const existingPlaces = await db.entities.findMany({
    select: { id: true, slug: true, googlePlaceId: true },
  })
  const placesByGpid = new Map<string, { id: string }>()
  const placesBySlug = new Map<string, { id: string }>()
  for (const p of existingPlaces) {
    if (p.slug) placesBySlug.set(p.slug, { id: p.id })
    if (p.googlePlaceId) placesByGpid.set(p.googlePlaceId, { id: p.id })
  }

  let wouldCreate = 0
  let wouldUpdate = 0
  let createdCount = 0
  let updatedCount = 0

  for (const g of candidates) {
    const slug = g.slug
    const gpid = g.google_place_id ?? ''
    const existingByGpid = gpid ? placesByGpid.get(gpid) : undefined
    const existingBySlug = placesBySlug.get(slug)
    const existing = existingByGpid ?? existingBySlug

    const payload = {
      slug,
      name: g.name,
      address: g.address_street,
      latitude: g.lat,
      longitude: g.lng,
      neighborhood: g.neighborhood,
      category: g.category,
      primary_vertical: categoryToPrimaryVertical(g.category) ?? 'EAT',
      phone: g.phone,
      website: g.website,
      instagram: g.instagram_handle,
      hours: g.hours_json as Prisma.JsonValue,
      description: g.description,
      googlePlaceId: g.google_place_id,
      vibeTags: g.vibe_tags ?? [],
      updatedAt: new Date(),
    }

    if (existing) {
      wouldUpdate++
      if (commit && allowPlacesWrite) {
        await db.entities.update({
          where: { id: existing.id },
          data: payload,
        })
        updatedCount++
        placesBySlug.set(slug, { id: existing.id })
        if (gpid) placesByGpid.set(gpid, { id: existing.id })
      }
    } else {
      wouldCreate++
      if (commit && allowPlacesWrite) {
        await db.entities.create({
          data: {
            id: g.canonical_id,
            ...payload,
          },
        })
        createdCount++
        placesBySlug.set(slug, { id: g.canonical_id })
        if (gpid) placesByGpid.set(gpid, { id: g.canonical_id })
      }
    }
  }

  console.log('Promote summary')
  console.log('  candidates (confidence >= %s, lat/lng present): %d', confidenceThreshold, candidates.length)
  console.log('  would_create: %d  would_update: %d', wouldCreate, wouldUpdate)
  if (commit && allowPlacesWrite) {
    console.log('  created: %d  updated: %d', createdCount, updatedCount)
  } else {
    console.log('  (dry-run: no places written)')
  }
}

main()
  .catch((e) => {
    console.error(e)
    const code = (e as { code?: string })?.code
    const msg = (e as Error)?.message ?? ''
    if (code === 'P2002') {
      console.error('\nRe-run promote. Existing place will be updated.')
    }
    if (code === 'P2022' || msg.includes('does not exist')) {
      console.error('\nCheck DB target (npm run db:whoami) and regenerate client (npm run db:generate).')
    }
    process.exit(1)
  })
  .finally(() => db.$disconnect())
