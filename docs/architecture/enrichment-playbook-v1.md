---
doc_id: ENRICH-PLAYBOOK-V1
title: City Launch Enrichment Playbook
status: draft
owner: bobby
created: 2026-03-16
updated: 2026-03-17
depends_on: [ENRICH-STRATEGY-V1]
---

# City Launch Enrichment Playbook v1

Reusable, sequenced playbook for enriching 1,000+ entities at city-launch
scale. Designed to maximize coverage at minimum cost. Free before paid.
Evidence before canonical. Dry-run before writes.

---

## 1. Tool Inventory

### 1A. ERA Pipeline Stages (orchestrated by `npm run enrich:place`)

| # | Stage | Script | Source | Writes To | Cost |
|---|-------|--------|--------|-----------|------|
| 1 | Google Places identity | `backfill-google-places.ts` | Google Places API | `entities` (GPID, coords, address, hours, photos, neighborhood) | **$$** ~$0.007/entity |
| 2 | Surface discovery | `run-surface-discovery.ts` | Entity website (domain crawl) | `merchant_surfaces` (homepage, about, menu, contact, events URLs) | Free |
| 3 | Surface fetch | `run-surface-fetch.ts` | Discovered surface URLs | `merchant_surfaces` (raw HTML/text, content_hash) | Free |
| 4 | Surface parse | `run-surface-parse.ts` | Stored raw_html/raw_text | `merchant_surface_artifacts` (structured text_blocks) | Free |
| 5 | Identity signals (AI) | `extract-identity-signals.ts` | Parsed artifacts (menu, about, wine copy) | `derived_signals` (cuisine_posture, service_model, price_tier, wine_program, personality, signature_dishes) | **$** ~$0.001/entity (Claude Haiku) |
| 6 | Website enrichment | `run-website-enrichment.ts` | Website HTML | `merchant_signals` + `entities` (menu_url, reservation_url, events_url, catering_url, category, cuisine); also `observed_claims` at confidence >= 0.75 | **$** ~$0.002-0.005/entity (Claude) |
| 7 | Tagline generation (AI) | `generate-taglines-v2.ts` | Identity signals + entity data | `interpretation_cache` (TAGLINE, candidates, pattern) | **$** ~$0.0008/entity (Claude) |

Pipeline defaults to `--from=2` (skips Google Places). Use `--include-google`
to start from stage 1.

### 1B. Social Discovery

| Tool | Trigger | Source | Writes To | Cost |
|------|---------|--------|-----------|------|
| discover-social (Instagram) | `POST /api/admin/tools/discover-social` `{ mode: "instagram", slug }` | Claude Haiku + web_search | `entities.instagram` (medium/high confidence only) | **$** ~$0.001/entity |
| discover-social (TikTok) | `POST /api/admin/tools/discover-social` `{ mode: "tiktok", slug }` | Claude Haiku + web_search | `entities.tiktok` (medium/high confidence only) | **$** ~$0.001/entity |
| discover-social (website) | `POST /api/admin/tools/discover-social` `{ mode: "website", slug }` | Claude Haiku + web_search | `entities.website` (medium/high confidence only) | **$** ~$0.001/entity |
| discover-social (batch) | `POST /api/admin/tools/discover-social` `{ mode: "both", limit: N }` | Claude Haiku + web_search | `entities.instagram` + `entities.website` | **$** ~$0.002/entity |

**Note:** Batch mode spawns `scripts/discover-social.ts` as background process.
This script does **not yet exist on disk** — the API route handles single-entity
inline, but the batch script file is missing. Needs to be created before bulk
social discovery runs.

### 1C. Merchant Surface Scanner

| Tool | Command | Source | Writes To | Cost |
|------|---------|--------|-----------|------|
| scan-merchant-surfaces | `npx tsx scripts/scan-merchant-surfaces.ts [--limit=N] [--slug=<slug>]` | Entity website homepage | `merchant_surface_scans` (platform, menu format/URL, reservation platform/URL, ordering platform/URL, Instagram URL, newsletter, gift cards, careers, private dining, sibling entities) | Free |

This is a detection-only pass — append-only snapshots to
`merchant_surface_scans`. Covers EAT entities in the LA bounding box with
websites. Concurrency=6, timeout=12s.

