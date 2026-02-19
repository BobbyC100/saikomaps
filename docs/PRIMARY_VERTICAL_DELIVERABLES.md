# Primary Vertical — Deliverables & Notes

## Summary

- **Schema:** `PrimaryVertical` enum and `places.primary_vertical` column added.
- **Backfill:** SQL script to populate `primary_vertical` from `category`; audit script for unmapped values.
- **Coverage:** Report "Places by neighborhood × primary_vertical" on `/coverage` and `/admin/coverage`.
- **Drift prevention:** Write-time `primary_vertical` via `lib/primaryVertical.ts`; optional NOT NULL migration after backfill.

---

## 1. Migrations

- **`20260218000000_add_primary_vertical`** — Creates enum `PrimaryVertical` and nullable column `places.primary_vertical` with index.
- **`20260218000001_require_primary_vertical`** — Makes `primary_vertical` NOT NULL. **Run only after backfill is clean** (no unmapped rows, or you’ve decided to leave them and handle separately). After applying it, update `prisma/schema.prisma`: change `primary_vertical PrimaryVertical?` to `primary_vertical PrimaryVertical` on the `places` model and run `npx prisma generate`.

If `prisma migrate dev` is blocked (e.g. shadow DB issue with an older migration), apply the SQL manually:

```bash
psql "$DATABASE_URL" -f prisma/migrations/20260218000000_add_primary_vertical/migration.sql
```

---

## 2. Backfill

```bash
psql "$DATABASE_URL" -f scripts/backfill-primary-vertical.sql
```

Then audit unmapped categories:

```bash
psql "$DATABASE_URL" -f scripts/audit-unmapped-primary-vertical.sql
```

If you see unmapped `category` values, add rules to the `CASE` in `scripts/backfill-primary-vertical.sql` and re-run the UPDATE (and optionally re-run the audit).

---

## 3. Coverage report

- **Location:** Same coverage content used by `/coverage` and `/admin/coverage` (`app/coverage/CoverageContent.tsx`).
- **New section:** "Places by neighborhood × primary_vertical" — table of neighborhood, primary_vertical, and count.
- **Source:** `places` table (grouped by `neighborhood`, `primary_vertical`). The task SQL used `WHERE county = 'Los Angeles County'`; the `places` table does not have a `county` column in the current schema, so the report shows all places. If you add `county` to `places` later, you can filter there.

---

## 4. Ingestion / write-time validation

- **`lib/primaryVertical.ts`**
  - `categoryToPrimaryVertical(category)` — map string → enum or null.
  - `resolvePrimaryVertical(category, name, googleTypes)` — for creates: derives from category or `getSaikoCategory(name, googleTypes)`, defaults to `EAT` so a value is always produced.
  - `requirePrimaryVertical(category)` — strict: throws if category is missing or unmapped (use in CSV intake to reject bad rows).
  - `isValidPrimaryVertical(value)` — type guard for validation.

- **Updated to set `primary_vertical` on create:**
  - `app/api/import/add-to-list/route.ts`
  - `app/api/lists/[slug]/locations/route.ts`
  - `scripts/promote-golden-to-places.ts`
  - `scripts/sync-golden-to-places.ts`
  - `scripts/ensure-validation-linkage.ts`
  - `scripts/import-sgv-master.ts`

- **Other import scripts** (e.g. `import-south-la-south-bay.ts`, `import-master-with-dedupe.ts`, `import-venice.ts`, etc.): use the same pattern — add `primary_vertical: resolvePrimaryVertical(input.category ?? null, finalName, placeDetails?.types ?? [])` (or `categoryToPrimaryVertical(...) ?? 'EAT'` when copying from golden/category only) to every `places.create` (and, if applicable, `places.update` that sets category). Reject rows with invalid vertical by using `requirePrimaryVertical(category)` when the source provides an explicit category and you want to fail on invalid/missing.

- **Category** remains on `places` for now; reporting uses `primary_vertical`. You can stop using `category` in new reporting and enforce `primary_vertical` at ingestion.

---

## 5. Category strings and mapping (audit notes)

Backfill mapping used in `scripts/backfill-primary-vertical.sql`:

| category (normalized)     | primary_vertical |
|--------------------------|------------------|
| eat, restaurant          | EAT              |
| coffee                   | COFFEE           |
| wine, wine bar, wine shop| WINE             |
| drinks                   | DRINKS           |
| shop                     | SHOP             |
| culture                  | CULTURE          |
| nature                   | NATURE           |
| stay                     | STAY             |
| wellness                 | WELLNESS         |
| bakery                   | BAKERY           |
| purveyors                | PURVEYORS        |
| activity                 | ACTIVITY         |
| (anything else)          | NULL → audit     |

After running the backfill and audit, document any additional `category` values you see and how you mapped them (or left unmapped) in this section or in runbook notes.
