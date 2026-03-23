---
doc_id: COVERAGE-SOURCE-ENRICHMENT-V1
doc_type: architecture
status: active
title: "Coverage Source Enrichment Pipeline v1"
owner: Bobby Ciccaglione
created: "2026-03-22"
last_updated: "2026-03-22"
revision_notes: "v3: Phase 2 discovery pipeline built, extraction prompt v2 (entity scoping, person affiliation gate, relevance recalibration), full reprocess to coverage-extract-v2"
project_id: SAIKO
systems:
  - fields-data-layer
  - enrichment
  - interpretation
  - traces
related_docs:
  - docs/architecture/enrichment-strategy-v1.md
  - docs/architecture/enrichment-evidence-model-v1.md
  - docs/architecture/source-integration-policy-v1.md
  - docs/architecture/approved-source-registry-v1.md
  - docs/architecture/person-actors-v1.md
  - docs/architecture/program-template-v1.md
  - docs/architecture/entity-maintenance-policy-v1.md
  - docs/architecture/enrichment-freshness-strategy-v1.md
summary: >
  Defines the schema, pipeline, and data flow for treating editorial coverage
  sources as fully enriched, durable references. Coverage sources are not just
  links — they are rich data artifacts that feed the interpretation layer,
  serve as citable references in the UI, and remain durable even if the
  original URL breaks.
---

# Coverage Source Enrichment Pipeline v1

**SAIKO FIELDS · INTERNAL**

March 2026 · Draft

## Context

The enrichment strategy (ENRICH-STRATEGY-V1) defines editorial coverage as a
Phase 2 free enrichment source with high subjective signal density. It
specifies the pipeline: discovery → fetch → AI extraction → store with
provenance → surface on entity page.

Today, `coverage_sources` stores only bare links — `sourceName`, `url`,
`excerpt`, `publishedAt`. No article content is fetched. No structured data is
extracted. The interpretation layer (description generator, identity signals,
SceneSense, offering signals) cannot draw on editorial content because it
simply is not stored.

This document specifies how to close that gap.

---

## Core Principle

> *A coverage source is a reference, not a bookmark. It must be fetched,
> archived, cited, and made available to every downstream interpretation
> tool that can use it.*

Like a citation in a white paper: we store the full bibliographic metadata,
we archive the content so it survives link rot, and we extract the relevant
data so it can be referenced by downstream systems.

---

## 1. Schema: `coverage_sources` (redesigned)

The current table is replaced with a richer schema. This is a greenfield
redesign — the table is rebuilt, not patched.

### Core identity & citation metadata

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Row identity |
| `entity_id` | FK → entities | Which entity this source covers |
| `url` | String | Original source URL |
| `source_type` | Enum | `ARTICLE`, `REVIEW`, `LIST`, `VIDEO`, `SOCIAL_POST`, `GUIDE` |
| `publication_name` | String | Outlet name: "Eater LA", "LA Times", "GQ" |
| `article_title` | String? | Full article/video title |
| `author` | String? | Article author or creator name |
| `published_at` | DateTime? | When the article was published |
| `created_at` | DateTime | When this row was created in Saiko |

### Archived content

| Column | Type | Purpose |
|--------|------|---------|
| `fetched_content` | Text? | Full article text, cleaned of boilerplate. Null before fetch. |
| `content_hash` | String? | SHA-256 of fetched_content. Detect changes on re-fetch. |
| `word_count` | Int? | Article length. Useful for filtering short/stub pages. |
| `fetched_at` | DateTime? | When content was last successfully fetched |

### Link health

| Column | Type | Purpose |
|--------|------|---------|
| `http_status` | Int? | Last observed HTTP status (200, 301, 404, 410, etc.) |
| `last_checked_at` | DateTime? | When link was last verified |
| `is_alive` | Boolean | Derived: true if last check returned 2xx/3xx |

### Enrichment state

| Column | Type | Purpose |
|--------|------|---------|
| `enrichment_stage` | Enum | `INGESTED`, `FETCHED`, `EXTRACTED`, `FAILED` |
| `extraction_version` | String? | Prompt/model version used for extraction |
| `extracted_at` | DateTime? | When AI extraction was last run |

### Constraints & indexes

- `@@unique([entity_id, url])` — one row per entity-URL pair
- `@@index([entity_id])` — fast lookup by entity
- `@@index([enrichment_stage])` — find sources needing enrichment
- `@@index([is_alive])` — filter dead links
- `@@index([entity_id, source_type])` — filter by type per entity

