---
doc_id: ARCH-LANE-FIRST-ENRICHMENT-V1
doc_type: architecture
status: SHIPPED
owner: Bobby Ciccaglione
created: '2026-03-26'
last_updated: '2026-03-26'
shipped: '2026-03-26'
project_id: SAIKO
layer: Implementation Spec (Layer 2)
depends_on:
  - docs/architecture/entity-state-model-v1.md
  - docs/architecture/enrichment-model-v1.md
  - docs/architecture/enrichment-strategy-v1.md
  - docs/architecture/enrichment-evidence-model-v1.md
related_docs:
  - docs/ENRICHMENT_PIPELINE.md
  - docs/architecture/enrichment-playbook-v1.md
  - docs/architecture/enrichment-freshness-strategy-v1.md
summary: >
  Replaces timestamp-driven enrichment completion with a lane/state model
  that is explicit, retry-safe, and subtype-aware. Defines three enrichment
  lanes (Identified, Surfaced, Enriched), a four-layer completion gate
  (Identity, Access, Offering, Interpretation), and the code changes needed
  to eliminate the partial-enrichment dead zone.
---

# Lane-First Enrichment — Implementation Spec

> **Status:** SHIPPED — All six phases (A–F) implemented and verified 2026-03-26. Dry-run scan confirms: 1100 entities scanned, 0 `enrichment_stalled`, 8 `enrichment_incomplete` (expected — INGESTED entities with GPIDs awaiting first enrichment run). No null-gap in `enrichmentStatus`. Four-layer naming convention (Identity, Access, Offering, Interpretation) live across code, docs, and profiles.

> **Post-ship validation (2026-03-26):**
> - CLI wrapper fixed: `npm run scan:issues -- --dry-run --summary` runs cleanly.
> - All 8 `enrichment_incomplete` entities enriched through full pipeline. Moved to `enrichment_stalled` with explicit missing requirements — system correctly held them in ENRICHING instead of falsely promoting to ENRICHED.
> - Runtime blockers fixed in `run-surface-fetch.ts`, `run-surface-parse.ts`, `extract-identity-signals.ts` (Prisma field alignment).
> - Current board: `enrichment_incomplete: 0`, `enrichment_stalled: 8` (at stage 7, missing Offering/Access/Interpretation layer requirements — real data gaps, not pipeline bugs).
>
> **Remaining items:**
> - `lib/admin/coverage/dashboard-queries.ts` is dead code — delete when convenient.
> - The 8 stalled entities need either manual data entry, editorial coverage ingestion, or SceneSense processing to clear their missing Offering/Interpretation requirements.

---

## 1. Problem Statement

Entities are getting stuck in partial enrichment with no automatic recovery path. The root cause is that enrichment completion is tracked by timestamps (`lastEnrichedAt`) rather than by what data actually exists.

### Specific Failure Modes

**Trap door: `lastEnrichedAt` permanently excludes entities from batch selection.**

Once `lastEnrichedAt` is set, the entity is invisible to future batch runs — even if enrichment only partially completed. This field gets set aggressively:

- **Single-entity mode** (`enrich-place.ts`): Set after ANY stage runs, even if the pipeline fails at stage 3. An entity that got through surface discovery but failed on surface fetch is marked as "enriched" and will never be re-selected. (Line 474: `if (anyRan) { lastEnrichedAt = new Date() }`)
- **Smart enrich** (`smart-enrich.ts`): Sets `lastEnrichedAt` at the end regardless of what completed. Does not set `enrichmentStatus`. An entity that found a website but failed to scrape it is marked as done. (Line 542)
- **API trigger** (`enrich/[slug]/route.ts`): Preserves old `lastEnrichedAt` intentionally ("so batch mode doesn't re-select"). If a re-enrichment attempt fails, the old timestamp persists.

**Invisible to issue scanner.** The `enrichment_incomplete` issue check returns null if `enrichmentStage` has any value or if `lastEnrichedAt` is set. An entity stuck at stage 3 with `lastEnrichedAt` set is invisible to Coverage Ops.

**Smart enrich orphans.** Smart enrich runs a completely separate code path from the ERA pipeline. It sets `lastEnrichedAt` but never sets `enrichmentStatus` or `enrichmentStage`. After smart enrich, entities have identity data but the full pipeline won't select them for batch processing.

