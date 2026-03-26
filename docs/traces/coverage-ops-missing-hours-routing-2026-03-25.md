---
doc_id: TRACE-COVERAGE-OPS-MISSING-HOURS-ROUTING-2026-03-25
doc_type: change-spec
status: DRAFT
owner: Bobby Ciccaglione
created: 2026-03-25
last_updated: 2026-03-25
layer: Traces
depends_on:
  - ENRICH-STRATEGY-V1
  - COVOPS-APPROACH-V1
  - ARCH-COVERAGE-TIERS-V1
---

# Coverage Ops Missing Hours Routing Update (2026-03-25)

## Why this change was made

Operators were using `Run Stage 1` for `missing_hours` and seeing no improvement for entities where website surfaces already existed but extraction had not run. This created repeat loops and made the issue look unresolved even when useful source evidence was already present in-system.

The policy direction is clear:
- free sources before paid
- do not treat GPID as the center of identity
- if expected paths are exhausted and data is still absent, route to human review as a possible non-existence/not-findable case

## What changed

### 1) `missing_hours` action is now evidence-aware

`missing_hours` no longer assumes Stage 1 as the default operator action.

Routing now follows issue detail + evidence state:
- Stage 6 when website evidence exists and hours are still missing
- Stage 1 when GPID path exists but website path does not
- Stage 2 when neither website nor GPID path exists (discover surfaces first)

### 2) Scanner detail now carries exhaustion hints

`missing_hours` issue detail now includes:
- `recommended_stage`
- `has_website`
- `has_gpid`
- `not_findable_candidate`

`not_findable_candidate` indicates the entity should be considered for manual review/suppression handling rather than blind repeated reruns.

### 3) KB policy was updated to match implementation

Architecture docs now explicitly state:
- exhaustion should be explicit
- unresolved gaps after policy-aligned attempts become manual review candidates
- confirmed-none style handling should suppress repeated scanner churn

## Scope boundaries

- Rendering behavior is unchanged: if hours exist from any sanctioned source, they render.
- This change is operational routing and issue triage behavior only.
- This change does not redefine vertical/subtype applicability rules (those remain in scanner expectation policy).

## Files touched (implementation + policy docs)

- `lib/coverage/issue-scanner.ts`
- `app/admin/coverage-ops/tool-actions.ts`
- `app/admin/coverage-ops/types.ts`
- `docs/architecture/coverage-ops-approach-v1.md`
- `docs/architecture/enrichment-strategy-v1.md`

## Verification

- Type-level compatibility maintained for Coverage Ops detail payload handling.
- Docs index regenerated (`docs/registry.json`, `docs/context.md`) so this trace appears in KB context.