### 1D. Canonical Population

| Tool | Command | Source | Writes To | Cost |
|------|---------|--------|-----------|------|
| populate-canonical-state | `npx tsx scripts/populate-canonical-state.ts [--dry-run] [--limit=N]` | `entities` + `golden_records` (fallback) | `canonical_entity_state`, `canonical_sanctions`, `observed_claims`, `derived_signals`, `interpretation_cache` | Free |

Promotes existing entity data to the Fields v2 canonical layer. Creates
`canonical_entity_state` rows with sanctions recording provenance. Also migrates
taglines to `interpretation_cache` and identity signals to `derived_signals`.

### 1E. Coverage Gap Fill (Google Places)

| Tool | Command | Source | Writes To | Cost |
|------|---------|--------|-----------|------|
| coverage-apply | `npm run coverage:apply:neon -- --limit=20 --apply` | Google Places API (Details + Attributes) | `entities` (hours, googlePhotos, googlePlacesAttributes, businessStatus), `place_coverage_status` | **$$** ~$0.007-0.02/entity |

Targets three specific gap groups: `NEED_GOOGLE_PHOTOS`, `NEED_HOURS`,
`NEED_GOOGLE_ATTRS`. Requires `--apply` flag for writes (default is dry-run).
Rate limit 250ms between calls. JSON report written to `data/coverage/`.

### 1F. Instagram / Meta Toolchain

Full Instagram pipeline — discovery, ingestion, and operator actions. Requires
`INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_USER_ID` in `.env.local`.

**Discovery (find handles):**

| Tool | Command | Source | Writes To | Cost |
|------|---------|--------|-----------|------|
| Handle extraction from surfaces | `npm run backfill:instagram-handles` | Parsed `merchant_surfaces` (Instagram URLs in HTML) | `entities.instagram` | Free |
| Handle finder (web search) | `npm run find:instagram` | Web search for official IG handles | CSV output for review → merge | Free |
| Handle finder (LA county) | `npm run find:instagram:la` | Web search, LA county scope | `data/instagram-la-suggestions.csv` | Free |
| Handle finder (Tier 1+2) | `npm run find:instagram:tier12` | Web search, top-tier entities | `data/instagram-tier12-suggestions.csv` | Free |
| Scrape from websites | `scripts/scrape-instagram-from-websites.ts` | Entity website HTML | `entities.instagram` | Free |
| Merge to golden records | `npm run merge:instagram` | Suggestions CSV | `golden_records` | Free |

**Ingestion (fetch media via Meta Graph API):**

| Tool | Command | Source | Writes To | Cost |
|------|---------|--------|-----------|------|
| Single entity | `npm run ingest:instagram -- --username=<handle> --entity-id=<id>` | Instagram Business Discovery API | `instagram_accounts`, `instagram_media` | Free (rate-limited) |
| Batch (all with handles) | `npm run ingest:instagram -- --batch` | Instagram Business Discovery API | `instagram_accounts`, `instagram_media` | Free (rate-limited) |
| Hours from Instagram | `scripts/backfill-instagram-hours.ts` | Instagram business profile data | Entity hours | Free |

**Admin API (operator actions):**

| Action | Endpoint | What it does |
|--------|----------|-------------|
| `backfill` | `POST /api/admin/tools/instagram-discover` `{ action: "backfill" }` | Extract handles from `merchant_surfaces` → `entities.instagram` (background) |
| `ingest` | `POST /api/admin/tools/instagram-discover` `{ action: "ingest", slug }` | Fetch media for one entity via Graph API (background) |
| `ingest batch` | `POST /api/admin/tools/instagram-discover` `{ action: "ingest", batch: true }` | Fetch media for all entities with handles (background) |
| `set` | `POST /api/admin/tools/instagram-discover` `{ action: "set", entityId, handle }` | Manually set handle (inline) |
| `confirm none` | `POST /api/admin/tools/instagram-discover` `{ action: "set", entityId, none: true }` | Confirm entity has no Instagram (inline, sets `NONE`) |

**Rate limits:** Meta Graph API — 200-3000 calls/hour depending on endpoint.
Default inter-account delay: 3s. Media limit per account: 200 (configurable).

**Export tools (for offline review):**

