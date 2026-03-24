---
doc_id: ARCH-IDENTITY-SCORING-V1
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: '2026-03-14'
last_updated: '2026-03-14'
project_id: SAIKO
systems:
  - identity-enrichment
  - coverage-operations
related_docs:
  - docs/architecture/coverage-ops-approach-v1.md
  - docs/architecture/fields-era-overview-v1.md
  - docs/architecture/entity-classification-framework-v1.md
  - docs/architecture/entity-type-problem-definition-v1.md
summary: >-
  Weighted anchor scoring model for entity identity confidence. GPID is not
  required — entities reach publication threshold through any combination of
  anchors that demonstrates sufficient identity certainty.
---

# Identity Scoring — Weighted Anchor Model

## Core Principle

**GPID (Google Place ID) is not required for entity identity.**

Saiko is not a location-first database. Many entities we track — taco carts, pop-ups, mobile vendors, market stalls — don't have Google Places listings. Requiring GPID as a prerequisite for identity would permanently exclude these entities from publication.

Instead, identity confidence is computed from a weighted set of **anchors** — independent data points that corroborate an entity's existence and uniqueness.

## Anchor Weights

| Anchor | Weight | Why |
|--------|--------|-----|
| `gpid` (Google Place ID) | 4 | Strongest single signal — Google verified the business exists at this location |
| `website` | 3 | Official web presence — strong identity signal, especially for established businesses |
| `instagram` | 2 | Social presence — confirms entity is active and provides visual verification |
| `tiktok` | 2 | Social presence — especially relevant for street food, taco vendors, food reviewers |
| `verifiedAddress` | 2 | Physical location confirmed — address string matches a known format |
| `reservationProvider` | 1 | Corroborator — listed on Resy, OpenTable, etc. |
| `mediaMention` | 1 | Corroborator — mentioned in editorial coverage |
| `matchingCategory` | 1 | Corroborator — category aligns with intake data |
| `matchingNeighborhood` | 1 | Corroborator — neighborhood aligns with intake data |
| `matchingPhone` | 1 | Corroborator — phone number matches across sources |

## Scoring

Confidence is computed as `sum(triggered_weights) / MAX_WEIGHT` where `MAX_WEIGHT = 10`.

This means a score of 1.0 is achievable without GPID:
- website (3) + instagram (2) + tiktok (2) + verifiedAddress (2) + mediaMention (1) = 10

And a taco cart with just Instagram + TikTok + a media mention scores 0.5 — enough to be tracked and potentially published.

## Publication Threshold

Entities are considered publishable when they have sufficient identity confidence **and** key fields populated. The identity score is one input to the coverage operations system, which also checks for:
- Coordinates (required for map placement)
- Name (required)
- At least one contact/social anchor

## Implementation

- **Scoring function**: `lib/identity-enrichment.ts` → `computeConfidence()`
- **Anchor extraction**: `lib/identity-enrichment.ts` → `AnchorSet` interface
- **Name matching (identity scoring)**: Jaro-Winkler similarity ≥ 0.85 for near-exact matches
- **Name matching (GPID backfill)**: When `backfill-google-places.ts` searches by name (no pre-existing GPID or address), it guards against linking the wrong place using: (1) Jaro-Winkler ≥ 0.55 OR (2) substring containment (entity name ⊂ Google name or vice versa). Both must fail to reject. Our curated entity name is never overwritten by Google's display name — Google provides GPID, coords, hours, and photos only.
- **Coverage integration**: `lib/coverage/issue-scanner.ts` flags `unresolved_identity` from the weighted anchor score threshold (not GPID alone); `missing_gpid` is tracked separately as a non-blocking gap

## Design Rationale

### Why not just use GPID?

1. **Taco carts and mobile vendors** — the core use case for Saiko. Many operate without a Google listing. Requiring GPID means excluding the most interesting, hardest-to-find places.

2. **New businesses** — Google Places listings lag behind real-world openings by weeks or months. A new restaurant with an Instagram, a website, and an Eater review is clearly a real entity.

3. **Data independence** — over-reliance on a single external provider (Google) creates brittleness. Multiple independent anchors provide more robust identity than one strong signal.

### Why weighted, not boolean?

A binary "has GPID = verified" model can't express nuance. A place with GPID but no other signals might be a closed business with a stale listing. A place with Instagram + TikTok + two media mentions but no GPID is clearly real. The weighted model captures this.

### Why these specific weights?

- **GPID at 4**: Google has done verification work (business owner claimed the listing, or Street View confirmed it). High signal but not insurmountable.
- **Website at 3**: An official website requires effort to create and maintain. Strong signal of an established business.
- **Social at 2 each**: Active social presence confirms the entity exists and is operating. Two platforms are worth more than one (independence).
- **Corroborators at 1 each**: These confirm but don't independently establish identity. A matching phone number is good, but phone numbers can be wrong or reused.
