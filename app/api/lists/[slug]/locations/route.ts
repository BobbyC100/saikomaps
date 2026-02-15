/**
 * API Route: Add Place to List (Map)
 * POST /api/lists/[slug]/locations
 * Find-or-create Place by googlePlaceId, then create MapPlace
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { getPlaceDetails, getNeighborhoodFromPlaceDetails, getNeighborhoodFromCoords } from '@/lib/google-places';
import { addLocationSchema } from '@/lib/validations';
import { generatePlaceSlug, ensureUniqueSlug } from '@/lib/place-slug';
import { getSaikoCategory, parseCuisineType, ALL_CATEGORIES } from '@/lib/categoryMapping';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const list = await db.lists.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
    });

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = addLocationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { placeId: googlePlaceId, category, userNote, descriptor } = validation.data;

    // 1. Check if MapPlace already exists (place already on this map)
    const existingPlace = await db.places.findUnique({
      where: { googlePlaceId },
    });
    if (existingPlace) {
      const existingMapPlace = await db.mapPlace.findUnique({
        where: {
          mapId_placeId: { mapId: list.id, placeId: existingPlace.id },
        },
      });
      if (existingMapPlace) {
        return NextResponse.json(
          { error: 'This place is already on this map' },
          { status: 409 }
        );
      }
    }

    // 2. Fetch place details from Google
    const placeDetails = await getPlaceDetails(googlePlaceId);
    if (!placeDetails) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }

    // 3. Find or create Place
    let place = existingPlace ?? null;
    if (!place) {
      const neighborhood =
        getNeighborhoodFromPlaceDetails(placeDetails) ??
        (await getNeighborhoodFromCoords(
          placeDetails.location.lat,
          placeDetails.location.lng
        ));
      const baseSlug = generatePlaceSlug(placeDetails.name, neighborhood ?? undefined);
      const slugValue = await ensureUniqueSlug(baseSlug, async (s) => {
        const exists = await db.places.findUnique({ where: { slug: s } });
        return !!exists;
      });

      const now = new Date();
      place = await db.places.create({
        data: {
          id: randomUUID(),
          slug: slugValue,
          googlePlaceId,
          name: placeDetails.name,
          address: placeDetails.formattedAddress,
          latitude: placeDetails.location.lat,
          longitude: placeDetails.location.lng,
          phone: placeDetails.formattedPhoneNumber,
          website: placeDetails.website,
          description: null,
          googleTypes: placeDetails.types || [],
          priceLevel: placeDetails.priceLevel ?? null,
          neighborhood: neighborhood ?? null,
          cuisineType: parseCuisineType(placeDetails.types || []) ?? null,
          category: (category && ALL_CATEGORIES.includes(category as any)) ? category : getSaikoCategory(placeDetails.name, placeDetails.types || []),
          googlePhotos: placeDetails.photos
            ? JSON.parse(JSON.stringify(placeDetails.photos))
            : null,
          hours: placeDetails.openingHours
            ? JSON.parse(JSON.stringify(placeDetails.openingHours))
            : null,
          placesDataCachedAt: now,
          updatedAt: now,
        },
      });
    } else {
      // Refresh missing neighborhood/cuisineType/priceLevel from Google when adding existing place
      const needsNeighborhood = place.neighborhood == null;
      const needsCuisineType = place.cuisineType == null;
      const needsPriceLevel = place.priceLevel == null && placeDetails.priceLevel != null;
      if (needsNeighborhood || needsCuisineType || needsPriceLevel) {
        const neighborhood =
          needsNeighborhood
            ? getNeighborhoodFromPlaceDetails(placeDetails) ??
              (await getNeighborhoodFromCoords(
                placeDetails.location.lat,
                placeDetails.location.lng
              ))
            : undefined;
        const cuisineType = needsCuisineType ? parseCuisineType(placeDetails.types || []) ?? null : undefined;
        const priceLevel = needsPriceLevel ? placeDetails.priceLevel ?? null : undefined;
        place = await db.places.update({
          where: { id: place.id },
          data: {
            ...(neighborhood !== undefined && { neighborhood: neighborhood ?? null }),
            ...(cuisineType !== undefined && { cuisineType }),
            ...(priceLevel !== undefined && { priceLevel }),
          },
        });
      }
    }

    // 4. Get next orderIndex
    const lastMapPlace = await db.mapPlace.findFirst({
      where: { mapId: list.id },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const nextOrderIndex = (lastMapPlace?.orderIndex ?? -1) + 1;

    // 5. Create MapPlace
    const mapPlace = await db.mapPlace.create({
      data: {
        id: randomUUID(),
        mapId: list.id,
        placeId: place.id,
        descriptor: descriptor?.trim() || null,
        userNote: userNote || null,
        userPhotos: [],
        orderIndex: nextOrderIndex,
        updatedAt: new Date(),
      },
      include: { places: true },
    });

    return NextResponse.json({
      success: true,
      data: mapPlace,
    });
  } catch (error) {
    console.error('Add place error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown add place error' },
      { status: 500 }
    );
  }
}
