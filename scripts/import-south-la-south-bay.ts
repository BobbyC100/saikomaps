/**
 * Script: Import South LA & South Bay Complete Guide
 * 80 places across Inglewood, Leimert Park, West Adams, Gardena, Torrance, Compton
 */

import { db } from '@/lib/db'
import { searchPlace, getPlaceDetails, getNeighborhoodFromPlaceDetails, getNeighborhoodFromCoords } from '@/lib/google-places'
import { generateSlug } from '@/lib/utils'
import { generatePlaceSlug, ensureUniqueSlug } from '@/lib/place-slug'
import { getSaikoCategory, parseCuisineType } from '@/lib/categoryMapping'
import fs from 'fs'

const CSV_PATH = '/Users/bobbyciccaglione/Downloads/south-la-south-bay.csv'
const USER_ID = 'demo-user-id'

type PlaceInput = {
  name: string
  neighborhood?: string
  category?: string
  source?: string
}

async function main() {
  console.log('🌴 Starting South LA & South Bay Import...\n')

  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8')
  const lines = fileContent.split('\n').filter(line => line.trim())
  
  const inputs: PlaceInput[] = []
  
  const header = lines[0]
  console.log(`📋 Header: ${header}`)
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    
    const fields: string[] = []
    let currentField = ''
    let inQuotes = false
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim())
        currentField = ''
      } else {
        currentField += char
      }
    }
    fields.push(currentField.trim())
    
    if (fields.length < 3) continue
    
    const name = fields[0]
    const neighborhood = fields[1]
    const category = fields[2]
    const source = fields[3]
    
    if (!name || name.trim() === '') continue
    
    inputs.push({
      name: name.trim(),
      neighborhood: neighborhood?.trim() || undefined,
      category: category?.trim() || undefined,
      source: source?.trim() || undefined,
    })
  }

  console.log(`✅ Found ${inputs.length} places in CSV\n`)

  const listTitle = 'South LA & South Bay Complete'
  const slug = `${generateSlug(listTitle)}-${Date.now()}`
  
  const list = await db.lists.create({
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
  console.log(`   URL: http://localhost:3000/${list.slug}\n`)

  let enriched = 0
  let failed = 0
  let created = 0
  let existing = 0
  let addedToMap = 0

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]
    const progress = `[${i + 1}/${inputs.length}]`
    
    console.log(`${progress} ${input.name} [${input.neighborhood}]`)

    let placeDetails = null
    let googlePlaceId: string | null = null

    if (process.env.GOOGLE_PLACES_API_KEY) {
      // Search with name + neighborhood + CA
      const searchQuery = `${input.name}, ${input.neighborhood}, CA`
      
      try {
        const results = await searchPlace(searchQuery, { maxResults: 1 })
        if (results.length > 0) {
          googlePlaceId = results[0].placeId
          placeDetails = await getPlaceDetails(googlePlaceId)
        }
      } catch (error) {
        console.log(`   ✗ Search failed`)
      }
    }

    let place = googlePlaceId ? await db.places.findUnique({ where: { googlePlaceId } }) : null

    if (!place) {
      const neighborhood = placeDetails
        ? (getNeighborhoodFromPlaceDetails(placeDetails) ??
          (!Number.isNaN(placeDetails.location?.lat) && !Number.isNaN(placeDetails.location?.lng)
            ? await getNeighborhoodFromCoords(placeDetails.location.lat, placeDetails.location.lng)
            : null))
        : null

      const finalName = placeDetails?.name && !placeDetails.name.startsWith('http')
        ? placeDetails.name
        : input.name

      const baseSlug = generatePlaceSlug(finalName, neighborhood ?? input.neighborhood ?? undefined)
      const uniqueSlug = await ensureUniqueSlug(baseSlug, async (s) => {
        const exists = await db.places.findUnique({ where: { slug: s } })
        return !!exists
      })

      const sources = input.source ? [
        {
          name: input.source,
          url: '',
          excerpt: `${input.category} in ${input.neighborhood}`,
        }
      ] : []

      place = await db.places.create({
        data: {
          slug: uniqueSlug,
          googlePlaceId: googlePlaceId ?? undefined,
          name: finalName,
          address: placeDetails?.formattedAddress ?? null,
          latitude: placeDetails?.location ? placeDetails.location.lat : null,
          longitude: placeDetails?.location ? placeDetails.location.lng : null,
          phone: placeDetails?.formattedPhoneNumber ?? null,
          website: placeDetails?.website ?? null,
          googleTypes: placeDetails?.types ?? [],
          priceLevel: placeDetails?.priceLevel ?? null,
          neighborhood: neighborhood ?? input.neighborhood ?? null,
          cuisineType: placeDetails?.types ? parseCuisineType(placeDetails.types) ?? null : null,
          category: getSaikoCategory(finalName, placeDetails?.types ?? []),
          googlePhotos: placeDetails?.photos ? JSON.parse(JSON.stringify(placeDetails.photos)) : undefined,
          hours: placeDetails?.openingHours ? JSON.parse(JSON.stringify(placeDetails.openingHours)) : null,
          placesDataCachedAt: placeDetails ? new Date() : null,
          sources: sources.length > 0 ? sources : undefined,
        },
      })

      created++
      if (placeDetails) {
        enriched++
        console.log(`   ✓ Created: ${place.name}`)
      } else {
        failed++
        console.log(`   ⚠ Created but NOT enriched`)
      }
    } else {
      existing++
      console.log(`   ↻ Already exists`)
    }

    const existingMapPlace = await db.map_places.findUnique({
      where: { mapId_placeId: { mapId: list.id, placeId: place.id } },
    })

    if (!existingMapPlace) {
      await db.map_places.create({
        data: {
          mapId: list.id,
          placeId: place.id,
          userNote: `${input.category} - ${input.source}`,
          orderIndex: i,
        },
      })
      addedToMap++
    }

    await new Promise((r) => setTimeout(r, 150))
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ IMPORT COMPLETE!\n')
  console.log(`📊 Summary:`)
  console.log(`   Total places: ${inputs.length}`)
  console.log(`   New places: ${created}`)
  console.log(`   Already existed: ${existing}`)
  console.log(`   Enriched: ${enriched}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Added to map: ${addedToMap}`)
  console.log(`\n🗺️  View: http://localhost:3000/${list.slug}`)
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
