---
doc_id: ARCH-RESERVATION-V1-REVIEW
doc_type: architecture
status: active
title: "Reservation Validation V1 — Architecture Review"
owner: Bobby Ciccaglione
created: "2026-03-18"
last_updated: "2026-03-22"
project_id: SAIKO
systems:
  - enrichment
  - fields-data-layer
  - traces-place-page
  - coverage-ops
related_docs:
  - docs/architecture/enrichment-evidence-model-v1.md
  - docs/architecture/coverage-source-enrichment-v1.md
summary: >
  Architecture review of the reservation validation V1 proposal. Documents what
  exists today (merchant-evidence-only extraction, no provider API integration),
  recommends a separate reservation_provider_matches table with a three-tier
  confidence model (weak / strong_merchant / provider_verified), and defines
  provider-specific render behavior as an additive upgrade over the existing
  generic Reserve button. Includes backlog bucket analysis of 751 open
  missing_reservations issues.
---

# Reservation Validation V1 — Architecture Review

---

## 1. Executive Summary

Saiko already has a working reservation extraction pipeline. It detects reservation URLs from merchant websites, stores them in `merchant_signals`, and renders a generic "Reserve" button on the place page. What it does **not** have is any form of provider-side validation. No OpenTable API. No Resy API. No external provider calls of any kind. The system today is merchant-evidence-only, with no confidence gate at render time.

V1 is correctly framed as a **validation-and-confidence layer on top of an existing extraction system** — not a new reservation feature. The existing pipeline is the foundation. V1 adds trust, accuracy, and provider specificity to what already flows through the system.

The most important near-term risk is not "we don't have a reservation button" (we do), but "we render reservation buttons with no confidence gate, no provider verification, and no way to distinguish strong evidence from weak evidence." V1 should fix that.

---

## 2. What Exists Today

### Data layer

| Table | Reservation Fields | Purpose |
|-------|-------------------|---------|
| `entities` | `reservationUrl` | Legacy convenience field, direct on entity |
| `merchant_signals` | `reservation_provider`, `reservation_url`, `extraction_confidence` | Current best per entity, upserted from enrichment |
| `merchant_surface_scans` | `reservation_platform`, `reservation_url` | Snapshot from homepage scans |
| `merchant_surfaces` | Raw HTML capture | Immutable evidence (includes reservation links in raw form) |
| `merchant_surface_artifacts` | Parsed JSON from surfaces | Structured extraction output, may contain reservation links |
| `entity_issues` | `issue_type = 'missing_reservations'` | Tracks entities with no reservation URL (751 open) |

### Enrichment pipeline

The website enrichment pipeline (Stage 6) detects reservation URLs by pattern-matching HTML content against known provider domains: `resy.com`, `opentable.com`, `exploretock.com`, `tock.com`, `yelp.com/reservations`, `sevenrooms.com`, `reserve.com`, `bookatable`, `tablein.com`. It writes results to `merchant_signals` at confidence >= 0.5 and to Fields v2 canonical state at confidence >= 0.75.

Separately, `extract-reservation-menu.js` promotes reservation URLs from parsed merchant surface artifacts into `merchant_signals` and resolves corresponding `entity_issues`.

### Render path

The API route (`/api/places/[slug]/route.ts`) reads `merchant_signals.reservation_url` with a fallback to `entities.reservationUrl`. It does **not** select `extraction_confidence` or `reservation_provider`. The place page renders a generic "Reserve" button whenever `reservationUrl` is truthy. There is **no confidence threshold, no provider check, and no validation gate at render time**.

### What does NOT exist

- No OpenTable API integration (no keys, no client code, no endpoints)
- No Resy API integration (no keys, no client code, no endpoints)
- No provider-side validation of any kind
- No external API calls to reservation providers
- No venue-level matching against provider data
- The `reservation_provider` field in `merchant_signals` is written but **never read** by the API or UI
- The `extraction_confidence` field in `merchant_signals` is written but **never read** at query/render time

The system today is exclusively merchant-evidence-based. Every reservation URL comes from scraping merchant websites and pattern-matching against known provider domains.

