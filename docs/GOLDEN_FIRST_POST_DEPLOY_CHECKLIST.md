# Golden-First: Post–Migrate-Deploy Checklist

**When:** After `prisma migrate deploy` succeeds.  
**Before:** Running `promote` with `--commit --allow-places-write`.

Discipline here matters more than speed. Do not touch promote until steps 1–3 are done.

---

## Order of Operations

1. **Sanity-check resolver output** (non-negotiable)
2. **Evaluate fuzzy threshold** (0.85 Jaro–Winkler)
3. **Promotion dry run** (no `--commit` yet)

---

## 1️⃣ Sanity-Check Resolver Output

Resolver outputs live at: **`data/resolver-output/batch-<id>/`**

For the first real batch, open the CSVs there and verify:

| Check | Question |
|-------|----------|
| **Ambiguous rate** | Is it reasonable? (Not 40%+.) |
| **matched_existing.csv** | Any obvious false positives (wrong golden linked)? |
| **created_new.csv** | Any obvious duplicates (same place, two goldens)? |
| **Count math** | Do matched + created + ambiguous reconcile with the resolver summary (read_count)? |

**Stop conditions** — do not proceed to promote or tune until resolved:

- **STOP** if any obvious false merges are present in `matched_existing.csv`
- **STOP** if ambiguous rate > 20% (use 15–20% as the bar for the first pass)
- **STOP** if counts don’t reconcile (matched + created + ambiguous ≠ read_count)

This gives the operator permission to halt instead of “just keep going.”

You want confidence before writing anything to `places`.

---

## 2️⃣ Evaluate Fuzzy Threshold (0.85)

Default is **0.85** Jaro–Winkler (in `scripts/resolve-golden-first.ts`: `FUZZY_THRESHOLD`).

| If… | Then… |
|-----|--------|
| Too many ambiguous | Lower threshold slightly (e.g. 0.83–0.84) |
| Suspicious matches (false merges) | Raise threshold (e.g. 0.87–0.9) |

**Bias:** False merge > duplicate. Be conservative.

---

## 3️⃣ Promotion Dry Run

Before `--commit`, run:

```bash
npm run promote -- --batch coverage_seed_v1
```

Review:

- How many would be published?
- Any unexpectedly low-confidence goldens slipping through?
- Are lat/lng requirements behaving (only goldens with both set)?

No writes to `places` in this step.

---

## Handoff After First Batch

When migrate deploy has succeeded and you’ve run intake + resolve for the first real batch, report:

- **Total goldens created** (from resolver summary / created_new.csv)
- **Matched count**
- **Ambiguous count**

Then we tune (threshold, rules, or dry-run again) before any promote with `--commit --allow-places-write`.
