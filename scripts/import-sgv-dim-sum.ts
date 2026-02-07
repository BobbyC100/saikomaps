/**
 * Script: Import SGV Chinese/Cantonese Dim Sum places
 * Imports places from CSV and creates a new map
 */

import { db } from '@/lib/db'
import { searchPlace, getPlaceDetails, getNeighborhoodFromPlaceDetails, getNeighborhoodFromCoords } from '@/lib/google-places'
import { generateSlug } from '@/lib/utils'
import { extractPlaceId } from '@/lib/utils/googleMapsParser'
import { generatePlaceSlug, ensureUniqueSlug } from '@/lib/place-slug'
import { getSaikoCategory, parseCuisineType } from '@/lib/categoryMapping'
import fs from 'fs'
import Papa from 'papaparse'

const CSV_PATH = '/Users/bobbyciccaglione/Downloads/sgv-chinese-cantonese-dim-sum.csv'
const USER_ID = 'demo-user-id' // Change this if needed

type PlaceInput = {
  name: string
  address?: string
  comment?: string
  url?: string
}

async function main() {
  console.log('🥟 Starting SGV Dim Sum Import...\n')

  // Read and parse CSV
  console.log('📄 Reading CSV file...')
  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8')
  const parseResult = Papa.parse(fileContent, { header: true, skipEmptyLines: true })
  
  if (parseResult.errors.length > 0) {
    console.error('❌ CSV parsing errors:', parseResult.errors)
    process.exit(1)
  }

  const inputs: PlaceInput[] = []
  for (const row of parseResult.data as Record<string, unknown>[]) {
    const name = (row.Name || row.name || '') as string
    if (!name || String(name).trim() === '') continue
    inputs.push({
      name: String(name).trim(),
      address: (row.Address || row.address || '') as string | undefined,
      url: (row.URL || row.url || '') as string | undefined,
      comment: (row.Comment || row.Note || row.comment || '') as string | undefined,
    })
  }

  console.log(`✅ Found ${inputs.length} places in CSV\n`)

  // Create the list
  console.log('📋 Creating map...')
  const listTitle = 'SGV Chinese/Cantonese Dim Sum'
  const slug = `${generateSlug(listTitle)}-${Date.now()}`
  
  const list = await db.list.create({
    data: {
      userId: USER_ID,
      title: listTitle,
      slug,
      templateType: 'field-notes',
      accessLevel: 'public',
      published: true,
    },
  })

  console.log(`✅ Created map: ${list.title}`)
  console.log(`   ID: ${list.id}`)
  console.log(`   Slug: ${list.slug}`)
  console.log(`   URL: http://localhost:3000/${list.slug}\n`)

  // Import places
  console.log('🔍 Starting place enrichment...\n')
  
  let enriched = 0
  let failed = 0
  let created = 0

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]
    const progress = `[${i + 1}/${inputs.length}]`
    
    console.log(`${progress} Processing: ${input.name}`)

    let cleanName = input.name?.trim() || ''
    if (cleanName.startsWith('http')) {
      const urlMatch = cleanName.match(/\/place\/([^/?]+)/)
      cleanName = urlMatch ? decodeURIComponent(urlMatch[1].replace(/\+/g, ' ')) : 'Untitled Place'
    }
    if (!cleanName) cleanName = 'Untitled Place'

    let placeDetails = null
    let googlePlaceId: string | null = null

    // Strategy 1: Extract place ID from URL
    if (input.url) {
      googlePlaceId = extractPlaceId(input.url)
      if (googlePlaceId && !googlePlaceId.startsWith('cid:')) {
        try {
          placeDetails = await getPlaceDetails(googlePlaceId)
          console.log(`   ✓ Found via Place ID`)
        } catch {
          console.log(`   ⚠ Place ID failed, trying search...`)
        }
      }
    }

    // Strategy 2: Text search
    if (!placeDetails && process.env.GOOGLE_PLACES_API_KEY) {
      const cleanAddress = input.address && !input.address.startsWith('http') ? input.address : undefined
      const searchQuery = cleanAddress ? `${cleanName}, ${cleanAddress}` : cleanName
      
      try {
        const results = await searchPlace(searchQuery, { maxResults: 1 })
        if (results.length > 0) {
          googlePlaceId = results[0].placeId
          placeDetails = await getPlaceDetails(googlePlaceId)
          console.log(`   ✓ Found via search: "${searchQuery}"`)
        }
      } catch (error) {
        console.log(`   ✗ Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Check if place already exists
    let place = googlePlaceId ? await db.place.findUnique({ where: { googlePlaceId } }) : null

    if (!place) {
      const neighborhood = placeDetails
        ? (getNeighborhoodFromPlaceDetails(placeDetails) ??
          (!Number.isNaN(placeDetails.location?.lat) && !Number.isNaN(placeDetails.location?.lng)
            ? await getNeighborhoodFromCoords(placeDetails.location.lat, placeDetails.location.lng)
            : null))
        : null

      const finalName = placeDetails?.name && !placeDetails.name.startsWith('http')
        ? placeDetails.name
        : cleanName

      const baseSlug = generatePlaceSlug(finalName, neighborhood ?? undefined)
      const uniqueSlug = await ensureUniqueSlug(baseSlug, async (s) => {
        const exists = await db.place.findUnique({ where: { slug: s } })
        return !!exists
      })

      place = await db.place.create({
        data: {
          slug: uniqueSlug,
          googlePlaceId: googlePlaceId ?? undefined,
          name: finalName,
          address: placeDetails?.formattedAddress ?? (input.address && !input.address.startsWith('http') ? input.address : null),
          latitude: placeDetails?.location ? placeDetails.location.lat : null,
          longitude: placeDetails?.location ? placeDetails.location.lng : null,
          phone: placeDetails?.formattedPhoneNumber ?? null,
          website: placeDetails?.website ?? null,
          googleTypes: placeDetails?.types ?? [],
          priceLevel: placeDetails?.priceLevel ?? null,
          neighborhood: neighborhood ?? null,
          cuisineType: placeDetails?.types ? parseCuisineType(placeDetails.types) ?? null : null,
          category: getSaikoCategory(finalName, placeDetails?.types ?? []),
          googlePhotos: placeDetails?.photos ? JSON.parse(JSON.stringify(placeDetails.photos)) : undefined,
          hours: placeDetails?.openingHours ? JSON.parse(JSON.stringify(placeDetails.openingHours)) : null,
          placesDataCachedAt: placeDetails ? new Date() : null,
        },
      })

      created++
      if (placeDetails) {
        enriched++
        console.log(`   ✓ Created & enriched: ${place.name}`)
        if (neighborhood) console.log(`     Neighborhood: ${neighborhood}`)
        if (place.category) console.log(`     Category: ${place.category}`)
      } else {
        failed++
        console.log(`   ⚠ Created but NOT enriched: ${place.name}`)
      }
    } else {
      console.log(`   ↻ Place already exists: ${place.name}`)
    }

    // Create MapPlace (link place to map)
    const existingMapPlace = await db.mapPlace.findUnique({
      where: { mapId_placeId: { mapId: list.id, placeId: place.id } },
    })

    if (!existingMapPlace) {
      await db.mapPlace.create({
        data: {
          mapId: list.id,
          placeId: place.id,
          userNote: input.comment?.trim() || null,
          orderIndex: i,
        },
      })
      console.log(`   ✓ Added to map`)
    }

    console.log('') // blank line for readability

    // Rate limiting
    await new Promise((r) => setTimeout(r, 150))
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ IMPORT COMPLETE!\n')
  console.log(`📊 Summary:`)
  console.log(`   Total places processed: ${inputs.length}`)
  console.log(`   New places created: ${created}`)
  console.log(`   Successfully enriched: ${enriched}`)
  console.log(`   Failed to enrich: ${failed}`)
  console.log(`   Success rate: ${Math.round((enriched / inputs.length) * 100)}%`)
  console.log(`\n🗺️  View your map: http://localhost:3000/${list.slug}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