---

## 3. What V1 Actually Is

V1 is a **validation layer added to an existing reservation extraction system**. It is not a new reservation feature.

What changes:

1. **A place to store validation state** — today, `merchant_signals` stores "we found this URL on their website." V1 adds "we evaluated this URL against the provider and here's the result."
2. **A confidence ladder** — today, the system writes with confidence thresholds but reads without them. V1 introduces a read-time confidence gate.
3. **Provider-specific labels** — today, the button says "Reserve." V1 says "Reserve on OpenTable" or "Reserve on Resy" when confidence justifies it.
4. **An audit surface** — today, ambiguous or near-threshold matches are invisible. V1 surfaces them for review.

What does NOT change:

- The existing enrichment pipeline continues to extract reservation URLs from merchant HTML
- The existing `merchant_signals` table continues to store extraction results
- The existing generic "Reserve" button continues to render for entities without a validated provider match
- No existing tables are modified

---

## 4. Recommended Data Model

### Separate table: `reservation_provider_matches`

A separate table is the right pattern. Here's why:

**Idempotency.** `merchant_signals` is a 1:1 upsert per entity — one row, latest-wins. Provider validation needs to store one result per entity *per provider*. An entity could have both an OpenTable and a Resy match candidate. A separate table with a unique constraint on `(entity_id, provider)` handles this cleanly.

**Auditability.** `merchant_signals` overwrites on each enrichment run. Provider match state needs to persist across runs with its own timestamps (`last_checked_at`, `last_verified_at`). Mixing this into `merchant_signals` would conflate extraction state with validation state.

**Separation of concerns.** `merchant_signals` answers "what did we extract from the merchant's website?" `reservation_provider_matches` answers "what do we believe about this entity's relationship to a specific provider?" These are architecturally distinct questions.

**Future providers.** New providers (Tock, SevenRooms) become new rows, not new columns. The model scales without schema changes.

### Recommended shape

```
reservation_provider_matches
  id                UUID (PK)
  entity_id         String (FK → entities)
  provider          String ('opentable' | 'resy' | 'tock' | 'sevenrooms')
  provider_venue_id String?
  booking_url       String?
  match_status      String ('matched' | 'probable' | 'ambiguous' | 'no_match' | 'unverified')
  match_score       Float?
  match_signals     JSONB?
  validation_source String ('website_link' | 'widget_metadata' | 'manual' | 'directory_api')
  confidence_level  String ('weak' | 'strong_merchant' | 'provider_verified')
  is_renderable     Boolean
  program_signals   JSONB?
  last_checked_at   DateTime
  last_verified_at  DateTime?
  created_at        DateTime
  updated_at        DateTime

  @@unique([entity_id, provider])
  @@index([entity_id])
  @@index([provider, match_status])
  @@index([provider, is_renderable])
```

**Important distinction:** `validation_source` should reflect what actually happened, not what we hope to have. If no provider API exists today, the only valid V1 sources are `website_link`, `widget_metadata`, and `manual`. `directory_api` is reserved for when that integration exists.

---

## 5. Recommended Confidence Model

Three tiers. Minimal and honest.

### Tier 1 — `weak`

- Text mention of a provider name without a direct URL
- Fuzzy signal (e.g., "reservations available" without a provider link)
- URL found but provider unclear or domain ambiguous

**Render:** No. Never.

### Tier 2 — `strong_merchant`

- Direct provider-specific booking URL found on the merchant's official website
- Identity signals align (name/address/domain match the entity)
- Widget or embed metadata detected (especially relevant for Resy)
- Extraction confidence >= 0.75 from the existing enrichment pipeline

**Render:** Provider-dependent. For Resy (no public API), this is the ceiling for V1 — renderable if identity alignment is strong. For OpenTable, this triggers a provider validation attempt when API access exists; until then, it is the practical ceiling.

### Tier 3 — `provider_verified`

- Direct confirmation from provider API (Directory API lookup returns a matching venue with booking link)
- Or equivalent official confirmation (partner data, manual verification from provider source)

