/**
 * API Route: Add CSV places to existing list
 * POST /api/import/add-to-list
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import Papa from 'papaparse';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

import {
  searchPlace,
  getPlaceDetails,
  getNeighborhoodFromPlaceDetails,
  getNeighborhoodFromCoords,
} from '@/lib/google-places';

import { extractPlaceId } from '@/lib/utils/googleMapsParser';
import { generatePlaceSlug, ensureUniqueSlug } from '@/lib/place-slug';
import { getSaikoCategory, parseCuisineType } from '@/lib/categoryMapping';

type PlaceInput = {
  name: string;
  address?: string;
  comment?: string;
  url?: string;
};

function getUserId(session: { user?: { id?: string } } | null): string | null {
  if (session?.user?.id) return session.user.id;
  if (process.env.NODE_ENV === 'development') return 'demo-user-id';
  return null;
}

function parseCsvToPlaces(fileContent: string): PlaceInput[] {
  const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
  if (result.errors.length) throw new Error('CSV parse failed');

  const places: PlaceInput[] = [];

  for (const row of result.data as Record<string, unknown>[]) {
    const name = (row.Title || row.Name || row.name || '') as string;
    if (!name) continue;

    places.push({
      name: name.trim(),
      address: (row.Address || row.address || '') as string | undefined,
      url: (row.URL || row.url || '') as string | undefined,
      comment: (row.Comment || row.Note || row.comment || '') as string | undefined,
    });
  }

  return places;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const listId = formData.get('listId') as string | null;

    if (!file || !listId) {
      return NextResponse.json({ error: 'Missing file or listId' }, { status: 400 });
    }

    const list = await db.lists.findUnique({ where: { id: listId } });
    if (!list || list.userId !== userId) {
      return NextResponse.json({ error: 'List not found or forbidden' }, { status: 404 });
    }

    const csvText = await file.text();
    const inputs = parseCsvToPlaces(csvText);

    let enriched = 0;
    let failedToResolve = 0;

    for (const input of inputs) {
      let placeDetails = null;
      let googlePlaceId: string | undefined;

      if (input.url) {
        googlePlaceId = extractPlaceId(input.url) ?? undefined;
        if (googlePlaceId) {
          try {
            placeDetails = await getPlaceDetails(googlePlaceId);
          } catch {}
        }
      }

      if (!placeDetails) {
        try {
          const results = await searchPlace(input.name, { maxResults: 1 });
          if (results[0]) {
            googlePlaceId = results[0].placeId;
            placeDetails = await getPlaceDetails(googlePlaceId);
          }
        } catch {}
      }

      let place =
        googlePlaceId
          ? await db.places.findUnique({ where: { googlePlaceId } })
          : null;

      if (!place) {
        const neighborhood =
          placeDetails
            ? getNeighborhoodFromPlaceDetails(placeDetails) ??
              (placeDetails.location
                ? await getNeighborhoodFromCoords(
                    placeDetails.location.lat,
                    placeDetails.location.lng
                  )
                : null)
            : null;

        const finalName = placeDetails?.name || input.name;
        const baseSlug = generatePlaceSlug(finalName, neighborhood ?? undefined);

        const slug = await ensureUniqueSlug(baseSlug, async (s) => {
          const exists = await db.places.findUnique({ where: { slug: s } });
          return !!exists;
        });

        place = await db.places.create({
          data: {
            id: randomUUID(),
            slug,
            googlePlaceId,
            name: finalName,
            address:
              placeDetails?.formattedAddress ??
              (input.address && !input.address.startsWith('http')
                ? input.address
                : null),
            latitude: placeDetails?.location?.lat ?? null,
            longitude: placeDetails?.location?.lng ?? null,
            phone: placeDetails?.formattedPhoneNumber ?? null,
            website: placeDetails?.website ?? null,
            googleTypes: placeDetails?.types ?? [],
            priceLevel: placeDetails?.priceLevel ?? null,
            neighborhood,
            cuisineType: placeDetails?.types
              ? parseCuisineType(placeDetails.types)
              : null,
            category: getSaikoCategory(finalName, placeDetails?.types ?? []),
            googlePhotos: placeDetails?.photos
              ? JSON.parse(JSON.stringify(placeDetails.photos))
              : undefined,
            hours: placeDetails?.openingHours
              ? JSON.parse(JSON.stringify(placeDetails.openingHours))
              : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        if (placeDetails) enriched++;
        else failedToResolve++;
      }

      if (!place) {
        failedToResolve++;
        continue;
      }

      const exists = await db.map_places.findUnique({
        where: {
          mapId_placeId: {
            mapId: list.id,
            placeId: place.id,
          },
        },
      });

      if (!exists) {
        await db.map_places.create({
          data: {
            id: randomUUID(),
            mapId: list.id,
            placeId: place.id,
            userNote: input.comment ?? null,
            updatedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      enriched,
      failedToResolve,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
