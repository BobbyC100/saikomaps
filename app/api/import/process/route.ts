/**
 * API Route: Process CSV import into a NEW list
 * POST /api/import/process
 *
 * Expects multipart/form-data:
 * - file: CSV File
 * - title: string
 * - templateType?: string
 * - accessLevel?: 'public' | 'private' (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import Papa from 'papaparse';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

import { searchPlace, getPlaceDetails, getNeighborhoodFromPlaceDetails, getNeighborhoodFromCoords } from '@/lib/google-places';
import { extractPlaceId } from '@/lib/utils/googleMapsParser';
import { generatePlaceSlug, ensureUniqueSlug } from '@/lib/place-slug';
import { getSaikoCategory, parseCuisineType } from '@/lib/categoryMapping';

function getUserId(session: { user?: { id?: string } } | null): string | null {
  if (session?.user?.id) return session.user.id;
  if (process.env.NODE_ENV === 'development') return 'demo-user-id';
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

function slugifyMapTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `map-${Date.now()}`;
}

async function ensureUniqueMapSlug(base: string): Promise<string> {
  let attempt = base;
  let i = 0;

  while (true) {
    const exists = await db.lists.findUnique({ where: { slug: attempt } });
    if (!exists) return attempt;
    i += 1;
    attempt = `${base}-${i}`;
  }
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

    const titleRaw = (formData.get('title') as string | null) ?? '';
    const listTitle = titleRaw.trim() || 'Untitled Map';

    const templateType = (formData.get('templateType') as string | null) ?? null;
    const accessLevel = ((formData.get('accessLevel') as string | null) ?? 'public') as 'public' | 'private';

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
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

    const baseMapSlug = slugifyMapTitle(listTitle);
    const slug = await ensureUniqueMapSlug(baseMapSlug);

    const list = await db.lists.create({
      data: {
        id: randomUUID(),
        userId,
        title: listTitle,
        slug,
        templateType,
        accessLevel,
        published: accessLevel === 'public',
        updatedAt: new Date(),
      },
      select: { id: true, slug: true },
    });

    let nextOrderIndex = 0;
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

      let placeDetails: any = null;
      let googlePlaceId: string | null = null;

      if (input.url) {
        googlePlaceId = extractPlaceId(input.url);
        if (googlePlaceId && !googlePlaceId.startsWith('cid:')) {
          try {
            placeDetails = await getPlaceDetails(googlePlaceId);
          } catch {
            // fall through to search
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
              (input.address && !input.address.startsWith('http') ? input.address : null),
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

        if (placeDetails) enriched++;
        else failed++;
      }

      const existingMapPlace = await db.map_places.findUnique({
        where: { mapId_placeId: { mapId: list.id, placeId: place.id } },
      });
      if (existingMapPlace) continue;

      await db.map_places.create({
        data: {
          id: randomUUID(),
          mapId: list.id,
          placeId: place.id,
          userNote: input.comment?.trim() || null,
          orderIndex: nextOrderIndex++,
          updatedAt: new Date(),
        },
      });

      // keep it light
      await new Promise((r) => setTimeout(r, 50));
    }

    return NextResponse.json({
      success: true,
      data: {
        listId: list.id,
        slug: list.slug,
        added: inputs.length,
        total: inputs.length,
        failedToResolve: failed,
        enriched,
      },
    });
  } catch (error) {
    console.error('[IMPORT/PROCESS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process import', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}