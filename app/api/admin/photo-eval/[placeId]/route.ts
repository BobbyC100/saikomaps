/**
 * GET /api/admin/photo-eval/[placeId]
 * Fetch place details + filtered photos for evaluation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getPlaceDetails, getGooglePhotoUrl } from '@/lib/google-places';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const { placeId } = await params;
  const mode = request.nextUrl.searchParams.get('mode');

  const place = await prisma.entities.findUnique({
    where: { id: placeId },
    select: { id: true, slug: true, name: true, googlePlaceId: true },
  });

  if (!place || !place.googlePlaceId) {
    return NextResponse.json(
      { error: 'Place not found or missing google_place_id' },
      { status: 404 }
    );
  }

  const details = await getPlaceDetails(place.googlePlaceId);
  const totalPhotos = details?.photos?.length ?? 0;
  if (!details?.photos?.length) {
    return NextResponse.json({
      place: { id: place.id, slug: place.slug, name: place.name, google_place_id: place.googlePlaceId },
      photos: [],
      totalPhotos: 0,
      eligibleMinDim: 0,
      landscapeEligible: 0,
      portraitEligible: 0,
      returnedCount: 0,
      portraitFallbackUsed: 0,
    });
  }

  const eligibleMinDim = details.photos.filter((p) => {
    const w = p.width ?? 0;
    const h = p.height ?? 0;
    return Math.min(w, h) >= 900;
  });

  const landscape = eligibleMinDim.filter((p) => (p.width ?? 0) > (p.height ?? 0));
  const portrait = eligibleMinDim
    .filter((p) => (p.width ?? 0) <= (p.height ?? 0))
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0));

  const landscapeEligible = landscape.length;
  const portraitEligible = portrait.length;

  type PhotoItem = {
    p: (typeof details.photos)[number];
    aspect?: number;
    score?: number;
  };

  let preferred: PhotoItem[];
  if (mode === 'editorial') {
    const withScore = landscape.map((p) => {
      const w = p.width ?? 0;
      const h = p.height ?? 0;
      const aspect = h > 0 ? w / h : 0;
      const score = w + aspect * 200 - (aspect > 3.2 ? 500 : 0);
      return { p, aspect, score };
    });
    withScore.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    preferred = withScore;
  } else {
    preferred = landscape.map((p) => ({ p }));
  }

  const result: Array<{
    photo_ref: string;
    width_px: number;
    height_px: number;
    url: string;
    fallback: boolean;
    aspect?: number;
    score?: number;
  }> = [];
  let portraitFallbackUsed = 0;

  for (const item of preferred.slice(0, 8)) {
    result.push({
      photo_ref: item.p.photoReference,
      width_px: item.p.width ?? 0,
      height_px: item.p.height ?? 0,
      url: getGooglePhotoUrl(item.p.photoReference, 1600),
      fallback: false,
      ...(item.aspect !== undefined && { aspect: item.aspect }),
      ...(item.score !== undefined && { score: item.score }),
    });
  }

  const needed = 8 - result.length;
  if (needed > 0 && portrait.length > 0) {
    for (const p of portrait.slice(0, needed)) {
      result.push({
        photo_ref: p.photoReference,
        width_px: p.width ?? 0,
        height_px: p.height ?? 0,
        url: getGooglePhotoUrl(p.photoReference, 1600),
        fallback: true,
      });
      portraitFallbackUsed++;
    }
  }

  return NextResponse.json({
    place: {
      id: place.id,
      slug: place.slug,
      name: place.name,
      google_place_id: place.googlePlaceId,
    },
    photos: result,
    totalPhotos,
    eligibleMinDim: eligibleMinDim.length,
    landscapeEligible,
    portraitEligible,
    returnedCount: result.length,
    portraitFallbackUsed,
  });
}
