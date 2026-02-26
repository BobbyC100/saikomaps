# Golden → Places Invariants (Identity + Sync Rules)

## Purpose

Define the non-negotiable identity rules for syncing `golden_records` into `places` so reruns are safe, collisions are handled consistently, and we never fork identity.

---

## Core invariants

### 1. GPID is the primary identity key

- If `golden.google_place_id` exists, all matching must prefer it over slug/name.

### 2. Never create a place when GPID already exists

- If any `places` row exists with the same `google_place_id`, we must **update** that row.
- Creating another row is always a bug.

### 3. Slug is secondary and may drift

- Slug is treated as a convenience identifier and must not override GPID matches.
- Slug-only matching is allowed only when GPID is absent.

### 4. No silent rewrites on GPID-only matches

- If the match happened **only** by GPID, do not set `places.slug` automatically.
- **Reason:** slug collisions and unintended renames are high-risk.
- Slug reconciliation must be explicit and safe.

### 5. Conflict rule: GPID wins

If `slug → place A` and `gpid → place B` and **A ≠ B**:

- Do not create anything.
- Update **place B** (the GPID-matched row).
- Log a warning with enough detail to investigate.

### 6. Coordinates hygiene

- Never write `0/0` into `places.latitude` / `places.longitude`.
- Treat `0/0` as “missing/invalid”.

### 7. Idempotency is required

- Running sync twice should produce:
  - `created_count = 0` on second run (or unchanged)
  - no uniqueness constraint errors
  - stable total row counts
- Any rerun that increases row count indicates identity drift or duplicate creation.

---

## Operational checks (smoke tests)

- `npm run sync:places` twice → no errors; second run creates 0.
- Query: no duplicate `places.google_place_id` rows.
- Conflict logs (if any) are stable and repeatable across reruns.

---

## Implementation note

All code paths that reconcile `golden_records` ↔ `places` should use a shared helper:

- Build `placesByGpid` and `placesBySlug` once.
- Resolve: `existing = byGpid[gpid] ?? bySlug[slug]`.
