#!/usr/bin/env node
/**
 * Backfill golden_records.google_place_id (and lat/lng) for curated rows that only
 * have name + neighborhood, using Google Places Text Search.
 *
 * Scope: county = 'Los Angeles', lower(neighborhood) = chosen neighborhood (default Echo Park),
 * google_place_id is null, lifecycle_status = 'ACTIVE'.
 *
 * Usage:
 *   --neighborhood "Echo Park" (default)
 *   --limit 50
 *   --apply (default dry run)
 *   --verbose
 *
 * Requires: GOOGLE_PLACES_API_KEY, GOOGLE_PLACES_ENABLED=true
 */

import * as fs from 'fs'
import * as path from 'path'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { logPlaceJob } from '@/lib/place-job-log'
import { searchPlace, getPlaceDetails } from '@/lib/google-places'
import type { PlaceSearchResult } from '@/lib/google-places'

const RATE_LIMIT_MS = 200
const DEFAULT_LIMIT = 50
const DEFAULT_NEIGHBORHOOD = 'Echo Park'
const LA_BIAS = { latitude: 34.078, longitude: -118.261 }
const MAX_RETRIES = 3
const RETRY_BASE_MS = 1000

function parseArgs(): {
  neighborhood: string
  limit: number
  apply: boolean
  verbose: boolean
  website: string | null
  address: string | null
  street: string | null
  postal: string | null
} {
  const args = process.argv.slice(2)
  const getVal = (key: string): string | null => {
    const i = args.indexOf(key)
    return i >= 0 ? args[i + 1] ?? null : null
  }
  const neighborhood =
    getVal('--neighborhood')?.trim() ?? DEFAULT_NEIGHBORHOOD
  let limit = DEFAULT_LIMIT
  const limitVal = getVal('--limit')
  if (limitVal) limit = parseInt(limitVal, 10) || DEFAULT_LIMIT
  return {
    neighborhood,
    limit,
    apply: args.includes('--apply'),
    verbose: args.includes('--verbose'),
    website: getVal('--website')?.trim() ?? null,
    address: getVal('--address')?.trim() ?? null,
    street: getVal('--street')?.trim() ?? null,
    postal: getVal('--postal')?.trim() ?? null,
  }
}

/** Extract domain from URL for comparison (lowercase, no www). */
function urlDomain(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    return host || null
  } catch {
    return null
  }
}

/** Normalize address for contains check: lowercase, collapse spaces, strip punctuation. */
function normalizeAddressPart(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .toLowerCase()
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Check if formattedAddress contains the street (and optionally postal). */
function addressMatches(
  formattedAddress: string | null | undefined,
  street: string | null | undefined,
  postal: string | null | undefined
): boolean {
  if (!formattedAddress) return false
  const normalized = normalizeAddressPart(formattedAddress)
  const streetNorm = normalizeAddressPart(street)
  const postalNorm = normalizeAddressPart(postal)
  if (!streetNorm) return false
  if (!normalized.includes(streetNorm)) return false
  if (postalNorm && !normalized.includes(postalNorm)) return false
  return true
}

/** Squared distance (avoid sqrt for comparison). */
function distSq(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return (lat2 - lat1) ** 2 + (lng2 - lng1) ** 2
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function searchWithRetry(
  query: string,
  options: { locationBias: typeof LA_BIAS; maxResults: number }
): Promise<Awaited<ReturnType<typeof searchPlace>>> {
  let lastErr: unknown
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const results = await searchPlace(query, options)
      return results
    } catch (e: unknown) {
      lastErr = e
      const msg = e instanceof Error ? e.message : String(e)
      const is429 =
        msg.includes('429') ||
        msg.toLowerCase().includes('too many requests') ||
        (e as { status?: number })?.status === 429
      if (is429 && attempt < MAX_RETRIES - 1) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt)
        await sleep(delay)
        continue
      }
      throw e
    }
  }
  throw lastErr
}

type GoldenCandidate = {
  canonical_id: string
  name: string
  neighborhood: string | null
  website: string | null
  address_street: string | null
  address_zip: string | null
}

/** Only use distance tie-break when best is clearly closer (safety margin for near-duplicates). */
const DISTANCE_SAFETY_FRACTION = 0.25 // bestDistSq <= secondBestDistSq * this

/**
 * Tie-break ambiguous results: 1) website match, 2) address match, 3) closest (if clearly closer).
 * Returns the single chosen result or null if still tied.
 */
