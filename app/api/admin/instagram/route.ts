import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RESERVED_INSTAGRAM_PATHS = new Set([
  'p',
  'reel',
  'reels',
  'stories',
  'explore',
  'tv',
  'ar',
]);

function parseInstagramHandle(input: string): { handle: string | null; invalidUrlPath: boolean } {
  const trimmed = input.trim();
  if (!trimmed) return { handle: null, invalidUrlPath: false };

  if (!trimmed.includes('instagram.com/')) {
    return { handle: trimmed.replace(/^@/, '').replace(/\/$/, '').trim(), invalidUrlPath: false };
  }

  try {
    const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    const segments = url.pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => segment.trim());

    if (segments.length === 0) return { handle: null, invalidUrlPath: true };
    const first = segments[0].toLowerCase();
    if (RESERVED_INSTAGRAM_PATHS.has(first)) {
      return { handle: null, invalidUrlPath: true };
    }

    return { handle: segments[0], invalidUrlPath: false };
  } catch {
    return { handle: null, invalidUrlPath: true };
  }
}

/**
 * GET /api/admin/instagram
 * Fetch places missing Instagram handles for manual backfill.
 * Reads from entities table (Fields v2).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  try {
    const where: any = {
      instagram: null,
      googlePlaceId: { not: null },
      OR: [
        { enrichmentStatus: { in: ['INGESTED', 'ENRICHING', 'ENRICHED'] } },
        { enrichmentStatus: null, status: 'OPEN' },
      ],
      NOT: {
        OR: [
          { operatingStatus: 'PERMANENTLY_CLOSED' },
          { operatingStatus: null, status: 'PERMANENTLY_CLOSED' },
        ],
      },
    };

    const total = await prisma.entities.count({ where });

    const places = await prisma.entities.findMany({
      where,
      select: {
        id: true,
        name: true,
        neighborhood: true,
        category: true,
        instagram: true,
        website: true,
        googlePlaceId: true,
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    });

    // Map to response shape (canonical_id kept for UI backward compat)
    const formatted = places.map(p => ({
      canonical_id: p.id,
      name: p.name,
      neighborhood: p.neighborhood,
      category: p.category,
      instagram_handle: p.instagram,
      website: p.website,
      google_place_id: p.googlePlaceId,
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
 * Update Instagram handle for a place or mark as "no Instagram".
 * Writes to entities.instagram (Fields v2).
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
      const updated = await prisma.entities.update({
        where: { id: canonical_id },
        data: {
          instagram: 'NONE',
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

    // Extract handle from URL or @ prefix; reject non-profile IG URL paths.
    const { handle, invalidUrlPath } = parseInstagramHandle(instagram_handle);
    const cleanHandle = (handle ?? '').replace(/^@/, '').replace(/\/$/, '');

    if (invalidUrlPath) {
      console.error('[Instagram API] Invalid Instagram URL path:', instagram_handle);
      return NextResponse.json(
        { error: 'Invalid Instagram URL path. Use an account profile URL like https://instagram.com/username' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9._]+$/.test(cleanHandle)) {
      console.error('[Instagram API] Invalid handle format:', cleanHandle);
      return NextResponse.json(
        { error: `Invalid Instagram handle format. Got: "${cleanHandle}". Use format: username or @username or https://instagram.com/username` },
        { status: 400 }
      );
    }

    const updated = await prisma.entities.update({
      where: { id: canonical_id },
      data: {
        instagram: cleanHandle,
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
