---
doc_id: COVOPS-APPROACH-V1
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: 2026-03-13
last_updated: 2026-03-14
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

For Coverage Ops v1, `entity_issues.issue_type` is intentionally **field-level** so each row maps to one deterministic action in the UI.

Examples:
```
missing_hours
missing_menu_link
missing_price_level
missing_instagram
```

Workflow grouping is handled by `problem_class` (identity, location, contact, social, editorial), not by changing the issue type contract.

This keeps automation and operator actions straightforward while preserving a workflow-level view in lanes.

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

---

## Implementation Status (as of 2026-03-14)

### What's been built

**Phase 0 — Resolution Tools: COMPLETE**

All four "needs to be built" tools are now operational:

| Tool | Route | Status |
|------|-------|--------|
| Neighborhood derivation | `/api/admin/tools/derive-neighborhood` | Live — reverse geocodes from lat/lng |
| Targeted stage re-run | `/api/admin/tools/enrich-stage` | Live — runs individual ERA stages via `spawn` |
| Instagram discovery | `/api/admin/tools/discover-social` (mode: instagram) | Live — Claude-powered search by name+city |
| TikTok discovery | `/api/admin/tools/discover-social` (mode: tiktok) | Live — same pattern as Instagram |
| Website discovery | `/api/admin/tools/discover-social` (mode: website) | Live — same pattern |
| GPID resolution | `/api/admin/tools/seed-gpid-queue` | Live — searches Google Places API for candidates |

**Phase 1 — Issue Layer: COMPLETE**

- `entity_issues` table exists and is populated by the issue scanner (`lib/coverage/issue-scanner.ts`)
- Scanner detects:
  - Tier 1 baseline: `unresolved_identity`, `missing_gpid`, `enrichment_incomplete`, `missing_coords`, `missing_neighborhood`, `missing_website`, `missing_phone`, `missing_instagram`, `missing_tiktok`, `potential_duplicate`
  - Tier 2 visit facts: `missing_hours`, `missing_price_level`, `missing_menu_link`, `missing_reservations`, `operating_status_unknown`, `google_says_closed`
  - Editorial / events: `missing_events_surface` (added 2026-03-18 — flags EAT/DRINKS/WINE/COFFEE entities with website but no events surface discovered)
- Issues have severity (CRITICAL/HIGH/MEDIUM/LOW), blocking_publish flag, problem_class grouping
- Re-scan is triggered manually from the UI or via API

**Phase 2 — Coverage Operations UI: COMPLETE (v1)**

Triage board at `/admin/coverage-ops`:
- Groups issues by problem_class (Identity, Location, Contact, Social, Editorial)
- Severity pills (CRIT/HIGH/MED/LOW) with color coding
- Per-issue inline actions:
  - `Find GPID` for identity gaps
  - `Run Stage 1` for `missing_coords`, `missing_phone`, `missing_hours`, `missing_price_level`, `operating_status_unknown`
  - `Run Stage 6` for `missing_menu_link`, `missing_reservations`
  - `Discover IG/TikTok/Web` for social/website discovery
  - `Derive` for neighborhood backfill
  - `Mark Closed` / `Still Open` override for `google_says_closed`
- Bulk actions: grouped by action label (for example `Run Stage 1 (N)` / `Run Stage 6 (N)`)
  - `Run Stage 2` for `missing_events_surface` (re-discover surfaces)
- Inline editing: paste website URL, IG handle, TikTok handle, GPID, events URL directly
- "None" button for confirmed-no-value (taco carts without websites, etc.)
- "Skip" button for won't-fix items
- Google search link per entity row
- Duplicate detection modal with side-by-side comparison and merge
- Re-scan Issues button to refresh after actions complete

Coverage Dashboard at `/admin/coverage`:
- Summary metrics: total entities, publishable count, missing field counts
- Smart counts that distinguish automation-fixable from human-required

**Phase 3 — System Simplification: NOT STARTED**

Existing specialized queues remain intact. GPID resolution queue is referenced but mostly bypassed — `seed-gpid-queue` writes directly and auto-matches high-confidence results.

### Key architectural decisions made during implementation

1. **GPID is not required for entity identity.** Weighted anchor scoring (`lib/identity-enrichment.ts`) determines identity completeness. GPID carries weight 10 but entities with name + address + coords can reach publication threshold without it. This supports taco carts and mobile vendors that don't have Google Places listings.

2. **Issue types map to fields, not workflows.** The original doc recommended workflow-oriented types (`social_unverified`, `contact_unverified`). Implementation uses field-level types (`missing_instagram`, `missing_phone`) because they map cleanly to inline editing and specific resolution tools. The `problem_class` grouping provides the workflow-level organization.

3. **Inline resolution over queue navigation.** Instead of linking out to specialized queues (GPID Queue, Review Queue), most actions execute directly from Coverage Ops. The GPID Queue page still exists for complex multi-candidate review, but simple cases resolve inline.

4. **TikTok as first-class social field.** Added alongside Instagram with identical treatment across 16 files. Driven by the observation that TikTok is the primary social platform for street food vendors and food reviewers.

5. **Entity merge with evidence preservation.** When duplicates are merged, surfaces from the deleted entity are recreated (delete + insert) on the kept entity to respect the `merchant_surfaces` immutability trigger. Gap-fill copies non-null fields from the deleted entity to fill nulls on the kept entity.

### Open items

- **Operating status workflow polish**: Core schema support already exists (`entities.status`, `entities.businessStatus`) and closure actions are wired in Coverage Ops. Remaining work is scanner/UI refinement for `operating_status_unknown`, plus stronger operator states for temporary vs permanent closure review.
- **Media coverage links**: Human-added editorial mentions, reviews, article URLs. Needs a storage model (likely `entity_appearances` or similar) and an "Add coverage" action in Coverage Ops.
- **Editorial thinness detection**: Issue scanner should flag entities with zero or few editorial sources. Depends on media coverage storage.
- **Auto-rescan after actions**: Bulk actions should trigger a re-scan automatically instead of requiring manual button click.
- **Progress indicators**: Background actions (Stage 1, etc.) show "Queued" but no progress feedback. Need polling or SSE for real-time status.