**Stage 6 skip logic gates on `lastEnrichedAt`.** If `lastEnrichedAt` is set (from any prior enrichment attempt), stage 6 (website enrichment) is skipped unless `--force` is passed. This causes entities to miss menu URL, reservation URL, and category extraction.

### What the Strategy Docs Say vs What the Code Does

| Strategy Doc Says | Code Does |
|---|---|
| Vertical-aware completeness (enrichment-model-v1) | Universal "has TAGLINE" = done (treats Interpretation layer as universal gate) |
| Confirmed absence is a first-class signal (evidence-model-v1) | Null = ambiguous, no distinction between "never checked" and "confirmed absent" |
| Exhaustion must be explicit (enrichment-strategy-v1) | Failed stages just stop; no exhaustion tracking |
| Free before paid sequencing (enrichment-strategy-v1) | Full pipeline runs stages 1-7 in order; batch mode doesn't enforce free-first |

---

## 2. Lane Model

Replace timestamp-driven completion with three explicit lanes. Each lane has a clear entry condition, clear completion artifact, and is independently re-enterable.

### Lane 1 — Get to Identified

**Purpose:** Establish minimum identity confidence for all intake entities.

**Entry condition:** `enrichmentStatus = INGESTED`.

**Completion criteria:** Identity score >= required threshold for the entity's pattern.

The identity scoring model already exists in `lib/smart-enrich.ts` (lines 283-293):

```
ANCHOR_WEIGHTS = {
  gpid: 4,
  website: 3,
  instagram: 2,
  coords: 2,
  neighborhood: 1,
  phone: 1,
}
IDENTITY_THRESHOLD = 4
```

Nomadic entities use threshold 2 (already implemented in issue scanner, line 198).

**Artifacts produced:** GPID and/or weighted anchors (website, Instagram, coordinates). Claims recorded in `observed_claims` with provenance.

**What runs in this lane:** Smart enrich Phase 1 (Haiku web search → website + Instagram discovery), GPID resolution (Google Places search), social discovery (discover-social tool).

**Completion is NOT gated on GPID.** Per the identity model, multiple weak anchors can satisfy the threshold (e.g., website + Instagram + neighborhood = 6 > 4). A taco cart with Instagram + coordinates is identified.

### Lane 2 — Get to Surfaced

**Purpose:** Populate website surface evidence for entities with a valid website.

**Entry condition:** Entity has website AND does not yet have parsed surface artifacts.

**Completion criteria:** At least one `merchant_surface_artifacts` row exists with non-empty `text_blocks`.

**Artifacts produced:** `merchant_surfaces` (homepage, menu, about, contact URLs), `merchant_surface_artifacts` (parsed text blocks).

**What runs in this lane:** ERA stages 2 (surface discovery), 3 (surface fetch), 4 (surface parse). Smart enrich phases 2-3 (discovery + parse) also feed this lane.

**Entities without websites skip this lane.** NATURE entities, parks, taco carts without websites — they advance directly from Lane 1 to Lane 3 with reduced offering expectations (defined by their vertical profile).

**This lane is free.** No API costs. There is no reason not to run it on every entity that has a website.

### Lane 3 — Get to Enriched

**Purpose:** Run interpretation/extraction and satisfy the subtype-aware completion gate.

**Entry condition:** Lane-specific prerequisites satisfied (surfaced entities for AI extraction; identified entities for all).

**Completion criteria:** Subtype-aware policy gate passes (see Section 3).

**Artifacts produced:** `derived_signals` (identity signals from Stage 5), `interpretation_cache` (TAGLINE from Stage 7, when the Interpretation layer is required), website enrichment outputs (menu URL, reservation URL, category from Stage 6).

**What runs in this lane:** ERA stages 5 (AI identity extraction), 6 (website enrichment), 7 (interpretation — tagline generation). Google Places Stage 1 for gap-fill (coordinates, hours, photos) when identity gaps remain.

**Lane 3 is subtype-aware.** Not all entities need the same outputs. A NATURE trail needs only `scenesense` (if surfaces exist) — and doesn't require the Interpretation layer at all. An EAT entity needs the full set including Interpretation. The completion gate determines what "done" means per entity. See Section 3.

---

## 3. Completion Contract — `isEntityEnriched()`

### Location

New function in `lib/coverage/enrichment-profiles.ts`, building on the existing `computeAccessCompleteness()` and `computeOfferingCompleteness()` functions.

### Signature

