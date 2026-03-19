---
doc_id: ENRICH-STRATEGY-V1
title: Entity Enrichment Strategy
status: draft
owner: bobby
created: 2026-03-15
---

# Entity Enrichment Strategy v1

## Entity Lifecycle

```
Intake (CANDIDATE) → Identify → Enrich → Assess → Publish
```

1. **Intake** — entity enters system as `CANDIDATE` via CSV import, single entry, or discovery
2. **Identify** — confirm entity type (EAT, PARK, SHOP, etc.), deduplicate, anchor identity
3. **Enrich** — fill fields using available data sources, cheapest first
4. **Assess** — check field completeness against the entity type's playbook; human review if needed
5. **Publish** — add to list, entity becomes reachable on maps

## Enrichment Phases

### Phase 1: Identity
- Deduplicate against existing entities (GPID, website domain, Instagram handle, slug, fuzzy name)
- Confirm entity type — determines which fields matter and which tools to run
- Entity type drives the **field playbook** (a restaurant needs hours/menu/reservation; a park does not)

### Phase 2: Free Enrichment (run all, order flexible)
Run all free sources. Order within this phase is flexible — optimize for signal density per call.

| Source | Cost | Signal Density (restaurants) | Fields |
|--------|------|------------------------------|--------|
| **Existing system data** | Free | Variable | Backfill from surfaces, scans, signals already in DB |
| **Website** | Free (crawl) | High | Hours, menu, reservation URL, events URL, catering URL, phone, address, about/story |
| **Instagram API** | Free | Medium | Vibe, photos, identity signals, hours/menu in bio |
| **TikTok API** | Free | Medium-Low | Energy/vibe signals, content |
| **Editorial coverage** | Free (crawl) | High (subjective) | Chef, cuisine, awards, vibe quotes, neighborhood |
| **Social discovery** | Free | Low | Find handles if not provided at intake |

### Phase 3: AI Extraction
- Parse fetched surfaces (websites, social content, editorial articles) using AI
- Extract structured signals from unstructured content
- Cost: mixed — OpenAI for social discovery (GPT-4.1-mini + web search), Anthropic for identity extraction + taglines

### Phase 4: Paid API (gaps only)
- **Google Places API** — only for fields still missing after free enrichment, or to confirm existing data
- Run strategically, not by default
- Fields: latLng, hours, phone, photos, price level, business status

## Hard Rules
1. **Free before paid** — never call Google API if free sources haven't been exhausted
2. **Entity type drives playbook** — don't run restaurant tools on a park
3. **Evidence before canonical** — enrichment writes to evidence tables first, not directly to canonical state
4. **Pluggable architecture** — new data sources slot in as tools; the system doesn't hardcode a fixed pipeline order
5. **Provenance always** — every field tracks where its data came from

## Evidence vs Canonical

Not all discovered data should immediately become canonical state.

### Evidence Layer (where enrichment writes)
Enrichment pipelines write **evidence** — raw observations with provenance:
- `observed_claims` — structured field-level claims (e.g., "hours are X" from source Y)
- `merchant_surfaces` — discovered and fetched page evidence (9 surface types: homepage, about, menu, drinks, instagram, reservation, ordering, contact, events)
- `merchant_surface_artifacts` — parsed structured content from surfaces
- `merchant_surface_scans` — crawled page snapshots (including `private_dining_present` boolean)
- `merchant_signals` — extracted signals from surfaces
- `menu_fetches` — menu content snapshots
- `coverage_sources` — editorial links + extracted accolades

### Canonical Layer (where product reads)
- `canonical_entity_state` — the currently accepted truth, used by product surfaces

### Promotion: Evidence → Canonical
Evidence is promoted to canonical through sanctioning workflows:
- Multiple sources agree → auto-promote with high confidence
- Sources conflict → flag for human review
- Single source, trusted → auto-promote with medium confidence
- Uses `write-claim.ts` / Fields v2 sanctioning pattern

### Why This Matters
- A restaurant's website says hours are 11am-10pm. Google says 11am-9pm. Instagram bio says "open till 10." These are three pieces of **evidence**. The sanctioning step picks the winner and writes it to canonical.
- An Eater article says "Japanese-Italian fusion." The restaurant's own website says "Italian." Both are evidence. Canonical gets the sanctioned answer.

## Editorial Coverage Pipeline

