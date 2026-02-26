/**
 * GET /api/admin/photo-eval/queue
 * Returns 25 random curated LA places for photo evaluation
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const places = await prisma.$queryRaw<
    { id: string; slug: string; name: string; google_place_id: string | null }[]
  >`
    SELECT p.id, p.slug, p.name, p.google_place_id
    FROM v_places_la_bbox p
    JOIN golden_records gr ON gr.canonical_id = p.id
    WHERE gr.promotion_status IN ('PUBLISHED', 'VERIFIED', 'PENDING')
    ORDER BY random()
    LIMIT 25
  `;

  return NextResponse.json(
    places.map((p) => ({
      place_id: p.id,
      slug: p.slug,
      name: p.name,
      google_place_id: p.google_place_id,
    }))
  );
}
