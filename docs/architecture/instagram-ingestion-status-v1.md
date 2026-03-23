---
doc_id: ARCH-INSTAGRAM-INGESTION-STATUS-V1
doc_type: architecture
status: active
title: "Instagram Ingestion — Operational Status (V1)"
owner: Bobby Ciccaglione
created: "2026-03-01"
last_updated: "2026-03-22"
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

Instagram batch ingestion is operational. As of 2026-03-18, the system is ingesting account data and recent media for 914 entities with Instagram handles.

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

Up to N rows per account (default 200, current batch uses 10).

| Field | Source |
|---|---|
| media_type | IMAGE / VIDEO / CAROUSEL_ALBUM |
| media_url | CDN URL (**expires** — not permanent) |
| thumbnail_url | For videos |
| permalink | Permanent IG post URL |
| caption | Full post text |
| timestamp | Original post time |
| raw_payload | Full API response preserved |

---

## 3. Known Limitations

### CDN URL expiration

`media_url` and `thumbnail_url` are temporary Instagram CDN links. They expire after an unknown period (hours to days). This means:

- Images cannot be served directly from stored URLs long-term
- A storage strategy is needed before the photo pipeline can use these images on place pages
- Permalinks are permanent but require oEmbed or scraping to display

**Decision pending:** Storage approach (S3/Supabase download, re-fetch on demand, or permalinks-only). Cost implications need research. Target decision date: 2026-03-20.

### Account type requirements

Business Discovery only works for Business and Professional Instagram accounts. Personal accounts return "not found." This affects a small percentage of entities (~3 handles failed in initial testing).

### Bio not fetched

The current Business Discovery fields do not include `biography`. Adding this field would provide place descriptions from the operator's own words — valuable for signal extraction.

---

## 4. Downstream Wiring (Not Yet Built)

Once ingestion completes, the data needs to flow into interpretation layers:

### Priority 1 — Caption signal extraction

Instagram captions are rich text from the operator's own voice. They feed the same extraction pipelines as website text blocks:

- SceneSense lenses (atmosphere, energy, scene signals)
- Cuisine/offering signals
- Events Program detection ("private dining", "catering", "book our space")
- Hours/schedule clues

**Approach:** Register Instagram as a `merchant_surface` source type so existing extraction code reads caption text blocks without a separate pipeline.

### Priority 2 — Photo candidate pipeline

Instagram images are primary photo candidates for place pages. Requires:

1. Resolve CDN URL expiration (storage decision)
2. Score images for quality/relevance
3. Rank against other photo sources (Google Photos, website images)
4. Surface winners through place page contract

### Priority 3 — Profile signals

| Signal | Source | Use |
|---|---|---|
| Follower count | `instagram_accounts.raw_payload` | Popularity proxy, confidence boost |
| Post frequency | Derived from `instagram_media.timestamp` | Activity/freshness indicator |
| Media count | `instagram_accounts.media_count` | Content volume signal |
| Account type | `instagram_accounts.account_type` | Business sophistication signal |

### Priority 4 — Temporal signals

Not yet in schema. Would require `instagram_temporal_signals` table for:
- Closure/reopening events detected from captions
- Seasonal patterns
- Event announcements

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
