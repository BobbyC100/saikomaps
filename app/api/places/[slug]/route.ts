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

    const place = await db.place.findUnique({
      where: { slug },
      include: {
        mapPlaces: {
          include: {
            map: {
              select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                published: true,
                coverImageUrl: true,
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
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

    // Get photo URLs (up to 4 for merchant page gallery)
    const photoUrls: string[] = [];
    if (place.googlePhotos && Array.isArray(place.googlePhotos)) {
      for (let i = 0; i < Math.min(4, place.googlePhotos.length); i++) {
        const ref = getPhotoRefFromStored(place.googlePhotos[i] as { photo_reference?: string; photoReference?: string; name?: string });
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
    if (place.hours) {
      try {
        hours =
          typeof place.hours === 'string'
            ? JSON.parse(place.hours)
            : (place.hours as Record<string, string>);
      } catch {
        hours = null;
      }
    }

    // Format appearsOn (only published maps) and curator note from first map with descriptor
    const publishedMapPlaces = place.mapPlaces.filter((mp) => mp.map && mp.map.status === 'PUBLISHED');
    const appearsOn = publishedMapPlaces.map((mp) => ({
      id: mp.map!.id,
      title: mp.map!.title,
      slug: mp.map!.slug,
      coverImageUrl: mp.map!.coverImageUrl,
      creatorName: mp.map!.user?.name || mp.map!.user?.email?.split('@')[0] || 'Unknown',
    }));
    const curatorMapPlace = publishedMapPlaces.find((mp) => mp.descriptor?.trim());
    const curatorNote = curatorMapPlace?.descriptor?.trim() ?? null;
    const curatorCreatorName =
      curatorMapPlace?.map?.user?.name ||
      curatorMapPlace?.map?.user?.email?.split('@')[0] ||
      null;

    return NextResponse.json({
      success: true,
      data: {
        location: {
          id: place.id,
          name: place.name,
          address: place.address,
          latitude: place.latitude ? Number(place.latitude) : null,
          longitude: place.longitude ? Number(place.longitude) : null,
          phone: place.phone,
          website: place.website,
          instagram: place.instagram,
          description: place.description,
          category: place.category,
          neighborhood: place.neighborhood,
          cuisineType: place.cuisineType,
          priceLevel: place.priceLevel,
          photoUrl: photoUrls[0] ?? null,
          photoUrls,
          hours,
          googlePlaceId: place.googlePlaceId,
          curatorNote,
          curatorCreatorName,
          sources: place.sources || [],
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
