/**
 * API Route: Place Details by Slug
 * GET /api/places/[slug]
 * Returns canonical Place data + maps that include this place (published only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getGooglePhotoUrl, getPhotoRefFromStored } from '@/lib/google-places';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Place slug is required' },
        { status: 400 }
      );
    }

    const place = await db.places.findUnique({
      where: { slug },
      include: {
        map_places: {
          include: {
            lists: {
              select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                published: true,

                users: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
                _count: {
                  select: { map_places: true },
                },
              },
            },
          },
        },
        restaurant_groups: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!place) {
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404 }
      );
    }

    // Cross-reference golden_records for enrichment data (Google Places attributes)
    let googlePlacesAttributes = place.googlePlacesAttributes ?? null;
    if (!googlePlacesAttributes && place.googlePlaceId) {
      const goldenRecord = await db.golden_records.findFirst({
        where: { google_place_id: place.googlePlaceId },
        select: { google_places_attributes: true },
      });
      if (goldenRecord?.google_places_attributes) {
        googlePlacesAttributes = goldenRecord.google_places_attributes;
      }
    }

    // Get photo URLs (up to 10 for merchant page: 1 hero + up to 9 gallery)
    const photoUrls: string[] = [];
    if (places.google_photos && Array.isArray(places.google_photos)) {
      for (let i = 0; i < Math.min(10, places.google_photos.length); i++) {
        const ref = getPhotoRefFromStored(places.google_photos[i] as { photo_reference?: string; photoReference?: string; name?: string });
        if (ref) {
          try {
            photoUrls.push(getGooglePhotoUrl(ref, i === 0 ? 800 : 400));
          } catch {
            // skip
          }
        }
      }
    }

    // Parse hours
    let hours: Record<string, string> | null = null;
    if (places.hours) {
      try {
        hours =
          typeof places.hours === 'string'
            ? JSON.parse(places.hours)
            : (places.hours as Record<string, string>);
      } catch {
        hours = null;
      }
    }

    // Format appearsOn (only published maps) and curator note from first map with descriptor

    const appearsOn = publishedMapPlaces.map((mp) => ({
      id: mp.lists!.id,
      title: mp.lists!.title,
      slug: mp.lists!.slug,
      <<<<<<< HEAD
      const publishedMapPlaces = places.map_places.filter((mp) => mp.lists && mp.lists.status === 'PUBLISHED');
  =======
      const publishedMapPlaces = place.map_places.filter((mp) => mp.lists && mp.lists.status === 'PUBLISHED');
  >>>>>>> df94ee8 (Saiko Maps User Profule)
      creatorName: mp.lists!.users?.name || mp.lists!.users?.email?.split('@')[0] || 'Unknown',
      placeCount: (mp.lists as any)._count?.map_places ?? 0,
    }));
    const curatorMapPlace = publishedMapPlaces.find((mp) => mp.descriptor?.trim());
    const curatorNote = curatorMapPlace?.descriptor?.trim() ?? null;
    const curatorCreatorName =
      curatorMapPlace?.lists?.users?.name ||
      curatorMapPlace?.lists?.users?.email?.split('@')[0] ||
      null;

    return NextResponse.json({
      success: true,
      data: {
        location: {
          id: places.id,
          slug: places.slug,
          name: places.name,
          address: places.address,
          latitude: places.latitude ? Number(places.latitude) : null,
          longitude: places.longitude ? Number(places.longitude) : null,
          phone: places.phone,
          website: places.website,
          instagram: places.instagram,
          description: places.description,
          category: places.category,
          neighborhood: places.neighborhood,
          cuisineType: places.cuisine_type,
          priceLevel: places.price_level,
          photoUrl: photoUrls[0] ?? null,
          photoUrls,
          hours,
          googlePlaceId: places.google_place_id,
          curatorNote,
          curatorCreatorName,

          // Decision Onset fields
          intentProfile: places.intent_profile,
          intentProfileOverride: places.intent_profile_override,
          reservationUrl: places.reservation_url,
          // Restaurant Group

        },
        guide: appearsOn[0]
          ? {
              id: appearsOn[0].id,
              title: appearsOn[0].title,
              slug: appearsOn[0].slug,
              creatorName: appearsOn[0].creatorName,
            }
          : null,
        appearsOn,
        isOwner: false,
      },
    });
  } catch (error) {
    console.error('Error fetching place:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch place',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
