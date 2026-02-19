# Resolver pipeline and golden_records → places data flow

## 1. Which tables does the resolver pipeline write to?

**Script:** `scripts/resolver-pipeline.ts`  
**Command:** `npm run resolver:run` (or `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/resolver-pipeline.ts`)

The resolver **writes to**:

| Table | When | Where in code |
|-------|------|----------------|
| **golden_records** | Creates a new canonical place when no candidates match, or when best score &lt; REVIEW_THRESHOLD (“kept separate”) | `prisma.golden_records.create()` — e.g. lines 244–257 (placekey), 312–324 (no candidates), 407–419 (kept separate) |
| **entity_links** | Every time a raw record is linked to a canonical (golden) id | `prisma.entity_links.create()` — e.g. lines 261–268, 328–335, 366–373, 423–430 |
| **raw_records** | Marks a raw record as processed | `prisma.raw_records.update(..., { data: { is_processed: true } })` — e.g. lines 271–274, 337–340, 375–378, 432–435 |
| **review_queue** | Only when best match has score in [REVIEW_THRESHOLD, AUTO_LINK_THRESHOLD) (e.g. 0.70–0.90) | `createReviewQueueItem()` in `lib/review-queue.ts` → `prisma.review_queue.create()` — called from resolver line 386–395 |

The resolver does **not** write to:

- **resolution_links** — that table is written by **`scripts/resolve-golden-first.ts`** (different pipeline).
- **places** — the resolver never touches `places`.

---

## 2. When does the resolver set `raw_records.is_processed = true`?

**Always** when it “disposes” of a raw record in a non–dry-run run. Specifically:

1. **Google Place ID pre-pass** (`googlePlaceIdPrepass`)  
   After linking a raw record to an existing canonical via matching `google_place_id`:  
   `scripts/resolver-pipeline.ts` ~lines 192–195.

2. **Placekey pre-pass** (`placekeyPrepass`)  
   After creating one new golden and linking all raw records that share that placekey:  
   ~lines 271–274.

3. **H3 + ML phase** (`resolveUnprocessedRecords`):
   - **No candidates** → create new golden + entity_link → set `is_processed: true` (~337–340).
   - **Best score ≥ AUTO_LINK_THRESHOLD (0.90)** → create entity_link only → set `is_processed: true` (~375–378).
   - **Best score &lt; REVIEW_THRESHOLD (0.70)** (“kept separate”) → create new golden + entity_link → set `is_processed: true` (~432–435).
   - **Best score in [0.70, 0.90)** → only creates a **review_queue** item; it does **not** set `is_processed: true` (so that record can be re-processed or resolved by human review).

So: for your 86 backbone_seed rows, each one had no H3 candidates, so each got a new `golden_records` row, an `entity_links` row, and `is_processed: true`. That’s why the next run reports 0 unprocessed.

---

## 3. What promotes resolver results into `golden_records` and/or `places`?

- **golden_records**  
  The resolver **itself** creates `golden_records` when it creates a new canonical (no candidates or “kept separate”). Nothing else is required for resolver output to appear in `golden_records`.

- **places**  
  The only script that is intended to **promote from golden_records into places** in this flow is:

  **`scripts/promote-golden-to-places.ts`**

  - **Command (dry-run):**  
    `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/promote-golden-to-places.ts`  
  - **Command (actually write to `places`):**  
    `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/promote-golden-to-places.ts --commit --allow-places-write`

  It:

  - Reads **golden_records** with:
    - `promotion_status` in `PENDING` | `VERIFIED` | `PUBLISHED`
    - `confidence >= threshold` (default 0.7)
    - `lat` and `lng` not null
    - Optionally filtered by `resolution_links.raw_record.intake_batch_id` when you pass `--batch <batchId>`
  - For each such golden not already in `places` (by slug), it **creates** a row in **places** (only if `--commit` and `--allow-places-write` are passed).

Important: **`scripts/resolver-pipeline.ts` does not set `golden_records.confidence`** when it creates new golden records. So the 86 backbone golden records have `confidence = null`. The promote script requires `confidence >= 0.7`, so those 86 are **not** selected and never get promoted to `places`. That’s why you see only 9 rows in `places` (those 9 likely came from another flow, e.g. seed or export).

To promote the backbone golden records you would need to either:

- Set `confidence` (and optionally `promotion_status`) on those golden records (e.g. via a one-off update or a small script), then run promote with `--commit --allow-places-write`, or  
- Change the promote script to treat “new entity” goldens (e.g. from resolver) as promotable when confidence is null (e.g. treat null as 1.0 for “new_entity” links).

---

## 4. Optional: alternative resolver that uses `resolution_links`

