/**
 * Minimal job cost logging for identity, operator_link, scan jobs.
 * No UI. Used for audit and cost estimation.
 */

import type { PrismaClient } from "@prisma/client";

export type PlaceJobType = "IDENTITY" | "OPERATOR_LINK" | "SCAN";

export interface LogPlaceJobInput {
  entityId: string;
  entityType: string; // 'place' | 'actor' | 'golden_record' | 'batch'
  jobType: PlaceJobType;
  pagesFetched?: number;
  aiCalls?: number;
  durationMs?: number;
  estimatedCost?: number;
}

export async function logPlaceJob(
  input: LogPlaceJobInput,
  client?: PrismaClient
): Promise<void> {
  const db = client ?? (await import("@/lib/db")).db;
  await db.place_job_log.create({
    data: {
      entityId: input.entityId,
      entityType: input.entityType,
      jobType: input.jobType,
      pagesFetched: input.pagesFetched ?? 0,
      aiCalls: input.aiCalls ?? 0,
      durationMs: input.durationMs ?? null,
      estimatedCost: input.estimatedCost != null ? input.estimatedCost : null,
    },
  });
}
