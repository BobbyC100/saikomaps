---
doc_id: SAIKO-PIPELINE-COMMANDS
doc_type: reference
status: active
owner: Bobby Ciccaglione
created: '2026-03-10'
last_updated: '2026-03-29'
project_id: SAIKO
systems:
  - data-pipeline
  - coverage-operations
summary: 'Operator command reference for entity enrichment, identity resolution, social discovery, and coverage operations.'
---
# Pipeline Commands

Operator reference for all enrichment and coverage tools. All commands assume you're in the project root with environment loaded.

---

## Smart Enrich (recommended entry point)

Cost-optimized pipeline. Discovers identity via cheap Haiku web search first, scrapes for free, only calls Google Places if gaps remain. ~$0.01–0.04/entity.

```bash
# Single entity
npm run enrich:smart -- --name="Bavel"
npm run enrich:smart -- --name="Bestia" --neighborhood="Arts District"

# Batch (comma-separated)
npm run enrich:smart -- --names="Bavel,Bestia,Republique,Kismet"

# Batch from file (one name per line)
npm run enrich:smart -- --file=data/new-places.txt

# Cheap only (~$0.01/entity — skip Google Places)
npm run enrich:smart -- --names="Bavel,Bestia" --cheap

# Dry run (no writes)
npm run enrich:smart -- --name="Bavel" --dry-run
```

**API:**
```bash
# Single
curl -X POST localhost:3000/api/admin/smart-enrich \
  -H "Content-Type: application/json" \
  -d '{"name": "Bavel"}'

# Batch
curl -X POST localhost:3000/api/admin/smart-enrich \
  -H "Content-Type: application/json" \
  -d '{"names": ["Bavel", "Bestia", "Republique"]}'
```

---

## Full Pipeline (Core 7 + Autocomplete Lane)

When you need end-to-end enrichment with minimal operator intervention. `enrich:place` runs the core 7 ERA stages, then (by default) runs completion steps for coverage and offering assembly.

```bash
# Single entity (stages 2–7, website-first)
npm run enrich:place -- --slug=republique

# Single entity with forced refresh behavior (re-discover surfaces, rerun stages)
npm run enrich:place -- --slug=republique --force

# Include Google Places (stage 1)
npm run enrich:place -- --slug=republique --from=1

# Resume from specific stage
npm run enrich:place -- --slug=republique --from=3

# Run only one stage
npm run enrich:place -- --slug=republique --only=5

# Disable autonomous completion lane (coverage/offering refresh) if needed
npm run enrich:place -- --slug=republique --no-autocomplete

# Batch (25 entities, website-first)
npm run enrich:batch

# Batch with concurrency
npm run enrich:place -- --batch=50 --concurrency=5

# Batch including Google Places
npm run enrich:place -- --batch=50 --include-google
```

**Core ERA stages (always available):**
1. Google Places identity commit (GPID, coords, hours, photos)
2. Surface discovery (find homepage/menu/about/contact URLs)
3. Surface fetch (capture raw HTML)
4. Surface parse (structure captured content into artifacts)
5. Identity signal extraction (AI → derived_signals)
6. Website enrichment (menu_url, reservation_url → Fields v2)
7. Interpretation — tagline generation (AI → interpretation_cache)

**Autocomplete lane (default in single-entity runs):**
8. Coverage discovery (`discover-coverage-sources`)
9. Coverage fetch (`fetch-coverage-sources`)
10. Coverage extraction (`extract-coverage-sources`)
11. Offering program assembly (`assemble-offering-programs`)
12. Interpretation refresh (`generate-taglines-v2 --reprocess`)

### Orchestration Scorecard (lane observability)

Use this to inspect discovery->fetch->interpret->offering handoff health with explicit denominators.

```bash
# Human-readable single entity
node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/enrichment-orchestration-scorecard.ts --slug=republique

# JSON output (rows + SLO numerator/denominator/ratio payload)
node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/enrichment-orchestration-scorecard.ts --slug=republique --json

# Small cohort snapshot
node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/enrichment-orchestration-scorecard.ts --limit=10
```

---

## GPID Resolution

Find Google Place IDs for entities that don't have one.

```bash
# Single entity (via API)
curl -X POST localhost:3000/api/admin/tools/seed-gpid-queue \
  -H "Content-Type: application/json" \
  -d '{"entityId": "entity-uuid-here"}'

# Batch by entity IDs (single API call)
curl -X POST localhost:3000/api/admin/tools/seed-gpid-queue \
  -H "Content-Type: application/json" \
  -d '{"entityIds": ["id1", "id2", "id3"]}'

# Scan all entities without GPID (up to 200)
curl -X POST localhost:3000/api/admin/tools/seed-gpid-queue \
  -H "Content-Type: application/json" -d '{}'
```

