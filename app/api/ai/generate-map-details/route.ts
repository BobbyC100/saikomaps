/**
 * POST /api/ai/generate-map-details (ADMIN ONLY)
 * SaikoAI: Generate map metadata (title, description, scope) from places.
 * Auth: Requires admin authentication.
 * Rate limit: 10 requests per hour per admin user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { generateMapDetails } from '@/lib/saikoai/generate-map-details';
import { SCOPE_PLACE_TYPE_OPTIONS } from '@/lib/mapValidation';
import type { ScopePlaceType } from '@/lib/mapValidation';

const AI_TYPE_TO_SCOPE: Record<string, ScopePlaceType> = {
  coffee: 'Coffee',
  coffeeshop: 'Coffee',
  coffeeshops: 'Coffee',
  cafe: 'Coffee',
  cafes: 'Coffee',
  bakery: 'Bakery',
  bakeries: 'Bakery',
  eat: 'Eat',
  food: 'Eat',
  restaurant: 'Eat',
  restaurants: 'Eat',
  dining: 'Eat',
  meal: 'Eat',
  drinks: 'Drinks',
  wine: 'Wine',
  bar: 'Drinks',
  bars: 'Drinks',
  purveyors: 'Purveyors',
  nature: 'Nature',
  outdoors: 'Nature',
  park: 'Nature',
  shop: 'Shop',
  shopping: 'Shop',
  store: 'Shop',
  stay: 'Stay',
  hotel: 'Stay',
  lodging: 'Stay',
  culture: 'Culture',
  museum: 'Culture',
  arts: 'Culture',
  activity: 'Activity',
  wellness: 'Activity',
  fitness: 'Activity',
};

function mapPlaceTypesToScope(placeTypes: string[]): ScopePlaceType[] {
  const result = new Set<ScopePlaceType>();
  for (const pt of placeTypes) {
    const trimmed = pt.trim();
    // Direct match if AI returns exact SCOPE_PLACE_TYPE_OPTIONS value
    if (SCOPE_PLACE_TYPE_OPTIONS.includes(trimmed as ScopePlaceType)) {
      result.add(trimmed as ScopePlaceType);
      continue;
    }
    const lower = trimmed.toLowerCase();
    const normalized = lower.replace(/\s+/g, '');
    const mapped =
      AI_TYPE_TO_SCOPE[normalized] ??
      AI_TYPE_TO_SCOPE[lower] ??
      (normalized.endsWith('s') ? AI_TYPE_TO_SCOPE[normalized.slice(0, -1)] : null);
    if (mapped && SCOPE_PLACE_TYPE_OPTIONS.includes(mapped)) {
      result.add(mapped);
    }
  }
  return [...result];
}

export async function POST(request: NextRequest) {
  try {
    // Admin-only: AI generation is cost-bearing
    const userId = await requireAdmin();

    // Rate limit: 10 requests per hour per admin user
    const { success, limit, remaining, reset } = await rateLimit(
      `ai-generate:${userId}`,
      RateLimitPresets.AI_GENERATION
    );

    if (!success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          limit,
          remaining: 0,
          reset,
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { places } = body;

    if (!Array.isArray(places) || places.length < 3) {
      return NextResponse.json(
        { error: 'At least 3 places are required' },
        { status: 400 }
      );
    }

    const placeInputs = places.map((p: Record<string, unknown>) => ({
      name: String(p.name ?? ''),
      address: String(p.address ?? ''),
      latitude: Number(p.latitude ?? 0),
      longitude: Number(p.longitude ?? 0),
      types: Array.isArray(p.types) ? (p.types as string[]) : [],
      category: (p.category as string | null) ?? null,
    }));

    const result = await generateMapDetails(placeInputs);
    if (process.env.NODE_ENV === 'development') {
      console.log('[AI generate-map-details] Raw AI result:', JSON.stringify(result, null, 2));
      console.log('[AI generate-map-details] Raw placeTypes from AI:', result.scope.placeTypes);
    }

    const scopePlaceTypes = mapPlaceTypesToScope(result.scope.placeTypes);
    if (process.env.NODE_ENV === 'development') {
      console.log('[AI generate-map-details] Mapped placeTypes:', scopePlaceTypes);
    }

    const responseData = {
      title: result.title,
      description: result.description,
      subtitle: result.description,
      scope: {
        geography: result.scope.geography,
        placeTypes: scopePlaceTypes,
      },
    };
    if (process.env.NODE_ENV === 'development') {
      console.log('[AI generate-map-details] Response data:', JSON.stringify(responseData, null, 2));
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    }, {
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      },
    });
  } catch (error) {
    // If error is a Response (from auth guards), return it directly
    if (error instanceof Response) {
      return error;
    }
    
    console.error('Generate map details error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate map details',
      },
      { status: 500 }
    );
  }
}
