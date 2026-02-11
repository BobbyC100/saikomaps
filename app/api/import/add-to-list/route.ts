/**
 * API Route: Add CSV places to existing list
 * POST /api/import/add-to-list
 * Uses Place + MapPlace (find-or-create Place, create MapPlace)
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { searchPlace, getPlaceDetails, getNeighborhoodFromPlaceDetails, getNeighborhoodFromCoords } from '@/lib/google-places';
import { extractPlaceId } from '@/lib/utils/googleMapsParser';
import { generatePlaceSlug, ensureUniqueSlug } from '@/lib/place-slug';
import { getSaikoCategory, parseCuisineType } from '@/lib/categoryMapping';
import Papa from 'papaparse';

function getUserId(session: { user?: { id?: string } } | null): string | null {
  if (session?.user?.id) return session.user.id;
  if (process.env.NODE_ENV === 'development') return 'demo-user-id';
  return null;
}

function inferCategory(types: string[]): string | null {
  const typeMap: Record<string, string> = {
    restaurant: 'Food', cafe: 'Coffee', bar: 'Drinks', night_club: 'Drinks',
    bakery: 'Food', food: 'Food', museum: 'Sights', art_gallery: 'Sights',
    tourist_attraction: 'Sights', park: 'Sights', shopping_mall: 'Shopping',
    store: 'Shopping', lodging: 'Stay', hotel: 'Stay', spa: 'Wellness', gym: 'Wellness',
  };
  for (const type of types) {
    if (typeMap[type]) return typeMap[type];
  }
  return null;
}

type PlaceInput = { name: string; address?: string; comment?: string; url?: string };

function parseCsvToPlaces(fileContent: string): PlaceInput[] {
  const parseResult = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
  if (parseResult.errors.length > 0) throw new Error('Failed to parse CSV');
  const places: PlaceInput[] = [];
  for (const row of parseResult.data as Record<string, unknown>[]) {
    const name = (row.Title || row.Name || row.name || '') as string;
    if (!name || String(name).trim() === '') continue;
    places.push({
      name: String(name).trim(),
      address: (row.Address || row.address || '') as string | undefined,
      url: (row.URL || row.url || '') as string | undefined,
      comment: (row.Comment || row.Note || row.comment || '') as string | undefined,
    });
  }
  return places;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const listId = formData.get('listId') as string | null;
    if (!file || !listId) {
      return NextResponse.json({ error: 'File and listId are required' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are allowed' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    const fileContent = await file.text();
    const inputs = parseCsvToPlaces(fileContent);
    if (inputs.length === 0) {
      return NextResponse.json(
        { error: 'No valid places found in CSV. Need at least one row with Title or Name.' },
        { status: 400 }
      );
    }
    if (inputs.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 places per import. Please split into smaller files.' },
        { status: 400 }
      );
    }

    const list = await db.list.findFirst({
      where: { OR: [{ id: listId }, { slug: listId }] },
    });
    if (!list) return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    if (list.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const lastMapPlace = await db.mapPlace.findFirst({
      where: { mapId: list.id },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    let nextOrderIndex = (lastMapPlace?.orderIndex ?? -1) + 1;

    let enriched = 0;
    let failed = 0;

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      let cleanName = input.name?.trim() || '';
      if (cleanName.startsWith('http')) {
        const urlMatch = cleanName.match(/\/place\/([^/?]+)/);
        cleanName = urlMatch ? decodeURIComponent(urlMatch[1].replace(/\+/g, ' ')) : 'Untitled Place';
      }
      if (!cleanName) cleanName = 'Untitled Place';

      let placeDetails = null;
      let googlePlaceId: string | null = null;

      if (input.url) {
        googlePlaceId = extractPlaceId(input.url);
        if (googlePlaceId && !googlePlaceId.startsWith('cid:')) {
          try {
            placeDetails = await getPlaceDetails(googlePlaceId);
          } catch {
            // Try search below
          }
        }
      }

      if (!placeDetails && process.env.GOOGLE_PLACES_API_KEY) {
        const cleanAddress = input.address && !input.address.startsWith('http') ? input.address : undefined;
        const searchQuery = cleanAddress ? `${cleanName}, ${cleanAddress}` : cleanName;
        try {
          const results = await searchPlace(searchQuery, { maxResults: 1 });
          if (results.length > 0) {
            googlePlaceId = results[0].placeId;
            placeDetails = await getPlaceDetails(googlePlaceId);
          }
        } catch {
          // Not found
        }
      }

      let place = googlePlaceId ? await db.place.findUnique({ where: { googlePlaceId } }) : null;

      if (!place) {
        const neighborhood = placeDetails
          ? (getNeighborhoodFromPlaceDetails(placeDetails) ??
            (!Number.isNaN(placeDetails.location?.lat) && !Number.isNaN(placeDetails.location?.lng)
              ? await getNeighborhoodFromCoords(placeDetails.location.lat, placeDetails.location.lng)
              : null))
          : null;
        const finalName = placeDetails?.name && !placeDetails.name.startsWith('http')
          ? placeDetails.name
          : cleanName;
        const baseSlug = generatePlaceSlug(finalName, neighborhood ?? undefined);
        const slug = await ensureUniqueSlug(baseSlug, async (s) => {
          const exists = await db.place.findUnique({ where: { slug: s } });
          return !!exists;
        });

        const now = new Date();
        place = await db.place.create({
          data: {
            id: randomUUID(),
            slug,
            googlePlaceId: googlePlaceId ?? undefined,
            name: finalName,
            address: placeDetails?.formattedAddress ?? (input.address && !input.address.startsWith('http') ? input.address : null),
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
            placesDataCachedAt: placeDetails ? now : null,
            updatedAt: now,
          },
        });
        if (placeDetails) enriched++;
        else failed++;
      }

      const existingMapPlace = await db.mapPlace.findUnique({
        where: { mapId_placeId: { mapId: list.id, placeId: place.id } },
      });
      if (existingMapPlace) continue;

      await db.mapPlace.create({
        data: {
          id: randomUUID(),
          mapId: list.id,
          placeId: place.id,
          userNote: input.comment?.trim() || null,
          orderIndex: nextOrderIndex++,
          updatedAt: new Date(),
        },
      });

      await new Promise((r) => setTimeout(r, 100));
    }

    return NextResponse.json({
      success: true,
      data: {
        added: inputs.length,
        total: inputs.length,
        failedToResolve: failed,
      },
    });
  } catch (error) {
    console.error('[ADD-TO-LIST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to add places', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
