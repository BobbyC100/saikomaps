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
                cover_image_url: true,
                users: {
                  select: {
                    name: true,
                    email: true,
                  },
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

    // Get photo URLs (up to 10 for merchant page: 1 hero + up to 9 gallery)
    const photoUrls: string[] = [];
    if (place.google_photos && Array.isArray(place.google_photos)) {
      for (let i = 0; i < Math.min(10, place.google_photos.length); i++) {
        const ref = getPhotoRefFromStored(place.google_photos[i] as { photo_reference?: string; photoReference?: string; name?: string });
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
      coverImageUrl: mp.lists!.cover_image_url,
      creatorName: mp.lists!.users?.name || mp.lists!.users?.email?.split('@')[0] || 'Unknown',
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
          cuisineType: place.cuisine_type,
          priceLevel: place.price_level,
          photoUrl: photoUrls[0] ?? null,
          photoUrls,
          hours,
          googlePlaceId: place.google_place_id,
          curatorNote,
          curatorCreatorName,
          sources: place.editorial_sources || [],
          vibeTags: place.vibe_tags || [],
          tips: place.tips || [],
          tagline: place.tagline,
          pullQuote: place.pull_quote,
          pullQuoteSource: place.pull_quote_source,
          pullQuoteAuthor: place.pull_quote_author,
          pullQuoteUrl: place.pull_quote_url,
          pullQuoteType: place.pull_quote_type,
          // Decision Onset fields
          intentProfile: place.intent_profile,
          intentProfileOverride: place.intent_profile_override,
          reservationUrl: place.reservation_url,
          // Restaurant Group
          restaurantGroup: place.restaurant_groups || null,
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