```typescript
/**
 * EnrichmentAssessment — one section per enrichment layer.
 *
 * The four layers (Identity, Access, Offering, Interpretation) map 1:1
 * to the enrichment profile model in enrichment-profiles.ts.
 */
interface EnrichmentAssessment {
  done: boolean;
  identity: {
    met: boolean;
    score: number;
    threshold: number;
    missing: string[];  // e.g., ['gpid', 'coords']
  };
  access: {
    complete: boolean;
    satisfied: number;
    expected: number;
    missing: string[];  // e.g., ['hours', 'phone']
  };
  offering: {
    complete: boolean;
    satisfied: number;
    expected: number;
    missing: string[];  // e.g., ['menu_url', 'offering_programs']
  };
  interpretation: {
    met: boolean;
    required: boolean;
    satisfied: number;
    expected: number;
    missing: string[];  // e.g., ['TAGLINE']
  };
}

function isEntityEnriched(entity: EntityForAssessment): EnrichmentAssessment;
```

### Assessment Logic

`done` is true when ALL four enrichment layers are satisfied:

1. **Identity met:** Identity score >= threshold (4 for fixed, 2 for nomadic).
2. **Access complete:** All expected access fields for this vertical are present (using existing `computeAccessCompleteness()`).
3. **Offering complete:** All expected offering fields for this vertical are present (using existing `computeOfferingCompleteness()`).
4. **Interpretation met:** All required interpretation outputs for this vertical are present (using `interpretation_expected` from the profile). For NATURE/ACTIVITY, this is trivially true (empty list).

### Interpretation Requirements by Profile

Add a new field to `EnrichmentProfile`:

```typescript
export interface EnrichmentProfile {
  verticals: string[];
  access_expected: AccessFieldKey[];
  offering_expected: OfferingFieldKey[];
  interpretation_expected: InterpretationKey[];  // NEW — fourth enrichment layer
}

type InterpretationKey = 'TAGLINE';  // extensible (future: SUMMARY, VIBE, etc.)
```

Profile updates:

| Profile | `interpretation_expected` |
|---|---|
| EAT, DRINKS, BAKERY, COFFEE, WINE | `['TAGLINE']` |
| CULTURE | `['TAGLINE']` |
| SHOP | `['TAGLINE']` |
| STAY | `['TAGLINE']` |
| WELLNESS, PURVEYORS | `['TAGLINE']` |
| ACTIVITY | `[]` — interpretation optional |
| NATURE | `[]` — interpretation optional |

This means NATURE and ACTIVITY entities can be `ENRICHED` without interpretation outputs. All other verticals require a TAGLINE (and potentially other interpretation outputs in the future).

### Naming Convention — Four Enrichment Layers

Saiko's enrichment model uses four named layers. All code, docs, and profiles should use these names consistently:

| Layer | Concern | Example Fields / Artifacts |
|---|---|---|
| **Identity** | Does this place exist? Can we anchor it? | name, coords, GPID, vertical, identity score |
| **Access** | Can a person reach or visit this place? | website, phone, hours, Instagram, reservation URL |
| **Offering** | What is this place about? What does it do? | menu URL, programs, SceneSense, events, editorial |
| **Interpretation** | Can Saiko express a point of view on this place? | tagline, (future: summary, vibe) |

"Tagline" is a specific output artifact of the Interpretation layer — the same way "phone" is an output of the Access layer. The layer name describes the enrichment concern, not any single field.

In the `EnrichmentProfile` interface, the corresponding fields are: `identity` (scored separately via identity anchors), `access_expected`, `offering_expected`, `interpretation_expected`.

### Access to Existing Data

The assessment function needs to inspect:

- Entity fields: `googlePlaceId`, `website`, `instagram`, `phone`, `latitude`, `longitude`, `neighborhood`, `primaryVertical`
- Canonical entity state (CES) for sanctioned values (website, phone, hours, Instagram — fallback from entity fields)
- `merchant_surface_artifacts`: existence check for surface evidence
- `derived_signals`: existence check for `identity_signals`
- `interpretation_cache`: existence check for current TAGLINE
- `place_appearances`: nomadic detection (for threshold adjustment)

The issue scanner already loads most of this data (see `scanEntities()` select clause). The assessment function should accept the same entity shape.

---

## 4. State Semantics — Eliminate the Trap Door

### `lastEnrichedAt` Becomes Observability Only

