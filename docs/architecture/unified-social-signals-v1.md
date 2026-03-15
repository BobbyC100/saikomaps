---
doc_id: ARCH-UNIFIED-SOCIAL-V1
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: '2026-03-14'
last_updated: '2026-03-14'
project_id: SAIKO
systems:
  - social-signals
  - enrichment-pipeline
  - fields-v2
  - coverage-operations
supersedes:
  - instagram_accounts table (migration 20260313000000)
  - instagram_media table (migration 20260313000000)
  - instagram_insight_snapshots table (migration 20260313000000)
related_docs:
  - docs/architecture/social-fields-spec-v1.md
  - docs/architecture/instagram-api-integration-v1.md
  - docs/architecture/instagram-implementation-v1.md
  - docs/architecture/identity-scoring-v1.md
  - docs/system/coverage-tier2-visit-facts-contract-v1.md
category: engineering
tags: [social, signals, pipeline, enrichment]
source: repo
summary: >-
  Unified social signals schema replacing platform-specific tables with three
  platform-agnostic tables (social_accounts, social_content, social_metric_snapshots)
  supporting Instagram, TikTok, and YouTube through a single ingestion and
  signal extraction layer.
---

# Unified Social Signals — Architecture Specification

## 1. Problem

The current schema has three Instagram-specific tables (`instagram_accounts`,
`instagram_media`, `instagram_insight_snapshots`). TikTok is wired at the
entity-handle level but has no ingestion tables. Adding TikTok and YouTube as
parallel pipelines would create 9 platform-specific tables with duplicated
ingestion logic, signal extraction code, and operational tooling.

## 2. Decision

Replace the three Instagram tables (currently empty — never populated at scale)
with three **platform-agnostic** tables that support any social platform through
a `platform` discriminator column.

## 3. Platforms

| Platform   | Status        | Account model        | Content model          |
|------------|---------------|----------------------|------------------------|
| instagram  | Build now     | Business/Creator     | IMAGE, VIDEO, CAROUSEL |
| tiktok     | Build now     | Creator              | VIDEO                  |
| youtube    | Build now     | Channel              | VIDEO                  |
| facebook   | Schema-ready  | Business Page        | POST, VIDEO, EVENT     |
| x          | Schema-ready  | Profile              | POST                   |

`platform` is `TEXT` (not enum) so new platforms require no migration.

## 4. Schema

### 4.1 `social_accounts`

Replaces `instagram_accounts`. One row per merchant social account.

```sql
CREATE TABLE "social_accounts" (
  "id"                       TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "entity_id"                TEXT        NOT NULL,
  "platform"                 TEXT        NOT NULL,    -- instagram | tiktok | youtube
  "platform_user_id"         TEXT        NOT NULL,    -- IG user ID, TikTok user ID, YT channel ID
  "username"                 TEXT        NOT NULL,    -- handle / channel name
  "display_name"             TEXT,                    -- human-readable name
  "account_type"             TEXT,                    -- BUSINESS | CREATOR | PERSONAL | CHANNEL
  "bio"                      TEXT,
  "profile_url"              TEXT,                    -- canonical profile URL
  "follower_count"           INTEGER,
  "following_count"          INTEGER,
  "media_count"              INTEGER,                 -- posts (IG), videos (TT/YT)
  "verified"                 BOOLEAN     DEFAULT false,
  "last_fetched_at"          TIMESTAMPTZ,
  "last_successful_fetch_at" TIMESTAMPTZ,
  "source_status"            TEXT        NOT NULL DEFAULT 'active', -- active | revoked | error | rate_limited
  "platform_metadata"        JSONB,                  -- platform-specific fields (see 4.1.1)
  "raw_payload"              JSONB,
  "created_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "social_accounts_platform_user_key" UNIQUE ("platform", "platform_user_id"),
  CONSTRAINT "social_accounts_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "social_accounts_entity_id_idx" ON "social_accounts" ("entity_id");
CREATE INDEX "social_accounts_platform_idx" ON "social_accounts" ("platform");
CREATE INDEX "social_accounts_username_idx" ON "social_accounts" ("platform", "username");
```

#### 4.1.1 `platform_metadata` by platform

| Platform  | Fields in `platform_metadata`                                |
|-----------|--------------------------------------------------------------|
| instagram | `{ account_type_detail, ig_id, profile_picture_url }`        |
| tiktok    | `{ heart_count, digg_count, region }`                        |
| youtube   | `{ channel_id, subscriber_count, custom_url, country }`      |

