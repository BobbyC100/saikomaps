---
doc_id: SAIKO-ENRICHMENT-PIPELINE
doc_type: knowledge-base
status: active
owner: Bobby Ciccaglione
created: '2026-03-26'
last_updated: '2026-03-26'
project_id: SAIKO
systems:
  - data-pipeline
  - enrichment
  - coverage-operations
related_docs:
  - docs/architecture/enrichment-strategy-v1.md
  - docs/architecture/enrichment-playbook-v1.md
  - docs/architecture/enrichment-model-v1.md
  - docs/architecture/enrichment-evidence-model-v1.md
  - docs/architecture/enrichment-freshness-strategy-v1.md
  - docs/architecture/entity-state-model-v1.md
  - docs/architecture/fields-era-overview-v1.md
  - docs/architecture/coverage-source-enrichment-v1.md
  - docs/ENRICHMENT-OPERATIONS-INVENTORY.md
  - docs/PIPELINE_COMMANDS.md
  - docs/DATA_PIPELINE_QUICK_START.md
summary: >
  Comprehensive knowledge base reference for Saiko's entity enrichment pipeline.
  Covers the full lifecycle from intake through enrichment to publication,
  the three-axis entity state model, the 7-stage ERA pipeline, tools,
  cost model, and operational guidance. Written for the full team —
  operations, product, and engineering.
---

# Saiko Enrichment Pipeline

## What This Document Is

This is the single comprehensive reference for how Saiko discovers, enriches, and publishes entity data. It's written for anyone at the company — operators running the pipeline, product people making decisions about coverage, and engineers working on the system.

For quick-start commands, see `docs/DATA_PIPELINE_QUICK_START.md`. For the full operator command reference, see `docs/PIPELINE_COMMANDS.md`. This document explains the system end-to-end so you understand what those commands are doing and why.

---

## 1. What the Enrichment Pipeline Does

Saiko is a curated place-data system. Every entity in Saiko — a restaurant, bar, cafe, shop, park — goes through a pipeline that takes it from "we know this place exists" to "we have a rich, trustworthy, publishable record."

The enrichment pipeline is the system that does this work. It discovers information about entities from multiple sources, structures that information, resolves conflicts between sources, and produces canonical data that powers Saiko's product surfaces.

The pipeline is designed around three principles: use free sources before paid ones, store evidence separately from canonical truth, and make every step idempotent so it's safe to re-run.

---

## 2. Entity Lifecycle

An entity moves through a clear lifecycle from the moment it enters the system to the moment it appears on Saiko's surfaces.

### The Stages

**Intake** — An entity enters the system. This can happen via CSV import, single entry through the admin UI, or through smart enrich. The entity is created with basic identity information (at minimum a name) and begins life as a candidate awaiting enrichment.

**Identification** — The entity's identity is confirmed. This means deduplication (making sure it doesn't already exist), anchoring to external identifiers (Google Place ID, website domain, Instagram handle), and confirming the entity type (EAT, DRINKS, CULTURE, SHOP, etc.). Identity determines which enrichment playbook applies.

**Enrichment** — The pipeline fills in the entity's data. Website content is crawled and parsed. AI extracts structured signals from unstructured text. Google Places provides coordinates, hours, and photos. Editorial coverage is discovered and analyzed. This is where the bulk of the work happens.

**Assessment** — The entity's data completeness is evaluated against the expectations for its type. A restaurant needs hours, a menu URL, reservation information, and identity signals. A park does not. Gaps that can't be filled automatically are flagged for human review.

**Publication** — When the entity record meets the quality standard and has no blocking issues, it becomes visible on Saiko's product surfaces.

### The Three-Axis State Model

Entity state is modeled across three independent concerns. This replaced an older single-status field (`PlaceStatus`) that mixed real-world business state with internal pipeline state.

**Operating Status** (`operatingStatus`) describes what's happening with the business in the real world. Values: `SOFT_OPEN` (pre-launch, invite-only), `OPERATING` (open to the public), `TEMPORARILY_CLOSED` (intends to reopen), `PERMANENTLY_CLOSED` (gone for good). Operating status has nothing to do with hours of operation — a restaurant closed on Mondays is still OPERATING.

**Enrichment Status** (`enrichmentStatus`) describes where the entity is in Saiko's pipeline. Values: `INGESTED` (entered the system, not yet enriched), `ENRICHING` (pipeline currently running), `ENRICHED` (pipeline has completed). This tracks the pipeline, not data quality — an ENRICHED entity might still have gaps.

**Publication Status** (`publicationStatus`) describes whether the entity record appears on Saiko surfaces. Values: `PUBLISHED`, `UNPUBLISHED`. This is an explicit, controlled decision — not something that falls out of other fields.

These three axes are intentionally independent. Any combination is valid. An OPERATING restaurant can be UNPUBLISHED (data not ready). An INGESTED entity might be OPERATING in the real world — we just haven't confirmed it yet. A TEMPORARILY_CLOSED restaurant can remain PUBLISHED with appropriate messaging.

For the full conceptual model, see `docs/architecture/entity-state-model-v1.md`.

### Legacy Status Field

