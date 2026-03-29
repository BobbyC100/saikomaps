---
doc_id: SAIKO-ENRICHMENT-ORCHESTRATOR-V2-EXEC-CHECKLIST
doc_type: runbook
status: draft
owner: Bobby Ciccaglione
created: '2026-03-29'
last_updated: '2026-03-29'
project_id: SAIKO
systems:
  - enrichment
  - orchestration
  - coverage-operations
related_docs:
  - docs/architecture/enrichment-orchestrator-v2-state-machine-spec.md
  - docs/ENRICHMENT_PIPELINE.md
  - docs/PIPELINE_COMMANDS.md
summary: >
  Operator execution checklist for validating enrichment orchestrator v2 lane behavior
  with explicit pass/fail gates and escalation criteria.
---

# Enrichment Orchestrator v2 Execution Checklist

## Purpose

This is the operator checklist for stress testing the v2 completion-lane behavior.
It focuses on objective gates and expected outputs, not design rationale.

## Test Cohort

Run against a mixed cohort with at least:

- 5 multi-menu EAT entities (for example: breakfast + dinner + beverage split)
- 5 entities with sparse/weak menu coverage
- 5 entities with strong coverage evidence
- 5 entities expected to block for known reasons

## Preflight

- Confirm `.env` and `.env.local` are loaded and valid.
- Confirm database connectivity.
- Confirm scripts run from repo root.

Commands:

```bash
node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/enrichment-orchestration-scorecard.ts --limit=3
```

Pass:

- Command exits `0`.
- Output prints scorecard rows and SLO summary.

Fail:

- Script crash, DB error, or malformed output.

Escalate to engineering if fail.

## Phase A Validation (Current Track)

Goal: prove reason contract + no-silent-drop + readiness gates + scorecard output.

### A1 — Single Entity Lane Run

```bash
npm run enrich:place -- --slug=<slug>
```

Pass:

- Enrichment run completes.
- Post-run output shows offering readiness status.
- If blocked, output includes explicit gate reasons.

Fail:

- No readiness output, or blocked without reason enums.

### A2 — Scorecard Human Output

```bash
node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/enrichment-orchestration-scorecard.ts --slug=<slug>
```

Pass:

- Row includes discovered/fetched/menu_identity/menu_structure/offering state.
- SLO lines are present with `numerator/denominator (percent)`.

Fail:

- Missing SLO denominator output or missing lane fields.

### A3 — Scorecard JSON Output

```bash
node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/enrichment-orchestration-scorecard.ts --slug=<slug> --json
```

Pass:

- Valid JSON with top-level `rows` and `slo`.
- `slo` includes:
  - `discoveryToFetchCoverage`
  - `fetchToInterpretCompletion`
  - `offeringAvailability`

Fail:

- Non-JSON output, missing keys, or invalid ratio shapes.

## SLO Gate Checks (Authoritative)

Validate denominator math from JSON output:

- Discovery->Fetch denominator = rows where `discoveredEligibleMenus > 0`
- Fetch->Interpret denominator = rows where `fetchedDistinctUrls > 0`
- Offering Availability denominator = rows with both `menuIdentityPresent` and `menuStructurePresent`

Pass:

- Computed denominators match printed denominators for sampled cohort.

Fail:

- Denominator mismatch for any metric.

Escalate immediately if fail.

## Blocked-Reason Quality Gate

For rows where `offeringReady = false`:

Pass:

- `gateReasons.length >= 1`
- Reasons are from shared enum set in `lib/enrichment/orchestration-reasons.ts`
- Reason set is actionable (missing vs stale distinction is visible)

Fail:

- Empty reasons, free-text-only reasons, or unknown reason codes.

## Multi-Service Regression Gate

Use a known multi-service entity (for example `wildes`) and verify:

Pass:

- Distinct discovered menu count reflects known menu split.
- Fetched distinct URL count reaches discovered count.
- `menu_identity` and `menu_structure` are both present.
- Offering readiness resolves to `true` or includes explicit blocking reasons.

Fail:

- Any hidden handoff gap (discovered menus not represented in fetch/interpret readiness path).

## Exit Criteria

Phase A is accepted only if all are true:

- 100% of tested blocked entities include explicit reason enums.
- 100% of tested scorecard runs produce denominator-based SLO output.
- Multi-service regression gate passes on all selected entities.

## Escalation Template

When filing a failure, include:

- `slug`
- command run
- expected output
- actual output
- reason codes seen (if any)
- timestamp and environment

Keep escalation issues strictly scoped to one failed gate per ticket.
