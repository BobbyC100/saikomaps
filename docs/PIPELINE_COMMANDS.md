---
doc_id: SAIKO-PIPELINE-COMMANDS
doc_type: reference
status: active
owner: Bobby Ciccaglione
created: '2026-03-10'
last_updated: '2026-03-17'
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

## Full 7-Stage Pipeline

When you need the full enrichment pipeline (Google Places + AI signals + taglines). ~$0.12/entity.

```bash
# Single entity (stages 2–7, website-first)
npm run enrich:place -- --slug=republique

# Include Google Places (stage 1)
npm run enrich:place -- --slug=republique --from=1

# Resume from specific stage
npm run enrich:place -- --slug=republique --from=3

# Run only one stage
npm run enrich:place -- --slug=republique --only=5

# Batch (25 entities, website-first)
npm run enrich:batch

# Batch with concurrency
npm run enrich:place -- --batch=50 --concurrency=5

# Batch including Google Places
npm run enrich:place -- --batch=50 --include-google
```

**Stages:**
1. Google Places identity commit (GPID, coords, hours, photos)
2. Surface discovery (find homepage/menu/about/contact URLs)
3. Surface fetch (capture raw HTML)
4. Surface parse (structure captured content into artifacts)
5. Identity signal extraction (AI → derived_signals)
6. Website enrichment (menu_url, reservation_url → Fields v2)
7. Tagline generation (AI → interpretation_cache)

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
# Full scan (all non-CANDIDATE entities)
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
| GPID resolution | ~$0.03 | Find Google Place ID for coords/hours |