The codebase still contains a `status` field on entities with values `CANDIDATE`, `OPEN`, `CLOSED`, `PERMANENTLY_CLOSED`. This is the legacy single-status field that the three-axis model replaces. The mapping is: `CANDIDATE` → enrichmentStatus: INGESTED + publicationStatus: UNPUBLISHED; `OPEN` → enrichmentStatus: ENRICHED + operatingStatus: OPERATING + publicationStatus: PUBLISHED; `CLOSED` → operatingStatus: TEMPORARILY_CLOSED; `PERMANENTLY_CLOSED` → operatingStatus: PERMANENTLY_CLOSED.

### Migration Status (as of 2026-03-26)

The three-axis model is actively being implemented. Here is what's in place:

**Dual-write is live.** All intake paths now set three-axis fields at entity creation (`enrichmentStatus: INGESTED`, `publicationStatus: UNPUBLISHED`) alongside the legacy `status: CANDIDATE`. This covers the intake API, intake resolve API, smart enrich, and all intake scripts (bulk-intake, intake-ramen-places, intake-pizza-places).

**Enrichment status transitions are policy-driven.** The `ENRICHING → ENRICHED` transition is now controlled by `isEntityEnriched()` — a four-layer completion gate that checks Identity, Access, Offering, and Interpretation against the entity's vertical profile. This replaces the prior "stage 7 ran = ENRICHED" logic. Smart enrich also sets `enrichmentStatus: ENRICHING` at start and runs the policy gate at end.

**Batch selection uses `enrichmentStatus`.** Batch mode selects entities where `enrichmentStatus` is `INGESTED` or `ENRICHING`. The `lastEnrichedAt` field is no longer used as a batch exclusion gate — it's retained as observability metadata only.

**Coverage-Ops reads from three-axis fields.** The issue scanner and coverage dashboard filter using `enrichmentStatus`. The scanner includes a new `enrichment_stalled` issue type that uses the policy gate to detect entities stuck in `ENRICHING` and reports which layers have missing requirements.

**Three-axis backfill is complete.** All 1100 entities have non-null `enrichmentStatus` and `publicationStatus`. 53 entities have null `operatingStatus` (expected — unknown operating state). No legacy fallback is needed for `enrichmentStatus`.

**High-impact app APIs migrated.** The search API, Instagram admin API, and photo-eval queue API read from three-axis fields with legacy fallback.

**Remaining work.** Phase 3 (remove CANDIDATE → OPEN promotion side effect from enrichment trigger) and Phase 4 (deprecate remaining legacy `status` reads) are planned but not yet implemented. The `scripts/scan-entity-issues.ts` CLI wrapper needs its reporter output aligned with the current `scanEntities` return shape (currently crashes). `lib/admin/coverage/dashboard-queries.ts` is dead code and can be deleted.

---

## 3. The ERA Pipeline (7 Stages)

ERA stands for "Enrichment & Retrieval Architecture." It's the core orchestrated pipeline that takes an entity through seven sequential enrichment stages. Each stage is idempotent — if the work is already done, the stage skips automatically. The pipeline can be run end-to-end, resumed from a specific stage, or stages can be run individually.

### Stage 1 — Google Places Identity Commit

**What it does:** Links the entity to a Google Place ID and fetches structured data from Google Places API.

**Data written:** Google Place ID, coordinates (lat/lng), address, phone, website, hours, photos, cuisine type, neighborhood, price level, business status.

**Skip condition:** Entity already has `placesDataCachedAt` set (meaning Google data was already fetched).

**Resolution strategy:** If the entity already has a GPID, fetch details directly. If not, search by name + address or name + neighborhood. Verify matches using name similarity (Jaro-Winkler >= 0.55 or substring containment). Reject poor matches.

**Cost:** ~$0.007/entity (Google Places API).

**When to use:** This is the most expensive stage per entity. The pipeline defaults to starting at Stage 2 (skipping Google Places) because free sources often provide enough identity data. Only include Stage 1 when entities lack coordinates, address, or other identity anchors that can't be found from websites.

### Stage 2 — Surface Discovery

**What it does:** Given an entity's website URL, discovers the key pages: homepage, menu page, about page, contact page, events page.

**Data written:** Rows in `merchant_surfaces` with `fetch_status: 'discovered'` for each found URL.

**Skip condition:** Surfaces already exist for the entity, or entity has no website.

**Cost:** Free (HTTP requests only).

### Stage 3 — Surface Fetch

**What it does:** Fetches the raw HTML and text content from each discovered surface URL.

**Data written:** Updates `merchant_surfaces` with `rawHtml`, `rawText`, `fetchedAt`, and status (`fetch_success` or `fetch_failed`).

**Skip condition:** No surfaces with `fetch_status: 'discovered'` (nothing to fetch).

**Cost:** Free.

### Stage 4 — Surface Parse

**What it does:** Parses fetched HTML into structured text blocks that can be analyzed by AI.

**Data written:** `merchant_surface_artifacts` with `text_blocks` arrays extracted from the HTML.

**Skip condition:** No surfaces with `fetch_status: 'fetch_success'` and `parse_status: 'parse_pending'`.

**Cost:** Free.

### Stage 5 — Identity Signal Extraction (AI)

**What it does:** Sends parsed surface content (menu text, about page, wine list) plus any editorial coverage evidence to Claude Haiku, which extracts structured identity signals.