These are fields that don't generalize across platforms. Everything else is
in the flat columns.

### 4.2 `social_content`

Replaces `instagram_media`. One row per post/video/media object.

```sql
CREATE TABLE "social_content" (
  "id"                  TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "platform"            TEXT        NOT NULL,
  "platform_content_id" TEXT        NOT NULL,    -- IG media ID, TT video ID, YT video ID
  "platform_user_id"    TEXT        NOT NULL,    -- FK-like ref to social_accounts
  "content_type"        TEXT        NOT NULL,    -- IMAGE | VIDEO | CAROUSEL_ALBUM | SHORT
  "content_url"         TEXT,                    -- CDN URL (may expire)
  "thumbnail_url"       TEXT,
  "permalink"           TEXT        NOT NULL,    -- permanent platform URL
  "caption"             TEXT,
  "hashtags"            TEXT[],                  -- extracted from caption / API
  "mentions"            TEXT[],                  -- @mentions in caption
  "duration_seconds"    INTEGER,                 -- null for images
  "posted_at"           TIMESTAMPTZ NOT NULL,    -- original post time (immutable)
  "fetched_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "platform_metadata"   JSONB,                  -- platform-specific fields (see 4.2.1)
  "raw_payload"         JSONB,

  CONSTRAINT "social_content_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "social_content_platform_content_key" UNIQUE ("platform", "platform_content_id")
);

CREATE INDEX "social_content_platform_user_idx"
  ON "social_content" ("platform", "platform_user_id");
CREATE INDEX "social_content_posted_at_idx"
  ON "social_content" ("posted_at");
CREATE INDEX "social_content_user_posted_idx"
  ON "social_content" ("platform_user_id", "posted_at");
CREATE INDEX "social_content_hashtags_idx"
  ON "social_content" USING GIN ("hashtags");
```

#### 4.2.1 `platform_metadata` by platform

| Platform  | Fields in `platform_metadata`                                |
|-----------|--------------------------------------------------------------|
| instagram | `{ carousel_children, ig_media_type, is_shared_to_feed }`    |
| tiktok    | `{ audio_id, audio_name, is_duet, is_stitch, effect_ids }`  |
| youtube   | `{ category_id, tags, definition, license, live_content }`   |

### 4.3 `social_metric_snapshots`

Replaces `instagram_insight_snapshots`. Append-only metric observations.

```sql
CREATE TABLE "social_metric_snapshots" (
  "id"           TEXT           NOT NULL DEFAULT gen_random_uuid()::text,
  "platform"     TEXT           NOT NULL,
  "subject_type" TEXT           NOT NULL,    -- account | content
  "subject_id"   TEXT           NOT NULL,    -- platform_user_id or platform_content_id
  "metric_name"  TEXT           NOT NULL,    -- see 4.3.1
  "metric_value" DECIMAL(12,2)  NOT NULL,
  "observed_at"  TIMESTAMPTZ    NOT NULL DEFAULT now(),
  "window_label" TEXT,                       -- day | week | days_28 | lifetime | snapshot
  "raw_payload"  JSONB,

  CONSTRAINT "social_metric_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "social_metric_snapshots_subject_idx"
  ON "social_metric_snapshots" ("platform", "subject_type", "subject_id");
CREATE INDEX "social_metric_snapshots_timeseries_idx"
  ON "social_metric_snapshots" ("subject_id", "metric_name", "observed_at");
CREATE INDEX "social_metric_snapshots_observed_at_idx"
  ON "social_metric_snapshots" ("observed_at");
```

#### 4.3.1 Metric names by platform

| Metric name       | Applies to       | Subject type | Platforms         |
|--------------------|-----------------|--------------|-------------------|
| `followers`        | account          | account      | all               |
| `media_count`      | account          | account      | all               |
| `impressions`      | account or post  | both         | instagram         |
| `reach`            | account or post  | both         | instagram         |
| `engagement`       | account or post  | both         | instagram         |
| `likes`            | post/video       | content      | all               |
| `comments`         | post/video       | content      | all               |
| `shares`           | post/video       | content      | tiktok, youtube   |
| `views`            | post/video       | content      | tiktok, youtube   |
| `saves`            | post             | content      | instagram         |
| `watch_time`       | video            | content      | youtube           |
| `average_view_dur` | video            | content      | youtube           |

