/**
 * Script: Dedupe and Import Master Michelin + Eater List
 * First analyzes existing places, then imports only new ones
 */

import { db } from '@/lib/db'
import { searchPlace, getPlaceDetails, getNeighborhoodFromPlaceDetails, getNeighborhoodFromCoords } from '@/lib/google-places'
import { generateSlug } from '@/lib/utils'
import { generatePlaceSlug, ensureUniqueSlug } from '@/lib/place-slug'
import { getSaikoCategory, parseCuisineType } from '@/lib/categoryMapping'
import fs from 'fs'

const CSV_PATH = '/Users/bobbyciccaglione/la-list-scraper/la_master_michelin_plus_eater.csv'
const USER_ID = 'demo-user-id'

type PlaceInput = {
  name: string
  address?: string
  comment?: string
  sourceUrl?: string
}

async function main() {
  console.log('🔍 DEDUPE SCAN & IMPORT: LA Master Michelin + Eater\n')
  console.log('═'.repeat(80))

  // Read CSV
  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8')
  const lines = fileContent.split('\n').filter(line => line.trim())
  
  const inputs: PlaceInput[] = []
  
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
    const address = fields[1]
    const comment = fields[2]
    const sourceUrl = fields.slice(3).join(',')
    
    if (!name || name.trim() === '') continue
    
    inputs.push({
      name: name.trim(),
      address: address?.trim() || undefined,
      comment: comment?.trim() || undefined,
      sourceUrl: sourceUrl?.trim() || undefined,
    })
  }

  console.log(`\n📄 Found ${inputs.length} places in CSV\n`)

  // Phase 1: Dedupe Scan
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('PHASE 1: DEDUPE SCAN')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const allExistingPlaces = await db.place.findMany({
    select: {
      id: true,
      name: true,
      googlePlaceId: true,
      address: true,
    }
  })

  console.log(`Current database: ${allExistingPlaces.length} places\n`)

  const toCheck: Array<{ input: PlaceInput; index: number }> = []
  const alreadyExists: Array<{ input: PlaceInput; match: any }> = []
  const needsImport: Array<{ input: PlaceInput; index: number }> = []

  // Quick name-based matching first
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]
    const nameMatch = allExistingPlaces.find(p => 
      p.name.toLowerCase().trim() === input.name.toLowerCase().trim()
    )
    
    if (nameMatch) {
      alreadyExists.push({ input, match: nameMatch })
    } else {
      toCheck.push({ input, index: i })
    }
  }

  console.log(`Quick scan results:`)
  console.log(`  ✓ Already exists (exact name match): ${alreadyExists.length}`)
  console.log(`  ? Need to check via Google Places: ${toCheck.length}\n`)

  // Phase 2: Check remaining via Google Places
  console.log('🔍 Checking remaining places via Google Places API...\n')
  
  let checked = 0
  for (const item of toCheck) {
    const input = item.input
    
    if (checked % 10 === 0 && checked > 0) {
      console.log(`   Checked ${checked}/${toCheck.length}...`)
    }
    
    try {
      if (process.env.GOOGLE_PLACES_API_KEY) {
        const searchQuery = input.address ? `${input.name}, ${input.address}` : input.name
        const results = await searchPlace(searchQuery, { maxResults: 1 })
        
        if (results.length > 0) {
          const googlePlaceId = results[0].placeId
          const existingPlace = allExistingPlaces.find(p => p.googlePlaceId === googlePlaceId)
          
          if (existingPlace) {
            alreadyExists.push({ input, match: existingPlace })
          } else {
            needsImport.push(item)
          }
        } else {
          needsImport.push(item)
        }
      } else {
        needsImport.push(item)
      }
      
      checked++
      await new Promise((r) => setTimeout(r, 150))
    } catch (error) {
      needsImport.push(item)
      checked++
    }
  }

  console.log(`\n✅ Dedupe scan complete!\n`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('DEDUPE RESULTS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log(`Total in CSV: ${inputs.length}`)
  console.log(`Already in database: ${alreadyExists.length}`)
  console.log(`Need to import: ${needsImport.length}\n`)

  if (alreadyExists.length > 0) {
    console.log('Already exists (sample):')
    alreadyExists.slice(0, 10).forEach(item => {
      console.log(`  ✓ ${item.input.name} → ${item.match.name}`)
    })
    if (alreadyExists.length > 10) {
      console.log(`  ... and ${alreadyExists.length - 10} more`)
    }
    console.log('')
  }

  if (needsImport.length === 0) {
    console.log('✅ All places already exist! Nothing to import.\n')
    await db.$disconnect()
    return
  }

  // Phase 3: Import new places
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('PHASE 2: IMPORTING NEW PLACES')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Create map for new places
  const listTitle = 'LA Master: Michelin + Eater 38'
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
  console.log(`   URL: http://localhost:3000/${list.slug}\n`)

  let enriched = 0
  let failed = 0
  let created = 0
  let updated = 0

  for (let i = 0; i < needsImport.length; i++) {
    const { input } = needsImport[i]
    const progress = `[${i + 1}/${needsImport.length}]`
    
    console.log(`${progress} ${input.name}`)

    let placeDetails = null
    let googlePlaceId: string | null = null

    if (process.env.GOOGLE_PLACES_API_KEY) {
      const searchQuery = input.address ? `${input.name}, ${input.address}` : input.name
      
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

    if (placeDetails) {
      const neighborhood = getNeighborhoodFromPlaceDetails(placeDetails) ??
        (!Number.isNaN(placeDetails.location?.lat) && !Number.isNaN(placeDetails.location?.lng)
          ? await getNeighborhoodFromCoords(placeDetails.location.lat, placeDetails.location.lng)
          : null)

      const finalName = placeDetails.name && !placeDetails.name.startsWith('http')
        ? placeDetails.name
        : input.name

      const newSource = input.sourceUrl ? {
        name: extractSourceName(input.sourceUrl),
        url: input.sourceUrl,
        excerpt: input.comment || '',
      } : null

      // Check if place already exists by googlePlaceId
      const existingPlace = googlePlaceId 
        ? await db.place.findUnique({ where: { googlePlaceId } })
        : null

      let place
      if (existingPlace) {
        // Update existing place with new source
        const existingSources = (existingPlace.sources as any[]) || []
        const sourceExists = newSource ? existingSources.some(s => s.url === newSource.url) : false
        
        const updatedSources = !sourceExists && newSource
          ? [...existingSources, newSource]
          : existingSources

        place = await db.place.update({
          where: { id: existingPlace.id },
          data: {
            sources: updatedSources,
          },
        })

        updated++
        console.log(`   ↻ Updated existing: ${place.name}`)
      } else {
        // Create new place
        const baseSlug = generatePlaceSlug(finalName, neighborhood ?? undefined)
        const uniqueSlug = await ensureUniqueSlug(baseSlug, async (s) => {
          const exists = await db.place.findUnique({ where: { slug: s } })
          return !!exists
        })

        const sources = newSource ? [newSource] : []

        place = await db.place.create({
          data: {
            slug: uniqueSlug,
            googlePlaceId: googlePlaceId ?? undefined,
            name: finalName,
            address: placeDetails.formattedAddress,
            latitude: placeDetails.location.lat,
            longitude: placeDetails.location.lng,
            phone: placeDetails.formattedPhoneNumber ?? null,
            website: placeDetails.website ?? null,
            googleTypes: placeDetails.types ?? [],
            priceLevel: placeDetails.priceLevel ?? null,
            neighborhood: neighborhood ?? null,
            cuisineType: placeDetails.types ? parseCuisineType(placeDetails.types) ?? null : null,
            category: getSaikoCategory(finalName, placeDetails.types ?? []),
            googlePhotos: placeDetails.photos ? JSON.parse(JSON.stringify(placeDetails.photos)) : undefined,
            hours: placeDetails.openingHours ? JSON.parse(JSON.stringify(placeDetails.openingHours)) : null,
            placesDataCachedAt: new Date(),
            sources: sources.length > 0 ? sources : undefined,
          },
        })

        enriched++
        created++
        console.log(`   ✓ Created: ${place.name}`)
      }

      // Add to map (check if not already on this map)
      const existingMapPlace = await db.mapPlace.findFirst({
        where: {
          mapId: list.id,
          placeId: place.id,
        },
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
      }
    } else {
      failed++
      console.log(`   ⚠ Failed to find`)
    }

    await new Promise((r) => setTimeout(r, 150))
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ IMPORT COMPLETE!\n')
  console.log(`📊 Final Summary:`)
  console.log(`   Total in CSV: ${inputs.length}`)
  console.log(`   Already existed: ${alreadyExists.length}`)
  console.log(`   New places created: ${created}`)
  console.log(`   Existing places updated: ${updated}`)
  console.log(`   Failed to import: ${failed}`)
  console.log(`\n🗺️  View new map: http://localhost:3000/${list.slug}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

function extractSourceName(url: string): string {
  if (url.includes('theinfatuation.com')) return 'The Infatuation'
  if (url.includes('timeout.com')) return 'Time Out'
  if (url.includes('laist.com')) return 'LAist'
  if (url.includes('saveur.com')) return 'Saveur'
  if (url.includes('latimes.com')) return 'LA Times'
  if (url.includes('yelp.com')) return 'Yelp'
  if (url.includes('eater.com')) return 'Eater LA'
  if (url.includes('michelin.com')) return 'Michelin Guide'
  
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)
  } catch {
    return 'Editorial Source'
  }
}

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