**Signals extracted:** cuisine posture (produce-driven, protein-centric, etc.), service model (tasting-menu, a-la-carte, small-plates, etc.), price tier, wine program intent, place personality (neighborhood-joint, destination, chef-driven, etc.), signature dishes, key producers, language signals, origin story type.

**Data written:** `derived_signals` table — one comprehensive `identity_signals` row plus individual rows per signal for querying.

**Skip condition:** Entity already has `identity_signals` in `derived_signals` (unless `--reprocess` is passed).

**Quality gate:** Results below 0.4 confidence are held, not written. Results between 0.4-0.7 are written but flagged for review. Results above 0.7 are publishable.

**Cost:** ~$0.001/entity (Claude Haiku).

**Requires:** Parsed surface content (>= 50 chars of usable text) or editorial coverage evidence. Entities with neither are skipped.

### Stage 6 — Website Enrichment

**What it does:** Analyzes website content to extract business metadata: menu URL, reservation URL, events URL, catering URL, and inferred category.

**Data written:** URLs and category written to entity fields. High-confidence extractions are also written as `observed_claims` for the Fields v2 evidence layer.

**Skip condition:** Entity has `lastEnrichedAt` set, or has no website. Use `--refresh` to re-run on previously enriched entities.

**Cost:** ~$0.002-0.005/entity (Claude).

### Stage 7 — Interpretation (AI)

**What it does:** This is the **Interpretation layer** — the stage where Saiko produces its point of view on an entity. Currently, the primary interpretation output is a tagline: a voice/personality line generated by Claude Sonnet across four patterns (`food`, `neighborhood`, `energy`, `authority`), with the best fit selected automatically.

"Tagline" is a specific artifact of the Interpretation layer — the way "phone" is a specific artifact of the Access layer. The layer name describes the enrichment concern (can Saiko express a point of view on this place?), not any single output.

**Data written:** `interpretation_cache` with `outputType: 'TAGLINE'`, including the selected tagline, all candidates, and the pattern used.

**Skip condition:** Entity already has a current TAGLINE in `interpretation_cache` (unless `--reprocess`).

**Quality gate:** Assesses input signal quality (excellent/good/minimal/insufficient) before generating. Skips entities with insufficient signals.

**Cost:** ~$0.0008/entity (Claude Sonnet).

**Not required for all verticals.** The Interpretation layer is required for most verticals (EAT, DRINKS, CULTURE, SHOP, STAY, WELLNESS) but optional for NATURE and ACTIVITY. See the lane-first enrichment spec for how the completion gate handles this.

### Pipeline Completion Marker

An entity is considered "fully enriched" when the policy-driven completion gate (`isEntityEnriched()`) passes for all four enrichment layers: Identity, Access, Offering, and Interpretation. The `enrichmentStage` field on the entity tracks pipeline progress (values "1" through "7"), and `lastEnrichedAt` records when the pipeline last ran (observability only — not a completion signal).

### Four Enrichment Layers

The enrichment model is organized into four named layers. These names are used consistently across profiles, the completion gate, docs, and issue types:

| Layer | Concern | Profile Field | Example Artifacts |
|---|---|---|---|
| **Identity** | Does this place exist? Can we anchor it? | (scored via identity anchors) | name, coords, GPID, vertical |
| **Access** | Can a person reach or visit this place? | `access_expected` | website, phone, hours, Instagram, reservation URL |
| **Offering** | What is this place about? What does it do? | `offering_expected` | menu URL, programs, SceneSense, events, editorial |
| **Interpretation** | Can Saiko express a point of view on this place? | `interpretation_expected` | tagline, (future: summary, vibe) |

---

## 4. Smart Enrich vs Full Pipeline

Saiko has two enrichment entry points, designed for different situations.

### Smart Enrich

Smart enrich is the cost-optimized path for new entities. It's designed for intake — when you have a name and maybe a neighborhood, and need to establish identity and basic data as cheaply as possible.

**What it does:**
1. Phase 1 — Discovery ($0.01): Claude Haiku + web search finds the entity's official website and Instagram handle.
2. Phase 2 — Scrape (free): Fetches the website and discovers linked pages (menu, about, contact).
3. Phase 3 — Parse (free): Extracts structured content from fetched HTML.
4. Phase 4 — Gap fill ($0.03, conditional): Only runs if identity is weak (no coordinates, no GPID, identity score below threshold). Searches Google Places to fill gaps.

**Cost:** $0.01-0.04 per entity. For 100 entities: ~$1-4.

**When to use:** When adding new entities to the system. Smart enrich handles dedup, creates the entity if it's new, and gets basic identity established.

**What it does NOT do:** AI signal extraction (Stage 5) or Interpretation (Stage 7 — tagline generation). Those require the full pipeline.

### Full ERA Pipeline

The full pipeline is the deep enrichment path. It runs all 7 stages and produces the complete entity record including AI-generated identity signals and taglines.

**Cost:** ~$0.12 per entity all-in (when Google Places is included). ~$0.06-0.08 when Google Places is skipped.

**When to use:** After smart enrich has established identity, run the full pipeline to get AI signals and taglines. Or for batch enrichment of a city launch.

### Identity Scoring

Smart enrich uses a composite anchor model to decide whether an entity has sufficient identity:

| Anchor | Weight |
|--------|--------|
| Google Place ID | 4 |
| Website | 3 |
| Instagram | 2 |
| Coordinates | 2 |
| Neighborhood | 1 |
| Phone | 1 |

Threshold: 4 points minimum. No single field is required — multiple weak anchors can be sufficient (e.g., Instagram + coordinates = 4). If identity is below threshold after free discovery, smart enrich triggers a Google Places lookup.

---

## 5. Evidence, Sanctioning, and Canonical State

Saiko separates evidence from truth. This is a foundational architectural decision.

### Evidence Layer

Enrichment pipelines write evidence — raw observations with provenance. The same field might have multiple evidence values from different sources. Evidence tables include: `observed_claims` (structured field-level claims with source, confidence, and timestamp), `merchant_surfaces` (discovered and fetched web pages), `merchant_surface_artifacts` (parsed structured content), `merchant_surface_scans` (crawled page snapshots), `merchant_signals` (extracted signals from surfaces), `menu_fetches` (menu content snapshots), and `coverage_sources` (editorial links and extracted signals).

### Canonical Layer

The canonical layer is what the product reads. `canonical_entity_state` holds the currently accepted truth — one sanctioned value per field, promoted from evidence.

### Sanctioning

Evidence becomes canonical through sanctioning. Multiple agreeing sources auto-promote with high confidence. Conflicting sources get flagged for human review. Single trusted sources auto-promote with medium confidence. The `write-claim.ts` pattern and Fields v2 sanctioning workflow manage this process. Every sanctioned value has an audit trail in `canonical_sanctions`.

### Why This Matters

A restaurant's website says hours are 11am-10pm. Google says 11am-9pm. Instagram bio says "open till 10." These are three pieces of evidence. The sanctioning step picks the winner and writes it to canonical. An Eater article says "Japanese-Italian fusion." The restaurant's own website says "Italian." Both are evidence. Canonical gets the sanctioned answer. This separation means enrichment can be aggressive about collecting data without worrying about overwriting good data with bad data.

For more detail on the evidence model, see `docs/architecture/enrichment-evidence-model-v1.md`.

---

## 6. Coverage Operations Integration

Coverage Ops is the operational dashboard that monitors entity data quality and drives enrichment work.

### Issue Scanner

The issue scanner (`lib/coverage/issue-scanner.ts`) examines entities and detects data quality issues. It includes all entities with a three-axis enrichment status (`INGESTED`, `ENRICHING`, or `ENRICHED`), with a legacy fallback for pre-migration entities (`enrichmentStatus` is null but `status != 'CANDIDATE'`). This means newly intake'd entities now appear in Coverage Ops immediately — they don't have to wait for enrichment. Each issue has a type, severity, and a `blockingPublish` flag that prevents publication if the issue is unresolved.

**Issue types and severity:**

| Issue | Severity | Blocks Publish? | What It Means |
|-------|----------|-----------------|---------------|
| `unresolved_identity` | Critical | Yes | Insufficient identity anchors to trust this entity |
| `missing_coords` | High | Yes | Has GPID but no latitude/longitude |
| `enrichment_incomplete` | High | Yes | Has GPID but was never enriched |
| `google_says_closed` | High | Yes | Google reports business as closed |
| `missing_gpid` | Medium | No | No Google Place ID (identity sufficient otherwise) |
| `missing_neighborhood` | Medium | No | Has coordinates but no neighborhood |
| `missing_hours` | Medium | No | No canonical hours |
| `operating_status_unknown` | Medium | No | No Google business status signal |
| `missing_website` | Medium | No | No website in canonical state |
| `missing_phone` | Low | No | No phone number |
| `missing_price_level` | Low | No | No price level indicator |
| `missing_menu_link` | Low | No | No menu URL |
| `missing_reservations` | Low | No | No reservation URL |
| `missing_instagram` | Low | No | No Instagram handle |
| `missing_tiktok` | Low | No | No TikTok handle |

### Issue Lifecycle

Issues are created with status `open`. They can be resolved (automatically when the data gap is filled), suppressed (operator confirms the issue should be permanently ignored — e.g., a taco cart that genuinely has no website), or sent to `needs_human` for manual review. Suppressed issues are never recreated. Resolved issues re-open if the problem recurs.

### Pending Enrichment Bucket

Entities with `enrichmentStatus: INGESTED` appear in Coverage Ops under a "Pending Enrichment" count. The coverage dashboard header shows total entities, published count, and pending enrichment count. These are entities that have been intake'd but haven't been through the pipeline yet. This gives operators visibility into the intake-to-enrichment backlog directly from the coverage dashboard. The `pendingEnrichmentCount` is derived from the `enrichmentStatus: INGESTED` count in the dashboard API response.

### Nomadic/Pop-up Handling

Entities with place appearances (pop-ups, taco trucks) are treated differently by the issue scanner. Identity thresholds are lowered — a name + Instagram handle is sufficient (score: 2) vs. score: 4 for fixed locations. Issues like `missing_gpid`, `missing_coords`, `missing_neighborhood`, and `missing_hours` are auto-suppressed for nomadic entities.

### Coverage Dashboard

The coverage dashboard at `/admin/coverage` provides four views: Overview (summary cards, tier completion, enrichment funnel), Tier Health (per-tier field breakdowns, ERA pipeline histogram), Enrichment Tools (tool inventory with commands, recent runs), and Neighborhoods (scorecard grid by neighborhood showing completeness rates).

