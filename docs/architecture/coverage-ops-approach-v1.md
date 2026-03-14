---
doc_id: COVOPS-APPROACH-V1
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: 2026-03-13
last_updated: 2026-03-13
project_id: SAIKO
systems:
  - coverage-operations
  - fields-data-layer
  - data-pipeline
related_docs:
  - docs/architecture/fields-era-overview-v1.md
  - docs/system/coverage-dashboard-design-v1.md
  - docs/ENRICHMENT-OPERATIONS-INVENTORY.md
  - docs/FIELDS_V2_TARGET_ARCHITECTURE.md
summary: Architectural position for Coverage Operations — introduces entity_issues as a unified operational layer over existing queue fragments, with tool readiness assessment and phased implementation plan.
---

# Coverage Operations — Architectural Position

---

## Current State

Saiko currently contains several specialized queue and conflict systems:

- `review_queue`
- `gpid_resolution_queue`
- `sanction_conflicts`

These tables serve specific pipeline workflows, primarily around identity resolution and canonical sanctioning.

They are not designed to function as a unified operational system for entity repair.

As a result, we currently have:

- the ability to detect problems
- the ability to run enrichment and resolution tools
- several specialized review queues

But we do not have a single operational surface that represents:

> "This entity has this problem, and here is the next action required to resolve it."

This is why Coverage Operations currently cannot exist as a true work queue.

---

## The Structural Gap

The schema today contains **queue fragments, not a queue system**.

| Table | Purpose |
|-------|---------|
| `review_queue` | Raw-record identity merge review |
| `gpid_resolution_queue` | GPID matching review |
| `sanction_conflicts` | Canonical claim conflict arbitration |

These are pipeline-level objects, not operator-level tasks.

Coverage Operations requires a new abstraction: **entity-level operational issues**.

---

## Queue Inventory — Why Each Is Insufficient Alone

### review_queue

Built around `raw_id_a`, `raw_id_b`, `canonical_id`. Workflow vocabulary is merge/review resolution.

Serves: low-confidence matches, duplicate review, new canonical decisions, pre-canonical identity review.

Not suitable for Coverage Operations because:
- anchored to raw records, not entity-level operational problems
- heavily identity-specific
- workflow vocabulary is about merge/review resolution, not repair actions

**Recommendation:** keep for what it is. Do not stretch into Coverage Operations.

### gpid_resolution_queue

Has `entityId`, resolver output, candidate GPID, human review status, reason codes.

Closest in spirit, but too narrow. Cannot cover location repair, contact repair, social confirmation, editorial thinness.

Currently has **0 rows** — exists structurally but is not yet the operational center of gravity.

**Recommendation:** keep as a specialized engine / detail table. Let Coverage Operations reference it, not depend on it as the main abstraction.

### sanction_conflicts

Field conflict detection, sanctioning arbitration, claim-level resolution.

Useful for identity conflicts, contact conflicts, classification disputes. But too narrow and too backend-facing for the operator workflow.

**Recommendation:** may feed issues later, but should not be the primary UI object.

---

## The Proposed Addition

Introduce a new operational table: **`entity_issues`**

Each row represents one actionable problem associated with an entity.

Examples:

- Secco → missing website → needs human confirmation
- Mariscos Jalisco → unresolved identity → run GPID resolver
- Gjusta → thin editorial coverage → search articles

This table becomes the single operational source for Coverage Operations.

---

## Architectural Relationship

Existing systems remain unchanged. They become inputs to the issue generation layer.

```
entities
canonical_entity_state
review_queue
gpid_resolution_queue
sanction_conflicts
editorial coverage signals
        ↓
  issue generator
        ↓
  entity_issues
        ↓
  Coverage Operations UI
```

The UI reads only from `entity_issues`.

This prevents the UI from needing to interpret complex pipeline logic directly.

---

## Why This Layer Is Necessary

Without an issue layer, Coverage Operations would need to infer problems dynamically from multiple sources:

- entity fields
- canonical state
- queue statuses
- enrichment stages
- conflict records

This creates brittle UI logic and tightly couples the interface to internal pipeline behavior.

The issue layer isolates those concerns. It converts pipeline signals into operator-facing tasks.

---

## Important Design Principle

`entity_issues` represent **operator problems, not database fields**.

Bad issue types:
```
missing_latitude
missing_instagram
missing_phone
```

Better issue types:
```
unresolved_identity
missing_location_context
contact_unverified
social_unverified
thin_editorial_coverage
```

Issue types should reflect repair workflows, not schema structure.

---

## Operational States

Each issue has a state representing the next action required.

```
needs_automation → processing → needs_human → resolved
                                           → suppressed
```

These states power the triage board in Coverage Operations.

---

## Example Issues

```
entity: Mariscos Jalisco
problem_class: identity
issue_type: unresolved_match
state: needs_automation
recommended_tool: google_places_lookup
blocking_publish: true
```

```
entity: Secco
problem_class: contact
issue_type: missing_website
state: needs_human
recommended_tool: confirm_none
blocking_publish: false
```

---

## Confirmed None Rule

Optional attributes require a persistent confirmation state.

```
website_status = confirmed_none
instagram_status = confirmed_none
phone_status = confirmed_none
```

Once confirmed, the issue generator stops producing issues for that attribute. This prevents repeated alerts and keeps queues manageable.

---

## Operational Insight — Same Symptom, Different Workflows

