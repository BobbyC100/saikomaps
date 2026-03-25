---
doc_id: ARCH-INSTAGRAM-INGESTION-STATUS-V1
doc_type: architecture
status: active
title: "Instagram Ingestion — Operational Status (V1)"
owner: Bobby Ciccaglione
created: "2026-03-01"
last_updated: "2026-03-23"
project_id: SAIKO
systems:
  - enrichment
  - instagram
related_docs:
  - docs/architecture/instagram-api-integration-v1.md
  - docs/architecture/instagram-implementation-v1.md
  - docs/architecture/instagram-ingestion-field-spec-v1.md
  - docs/architecture/enrichment-evidence-model-v1.md
summary: >
  Operational status of the Instagram batch ingestion pipeline. Documents what
  is being ingested (accounts + media via Business Discovery API), known
  limitations (CDN URL expiration, account type requirements), and downstream
  wiring priorities (caption signal extraction, photo pipeline, profile signals).
  914 entities with Instagram handles as of 2026-03-18.
---

# Instagram Ingestion — Operational Status (V1)

---

## 1. Current State

Instagram batch ingestion is operational and verified working in production. Instagram photos are now successfully ingested and displayed on entity pages. The workflow fetches 12 most recent media per entity, ranks by photo type preference, and displays the top 6 photos.

As of 2026-03-18, the system ingests account data and recent media for 914 entities with Instagram handles. Production verification completed on Buvons (verified 2026-03-23).

### What is being ingested

| Data | Table | Status |
|---|---|---|
| Account profiles | `instagram_accounts` | Writing (username, media_count, followers_count) |
| Recent media (10 per entity) | `instagram_media` | Writing (photos, videos, captions, permalinks, timestamps) |
| Insight snapshots | `instagram_insight_snapshots` | Not yet (requires account-level permissions) |

### Infrastructure

| Component | Status |
|---|---|
| Meta Graph API credentials | Active (TRACES THREE dev app) |
| Business Discovery endpoint | Verified, working |
| Rate limiter | 180 calls/hour with exponential backoff |
| Circuit breaker | 5 consecutive rate limits → stop batch |
| Ingestion script | `scripts/ingest-instagram.ts --batch` |

---

## 2. Data Model

### instagram_accounts

One row per entity. Keyed by `instagram_user_id` (unique).

| Field | Source |
|---|---|
| username | Business Discovery |
| media_count | Business Discovery |
| account_type | Business Discovery (BUSINESS / CREATOR / PERSONAL) |
| canonical_instagram_url | Derived |
| raw_payload | Full API response preserved |

### instagram_media

Up to N rows per account (default 200, current batch uses 12).

| Field | Source |
|---|---|
| media_type | IMAGE / VIDEO / CAROUSEL_ALBUM |
| media_url | CDN URL (**expires** — not permanent) |
| thumbnail_url | For videos |
| permalink | Permanent IG post URL |
| caption | Full post text |
| timestamp | Original post time |
| photoType | AI-classified (see below) |
| raw_payload | Full API response preserved |

### photoType Classification (added 2026-03-22)

The `photoType` field on `instagram_media` is populated by an AI photo classification step. Values:

| photoType | Meaning |
|-----------|---------|
| `INTERIOR` | Interior shot of the space |
| `FOOD` | Food plating, dishes |
| `BAR_DRINKS` | Bar setup, cocktails, wine |
| `CROWD_ENERGY` | People, atmosphere, crowd |
| `DETAIL` | Close-up details, textures |
| `EXTERIOR` | Exterior/facade shot |
| `null` | Not yet classified |

**Classification script:** `scripts/classify-entity-photos.ts` — downloads photos, sends to Claude for classification, writes `photoType` back to `instagram_media`.

**Photo ranking in entity page contract:** Photos are ranked by photoType preference order: INTERIOR (0) → FOOD (1) → BAR_DRINKS (2) → CROWD_ENERGY (3) → DETAIL (4) → EXTERIOR (5). Unclassified photos sort after classified ones. Top 6 photos are returned as `photoUrls` in the entity page contract.

---

## 3. Known Limitations

### CDN URL expiration and fallback strategy (RESOLVED)