High-confidence matches (≥0.85 similarity) are auto-applied. Ambiguous/no-match cases go to the GPID Queue at `/admin/gpid-queue` for human review.

---

## Social Discovery

Find Instagram, TikTok, or website via Claude Haiku + web search. ~$0.01/call.

```bash
# Single entity (synchronous, ~5s)
curl -X POST localhost:3000/api/admin/tools/discover-social \
  -H "Content-Type: application/json" \
  -d '{"mode": "instagram", "slug": "republique"}'

# Modes: instagram | tiktok | website | both
curl -X POST localhost:3000/api/admin/tools/discover-social \
  -H "Content-Type: application/json" \
  -d '{"mode": "both", "slug": "republique"}'

# Batch (background)
curl -X POST localhost:3000/api/admin/tools/discover-social \
  -H "Content-Type: application/json" \
  -d '{"mode": "instagram", "limit": 50}'
```

---

## Coverage Source Enrichment

Four-stage pipeline for editorial coverage sources: backfill → discover → fetch → extract.

### Backfill (one-time, from existing editorial URLs)

```bash
# Dry run — see what would be backfilled
npx tsx scripts/backfill-coverage-from-editorial-sources.ts --dry-run

# Run backfill (approved sources only)
npx tsx scripts/backfill-coverage-from-editorial-sources.ts

# Include non-approved sources
npx tsx scripts/backfill-coverage-from-editorial-sources.ts --include-non-approved
```

### Discover (find editorial coverage for entities)

```bash
# Dry run — see which entities would be searched
npx tsx scripts/discover-coverage-sources.ts --dry-run

# Discover for a small test batch
npx tsx scripts/discover-coverage-sources.ts --limit=5 --verbose

# Discover for a single entity
npx tsx scripts/discover-coverage-sources.ts --slug=republique --verbose

# Discover for all EAT entities (default vertical)
npx tsx scripts/discover-coverage-sources.ts

# All verticals
npx tsx scripts/discover-coverage-sources.ts --all-verticals

# Skip entities that already have ≥3 coverage sources
npx tsx scripts/discover-coverage-sources.ts --skip-covered
```

Uses Claude Haiku + web_search (~$0.01/entity). Searches discovery-enabled approved publications for articles about each entity. Found URLs are filtered against the approved source registry, deduplicated, and inserted as INGESTED.

### Fetch (archive article content)

```bash
# Dry run — see what would be fetched
npx tsx scripts/fetch-coverage-sources.ts --dry-run

# Fetch a small test batch
npx tsx scripts/fetch-coverage-sources.ts --limit=10

# Fetch for a single entity slug
npx tsx scripts/fetch-coverage-sources.ts --slug=republique --limit=20

# Fetch all INGESTED sources
npx tsx scripts/fetch-coverage-sources.ts

# Re-fetch FAILED sources
npx tsx scripts/fetch-coverage-sources.ts --refetch
```

Rate limited at 1.5s between requests. Archives article text, title, author, published date. Advances stage: INGESTED → FETCHED or FAILED.

### Extract (AI signal extraction from archived content)

```bash
# Dry run
npx tsx scripts/extract-coverage-sources.ts --dry-run

# Extract a test batch with verbose output
npx tsx scripts/extract-coverage-sources.ts --limit=5 --verbose

# Extract for a single entity slug
npx tsx scripts/extract-coverage-sources.ts --slug=republique --limit=20

# Extract all FETCHED sources (≥50 words)
npx tsx scripts/extract-coverage-sources.ts

# Re-extract already-extracted sources (new prompt version)
npx tsx scripts/extract-coverage-sources.ts --reprocess

# Custom minimum word count
npx tsx scripts/extract-coverage-sources.ts --min-words=100
```

Uses Claude Sonnet. Rate limited at 800ms. Extracts structured signals into `coverage_source_extractions` (people, food/beverage/service evidence, atmosphere, origin story, accolades, pull quotes, sentiment, article type, relevance). Versioned and re-runnable.

### Add coverage source manually (via admin API)

```bash
curl -X POST localhost:3000/api/admin/entities/{entityId}/coverage \
  -H "Content-Type: application/json" \
  -d '{"url": "https://la.eater.com/article-about-place"}'
```

### Audit editorial coverage

```bash
npx tsx scripts/audit-editorial-coverage.ts
```

