#!/usr/bin/env node
/**
 * Import a curated CSV into golden_records (not places).
 * Identity: google_place_id > slug. Manual curation — no confidence threshold.
 * After import, run sync:places and backfill:confidence.
 *
 * Usage:
 *   --file "data/input/Echo Park.csv" (required)
 *   --batch "curated-echo-park-YYYY-MM-DD" (required)
 *   --apply (optional; default dry run)
 *   --source manual_bobby (optional)
 *   --verbose (optional; log one line per row)
 */

import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'papaparse'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { slugForMatch } from '@/lib/intake-normalize'
import { ensureUniqueSlug } from '@/lib/place-slug'

const DEFAULT_SOURCE = 'manual_bobby'

type Row = {
  name: string
  google_place_id: string | null
  url: string | null
  neighborhood: string | null
  category: string | null
  website: string | null
  latitude: number | null
  longitude: number | null
}

/**
 * Extract Google Place ID from common Google Maps URL patterns.
 * Returns null if url is empty, contains cid= (cannot map to GPID), or no pattern matches.
 */
function extractPlaceIdFromUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  if (!s) return null
  if (/[?&]cid=/.test(s)) return null
  const m1 = s.match(/[?&]place_id=(ChI[a-zA-Z0-9_-]+)/)
  if (m1?.[1]) return m1[1]
  const m2 = s.match(/[?&]q=place_id:(ChI[a-zA-Z0-9_-]+)/)
  if (m2?.[1]) return m2[1]
  return null
}

function hasCidInUrl(raw: string | null | undefined): boolean {
  if (!raw) return false
  return /[?&]cid=/.test(String(raw).trim())
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
}

function parseRow(raw: Record<string, string>): Row | null {
  const get = (keys: string[]): string | null => {
    for (const k of keys) {
      const v = raw[k]
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
    }
    return null
  }
  const name = get(['name', 'title'])
  if (!name) return null
  const latStr = get(['latitude', 'lat'])
  const lngStr = get(['longitude', 'lng'])
  let latitude: number | null = null
  let longitude: number | null = null
  if (latStr != null) latitude = parseFloat(latStr)
  if (lngStr != null) longitude = parseFloat(lngStr)
  if (latStr != null && isNaN(latitude)) latitude = null
  if (lngStr != null && isNaN(longitude)) longitude = null
  const url =
    get(['url', 'google_maps_url', 'googlemapsurl', 'maps_url', 'mapsurl']) ?? null
  return {
    name,
    google_place_id: get(['google_place_id', 'googleplaceid', 'gpid']) ?? null,
    url,
    neighborhood: get(['neighborhood', 'neighbourhood']) ?? null,
    category: get(['category']) ?? null,
    website: get(['website']) ?? null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  }
}

function parseArgs(): {
  file: string
  batch: string
  apply: boolean
  source: string
  verbose: boolean
} {
  const args = process.argv.slice(2)
  const fileIdx = args.indexOf('--file')
  const batchIdx = args.indexOf('--batch')
  const file = fileIdx >= 0 ? args[fileIdx + 1] : ''
  const batch = batchIdx >= 0 ? args[batchIdx + 1] : ''
  if (!file || !batch) {
    console.error('Usage: import-curated-csv-to-golden.ts --file <path> --batch <id> [--apply] [--source manual_bobby] [--verbose]')
    process.exit(1)
  }
  return {
    file,
    batch,
    apply: args.includes('--apply'),
    source: (args.includes('--source') ? args[args.indexOf('--source') + 1] : DEFAULT_SOURCE) || DEFAULT_SOURCE,
    verbose: args.includes('--verbose'),
  }
}

function buildProvenance(sourceName: string, batchId: string): Prisma.JsonValue {
  const now = new Date().toISOString()
  return {
    source_name: sourceName,
    intake_batch_id: batchId,
    imported_at: now,
  }
}