The current coverage dashboard surfaces symptoms, not problems.

Example: 40 entities show unknown neighborhood.

Analysis shows:
- 25 already have GPID
- 15 do not

These represent two different workflows:

**Case A — GPID exists:**
```
problem_class: location
issue_type: missing_neighborhood
tool: derive_neighborhood
```

**Case B — GPID missing:**
```
problem_class: identity
issue_type: unresolved_match
tool: google_places_lookup
```

A field-based dashboard cannot distinguish these cases cleanly. An issue system can.

---

## Editorial Coverage

Editorial coverage does not currently require new storage primitives.

Existing signals include:
- `entities.editorialSources`
- `coverage_sources`
- `place_coverage_status`

Editorial issues can initially be generated from: article count, source diversity, recency.

```
problem_class: editorial
issue_type: thin_editorial_coverage
recommended_tool: search_articles
```

---

## Anti-Patterns

### Don't build Coverage Operations directly on `entities`

Deriving everything live from entities + canonical_entity_state + queues will get messy fast. You'll encode brittle conditional logic in the UI: "if this field is null and that queue has a row and that status is X… then show this action unless that other status is Y…"

That feels okay for 2 weeks and then becomes annoying to maintain.

### Don't overload `needs_human_review`

`entities.needs_human_review` is too coarse. You now need to know: why, for what class, what next action, whether blocking, what was already attempted. A boolean can't carry that.

### Don't use `enrichment_stage` as operational state

`entities.enrichment_stage` is a loose string. Current values are mostly null and "7". That is not rich enough to drive Coverage Operations. It's okay as a pipeline artifact, but not as the triage model.

---

## Tool Readiness Assessment

**entity_issues without resolution tools is a complaint box.** Before building the issue layer, we need enough resolution actions that an operator can actually invoke from the UI.

### Tools that exist today

| Tool | Problem class | Current form | What it resolves |
|------|--------------|--------------|------------------|
| GPID resolution | identity | `lib/gpid-resolve.ts` + `/api/admin/intake/resolve` | Unresolved identity — matches entity to Google Place |
| Full enrichment pipeline | identity, contact, social | `scripts/enrich-place.ts` stages 1-7 + `/api/admin/enrich/[slug]` | End-to-end enrichment from GPID through tagline |
| Instagram discovery | social | `scripts/find-instagram-handles.ts` + `scripts/backfill-instagram-handles.ts` | Finds Instagram handles from website/surface data |

### Tools that need to be built

| Tool | Problem class | Complexity | What it resolves | Why it's buildable now |
|------|--------------|------------|------------------|----------------------|
| **Neighborhood derivation** | location | Low | 25 entities with GPID + coords but no neighborhood | Reverse geocode from existing lat/lng — one function |
| **Targeted stage re-run** | identity, contact, social | Medium | Re-run specific enrichment stage without full pipeline | `enrich-place.ts` already has `--from` and `--only` flags; needs API route |
| **Instagram as operator action** | social | Low-Medium | One-click Instagram discovery per entity from UI | Scripts exist; need API route + single-entity trigger |
| **Issue scanner/generator** | all | Medium | Automatically detect problems and create entity_issues rows | Query entities + canonical_entity_state for nulls, thin coverage, missing anchors |

### Tools that need design first

| Tool | Problem class | Open question |
|------|--------------|---------------|
| **Editorial source discovery** | editorial | What sources to search? What constitutes sufficient coverage? Product decision needed |
| **Contact verification** | contact | Verify against what? Google Places data? Fresh scrape? Needs spec |

### Tool readiness verdict

Identity and location problem classes have sufficient tooling to go operational today. Contact and social are close (scripts exist, need API routes). Editorial needs product design before tooling.

**Minimum viable tool set for Phase 1:** GPID resolution + neighborhood derivation + targeted stage re-run + issue scanner. This covers identity and location — the two highest-signal problem classes.

---

## Implementation Phases

### Phase 0 — Resolution Tools

Build the 3-4 resolution tools from the "needs to be built" list above. Each is a standalone API route an operator can invoke against an entity. Priority:

1. Neighborhood derivation (lowest complexity, 25 immediate fixes)
2. Targeted stage re-run API route (unlocks partial re-enrichment)
3. Instagram operator action (wire existing scripts to API)

### Phase 1 — Issue Layer

Add `entity_issues`. Build the issue scanner/generator.

Generate issues from:
- entity state
- canonical state
- review queues
- GPID queue
- sanction conflicts
- editorial signals

Existing queues remain unchanged.

### Phase 2 — Coverage Operations UI

Coverage Operations becomes a triage board driven entirely by `entity_issues`.

UI sections: publishable, needs automation, processing, needs human, suppressed.

Problem lanes: identity, location, contact, social, editorial.

### Phase 3 — System Simplification (Optional)

After the operational model stabilizes, specialized queues may be simplified or merged.

Possible outcomes:
- GPID queue becomes internal to identity tooling
- some review_queue logic migrates to issues
- sanction conflicts become operator-facing issues

These changes are not required initially.

---

## Final Position

Coverage Operations is not a schema rewrite.

It is an orchestration layer that normalizes operational problems across the system.

Existing specialized queues remain intact and feed issue generation.

`entity_issues` provides the unified task abstraction needed for a triage-based operational surface.

Resolution tools must exist before the issue layer — an issue without a resolution action is just a complaint.
