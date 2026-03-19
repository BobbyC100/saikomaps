---
doc_id: ARCHITECTURE-INSTAGRAM-INGESTION-V1
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: '2026-03-13'
last_updated: '2026-03-17'
project_id: SAIKO
summary: >-
  Instagram ingestion schema — 3 tables, field definitions, sync rules.
  Engineering handoff for migration + Prisma models.
---
# Instagram Ingestion — Field Spec v1

## Scope

Ingest Instagram as a merchant-authored data source. Store account identity,
media records, captions, activity/freshness signals, and insights snapshots.

**Excluded from v1:** like_count, comments_count, location metadata.

---

## Tables

### 1. `instagram_accounts`

One row per connected Instagram account. Mutable — overwrite on each fetch.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PK, default uuid | Internal ID |
| `entity_id` | TEXT | FK → entities.id CASCADE, NOT NULL | Links account to entity |
| `instagram_user_id` | TEXT | UNIQUE, NOT NULL | IG API user ID |
| `username` | TEXT | NOT NULL | Handle (no @) |
| `account_type` | TEXT | | BUSINESS, CREATOR, PERSONAL |
| `media_count` | INT | | From API |
| `canonical_instagram_url` | TEXT | | `https://instagram.com/{username}` |
| `last_fetched_at` | TIMESTAMPTZ | | Last fetch attempt |
| `last_successful_fetch_at` | TIMESTAMPTZ | | Last 2xx fetch |
| `source_status` | TEXT | NOT NULL, default 'active' | active, revoked, error |
| `raw_payload` | JSONB | | Full API response |
| `created_at` | TIMESTAMPTZ | default now() | |
| `updated_at` | TIMESTAMPTZ | default now() | |

**Indexes:**
- `entity_id`
- `instagram_user_id` (unique)
- `username`

**Derived (compute in app, not stored):**
- `latest_post_at` — max(instagram_media.timestamp) for this account
- `posting_cadence_30d` / `posting_cadence_90d` — count of posts in window
- `is_active_recently` — post within last 30 days

---

### 2. `instagram_media`

One row per post/media object. Upsert by `instagram_media_id`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PK, default uuid | Internal ID |
| `instagram_media_id` | TEXT | UNIQUE, NOT NULL | IG API media ID |
| `instagram_user_id` | TEXT | NOT NULL | FK-like ref to account |
| `media_type` | TEXT | NOT NULL | IMAGE, VIDEO, CAROUSEL_ALBUM |
| `media_url` | TEXT | | CDN URL (expires) |
| `thumbnail_url` | TEXT | | For VIDEO type |
| `permalink` | TEXT | NOT NULL | Permanent IG URL |
| `caption` | TEXT | | Full caption text |
| `timestamp` | TIMESTAMPTZ | NOT NULL | Original post time (immutable) |
| `fetched_at` | TIMESTAMPTZ | NOT NULL, default now() | When we fetched it |
| `raw_payload` | JSONB | | Full API response |

**Carousel fields (stored in raw_payload):**
- `children.data[].id` — child media IDs
- `children.data[].media_type`, `media_url` — child details

**Indexes:**
- `instagram_media_id` (unique)
- `instagram_user_id`
- `timestamp`
- `(instagram_user_id, timestamp)` — activity queries

**Derived (compute in app, not stored):**
- `caption_present` — caption IS NOT NULL
- `caption_length` — char_length(caption)
- `posted_day_of_week` / `posted_hour_local` — from timestamp
- `is_recent_post` — timestamp within 30 days

---

### 3. `instagram_insight_snapshots`

Append-only. One row per metric observation. Never update or overwrite.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PK, default uuid | Internal ID |
| `subject_type` | TEXT | NOT NULL | 'account' or 'media' |
| `subject_id` | TEXT | NOT NULL | instagram_user_id or instagram_media_id |
| `metric_name` | TEXT | NOT NULL | impressions, reach, engagement |
| `metric_value` | DECIMAL(12,2) | NOT NULL | |
| `observed_at` | TIMESTAMPTZ | NOT NULL, default now() | When snapshot taken |
| `window_label` | TEXT | | 'day', 'week', 'days_28', 'lifetime' |
| `raw_payload` | JSONB | | Full API response for this metric |

**Indexes:**
- `(subject_type, subject_id)`
- `(subject_id, metric_name, observed_at)` — time series
- `observed_at`

---

## Sync Rules

### Accounts
- **Overwrite** mutable fields on each fetch (username, media_count, account_type, source_status, raw_payload)
- **Preserve** created_at
- **Update** last_fetched_at on every attempt; last_successful_fetch_at on success only

### Media
- **Upsert** by `instagram_media_id`
- **Never overwrite** `timestamp` (original post time is immutable)
- **Refresh** mutable fields: media_url, thumbnail_url, caption, raw_payload, fetched_at

### Insights
- **Append only** — insert new row for each observation
- **Never update** existing rows
- Dedup logic: skip insert if (subject_id, metric_name, observed_at, window_label) already exists

---

## Source Registry Entry

Add to `source_registry` (Fields v2):

```
id:              'instagram_api'
display_name:    'Instagram API'
source_type:     SOCIAL
trust_tier:      3
requires_human:  false
base_domain:     'instagram.com'
is_active:       true
```

---

## Entity Linkage

Instagram accounts attach to **entities** via `entity_id` FK.

This is consistent with merchant_surfaces, merchant_surface_scans, and all
Fields v2 tables. The account is a source record, not an identity record.

---

## Build Sequence

1. Migration: create 3 tables + indexes
2. Prisma schema: add 3 models
3. Seed: add `instagram_api` to source_registry
4. Ingest script: account + media fetch (stages 1–2)
5. Ingest script: insights fetch (stage 3)
6. Downstream: caption cue extraction (on top of media table)
7. Downstream: visual analysis (future)