Metric vocabulary is open — new names added without migration.

## 5. Migration Strategy

The three `instagram_*` tables are **empty** (created in migration
`20260313000000` but never populated at scale). Migration approach:

```
1. CREATE the three new social_* tables
2. DROP the three instagram_* tables
3. Remove instagram_* models from Prisma schema
4. Add social_* models to Prisma schema
5. Update scripts/ingest-instagram.ts to target social_accounts + social_content
```

No data migration needed — tables are empty.

### Prisma models

```prisma
model social_accounts {
  id                       String    @id @default(uuid())
  entity_id                String
  platform                 String
  platform_user_id         String
  username                 String
  display_name             String?
  account_type             String?
  bio                      String?
  profile_url              String?
  follower_count           Int?
  following_count          Int?
  media_count              Int?
  verified                 Boolean   @default(false)
  last_fetched_at          DateTime?
  last_successful_fetch_at DateTime?
  source_status            String    @default("active")
  platform_metadata        Json?
  raw_payload              Json?
  created_at               DateTime  @default(now())
  updated_at               DateTime  @default(now()) @updatedAt

  entity  entities          @relation(fields: [entity_id], references: [id], onDelete: Cascade)
  content social_content[]

  @@unique([platform, platform_user_id])
  @@index([entity_id])
  @@index([platform])
  @@index([platform, username])
  @@map("social_accounts")
}

model social_content {
  id                  String   @id @default(uuid())
  platform            String
  platform_content_id String
  platform_user_id    String
  content_type        String
  content_url         String?
  thumbnail_url       String?
  permalink           String
  caption             String?
  hashtags            String[]
  mentions            String[]
  duration_seconds    Int?
  posted_at           DateTime
  fetched_at          DateTime @default(now())
  platform_metadata   Json?
  raw_payload         Json?

  account social_accounts @relation(fields: [platform, platform_user_id], references: [platform, platform_user_id], onDelete: Cascade)

  @@unique([platform, platform_content_id])
  @@index([platform, platform_user_id])
  @@index([posted_at])
  @@index([platform_user_id, posted_at])
  @@map("social_content")
}

model social_metric_snapshots {
  id           String   @id @default(uuid())
  platform     String
  subject_type String
  subject_id   String
  metric_name  String
  metric_value Decimal  @db.Decimal(12, 2)
  observed_at  DateTime @default(now())
  window_label String?
  raw_payload  Json?

  @@index([platform, subject_type, subject_id])
  @@index([subject_id, metric_name, observed_at])
  @@index([observed_at])
  @@map("social_metric_snapshots")
}
```

## 6. Ingestion Architecture

### 6.1 Unified ingestion script

Replace `scripts/ingest-instagram.ts` with a platform-dispatching ingester:

```
scripts/ingest-social.ts
  --platform=instagram|tiktok|youtube
  --username=<handle>
  --entity-id=<id>
  --batch                    # all entities with handles for this platform
  --media-limit=200
  --dry-run
```

Internally dispatches to platform-specific fetchers:

```
lib/social/fetchers/
  instagram.ts    — Meta Graph API (existing logic from ingest-instagram.ts)
  tiktok.ts       — TikTok Research API / third-party
  youtube.ts      — YouTube Data API v3
  types.ts        — shared SocialAccountData / SocialContentData interfaces
```

Each fetcher returns a common interface:

```typescript
interface SocialAccountData {
  platform: string;
  platform_user_id: string;
  username: string;
  display_name?: string;
  account_type?: string;
  bio?: string;
  profile_url?: string;
  follower_count?: number;
  following_count?: number;
  media_count?: number;
  verified?: boolean;
  platform_metadata?: Record<string, unknown>;
  raw_payload?: unknown;
}

interface SocialContentItem {
  platform: string;
  platform_content_id: string;
  content_type: string;
  content_url?: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
  hashtags?: string[];
  mentions?: string[];
  duration_seconds?: number;
  posted_at: Date;
  platform_metadata?: Record<string, unknown>;
  raw_payload?: unknown;
}
```

### 6.2 Pipeline stages (per platform)

