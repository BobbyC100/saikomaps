# TRACES — Temporal Record & Change Events System

**Project:** TRACES v1  
**Status:** Active  
**Related:** raw_records, golden_records, entities, resolver

---

## Purpose

TRACES is the system of record for temporal change across Saiko Maps. Its job is to record, preserve, and query how entities change over time, not just their latest state.

This includes:

- Status changes (open → closed)
- Attribute changes (website, Instagram, address)
- Identity changes (new GPID discovered)
- Enrichment events (survivorship merges)
- Human overrides

**TRACES ≠ analytics. TRACES ≠ logs.** It is a durable, queryable change ledger.

---

## When to Write a Trace

| Write Point | Event Type | Source | When |
|-------------|------------|--------|------|
| Ingest | `INGEST_SEEN` | ingest | One per raw record upserted |
| Resolver (GPID match) | `IDENTITY_ATTACHED` | resolver | When linking by Google Place ID |
| Resolver (GPID match) | `RESOLVER_DECISION` | resolver | Decision: linked |
| Resolver (placekey) | `ENTITY_CREATED` | resolver | New golden from placekey group |
| Resolver (placekey) | `RESOLVER_DECISION` | resolver | Decision: linked |
| Resolver (no candidates) | `ENTITY_CREATED` | resolver | New golden, kept separate |
| Resolver (no candidates) | `RESOLVER_DECISION` | resolver | Decision: kept_separate |
| Resolver (auto-link) | `RESOLVER_DECISION` | resolver | Decision: linked |
| Resolver (auto-link, has GPID) | `IDENTITY_ATTACHED` | resolver | GPID from raw |
| Resolver (keep separate) | `ENTITY_CREATED` | resolver | New golden, low score |
| Resolver (keep separate) | `RESOLVER_DECISION` | resolver | Decision: kept_separate |
| Survivorship | `STATUS_CHANGED` | enrichment | business_status changed |
| Survivorship | `IDENTITY_ATTACHED` | enrichment | google_place_id newly set |
| Admin close API | `HUMAN_OVERRIDE` | admin | lifecycle_status changed |
| mark-place-closed script | `HUMAN_OVERRIDE` | admin | entities.status changed |
| Admin attach route (`/api/admin/actors/candidates/[id]/attach`) | `IDENTITY_ATTACHED` | admin | Actor relationship created/promoted via admin approval; field_name="actor_relationship" |
| `scripts/link-place-group.ts` | `IDENTITY_ATTACHED` | human | Actor relationship created by manual single-place link script |
| `scripts/link-groups-to-places.ts` | `IDENTITY_ATTACHED` | enrichment | Actor relationship created by batch group-link script |

---

## When NOT to Write a Trace

- **Routine field updates** that don't change semantics (e.g. `updated_at` refresh)
- **Editorial copy, descriptions, taglines, vibes, vibe_tags** — not traced; UI/editorial state only
- **Bulk backfills** (out of scope for v1)
- **Read operations**
- **Analytics or logging** (use separate systems)

---

## Deferred (v1 Non-Goals)

**Coverage tracing — deferred.**  
Coverage is currently represented as a pipeline status table (`entity_coverage_status`) with no canonical "add/remove" event. `FieldsMembership` tracks curated index membership on golden_records but has no write path emitting coverage events. Trace when a first-class coverage write path is established.

**Reopen tracing — deferred.**  
No `/api/admin/places/[id]/reopen` route exists. Add `HUMAN_OVERRIDE` trace (source=admin, field_name="lifecycle_status") when a reopen path is created.

**Actor relationship demotions — not traced.**  
When `approveCandidateAndCreateRelationship` demotes an existing primary (sets `isPrimary=false` for a displaced actor), no `IDENTITY_REMOVED` is emitted. The relationship row still exists; only primary status changes. Trace a full `IDENTITY_REMOVED` only when an actor relationship row is deleted.

---

## Schema

```prisma
model traces {
  id         String   @id @default(uuid())
  entity_id  String?  // golden_records.canonical_id; null for pre-entity (INGEST_SEEN)
  raw_id     String?  // raw_records.raw_id
  source     TraceSource
  event_type TraceEventType
  field_name String?
  old_value  Json?
  new_value  Json?
  confidence Float?
  observed_at DateTime
  created_at DateTime
}
```

**Event types:** `ENTITY_CREATED`, `STATUS_CHANGED`, `FIELD_UPDATED`, `IDENTITY_ATTACHED`, `IDENTITY_REMOVED`, `ENRICHMENT_APPLIED`, `HUMAN_OVERRIDE`, `INGEST_SEEN`, `RESOLVER_DECISION`

**Sources:** `ingest`, `resolver`, `enrichment`, `human`, `admin`

---

## Read Helpers (lib/traces.ts)

| Function | Purpose |
|----------|---------|
| `getEntityTrace(entityId)` | Full timeline for an entity, ordered by observed_at |
| `getLatestStatus(entityId)` | Most recent STATUS_CHANGED or ENTITY_CREATED |
| `getFieldHistory(entityId, fieldName)` | Change history for a specific field |
| `getRecentEvents(filters?)` | Recent events across entities, with optional filters |

---

## Design Constraints

- **Append-only** — no updates or deletes
- **Idempotent-safe** — duplicate writes acceptable
- **JSON-first** — old_value/new_value are JSONB for schema flexibility
- **Cheap to write, cheap to query** — indexed by entity_id, event_type, observed_at

---

## Migration

Run when DB is available:

```bash
npx prisma migrate deploy
```

Or apply manually: `prisma/migrations/20260303000000_add_traces/migration.sql`
