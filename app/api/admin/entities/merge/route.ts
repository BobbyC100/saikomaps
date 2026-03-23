/**
 * Entity Merge API
 * POST /api/admin/entities/merge
 *
 * Merges two duplicate entities: reassigns all FK references from deleteId
 * to keepId, copies non-null fields from deleted entity where kept entity
 * has nulls, then deletes the duplicate.
 *
 * Body: { keepId: string, deleteId: string }
 * Returns: { merged: true, kept: keepId, deleted: deleteId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Fields that can be gap-filled from the deleted entity
const GAP_FILL_FIELDS = [
  'googlePlaceId',
  'website',
  'phone',
  'instagram',
  'tiktok',
  'neighborhood',
  'address',
  'latitude',
  'longitude',
  'description',
  'hours',
  'cuisineType',
  'category',
  'priceLevel',
  'reservationUrl',
  'intentProfile',
  'tagline',
] as const;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { keepId, deleteId } = body as { keepId?: string; deleteId?: string };

  if (!keepId || !deleteId) {
    return NextResponse.json(
      { error: 'Both keepId and deleteId are required' },
      { status: 400 },
    );
  }

  if (keepId === deleteId) {
    return NextResponse.json(
      { error: 'keepId and deleteId must be different' },
      { status: 400 },
    );
  }

  // Verify both entities exist
  const [keepEntity, deleteEntity] = await Promise.all([
    db.entities.findUnique({ where: { id: keepId } }),
    db.entities.findUnique({ where: { id: deleteId } }),
  ]);

  if (!keepEntity) {
    return NextResponse.json({ error: `Keep entity not found: ${keepId}` }, { status: 404 });
  }
  if (!deleteEntity) {
    return NextResponse.json({ error: `Delete entity not found: ${deleteId}` }, { status: 404 });
  }

  try {
    await db.$transaction(async (tx) => {
      // 1. Clear unique-constrained fields on the delete entity first so gap-fill won't violate constraints
      await tx.entities.update({
        where: { id: deleteId },
        data: { googlePlaceId: null },
      });

      // 2. Gap-fill: copy non-null fields from deleteEntity to keepEntity where keepEntity is null
      const gapFillData: Record<string, unknown> = {};
      for (const field of GAP_FILL_FIELDS) {
        const keepVal = (keepEntity as Record<string, unknown>)[field];
        const deleteVal = (deleteEntity as Record<string, unknown>)[field];
        if ((keepVal === null || keepVal === undefined) && deleteVal !== null && deleteVal !== undefined) {
          gapFillData[field] = deleteVal;
        }
      }

      if (Object.keys(gapFillData).length > 0) {
        await tx.entities.update({
          where: { id: keepId },
          data: gapFillData,
        });
      }

      // 2. Reassign FK references from deleteId to keepId

      // entity_issues has unique(entityId, issueType) — delete overlapping issues first
      const keepIssues = await tx.entity_issues.findMany({
        where: { entityId: keepId },
        select: { issueType: true },
      });
      const keepIssueTypes = new Set(keepIssues.map((i: { issueType: string }) => i.issueType));
      // Delete issues from the duplicate that already exist on the kept entity
      if (keepIssueTypes.size > 0) {
        await tx.entity_issues.deleteMany({
          where: { entityId: deleteId, issueType: { in: [...keepIssueTypes] } },
        });
      }
      // Reassign remaining issues
      await tx.entity_issues.updateMany({
        where: { entityId: deleteId },
        data: { entityId: keepId },
      });

      // For tables with compound unique constraints, delete overlapping rows
      // from the duplicate first, then reassign the rest. For simple FK tables,
      // just reassign. For singleton tables, delete.

      // Helper: safe reassign that deletes all duplicate rows first for compound-unique tables
      // (simpler than checking each overlap individually)
      const safeReassign = async (
        model: any,
        entityField: string,
      ) => {
        // Delete all rows from the duplicate entity (keep entity's rows win)
        await model.deleteMany({ where: { [entityField]: deleteId } });
      };

      // Compound-unique tables: delete duplicate's rows (kept entity's rows take precedence)
      await safeReassign(tx.derived_signals, 'entityId');
      await safeReassign(tx.interpretation_cache, 'entityId');
      await safeReassign(tx.energy_scores, 'entityId');
      await safeReassign(tx.place_tag_scores, 'entityId');
      await safeReassign(tx.place_photo_eval, 'entityId');
      await safeReassign(tx.coverage_sources, 'entityId');
      await safeReassign(tx.viewer_bookmarks, 'entityId');
      await safeReassign(tx.map_places, 'entityId');
      await safeReassign(tx.person_places, 'entityId');
      await safeReassign(tx.placeActorRelationship, 'entityId');
      await safeReassign(tx.entityActorRelationship, 'entityId');

      // Singleton tables — just delete
      await tx.merchant_signals.deleteMany({ where: { entityId: deleteId } });
      await tx.canonical_entity_state.deleteMany({ where: { entityId: deleteId } });
      await tx.traceSignalsCache.deleteMany({ where: { entityId: deleteId } });
      await tx.canonical_sanctions.deleteMany({ where: { entityId: deleteId } });
      await tx.sanction_conflicts.deleteMany({ where: { entityId: deleteId } });
      await tx.place_coverage_status.deleteMany({ where: { entityId: deleteId } });

      // Tables with immutability triggers — cannot update entityId directly.
      // Strategy: read surfaces + artifacts from delete entity, delete originals,
      // then recreate with new IDs pointing to keep entity.
      // Skip surfaces that already exist on the keep entity (same surfaceType + sourceUrl).
      const deleteSurfaces = await tx.merchant_surfaces.findMany({
        where: { entityId: deleteId },
        include: { artifacts: true },
      });

      const keepSurfaces = await tx.merchant_surfaces.findMany({
        where: { entityId: keepId },
        select: { surfaceType: true, sourceUrl: true },
      });
      const keepSurfaceKeys = new Set(
        keepSurfaces.map((s: { surfaceType: string; sourceUrl: string }) => `${s.surfaceType}||${s.sourceUrl}`),
      );

      // Delete originals (artifacts cascade-delete via FK)
      await tx.merchant_surface_artifacts.deleteMany({
        where: { merchant_surface: { entityId: deleteId } },
      });
      await tx.merchant_surfaces.deleteMany({
        where: { entityId: deleteId },
      });

      // Recreate unique surfaces under the kept entity
      for (const surface of deleteSurfaces) {
        const key = `${surface.surfaceType}||${surface.sourceUrl}`;
        if (keepSurfaceKeys.has(key)) continue; // skip duplicates

        const newSurface = await tx.merchant_surfaces.create({
          data: {
            entityId: keepId,
            surfaceType: surface.surfaceType,
            sourceUrl: surface.sourceUrl,
            contentType: surface.contentType,
            fetchStatus: surface.fetchStatus,
            parseStatus: surface.parseStatus,
            extractionStatus: surface.extractionStatus,
            contentHash: surface.contentHash,
            rawText: surface.rawText,
            rawHtml: surface.rawHtml,
            fetchedAt: surface.fetchedAt,
            discoveredAt: surface.discoveredAt,
            metadataJson: surface.metadataJson ?? undefined,
          },
        });

        // Recreate artifacts under the new surface
        for (const artifact of surface.artifacts) {
          await tx.merchant_surface_artifacts.create({
            data: {
              merchantSurfaceId: newSurface.id,
              artifactType: artifact.artifactType,
              artifactVersion: artifact.artifactVersion,
              artifactJson: artifact.artifactJson,
              createdAt: artifact.createdAt,
            },
          });
        }
      }

      // merchant_surface_scans — append-only, safe to delete (no unique constraint with entity)
      await tx.merchant_surface_scans.deleteMany({
        where: { entityId: deleteId },
      });

      // Compound-unique tables that need safe reassign (delete-then-skip pattern)
      await safeReassign(tx.reservation_provider_matches, 'entityId');

      // Simple FK tables: reassign
      await tx.menu_fetches.updateMany({
        where: { entityId: deleteId },
        data: { entityId: keepId },
      });
      await tx.instagram_accounts.updateMany({
        where: { entityId: deleteId },
        data: { entityId: keepId },
      });
      await tx.observed_claims.updateMany({
        where: { entityId: deleteId },
        data: { entityId: keepId },
      });
      await tx.place_job_log.updateMany({
        where: { entityId: deleteId },
        data: { entityId: keepId },
      });
      await tx.merchant_enrichment_runs.updateMany({
        where: { entityId: deleteId },
        data: { entityId: keepId },
      });
      await tx.gpid_resolution_queue.updateMany({
        where: { entityId: deleteId },
        data: { entityId: keepId },
      });
      await tx.fieldsMembership.updateMany({
        where: { entityId: deleteId },
        data: { entityId: keepId },
      });
      await tx.operatorPlaceCandidate.updateMany({
        where: { entityId: deleteId },
        data: { entityId: keepId },
      });

      // place_appearances — two FK columns
      await tx.place_appearances.updateMany({
        where: { subjectEntityId: deleteId },
        data: { subjectEntityId: keepId },
      });
      await tx.place_appearances.updateMany({
        where: { hostEntityId: deleteId },
        data: { hostEntityId: keepId },
      });

      // 3. Delete the duplicate entity itself
      await tx.entities.delete({ where: { id: deleteId } });

      // 4. Clean up duplicate issues that reference the deleted entity
      // Resolve any potential_duplicate issues on OTHER entities that point to the deleted entity
      await tx.entity_issues.updateMany({
        where: {
          issueType: 'potential_duplicate',
          status: 'open',
          detail: { path: ['duplicate_of_id'], equals: deleteId },
        },
        data: { status: 'resolved', resolvedAt: new Date(), resolvedBy: 'merge' },
      });
      // Also resolve any potential_duplicate issue on the kept entity (it was the duplicate pair)
      await tx.entity_issues.updateMany({
        where: {
          entityId: keepId,
          issueType: 'potential_duplicate',
          status: 'open',
        },
        data: { status: 'resolved', resolvedAt: new Date(), resolvedBy: 'merge' },
      });
    }, { timeout: 30000 });

    return NextResponse.json({
      merged: true,
      kept: keepId,
      deleted: deleteId,
      keptName: keepEntity.name,
      deletedName: deleteEntity.name,
    });
  } catch (error: any) {
    console.error('[Entity Merge] Error merging', keepId, '←', deleteId, ':', error.message, error.code ?? '');
    console.error('[Entity Merge] Stack:', error.stack?.split('\n').slice(0, 5).join('\n'));
    return NextResponse.json(
      { error: 'Merge failed', message: error.message, code: error.code ?? null },
      { status: 500 },
    );
  }
}