**Render:** Yes. Always (assuming valid booking URL).

### What this means in practice for V1

Since no provider API integration exists today, **every V1 match will be Tier 1 or Tier 2**. That's fine. The model is designed to accommodate Tier 3 when it becomes available without restructuring. The ladder is honest about what the system can actually claim right now.

The confidence model should not claim `provider_verified` until a real provider validation source exists. This is not a limitation — it's integrity.

---

## 6. Recommended Render Behavior

### Principle: additive enhancement, not restrictive gate

V1 should **not** break the existing render behavior. Today, any entity with a truthy `reservationUrl` gets a "Reserve" button. That behavior should persist as the baseline.

What V1 adds on top:

1. **Provider-specific labels.** If `reservation_provider_matches` has a renderable match for the entity, upgrade the label from "Reserve" to "Reserve on OpenTable" / "Reserve on Resy" / etc. Use the validated booking URL from the match table instead of the raw merchant_signals URL.

2. **Confidence-gated upgrade.** The provider-specific label only appears when `is_renderable = true` on the match record. Otherwise, fall back to the existing generic behavior.

3. **No regressions.** If an entity has a reservation URL in `merchant_signals` but no validated provider match, the generic "Reserve" button continues to render. V1 does not remove buttons — it upgrades them.

### Why not gate the existing button on confidence?

Because the existing button already renders for some set of entities, and pulling it without replacing it with something better would be a visible regression. The right V1 move is to layer validation on top, let the validated version gradually replace the generic version, and consider tightening the generic gate in V2 once coverage is sufficient.

### One exception worth considering

There is currently no confidence check at render time at all. The `extraction_confidence` field exists in `merchant_signals` but is never read by the API. A low-risk V1 enhancement (independent of provider validation) would be to add a minimum extraction confidence threshold to the API query — e.g., only return `reservationUrl` when `extraction_confidence >= 0.5`. This would suppress buttons based on very weak extraction evidence. But this is a separate, smaller decision from the provider validation work.

---

## 7. Validation-Source Reality Check

This is the most important section.

| Question | Answer | Evidence |
|----------|--------|----------|
| OpenTable API integration? | **Does not exist.** | No API keys, no client code, no endpoints, no dependencies in package.json. |
| Resy API integration? | **Does not exist.** | No API keys, no client code, no endpoints. The crawler explicitly skips resy.com URLs to avoid crawling into the platform. |
| Provider-side validation hooks? | **Do not exist.** | No code anywhere calls an external reservation provider API. |
| Merchant-side extraction? | **Yes, exists and is active.** | `lib/website-enrichment/pipeline.ts` pattern-matches against resy.com, opentable.com, etc. `scripts/extract-reservation-menu.js` extracts from parsed artifacts. |
| `reservation_provider` field used at read time? | **No.** | The API route selects `reservation_url` but never selects `reservation_provider`. |
| `extraction_confidence` field used at read time? | **No.** | Written during enrichment (0.5 threshold to write, 0.75 for Fields v2), but never checked when the API serves data or the UI renders. |

**Bottom line:** The system today is 100% merchant-evidence-based. Every reservation signal comes from pattern-matching HTML on merchant websites. No external provider has ever been called. The `reservation_provider` and `extraction_confidence` fields are written but not read — they are dormant infrastructure that V1 can activate.

---

## 8. Recommended Audit Views

### View 1: `reservation_provider_audit_queue`

Primary operational view. Surfaces records from `reservation_provider_matches` that need human review.

```sql
CREATE VIEW reservation_provider_audit_queue AS
SELECT
  rpm.entity_id,
  e.name AS entity_name,
  e.slug,
  rpm.provider,
  rpm.match_status,
  rpm.confidence_level,
  rpm.booking_url,
  rpm.match_score,
  rpm.validation_source,
  rpm.last_checked_at,
  ms.reservation_url AS merchant_signal_url,
  ms.reservation_provider AS merchant_signal_provider,
  ms.extraction_confidence
FROM reservation_provider_matches rpm
JOIN entities e ON e.id = rpm.entity_id
LEFT JOIN merchant_signals ms ON ms.entity_id = rpm.entity_id
WHERE rpm.match_status IN ('probable', 'ambiguous')
   OR (rpm.match_status = 'matched' AND rpm.confidence_level = 'weak')
ORDER BY rpm.match_score DESC NULLS LAST, rpm.last_checked_at ASC;
```

