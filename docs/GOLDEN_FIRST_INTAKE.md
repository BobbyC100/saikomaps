# Golden-First Intake — Implementation Summary

**Spec:** Ken (CTO), 1–2 days. Identity-safe ingestion: raw → resolver → golden → gated promotion → places.

---

## Schema (applied)

- **raw_records:** `intake_batch_id`, `source_type`, `imported_at` added. Index on `intake_batch_id`.
- **golden_records:** `confidence` (float), `promotion_status` (PENDING | VERIFIED | PUBLISHED). Index on `promotion_status`.
- **resolution_links:** New table. `id`, `raw_record_id`, `golden_record_id` (nullable for ambiguous), `resolution_type` (matched | created | ambiguous), `confidence`, `match_method` (exact | normalized | fuzzy), `resolver_version`, `created_at`. FKs to raw_records and golden_records.

**Apply schema:** If your DB is in sync with Prisma schema, run `npx prisma db push`. If you use migrations, run `npx prisma migrate deploy` (resolve any prior failed migration first).

---

## CLI

```bash
# Intake: file → raw_records (default file: data/coverage_seed_v1.txt)
npm run intake -- --batch <id> --source <type> [--file <path>] [--dry-run]

# Resolve: batch raw_records → resolution_links + golden_records; writes CSVs under data/resolver-output/batch-<id>/
npm run resolve -- --batch <id>

# Promote: golden_records → places (only script that writes to places in this flow). Default dry-run.
npm run promote -- [--batch <id>] [--threshold 0.7] --commit --allow-places-write
```

---

## Resolver (deterministic)

1. **Exact normalized name** → link to existing golden (one match).
2. **Slug match** → link to existing golden.
3. **Fuzzy** (Jaro–Winkler ≥ 0.85, configurable) → single best; if tie → ambiguous.
4. **No match** → create new golden, resolution_links(created).
5. **Ambiguous** (multiple normalized matches or fuzzy tie) → resolution_links(ambiguous), no golden created/linked.

Every run stores `resolver_version` on resolution_links. New goldens created in the same batch are registered in-memory so duplicate names in the batch resolve to one golden.

---

## Outputs

- **data/resolver-output/batch-&lt;id&gt;/matched_existing.csv** — raw_id, name, golden_id, golden_name, match_method, confidence
- **data/resolver-output/batch-&lt;id&gt;/created_new.csv** — raw_id, name, golden_id, canonical_slug
- **data/resolver-output/batch-&lt;id&gt;/ambiguous.csv** — raw_id, name, reason

Summary printed: read_count, matched_count, created_count, ambiguous_count.

---

## Definition of Done (from spec)

- [x] Ingest `coverage_seed_v1.txt` (or any --file): `npm run intake -- --batch coverage_seed_v1 --source seed [--file data/coverage_seed_v1.txt]`
- [x] Resolver produces matched_existing.csv, created_new.csv, ambiguous.csv
- [x] No duplicates in golden_records (same-batch names dedupe via in-memory register)
- [x] No direct writes to places during intake; only `promote-golden-to-places.ts` writes to places when run with `--commit --allow-places-write`

---

## Files touched

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | raw_records fields, golden_records confidence + promotion_status, resolution_links model, enums |
| `prisma/migrations/20260217200000_golden_first_intake/migration.sql` | Migration for above |
| `lib/intake-normalize.ts` | Shared normalizeNameForMatch, slugForMatch |
| `scripts/intake-golden-first.ts` | Intake CLI |
| `scripts/resolve-golden-first.ts` | Deterministic resolver + CSVs |
| `scripts/promote-golden-to-places.ts` | Gated promotion to places |
| `package.json` | `intake`, `resolve`, `promote` scripts |
| `data/coverage_seed_v1.txt` | Sample seed (10 place names) |
