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

  const existingSlugs = new Set(
    (await db.places.findMany({ select: { slug: true } })).map((p) => p.slug)
  )
  let promotedCount = 0
  let skippedCount = 0

  for (const g of candidates) {
    const slug = g.slug
    const existing = existingSlugs.has(slug)
    if (existing) {
      skippedCount++
      continue
    }
    if (commit && allowPlacesWrite) {
      await db.places.create({
        data: {
          id: g.canonical_id,
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
        },
      })
      existingSlugs.add(slug)
      promotedCount++
    } else {
      promotedCount++
    }
  }

  console.log('Promote summary')
  console.log('  candidates (confidence >= %s, lat/lng present): %d', confidenceThreshold, candidates.length)
  console.log('  would_promote (new places): %d', promotedCount)
  console.log('  skipped (slug already in places): %d', skippedCount)
  if (commit && allowPlacesWrite) {
    console.log('  promoted_count: %d', promotedCount)
  } else {
    console.log('  (dry-run: no places written)')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
