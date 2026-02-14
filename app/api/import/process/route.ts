/**
 * API Route: Process Import
 * POST /api/import/process
 * Create list and enrich locations with Google Places API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { processImportSchema } from '@/lib/validations'
import { searchPlace, getPlaceDetails, getNeighborhoodFromPlaceDetails, getNeighborhoodFromCoords } from '@/lib/google-places'
import { generateSlug } from '@/lib/utils'
import { extractPlaceId } from '@/lib/utils/googleMapsParser'

function getUserId(session: { user?: { id?: string } } | null): string | null {
  if (session?.user?.id) return session.user.id
  if (process.env.NODE_ENV === 'development') return 'demo-user-id'
  return null
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = getUserId(session)

    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    console.log('[IMPORT] Received request:', {
      listTitle: body.listTitle,
      templateType: body.templateType,
      locationCount: body.locations?.length || 0,
      firstLocation: body.locations?.[0],
    })
    
    // Validate input
    const validation = processImportSchema.safeParse(body)
    if (!validation.success) {
      console.error('[IMPORT] Validation failed:', validation.error.errors)
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { listTitle, templateType, locations } = validation.data
    
    console.log('[IMPORT] Validated data:', {
      listTitle,
      templateType,
      locationCount: locations.length,
      sampleLocation: locations[0],
    })

    // Create the list (auto-published)
    const slug = generateSlug(listTitle)
    const list = await db.lists.create({
      data: {
        userId,
        title: listTitle,
        slug: `${slug}-${Date.now()}`, // Add timestamp to ensure uniqueness
        templateType,
        accessLevel: 'public', // Public by default
        published: true, // Auto-publish
      },
    })
    
    console.log('[IMPORT] Created list:', {
      listId: list.id,
      slug: list.slug,
      title: list.title,
    })

    // Create import job
    const importJob = await db.importJob.create({
      data: {
        userId,
        listId: list.id,
        status: 'processing',
        totalLocations: locations.length,
        processedLocations: 0,
        failedLocations: 0,
      },
    })
    
    console.log('[IMPORT] Created import job:', {
      importJobId: importJob.id,
      listId: list.id,
      totalLocations: locations.length,
    })

    // Create basic locations synchronously FIRST (so they're available immediately)
    console.log('[IMPORT] Creating basic locations synchronously...')
    const createdLocations = []
    
    for (let i = 0; i < locations.length; i++) {
      const location = locations[i]
      
      // Clean the name
      let cleanName = location.name?.trim() || ''
      if (cleanName.startsWith('http')) {
        const urlMatch = cleanName.match(/\/place\/([^/?]+)/)
        if (urlMatch) {
          cleanName = decodeURIComponent(urlMatch[1].replace(/\+/g, ' '))
        } else {
          cleanName = 'Untitled Location'
        }
      }
      if (!cleanName || cleanName.length === 0) {
        cleanName = 'Untitled Location'
      }
      
      // Clean address
      const cleanAddress = location.address && !location.address.startsWith('http')
        ? location.address.trim()
        : null
      
      try {
        const created = await db.locations.create({
          data: {
            listId: list.id,
            name: cleanName,
            address: cleanAddress,
            userNote: location.comment?.trim() || null,
            orderIndex: i,
          },
        })
        createdLocations.push(created)
        console.log(`[IMPORT] Created basic location ${i + 1}/${locations.length}:`, created.id, cleanName)
      } catch (error) {
        console.error(`[IMPORT] Failed to create location ${i + 1}:`, error)
      }
    }
    
    console.log('[IMPORT] Created', createdLocations.length, 'basic locations')

    // Enrich locations synchronously (for MVP - ensures coordinates are available)
    console.log('[IMPORT] Starting synchronous enrichment...')
    const enrichmentResult = await enrichLocationsSync(list.id, locations, importJob.id)
    console.log('[IMPORT] Enrichment complete:', enrichmentResult)
    
    // Continue enrichment in background for any remaining locations
    if (enrichmentResult.remaining > 0) {
      console.log('[IMPORT] Starting background enrichment for', enrichmentResult.remaining, 'remaining locations...')
      const remainingLocations = locations.slice(enrichmentResult.enriched)
      processLocationsAsync(importJob.id, list.id, remainingLocations, enrichmentResult.enriched).catch((error) => {
        console.error('[IMPORT] Background enrichment failed:', error)
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        listId: list.id,
        importJobId: importJob.id,
        slug: list.slug,
      },
    })
  } catch (error) {
    console.error('Error processing import:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process import',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// ============================================
// SYNC ENRICHMENT (for MVP - ensures coordinates available immediately)
// ============================================

async function enrichLocationsSync(
  listId: string,
  locations: Array<{ name: string; address?: string; comment?: string; url?: string }>,
  importJobId: string
): Promise<{ enriched: number; remaining: number }> {
  console.log('[ENRICH SYNC] Starting sync enrichment for', locations.length, 'locations')
  
  // Check if Google Places API key is available
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.warn('[ENRICH SYNC] GOOGLE_PLACES_API_KEY not set! Skipping enrichment.')
    return { enriched: 0, remaining: locations.length }
  }
  
  // Get existing locations
  const existingLocations = await db.locations.findMany({
    where: { listId },
    orderBy: { orderIndex: 'asc' },
  })
  
  if (existingLocations.length === 0) {
    console.warn('[ENRICH SYNC] No existing locations found!')
    return { enriched: 0, remaining: locations.length }
  }
  
  let enriched = 0
  const maxSyncEnrichment = Math.min(30, locations.length) // Enrich first 30 synchronously
  
  console.log(`[ENRICH SYNC] Will enrich ${maxSyncEnrichment} locations synchronously`)
  
  for (let i = 0; i < maxSyncEnrichment; i++) {
    const location = locations[i]
    const existingLocation = existingLocations[i]
    
    if (!existingLocation) continue
    
    try {
      // Try to enrich this location
      let placeDetails = null
      let placeId: string | null = null
      
      // Strategy 1: Extract place ID from URL
      if (location.url) {
        placeId = extractPlaceId(location.url)
        if (placeId && !placeId.startsWith('cid:')) {
          try {
            placeDetails = await getPlaceDetails(placeId)
          } catch (e) {
            console.log(`[ENRICH SYNC] Failed to get details for place_id ${placeId}, trying search...`)
          }
        }
      }
      
      // Strategy 2: Text search
      if (!placeDetails) {
        const cleanName = location.name?.trim() || existingLocation.name
        const cleanAddress = location.address && !location.address.startsWith('http')
          ? location.address
          : undefined
        
        const searchQuery = cleanAddress
          ? `${cleanName}, ${cleanAddress}`
          : cleanName
        
        try {
          const searchResults = await searchPlace(searchQuery, { maxResults: 1 })
          if (searchResults.length > 0) {
            placeId = searchResults[0].placeId
            placeDetails = await getPlaceDetails(placeId)
          }
        } catch (e) {
          console.log(`[ENRICH SYNC] Search failed for ${cleanName}:`, e)
        }
      }
      
      // Update location with enriched data
      if (placeDetails) {
        const lat = typeof placeDetails.location.lat === 'number' 
          ? placeDetails.location.lat 
          : parseFloat(String(placeDetails.location.lat))
        const lng = typeof placeDetails.location.lng === 'number' 
          ? placeDetails.location.lng 
          : parseFloat(String(placeDetails.location.lng))
        
        const finalName = placeDetails.name && !placeDetails.name.startsWith('http')
          ? placeDetails.name
          : existingLocation.name
        
        const finalAddress = placeDetails.formattedAddress && !placeDetails.formattedAddress.startsWith('http')
          ? placeDetails.formattedAddress
          : existingLocation.address
        
        const neighborhood =
          getNeighborhoodFromPlaceDetails(placeDetails) ??
          (!Number.isNaN(lat) && !Number.isNaN(lng) ? await getNeighborhoodFromCoords(lat, lng) : null)
        
        await db.locations.update({
          where: { id: existingLocation.id },
          data: {
            googlePlaceId: placeId,
            name: finalName,
            address: finalAddress,
            latitude: !Number.isNaN(lat) ? lat : null,
            longitude: !Number.isNaN(lng) ? lng : null,
            phone: placeDetails.formattedPhoneNumber || null,
            website: placeDetails.website || null,
            googleTypes: placeDetails.types || [],
            priceLevel: placeDetails.priceLevel ?? null,
            neighborhood: neighborhood ?? null,
            hours: placeDetails.openingHours ? JSON.parse(JSON.stringify(placeDetails.openingHours)) : null,
            googlePhotos: placeDetails.photos ? JSON.parse(JSON.stringify(placeDetails.photos)) : null,
            placesDataCachedAt: new Date(),
          },
        })
        
        enriched++
        console.log(`[ENRICH SYNC] Enriched ${i + 1}/${maxSyncEnrichment}:`, existingLocation.name)
      }
      
      // Update progress every 5 locations
      if ((i + 1) % 5 === 0) {
        await db.importJob.update({
          where: { id: importJobId },
          data: {
            processedLocations: i + 1,
          },
        })
      }
      
      // Rate limiting: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error(`[ENRICH SYNC] Error enriching location ${i + 1}:`, error)
    }
  }
  
  console.log(`[ENRICH SYNC] Enriched ${enriched}/${maxSyncEnrichment} locations synchronously`)
  return { enriched: maxSyncEnrichment, remaining: locations.length - maxSyncEnrichment }
}

// ============================================
// ASYNC PROCESSING (for remaining locations)
// ============================================

async function processLocationsAsync(
  importJobId: string,
  listId: string,
  locations: Array<{ name: string; address?: string; comment?: string; url?: string }>,
  startIndex: number = 0
) {
  console.log('[IMPORT ASYNC] Starting enrichment:', {
    importJobId,
    listId,
    locationCount: locations.length,
    startIndex,
  })
  
  // Check if Google Places API key is available
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.warn('[IMPORT ASYNC] GOOGLE_PLACES_API_KEY not set! Skipping enrichment.')
    return
  }
  
  // Get existing locations for this list (created synchronously)
  const existingLocations = await db.locations.findMany({
    where: { listId },
    orderBy: { orderIndex: 'asc' },
  })
  
  console.log('[IMPORT ASYNC] Found', existingLocations.length, 'existing locations to enrich')
  
  const errorLog: any[] = []
  let processed = 0
  let failed = 0

  for (let i = 0; i < locations.length; i++) {
    const location = locations[i]
    const locationIndex = startIndex + i
    const existingLocation = existingLocations[locationIndex]
    
    if (!existingLocation) {
      console.warn(`[IMPORT ASYNC] No existing location found for index ${locationIndex}`)
      failed++
      processed++
      continue
    }
    
    console.log(`[IMPORT ASYNC] Enriching location ${i + 1}/${locations.length} (index ${locationIndex}):`, {
      locationId: existingLocation.id,
      name: location.name,
      hasAddress: !!location.address,
      hasUrl: !!location.url,
    })
    try {
      // Clean the name - ensure it's not empty or a URL
      let cleanName = location.name?.trim() || ''
      
      // If name is a URL, try to extract a meaningful name from it
      if (cleanName.startsWith('http')) {
        // Try to extract name from URL path (e.g., "Ocean+Shape" from URL)
        const urlMatch = cleanName.match(/\/place\/([^/?]+)/)
        if (urlMatch) {
          cleanName = decodeURIComponent(urlMatch[1].replace(/\+/g, ' '))
        } else {
          // If we can't extract a name, skip this location
        errorLog.push({
          location: cleanName,
          error: 'Location name is a URL and cannot be parsed',
        })
        failed++
        processed++
        continue
        }
      }
      
      // Final check - ensure we have a valid name
      if (!cleanName || cleanName.length === 0) {
        cleanName = 'Untitled Location'
      }

      let placeDetails = null
      let placeId: string | null = null

      // Strategy 1: Try to extract place ID from URL if available
      if (location.url) {
        placeId = extractPlaceId(location.url)
        if (placeId && !placeId.startsWith('cid:')) {
          // Only use place_id format, not CID
          try {
            placeDetails = await getPlaceDetails(placeId)
          } catch (e) {
            console.log(`Failed to get details for place_id ${placeId}, trying search...`)
          }
        }
      }

      // Strategy 2: If URL extraction failed, try text search
      if (!placeDetails) {
        // Clean address - don't use URL as address
        const cleanAddress = location.address && !location.address.startsWith('http') 
          ? location.address 
          : undefined

        const searchQuery = cleanAddress 
          ? `${cleanName}, ${cleanAddress}`
          : cleanName

        try {
          const searchResults = await searchPlace(searchQuery, { maxResults: 1 })
          
          if (searchResults.length > 0) {
            placeId = searchResults[0].placeId
            placeDetails = await getPlaceDetails(placeId)
          }
        } catch (e) {
          console.log(`Search failed for ${cleanName}:`, e)
        }
      }

      if (placeDetails) {
        // Update existing location with enriched data
        // Ensure coordinates are valid numbers
        const lat = typeof placeDetails.location.lat === 'number' ? placeDetails.location.lat : parseFloat(String(placeDetails.location.lat))
        const lng = typeof placeDetails.location.lng === 'number' ? placeDetails.location.lng : parseFloat(String(placeDetails.location.lng))
        
        // Ensure name is not empty and not a URL
        const finalName = placeDetails.name && !placeDetails.name.startsWith('http')
          ? placeDetails.name
          : existingLocation.name
        
        // Ensure address is not a URL
        const finalAddress = placeDetails.formattedAddress && !placeDetails.formattedAddress.startsWith('http')
          ? placeDetails.formattedAddress
          : existingLocation.address

        const neighborhood =
          getNeighborhoodFromPlaceDetails(placeDetails) ??
          (!Number.isNaN(lat) && !Number.isNaN(lng) ? await getNeighborhoodFromCoords(lat, lng) : null)

        const enrichedLocation = await db.locations.update({
          where: { id: existingLocation.id },
          data: {
            googlePlaceId: placeId,
            name: finalName,
            address: finalAddress,
            latitude: !Number.isNaN(lat) ? lat : null,
            longitude: !Number.isNaN(lng) ? lng : null,
            phone: placeDetails.formattedPhoneNumber || null,
            website: placeDetails.website || null,
            googleTypes: placeDetails.types || [],
            priceLevel: placeDetails.priceLevel ?? null,
            neighborhood: neighborhood ?? null,
            hours: placeDetails.openingHours ? JSON.parse(JSON.stringify(placeDetails.openingHours)) : null,
            description: null, // PlaceDetails doesn't have description field
            googlePhotos: placeDetails.photos ? JSON.parse(JSON.stringify(placeDetails.photos)) : null,
            placesDataCachedAt: new Date(),
          },
        })
        
        console.log(`[IMPORT ASYNC] Enriched location:`, {
          locationId: enrichedLocation.id,
          name: enrichedLocation.name,
          listId: enrichedLocation.listId,
          hasCoordinates: !!(enrichedLocation.latitude && enrichedLocation.longitude),
        })
      } else {
        // No place found - location already exists from sync creation, just log
        console.log(`[IMPORT ASYNC] No enrichment found for location:`, {
          locationId: existingLocation.id,
          name: existingLocation.name,
        })
        
        errorLog.push({
          location: existingLocation.name,
          error: 'Place not found in Google Places',
        })
        failed++
      }

      processed++

      // Update progress
      await db.importJob.update({
        where: { id: importJobId },
        data: {
          processedLocations: processed,
          failedLocations: failed,
        },
      })

      // Rate limiting: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error(`Error processing location ${location.name}:`, error)
      
      errorLog.push({
        location: location.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      
      failed++
      processed++
      
      // Location already exists from sync creation, just log the error
      console.error(`[IMPORT ASYNC] Error enriching location ${existingLocation?.id}:`, error)
    }
  }

  // Mark import job as complete
  await db.importJob.update({
    where: { id: importJobId },
    data: {
      status: failed === locations.length ? 'failed' : 'completed',
      processedLocations: processed,
      failedLocations: failed,
      completedAt: new Date(),
      errorLog: errorLog.length > 0 ? errorLog : undefined,
    },
  })
  
  // Verify locations were created
  const createdLocations = await db.locations.findMany({
    where: { listId },
    select: { id: true, name: true },
  })
  
  console.log('[IMPORT ASYNC] Processing complete:', {
    importJobId,
    listId,
    processed,
    failed,
    totalCreated: createdLocations.length,
    createdLocationNames: createdLocations.map(l => l.name).slice(0, 5),
  })
  
  if (createdLocations.length === 0) {
    console.error('[IMPORT ASYNC] WARNING: No locations were created!', {
      listId,
      locationsReceived: locations.length,
      processed,
      failed,
    })
  }
}