| Tool | Command | Output |
|------|---------|--------|
| Export backfill list | `npm run export:instagram` | CSV of entities needing IG handles |
| Export LA county | `npm run export:instagram:la` | CSV of LA county entities missing IG |
| Export Tier 1+2 | `npm run export:instagram:tier12` | CSV of top-tier entities missing IG |

### 1G. Standalone Backfill Tools

| Tool | npm script | Source | Writes To | Cost |
|------|-----------|--------|-----------|------|
| Google Place ID backfill | `backfill:gpid:neon` | Google Places Text Search | `golden_records.google_place_id` | **$$** ~$0.007/entity |
| Website from Google | `backfill:websites` | Google Places Details | `entities.website` | **$$** ~$0.007/entity |
| Address backfill | `backfill:entities-address` | Google Places Details | `entities.address` | **$$** ~$0.007/entity |
| Neighborhood backfill | `backfill:neighborhood` | Google Places address_components | `entities.neighborhood` | **$$** ~$0.007/entity |
| Google attrs backfill | `backfill:google-attrs` | Google Places API | `entities.googlePlacesAttributes` | **$$** ~$0.02/entity |
| Confidence scoring | `backfill:confidence` | Multi-source analysis | `entities.confidence` | Free |

### 1H. Admin API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/enrich/[slug]` | POST | Trigger single-entity pipeline (background, stages 2-7) |
| `/api/admin/enrich/[slug]` | GET | Poll enrichment progress (stage 1-7, done flag) |
| `/api/admin/tools/enrich-stage` | POST | Re-run specific stage or resume from stage |
| `/api/admin/tools/discover-social` | POST | Social handle/website discovery (Claude + web_search) |
| `/api/admin/tools/scan-issues` | POST | Run issue scanner on entity |
| `/api/admin/tools/derive-neighborhood` | POST | Derive neighborhood from coordinates |
| `/api/admin/tools/instagram-discover` | POST | Instagram handle discovery |
| `/api/admin/tools/seed-gpid-queue` | POST | Queue entities for GPID resolution |

### 1I. Coverage Dashboard SQL (lib/admin/coverage/sql.ts)

Cross-reference point. The Coverage Ops dashboard runs these audit queries:

- `OVERVIEW_COUNTS_SQL` — total DB, addressable, reachable, dark inventory
- `REACHABLE_MISSING_FIELDS_SQL` — per-field null counts for reachable entities
  (slug, name, latlng, google_place_id, hours, phone, website, instagram, neighborhood)
- `REACHABLE_NEIGHBORHOOD_SCORECARD_SQL` — per-neighborhood completion rates
- `REACHABLE_REDFLAGS_SQL` — entities failing Tier-1 (missing slug/name/coords/GPID)
- `FIELDS_BREAKDOWN_*_SQL` — field completion across reachable, addressable, total DB cohorts

### 1J. Missing Tools (referenced in prompt but not yet built)

| Tool | Gap | Status |
|------|-----|--------|
| `scripts/discover-social.ts` (batch CLI) | Batch social discovery spawned by API route | API route exists, batch script file does not |
| `signals:menu:sync` npm script | Menu URL sync from merchant signals | No npm script or script file found |

---

## 2. Fully Enriched Entity — the Benchmark

Definition of "done" varies by `primary_vertical`. A restaurant (EAT) is the
most demanding. Other verticals (COFFEE, SHOP, STAY) require subsets.

### EAT Entity — Complete Profile

**Identity-critical** (required for publication):
- `name` — sanctioned via Fields v2
- `latitude`, `longitude` — from Google Places or intake CSV
- `google_place_id` — optional but strongly preferred (taco carts may lack)
- `address` — from Google Places or website

**Operational** (expected for quality):
- `neighborhood` — from Google Places address_components
- `phone` — from Google Places or website
- `website` — from intake, Google Places, or discover-social
- `hours` — from Google Places or website
- `instagram` — from website scrape, discover-social, or manual
- `tiktok` — from website scrape, discover-social, or manual
- `price_level` — from Google Places
- `reservation_url` — from website enrichment (Stage 6) or scan-merchant-surfaces
- `menu_url` — from website enrichment (Stage 6) or scan-merchant-surfaces
- `category` + `cuisine_type` — from website enrichment (Stage 6)
- `events_url` — from events surface discovery (Stage 2) + website enrichment (Stage 6)
- `catering_url` — from events surface discovery (Stage 2) + website enrichment (Stage 6)
- `event_inquiry_email` — from events surface parse (Stage 4)
- `event_inquiry_form_url` — from events surface parse (Stage 4)