---

## 7. Editorial Coverage Pipeline

Editorial coverage is a distinct enrichment path that ingests signals from trusted publications.

### Approved Source Registry

Bobby maintains the master list of approved editorial sources. Current approved sources include Eater LA, Michelin Guide, The Infatuation, LA Times Food, TimeOut LA, and others. Sources are organized into trust tiers, and the registry is expandable.

### Pipeline

The editorial coverage pipeline has four stages: discovery (search approved sources for entity mentions), fetch (archive article text, title, author, date), extract (AI extracts structured signals — people, food/beverage evidence, atmosphere, origin story, accolades, pull quotes), and store (write to `coverage_sources` and `coverage_source_extractions` with full provenance).

### How It Feeds Enrichment

Editorial coverage evidence is materialized and fed to the AI prompts in ERA Stages 5 and 7. When Claude extracts identity signals or generates taglines, it sees editorial context alongside website content. This means an entity that was reviewed by Eater gets richer, more accurate signals than one with only its own website content.

For operational commands, see the "Coverage Source Enrichment" section of `docs/PIPELINE_COMMANDS.md`. For the architectural spec, see `docs/architecture/coverage-source-enrichment-v1.md`.

---

## 8. Cost Model

Enrichment cost is managed by running free sources first and using paid APIs only for remaining gaps.

### Per-Entity Cost Breakdown

| Path | When To Use | Cost/Entity |
|------|-------------|-------------|
| Smart enrich (cheap mode) | New entity, just find website + IG | ~$0.01 |
| Smart enrich (full) | New entity, fill all gaps including coords | ~$0.01-0.04 |
| Full ERA pipeline (no Google) | Deep enrichment after identity established | ~$0.06-0.08 |
| Full ERA pipeline (with Google) | Complete enrichment including Google Places | ~$0.12 |
| Social discovery (per mode) | Fill missing Instagram/TikTok/website | ~$0.001 |
| Coverage source discovery | Find editorial articles | ~$0.01 |
| Coverage source extraction | Extract signals from articles | ~$0.01 |
| Google Places gap fill | Targeted field fill (hours, photos, attrs) | ~$0.007-0.02 |

### City Launch Cost (1,000 entities)

The enrichment playbook estimates ~$5-10 per 1,000 entities for a full city launch. The actual cost depends on how much identity data comes in with intake CSVs (GPIDs and websites from intake significantly reduce paid API usage).

For the full cost breakdown by phase, see `docs/architecture/enrichment-playbook-v1.md`, Section 7.

### Cost Tracking

Individual enrichment runs are tracked in the `merchant_enrichment_runs` table, which records cost per extraction. Pipeline logs are written to `data/logs/enrich-<slug>-<timestamp>.log` for each entity processed.

---

## 9. Enrichment by Entity Type

The enrichment playbook varies by entity type. Different verticals need different fields, and some tools only apply to certain types.

### Restaurant (EAT) — Most Demanding

Identity-critical (required for publication): name, coordinates, Google Place ID (strongly preferred), address. Operational (expected for quality): neighborhood, phone, website, hours, Instagram, TikTok, price level, reservation URL, menu URL, category, cuisine type. Content (differentiating): AI identity signals, offering programs, tagline, description. Canonical layer: `canonical_entity_state` populated with sanctioned values from evidence.

A restaurant is "fully enriched" when all four layers are satisfied: Identity anchored, Access fields populated, Offering fields populated, and Interpretation output (TAGLINE) generated.

### Other Verticals

COFFEE drops reservation URL, menu URL (usually), and cuisine type. SHOP drops menu URL, reservation URL, and relaxes hours requirements. STAY drops menu URL and treats reservation URL as a booking link. CULTURE drops menu URL, reservation URL, and cuisine type. NATURE/PARK has a reduced playbook focused on location, hours, amenities.

For the full vertical-aware completeness model, see `docs/architecture/enrichment-model-v1.md`.

---

## 10. Deduplication

Dedup is critical at intake to prevent the same real-world entity from existing multiple times in the system.

### Dedup Strategy (ordered by strength)

1. **Google Place ID exact match** — strongest signal. If the incoming entity has a GPID that already exists, it's a duplicate.
2. **Website domain match** — strong signal. Same root domain = same business (with some exceptions for multi-location chains).
3. **Slug exact match** — if the generated slug already exists.
4. **Website presence** — if the incoming entity has a website, skip fuzzy matching and create (website is a strong enough differentiator).
5. **Instagram presence** — similar to website, strong enough to skip fuzzy.
6. **Fuzzy name match (Jaro-Winkler >= 0.90)** — high-confidence name match = likely duplicate.
7. **Partial name match (0.70-0.90)** — ambiguous. Returns candidates for human review rather than auto-creating or auto-matching.
8. **No match** — create new entity.

### Where Dedup Happens

Dedup runs at intake (the intake API and smart enrich both check). It also runs during Google Places resolution — if a GPID search returns a match for an entity that already has that GPID, the system recognizes the duplicate.

---

## 11. Freshness and Maintenance

Enrichment is not a one-time event. Entity data goes stale, and Saiko needs a strategy for when and how to re-enrich.