async function pickOneFromAmbiguous(
  results: PlaceSearchResult[],
  golden: GoldenCandidate,
  opts: { website: string | null; address: string | null; street: string | null; postal: string | null },
  sleepMs: () => Promise<void>
): Promise<PlaceSearchResult | null> {
  const targetWebsite = opts.website ?? golden.website
  const targetStreet = opts.address ?? opts.street ?? golden.address_street
  const targetPostal = opts.postal ?? golden.address_zip

  if (results.length === 0) return null
  if (results.length === 1) return results[0]

  // 1) Website match: use search result .website when present; only call getPlaceDetails for the rest
  if (targetWebsite?.trim()) {
    const targetDomain = urlDomain(targetWebsite)
    if (targetDomain) {
      const matchesFromSearch = results.filter((r) => {
        const d = r.website ? urlDomain(r.website) : null
        return d === targetDomain
      })
      if (matchesFromSearch.length === 1) return matchesFromSearch[0]
      if (matchesFromSearch.length > 1) {
        results = matchesFromSearch
      } else {
        const needDetails = results.filter((r) => !r.website)
        const matchesFromDetails: PlaceSearchResult[] = []
        for (const r of needDetails) {
          await sleepMs()
          try {
            const details = await getPlaceDetails(r.placeId)
            const candidateDomain = urlDomain(details?.website)
            if (candidateDomain && candidateDomain === targetDomain) {
              matchesFromDetails.push(r)
            }
          } catch {
            // skip
          }
        }
        if (matchesFromDetails.length === 1) return matchesFromDetails[0]
        if (matchesFromDetails.length > 1) results = matchesFromDetails
      }
    }
  }

  // 2) Address match: which result's formatted address contains street (+ optional postal)?
  if (targetStreet?.trim()) {
    const byAddress = results.filter((r) =>
      addressMatches(r.address, targetStreet, targetPostal ?? undefined)
    )
    if (byAddress.length === 1) return byAddress[0]
    if (byAddress.length > 1) results = byAddress
  }

  // 3) Closest to neighborhood center — only pick if best is clearly closer (safety margin)
  const withDist = results.map((r) => ({
    result: r,
    d: distSq(
      r.location?.lat ?? 0,
      r.location?.lng ?? 0,
      LA_BIAS.latitude,
      LA_BIAS.longitude
    ),
  }))
  withDist.sort((a, b) => a.d - b.d)
  const best = withDist[0]
  const second = withDist[1]
  if (!second) return best.result
  if (best.d <= second.d * DISTANCE_SAFETY_FRACTION) return best.result
  return null
}

interface LogRow {
  golden_id: string
  name: string
  neighborhood: string
  query: string
  result_place_id: string
  status: string
}

