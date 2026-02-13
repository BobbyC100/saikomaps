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
        map_places: {
          include: {
            lists: {
              select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                published: true,
                coverImageUrl: true,
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
    if (place.googlePhotos && Array.isArray(place.googlePhotos)) {
      for (let i = 0; i < Math.min(10, place.googlePhotos.length); i++) {
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
    const publishedMapPlaces = place.map_places.filter((mp) => mp.lists && mp.lists.status === 'PUBLISHED');
    const appearsOn = publishedMapPlaces.map((mp) => ({
      id: mp.lists!.id,
      title: mp.lists!.title,
      slug: mp.lists!.slug,
      coverImageUrl: mp.lists!.coverImageUrl,
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
          id: place.id,
          slug: place.slug,
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
          sources: (place.editorialSources as unknown[]) || [],
          vibeTags: place.vibeTags || [],
          tips: place.tips || [],
          tagline: place.tagline,
          pullQuote: place.pullQuote,
          pullQuoteSource: place.pullQuoteSource,
          pullQuoteAuthor: place.pullQuoteAuthor,
          pullQuoteUrl: place.pullQuoteUrl,
          pullQuoteType: place.pullQuoteType,
          // Decision Onset fields
          intentProfile: place.intentProfile,
          intentProfileOverride: place.intentProfileOverride,
          reservationUrl: place.reservationUrl,
          // Restaurant Group
          restaurantGroup: place.restaurant_groups || null,
          // Google Places structured attributes (from places table or golden_records fallback)
          googlePlacesAttributes: googlePlacesAttributes || null,
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
