# Engineering Track: Identity Data Hardening

## Track 1 — Identity Layer Hardening (Engineering Scope)

We are not expanding features. We are hardening the identity data layer.

**Scope:**
1. Audit current schema for:
   - identity_signals
   - menu_signals
   - winelist_signals
   - freshness timestamps
   - provenance storage
2. Identify gaps:
   - Missing confidence field?
   - Missing freshness metadata?
   - Missing source weighting?
   - Axis storage format (JSON vs structured columns)?
3. Propose:
   - Minimal schema adjustments (if required)
   - No breaking migrations unless absolutely necessary
   - Backward compatible changes only

**Constraints:**
- No UI changes.
- No API surface expansion.
- No new features.
- No speculative work.

**Deliver:**
- Schema audit summary
- Exact migration diffs (if needed)
- Risk assessment
- Implementation order (smallest blast radius first)

---

## Context for this repo

- **Prisma schema:** `prisma/schema.prisma`. All identity/signals/provenance models live there.
- **Migrations:** `prisma/migrations/`. Use existing naming and add only backward-compatible migrations.
- **No UI, no new API routes, no new features** — schema and data-layer only.

---

## How to start

**Audit:** In `prisma/schema.prisma`, locate and list the definitions for:
- identity_signals (or equivalent identity/axis storage)
- menu_signals / winelist_signals (and any related golden-record links)
- Provenance tables and how they reference places/golden records
- Any `*_at` / `*_fetched_at` / `updated_at` style freshness columns on these or linked tables

**Gaps:** For each, check for: confidence (score or level), freshness metadata, source weighting, and whether axes/signals are JSON vs structured columns.

**Propose:** Only minimal, backward-compatible schema changes; prefer new optional columns over renaming or removing. If a migration is needed, output the exact migration SQL and a one-line risk note.

---

## Deliverables to produce

1. **Schema audit summary** — Table/list per area (identity, menu, winelist, provenance, freshness) with “has / missing” for confidence, freshness, source weighting, storage format.
2. **Exact migration diffs** — Only if needed; file path and full SQL.
3. **Risk assessment** — Short (e.g. “add nullable column only” vs “index change” vs “breaking”).
4. **Implementation order** — Ordered list, smallest blast radius first (e.g. add optional column before touching existing columns).

---

## Hard constraints

- Do not add or change UI components, API routes, or feature behavior.
- Do not introduce breaking migrations unless the audit shows they are strictly necessary; prefer optional columns and backfill later.

That gives the next chat a clear start (audit from schema.prisma), a fixed deliverable set, and strict boundaries so it stays on “identity data hardening” only.