**`scripts/resolve-golden-first.ts`** is a different, deterministic resolver that:

- Reads **raw_records** (optionally by batch).
- Writes **resolution_links** and **golden_records** (and links raw → golden).
- Does **not** write to **places**.

So in this codebase:

- **Resolver pipeline** (`resolver-pipeline.ts`): raw → golden_records + entity_links + raw.is_processed (and sometimes review_queue). No resolution_links, no places.
- **Promote** (`promote-golden-to-places.ts`): golden_records → places, gated by confidence and flags; optional filter by resolution_links / intake_batch_id.

---

## 5. File reference

| Purpose | File |
|--------|------|
| Resolver pipeline (H3 + ML, creates golden + entity_links, sets is_processed) | `scripts/resolver-pipeline.ts` |
| Create review queue items (used by resolver for medium-confidence matches) | `lib/review-queue.ts` → `createReviewQueueItem()` |
| Promote golden_records → places (only writer to places in this flow) | `scripts/promote-golden-to-places.ts` |
| Alternative resolver (writes resolution_links + golden_records) | `scripts/resolve-golden-first.ts` |

---

## 6. Sanity check and “what places exist”

### Mental model

- **places** = canonical “real” things the product shows (what users see).
- **golden_records** = canonical candidates / staging (resolver output before promote).
- **raw_records** = intake exhaust (lots of duplicates/noise).
- **entity_links** = glue from raw → golden.

### 1) Sanity check in Prisma Studio

- **places** has no `source_name`; to see recently promoted backbone places, filter by **created_at** (e.g. `>= 2026-02-18` or your promote date).
- Spot-check these names (all 86 backbone places are in `places` with slugs like `unknown-<uuid-prefix>`):
  - Heritage Square Museum → slug `unknown-43ad9252`
  - Watts Towers → slug `unknown-16e44bc6`
  - Olvera Street → slug `unknown-662b447a`
  - Union Station Los Angeles → slug `unknown-6109d974`

### 2) In the app: confirm they render

- Place by slug: **GET `/api/places/[slug]`** (e.g. `/api/places/unknown-16e44bc6` for Watts Towers). Uses `db.places.findUnique({ where: { slug } })`.
- Viewer page: **`/place/[slug]`** (e.g. `http://localhost:3000/place/unknown-16e44bc6`).
- **Note:** **GET `/api/places/search?query=...`** uses the **Google Places API**, not the local `places` table, so searching “Watts Towers” there may not return your backbone row. To “see” backbone places in the app, use the slug URL above or whatever list/explore endpoint reads from `places`.

### 3) Inventory: what places exist

Use either query below (by category or by neighborhood) for a ranked list.

**By category (counts, then top names):**

```sql
SELECT
  COALESCE(category, '(none)') AS category,
  COUNT(*) AS n
FROM places
GROUP BY category
ORDER BY n DESC;
```

**By neighborhood (counts, then top names):**

```sql
SELECT
  COALESCE(neighborhood, '(none)') AS neighborhood,
  COUNT(*) AS n
FROM places
GROUP BY neighborhood
ORDER BY n DESC;
```

**Prisma equivalent (by category):**

```ts
const byCategory = await db.places.groupBy({
  by: ['category'],
  _count: true,
  orderBy: { _count: { category: 'desc' } },
});
```

**Prisma equivalent (by neighborhood):**

```ts
const byNeighborhood = await db.places.groupBy({
  by: ['neighborhood'],
  _count: true,
  orderBy: { _count: { neighborhood: 'desc' } },
});
```

---

## 7. Setting DATABASE_URL cleanly (psql / scripts)

If you set `DATABASE_URL` by capturing output from `node -r ./scripts/load-env.js ...`, Dotenv’s log lines can be included and break `psql` (e.g. “database … does not exist”). Use one of these:

**Option A – set the URL explicitly (no Dotenv):**

```bash
unset DATABASE_URL
export DATABASE_URL="postgresql://bobbyciccaglione@localhost:5432/saiko_maps"
```

**Option B – load from .env but only use the URL (silence Dotenv logs):**

```bash
export DATABASE_URL="$(node -r ./scripts/load-env.js -e 'console.log(process.env.DATABASE_URL)' 2>/dev/null)"
```

Then confirm and run queries:

```bash
psql "$DATABASE_URL" -c "\dt" | head
psql "$DATABASE_URL" -c "
SELECT
  COALESCE(NULLIF(TRIM(neighborhood), ''), '(none)') AS neighborhood,
  COUNT(*) AS places
FROM public.places
GROUP BY 1
ORDER BY places DESC
LIMIT 50;
"
```