### Data Stability Classes

Different types of data decay at different rates:

**Structural** (annual refresh): Name, address, coordinates, entity type. These rarely change. Re-check annually or on evidence of change.

**Seasonal** (quarterly refresh): Hours, menu, events, seasonal closures. These change with seasons or periodically. Check quarterly.

**Dynamic** (monthly refresh): Social media handles, website content, editorial coverage, pricing signals. These change frequently. Check monthly.

**Accumulative** (ongoing): Editorial mentions, social proof, review signals. These only grow — new coverage adds to existing, doesn't replace it.

**Confirmed Absence** (preserve): When enrichment has confirmed a field genuinely doesn't apply (e.g., a taco cart has no reservation URL), that confirmation is valuable data. Don't re-run the same enrichment hoping for a different answer.

For the full freshness framework, see `docs/architecture/enrichment-freshness-strategy-v1.md`.

---

## 12. Operational Commands Quick Reference

This is a condensed reference. For full options and flags, see `docs/PIPELINE_COMMANDS.md`.

### Adding New Entities

```bash
# Smart enrich — single entity
npm run enrich:smart -- --name="Bavel"

# Smart enrich — batch from file
npm run enrich:smart -- --file=data/new-places.txt

# CSV intake via API
curl -X POST localhost:3000/api/admin/intake -F "file=@data/new-places.csv"
```

### Running the Full Pipeline

```bash
# Single entity (stages 2-7, website-first)
npm run enrich:place -- --slug=republique

# Include Google Places (stage 1)
npm run enrich:place -- --slug=republique --from=1

# Batch (50 entities, concurrent)
npm run enrich:place -- --batch=50 --concurrency=5

# Run a specific stage only
npm run enrich:place -- --slug=republique --only=5
```

### Monitoring Progress

```bash
# Poll enrichment progress for an entity
curl localhost:3000/api/admin/enrich/republique

# Check issues across all entities
curl "localhost:3000/api/admin/tools/scan-issues?detail=true"

# Open Coverage Ops dashboard
open http://localhost:3000/admin/coverage-ops
```

### State Model Validation and Backfill

```bash
# Validate that recent entities have three-axis fields set (default: last 7 days)
node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/validate-entity-state-model.ts

# Validate with custom window
node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/validate-entity-state-model.ts --days 30

# Backfill three-axis fields for pre-migration entities (dry run — no writes)
node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/backfill-entity-state-model.ts

# Backfill with writes (production — requires explicit --apply flag)
node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/backfill-entity-state-model.ts --apply
```

The validation script checks for entities created within the window that have null `enrichment_status`. If any are found, it exits with code 1 (failure). Run this after deployments that touch intake paths to confirm dual-write is working.

The backfill script is idempotent — it only updates entities where all three axis fields are null, so it's safe to re-run. It maps legacy `PlaceStatus` values to the three-axis model. Always dry-run first to verify the mapping before applying.

### Targeted Gap Filling

```bash
# Social discovery (find missing Instagram/website)
curl -X POST localhost:3000/api/admin/tools/discover-social \
  -H "Content-Type: application/json" \
  -d '{"mode": "both", "slug": "republique"}'

# Google Places gap fill (hours, photos)
npm run coverage:apply:neon -- --limit=20 --apply

# Re-run specific enrichment stage
curl -X POST localhost:3000/api/admin/tools/enrich-stage \
  -H "Content-Type: application/json" \
  -d '{"slug": "republique", "stage": 5}'
```

---

## 13. Architecture and Data Flow

### Layer Map

| Layer | Key Tables | Role |
|-------|-----------|------|
| Routing shell | `entities` | Identity anchors, routing keys (slug, status, vertical, type) |
| Evidence | `observed_claims`, `merchant_signals`, `merchant_surface_scans`, `menu_fetches` | Raw observations with provenance — multiple per field |
| Surfaces | `merchant_surfaces`, `merchant_surface_artifacts` | Discovered and parsed web content |
| Editorial | `coverage_sources`, `coverage_source_extractions` | Editorial links, accolades, extracted signals |
| Canonical state | `canonical_entity_state`, `canonical_sanctions` | Sanctioned truth — one value per field |
| Signals | `derived_signals` | Structured signals extracted by AI (identity, offering) |
| Interpretation | `interpretation_cache` | AI-generated outputs (tagline, description, voice) |
| Coverage ops | `entity_issues` | Data quality issues, triage state |

### Data Flow

```
Source → Fetch → Extract → Evidence → Sanction → Canonical → Product
```

Enrichment tools write to the evidence layer. Sanctioning promotes evidence to canonical. Product surfaces read from canonical. This separation means enrichment can be aggressive without risking data quality on the product side.

### Key Integration Points

The enrichment pipeline connects to several other systems. The issue scanner runs after enrichment to update the Coverage Ops triage board. The Fields v2 contract (`canonical_entity_state`) is the stable interface between enrichment and product surfaces. Editorial coverage evidence feeds into AI prompts for richer signal extraction (Stages 5 and 7). The publication gate checks for blocking issues before allowing an entity record to become visible.

---

## 14. Known Limitations

These are current system limitations that affect enrichment operations.

**Batch social discovery script not built.** The API route at `/api/admin/tools/discover-social` supports batch mode by spawning `scripts/discover-social.ts`, but that script file doesn't exist. Single-entity discovery works. Batch requires looping over slugs from a query.