**Content** (differentiating):
- `derived_signals.identity_signals` — from AI extraction (Stage 5)
- `derived_signals.offering_programs` — 10 program containers (food, wine, beer, cocktail, non_alcoholic, coffee_tea, service, private_dining, group_dining, catering) assembled from upstream signals
- `interpretation_cache.TAGLINE` — from AI generation (Stage 7)
- `description` — from editorial source, website, or synthesis

**Canonical layer** (Fields v2):
- `canonical_entity_state` row populated with best values from evidence
- `canonical_sanctions` audit trail for each sanctioned field
- `observed_claims` backing each canonical value

**Convenience / display**:
- `google_photos` — from Google Places
- `merchant_signals` — menu/reservation/ordering URLs + providers
- `merchant_surface_scans` — homepage detection snapshot

**Fully enriched** in pipeline terms = `interpretation_cache` has a `TAGLINE`
row with `is_current=true`.

### Other Verticals — Reduced Playbooks

| Vertical | Drops compared to EAT |
|----------|----------------------|
| COFFEE | No reservation_url, no menu_url usually, no cuisine_type |
| SHOP | No menu_url, no reservation_url, hours requirement relaxed |
| STAY | No menu_url, reservation_url = booking link, no cuisine_type |
| CULTURE | No menu_url, no reservation_url, no cuisine_type |

---

## 3. Coverage Gap Analysis

### Gap Ranking (estimated, pre-query)

Based on the issue scanner rules (`lib/coverage/issue-scanner.ts`) and the
coverage dashboard SQL queries:

| Rank | Gap | Issue Type | Blocking? | Tool to Fix |
|------|-----|-----------|-----------|-------------|
| 1 | No enrichment run at all | `enrichment_incomplete` | Yes | ERA pipeline (stages 2-7) |
| 2 | Missing website | `missing_website` | No | `discover-social` (mode=website) or `backfill:websites` (Google $$) |
| 3 | Missing Instagram | `missing_instagram` | No | `backfill:instagram-handles` (free, from surfaces) then `discover-social` (mode=instagram, $) |
| 4 | Missing neighborhood | `missing_neighborhood` | No | `derive-neighborhood` API or `backfill:neighborhood` (Google $$) |
| 5 | Missing hours | `missing_hours` | No | `coverage:apply:neon --apply` (Google $$) |
| 6 | Missing phone | `missing_phone` | No | Google Places (Stage 1 $$) |
| 7 | Missing TikTok | `missing_tiktok` | No | `discover-social` (mode=tiktok, $) |
| 8 | Missing price level | `missing_price_level` | No | Google Places or AI inference (Stage 5) |
| 9 | Missing GPID | `missing_gpid` | No | `backfill:gpid:neon` (Google $$) |
| 10 | Missing coords | `missing_coords` | Yes | Google Places (Stage 1 $$) |
| 11 | Missing canonical_entity_state | N/A | No | `populate-canonical-state.ts` (free) |

### Actual Counts (run before execution)

Run these queries to get current numbers before starting:

```bash
# Overview counts (total, addressable, reachable, dark inventory)
# Uses OVERVIEW_COUNTS_SQL from lib/admin/coverage/sql.ts

# Missing fields for reachable entities
# Uses REACHABLE_MISSING_FIELDS_SQL

# Or use the Coverage Ops dashboard at /admin/coverage-ops
```

### The Two Populations

1. **Has website (~80%)** — full pipeline (stages 2-7) can run autonomously.
   Google Places (stage 1) is optional if coords/address exist from intake.

2. **No website (~20%)** — parks, markets, street vendors, civic venues.
   Need `discover-social` (website mode) first, then pipeline. If no website
   found, need Google Places for identity + social discovery for handles.

---

## 4. Tool-to-Gap Mapping

