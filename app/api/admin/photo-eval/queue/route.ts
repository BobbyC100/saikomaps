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
    FROM entities p
    WHERE p.google_place_id IS NOT NULL
      AND (
        p.publication_status = 'PUBLISHED'::"PublicationStatus"
        OR (p.publication_status IS NULL AND p.status = 'OPEN'::"PlaceStatus")
      )
      AND NOT (
        p.operating_status = 'TEMPORARILY_CLOSED'::"OperatingStatus"
        OR p.operating_status = 'PERMANENTLY_CLOSED'::"OperatingStatus"
        OR (p.operating_status IS NULL AND p.status IN ('CLOSED'::"PlaceStatus", 'PERMANENTLY_CLOSED'::"PlaceStatus"))
      )
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