---

## 2. Schema: `coverage_source_extractions`

Structured data extracted from a coverage source by AI. This is the bridge
between the fetched article and the interpretation layer.

Each extraction run produces one row per coverage source. The extracted
signals are stored as structured JSON so any downstream interpretation tool
can query them.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Row identity |
| `coverage_source_id` | FK → coverage_sources | Which source this was extracted from |
| `entity_id` | FK → entities | Denormalized for fast entity-level queries |
| `extraction_version` | String | Prompt version + model version |
| `extracted_at` | DateTime | When this extraction was performed |
| `is_current` | Boolean | True for the latest extraction (supports re-runs) |

### Extracted signal fields (structured JSON columns) — v2 domain-aligned

Extraction columns are aligned to the downstream systems they feed. The v2
schema (March 2026) replaced the original `cuisine_signals` and `offering_signals`
with three domain-aligned evidence fields that map directly to the offering
programs assembly system.

| Column | Type | Feeds | Shape |
|--------|------|-------|-------|
| `people` | Json? | Actor system (PlaceActorRelationship) | `[{name, role, context, isPrimary?}]` |
| `food_evidence` | Json? | food_program + specialty program assemblers, menu_identity, description gen | `{cuisinePosture, cookingApproach[], dishes[], menuFormat[], specialtySignals: {sushi?, ramen?, taco?, pizza?, dumpling?}, rawMentions[]}` |
| `beverage_evidence` | Json? | wine_program, beer_program, cocktail_program, non_alcoholic_program, coffee_tea_program | `{wine: {listDepth?, naturalFocus?, ...}, cocktail: {...}, beer: {...}, nonAlcoholic: {...}, coffeeTea: {...}, rawMentions[]}` |
| `service_evidence` | Json? | service_program, private_dining_program, group_dining_program, catering_program | `{serviceModel, reservationPosture, diningFormats[], privateDining: {...}, groupDining: {...}, catering: {...}, hospitalityNotes[], rawMentions[]}` |
| `atmosphere_signals` | Json? | Derived signals (scene_energy, date_night_probability) | `{descriptors[], energyLevel, formality}` |
| `origin_story` | Json? | Description generation, identity enrichment | `{type, narrative, foundingDate, backstory}` |
| `accolades` | Json? | Trust signals, place page | `[{name, source, year, type}]` |
| `pull_quotes` | Json? | Place page, description generation | `[{text, context}]` |
| `sentiment` | String? | Confidence weighting | `POSITIVE`, `NEGATIVE`, `NEUTRAL`, `MIXED` |
| `article_type` | String? | Signal weighting by coverage type | `review`, `opening_coverage`, `list_inclusion`, `profile`, `news`, `closure_news`, `guide` |
| `relevance_score` | Float? | Filter low-relevance mentions | 0.0–1.0 |

**People role vocabulary:** chef, executive_chef, sous_chef, pastry_chef,
sommelier, beverage_director, wine_director, bartender, general_manager,
foh_director, foh_manager, owner, founder, partner, operator

**Why domain-aligned?** The original `offering_signals` field (`{dishes[], drinks[], programs_mentioned[]}`) was too flat. An article saying "the wine list runs 200 bottles deep with a strong natural wine section" is direct evidence for the wine_program at `dedicated` maturity — but a generic `drinks[]` array loses that signal. The v2 schema captures evidence in the shape the downstream assemblers need it.

### Constraints & indexes

- `@@index([entity_id])` — fast entity lookup
- `@@index([entity_id, is_current])` — current extractions per entity
- `@@index([coverage_source_id])` — join back to source

### Why separate from coverage_sources?

Extractions are versioned and re-runnable. When we improve the extraction
prompt or model, we re-run extraction without touching the source record.
The source record is the durable reference; the extraction is the
interpretation of that reference. This follows the same pattern as
`interpretation_cache` — content is re-generated as prompts improve, but
the underlying data doesn't change.

---

## 3. How Interpretation Tools Access Editorial Data

The key architectural question: how do existing interpretation pipelines
(description generator, identity signals, SceneSense, offering signals)
get access to editorial content?

### The access pattern

When any interpretation tool runs for an entity, it queries:

```sql
SELECT cse.*
FROM coverage_source_extractions cse
WHERE cse.entity_id = $1
  AND cse.is_current = true
```

