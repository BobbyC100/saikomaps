/**
 * Entity Compare API
 * GET /api/admin/entities/compare?a={entityId}&b={entityId}
 *
 * Returns both entities side-by-side with key fields and relation counts
 * for use in the duplicate merge flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const ENTITY_SELECT = {
  id: true,
  name: true,
  slug: true,
  googlePlaceId: true,
  website: true,
  phone: true,
  instagram: true,
  neighborhood: true,
  address: true,
  latitude: true,
  longitude: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function getEntityWithCounts(entityId: string) {
  const entity = await db.entities.findUnique({
    where: { id: entityId },
    select: ENTITY_SELECT,
  });

  if (!entity) return null;

  const [surfaceCount, artifactCount, issueCount] = await Promise.all([
    db.merchant_surfaces.count({ where: { entity_id: entityId } }),
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM merchant_surface_artifacts msa
      JOIN merchant_surfaces ms ON msa.merchant_surface_id = ms.id
      WHERE ms.entity_id = ${entityId}
    `,
    db.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM entity_issues WHERE entity_id = ${entityId}`.then(r => Number(r[0].count)).catch(() => 0),
  ]);

  return {
    ...entity,
    _counts: {
      merchant_surfaces: surfaceCount,
      merchant_surface_artifacts: Number(artifactCount[0].count),
      coverage_issues: issueCount,
    },
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const aId = searchParams.get('a');
  const bId = searchParams.get('b');

  if (!aId || !bId) {
    return NextResponse.json(
      { error: 'Both query params "a" and "b" (entity IDs) are required' },
      { status: 400 },
    );
  }

  const [entityA, entityB] = await Promise.all([
    getEntityWithCounts(aId),
    getEntityWithCounts(bId),
  ]);

  if (!entityA || !entityB) {
    const missing = !entityA ? aId : bId;
    return NextResponse.json(
      { error: `Entity not found: ${missing}` },
      { status: 404 },
    );
  }

  return NextResponse.json({ a: entityA, b: entityB });
}
