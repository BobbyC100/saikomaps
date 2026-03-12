import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/admin/instagram
 * Fetch places missing Instagram handles for manual backfill
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'tier1';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  try {
    // Build where clause
    const where: any = {
      county: 'Los Angeles',
      instagram_handle: null, // Only null (not marked as NONE)
      google_place_id: { not: null },
      lifecycle_status: 'ACTIVE', // Only show active places
    };

    // Add tier filter
    if (filter === 'tier1' || filter === 'tier2') {
      const tier = filter === 'tier1' ? 1 : 2;
      where.provenance = {
        some: {
          source_tier: tier,
        },
      };
    }

    // Get total count
    const total = await prisma.golden_records.count({ where });

    // Get paginated results
    const places = await prisma.golden_records.findMany({
      where,
      select: {
        canonical_id: true,
        name: true,
        neighborhood: true,
        category: true,
        instagram_handle: true,
        website: true,
        google_place_id: true,
        provenance: {
          select: {
            source_tier: true,
          },
          orderBy: {
            source_tier: 'asc',
          },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    });

    // Flatten provenance
    const formatted = places.map(p => ({
      canonical_id: p.canonical_id,
      name: p.name,
      neighborhood: p.neighborhood,
      category: p.category,
      instagram_handle: p.instagram_handle,
      website: p.website,
      google_place_id: p.google_place_id,
      source_tier: p.provenance[0]?.source_tier,
    }));

    return NextResponse.json({
      places: formatted,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('[Instagram API] Failed to fetch places:', error);
    return NextResponse.json(
      { error: 'Failed to fetch places' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * POST /api/admin/instagram
 * Update Instagram handle for a place or mark as "no Instagram"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { canonical_id, instagram_handle, no_instagram } = body;

    console.log('[Instagram API] Received request:', { canonical_id, instagram_handle, no_instagram });

    if (!canonical_id || (instagram_handle === undefined && !no_instagram)) {
      console.error('[Instagram API] Missing parameters');
      return NextResponse.json(
        { error: 'Missing canonical_id or instagram_handle' },
        { status: 400 }
      );
    }

    // Handle "no Instagram" marking
    if (no_instagram) {
      const updated = await prisma.golden_records.update({
        where: { canonical_id },
        data: {
          instagram_handle: 'NONE', // Special marker
          updated_at: new Date(),
        },
      });

      console.log('[Instagram API] Marked as no Instagram:', {
        name: updated.name,
      });

      return NextResponse.json({
        success: true,
        no_instagram: true,
        canonical_id,
      });
    }

    // Extract handle from URL or @ prefix
    let cleanHandle = instagram_handle.trim();
    
    // Handle full Instagram URLs
    if (cleanHandle.includes('instagram.com/')) {
      const match = cleanHandle.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      if (match) {
        cleanHandle = match[1];
      }
    }
    
    // Remove @ if present
    cleanHandle = cleanHandle.replace(/^@/, '');
    
    // Remove trailing slash if present
    cleanHandle = cleanHandle.replace(/\/$/, '');
    
    if (!/^[a-zA-Z0-9._]+$/.test(cleanHandle)) {
      console.error('[Instagram API] Invalid handle format:', cleanHandle);
      return NextResponse.json(
        { error: `Invalid Instagram handle format. Got: "${cleanHandle}". Use format: username or @username or https://instagram.com/username` },
        { status: 400 }
      );
    }

    // Update the place
    const updated = await prisma.golden_records.update({
      where: { canonical_id },
      data: {
        instagram_handle: cleanHandle,
        updated_at: new Date(),
      },
    });

    console.log('[Instagram API] Successfully updated:', {
      name: updated.name,
      instagram_handle: cleanHandle,
    });

    return NextResponse.json({
      success: true,
      instagram_handle: cleanHandle,
      canonical_id,
    });
  } catch (error: any) {
    console.error('[Instagram API] Failed to update:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update Instagram handle' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
