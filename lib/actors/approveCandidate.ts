/**
 * Approval and attach logic for OperatorPlaceCandidate.
 * Writes place_actor_relationships (role=operator, is_primary=true).
 * Primary override: if place already has primary operator, set existing to is_primary=false.
 */

import { db } from "@/lib/db";
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

  const existingPrimary = await db.placeActorRelationship.findFirst({
    where: {
      entityId,
      role: "operator",
      isPrimary: true,
    },
    select: { id: true, actorId: true },
  });

  if (existingPrimary && existingPrimary.actorId !== candidate.actorId) {
    await db.placeActorRelationship.update({
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

  await db.placeActorRelationship.upsert({
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
}