```
Stage 1 — Account Discovery
  Source: entities.instagram / entities.tiktok / entities.youtube (handle fields)
  Action: Create social_accounts row if not exists
  Idempotent: skip if social_accounts row exists and source_status = 'active'

Stage 2 — Account Snapshot
  Action: Fetch current profile data, upsert social_accounts
  Append: social_metric_snapshots (followers, media_count)
  Frequency: daily

Stage 3 — Content Harvest
  Action: Fetch recent posts/videos, upsert social_content
  Dedup: (platform, platform_content_id)
  Frequency: daily

Stage 4 — Engagement Snapshot
  Action: For each content item, snapshot current engagement metrics
  Append: social_metric_snapshots (likes, comments, views, shares)
  Frequency: daily (for recent content), weekly (for older content)
```

Each stage is independently rerunnable and idempotent.

## 7. Signal Extraction

Social signals flow into the existing Fields v2 system via `derived_signals`.

### 7.1 Source registry entries

Add to `source_registry`:

| id                | display_name           | source_type | trust_tier |
|-------------------|------------------------|-------------|------------|
| `instagram_api`   | Instagram Graph API    | api         | 2          |
| `tiktok_api`      | TikTok API             | api         | 2          |
| `youtube_api`     | YouTube Data API       | api         | 2          |

### 7.2 Derived signal types

| Signal key                 | Input                          | Description                        |
|----------------------------|--------------------------------|------------------------------------|
| `social_posting_cadence`   | content posted_at timestamps   | Posts per week, trend direction     |
| `social_engagement_rate`   | metrics / follower_count       | Engagement as % of followers       |
| `social_momentum`          | metric snapshots over time     | Velocity of engagement growth      |
| `social_content_themes`    | captions, hashtags             | Recurring themes (AI extraction)   |
| `social_viral_content`     | views >> median                | Outlier content detection          |
| `social_trending_audio`    | TikTok audio_id frequency      | Trending audio participation       |
| `social_place_mentions`    | captions, hashtags, mentions   | Third-party content about place    |

### 7.3 Signal extraction script

```
scripts/extract-social-signals.ts
  --entity-id=<id>
  --platform=instagram|tiktok|youtube|all
  --signal=<signal_key>       # optional: run single signal
  --dry-run
```

Outputs to `derived_signals` table with `signal_version` for reproducibility.

## 8. Entity-Level Handle Fields

The existing pattern of nullable TEXT columns on `entities` continues:

| Column     | Status     |
|------------|------------|
| `instagram`| exists     |
| `tiktok`   | exists     |
| `youtube`  | **add**    |

`youtube` follows the same conventions:
- Store handle/channel name only (no URL)
- Sentinel `NONE` = confirmed no channel
- `NULL` = unknown
- Validation: `/^[a-zA-Z0-9._-]+$/` (YouTube allows hyphens)

### Integration points for `youtube`

Same wiring as Instagram/TikTok (see social-fields-spec-v1.md):

1. Add `youtube` column to `entities` and `canonical_entity_state`
2. Add to `ANCHOR_WEIGHTS` in `lib/identity-enrichment.ts` (weight: 1)
3. Add `missing_youtube` rule to the current coverage audit contract (severity: LOW, non-blocking)
4. Add `youtube` mode to `discover-social` route
5. Add to current coverage/admin surfaces where social gaps are triaged
6. Add `youtube` attribute to `attribute_registry`
7. Add claim mapping in `lib/fields-v2/write-claim.ts`

YouTube weight = 1 (lower than IG/TT because fewer restaurants have channels).

## 9. Discovery Integration

Update `/api/admin/tools/discover-social/route.ts`:

```typescript
// Existing modes: 'instagram' | 'tiktok' | 'website' | 'both'
// New modes:      'youtube' | 'all_social'

// 'all_social' runs instagram + tiktok + youtube discovery in one call
```

YouTube URL extraction patterns:
```
youtube.com/channel/{id}
youtube.com/c/{custom_name}
youtube.com/@{handle}
```

## 10. Confidence & Freshness

### Time decay

Social metrics are time-sensitive. The `social_metric_snapshots` table records
`observed_at` for every metric. Signal extraction applies decay:

```
effective_weight = raw_weight * decay_factor(days_since_observed)
```

Decay curves:
- **TikTok:** aggressive (half-life ~7 days) — trends move fast
- **Instagram:** moderate (half-life ~30 days) — more stable
- **YouTube:** gentle (half-life ~90 days) — evergreen content