This returns all current structured extractions for the entity. The
interpretation tool picks the fields it cares about:

- **Description generator** → reads `pull_quotes`, `atmosphere_signals`,
  `origin_story`, `food_evidence` (cuisine posture, dishes)
- **Identity signals pipeline** → reads `people`, `food_evidence`,
  `origin_story`
- **SceneSense / energy scoring** → reads `atmosphere_signals`, `sentiment`
- **Offering programs** → reads `food_evidence` (specialty signals, menu
  format), `beverage_evidence` (wine, cocktail, beer, NA, coffee/tea),
  `service_evidence` (service model, private/group dining, catering)
- **Actor candidate pipeline** → reads `people` to generate candidate
  person-actor relationships
- **Accolades display** → reads `accolades` directly
- **Pull quote display** → reads `pull_quotes` with source attribution
  from the parent coverage_source

### Why not `derived_signals`?

`derived_signals` stores signals *derived by Saiko's interpretation layer*
— the output of our own analytical pipelines. Editorial extractions are
different: they are structured representations of *what an external source
said*. They are evidence, not interpretation. Keeping them in their own
table preserves the distinction between "what the world says about this
place" and "what Saiko concludes about this place."

The interpretation tools *consume* editorial extractions as input alongside
other evidence (website crawl, Instagram, Google data) to *produce*
derived signals and interpretation cache entries.

```
coverage_source_extractions (evidence: what external sources say)
        ↓ consumed by
interpretation pipelines (description, identity, scenesense, etc.)
        ↓ produce
derived_signals / interpretation_cache (Saiko's conclusions)
        ↓ consumed by
product surfaces (place page, cards, maps)
```

---

## 4. Approved Source Registry

Coverage in Saiko is curated, not comprehensive. We do not crawl the open
web for mentions. We search a defined, maintained list of approved
publications — sources Bobby has chosen because they are trustworthy,
editorially rigorous, and culturally relevant.

### The registry

The approved source list lives in code (`lib/source-registry.ts`) and in
the dedicated reference doc (APPROVED-SOURCE-REGISTRY-V1). As of March 2026,
21 approved sources across three trust tiers:

**Tier 1 (quality ≥0.95):** Eater LA, The Infatuation, LA Times, Michelin Guide, New York Times

**Tier 2 (quality 0.85–0.90):** TimeOut, Bon Appétit, LA Taco, LA Weekly, LA Magazine, GQ, Hyperallergic, Ocula, Thrasher Magazine, LAist, Dandy Eats, Food Journal Magazine, Food Life Magazine

**Tier 3 (quality 0.80):** SFGate, InsideHook, Modern Luxury

The full registry with domains, quality scores, trust tiers, coverage
profiles, and discovery flags is maintained in `lib/source-registry.ts`
and documented in `docs/architecture/approved-source-registry-v1.md`.

Bobby maintains this list. New sources are added per the Source Integration
Policy (SOURCE-INTEGRATION-V1) — a source enters the registry only if it
clearly improves cultural interpretation or factual coverage.

### Why curated matters

The approved source list is not a limitation — it is a quality filter.
An Eater opening piece or an LA Times review carries editorial rigor,
fact-checking, and critical perspective that a random blog post does not.
Saiko's coverage signal is only as good as the sources it trusts.

This also bounds the discovery problem. "Search the internet for mentions"
is unbounded. "Check 6 approved publications for articles about this entity"
is a well-defined, automatable enrichment step.

---

## 5. Pipeline Stages

### Stage 0: Backfill (one-time)

Migrate existing editorial URLs from `entities.editorialSources` JSON into
the new `coverage_sources` table with `enrichment_stage = INGESTED`.
Backfill script already built (`scripts/backfill-coverage-from-editorial-sources.ts`).