| Field Gap | Free Tool | Paid Tool (fallback) |
|-----------|-----------|---------------------|
| website | `discover-social` (mode=website, $0.001) | `backfill:websites` (Google, $0.007) |
| instagram | `backfill:instagram-handles` (from surfaces) | `discover-social` (mode=instagram, $0.001) |
| tiktok | (none free) | `discover-social` (mode=tiktok, $0.001) |
| neighborhood | `derive-neighborhood` API (from existing coords) | `backfill:neighborhood` (Google, $0.007) |
| hours | (none free) | `coverage:apply:neon` (Google, $0.007) |
| phone | (none free) | Google Places Stage 1 ($0.007) |
| coords | (none free) | Google Places Stage 1 ($0.007) |
| price_level | Stage 5 AI inference (from menu text) | Google Places Stage 1 ($0.007) |
| menu_url | Stage 6 or `scan-merchant-surfaces` (free) | (none needed) |
| reservation_url | Stage 6 or `scan-merchant-surfaces` (free) | (none needed) |
| google_place_id | (none free) | `backfill:gpid:neon` (Google, $0.007) |
| identity_signals | Stage 5 (requires surfaces, $0.001) | (none) |
| tagline | Stage 7 (requires Stage 5 output, $0.0008) | (none) |
| canonical_entity_state | `populate-canonical-state.ts` (free) | (none needed) |
| google_photos | (none free) | `coverage:apply:neon` (Google, $0.007) |

### Gaps with NO existing tool:

- **TikTok ingestion** — field exists in schema, `discover-social` can find
  handles, but no automated content ingestion script (unlike Instagram)
- **Editorial coverage crawl** — `coverage_sources` stores editorial links
  but no automated discovery/extraction pipeline exists

---

## 5. Execution Sequence — the Playbook

### Pre-flight Checklist

1. **Entities ingested** — `name`, `slug`, `primary_vertical` at minimum.
   Ideally `website` and/or `googlePlaceId` from intake CSVs.
2. **Source + attribute registries populated** — `source_registry`,
   `attribute_registry` seeded with `seed-fields-v2-registries.ts`
3. **API keys set** — `ANTHROPIC_API_KEY` (required), `GOOGLE_PLACES_API_KEY`
   + `GOOGLE_PLACES_ENABLED=true` (Phase 5 only), `INSTAGRAM_ACCESS_TOKEN` (optional)
4. **Dry run** — `npm run enrich:place -- --batch=5 --dry-run` to verify
   pipeline connectivity

### Phase 1 — Surface Discovery (free to low cost)

**Goal:** Fill `website` and `instagram` for entities that are missing them.
Do not call Google Places API at this stage.

**Step 1a — Extract IG handles from existing surfaces (free):**
```bash
npm run backfill:instagram-handles -- --dry-run
npm run backfill:instagram-handles
```
Parses already-fetched `merchant_surfaces` for Instagram links. Pure DB + string parsing.

**Step 1b — AI social discovery for remaining gaps (Anthropic $):**
```bash
# Single entity
curl -X POST /api/admin/tools/discover-social \
  -d '{ "mode": "both", "slug": "example-place", "dryRun": true }'

# Batch — NOTE: batch script doesn't exist yet, single-entity only via API
# For now, loop over slugs from a missing-website query
```

**Scope:** Entities where `website IS NULL` or `instagram IS NULL`.
**Cost:** ~$0.001/entity (Claude Haiku + web_search).
**Expected yield:** 40-60% of missing websites, 50-70% of missing IG handles.

### Phase 2 — Free Enrichment (free)

**Goal:** Run all free enrichment tools on entities that now have surfaces.

**Step 2a — Merchant surface scan (free):**
```bash
npx tsx scripts/scan-merchant-surfaces.ts --limit=200 --dry-run
npx tsx scripts/scan-merchant-surfaces.ts --limit=200
```
Detects platform, menu format/URL, reservation/ordering providers, Instagram
URL, newsletter, sibling entities. Writes to `merchant_surface_scans`.

**Step 2b — ERA pipeline stages 2-4 (free):**
```bash
# Surface discovery + fetch + parse
npm run enrich:place -- --batch=50 --concurrency=5 --only=2
npm run enrich:place -- --batch=50 --concurrency=5 --only=3
npm run enrich:place -- --batch=50 --concurrency=5 --only=4
```

