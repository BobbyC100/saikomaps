---
doc_id: SAIKO-DEFERRED-MIGRATION-GATES
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: 2026-03-12
last_updated: 2026-03-12
project_id: SAIKO
systems:
  - fields-data-layer
  - database
related_docs:
  - docs/FIELDS_V2_TARGET_ARCHITECTURE.md
  - docs/ENTITIES_CONTRACT_RECONCILIATION.md
summary: Gate conditions that must be satisfied before applying the two deferred Fields v2 migrations — slim entities and legacy table drop.
---

# Deferred Migration Gates

**Purpose:** Define the explicit conditions that must be true before applying either of the two deferred Fields v2 migrations.

These migrations are not abandoned. They represent the intended final state of the Fields v2 architecture. They are deferred because prerequisites are incomplete, not because the direction has changed.

---

## The Two Deferred Migrations

| Migration | File | What it does |
|-----------|------|--------------|
| Migration 1 | `20260306200000_slim_entities_fields_v2` | Removes non-routing fields from `entities` table |
| Migration 2 | `20260306300000_drop_legacy_tables_fields_v2` | Drops legacy tables no longer needed in v2 |

---

## Gate 1 — Prerequisites for Migration 1 (Slim Entities)

All of the following must be true before applying `20260306200000`:

### Data migration complete
- [ ] All canonical factual fields migrated to `canonical_entity_state` and verified
- [ ] `scripts/populate-canonical-state.ts` has run successfully across full entity corpus
- [ ] Row count parity verified: every `entities` row has a corresponding `canonical_entity_state` row

### Operational fields migrated
- [ ] `last_enriched_at` migrated to `place_coverage_status.last_success_at`
- [ ] `needs_human_review` migrated to `place_coverage_status.needs_human_review`
- [ ] `category_enrich_attempted_at` migrated to `place_coverage_status.last_attempt_at`

### API and application reads updated
- [ ] All API routes reading factual fields from `entities` updated to read from `canonical_entity_state`
- [ ] Dual-read period completed and verified — no active reads from fields being removed
- [ ] No active references to `enrichment_stage` in any live code path

### FK rewires complete
- [ ] EntityActorRelationship FK rewired to `entities.id` — `scripts/migrate-actor-relationships-to-entities.ts` complete
- [ ] All remaining downstream FK references verified against `entities.id` not legacy table IDs

### Verification
- [ ] Smoke test: place page renders correctly for 10 spot-checked entities
- [ ] Zero application errors in staging after migration dry-run

---

## Gate 2 — Prerequisites for Migration 2 (Drop Legacy Tables)

Gate 1 must be fully complete before Gate 2 is evaluated.

All of the following must additionally be true before applying `20260306300000`:

### Legacy tables are provably unused
- [ ] Zero active reads from legacy tables in any API route, script, or cron
- [ ] Zero active writes to legacy tables
- [ ] Search across codebase for legacy table names confirms no live references

### Interpretation cache stable
- [ ] `interpretation_cache` populated for all entity types that previously relied on legacy table fields
- [ ] `is_current` flag logic verified correct per `(entity_id, output_type, prompt_version)`

### Backup confirmed
- [ ] Point-in-time backup of database taken immediately before applying
- [ ] Recovery path documented and tested

### Final verification
- [ ] Full regression pass on place page, map view, and search surfaces
- [ ] Ken sign-off on Gate 2 readiness

---

## Rule

Neither migration may be applied until its gate conditions are fully checked.

Partial completion does not qualify. Gates are binary: all conditions met, or not ready.

If a condition cannot be met as written, it must be explicitly revisited and the gate updated — not silently bypassed.
