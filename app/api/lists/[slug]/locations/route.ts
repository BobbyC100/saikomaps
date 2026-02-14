/**
 * API Route: List Locations
 * GET  /api/lists/[slug]/locations  -> returns list places (map_places joined to places)
 * POST /api/lists/[slug]/locations  -> add a place to list (find-or-create Place, create MapPlace)
 *
 * POST JSON body:
 * {
 *   "googlePlaceId"?: string,
 *   "url"?: string,
 *   "name"?: string,
 *   "address"?: string,
 *   "comment"?: string,
 *   "orderIndex"?: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

import { extractPlaceId } from '@/lib/utils/googleMapsParser';
import { searchPlace, getPlaceDetails, getNeighborhoodFromPlaceDetails, getNeighborhoodFromCoords } from '@/lib/google-places';
import { generatePlaceSlug, ensureUniqueSlug } from '@/lib/place-slug';
import { getSaikoCategory, parseCuisineType } from '@/lib/categoryMapping';

type Params = { params: Promise<{ slug: string }> };

function getUserId(session: { user?: { id?: string } } | null): string | null {
  if (session?.user?.id) return session.user.id;
  if (process.env.NODE_ENV === 'development') return 'demo-user-id';
  return null;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;

    const list = await db.lists.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        accessLevel: true,
        published: true,
      },
    });

    if (!list) return NextResponse.json({ error: 'Map not found' }, { status: 404 });

    const locations = await db.map_places.findMany({
      where: { mapId: list.id },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        orderIndex: true,
        userNote: true,
        places: {
          select: {
            id: true,
            slug: true,
            name: true,
            neighborhood: true,
            category: true,
            cuisineType: true,
            priceLevel: true,
            photoUrl: true,
            googlePlaceId: true,
            latitude: true,
            longitude: true,
            address: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: { list, locations } });
  } catch (error) {
    console.error('[LIST/LOCATIONS] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load locations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) return NextResponse.json({ error: 'User authentication required' }, { status: 401 });

    const { slug } = await params;

    const list = await db.lists.findUnique({
      where: { slug },
      select: { id: true, userId: true },
    });
    if (!list) return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    if (list.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = (await request.json().catch(() => null)) as null | {
      googlePlaceId?: string;
      url?: string;
      name?: string;
      address?: string;
      comment?: string;
      orderIndex?: number;
    };

    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    let googlePlaceId = (body.googlePlaceId || '').trim() || null;
    if (!googlePlaceId && body.url) {
      const extracted = extractPlaceId(body.url);
      googlePlaceId = extracted && !extracted.startsWith('cid:') ? extracted : null;
    }

    let cleanName = (body.name || '').trim();
    if (!cleanName) cleanName = 'Untitled Place';

    let placeDetails: any = null;

    if (googlePlaceId) {
      try {
        placeDetails = await getPlaceDetails(googlePlaceId);
      } catch {
        // fall through
      }
    }

    if (!placeDetails && process.env.GOOGLE_PLACES_API_KEY) {
      const cleanAddress = body.address && !body.address.startsWith('http') ? body.address : undefined;
      const searchQuery = cleanAddress ? `${cleanName}, ${cleanAddress}` : cleanName;

      try {
        const results = await searchPlace(searchQuery, { maxResults: 1 });
        if (results.length > 0) {
          googlePlaceId = results[0].placeId;
          placeDetails = await getPlaceDetails(googlePlaceId);
        }
      } catch {
        // unresolved
      }
    }

    let place = googlePlaceId ? await db.places.findUnique({ where: { googlePlaceId } }) : null;

    if (!place) {
      const neighborhood = placeDetails
        ? (getNeighborhoodFromPlaceDetails(placeDetails) ??
            (!Number.isNaN(placeDetails.location?.lat) && !Number.isNaN(placeDetails.location?.lng)
              ? await getNeighborhoodFromCoords(placeDetails.location.lat, placeDetails.location.lng)
              : null))
        : null;

      const finalName =
        placeDetails?.name && !placeDetails.name.startsWith('http') ? placeDetails.name : cleanName;

      const basePlaceSlug = generatePlaceSlug(finalName, neighborhood ?? undefined);
      const placeSlug = await ensureUniqueSlug(basePlaceSlug, async (s) => {
        const exists = await db.places.findUnique({ where: { slug: s } });
        return !!exists;
      });

      place = await db.places.create({
        data: {
          id: randomUUID(),
          slug: placeSlug,
          googlePlaceId: googlePlaceId ?? undefined,
          name: finalName,
          address:
            placeDetails?.formattedAddress ??
            (body.address && !body.address.startsWith('http') ? body.address : null),
          latitude: placeDetails?.location ? placeDetails.location.lat : null,
          longitude: placeDetails?.location ? placeDetails.location.lng : null,
          phone: placeDetails?.formattedPhoneNumber ?? null,
          website: placeDetails?.website ?? null,
          googleTypes: placeDetails?.types ?? [],
          priceLevel: placeDetails?.priceLevel ?? null,
          neighborhood: neighborhood ?? null,
          cuisineType: placeDetails?.types ? parseCuisineType(placeDetails.types) ?? null : null,
          category: getSaikoCategory(finalName, placeDetails?.types ?? []),
          googlePhotos: placeDetails?.photos ? JSON.parse(JSON.stringify(placeDetails.photos)) : undefined,
          hours: placeDetails?.openingHours ? JSON.parse(JSON.stringify(placeDetails.openingHours)) : null,
        },
      });
    }

    const existing = await db.map_places.findUnique({
      where: { mapId_placeId: { mapId: list.id, placeId: place.id } },
    });
    if (existing) {
      return NextResponse.json({ success: true, data: { mapPlaceId: existing.id, alreadyExists: true } });
    }

    let orderIndex = typeof body.orderIndex === 'number' ? body.orderIndex : null;
    if (orderIndex === null) {
      const last = await db.map_places.findFirst({
        where: { mapId: list.id },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });
      orderIndex = (last?.orderIndex ?? -1) + 1;
    }

    const mapPlace = await db.map_places.create({
      data: {
        id: randomUUID(),
        mapId: list.id,
        placeId: place.id,
        userNote: body.comment?.trim() || null,
        orderIndex,
        updatedAt: new Date(),
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, data: { mapPlaceId: mapPlace.id, alreadyExists: false } });
  } catch (error) {
    console.error('[LIST/LOCATIONS] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add location', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}