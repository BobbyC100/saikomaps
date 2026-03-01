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
      entity_id: input.entityId,
      entity_type: input.entityType,
      job_type: input.jobType,
      pages_fetched: input.pagesFetched ?? 0,
      ai_calls: input.aiCalls ?? 0,
      duration_ms: input.durationMs ?? null,
      estimated_cost: input.estimatedCost != null ? input.estimatedCost : null,
    },
  });
}
