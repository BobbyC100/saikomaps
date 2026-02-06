/**
 * API Route: Import Job Status
 * GET /api/import/status/[jobId]
 * Get the current status of an import job
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    const importJob = await db.importJob.findUnique({
      where: { id: jobId },
      include: {
        list: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    })

    if (!importJob) {
      return NextResponse.json(
        { error: 'Import job not found' },
        { status: 404 }
      )
    }

    // Calculate percentage
    const percentage = importJob.totalLocations
      ? Math.round((importJob.processedLocations / importJob.totalLocations) * 100)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        ...importJob,
        percentage,
      },
    })
  } catch (error) {
    console.error('Error fetching import status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch import status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