---

## Instagram Photo Classification

Classify Instagram photos by type (INTERIOR, FOOD, BAR_DRINKS, CROWD_ENERGY, DETAIL, EXTERIOR). This populates the `photoType` field on `instagram_media`, which controls photo ranking on entity pages.

```bash
# Classify photos for a single entity
npx tsx scripts/classify-entity-photos.ts --slug=buvons

# Classify all unclassified photos
npx tsx scripts/classify-entity-photos.ts

# Dry run
npx tsx scripts/classify-entity-photos.ts --dry-run
```

Uses Claude vision to analyze each photo and assign a type. Photos are downloaded and sent as base64 to bypass CDN restrictions. Classified photos are ranked for display: INTERIOR (highest priority) → FOOD → BAR_DRINKS → CROWD_ENERGY → DETAIL → EXTERIOR (lowest).

### Instagram Photo Bridge (eligibility + dimensions)

Bridge IG media into `place_photos` and compute eligibility.

```bash
# Bridge photos for a single entity (recommended after IG ingest)
npx tsx scripts/bridge-instagram-photos.ts --entity-id=<entity-id> --batch=100

# Dry run
npx tsx scripts/bridge-instagram-photos.ts --entity-id=<entity-id> --dry-run
```

The bridge now resolves image dimensions from media URLs, and falls back to permalink `og:image` when CDN signatures expire. This prevents stale IG URLs from forcing `MISSING_DIM` ineligibility.

---

## Description Generation (resilient)

Use this when you want broad VOICE_DESCRIPTOR coverage, including entities without GPID (for example pop-ups and taco trucks).

```bash
# One-command resilient run (reprocess + fallback + retries)
npm run description:run:resilient

# Equivalent explicit command
npx tsx scripts/generate-descriptions-v1.ts \
  --reprocess \
  --allow-category-only \
  --allow-name-only \
  --concurrency=1 \
  --max-retries=6 \
  --retry-base-ms=1500
```

---

## Enrichment Stage Re-run

Run a specific enrichment stage without the full pipeline.

```bash
# Run stage 5 only (AI signal extraction)
curl -X POST localhost:3000/api/admin/tools/enrich-stage \
  -H "Content-Type: application/json" \
  -d '{"slug": "republique", "stage": 5}'

# Run stages 3–7
curl -X POST localhost:3000/api/admin/tools/enrich-stage \
  -H "Content-Type: application/json" \
  -d '{"slug": "republique", "from": 3}'
```

---

## Issue Scanning

Detect data quality issues across all entities.

```bash
# Full scan (all entities with enrichmentStatus set, plus legacy non-CANDIDATE fallback)
curl -X POST localhost:3000/api/admin/tools/scan-issues \
  -H "Content-Type: application/json" \
  -d '{"action": "scan"}'

# Scan single entity
curl -X POST localhost:3000/api/admin/tools/scan-issues \
  -H "Content-Type: application/json" \
  -d '{"action": "scan", "slug": "republique"}'

# Get issue summary
curl -X POST localhost:3000/api/admin/tools/scan-issues \
  -H "Content-Type: application/json" \
  -d '{"action": "summary"}'

# Get detailed issues for triage board
curl "localhost:3000/api/admin/tools/scan-issues?detail=true"
```

---

## Coverage Dashboards

| Page | URL | Purpose |
|---|---|---|
| Coverage | `/admin/coverage` | Diagnostic dashboard — resolution health, tier summary, neighborhoods, missing fields |
| Coverage Ops | `/admin/coverage-ops` | Triage board — actionable issues with inline resolution tools |
| GPID Queue | `/admin/gpid-queue` | Human review queue for ambiguous GPID matches |

---

## Health Check

```bash
curl localhost:3000/api/health
# Returns: { "status": "ok", "db": "connected", "latency_ms": N }
```

---

## Cost Reference

| Tool | Cost/entity | When to use |
|---|---|---|
| Smart enrich (cheap) | ~$0.01 | New entity intake — find website + IG |
| Smart enrich (full) | ~$0.01–0.04 | New entity + fill all gaps including coords |
| Full pipeline (enrich:place) | ~$0.12 | Deep enrichment — AI signals + taglines |
| Social discovery | ~$0.01 | Fill missing Instagram/TikTok/website |
| Coverage discovery | ~$0.01 | Find editorial articles across approved sources |
| Coverage extraction | ~$0.01 | AI signal extraction from archived articles |
| GPID resolution | ~$0.03 | Find Google Place ID for coords/hours |
