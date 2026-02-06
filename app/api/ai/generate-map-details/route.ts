/**
 * POST /api/ai/generate-map-details
 * SaikoAI: Generate map metadata (title, description, scope) from places.
 * Auth: Requires logged-in session.
 * Rate limit: 10 calls per map per hour (in-memory; resets on deploy).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateMapDetails } from '@/lib/saikoai/generate-map-details';
import { SCOPE_PLACE_TYPE_OPTIONS } from '@/lib/mapValidation';
import type { ScopePlaceType } from '@/lib/mapValidation';

function getUserId(session: { user?: { id?: string } } | null): string | null {
  if (session?.user?.id) return session.user.id;
  if (process.env.NODE_ENV === 'development') return 'demo-user-id';
  return null;
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(mapId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(mapId);
  if (!entry) return true;
  if (now > entry.resetAt) {
    rateLimitMap.delete(mapId);
    return true;
  }
  return entry.count < RATE_LIMIT_MAX;
}

function incrementRateLimit(mapId: string): void {
  const now = Date.now();
  const entry = rateLimitMap.get(mapId);
  if (!entry) {
    rateLimitMap.set(mapId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }
  entry.count++;
}

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
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { places, mapId } = body;

    if (!Array.isArray(places) || places.length < 3) {
      return NextResponse.json(
        { error: 'At least 3 places are required' },
        { status: 400 }
      );
    }

    const rateKey = mapId || `user-${userId}`;
    if (!checkRateLimit(rateKey)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in an hour.' },
        { status: 429 }
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

    incrementRateLimit(rateKey);

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
    });
  } catch (error) {
    console.error('Generate map details error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate map details',
      },
      { status: 500 }
    );
  }
}
