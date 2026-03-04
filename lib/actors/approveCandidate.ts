/**
 * Approval and attach logic for OperatorPlaceCandidate.
 * Writes entity_actor_relationships (role=operator, is_primary=true).
 * Primary override: if place already has primary operator, set existing to is_primary=false.
 */

import { db } from "@/lib/db";
import { writeTrace, TraceSource, TraceEventType } from "@/lib/traces";
import type { OperatorPlaceCandidate } from "@prisma/client";

export interface ApproveParams {
  candidate: OperatorPlaceCandidate;
  entityId: string;
  approvedBy: string;
  confidence?: number;
}

/**
 * Create or update place_actor_relationship for operator.
 * If place already has (role=operator, is_primary=true) for another actor, set that to false first.
 */
export async function approveCandidateAndCreateRelationship(
  params: ApproveParams
): Promise<void> {
  const { candidate, entityId, approvedBy, confidence } = params;
  const relConfidence = confidence ?? candidate.matchScore ?? 0.9;

  const existingPrimary = await db.entity_actor_relationships.findFirst({
    where: {
      entityId,
      role: "operator",
      isPrimary: true,
    },
    select: { id: true, actorId: true },
  });

  if (existingPrimary && existingPrimary.actorId !== candidate.actorId) {
    await db.entity_actor_relationships.update({
      where: { id: existingPrimary.id },
      data: { isPrimary: false, updatedAt: new Date() },
    });
  }

  const sources = {
    seed: "operator_website_match",
    source_url: candidate.sourceUrl,
    ...(candidate.candidateUrl && { candidate_url: candidate.candidateUrl }),
    approved_at: new Date().toISOString(),
    approved_by: approvedBy,
  };

  await db.entity_actor_relationships.upsert({
    where: {
      entityId_actorId_role: {
        entityId,
        actorId: candidate.actorId,
        role: "operator",
      },
    },
    create: {
      entityId,
      actorId: candidate.actorId,
      role: "operator",
      isPrimary: true,
      sources: sources as object,
      confidence: relConfidence,
    },
    update: {
      isPrimary: true,
      sources: sources as object,
      confidence: relConfidence,
      updatedAt: new Date(),
    },
  });

  await db.operatorPlaceCandidate.update({
    where: { id: candidate.id },
    data: {
      status: "APPROVED",
      entityId,
      reviewedAt: new Date(),
      approvedBy,
      updatedAt: new Date(),
    },
  });

  // TRACES: IDENTITY_ATTACHED — actor relationship created or promoted via admin approval
  try {
    await writeTrace({
      entityId,
      source: TraceSource.admin,
      eventType: TraceEventType.IDENTITY_ATTACHED,
      fieldName: "actor_relationship",
      oldValue: null,
      newValue: {
        actor_id: candidate.actorId,
        role: "operator",
        is_primary: true,
        relationship_table: "entity_actor_relationships",
        approved_by: approvedBy,
        candidate_id: candidate.id,
      },
      confidence: relConfidence,
    });
  } catch (e) {
    // FK may fail if entityId is app-layer only (not in golden_records); non-fatal
    console.warn(
      "[approveCandidate] Trace write skipped (entity may not be in golden_records):",
      (e as Error).message
    );
  }
}