### Approved Source Registry
Curated list of trusted publications, maintained by Bobby:
- Eater LA
- Michelin Guide
- The Infatuation
- LA Times Food
- TimeOut LA
- (expandable — more sources added over time)

### Pipeline
1. **Discovery** — for a given entity, search approved sources for mentions/articles/videos
2. **Fetch content** — crawl article text, pull video transcripts/captions, grab metadata
3. **AI extraction** — same pipeline for all text sources (article, transcript, caption). Extract structured signals.
4. **Store with provenance** — full link, publication/channel name, publish date, title, extracted signals, source type
5. **Surface on entity page** — accolades/awards badge visible to consumers

### Extraction Signals (Restaurant / EAT)

**Factual / Structured** → writes to evidence (`observed_claims`) → promoted to `canonical_entity_state`:
- Chef/owner name
- Cuisine type (Japanese, Mexican, New American)
- Neighborhood confirmation
- Price range indicators ("splurge-worthy," "$$$," "affordable")
- Opening date / "new restaurant" mentions

**Awards / Accolades** → writes to `coverage_sources` + entity page display:
- Michelin stars/recommendations
- List inclusions ("Eater 38," "Best New Restaurant 2025")
- Awards ("James Beard semifinalist")

**Subjective / Signal** → writes to evidence (`merchant_signals`) → promoted to `interpretation_cache`:
- Vibe/atmosphere descriptions ("intimate," "buzzy," "casual counter-service")
- Signature dishes mentioned by name
- Who it's for ("date night," "group dinners," "solo counter dining")
- Comparisons to other places
- Pull-quote-worthy sentences (for display on entity page)

**Meta** (stored on the source record):
- Article/video type (review, list, news, vlog)
- Author/creator name
- Publish date
- Sentiment (positive/negative/neutral)
- View count (video sources)

### Video Sources (YouTube, TikTok)

Video content enters the same extraction pipeline as editorial articles.

**Approach: Transcripts + metadata (cheapest path)**
- YouTube: free transcripts via API + title, description, view count, channel
- TikTok: captions come with content API + metadata
- Feed transcript text through the same AI extraction pipeline used for articles
- No vision/frame analysis needed (future option, not priority)

**Why video matters:**
- A food vlogger saying "best birria tacos in Silver Lake" is the same signal as an Eater article
- View counts are a popularity/buzz signal (500K views = notable)
- Comments are sentiment data ("I drove 2 hours for this" / "overrated")
- Video content captures energy/vibe signals that text reviews may miss

### Consumer-Facing Display
Editorial coverage is not just internal enrichment — it surfaces on the entity page:
- **Accolades section** — "Michelin Star," "Eater 38," "Infatuation Pick"
- **Pull quotes** — notable excerpts from reviews with attribution
- **Source links** — readers can click through to original articles

### Existing Infrastructure
- `coverage_sources` table — entity_id, source_name, url, article_title, published_at
- `entities.editorial_sources` — JSON field
- `operator_place_candidates.source_type` — can be `'editorial'`
- Currently: stores links only, no crawl/parse/extract automation

## Data Flow Architecture

```
Source → Fetch → Extract → Evidence → Sanction → Canonical → Product
```

### Layer Map

| Layer | Tables | Role |
|-------|--------|------|
| **Routing shell** | `entities` | Identity anchors, routing keys (slug, status, primary_vertical, entity_type) |
| **Evidence** | `observed_claims`, `merchant_signals`, `merchant_surface_scans`, `menu_fetches` | Raw observations from enrichment — multiple per field, with provenance |
| **Editorial** | `coverage_sources` | Source links, accolades, extracted editorial signals |
| **Canonical state** | `canonical_entity_state` | Sanctioned truth — one value per field, promoted from evidence |
| **Interpretation** | `interpretation_cache` | AI-generated outputs promoted from evidence (tagline, vibe, pull quotes) |
| **Coverage ops** | `place_coverage_status` | Enrichment progress tracking (last_enriched_at, needs_human_review) |

### Current Misalignment
- `coverage-apply.ts` writes hours, photos, attributes directly to `entities` — should write to evidence, then promote to `canonical_entity_state`
- Dashboard queries check `entities` fields — should join `canonical_entity_state`
- Enrichment score should measure `canonical_entity_state` completeness, not `entities` fields
- No enrichment tools write to evidence tables — they skip straight to `entities`