async function main() {
  const { file, batch, apply, source, verbose } = parseArgs()
  const resolvedPath = path.resolve(process.cwd(), file)
  if (!fs.existsSync(resolvedPath)) {
    console.error('File not found:', resolvedPath)
    process.exit(1)
  }

  const csvContent = fs.readFileSync(resolvedPath, 'utf-8')
  const parsed = parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => normalizeHeader(h),
  })
  if (parsed.errors.length > 0) {
    console.error('CSV errors:', parsed.errors)
    process.exit(1)
  }

  const rows: Row[] = []
  for (const raw of parsed.data) {
    const r = parseRow(raw as Record<string, string>)
    if (r) rows.push(r)
  }
  console.log(`Import curated CSV → golden_records (source=${source}, batch=${batch})`)
  console.log(`  File: ${resolvedPath}`)
  console.log(`  Rows: ${rows.length}`)
  console.log(`  Mode: ${apply ? 'APPLY' : 'dry run'}\n`)

  const provenance = buildProvenance(source, batch)
  const now = new Date()
  let wouldCreate = 0
  let wouldUpdate = 0
  let created = 0
  let updated = 0
  let rowsWithGpidFromUrl = 0
  const noGpidInUrlFailures: { name: string; url: string }[] = []

  const slugExists = async (slug: string): Promise<boolean> => {
    const existing = await db.golden_records.findUnique({ where: { slug }, select: { canonical_id: true } })
    return !!existing
  }

  for (const row of rows) {
    let gpid = row.google_place_id?.trim() || null
    if (!gpid && row.url) {
      if (hasCidInUrl(row.url)) {
        if (verbose) console.log('  cid present, cannot map to gpid:', row.name)
      } else {
        const fromUrl = extractPlaceIdFromUrl(row.url)
        if (fromUrl) {
          gpid = fromUrl
          rowsWithGpidFromUrl++
        } else if (noGpidInUrlFailures.length < 5) {
          noGpidInUrlFailures.push({ name: row.name, url: row.url })
        }
      }
    }
    let baseSlug = slugForMatch(row.name) || row.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (!baseSlug) baseSlug = crypto.randomUUID().slice(0, 8)
    baseSlug = baseSlug.slice(0, 80)

    let existing: { canonical_id: string } | null = null
    if (gpid) {
      const byGpid = await db.golden_records.findFirst({
        where: { google_place_id: gpid },
        select: { canonical_id: true },
      })
      existing = byGpid
    }
    if (!existing) {
      const bySlug = await db.golden_records.findUnique({
        where: { slug: baseSlug },
        select: { canonical_id: true },
      })
      existing = bySlug
    }
    const slug = existing ? baseSlug : await ensureUniqueSlug(baseSlug, slugExists)

    const hasCoords = row.latitude != null && row.longitude != null
    const lat = hasCoords ? new Prisma.Decimal(row.latitude!) : undefined
    const lng = hasCoords ? new Prisma.Decimal(row.longitude!) : undefined

    if (existing) {
      wouldUpdate++
      const updateData: Prisma.golden_recordsUpdateInput = {
        updated_at: now,
        source_attribution: provenance,
        provenance_v2: provenance,
      }
      if (row.name) updateData.name = row.name
      if (row.neighborhood !== null) updateData.neighborhood = row.neighborhood
      if (row.category !== null) updateData.category = row.category
      if (row.website !== null) updateData.website = row.website
      if (row.latitude != null && row.longitude != null) {
        updateData.lat = new Prisma.Decimal(row.latitude)
        updateData.lng = new Prisma.Decimal(row.longitude)
      }
      if (gpid) updateData.google_place_id = gpid

      if (apply) {
        try {
          await db.golden_records.update({
            where: { canonical_id: existing.canonical_id },
            data: updateData,
          })
          updated++
          if (verbose) console.log(`  updated ${row.name} (${existing.canonical_id})`)
        } catch (e: unknown) {
          if ((e as { code?: string })?.code === 'P2002') {
            const refetched = await db.golden_records.findFirst({
              where: { google_place_id: gpid ?? undefined },
              select: { canonical_id: true },
            })
            if (refetched) {
              await db.golden_records.update({
                where: { canonical_id: refetched.canonical_id },
                data: updateData,
              })
              updated++
              if (verbose) console.log(`  updated (after P2002) ${row.name}`)
            }
          } else throw e
        }
      }
    } else {
      wouldCreate++
      const createData: Prisma.golden_recordsCreateInput = {
        canonical_id: crypto.randomUUID(),
        slug,
        name: row.name,
        ...(lat != null && lng != null && { lat, lng }),
        neighborhood: row.neighborhood ?? undefined,
        category: row.category ?? undefined,
        website: row.website ?? undefined,
        google_place_id: gpid ?? undefined,
        county: 'Los Angeles',
        source_attribution: provenance,
        provenance_v2: provenance,
        lifecycle_status: 'ACTIVE',
        cuisines: [],
        vibe_tags: [],
        signature_dishes: [],
        pro_tips: [],
        confidence: row.latitude != null && row.longitude != null ? 0.8 : 0.5,
        promotion_status: 'PENDING',
      }
      if (apply) {
        try {
          await db.golden_records.create({ data: createData })
          created++
          if (verbose) console.log(`  created ${row.name} (${slug})`)
        } catch (e: unknown) {
          if ((e as { code?: string })?.code === 'P2002') {
            const byGpid = gpid
              ? await db.golden_records.findFirst({
                  where: { google_place_id: gpid },
                  select: { canonical_id: true },
                })
              : null
            const bySlug = await db.golden_records.findUnique({
              where: { slug },
              select: { canonical_id: true },
            })
            const existingId = byGpid?.canonical_id ?? bySlug?.canonical_id
            if (existingId) {
              await db.golden_records.update({
                where: { canonical_id: existingId },
                data: {
                  name: row.name,
                  ...(lat != null && lng != null && { lat, lng }),
                  neighborhood: row.neighborhood ?? undefined,
                  category: row.category ?? undefined,
                  website: row.website ?? undefined,
                  google_place_id: gpid ?? undefined,
                  county: 'Los Angeles',
                  source_attribution: provenance,
                  provenance_v2: provenance,
                  updated_at: now,
                },
              })
              updated++
              if (verbose) console.log(`  updated (after P2002) ${row.name}`)
            } else throw e
          } else throw e
        }
      }
    }
  }

  console.log('\nSummary')
  console.log('  would_create:', wouldCreate, '  would_update:', wouldUpdate)
  console.log('  rows_with_gpid_from_url:', rowsWithGpidFromUrl)
  if (noGpidInUrlFailures.length > 0) {
    console.log('  no_gpid_in_url (first', Math.min(5, noGpidInUrlFailures.length), '):')
    for (const f of noGpidInUrlFailures) {
      console.log('    no_gpid_in_url:', f.name + ',', f.url)
    }
  }
  if (apply) {
    console.log('  created:', created, '  updated:', updated)
  } else {
    console.log('  (dry run; use --apply to write)')
  }
  console.log('\nNext: ./scripts/db-neon.sh npm run sync:places && ./scripts/db-neon.sh npm run backfill:confidence')
}

main()
  .catch((e) => {
    console.error(e)
    const code = (e as { code?: string })?.code
    if (code === 'P2002') console.error('\nRe-run import. Existing record will be updated.')
    if (code === 'P2022') console.error('\nCheck DB target (npm run db:whoami) and regenerate client (npm run db:generate).')
    process.exit(1)
  })
  .finally(() => db.$disconnect())
