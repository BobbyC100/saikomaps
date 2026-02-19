#!/usr/bin/env node
/**
 * Deterministic resolver: raw_records (by batch) → resolution_links + golden_records.
 * Matching order: 1) exact normalized name, 2) slug match, 3) fuzzy (configurable).
 * Outputs: matched_existing.csv, created_new.csv, ambiguous.csv.
 * No direct writes to places.
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { unparse } from 'papaparse'
import * as fs from 'fs'
import * as path from 'path'
import { normalizeNameForMatch, slugForMatch } from '@/lib/intake-normalize'
import { db } from '@/lib/db'

const RESOLVER_VERSION = 'golden-first-v1'
const FUZZY_THRESHOLD = 0.85 // configurable

function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1
  if (!s1 || !s2) return 0
  const a = s1.toLowerCase()
  const b = s2.toLowerCase()
  if (a === b) return 1
  const len1 = a.length
  const len2 = b.length
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1
  let matches = 0
  const aMatch = new Array(len1).fill(false)
  const bMatch = new Array(len2).fill(false)
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow)
    const end = Math.min(i + matchWindow + 1, len2)
    for (let j = start; j < end; j++) {
      if (bMatch[j] || a[i] !== b[j]) continue
      aMatch[i] = true
      bMatch[j] = true
      matches++
      break
    }
  }
  if (matches === 0) return 0
  let transpositions = 0
  let k = 0
  for (let i = 0; i < len1; i++) {
    if (!aMatch[i]) continue
    while (!bMatch[k]) k++
    if (a[i] !== b[k]) transpositions++
    k++
  }
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
  let prefix = 0
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (a[i] === b[i]) prefix++
    else break
  }
  return jaro + prefix * 0.1 * (1 - jaro)
}

function parseArgs(): { batchId: string } {
  const args = process.argv.slice(2)
  const batchIdx = args.indexOf('--batch')
  const batchId = batchIdx >= 0 ? args[batchIdx + 1] : undefined
  if (!batchId) {
    console.error('Usage: resolve-golden-first.ts --batch <id>')
    process.exit(1)
  }
  return { batchId }
}

async function ensureUniqueGoldenSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug.slice(0, 80)
  let n = 2
  while (true) {
    const exists = await db.golden_records.findUnique({ where: { slug }, select: { canonical_id: true } })
    if (!exists) return slug
    slug = `${baseSlug.slice(0, 76)}-${n}`
    n++
  }
}

async function main() {
  const { batchId } = parseArgs()
  const prisma = db

  const rawRecords = await prisma.raw_records.findMany({
    where: { intake_batch_id: batchId },
    orderBy: { ingested_at: 'asc' },
  })
  if (rawRecords.length === 0) {
    console.log('No raw records for batch:', batchId)
    process.exit(0)
  }

  type GoldenRef = { canonical_id: string; name: string; slug: string }
  const goldens: GoldenRef[] = await prisma.golden_records.findMany({
    where: { promotion_status: { in: ['PENDING', 'VERIFIED', 'PUBLISHED'] } },
    select: { canonical_id: true, name: true, slug: true },
  })
  const byNormalizedName = new Map<string, GoldenRef[]>()
  const bySlug = new Map<string, GoldenRef>()
  for (const g of goldens) {
    const norm = normalizeNameForMatch(g.name)
    if (!byNormalizedName.has(norm)) byNormalizedName.set(norm, [])
    byNormalizedName.get(norm)!.push(g)
    bySlug.set(g.slug.toLowerCase(), g)
  }
  function registerGolden(g: GoldenRef) {
    goldens.push(g)
    const norm = normalizeNameForMatch(g.name)
    if (!byNormalizedName.has(norm)) byNormalizedName.set(norm, [])
    byNormalizedName.get(norm)!.push(g)
    bySlug.set(g.slug.toLowerCase(), g)
  }

  type MatchResult =
    | { kind: 'matched'; golden: GoldenRef; method: 'exact' | 'normalized' | 'fuzzy'; confidence: number }
    | { kind: 'created'; goldenId: string; slug: string }
    | { kind: 'ambiguous'; reason: string }

  const matchedRows: Array<{ raw_id: string; name: string; golden_id: string; golden_name: string; match_method: string; confidence: number }> = []
  const createdRows: Array<{ raw_id: string; name: string; golden_id: string; canonical_slug: string }> = []
  const ambiguousRows: Array<{ raw_id: string; name: string; reason: string }> = []

  let matchedCount = 0
  let createdCount = 0
  let ambiguousCount = 0

  for (const raw of rawRecords) {
    const name = (raw.raw_json as any)?.name ?? raw.name_normalized ?? 'Unknown'
    const normalized = raw.name_normalized ?? normalizeNameForMatch(name)
    const slugCandidate = slugForMatch(name)

    let result: MatchResult | null = null

    // 1) Exact normalized name match
    const exactNorm = byNormalizedName.get(normalized)
    if (exactNorm?.length === 1) {
      result = { kind: 'matched', golden: exactNorm[0], method: 'normalized', confidence: 1 }
    } else if (exactNorm && exactNorm.length > 1) {
      result = { kind: 'ambiguous', reason: 'multiple_normalized_name_matches' }
    }

    // 2) Slug match (if not already matched/ambiguous)
    if (!result && slugCandidate) {
      const slugMatch = bySlug.get(slugCandidate.toLowerCase())
      if (slugMatch) {
        result = { kind: 'matched', golden: slugMatch, method: 'exact', confidence: 1 }
      }
    }

    // 3) Fuzzy (single best above threshold)
    if (!result) {
      let best: (typeof goldens)[0] | null = null
      let bestScore = 0
      for (const g of goldens) {
        const gNorm = normalizeNameForMatch(g.name)
        const score = jaroWinkler(normalized, gNorm)
        if (score >= FUZZY_THRESHOLD && score > bestScore) {
          bestScore = score
          best = g
        }
      }
      const ties = best ? goldens.filter((g) => jaroWinkler(normalized, normalizeNameForMatch(g.name)) >= FUZZY_THRESHOLD && jaroWinkler(normalized, normalizeNameForMatch(g.name)) >= bestScore) : []
      if (ties.length > 1) {
        result = { kind: 'ambiguous', reason: 'fuzzy_tie' }
      } else if (best) {
        result = { kind: 'matched', golden: best, method: 'fuzzy', confidence: bestScore }
      }
    }

    if (!result) {
      result = { kind: 'created', goldenId: '', slug: '' }
    }

    if (result.kind === 'matched') {
      await prisma.resolution_links.create({
        data: {
          raw_record_id: raw.raw_id,
          golden_record_id: result.golden.canonical_id,
          resolution_type: 'matched',
          confidence: result.confidence,
          match_method: result.method,
          resolver_version: RESOLVER_VERSION,
        },
      })
      matchedRows.push({
        raw_id: raw.raw_id,
        name,
        golden_id: result.golden.canonical_id,
        golden_name: result.golden.name,
        match_method: result.method,
        confidence: result.confidence,
      })
      matchedCount++
    } else if (result.kind === 'created') {
      const canonicalId = crypto.randomUUID()
      const slug = await ensureUniqueGoldenSlug(slugCandidate || canonicalId.slice(0, 8))
      const lat = raw.lat ? raw.lat : new Prisma.Decimal(0)
      const lng = raw.lng ? raw.lng : new Prisma.Decimal(0)
      const confidence = raw.lat && raw.lng ? 0.8 : 0.5
      await prisma.golden_records.create({
        data: {
          canonical_id: canonicalId,
          slug,
          name,
          lat,
          lng,
          source_attribution: {} as Prisma.JsonValue,
          cuisines: [],
          vibe_tags: [],
          signature_dishes: [],
          pro_tips: [],
          confidence,
          promotion_status: 'PENDING',
        },
      })
      await prisma.resolution_links.create({
        data: {
          raw_record_id: raw.raw_id,
          golden_record_id: canonicalId,
          resolution_type: 'created',
          confidence,
          match_method: 'exact',
          resolver_version: RESOLVER_VERSION,
        },
      })
      createdRows.push({ raw_id: raw.raw_id, name, golden_id: canonicalId, canonical_slug: slug })
      registerGolden({ canonical_id: canonicalId, name, slug })
      createdCount++
    } else {
      await prisma.resolution_links.create({
        data: {
          raw_record_id: raw.raw_id,
          golden_record_id: null,
          resolution_type: 'ambiguous',
          confidence: null,
          match_method: 'exact',
          resolver_version: RESOLVER_VERSION,
        },
      })
      ambiguousRows.push({ raw_id: raw.raw_id, name, reason: result.reason })
      ambiguousCount++
    }
  }

  const outDir = path.join(process.cwd(), 'data', 'resolver-output', `batch-${batchId}`)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'matched_existing.csv'), unparse(matchedRows), 'utf-8')
  fs.writeFileSync(path.join(outDir, 'created_new.csv'), unparse(createdRows), 'utf-8')
  fs.writeFileSync(path.join(outDir, 'ambiguous.csv'), unparse(ambiguousRows), 'utf-8')

  console.log('Resolver summary (resolver_version=%s)', RESOLVER_VERSION)
  console.log('  read_count:    %d', rawRecords.length)
  console.log('  matched_count: %d', matchedCount)
  console.log('  created_count: %d', createdCount)
  console.log('  ambiguous_count: %d', ambiguousCount)
  console.log('Output: %s (matched_existing.csv, created_new.csv, ambiguous.csv)', outDir)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
