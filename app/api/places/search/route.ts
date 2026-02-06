/**
 * API Route: Places Search
 * GET /api/places/search?query=...
 * Search for places using Google Places API
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchPlace } from '@/lib/google-places'
import { placeSearchSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('query')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')

    // Validate input
    const validation = placeSearchSchema.safeParse({
      query,
      locationBias: lat && lng ? {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      } : undefined,
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { query: searchQuery, locationBias } = validation.data

    // Search places
    const results = await searchPlace(searchQuery, {
      locationBias,
      maxResults: 10,
    })

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error('Error searching places:', error)
    return NextResponse.json(
      { 
        error: 'Failed to search places',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

