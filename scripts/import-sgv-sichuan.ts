/**
 * Script: Import SGV Sichuan/Chongqing restaurants
 * Imports places from CSV with Source URLs and creates a new map
 */

import { db } from '@/lib/db'
import { searchPlace, getPlaceDetails, getNeighborhoodFromPlaceDetails, getNeighborhoodFromCoords } from '@/lib/google-places'
import { generateSlug } from '@/lib/utils'
import { extractPlaceId } from '@/lib/utils/googleMapsParser'
import { generatePlaceSlug, ensureUniqueSlug } from '@/lib/place-slug'
import { getSaikoCategory, parseCuisineType } from '@/lib/categoryMapping'
import fs from 'fs'

const CSV_PATH = '/Users/bobbyciccaglione/Downloads/sgv-sichuan.csv'
const USER_ID = 'demo-user-id'

type PlaceInput = {
  name: string
  address?: string
  comment?: string
  url?: string
  sourceUrl?: string
}

async function main() {
  console.log('🌶️  Starting SGV Sichuan Import...\n')

  // Read and parse CSV - manually handle since some URLs have unquoted commas
  console.log('📄 Reading CSV file...')
  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8')
  const lines = fileContent.split('\n').filter(line => line.trim())
  
  const inputs: PlaceInput[] = []
  
  // Parse header
  const header = lines[0]
  console.log(`📋 Header: ${header}`)
  
  // Parse each data line manually
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    
    // Manual parsing: split by comma but respect quoted fields
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
    fields.push(currentField.trim()) // Add last field
    
    if (fields.length < 3) continue // Need at least Name, Address, Comment
    
    const name = fields[0]
    const address = fields[1]
    const comment = fields[2]
    // Join remaining fields as source URL (in case URL has commas)
    const sourceUrl = fields.slice(3).join(',')
    
    if (!name || name.trim() === '') continue
    
    inputs.push({
      name: name.trim(),
      address: address?.trim() || undefined,
      comment: comment?.trim() || undefined,
      url: undefined,
      sourceUrl: sourceUrl?.trim() || undefined,
    })
  }

  console.log(`✅ Found ${inputs.length} places in CSV\n`)

  // Create the list
  console.log('📋 Creating map...')
  const listTitle = 'SGV Sichuan & Chongqing'
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
  console.log(`   ID: ${list.id}`)
  console.log(`   Slug: ${list.slug}`)
  console.log(`   URL: http://localhost:3000/${list.slug}\n`)

  // Import places
  console.log('🔍 Starting place enrichment...\n')
  
  let enriched = 0
  let failed = 0
  let created = 0
  let existing = 0
  let addedToMap = 0

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
    let place = googlePlaceId ? await db.places.findUnique({ where: { googlePlaceId } }) : null

    if (!place) {
      // Create new place
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
        const exists = await db.places.findUnique({ where: { slug: s } })
        return !!exists
      })

      // Parse editorial sources from comment
      const sources = input.sourceUrl ? [
        {
          name: extractSourceName(input.sourceUrl),
          url: input.sourceUrl,
          excerpt: input.comment || '',
        }
      ] : []

      place = await db.places.create({
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
          sources: sources.length > 0 ? sources : undefined,
        },
      })

      created++
      if (placeDetails) {
        enriched++
        console.log(`   ✓ Created & enriched: ${place.name}`)
        if (neighborhood) console.log(`     Neighborhood: ${neighborhood}`)
        if (place.category) console.log(`     Category: ${place.category}`)
        if (input.sourceUrl) console.log(`     Source: ${extractSourceName(input.sourceUrl)}`)
      } else {
        failed++
        console.log(`   ⚠ Created but NOT enriched: ${place.name}`)
      }
    } else {
      existing++
      // Update existing place with editorial sources if not already present
      const existingSources = (place.sources as any[]) || []
      const newSource = input.sourceUrl ? {
        name: extractSourceName(input.sourceUrl),
        url: input.sourceUrl,
        excerpt: input.comment || '',
      } : null

      if (newSource && !existingSources.some((s: any) => s.url === newSource.url)) {
        place = await db.places.update({
          where: { id: place.id },
          data: {
            sources: [...existingSources, newSource],
          },
        })
        console.log(`   ↻ Updated place with new source: ${place.name}`)
        console.log(`     Added source: ${extractSourceName(input.sourceUrl!)}`)
      } else {
        console.log(`   ↻ Place already exists: ${place.name}`)
      }
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
      addedToMap++
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
  console.log(`   Already existed: ${existing}`)
  console.log(`   Successfully enriched: ${enriched}`)
  console.log(`   Failed to enrich: ${failed}`)
  console.log(`   Added to map: ${addedToMap}`)
  console.log(`   Success rate: ${Math.round((enriched / inputs.length) * 100)}%`)
  console.log(`\n🗺️  View your map: http://localhost:3000/${list.slug}`)
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
  if (url.includes('dnyuz.com')) return 'LA Times'
  
  // Default: extract domain
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
