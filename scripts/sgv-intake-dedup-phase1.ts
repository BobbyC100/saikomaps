/**
 * SGV Chinese Intake Phase 1 — CSV labeling only, no DB writes.
 * Reads saiko_sgv_chinese_intake_phase1.csv, queries golden_records,
 * applies normalization + dedup rules, writes updated CSV.
 */

import * as fs from 'fs'
import * as path from 'path'
import { parse, unparse } from 'papaparse'
import { db } from '@/lib/db'

const SUFFIX_TOKENS = [
  'restaurant',
  'cafe',
  'kitchen',
  'house',
  'noodle house',
  'dumpling house',
  'dim sum house',
  'inc',
  'llc',
  'co',
  'company',
]

type MatchStatus = 'Exact Match' | 'Probable Duplicate' | 'New' | 'Needs Manual Review'

interface IntakeRow {
  'Place Name (Normalized)': string
  Source: string
  'Saiko Match Status': string
  'Existing Place ID': string
  Notes: string
}

interface GoldenRecord {
  canonical_id: string
  name: string
  slug: string
}

/** Normalize for comparison: lowercase, trim, & → and, remove punctuation, collapse spaces, strip suffix tokens, strip trailing (Location). */
function normalizeName(raw: string): string {
  let s = raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
  s = s.replace(/\s*&\s*/g, ' and ')
  s = s.replace(/[.,'’\-()\/]/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  // Remove trailing parenthetical location e.g. "(Alhambra)", "(Rosemead)"
  s = s.replace(/\s*\([^)]+\)\s*$/, '').trim()
  // Remove suffix tokens only at end (match whole word at end)
  for (const token of SUFFIX_TOKENS) {
    const re = new RegExp(`\\s+${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i')
    s = s.replace(re, '').trim()
  }
  return s.replace(/\s+/g, ' ').trim()
}

function tokens(name: string): string[] {
  return name.split(/\s+/).filter(Boolean)
}

function isManualReviewByName(placeName: string, normalized: string): boolean {
  const raw = placeName.trim()
  if (normalized.length < 6) return true
  const toks = tokens(normalized)
  if (toks.length === 1) return true
  if (toks.some((t) => t.length === 1)) return true // single letter token e.g. "A"
  if (/\([^)]+\)/.test(raw)) return true // has parentheses (location qualifier etc.)
  return false
}

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*&\s*/g, ' and ')
    .replace(/[.,'’\-()\/]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function main() {
  const csvPath = path.join(process.cwd(), 'saiko_sgv_chinese_intake_phase1.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const parsed = parse<IntakeRow>(csvContent, { header: true, skipEmptyLines: true })

  const rows = parsed.data.filter((r) => r['Place Name (Normalized)']?.trim())
  if (rows.length === 0) {
    console.error('No rows in CSV')
    process.exit(1)
  }

  const goldens = await db.golden_records.findMany({
    where: { lifecycle_status: 'ACTIVE' },
    select: { canonical_id: true, name: true, slug: true },
  })

  const goldensBySlug = new Map<string, GoldenRecord>()
  for (const g of goldens) {
    goldensBySlug.set(g.slug.toLowerCase(), g)
  }

  for (const row of rows) {
    const humanName = row['Place Name (Normalized)'].trim()
    const normalized = normalizeName(humanName)
    const intakeSlug = slugFromName(humanName)

    // 1) Manual review flags (avoid false positives)
    if (isManualReviewByName(humanName, normalized)) {
      row['Saiko Match Status'] = 'Needs Manual Review'
      row['Existing Place ID'] = ''
      continue
    }

    // 2) Exact match: case-insensitive raw, or normalized eq, or slug eq
    const exactByRaw = goldens.find(
      (g) => g.name.toLowerCase().trim() === humanName.toLowerCase().trim()
    )
    if (exactByRaw) {
      row['Saiko Match Status'] = 'Exact Match'
      row['Existing Place ID'] = exactByRaw.canonical_id
      continue
    }

    const exactByNormalized = goldens.find((g) => normalizeName(g.name) === normalized)
    if (exactByNormalized) {
      row['Saiko Match Status'] = 'Exact Match'
      row['Existing Place ID'] = exactByNormalized.canonical_id
      continue
    }

    const exactBySlug = goldensBySlug.get(intakeSlug)
    if (exactBySlug) {
      row['Saiko Match Status'] = 'Exact Match'
      row['Existing Place ID'] = exactBySlug.canonical_id
      continue
    }

    // 3) Multiple DB candidates (ambiguous) → Manual Review
    const candidatesNormalized = goldens.filter((g) => normalizeName(g.name) === normalized)
    if (candidatesNormalized.length > 1) {
      row['Saiko Match Status'] = 'Needs Manual Review'
      row['Existing Place ID'] = ''
      continue
    }

    // 4) Substring but not identical → Manual Review
    const intakeLower = humanName.toLowerCase()
    const substringMatches = goldens.filter((g) => {
      const gLower = g.name.toLowerCase()
      return gLower.includes(intakeLower) || intakeLower.includes(gLower)
    })
    if (substringMatches.length > 0 && normalizeName(substringMatches[0].name) !== normalized) {
      row['Saiko Match Status'] = 'Needs Manual Review'
      row['Existing Place ID'] = ''
      continue
    }

    // 5) Probable duplicate: normalized match after suffix strip, and raw names "very similar" (e.g. Savoy Kitchen vs Savoy)
    let probable: GoldenRecord | null = null
    for (const g of goldens) {
      const gNorm = normalizeName(g.name)
      if (gNorm !== normalized) continue
      const gRaw = g.name.trim()
      const rawSimilar =
        gRaw.toLowerCase() === intakeLower ||
        intakeLower.includes(gRaw.toLowerCase()) ||
        gRaw.toLowerCase().includes(intakeLower)
      if (rawSimilar) {
        probable = g
        break
      }
    }
    if (probable) {
      row['Saiko Match Status'] = 'Probable Duplicate'
      row['Existing Place ID'] = probable.canonical_id
      continue
    }

    // 6) New
    row['Saiko Match Status'] = 'New'
    row['Existing Place ID'] = ''
  }

  const outCsv = unparse(rows, {
    columns: [
      'Place Name (Normalized)',
      'Source',
      'Saiko Match Status',
      'Existing Place ID',
      'Notes',
    ],
    header: true,
  })

  fs.writeFileSync(csvPath, outCsv, 'utf-8')
  console.log(`Updated ${csvPath} with match status and Existing Place ID.`)
  console.log(
    'Counts:',
    rows.reduce(
      (acc, r) => {
        acc[r['Saiko Match Status']] = (acc[r['Saiko Match Status']] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
