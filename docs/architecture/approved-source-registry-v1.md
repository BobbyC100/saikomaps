---
doc_id: APPROVED-SOURCE-REGISTRY-V1
doc_type: reference
status: active
title: "Approved Editorial Source Registry"
owner: Bobby Ciccaglione
created: "2026-03-22"
last_updated: "2026-03-22"
project_id: SAIKO
systems:
  - fields-data-layer
  - enrichment
related_docs:
  - docs/architecture/coverage-source-enrichment-v1.md
  - docs/architecture/source-integration-policy-v1.md
  - docs/architecture/enrichment-strategy-v1.md
summary: >
  Canonical reference for Saiko's curated list of approved editorial sources.
  Bobby maintains this list. A source enters only if it clearly improves
  cultural interpretation or factual coverage. This document mirrors the
  code-level registry in lib/source-registry.ts.
---

# Approved Editorial Source Registry v1

**SAIKO FIELDS · INTERNAL**

March 2026

## Core Principle

Coverage in Saiko is curated, not comprehensive. We do not crawl the open
web for mentions. We maintain a defined, intentional list of publications
that are trustworthy, editorially rigorous, and culturally relevant.

A source enters this registry only if it clearly improves one of:
- Cultural interpretation (SceneSense, atmosphere, identity)
- Factual coverage (people, opening dates, closures, accolades)
- Editorial signal density (reviews, profiles, features)

Absence from this list does not mean a source is bad. It means Saiko has
not chosen to include it. Bobby is the decision-maker for additions.

---

## Trust Tiers

| Tier | Quality Score | Meaning |
|------|--------------|---------|
| 1 | ≥0.95 | Highest editorial rigor. Reviews carry strong signal weight. Typically staffed food critics or established national brands. |
| 2 | 0.85–0.90 | Strong editorial value. Reliable coverage, good signal density. May be niche or regional but editorially sound. |
| 3 | 0.80 | Useful supplementary coverage. Lower signal density or narrower focus. Discovery may be disabled. |

---

## Registry

### Tier 1

| ID | Publication | Domain(s) | Score | Coverage Profile | Discovery |
|----|-------------|-----------|-------|-----------------|-----------|
| `eater_la` | Eater LA | la.eater.com | 0.95 | Opening coverage, reviews, lists (Eater 38), closures | ✅ |
| `infatuation` | The Infatuation | theinfatuation.com | 0.95 | Reviews, neighborhood guides, curated picks | ✅ |
| `latimes_food` | Los Angeles Times | latimes.com | 0.95 | Reviews, criticism, features, 101 Best list | ✅ |
| `michelin_guide` | Michelin Guide | guide.michelin.com | 0.95 | Stars, Bib Gourmand, recommendations | ✅ |
| `nytimes` | New York Times | nytimes.com | 0.90 | National reviews, features, lists | ✅ |

### Tier 2

| ID | Publication | Domain(s) | Score | Coverage Profile | Discovery |
|----|-------------|-----------|-------|-----------------|-----------|
| `timeout_la` | TimeOut | timeout.com | 0.90 | Reviews, lists, neighborhood guides | ✅ |
| `bonappetit` | Bon Appétit | bonappetit.com | 0.90 | Features, Hot 10, national lists | ✅ |
| `la_taco` | LA Taco | lataco.com | 0.85 | Street food, neighborhood coverage, openings | ✅ |
| `la_weekly` | LA Weekly | laweekly.com | 0.85 | Reviews, features, neighborhood guides | ✅ |
| `la_magazine` | Los Angeles Magazine | lamag.com | 0.85 | Features, lists, city culture | ✅ |
| `gq` | GQ | gq.com | 0.85 | Features, shopping guides, culture | ✅ |
| `hyperallergic` | Hyperallergic | hyperallergic.com | 0.85 | Art, culture, gallery coverage | ✅ |
| `ocula` | Ocula | ocula.com | 0.85 | Art gallery profiles, exhibitions | ✅ |
| `thrasher_magazine` | Thrasher Magazine | thrashermagazine.com | 0.85 | Skate culture, skatepark features | ✅ |
| `laist` | LAist | laist.com | 0.85 | Local food news, openings, neighborhood coverage | ✅ |
| `dandy_eats` | Dandy Eats | dandyeats.com | 0.85 | LA restaurant coverage, reviews, features | ✅ |
| `food_journal_magazine` | Food Journal Magazine | foodjournalmagazine.com | 0.85 | Food culture, restaurant features | ✅ |
| `food_life_mag` | Food Life Magazine | foodlifemag.com | 0.85 | Food culture, dining features | ✅ |

### Tier 3

| ID | Publication | Domain(s) | Score | Coverage Profile | Discovery |
|----|-------------|-----------|-------|-----------------|-----------|
| `sf_gate` | SFGate | sfgate.com | 0.80 | Regional food coverage, features | ❌ |
| `insidehook` | InsideHook | insidehook.com | 0.80 | Features, city guides | ❌ |
| `modern_luxury` | Modern Luxury | modernluxury.com | 0.80 | Lifestyle, dining, city culture | ❌ |

---

## Discovery Flag

Sources with `discoveryEnabled: true` are included in automated editorial
discovery searches during enrichment. Sources with discovery disabled are
still recognized by the URL matcher — if a URL from that domain appears
in manual entry or backfill data, it will be correctly attributed. They
just won't be searched proactively.

---

## Code Location

The authoritative registry lives in `lib/source-registry.ts`. This doc
mirrors it for the knowledge base. If they diverge, the code is canonical.

Key exports:
- `APPROVED_EDITORIAL_SOURCES` — the full registry array
- `isApprovedEditorialUrl(url)` — check if a URL belongs to an approved source
- `findApprovedSource(url)` — get the ApprovedSource record for a URL
- `derivePublicationName(url)` — get display name (approved source name or cleaned hostname)
- `getDiscoverySources()` — get all sources with discovery enabled

Legacy API (preserved for existing callers):
- `SOURCE_QUALITY` — quality score map keyed by `editorial_<id>`
- `getSourceQuality(source)` — lookup by legacy key
- `isKnownSource(source)` — check legacy key existence

---

## Adding a New Source

1. Bobby approves the source per Source Integration Policy (SOURCE-INTEGRATION-V1)
2. Add entry to `APPROVED_EDITORIAL_SOURCES` in `lib/source-registry.ts`
3. Add legacy quality key to `SOURCE_QUALITY` if existing callers need it
4. Update this doc
5. Run backfill if existing entities have URLs from the new domain:
   `npx tsx scripts/backfill-coverage-from-editorial-sources.ts --dry-run`

---

## Fetch Results (March 2026 baseline)

Initial fetch pass across 192 backfilled source URLs:

| Publication | Fetched | Failed | Rate | Notes |
|-------------|---------|--------|------|-------|
| Eater LA | 44 | 40 | 52% | Old `/maps/` URLs are dead (link rot) |
| The Infatuation | 21 | 6 | 78% | Guide pages are JS-rendered (thin content) |
| LA Times | 14 | 15 | 48% | Paywall/bot protection on some URLs |
| LA Taco | 6 | 1 | 86% | Strong fetch rate |
| TimeOut | 6 | 0 | 100% | Clean |
| Modern Luxury | 3 | 0 | 100% | Clean |
| Ocula | 0 | 17 | 0% | Bot protection blocks all fetches |
| NYT | 0 | 2 | 0% | Paywall |

Total: 97 fetched (54%), 84 failed. Failed sources retain `enrichmentStage = FAILED`
with `is_alive = false`. Content from successful fetches is archived and survives link rot.