`lastEnrichedAt` is demoted to an observability/audit field. It records when enrichment was last *attempted*, not whether it succeeded. It MUST NOT be used for:

- Batch selection eligibility
- Stage skip logic
- Completion determination

### Batch Selection Uses `enrichmentStatus` + Policy Gate

Replace the current batch selection logic in `enrich-place.ts` (lines 223-238):

**Current (broken):**
```typescript
// Excludes entities with lastEnrichedAt set OR with current TAGLINE
where: {
  NOT: {
    interpretation_cache: { some: { outputType: 'TAGLINE', isCurrent: true } }
  },
  ...(force ? {} : { lastEnrichedAt: null }),
}
```

**New:**
```typescript
// Includes entities that are NOT yet ENRICHED per policy gate
where: {
  enrichmentStatus: { in: ['INGESTED', 'ENRICHING'] },
  // Optional: exclude entities currently being processed by another worker
}
```

Batch mode should select entities where `enrichmentStatus != 'ENRICHED'`. The `--force` flag overrides this to include ENRICHED entities (for re-enrichment).

### `enrichmentStatus` Transitions

Transitions become policy-driven:

| Trigger | New Status | Condition |
|---|---|---|
| Entity created (intake) | `INGESTED` | Always |
| Any enrichment work starts | `ENRICHING` | On first stage execution |
| Pipeline run completes | `ENRICHED` or stays `ENRICHING` | `isEntityEnriched()` returns `done: true` → ENRICHED; otherwise stays ENRICHING |
| Retry/re-enrichment triggered | Stays `ENRICHING` | Status doesn't regress |

**Critical change:** `ENRICHING → ENRICHED` is no longer gated on "stage 7 completed." It's gated on the policy function. A NATURE entity with identity + coordinates can be ENRICHED without ever running stage 7.

### Smart Enrich Integration

Smart enrich currently sets `lastEnrichedAt` but not `enrichmentStatus`. Fix:

