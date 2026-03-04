/**
 * TRACES — Temporal Record & Change Events System
 *
 * Append-only ledger for entity lifecycle and attribute changes.
 * See docs/TRACES.md for when to write a trace vs not.
 *
 * Design: Append-only, idempotent-safe, JSON-first for values.
 * Cheap to write, cheap to query by entity_id.
 */

import { PrismaClient, Prisma, TraceSource, TraceEventType } from '@prisma/client';

const prisma = new PrismaClient();

export type TraceWriteParams = {
  entityId?: string | null;
  rawId?: string | null;
  source: TraceSource;
  eventType: TraceEventType;
  fieldName?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  confidence?: number | null;
  observedAt?: Date;
};

/**
 * Append a trace event. Idempotent-safe: duplicate writes are acceptable.
 * Never mutates; always inserts.
 */
export async function writeTrace(params: TraceWriteParams): Promise<void> {
  const observedAt = params.observedAt ?? new Date();
  await prisma.traces.create({
    data: {
      entity_id: params.entityId ?? null,
      raw_id: params.rawId ?? null,
      source: params.source,
      event_type: params.eventType,
      field_name: params.fieldName ?? null,
      old_value:
        params.oldValue != null ? (params.oldValue as Prisma.InputJsonValue) : Prisma.JsonNull,
      new_value:
        params.newValue != null ? (params.newValue as Prisma.InputJsonValue) : Prisma.JsonNull,
      confidence: params.confidence ?? null,
      observed_at: observedAt,
    },
  });
}

/**
 * Get full trace timeline for an entity, ordered by observed_at ascending.
 */
export async function getEntityTrace(entityId: string) {
  return prisma.traces.findMany({
    where: { entity_id: entityId },
    orderBy: { observed_at: 'asc' },
  });
}

/**
 * Get the latest status-related event for an entity.
 * Looks for STATUS_CHANGED or ENTITY_CREATED with business_status/lifecycle_status.
 */
export async function getLatestStatus(entityId: string) {
  const statusEvents = await prisma.traces.findMany({
    where: {
      entity_id: entityId,
      event_type: { in: ['STATUS_CHANGED', 'ENTITY_CREATED'] },
    },
    orderBy: { observed_at: 'desc' },
    take: 1,
  });
  return statusEvents[0] ?? null;
}

/**
 * Get field change history for an entity, ordered by observed_at ascending.
 */
export async function getFieldHistory(entityId: string, fieldName: string) {
  return prisma.traces.findMany({
    where: {
      entity_id: entityId,
      field_name: fieldName,
    },
    orderBy: { observed_at: 'asc' },
  });
}

export type RecentEventsFilters = {
  entityId?: string;
  eventType?: TraceEventType;
  source?: TraceSource;
  limit?: number;
};

/**
 * Get recent events across all entities, optionally filtered.
 * Ordered by observed_at descending (most recent first).
 */
export async function getRecentEvents(filters?: RecentEventsFilters) {
  const limit = filters?.limit ?? 50;
  const where: Record<string, unknown> = {};
  if (filters?.entityId) where.entity_id = filters.entityId;
  if (filters?.eventType) where.event_type = filters.eventType;
  if (filters?.source) where.source = filters.source;

  return prisma.traces.findMany({
    where,
    orderBy: { observed_at: 'desc' },
    take: limit,
  });
}

// Re-export enums for callers
export { TraceSource, TraceEventType };