**No-website entities (~20% of corpus).** ERA stages 2-7 require a website to crawl. Entities without websites (parks, markets, taco carts) need social discovery first to find a website. If none exists, they fall back to Google Places-only enrichment.

**TikTok ingestion not automated.** Handle discovery works via `discover-social`, but there's no automated content ingestion pipeline (unlike Instagram, which has a full Meta Graph API integration).

**Stage 5 requires minimum content.** Entities with less than 50 characters of parseable text from surfaces are skipped for identity signal extraction. These entities need more surface content or editorial coverage before AI can extract signals.

**Geographic scope.** Stage 5 (identity signal extraction) currently scopes to the LA bounding box (33.6-34.5°N, -118.9 to -117.6°W) + entities with `canonical_entity_state` rows. Expanding to new cities requires adjusting the bounding box or removing the geographic filter.

**Coverage extraction prompt versioning.** AI extraction prompts evolve over time (currently v2 for coverage extraction, v1 for identity extraction). Re-processing entities after a prompt version change requires explicit `--reprocess` flags.

---

## 15. Frequently Asked Questions

### General

**Q: I added places through intake but they're not showing up in Coverage Ops. Why?**

A: As of March 2026, newly intake'd entities should appear in Coverage Ops immediately — the issue scanner now includes entities with `enrichmentStatus: INGESTED`. They show up in the "pending enrichment" count on the dashboard header. If you're not seeing them, the entity may have been created before the dual-write was enabled (pre-migration entities have null three-axis fields). Run the backfill: `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/backfill-entity-state-model.ts --apply`. You can verify with the validation script: `scripts/validate-entity-state-model.ts --days 30`.

**Q: What's the difference between smart enrich and the full pipeline?**

A: Smart enrich is the cheap, fast path — it establishes identity (website, Instagram, coordinates) at $0.01-0.04 per entity. The full ERA pipeline adds deep enrichment: AI-extracted identity signals, offering programs, and generated taglines at ~$0.06-0.12 per entity. Use smart enrich for intake, then the full pipeline for deep enrichment.

**Q: How do I know when an entity is "fully enriched"?**

A: In pipeline terms, an entity is fully enriched when it has a current TAGLINE in `interpretation_cache`. The `enrichmentStage` field reads "7" and `lastEnrichedAt` is set. In data quality terms, check the entity's issues in Coverage Ops — zero blocking issues means it's publication-ready.

**Q: Can I re-run enrichment on an entity that's already been enriched?**

A: Yes. Individual stages can be re-run with `--only=N` and `--force`. For AI stages (5 and 7), use `--reprocess` to overwrite existing signals. The pipeline is idempotent — re-running without force flags safely skips completed work.

### State and Status

**Q: What does CANDIDATE mean?**

A: `CANDIDATE` is a legacy status value from before the three-axis model. It means the entity was intake'd but hasn't been through enrichment. In the new model, this maps to `enrichmentStatus: INGESTED` + `publicationStatus: UNPUBLISHED`. The legacy field is still maintained for backward compatibility during the migration.

**Q: An entity is ENRICHED but UNPUBLISHED. Why isn't it showing on the map?**

A: Enrichment status and publication status are independent. An entity can be fully enriched but still unpublished if it has blocking issues (like `unresolved_identity` or `missing_coords`), if it hasn't been explicitly published yet, or if it was removed from surfaces for editorial reasons. Check the entity's issues in Coverage Ops.

**Q: Can I publish an entity that hasn't been fully enriched?**

A: Publication status is an independent decision. In principle, an entity can be published at any enrichment status — but blocking issues from the issue scanner will prevent publication if critical data is missing (no identity anchors, no coordinates). The system is designed so that enrichment informs the publication decision but doesn't make it.

**Q: What does operatingStatus: null mean?**

A: It means we haven't determined the real-world operating status yet. This is expected for newly ingested entities — we know the place exists, but we haven't confirmed whether it's operating, in soft-open, or closed. Operating status gets filled during enrichment (often from Google Places business status data in Stage 1) or through editorial/social evidence.

### Pipeline Operations

**Q: The pipeline failed at Stage 3 for an entity. What do I do?**

A: The pipeline stops at the first failure and records the last successful stage in `enrichmentStage`. Resume from the failed stage: `npm run enrich:place -- --slug=<slug> --from=3`. Stage 3 failures are usually HTTP timeouts or blocked requests — the entity's website may be behind a CDN that blocks scraping.

**Q: How do I enrich entities that don't have a website?**

A: First try social discovery to find one: `curl -X POST localhost:3000/api/admin/tools/discover-social -d '{"mode":"website","slug":"entity-slug"}'`. If no website is found, fall back to Google Places (Stage 1) for identity data and social discovery for handles. These entities won't get AI signals or taglines until they have content to analyze.

**Q: I need to enrich 500 new entities for a city launch. What's the sequence?**

A: Follow the city launch playbook in `docs/architecture/enrichment-playbook-v1.md`. In short: (1) Intake the CSVs, (2) smart enrich for identity, (3) surface discovery + scrape (free stages 2-4), (4) canonical population, (5) AI extraction (stages 5+7), (6) Google Places for remaining gaps. Expected cost: ~$3-5 for 500 entities.