### Freshness signals

| Signal                    | Source                              |
|---------------------------|-------------------------------------|
| `last_social_activity`    | MAX(posted_at) across all platforms |
| `social_active_platforms` | count of platforms with post < 30d  |
| `social_freshness_score`  | composite recency across platforms  |

## 11. Operational Metrics

Extend the existing coverage surfaces (`/coverage`, `/admin/coverage`):

| Metric                    | Query                                          |
|---------------------------|-------------------------------------------------|
| `social_accounts_total`   | COUNT(*) from social_accounts                   |
| `social_accounts_active`  | WHERE source_status = 'active'                  |
| `social_content_total`    | COUNT(*) from social_content                    |
| `social_content_30d`      | WHERE posted_at > now() - 30d                   |
| `social_snapshots_today`  | WHERE observed_at::date = today                 |
| `social_signals_total`    | COUNT(*) from derived_signals WHERE signal_key LIKE 'social_%' |
| Breakdown by platform     | GROUP BY platform                               |

## 12. Files Changed

### New files
- `lib/social/fetchers/types.ts` — shared interfaces
- `lib/social/fetchers/instagram.ts` — IG Graph API fetcher
- `lib/social/fetchers/tiktok.ts` — TikTok API fetcher
- `lib/social/fetchers/youtube.ts` — YouTube Data API fetcher
- `scripts/ingest-social.ts` — unified ingestion script
- `scripts/extract-social-signals.ts` — signal extraction
- `prisma/migrations/YYYYMMDD_unified_social_signals/migration.sql`

### Modified files
- `prisma/schema.prisma` — drop instagram_* models, add social_* models
- `entities` model — add `youtube` column
- `canonical_entity_state` — add `youtube` column
- `lib/identity-enrichment.ts` — add `youtube` to ANCHOR_WEIGHTS
- `scripts/coverage-run.ts` — add `missing_youtube` coverage detection
- `lib/fields-v2/write-claim.ts` — add `youtube` claim mapping
- `lib/data/transformers.ts` — normalize YouTube handles
- `app/api/admin/tools/discover-social/route.ts` — add `youtube` + `all_social` modes
- `app/coverage/CoverageContent.tsx` — coverage summary surface updates
- `scripts/ingest-instagram.ts` — **delete** (replaced by ingest-social.ts)

### Unchanged
- `entities.instagram` column — stays as-is
- `entities.tiktok` column — stays as-is
- All existing handle discovery, validation, sentinel logic — stays as-is

## 13. Implementation Order

```
Phase 1 — Schema (this PR)
  1. Write migration: create social_* tables, drop instagram_* tables
  2. Update Prisma schema
  3. Add youtube column to entities + canonical_entity_state
  4. Add youtube to attribute_registry, source_registry entries
  5. Wire youtube into identity scoring, issue scanner, write-claim, discover-social

Phase 2 — Instagram parity
  6. Build lib/social/fetchers/types.ts + instagram.ts
  7. Build scripts/ingest-social.ts (Instagram mode)
  8. Delete scripts/ingest-instagram.ts
  9. Test end-to-end: discovery → account sync → content harvest → metrics

Phase 3 — TikTok ingestion
  10. Build lib/social/fetchers/tiktok.ts
  11. Evaluate API options (official Research API, third-party, scraping)
  12. Test with known entities (tacos1986, etc.)

Phase 4 — YouTube ingestion
  13. Build lib/social/fetchers/youtube.ts (YouTube Data API v3)
  14. YouTube handle discovery integration
  15. Test with known entities

Phase 5 — Signal extraction
  16. Build scripts/extract-social-signals.ts
  17. Implement signal types from §7.2
  18. Wire into enrichment pipeline (new Stage 8 or sub-stage of Stage 5)
```

## 14. Risks

| Risk                              | Impact | Mitigation                                    |
|-----------------------------------|--------|-----------------------------------------------|
| TikTok API restrictions           | High   | Third-party API fallback, scraping pipeline   |
| YouTube quota limits (10K/day)    | Medium | Batch scheduling, quota monitoring            |
| Instagram app still in dev mode   | Medium | Meta app review (already known blocker)       |
| Platform-specific schema drift    | Low    | `platform_metadata` JSONB absorbs differences |
| Signal extraction complexity      | Medium | Start with simple metrics, add AI extraction later |