### View 2: `reservation_coverage_summary`

High-level coverage dashboard. Shows where we stand across the entity corpus.

```sql
CREATE VIEW reservation_coverage_summary AS
SELECT
  COALESCE(rpm.provider, ms.reservation_provider, 'none') AS provider,
  COUNT(*) AS entity_count,
  COUNT(CASE WHEN rpm.is_renderable THEN 1 END) AS renderable_count,
  COUNT(CASE WHEN rpm.match_status = 'probable' THEN 1 END) AS probable_count,
  COUNT(CASE WHEN rpm.match_status = 'ambiguous' THEN 1 END) AS ambiguous_count,
  COUNT(CASE WHEN ms.reservation_url IS NOT NULL AND rpm.id IS NULL THEN 1 END) AS extracted_not_validated
FROM entities e
LEFT JOIN reservation_provider_matches rpm ON rpm.entity_id = e.id
LEFT JOIN merchant_signals ms ON ms.entity_id = e.id
WHERE e.primary_vertical IN ('EAT', 'DRINKS', 'WINE', 'STAY')
GROUP BY COALESCE(rpm.provider, ms.reservation_provider, 'none');
```

### View 3: `reservation_backlog_buckets`

Operational triage of the missing_reservations backlog (see Section 9 below for bucket definitions).

```sql
CREATE VIEW reservation_backlog_buckets AS
SELECT
  ei.entity_id,
  e.name,
  e.slug,
  CASE
    WHEN e.website IS NULL OR e.website = '' THEN 'no_website'
    WHEN ms.reservation_url IS NOT NULL AND ms.reservation_url != '' THEN 'extracted_not_synced'
    WHEN ms.reservation_provider IS NOT NULL THEN 'provider_without_url'
    WHEN EXISTS (
      SELECT 1 FROM merchant_surfaces surf
      WHERE surf.entity_id = e.id AND surf.surface_type = 'reservation'
    ) THEN 'surface_captured_not_extracted'
    WHEN EXISTS (
      SELECT 1 FROM merchant_surfaces surf
      WHERE surf.entity_id = e.id
    ) THEN 'has_surfaces_no_reservation_signal'
    ELSE 'no_signal'
  END AS bucket,
  ms.reservation_provider,
  ms.reservation_url,
  ms.extraction_confidence,
  e.website,
  e.primary_vertical
FROM entity_issues ei
JOIN entities e ON e.id = ei.entity_id
LEFT JOIN merchant_signals ms ON ms.entity_id = e.id
WHERE ei.issue_type = 'missing_reservations'
  AND ei.status = 'open';
```

---

## 9. Missing Reservations Backlog — Bucket Analysis

The 751 open `missing_reservations` issues are currently a flat list. They should be categorized into operationally distinct buckets:

### Bucket 1: `no_website`
Entity has no website at all. No merchant surface to scan. These are the hardest to resolve through automation — they require either manual research, Google Places data, or waiting for the merchant to establish a web presence. **Lowest ROI for V1 automation.**

### Bucket 2: `no_signal`
Entity has a website, possibly even merchant surfaces, but no reservation signal of any kind was detected. Could mean: the restaurant doesn't take reservations, or the reservation link is behind JavaScript / in an iframe / on a subpage the crawler didn't reach. **Good candidates for deeper crawling or manual spot-check.**

### Bucket 3: `has_surfaces_no_reservation_signal`
Merchant surfaces were fetched and parsed, but no reservation URL pattern was matched. Similar to `no_signal` but with confirmed surface coverage. The raw HTML exists — a re-parse with updated patterns might extract something. **Good candidates for pattern expansion.**