`media_url` and `thumbnail_url` are temporary Instagram CDN links that expire after an unknown period (hours to days).

**Solution implemented (2026-03-23):** The API route `app/api/places/[slug]/route.ts` now implements a fallback strategy:
- Attempts to fetch top 6 photos from most recent 12 Instagram media items
- If `mediaUrl` (CDN) is expired, falls back to `permalink` (permanent Instagram post URL)
- Photo ranking preference: INTERIOR (0) → FOOD (1) → BAR_DRINKS (3) → CROWD_ENERGY (4) → DETAIL (5) → EXTERIOR (6)
- This ensures photos remain accessible even when CDN URLs expire

Production verified working on Buvons (2026-03-23).

### Account type requirements

Business Discovery only works for Business and Professional Instagram accounts. Personal accounts return "not found." This affects a small percentage of entities (~3 handles failed in initial testing).

### Bio not fetched

The current Business Discovery fields do not include `biography`. Adding this field would provide place descriptions from the operator's own words — valuable for signal extraction.

---

## 4. Downstream Wiring (Partially Built)

### Priority 1 — Photo pipeline (IMPLEMENTED)

Instagram images are now surfaced through place page contracts. Current workflow (2026-03-23):

1. API route fetches 12 most recent Instagram media items per entity
2. Photos ranked by type preference: INTERIOR → FOOD → BAR_DRINKS → CROWD_ENERGY → DETAIL → EXTERIOR
3. Top 6 photos returned as `photoUrls` in entity page contract
4. CDN URLs with fallback to permalinks implemented
5. Verified working in production on Buvons and other EAT/HOSPITALITY entities

### Priority 2 — Caption signal extraction

Instagram captions are rich text from the operator's own voice. They feed the same extraction pipelines as website text blocks:

- SceneSense lenses (atmosphere, energy, scene signals)
- Cuisine/offering signals
- Events Program detection ("private dining", "catering", "book our space")
- Hours/schedule clues

**Approach:** Register Instagram as a `merchant_surface` source type so existing extraction code reads caption text blocks without a separate pipeline.

Status: Not yet implemented. Requires merchant_surface registration.

### Priority 3 — Profile signals

| Signal | Source | Status |
|---|---|---|
| Follower count | `instagram_accounts.raw_payload` | Available (not yet surfaced) |
| Post frequency | Derived from `instagram_media.timestamp` | Available (not yet surfaced) |
| Media count | `instagram_accounts.media_count` | Available (not yet surfaced) |
| Account type | `instagram_accounts.account_type` | Available (not yet surfaced) |

These signals are captured in the raw data but not yet wired into entity page contracts or scoring pipelines.

### Priority 4 — Temporal signals

Not yet in schema. Would require `instagram_temporal_signals` table for:
- Closure/reopening events detected from captions
- Seasonal patterns
- Event announcements

Status: Not yet implemented.

---

## 5. Enrichment Pipeline Integration

Instagram is not yet wired into the 7-stage ERA pipeline. Two integration points:

1. **Stage 2 extension** — surface discovery recognizes Instagram as a source, creates `merchant_surfaces` row
2. **Stage 6 extension** — website enrichment reads Instagram captions alongside website text blocks

Alternatively, Instagram ingestion could become a standalone stage (Stage 8) or run as a parallel track outside the main ERA sequence.

---

## 6. Files

| File | Purpose |
|---|---|
| `scripts/ingest-instagram.ts` | Main ingestion script (batch + single modes) |
| `scripts/backfill-instagram-handles.ts` | Extract handles from merchant surfaces |
| `scripts/find-instagram-handles.ts` | Discover handles for entities |
| `app/api/admin/instagram/route.ts` | Admin handle CRUD |
| `app/api/admin/tools/instagram-discover/route.ts` | Operator action endpoint |
| `app/admin/instagram/page.tsx` | Admin handle management UI |
| `docs/architecture/instagram-api-integration-v1.md` | API setup and permissions |
| `docs/architecture/instagram-implementation-v1.md` | Implementation plan and phases |
| `docs/architecture/instagram-ingestion-field-spec-v1.md` | Field-level schema spec |
