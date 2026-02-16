/**
 * Debug API Route: List Locations
 * GET /api/debug/locations
 * Returns a list of location IDs for testing
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

function debugEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.DEBUG_ROUTES_ENABLED === 'true';
}

export async function GET() {
  if (!debugEnabled()) {
    return new Response('Not Found', { status: 404 });
  }
  try {
    const locations = await db.locations.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        address: true,
        lists: {
          select: {
            title: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      locations: locations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        address: loc.address,
        mapTitle: loc.lists.title,
        mapSlug: loc.lists.slug,
        url: `/place/${loc.id}`,
      })),
    })
  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch locations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