**Step 2c — Website enrichment (Anthropic $):**
```bash
npm run enrich:website -- --limit=50
```
Extracts menu_url, reservation_url, category, cuisine from website HTML.
Writes to `merchant_signals` and `merchant_enrichment_runs`. Also writes
`observed_claims` for high-confidence extractions (>= 0.75).

**Step 2d — Instagram content ingestion (free, rate-limited):**
```bash
npm run ingest:instagram -- --batch
```
For entities with `instagram != null` but no `instagram_accounts` row.
Rate limited by Meta (~200-3000 calls/hour).

### Phase 3 — Canonical Population (free)

**Goal:** Promote evidence to `canonical_entity_state`. Check field
completeness after this step before proceeding to paid phases.

```bash
npx tsx scripts/populate-canonical-state.ts --dry-run
npx tsx scripts/populate-canonical-state.ts
```

Creates `canonical_entity_state` rows, `canonical_sanctions` audit trail,
migrates existing taglines to `interpretation_cache`, and identity signals
to `derived_signals`.

**Post-phase check:** Query `canonical_entity_state` for field completeness.
Identify which entities still have gaps that require AI or Google.

### Phase 4 — AI Extraction (Anthropic $)

**Goal:** Run AI stages on entities that have surfaces but still lack
identity signals and taglines.

**Scope:** Entities with `merchant_surface_artifacts` (from Phase 2) but no
`derived_signals.identity_signals`. Do NOT run AI on entities with no
surfaces — there's nothing to extract from.

```bash
# Identity signal extraction (Stage 5)
npm run enrich:place -- --batch=50 --concurrency=5 --only=5

# Tagline generation (Stage 7) — requires Stage 5 output
npm run enrich:place -- --batch=50 --concurrency=5 --only=7
```

**Prioritization:** Entities closest to publication threshold first (most
fields already populated, just missing signals/tagline).

**Cost:** ~$0.002/entity (Stage 5 + Stage 7 combined).

### Phase 5 — Google Places (Google $$, gaps only)

**Goal:** Fill remaining null fields that free methods couldn't resolve.
Only for entities that still have gaps after all prior phases.

**Step 5a — Coverage apply (targeted gap fill):**
```bash
npm run coverage:apply:neon -- --limit=20
# Review the dry-run report, then:
npm run coverage:apply:neon -- --limit=50 --apply
```
Targets `NEED_GOOGLE_PHOTOS`, `NEED_HOURS`, `NEED_GOOGLE_ATTRS` only.
Requires GPID. Rate limit 250ms.

**Step 5b — GPID resolution (for entities without one):**
```bash
npm run backfill:gpid:neon -- --limit=50
```

**Step 5c — Full Google enrichment (for entities with no surfaces at all):**
```bash
npm run enrich:place -- --batch=50 --include-google --concurrency=3
```
Only for the ~20% of entities with no website and no surfaces.

**Hard rule:** Never call Google API if free sources haven't run first.

**Cost estimate for 1,000 entities:** ~$3-7 (not all need it; many already
have coords and data from intake CSVs).

---

## 6. Hard Rules

1. **Free before paid** — never call Google API if free sources haven't run
2. **Evidence before canonical** — enrichment writes to evidence tables first,
   not directly to `entities` or `canonical_entity_state`
3. **Entity type drives playbook** — don't run restaurant tools on a park
4. **Provenance always** — every field must track its source
5. **No bulk writes without a dry-run report first** — show what will be
   written before committing
6. **Idempotent** — all tools check for existing data before writing; safe
   to re-run

---

## 7. Cost Summary for 1,000 Entities

| Phase | Entities | Cost/Entity | Total | Notes |
|-------|----------|-------------|-------|-------|
| 1. Surface discovery (IG handles) | ~800 | $0 | $0 | Free (parse surfaces) |
| 1. Surface discovery (AI) | ~200 | $0.002 | ~$0.40 | Missing website + IG |
| 2. Free enrichment (scan + pipeline 2-4) | ~800 | $0 | $0 | Free |
| 2. Website enrichment (Claude) | ~800 | $0.003 | ~$2.40 | Anthropic $ |
| 2. Instagram ingestion | ~400 | $0 | $0 | Free (rate-limited) |
| 3. Canonical population | ~1000 | $0 | $0 | Free |
| 4. AI extraction (stages 5+7) | ~600 | $0.002 | ~$1.20 | Anthropic $ |
| 5. Google Places gap fill | ~300 | $0.007 | ~$2.10 | Targeted, not all |
| **Total** | | | **~$6.10** | |

