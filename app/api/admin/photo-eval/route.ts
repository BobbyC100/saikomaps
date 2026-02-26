/**
 * POST /api/admin/photo-eval
 * Persist photo evaluation tags (upsert by place_id + photo_ref)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

type PhotoPayload = {
  photo_ref: string;
  width_px: number;
  height_px: number;
  tier: 'HERO' | 'GALLERY' | 'REJECT';
  type?: 'EXTERIOR' | 'INTERIOR' | 'CONTEXT' | 'FOOD';
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { place_id, google_place_id, requested_max_width_px = 1600, photos } = body as {
    place_id: string;
    google_place_id: string;
    requested_max_width_px?: number;
    photos: PhotoPayload[];
  };

  if (!place_id || !google_place_id || !Array.isArray(photos)) {
    return NextResponse.json(
      { error: 'place_id, google_place_id, and photos array required' },
      { status: 400 }
    );
  }

  for (const p of photos) {
    await prisma.place_photo_eval.upsert({
      where: {
        place_id_photo_ref: { place_id, photo_ref: p.photo_ref },
      },
      create: {
        place_id,
        google_place_id,
        photo_ref: p.photo_ref,
        width_px: p.width_px,
        height_px: p.height_px,
        requested_max_width_px: requested_max_width_px ?? 1600,
        tier: p.tier,
        type: p.type ?? null,
      },
      update: {
        tier: p.tier,
        type: p.type ?? null,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