## Coverage Ops Dashboard

Implemented at `/admin/coverage`. 4-tab layout, server-rendered from raw SQL (`lib/admin/coverage/sql.ts`). Scoped to all non-permanently-closed entities.

### Tab Structure

| Tab | Query param | Purpose |
|-----|-------------|---------|
| **Overview** | `?view=overview` | Summary cards, tier completion bars, enrichment funnel |
| **Tier Health** | `?view=tiers` | Summary strip, ERA pipeline histogram, per-tier field breakdowns |
| **Enrichment Tools** | `?view=pipeline` | Tool inventory with copy-to-clipboard + recent enrichment runs |
| **Neighborhoods** | `?view=neighborhoods` | Scorecard grid by neighborhood |

### Tool Inventory (accessible from Enrichment Tools tab)
| Tool | Cost | Provider | Command |
|------|------|----------|---------|
| Social discovery | Free | OpenAI GPT-4.1-mini | `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/discover-social.ts` |
| Website fetch + parse | Free | — | `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/scan-merchant-surfaces.ts` |
| Populate canonical | Free | — | `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/populate-canonical-state.ts` |
| Website enrichment | Free | — | `npm run enrich:website` |
| Menu URL sync | Free | — | `npm run signals:menu:sync:local` |
| AI identity extraction | Anthropic $ | Anthropic | ERA stage 5 via `enrich-place.ts` |
| AI tagline generation | Anthropic $ | Anthropic | ERA stage 7 via `enrich-place.ts` |
| ERA pipeline (full) | Anthropic $ | Anthropic | `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/enrich-place.ts --slug=SLUG` |
| Coverage apply (Google) | Google $$ | Google Places API | `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/coverage-apply.ts --apply` |
| Editorial discovery | — | Not built | — |

## Enrichment Score

Each entity gets a composite enrichment score reflecting how "filled out" it is.

### Inputs
- **Field completeness** — % of playbook fields populated for this entity type
- **Source diversity** — how many distinct sources contributed data (1 = fragile, 5+ = well-covered)
- **Editorial coverage depth** — number of editorial mentions, weighted by source quality
- **Signal quality** — not just "has value" but "has confident, multi-source-confirmed value"

### Usage
- Dashboard sorts/filters by enrichment score — work on the lowest-scored entities first
- Score thresholds gate publication: e.g., "don't publish below 70%"
- Per-entity detail view shows which fields are dragging the score down

## Source Registry (by Entity Type)

The approved source list is **typed by entity** — different entities need different sources.

### Example: Restaurant (EAT)

| Source | Type | Cost | Signals |
|--------|------|------|---------|
| Eater LA | Editorial | Free | Awards, chef, cuisine, vibe, neighborhood |
| Michelin Guide | Editorial | Free | Stars, rating, cuisine |
| The Infatuation | Editorial | Free | Vibe, recommendations, price |
| LA Times Food | Editorial | Free | Reviews, chef, cuisine, awards |
| TimeOut LA | Editorial | Free | Lists, recommendations |
| Instagram | Social API | Free | Vibe, photos, identity, hours (bio) |
| TikTok | Social API | Free | Energy, vibe, content |
| Entity website | Crawl | Free | Hours, menu, reservation, phone, about |
| Google Places | Paid API | $$ | Hours, phone, latLng, photos, price level |

### Example: Park

| Source | Type | Cost | Signals |
|--------|------|------|---------|
| AllTrails | Crawl | Free | Trails, difficulty, ratings |
| LA Parks Dept | Crawl | Free | Hours, amenities, address |
| TimeOut Outdoors | Editorial | Free | Recommendations, features |
| Instagram | Social API | Free | Photos, vibe |
| Google Places | Paid API | $$ | Hours, latLng, photos |

### Registry Design
- Bobby maintains the master source list — approves which sources are trusted
- System auto-suggests sources based on entity type
- Each source entry specifies: name, type (editorial/social/crawl/api), cost tier, entity types it serves, fields it can provide
- New sources are added without rewriting pipeline code — just register and the orchestrator picks them up

## Future: Pluggable Source Architecture
- Support adding new APIs and data sources over time without rewriting the pipeline
- Each source registers: what fields it can provide, what it costs, what entity types it serves
- The enrichment orchestrator decides what to run based on what's missing and what's cheapest
- Sources can be enabled/disabled per entity type or globally