1. Smart enrich sets `enrichmentStatus: ENRICHING` when it starts work.
2. Smart enrich does NOT set `lastEnrichedAt` (or sets it as observability only, not as a gate).
3. After smart enrich completes, run `isEntityEnriched()`. If done → set `ENRICHED`. Otherwise leave as `ENRICHING`.
4. Smart enrich sets `enrichmentStage` to reflect what ERA-equivalent work was done (e.g., if it ran discovery + parse, that's stages 2-4 equivalent).

### Stage 6 Skip Logic

Remove the `lastEnrichedAt` gate on stage 6. Replace with artifact check:

**Current (broken):**
```typescript
case 6: {
  if (entity.lastEnrichedAt) return { skip: true, reason: 'lastEnrichedAt already set' };
}
```

**New:**
```typescript
case 6: {
  // Skip if website enrichment outputs already exist (menu_url, reservation_url populated)
  // OR if entity has no website
  if (!entity.website) return { skip: true, reason: 'no website' };
  if (entity.menuUrl && entity.reservationUrl) return { skip: true, reason: 'website enrichment outputs already present' };
  return { skip: false, reason: '' };
}
```

---

## 5. Issue Scanner Updates

### New Issue Type: `enrichment_stalled`

Replaces the current `enrichment_incomplete` logic that can't see stuck entities.

**Detection:**
```typescript
// Entity has been through some enrichment but isn't done
if (entity.enrichmentStatus === 'ENRICHING') {
  const assessment = isEntityEnriched(entity);
  if (!assessment.done) {
    return {
      issueType: 'enrichment_stalled',
      severity: 'high',
      blockingPublish: true,
      metadata: {
        enrichmentStage: entity.enrichmentStage,
        missing: [
          ...assessment.identity.missing,
          ...assessment.access.missing,
          ...assessment.offering.missing,
          ...(assessment.interpretation.required && !assessment.interpretation.met ? ['TAGLINE'] : []),
        ],
      },
    };
  }
}
```

This gives Coverage Ops actionable detail: "Entity is stuck at stage 5, missing: hours, menu_url, TAGLINE." (where TAGLINE is the Interpretation layer output.)

### Updated `enrichment_incomplete` Logic

The existing `enrichment_incomplete` issue should only fire for entities that have never been touched:

```typescript
// Entity has identity anchors but was never enriched at all
if (entity.enrichmentStatus === 'INGESTED' && entity.googlePlaceId) {
  return { issueType: 'enrichment_incomplete', severity: 'high', blockingPublish: true };
}
```

---

## 6. Implementation Plan

### Phase A — Policy Function (foundation, no behavior change)

**Files to create/modify:**

- `lib/coverage/enrichment-profiles.ts` — Add `interpretation_expected` to profiles (fourth enrichment layer), add `isEntityEnriched()` function.
- `lib/coverage/enrichment-profiles.test.ts` — Add tests for new function.

**Verification:** Unit tests pass. Function returns correct assessments for EAT entities (Interpretation layer required — needs TAGLINE), NATURE entities (Interpretation layer not required — done without TAGLINE), nomadic entities (lower Identity threshold).

### Phase B — Batch Selection Fix (high impact, targeted change)

**Files to modify:**

- `scripts/enrich-place.ts` — Replace `lastEnrichedAt: null` batch filter with `enrichmentStatus: { in: ['INGESTED', 'ENRICHING'] }`. Remove `lastEnrichedAt` from single-entity completion logic (keep as observability write but don't use as gate).

**Verification:** Run batch in dry-run mode. Confirm entities previously stuck (with `lastEnrichedAt` set but no TAGLINE) are now selected. Confirm ENRICHED entities are excluded.

### Phase C — Smart Enrich Integration (close the orphan gap)

**Files to modify:**

- `lib/smart-enrich.ts` — Set `enrichmentStatus: ENRICHING` on start. Stop setting `lastEnrichedAt` as a gate. Run `isEntityEnriched()` at end and set ENRICHED if policy passes.

**Verification:** Smart-enrich a test entity. Confirm it's visible to batch selection afterward (if not fully enriched). Confirm entity with sufficient identity + surfaces gets ENRICHED status.

### Phase D — Stage Skip Logic Fix (prevent skipped stages)

**Files to modify:**

- `scripts/enrich-place.ts` — Replace stage 6 skip logic (remove `lastEnrichedAt` gate, use artifact check instead).

**Verification:** Run stage 6 on an entity that was previously skipped due to `lastEnrichedAt`. Confirm it now runs and produces outputs.

### Phase E — Issue Scanner Update (visibility into stuck entities)

**Files to modify:**

- `lib/coverage/issue-scanner.ts` — Add `enrichment_stalled` issue type with missing-requirements detail. Update `enrichment_incomplete` to only fire for truly untouched entities.

**Verification:** Run issue scanner. Confirm stuck entities (ENRICHING, stage < 7, no TAGLINE) now appear in Coverage Ops with actionable detail.

### Phase F — ENRICHED Transition Gate (policy-driven completion)

**Files to modify:**

- `scripts/enrich-place.ts` — Replace "stage 7 completed → ENRICHED" with `isEntityEnriched()` check after pipeline run.
- `app/api/admin/enrich/[slug]/route.ts` — After background process completes, run policy check.

**Verification:** Enrich a NATURE entity through stages 2-5 (no interpretation). Confirm it gets ENRICHED status because NATURE profile has no Interpretation layer requirements. Enrich an EAT entity through stages 2-5 only. Confirm it stays ENRICHING because the Interpretation layer (TAGLINE) is required.

---

## 7. Files Affected (Complete List)

### Core Changes

| File | Change |
|---|---|
| `lib/coverage/enrichment-profiles.ts` | Add `interpretation_expected` to profiles (fourth enrichment layer), add `isEntityEnriched()` |
| `lib/coverage/enrichment-profiles.test.ts` | Tests for new function |
| `scripts/enrich-place.ts` | New batch selection, new completion gate, stage 6 skip fix, `lastEnrichedAt` demotion |
| `lib/smart-enrich.ts` | Set `enrichmentStatus`, stop gating on `lastEnrichedAt`, run policy check |
| `lib/coverage/issue-scanner.ts` | Add `enrichment_stalled` issue type, update `enrichment_incomplete` logic |

### Supporting Changes

| File | Change |
|---|---|
| `app/api/admin/enrich/[slug]/route.ts` | Run policy check after enrichment completes |
| `app/api/admin/tools/enrich-stage/route.ts` | Same policy check integration |
| `prisma/schema.prisma` | No schema changes needed — all fields already exist |

### No Changes Needed

| File | Why |
|---|---|
| `app/api/admin/intake/route.ts` | Already sets INGESTED correctly (Phase 1 migration) |
| `app/api/admin/coverage-dashboard/route.ts` | Already reads from three-axis fields |
| `lib/admin/coverage/dashboard-queries.ts` | Stale/unused — separate cleanup |

---

## 8. Detection Query — Find Currently Stuck Entities

Run this query to identify entities that would benefit from the lane-first model:

```sql
SELECT
  e.slug,
  e.name,
  e.enrichment_stage,
  e.last_enriched_at,
  e.enrichment_status,
  e.primary_vertical,
  CASE WHEN ic.id IS NOT NULL THEN true ELSE false END AS has_tagline,
  CASE WHEN msa.id IS NOT NULL THEN true ELSE false END AS has_surfaces,
  CASE WHEN ds.id IS NOT NULL THEN true ELSE false END AS has_identity_signals
FROM entities e
LEFT JOIN interpretation_cache ic
  ON ic.entity_id = e.id AND ic.output_type = 'TAGLINE' AND ic.is_current = true
LEFT JOIN merchant_surface_artifacts msa
  ON msa.entity_id = e.id
LEFT JOIN derived_signals ds
  ON ds.entity_id = e.id AND ds.signal_key = 'identity_signals'
WHERE
  e.last_enriched_at IS NOT NULL
  AND e.enrichment_status != 'ENRICHED'
  AND ic.id IS NULL
ORDER BY e.enrichment_stage, e.last_enriched_at DESC;
```

This identifies entities with `lastEnrichedAt` set but no final TAGLINE — the population currently excluded from batch re-selection.

---

## 9. Verification Criteria

After implementation, all of the following must be true:

1. **No batch exclusion based solely on `lastEnrichedAt`.** Batch selection uses `enrichmentStatus` and the policy gate.
2. **Stuck entities are surfaced as issues.** Entities with `enrichmentStatus = ENRICHING` and incomplete policy gate appear in Coverage Ops with `enrichment_stalled` issue type and actionable missing-requirements detail.
3. **ENRICHED assignment matches subtype policy.** A NATURE entity with Identity + coordinates gets ENRICHED without Interpretation outputs. An EAT entity missing the Interpretation layer (no TAGLINE) stays ENRICHING.
4. **Smart enrich entities are visible to full pipeline.** After smart enrich, entities with `enrichmentStatus = ENRICHING` are selected by batch mode for remaining ERA stages.
5. **Stage 6 is not skipped due to prior enrichment.** Entities with `lastEnrichedAt` from a previous partial run still get website enrichment.
6. **`isEntityEnriched()` is deterministic and testable.** Given the same entity state, it always returns the same result. Unit tests cover all vertical profiles.

---

## 10. Rollback Strategy

Each phase is independently reversible:

- **Phase A** (policy function): Pure additive. Remove function if needed. No behavior change.
- **Phase B** (batch selection): Revert to `lastEnrichedAt: null` filter. Entities return to previous stuck state.
- **Phase C** (smart enrich): Revert `lastEnrichedAt` write behavior. Smart enrich orphans resume.
- **Phase D** (stage skip): Revert stage 6 skip condition. Entities skip website enrichment as before.
- **Phase E** (issue scanner): Remove `enrichment_stalled` issue type. Stuck entities become invisible again.
- **Phase F** (completion gate): Revert to "stage 7 = ENRICHED" logic. Universal Interpretation requirement resumes.

If partial rollback is needed, Phase A can remain while reverting Phases B-F — the policy function is inert until consumed.

---

## 11. Relationship to Existing Architecture

This spec implements concepts from multiple existing docs:

| Existing Doc | What This Spec Activates |
|---|---|
| Entity State Model (entity-state-model-v1) | `enrichmentStatus` transitions become policy-driven, not stage-driven |
| Enrichment Model (enrichment-model-v1) | Four-layer completeness scoring (Identity, Access, Offering, Interpretation) wired into completion gate via existing `enrichment-profiles.ts` |
| Enrichment Strategy (enrichment-strategy-v1) | "Exhaustion must be explicit" implemented via `enrichment_stalled` issue type |
| Evidence Model (enrichment-evidence-model-v1) | Confirmed absence principle supported — null-with-no-artifact vs null-with-artifact distinguishable |
| Enrichment Playbook (enrichment-playbook-v1) | Lane structure maps to playbook phases (identity → surface → AI) |

---

*Saiko Fields · Lane-First Enrichment · Spec · 2026-03-26*
