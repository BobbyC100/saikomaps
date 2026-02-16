# Menu & Winelist Signals — Rerun Guard + Data Integrity Policy (v1)

## Objective

Ensure:
1. We never re-run analysis unnecessarily.
2. We never burn API calls on low-quality scrapes.
3. We never store empty or meaningless signal payloads.
4. Freshness tracking remains provable and auditable.

---

## 1️⃣ Freshness Rule (Source of Truth)

Signals are considered fresh when:
- `status = 'ok'`
- `source_scraped_at === golden_records.scraped_at`
- `--reprocess` flag is NOT set

If all conditions are true → skip analysis.

### SQL Verification

```sql
SELECT count(*) AS stale_count
FROM menu_signals ms
JOIN golden_records gr ON gr.canonical_id = ms.golden_record_id
WHERE ms.status='ok'
  AND ms.source_scraped_at IS DISTINCT FROM gr.scraped_at;
```

**Expected after any batch:** `stale_count = 0`

---

## 2️⃣ Model Version Policy (Intentional Behavior)

**Current rule:**
- Changing `model_version` does NOT trigger re-analysis.

**Reprocessing requires:**
- `--reprocess`
- OR a new `scraped_at` timestamp

This prevents silent API cost increases from prompt tweaks.

---

## 3️⃣ Preflight Quality Gate (Before API Call)

Before calling the model, raw text must pass:

### Minimum Requirements
- `menu_raw_text` exists
- `length(menu_raw_text) >= 2000` characters
- Contains meaningful content (heuristics):
  - At least 15 newline-separated lines
  - OR food-like tokens (`$`, `oz`, `salad`, `taco`, `pasta`, etc.)
  - NOT dominated by boilerplate terms (`privacy policy`, `copyright`, `javascript required`)

### If it fails:

```typescript
status = 'failed'
error = 'insufficient_menu_text'
payload = null
confidence = null
```

**This prevents:**
- Empty "partial" rows
- Token waste
- Long-term data pollution

---

## 4️⃣ Empty Payload Protection

If model returns:
- `null` categories
- `null` price tier
- empty arrays
- `confidence = 0`

**Then:**

```typescript
status = 'failed'
error = 'analysis_returned_empty_payload'
```

`partial` is reserved for:
- Some structure exists
- Meaningful but incomplete extraction

---

## 5️⃣ Audit Guarantees (Must Always Be True)

For every non-skipped run:
- `source_scraped_at = golden_records.scraped_at`
- `analyzed_at` updates
- `status` explicitly set
- `error` populated if failed
- `payload` never stored when meaningless

---

## 6️⃣ Rerun Safety Checklist (Before Large Batch)

Run:

```sql
SELECT count(*) FROM menu_signals;
```

Then:

```sql
SELECT count(*)
FROM menu_signals ms
JOIN golden_records gr ON gr.canonical_id = ms.golden_record_id
WHERE ms.status='ok'
  AND ms.source_scraped_at = gr.scraped_at;
```

This tells you:
- How many are already fresh
- How many would be skipped

**If most are fresh → do NOT run full batch.**

---

## 7️⃣ Production Batch Guardrail

Before large runs:
1. Run `--limit=10`
2. Confirm:
   - `stale_count = 0`
   - No explosion in `analyzed_at`
3. Only then increase batch size.

---

## 8️⃣ Cost Protection Rules

The script must:
- Respect `--dry-run` (zero API calls)
- Enforce max input size (50k chars cap)
- Process sequentially (no unbounded concurrency)
- Require `--reprocess` to override freshness

---

## 9️⃣ Allowed Reprocessing Scenarios

**Reprocessing is valid when:**
- Scraper updated
- `scraped_at` changed
- Prompt fundamentally redesigned
- Model upgraded intentionally

**Not valid when:**
- Just curious
- Tweaking confidence threshold
- Testing logging changes

---

## 🔟 System Invariants

After full coverage:

```sql
SELECT count(*)
FROM menu_signals ms
JOIN golden_records gr ON gr.canonical_id = ms.golden_record_id
WHERE ms.status='ok'
  AND ms.source_scraped_at IS DISTINCT FROM gr.scraped_at;
```

**Must always equal:** `0`

If not → stop and investigate.

---

## Final Rule

- We never optimize prompts before validating scrape quality.
- We never run full batches before validating freshness.
- We never trust "partial with empty payload".

---

## Current Status (Last Updated: 2026-02-15)

### Batch Run Results
- **10-record smoke test:** ✅ 90% ok, 10% partial, 0% failed
- **50-record menu batch:** ✅ 72% ok, 28% partial, 0% failed

### Known Issues
- ⚠️ 28% "partial" status with empty payloads (confidence=0)
- 🔧 **Action:** Implement preflight quality gate (#3)
- 🔧 **Action:** Implement empty payload protection (#4)

### Schema Notes
- Foreign key: `menu_signals.golden_record_id → golden_records.canonical_id`
- NOT `golden_records.id` (which doesn't exist)
- Use `canonical_id` in all JOIN queries
