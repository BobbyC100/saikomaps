/**
 * API Route: Place Canonical Data
 * GET /api/places/[slug]
 * 
 * Returns customer-facing canonical place data for the merchant/place page.
 * 
 * Features:
 * - Canonical fields only (no discovered_* staging data)
 * - Trust-first editorial content (Saiko summary, coverage, curator notes)
 * - New crawler-sourced URLs (menu, winelist, about)
 * - Hours freshness tracking (internal hours refresh signal, QA-only)
 * - Filtered Google attributes (no Yelp-ish noise)
 * - City-gated (LA only for now)
 * - Runtime forbidden-field guard (prevents evidence leakage)
 * 
 * @see docs/API-CONTRACT-PLACE-CANONICAL.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlaceCanonical } from '@/lib/places/get-place-canonical';
import { requireActiveCityId } from '@/lib/active-city';

const FORBIDDEN_PREFIXES = ['discovered_'];

const FORBIDDEN_KEYS = [
  // staging/evidence
  'discoveredFieldsEvidence',
  'discoveredFieldsFetchedAt',

  // common raw/vendored fields we never want to leak
  'googlePlaceId',
  'googlePlacesAttributes',     // raw
  'google_places_attributes',   // raw
];

function assertCustomerSafe(payload: unknown) {
  const walk = (v: any) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) return v.forEach(walk);

    for (const key of Object.keys(v)) {
      for (const prefix of FORBIDDEN_PREFIXES) {
        if (key.startsWith(prefix)) {
          throw new Error(`Forbidden field leaked to customer API: ${key}`);
        }
      }
      if (FORBIDDEN_KEYS.includes(key)) {
        throw new Error(`Forbidden field leaked to customer API: ${key}`);
      }
      walk(v[key]);
    }
  };

  walk(payload);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Validate slug parameter
    // ─────────────────────────────────────────────────────────────────────────
    const { slug } = await params;

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Place slug is required' 
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Get active city ID (LA-gated for now)
    // ─────────────────────────────────────────────────────────────────────────
    let cityId: string;
    
    try {
      cityId = await requireActiveCityId();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Active city context is required',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Fetch canonical place data
    // ─────────────────────────────────────────────────────────────────────────
    const place = await getPlaceCanonical(slug, cityId);

    if (!place) {
      return NextResponse.json(
        {
          success: false,
          error: 'Place not found',
        },
        { status: 404 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Assert no forbidden fields leaked
    // ─────────────────────────────────────────────────────────────────────────
    assertCustomerSafe(place);

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Return successful response
    // ─────────────────────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        data: place,
      },
      {
        status: 200,
        headers: {
          // Cache for 5 minutes on CDN
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    // ─────────────────────────────────────────────────────────────────────────
    // 6. Error handling
    // ─────────────────────────────────────────────────────────────────────────
    console.error('Error fetching place canonical data:', error);

    // Don't expose internal error details to client
    const isDevelopment = process.env.NODE_ENV === 'development';

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch place',
        ...(isDevelopment && {
          details: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 }
    );
  }
}
