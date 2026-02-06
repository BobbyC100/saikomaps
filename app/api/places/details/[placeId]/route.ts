/**
 * API Route: Place Details
 * GET /api/places/details/[placeId]
 * Get detailed information about a specific place
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPlaceDetails } from '@/lib/google-places'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  try {
    const { placeId } = await params

    if (!placeId) {
      return NextResponse.json(
        { error: 'Place ID is required' },
        { status: 400 }
      )
    }

    const placeDetails = await getPlaceDetails(placeId)

    if (!placeDetails) {
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: placeDetails,
    })
  } catch (error) {
    console.error('Error fetching place details:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch place details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