### Bucket 4: `surface_captured_not_extracted`
A reservation-type surface was captured but the URL hasn't been promoted to `merchant_signals`. The data exists in the evidence layer but hasn't flowed through. **Quick wins — these may just need the extraction script to run.**

### Bucket 5: `provider_without_url`
`merchant_signals.reservation_provider` is set (the system knows which provider) but `reservation_url` is null. The provider was detected but the specific booking link wasn't captured. **Good candidates for targeted provider-URL extraction.**

### Bucket 6: `extracted_not_synced`
`merchant_signals.reservation_url` exists and is non-empty, but the entity_issue is still open. This means the URL was extracted but the issue wasn't resolved — possibly a timing issue or the resolution script hasn't run. **Immediate wins — run the sync/resolution logic.**

### Operational priority

1. **extracted_not_synced** — run resolution script, close issues immediately
2. **surface_captured_not_extracted** — run extraction pipeline, likely quick wins
3. **provider_without_url** — targeted URL extraction by provider
4. **has_surfaces_no_reservation_signal** — re-parse with updated patterns
5. **no_signal** — deeper crawling or manual review
6. **no_website** — lowest priority, requires external data

---

## 10. Risks and Ambiguities

### Risk 1: V1 scope creep into API integration
The specs reference OpenTable Directory API as a V1 validation source. But no API integration exists today, and partner access is not confirmed. **V1 should be designed to work without any provider API.** If API access materializes, it becomes a confidence upgrade source — not a V1 dependency.

### Risk 2: Confidence model without a read-time gate
The existing system writes `extraction_confidence` but never reads it at render time. V1 adds a new confidence model (`reservation_provider_matches.confidence_level`) but the risk is that the generic fallback path (entities without a provider match) still has no confidence gate. Consider whether V1 should also add a minimum confidence threshold to the existing render path.

### Risk 3: Dual-read complexity
The API already does a dual-read (merchant_signals → entities fallback). V1 adds a third source (reservation_provider_matches). The read priority needs to be explicit: provider_matches first (if is_renderable), then merchant_signals, then entities.reservationUrl. This should be documented as a contract, not left implicit in the API route code.

### Risk 4: entity_issues vs. provider match state
`entity_issues` tracks "this entity is missing reservation data." `reservation_provider_matches` will track "this entity's reservation data has been evaluated against a provider." These are related but distinct. V1 should NOT overload `entity_issues` with provider match state. The provider match table is the right home for validation state; entity_issues should only be updated (resolved/closed) when a validated match is achieved.

### Ambiguity: What "renderable" means for Resy without API access
The specs say Resy allows `strong_merchant` to render because no public API exists. This is a reasonable V1 posture, but it means Resy matches will always be lower-confidence than OpenTable matches (once OpenTable API access exists). The UI should not distinguish between these visually — "Reserve on Resy" should look identical to "Reserve on OpenTable" to the user. The confidence difference is an internal property, not a user-facing signal.

---

## 11. Final Recommendation

Build V1 as a **validation-and-confidence layer on top of the existing extraction system**. The four deliverables in the review prompt are the right scope:

1. **Provider match table** — `reservation_provider_matches` as a separate table. Correct pattern for idempotency, auditability, and multi-provider support.

2. **Confidence model** — three tiers (weak / strong_merchant / provider_verified). Honest about what the system can actually claim. V1 will operate at Tier 1 and Tier 2 only. Tier 3 is reserved for real provider API integration.

3. **Provider-specific labels** — upgrade from generic "Reserve" to "Reserve on [Provider]" when a validated match exists. Preserve existing generic behavior as fallback. No regressions.

4. **Audit views** — SQL-first, three views covering operational review, coverage summary, and backlog bucketing.

### Critical V1 constraint

**Do not make provider API access a V1 dependency.** The entire V1 should be buildable and shippable with only merchant-side evidence. Provider API integration is a confidence upgrade path, not a prerequisite.

### First implementation step

Before building the provider match table, run the backlog bucket analysis against the actual 751 issues. The `extracted_not_synced` and `surface_captured_not_extracted` buckets may yield immediate wins that improve coverage without any new infrastructure. That's free value.