URLs from non-approved sources (venue's own website, Yelp, Reddit) are
filtered out at backfill time.

### Stage 1: Discovery

For each entity in enrichment, search approved sources for coverage.

This is not passive ingestion — it is an active enrichment step that runs
alongside website crawl, Instagram fetch, and Google Places lookup. When
an entity enters or re-enters enrichment, the editorial discovery step
checks each approved publication for articles mentioning the entity.

**Discovery methods (per publication):**
- Site-scoped search: `site:la.eater.com "entity name"` via search API
- Direct URL patterns: some publications have predictable URL structures
  (e.g., `theinfatuation.com/los-angeles/reviews/{slug}`)
- RSS/feed monitoring: for ongoing discovery of new coverage

**Output:** Each discovered URL enters `coverage_sources` with
`enrichment_stage = INGESTED`, `publication_name` from the registry,
and `source_type` derived from URL/content patterns (review, list, news).

**What this unlocks:** When a new restaurant is added to Saiko, the
enrichment pipeline automatically finds that Eater covered the opening,
LA Times reviewed it, and it made The Infatuation's neighborhood guide.
No manual URL entry needed. The system surfaces coverage Bobby doesn't
have to find himself.

**Bonus signals from discovery:** Opening coverage reveals founding dates,
team members, and concept descriptions. Closing coverage detects permanent
closures. List inclusions ("Eater 38", "Best New Restaurants 2025") are
accolade signals. All of this feeds the interpretation layer automatically.

### Stage 2: Fetch

For each source in `INGESTED` or `DISCOVERED` stage:

1. HTTP GET the URL
2. Record `http_status`, `last_checked_at`, `is_alive`
3. If 2xx: extract article text (strip nav, ads, boilerplate), compute
   `content_hash`, store in `fetched_content`, set `word_count`
4. Extract `article_title` from `<title>` or `<h1>` or `og:title`
5. Extract `author` from byline patterns or `meta[name=author]`
6. Extract `published_at` from `<time>`, `meta[article:published_time]`,
   or URL date patterns
7. Set `enrichment_stage = FETCHED`

If fetch fails (4xx, 5xx, timeout):
- Record `http_status`, `is_alive = false`
- Set `enrichment_stage = FAILED`
- Do not retry immediately — failed sources are retried on a cadence

### Stage 3: Extract

For each source in `FETCHED` stage with non-null `fetched_content`:

1. Send article text + entity context to AI extraction prompt
2. Prompt returns structured JSON matching the `coverage_source_extractions`
   column schema
3. Write extraction row with `is_current = true`, mark previous extractions
   for same source as `is_current = false`
4. Set `enrichment_stage = EXTRACTED` on the coverage source

The extraction prompt receives:
- Full article text (or truncated to token limit)
- Entity name, category, neighborhood (for relevance anchoring)
- Structured output schema (JSON mode)

### Re-enrichment

Sources can be re-enriched when:
- Extraction prompt version improves → re-run Stage 3 only
- Article content may have changed → re-run Stage 2 + 3 (compare content_hash)
- Link health check → re-run Stage 2 only (periodic, e.g. monthly)

---

## 6. Link Health Strategy

### The problem

URLs break over time. Publications restructure their sites, articles get
taken down, domains expire. A 2023 Eater article about a restaurant opening
may 404 by 2027.

### The approach

Because we archive the article content at fetch time, link rot does not
destroy our data. The `fetched_content` persists even after the URL dies.
The link health fields exist to:

1. Inform the UI — don't show "Read article ↗" for a dead link
2. Track data freshness — how old is our archived copy?
3. Trigger re-fetch — if content hash changes on re-check, the article
   was updated and we should re-extract

### Health check cadence

| Source age | Check frequency |
|-----------|----------------|
| < 6 months | Monthly |
| 6–24 months | Quarterly |
| > 24 months | Bi-annually |

### UI behavior by link status

| `is_alive` | `fetched_content` | UI behavior |
|-----------|------------------|-------------|
| true | present | Show source with "Read article" link |
| false | present | Show source, show excerpt, hide/gray link |
| false | null | Hide source entirely |
| true | null | Show source with link, no excerpt |

---

## 7. Migration Path

### Phase 1: Schema migration ✅ COMPLETE

1. ✅ Created new `coverage_sources` table (greenfield redesign)
2. ✅ Created `coverage_source_extractions` table (v2 domain-aligned schema)
3. ✅ Expanded `lib/source-registry.ts` into full approved source registry (21 sources)
4. ✅ Backfilled from `entities.editorialSources` JSON → 192 approved source rows

Migrations: `20260322072941_coverage_source_enrichment_v2`,
`20260322075205_extraction_schema_v2_domain_aligned`

### Phase 2: Discovery pipeline ✅ COMPLETE

1. ✅ Built discovery script (`scripts/discover-coverage-sources.ts`):
   Claude Haiku + web_search, same pattern as `discover-social.ts`
2. ✅ Searches discovery-enabled approved publications per entity
3. ✅ Filters discovered URLs against approved source registry
4. ✅ Deduplicates against existing coverage_sources per entity
5. ✅ Supports `--dry-run`, `--limit`, `--slug`, `--vertical`, `--skip-covered`
6. Cost: ~$0.01/entity (Haiku + web_search)
7. Pending: integration into enrichment flow as standard step; validation
   via spot-check against manual knowledge

### Phase 3: Fetch + archive pipeline ✅ COMPLETE

1. ✅ Built fetcher (`lib/coverage/fetch-source.ts`): cheerio-based HTML
   extraction with article text, title, author, published date parsing
2. ✅ Built runner (`scripts/fetch-coverage-sources.ts`): rate-limited
   processing with retry, per-publication stats
3. ✅ Processed all 192 INGESTED sources: 97 FETCHED, 84 FAILED, 11 skipped

Known fetch limitations:
- Eater `/maps/` URLs: ~50% 404 (old URL format, link rot)
- The Infatuation guide pages: thin content (JS-rendered, cheerio gets shell only)
- Ocula: 0% success (bot protection)
- NYT: paywall blocks fetch

### Phase 4: AI extraction pipeline ✅ COMPLETE

1. ✅ Built extraction prompt (`lib/coverage/extract-source-prompt.ts`):
   domain-aligned structured JSON output with sanitizers and validation
2. ✅ Built runner (`scripts/extract-coverage-sources.ts`): Claude Sonnet,
   rate-limited, versioned, re-runnable
3. ✅ v1 extraction completed: 102 sources extracted from 192 total
   (90 FAILED at fetch stage — 404s, paywalls, bot protection)
4. ✅ v2 extraction prompt improvements (March 2026):
   - **Entity scoping rule**: extracts signals only from paragraphs about
     the target place — fixes list-article bleed where a "25 Best Tacos"
     article would leak dishes from all 25 entries
   - **Person affiliation gate**: only extracts people affiliated with the
     target place; journalists, critics, and authors are excluded; unknown
     roles are omitted instead of defaulting to "chef"
   - **Relevance score recalibration**: 7-tier scale with explicit anchoring
     (best-of list entry with a paragraph = 0.4–0.5)
5. ✅ Full reprocess to `coverage-extract-v2` in progress

### Phase 5: Wire into interpretation layer — NOT YET BUILT

1. Update description generator to include editorial extractions as context
2. Update identity signals pipeline to consume people/food/beverage data
3. Update pull quote path to read from extractions (already wired in
   `coverage-apply-description.ts`)
4. Update place page API to serve enriched coverage data (already partially
   wired — reads `pullQuotes` and `accolades` from extractions)
5. Generate actor candidates from extracted `people` data

### Phase 6: Link health monitoring — NOT YET BUILT

1. Build periodic health checker (cadence per source age)
2. Update UI to respect link health status
3. Set up re-fetch triggers for content changes

---

## 8. What This Unlocks

With coverage sources fully enriched:

- **Description generator** gets real editorial context instead of bare
  signals — "Eater called it 'a love letter to Oaxacan mole'" instead
  of just `cuisine_posture: traditional`
- **Identity signals** get chef names, origin stories, and team data from
  opening coverage that no other source provides
- **Pull quotes** become real — extracted from actual article text with
  proper attribution, not empty fields
- **Accolades** surface automatically — Michelin stars, list inclusions,
  awards extracted from the articles that mention them
- **Beverage/food/service programs** get direct evidence — "they have a
  200-bottle natural wine list" feeds wine_program at `dedicated` maturity;
  "omakase counter seats 8" feeds sushi specialty signals and service model
- **FOH and leadership data** extracted — GMs, FOH directors, managers
  mentioned in articles feed the actor system alongside chefs and sommeliers
- **Link rot** is handled gracefully — content is archived, dead links
  are hidden, data persists

- **Opening/closing detection** surfaces automatically — an Eater article
  titled "X Is Permanently Closing" or "New Restaurant X Opens in Silver
  Lake" becomes a structured signal (`article_type: opening_coverage` or
  `article_type: closure_news`) that can trigger status updates and
  temporal signals without manual monitoring
- **Team and people data** that no other source provides — the chef's
  name, where they came from, the sommelier, the design firm, the
  owner's other restaurants — all extracted from opening coverage and
  profiles, feeding identity signals that make every entity richer

The coverage source becomes a first-class data asset in the enrichment
system, not a UI decoration.
