/**
 * Entity Detail API
 * GET /api/admin/entities/[id]/detail
 *
 * Returns a single entity with all fields needed for the admin Entity Profile page:
 * core fields, relation counts, derived signals, interpretation cache entries,
 * coverage sources, and entity issues.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const entity = await db.entities.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        name: true,
        googlePlaceId: true,
        address: true,
        latitude: true,
        longitude: true,
        phone: true,
        website: true,
        instagram: true,
        tiktok: true,
        hours: true,
        description: true,
        priceLevel: true,
        neighborhood: true,
        category: true,
        primaryVertical: true,
        cuisineType: true,
        status: true,
        businessStatus: true,
        tagline: true,
        pullQuote: true,
        pullQuoteAuthor: true,
        pullQuoteSource: true,
        pullQuoteUrl: true,
        tips: true,
        reservationUrl: true,
        entityType: true,
        createdAt: true,
        updatedAt: true,
        prlOverride: true,
      },
    });

    if (!entity) {
      return NextResponse.json({ error: `Entity not found: ${id}` }, { status: 404 });
    }

    // Supplemental fields not yet in generated Prisma client (will resolve with next prisma generate)
    let stateFields: { operating_status: string | null; enrichment_status: string | null; publication_status: string | null } =
      { operating_status: null, enrichment_status: null, publication_status: null };
    try {
      const rows = await db.$queryRaw<{ operating_status: string | null; enrichment_status: string | null; publication_status: string | null }[]>`
        SELECT operating_status, enrichment_status, publication_status FROM entities WHERE id = ${id}
      `;
      if (rows[0]) stateFields = rows[0];
    } catch { /* columns may not exist yet */ }

    // Parallel fetch: derived signals, interpretation cache, coverage, issues, counts
    const [
      identitySignals,
      offeringPrograms,
      interpretations,
      coverageSources,
      issues,
      surfaceCount,
    ] = await Promise.all([
      db.derived_signals.findFirst({
        where: { entityId: id, signalKey: 'identity_signals' },
        select: { signalValue: true, computedAt: true },
        orderBy: { computedAt: 'desc' },
      }).catch(() => null),
      db.derived_signals.findFirst({
        where: { entityId: id, signalKey: 'offering_programs' },
        select: { signalValue: true, computedAt: true },
        orderBy: { computedAt: 'desc' },
      }).catch(() => null),
      // All current interpretation_cache entries for this entity
      db.interpretation_cache.findMany({
        where: { entityId: id, isCurrent: true },
        select: {
          outputType: true,
          content: true,
          promptVersion: true,
          generatedAt: true,
        },
        orderBy: { generatedAt: 'desc' },
      }).catch(() => []),
      db.coverage_sources.findMany({
        where: { entityId: id },
        select: {
          id: true, publicationName: true, url: true, articleTitle: true,
          publishedAt: true, enrichmentStage: true, isAlive: true,
        },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
      db.entity_issues.findMany({
        where: { entityId: id },
        select: { id: true, issueType: true, severity: true, status: true, createdAt: true },
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      }).catch(() => []),
      db.merchant_surfaces.count({ where: { entityId: id } }).catch(() => 0),
    ]);

    // Shape interpretation cache into a lookup by output_type
    const interpretationMap: Record<string, {
      content: unknown;
      promptVersion: string | null;
      generatedAt: string;
    }> = {};
    for (const entry of interpretations) {
      // First entry wins (ordered by generatedAt desc, so most recent)
      if (!interpretationMap[entry.outputType]) {
        interpretationMap[entry.outputType] = {
          content: entry.content,
          promptVersion: entry.promptVersion,
          generatedAt: entry.generatedAt.toISOString(),
        };
      }
    }

    return NextResponse.json({
      entity: {
        ...entity,
        latitude: entity.latitude ? Number(entity.latitude) : null,
        longitude: entity.longitude ? Number(entity.longitude) : null,
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString(),
        operatingStatus: stateFields.operating_status,
        enrichmentStatus: stateFields.enrichment_status,
        publicationStatus: stateFields.publication_status,
      },
      derivedSignals: {
        identitySignals: identitySignals?.signalValue ?? null,
        identitySignalsAt: identitySignals?.computedAt?.toISOString() ?? null,
        offeringPrograms: offeringPrograms?.signalValue ?? null,
        offeringProgramsAt: offeringPrograms?.computedAt?.toISOString() ?? null,
      },
      interpretations: interpretationMap,
      coverageSources: coverageSources.map((src) => ({
        id: src.id,
        sourceName: src.sourceName,
        url: src.url,
        excerpt: src.excerpt ?? null,
        publishedAt: src.publishedAt?.toISOString() ?? null,
      })),
      issues: issues.map((iss) => ({
        id: iss.id,
        issueType: iss.issueType,
        severity: iss.severity,
        resolved: iss.status === 'resolved' || iss.status === 'suppressed',
        createdAt: iss.createdAt.toISOString(),
      })),
      _counts: {
        merchantSurfaces: surfaceCount,
        coverageSources: coverageSources.length,
        issues: issues.filter((i) => i.status !== 'resolved' && i.status !== 'suppressed').length,
      },
    });
  } catch (error: unknown) {
    console.error('[Entity Detail] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entity', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    );
  }
}