**Per-city launch cost: ~$5-10 for 1,000 entities.**

---

## 8. Monitoring & Observability

### During Runs

- **Logs:** `data/logs/enrich-<slug>-<timestamp>.log` per entity
- **Progress:** `entities.enrichment_stage` (1-7), `entities.last_enriched_at`
- **Admin API:** `GET /api/admin/enrich/<slug>` returns current stage + done flag
- **Cost tracking:** `merchant_enrichment_runs.cost_usd` per extraction

### After Runs

- Coverage Ops dashboard at `/admin/coverage-ops` (Overview, Missing Fields,
  Neighborhoods, Red Flags tabs)
- `REACHABLE_MISSING_FIELDS_SQL` for per-field gap counts
- `FIELDS_BREAKDOWN_*_SQL` for cross-cohort comparison

### Key Metrics to Track

| Metric | Target | How to Check |
|--------|--------|-------------|
| Entities with TAGLINE | >70% of total | `interpretation_cache` count |
| Entities with website | >80% | `entities.website IS NOT NULL` count |
| Entities with GPID | >70% | `entities.googlePlaceId IS NOT NULL` count |
| Entities with identity_signals | >60% | `derived_signals` count |
| canonical_entity_state populated | >90% | `canonical_entity_state` count |
| Blocking issues | 0 | `entity_issues WHERE blocking_publish=true` |

---

## 9. New City Checklist

- [ ] Intake CSVs ingested (`npm run intake`)
- [ ] Entity types + verticals assigned
- [ ] Dedup pass run (check for intake duplicates)
- [ ] Source + attribute registries seeded
- [ ] **Phase 1:** Surface discovery (IG handles from surfaces, then AI discovery)
- [ ] **Phase 2:** Free enrichment (scan surfaces, pipeline 2-4, website enrichment, IG ingestion)
- [ ] **Phase 3:** Canonical population (populate-canonical-state)
- [ ] Check enrichment stats — identify remaining gaps
- [ ] **Phase 4:** AI extraction (stages 5+7 for entities with surfaces)
- [ ] **Phase 5:** Google Places gap fill (targeted, not blanket)
- [ ] Final enrichment stats — verify >70% TAGLINE coverage
- [ ] Triage blocking issues via `/admin/coverage-ops`
- [ ] Retry failed entities
- [ ] Publish ready entities to maps

---

## 10. Known Limitations & Deferred Entities

### Current Limitations

1. **Batch discover-social script missing** — `scripts/discover-social.ts`
   is referenced by the API route for batch mode but does not exist on disk.
   Single-entity discovery works via the API route. Batch requires a script
   to be created.

2. **`signals:menu:sync` does not exist** — no npm script or script file
   found. Menu URL syncing happens within Stage 6 (website enrichment) and
   `scan-merchant-surfaces.ts` but there is no standalone sync tool.

3. **No-website entities** — stages 2-7 require a website. ~20% of entities
   (parks, markets, carts) need `discover-social` (website mode) first. If
   no website found, they are deferred to Google-only + manual.

4. **Tagline not wired to API** — `interpretation_cache.TAGLINE` exists but
   the API route (`/api/places/[slug]`) still reads `entities.tagline`.

5. **TikTok ingestion** — field and discovery exist but no automated content
   ingestion script (unlike Instagram).

6. **Editorial coverage pipeline** — `coverage_sources` stores links but
   no automated discovery/extraction is built.

7. **Stage 5 sparse content** — entities with <50 chars of parseable text
   from surfaces skip signal extraction.

### Deferred Entities (will not be enriched by this playbook)

- Entities with `businessStatus = 'CLOSED_PERMANENTLY'`
- Entities outside the LA bounding box (lat 33.6-34.5, lon -118.9 to -117.6)
- Entities with no website AND no Google Place ID (need manual identity first)