**Q: Why does the pipeline default to starting at Stage 2?**

A: Stage 1 (Google Places) costs ~$0.007/entity and is the most expensive single stage. Many entities already have coordinates and address from intake CSVs, and websites often provide enough identity data. The pipeline skips Google Places by default and uses it only as a gap-fill tool. Pass `--from=1` or `--include-google` when you need it.

### Coverage and Issues

**Q: An entity has the issue "enrichment_incomplete" but it has been through smart enrich. Why?**

A: Smart enrich establishes identity but doesn't run the full ERA pipeline. The "enrichment_incomplete" issue means the entity has a GPID but was never run through the full 7-stage pipeline (specifically, it has no `lastEnrichedAt` timestamp). Run the full pipeline to resolve it: `npm run enrich:place -- --slug=<slug>`.

**Q: What does "suppressed" mean for an issue?**

A: Suppressed means an operator has confirmed the issue should be permanently ignored. For example, a taco truck with no website — the `missing_website` issue gets suppressed because it's a genuine absence, not a data gap. Suppressed issues are never recreated by the scanner, even on re-scan.

**Q: How do I suppress an issue?**

A: Through the Coverage Ops triage board at `/admin/coverage-ops`. Each issue has resolution actions including suppress. Suppression should be used when the data genuinely doesn't exist (no website, no phone) — not as a shortcut to clear the dashboard.

**Q: How often should I run the issue scanner?**

A: After any enrichment run. The issue scanner is typically triggered automatically after enrichment completes. You can also trigger it manually via the API. It's idempotent and safe to run frequently.

### Data Quality

**Q: Enrichment found conflicting data from different sources. What happens?**

A: The evidence layer stores all values. Sanctioning resolves conflicts — multiple agreeing sources promote automatically, conflicting sources get flagged for human review. The canonical layer always has one sanctioned value per field with provenance.

**Q: Google Places says a restaurant is permanently closed. What happens?**

A: The issue scanner creates a `google_says_closed` issue (high severity, blocks publish). This doesn't automatically change the entity's operating status — closure requires evidence-based review through the claims model. An operator reviews the evidence and decides whether to transition the entity to PERMANENTLY_CLOSED.

**Q: What's the confidence scoring system?**

A: Confidence tracks trust in source/signal quality, not absolute truth. AI extraction outputs include confidence scores: >= 0.7 is publishable, 0.4-0.7 needs review, < 0.4 is held. Google Places data comes in at 0.95 confidence. Smart enrich discovery outputs have variable confidence — only medium/high confidence results are written.

### Cost and Efficiency

**Q: What's the cheapest way to enrich a batch of entities?**

A: Smart enrich in cheap mode: `npm run enrich:smart -- --file=data/names.txt --cheap`. This uses only Haiku web search (~$0.01/entity) and skips Google Places. Then run free stages 2-4 of the ERA pipeline for website scraping. Total: ~$0.01-0.02/entity for identity + surface data.

**Q: How do I avoid unnecessary Google Places API calls?**

A: The pipeline is designed for this. Never run `--from=1` on entities that already have coordinates and GPID. Use smart enrich's gap-fill logic (Phase 4 only runs if identity score is below threshold). For targeted gap fill, use `coverage:apply:neon` which targets specific missing fields rather than re-fetching everything.

**Q: Is it safe to re-run the pipeline on already-enriched entities?**

A: Yes. Every stage checks for existing data and skips if the work is done. Re-running without force flags is effectively a no-op for completed entities. The pipeline won't double-write or overwrite existing data unless you explicitly use `--force` or `--reprocess`.

---

## 16. Related Documentation

| Document | What It Covers |
|----------|---------------|
| `docs/DATA_PIPELINE_QUICK_START.md` | Quick-start guide — fastest path from names to enriched entities |
| `docs/PIPELINE_COMMANDS.md` | Full operator command reference for all enrichment tools |
| `docs/ENRICHMENT-OPERATIONS-INVENTORY.md` | Canonical inventory of all enrichment operations by entity record field |
| `docs/architecture/enrichment-strategy-v1.md` | Enrichment philosophy: phases, hard rules, evidence vs. canonical, cost optimization |
| `docs/architecture/enrichment-playbook-v1.md` | City launch playbook: tool inventory, execution sequence, cost estimates |
| `docs/architecture/enrichment-model-v1.md` | Vertical-aware completeness model for entity types |
| `docs/architecture/enrichment-evidence-model-v1.md` | Evidence model: confirmed absence, staleness, source-aware sequencing |
| `docs/architecture/enrichment-freshness-strategy-v1.md` | Data freshness: stability classes, cadences, observation framework |
| `docs/architecture/entity-state-model-v1.md` | Three-axis state model: operating, enrichment, publication status |
| `docs/architecture/fields-era-overview-v1.md` | ERA concept: entity record awareness, why awareness != canonical |
| `docs/architecture/entity-pipeline-overview-v1.md` | High-level pipeline stages: awareness → identification → enrichment |
| `docs/architecture/coverage-source-enrichment-v1.md` | Editorial coverage pipeline: schema, pipeline, trust tiers |

---

*Saiko Maps · Enrichment Pipeline Knowledge Base · 2026-03-26*