async function main() {
  const { neighborhood, limit, apply, verbose, website, address, street, postal } = parseArgs()
  const neighborhoodLower = neighborhood.toLowerCase().trim()

  console.log('Backfill golden_records.google_place_id from Places API (curated scope)\n')
  console.log('  neighborhood:', neighborhood)
  console.log('  limit:', limit)
  console.log('  mode:', apply ? 'APPLY' : 'dry run')
  if (website) console.log('  --website:', website)
  if (address) console.log('  --address:', address)
  if (street) console.log('  --street:', street)
  if (postal) console.log('  --postal:', postal)
  if (!apply) console.log('  (use --apply to persist)\n')

  const candidates = await db.$queryRaw<GoldenCandidate[]>(Prisma.sql`
    SELECT canonical_id, name, neighborhood, website, address_street, address_zip
    FROM golden_records
    WHERE county = 'Los Angeles'
      AND lower(trim(coalesce(neighborhood, ''))) = ${neighborhoodLower}
      AND (google_place_id IS NULL OR btrim(coalesce(google_place_id, '')) = '')
      AND lifecycle_status = 'ACTIVE'
    ORDER BY canonical_id
    LIMIT ${limit}
  `)

  console.log('  candidates:', candidates.length, '\n')

  const logRows: LogRow[] = []
  let scanned = 0
  let matched = 0
  let updated = 0
  let noMatch = 0
  let ambiguous = 0
  let apiErrors = 0

  const hasApi = !!process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_PLACES_ENABLED === 'true'
  if (!hasApi && candidates.length > 0) {
    console.log('  GOOGLE_PLACES_API_KEY / GOOGLE_PLACES_ENABLED not set; skipping API calls.')
    for (const c of candidates) {
      logRows.push({
        golden_id: c.canonical_id,
        name: c.name,
        neighborhood: c.neighborhood ?? '',
        query: `${c.name}, ${neighborhood}, Los Angeles, CA`,
        result_place_id: '',
        status: 'api_disabled',
      })
    }
  }

  for (const g of candidates) {
    scanned++
    const query = `${g.name}, ${neighborhood}, Los Angeles, CA`
    if (!hasApi) continue

    try {
      const results = await searchWithRetry(query, {
        locationBias: LA_BIAS,
        maxResults: 5,
      })
      await sleep(RATE_LIMIT_MS)

      if (results.length === 1) {
        matched++
        const placeId = results[0].placeId
        const loc = results[0].location
        if (apply) {
          if (loc?.lat != null && loc?.lng != null) {
            await db.$executeRaw`
              UPDATE golden_records
              SET google_place_id = ${placeId}, lat = ${loc.lat}, lng = ${loc.lng}
              WHERE canonical_id = ${g.canonical_id}
            `
          } else {
            await db.$executeRaw`
              UPDATE golden_records SET google_place_id = ${placeId}
              WHERE canonical_id = ${g.canonical_id}
            `
          }
          updated++
        }
        logRows.push({
          golden_id: g.canonical_id,
          name: g.name,
          neighborhood: g.neighborhood ?? '',
          query,
          result_place_id: placeId,
          status: 'matched',
        })
        if (apply && hasApi) {
          await logPlaceJob({
            entityId: g.canonical_id,
            entityType: 'golden_record',
            jobType: 'IDENTITY',
            pagesFetched: 0,
            aiCalls: 0,
          })
        }
        if (verbose) console.log('  ✓', g.name, '→', placeId)
      } else if (results.length === 0) {
        noMatch++
        logRows.push({
          golden_id: g.canonical_id,
          name: g.name,
          neighborhood: g.neighborhood ?? '',
          query,
          result_place_id: '',
          status: 'no_match',
        })
        if (verbose) console.log('  ✗ no_match:', g.name)
      } else {
        const picked = await pickOneFromAmbiguous(
          results,
          g,
          { website, address, street, postal },
          () => sleep(RATE_LIMIT_MS)
        )
        if (picked) {
          matched++
          const placeId = picked.placeId
          const loc = picked.location
          if (apply) {
            if (loc?.lat != null && loc?.lng != null) {
              await db.$executeRaw`
                UPDATE golden_records
                SET google_place_id = ${placeId}, lat = ${loc.lat}, lng = ${loc.lng}
                WHERE canonical_id = ${g.canonical_id}
              `
            } else {
              await db.$executeRaw`
                UPDATE golden_records SET google_place_id = ${placeId}
                WHERE canonical_id = ${g.canonical_id}
              `
            }
            updated++
          }
          logRows.push({
            golden_id: g.canonical_id,
            name: g.name,
            neighborhood: g.neighborhood ?? '',
            query,
            result_place_id: placeId,
            status: 'matched_tiebreak',
          })
          if (apply && hasApi) {
            await logPlaceJob({
              entityId: g.canonical_id,
              entityType: 'golden_record',
              jobType: 'IDENTITY',
              pagesFetched: 0,
              aiCalls: 0,
            })
          }
          if (verbose) console.log('  ✓', g.name, '→', placeId, '(tie-break)')
        } else {
          ambiguous++
          logRows.push({
            golden_id: g.canonical_id,
            name: g.name,
            neighborhood: g.neighborhood ?? '',
            query,
            result_place_id: '',
            status: 'ambiguous',
          })
          if (verbose) console.log('  ✗ ambiguous:', g.name, `(${results.length} results)`)
        }
      }
    } catch (e: unknown) {
      apiErrors++
      const msg = e instanceof Error ? e.message : String(e)
      logRows.push({
        golden_id: g.canonical_id,
        name: g.name,
        neighborhood: g.neighborhood ?? '',
        query,
        result_place_id: '',
        status: 'api_error',
      })
      if (verbose) console.log('  ✗ api_error:', g.name, msg.slice(0, 60))
    }
  }

  console.log('\n--- Summary ---')
  console.log('  scanned:', scanned)
  console.log('  matched:', matched)
  console.log('  updated:', updated)
  console.log('  no_match:', noMatch)
  console.log('  ambiguous:', ambiguous)
  console.log('  api_errors:', apiErrors)

  const logDir = path.join(process.cwd(), 'data', 'logs')
  fs.mkdirSync(logDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const safeNeighborhood = neighborhoodLower.replace(/\s+/g, '_')
  const csvPath = path.join(logDir, `backfill_gpid_${safeNeighborhood}_${timestamp}.csv`)
  const header = 'golden_id,name,neighborhood,query,result_place_id,status\n'
  const csvBody = logRows
    .map(
      (r) =>
        `"${r.golden_id}","${(r.name ?? '').replace(/"/g, '""')}","${(r.neighborhood ?? '').replace(/"/g, '""')}","${(r.query ?? '').replace(/"/g, '""')}","${(r.result_place_id ?? '').replace(/"/g, '""')}","${r.status}"`
    )
    .join('\n')
  fs.writeFileSync(csvPath, header + csvBody)
  console.log('\nCSV log:', csvPath)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
