/**
 * Run matching and upsert OperatorPlaceCandidate rows (PENDING).
 * Idempotent: by (actor_id, candidate_url) when url set; else (actor_id, candidate_name, candidate_address).
 */

import type { ConfidenceBucket } from "@prisma/client";
import { OperatorPlaceCandidateStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { matchVenuesToPlaces } from "./matchVenuesToPlaces";
import { isVenueNoise } from "./venueFilter";
import type { VenueFound } from "@/lib/website-enrichment/operator-extract";

export interface UpsertCandidatesInput {
  actorId: string;
  venues: VenueFound[];
  actorWebsite: string;
  /** Optional Prisma client (use when db from static import is undefined in runtime) */
  db?: PrismaClient;
}

export interface CandidateRecord {
  id: string;
  candidateName: string;
  candidateUrl: string | null;
  candidateAddress: string | null;
  sourceUrl: string;
  placeId: string | null;
  matchScore: number;
  matchReason: string | null;
  status: OperatorPlaceCandidateStatus;
  confidenceBucket: ConfidenceBucket | null;
}

/** Derive confidence bucket from matchScore: >=0.85 HIGH, 0.70–0.85 MEDIUM, <0.70 LOW */
function deriveConfidenceBucket(matchScore: number): ConfidenceBucket {
  if (matchScore >= 0.85) return "HIGH";
  if (matchScore >= 0.7) return "MEDIUM";
  return "LOW";
}

export async function upsertOperatorPlaceCandidates(
  input: UpsertCandidatesInput
): Promise<CandidateRecord[]> {
  const { actorId, venues, actorWebsite, db: dbOverride } = input;
  const prisma = dbOverride ?? db;
  const opcDelegate = prisma?.operatorPlaceCandidate;
  if (!opcDelegate?.findFirst) {
    throw new Error("Prisma client not initialized: operatorPlaceCandidate delegate missing");
  }
  if (venues.length === 0) return [];

  const filteredVenues = venues.filter((v) => !isVenueNoise(v));
  const rows = await matchVenuesToPlaces(filteredVenues, actorWebsite, prisma);
  const results: CandidateRecord[] = [];

  for (const row of rows) {
    let existing = null;

    if (row.candidateUrl) {
      existing = await opcDelegate.findFirst({
        where: { actorId, candidateUrl: row.candidateUrl },
      });
    }
    if (!existing) {
      existing = await opcDelegate.findFirst({
        where: {
          actorId,
          candidateName: row.candidateName,
          candidateAddress: row.candidateAddress ?? null,
          candidateUrl: null,
        },
      });
    }

    const confidenceBucket = deriveConfidenceBucket(row.matchScore);
    const data = {
      candidateName: row.candidateName,
      candidateUrl: row.candidateUrl,
      candidateAddress: row.candidateAddress,
      sourceUrl: row.sourceUrl,
      entityId: row.placeId,
      matchScore: row.matchScore,
      matchReason: row.matchReason,
      status: OperatorPlaceCandidateStatus.PENDING,
      confidenceBucket,
    };

    if (existing) {
      const updated = await opcDelegate.update({
        where: { id: existing.id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
      results.push(serializeCandidate(updated));
    } else {
      const created = await opcDelegate.create({
        data: {
          actorId,
          ...data,
        },
      });
      results.push(serializeCandidate(created));
    }
  }

  return results;
}

function serializeCandidate(
  c: {
    id: string;
    candidateName: string;
    candidateUrl: string | null;
    candidateAddress: string | null;
    sourceUrl: string;
    entityId?: string | null;
    placeId?: string | null;
    matchScore: number;
    matchReason: string | null;
    status: OperatorPlaceCandidateStatus;
    confidenceBucket: ConfidenceBucket | null;
  }
): CandidateRecord {
  return {
    id: c.id,
    candidateName: c.candidateName,
    candidateUrl: c.candidateUrl,
    candidateAddress: c.candidateAddress,
    sourceUrl: c.sourceUrl,
    placeId: c.entityId ?? c.placeId ?? null,
    matchScore: c.matchScore,
    matchReason: c.matchReason,
    status: c.status,
    confidenceBucket: c.confidenceBucket,
  };
}
