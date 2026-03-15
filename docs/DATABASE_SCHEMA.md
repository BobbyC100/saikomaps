---
doc_id: SAIKO-DATABASE-SCHEMA
doc_type: reference
status: active
owner: Bobby Ciccaglione
created: '2026-03-10'
last_updated: '2026-03-15'
project_id: SAIKO
systems:
  - database
  - entities
summary: >-
  Detailed database schema reference for Saiko Maps: all models (User, List,
  Location/legacy, Place/canonical, MapPlace, ViewerBookmark, ActivitySpot,
  ImportJob), enums, field definitions, indexes, relations, entity relationship
  diagrams, and key data flows (map creation, viewing, enrichment).
related_docs:
  - docs/APP_OVERVIEW.md
  - docs/MIGRATION_GUIDE.md
  - docs/architecture/system_contract.md
  - docs/DATA_SYNC_RUNBOOK.md
category: engineering
tags: [schema, entities]
source: repo
---
# Saiko Maps - Database Schema

## Core Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ECOSYSTEM                           │
└─────────────────────────────────────────────────────────────────┘

                            ┌──────────┐
                            │   User   │
                            │   (id)   │
                            └────┬─────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
             ┌──────▼──────┐ ┌──▼──────┐ ┌──▼────────┐
             │    List     │ │ Viewer  │ │  Import   │
             │   (maps)    │ │Bookmark │ │   Job     │
             └──────┬──────┘ └────┬────┘ └───────────┘
                    │             │
                    │             │
┌───────────────────┴─────────────┴──────────────────────────────┐
│                      PLACE ECOSYSTEM                            │
└─────────────────────────────────────────────────────────────────┘

         ┌─────────────────┐
         │      List       │
         │  (Maps/Guides)  │
         └────────┬────────┘
                  │
         ┌────────┴─────────────────┐
         │                          │
    ┌────▼─────┐           ┌────────▼────────┐
    │ Location │           │    MapPlace     │
    │ (legacy) │           │  (join table)   │
    └──────────┘           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │     Place       │
                           │  (canonical)    │
                           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │ ViewerBookmark  │
                           └─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      ACTIVITY LAYERS                             │
└─────────────────────────────────────────────────────────────────┘

                        ┌──────────────┐
                        │ ActivitySpot │
                        │ (skate/surf) │
                        └──────────────┘
```

## Detailed Schema Breakdown

### **User** (`users`)
**Purpose:** Creator accounts, authentication

**Fields:**
- `id` (UUID, PK)
- `email` (unique)
- `name`
- `passwordHash`
- `avatarUrl`
- `subscriptionTier` (free | personal | business)
- `createdAt`, `updatedAt`

**Relations:**
- → **List** (1:many) - Created maps
- → **ViewerBookmark** (1:many) - Saved places
- → **ImportJob** (1:many) - Import operations

---

### **List** (`lists`)
**Purpose:** Maps/Guides created by users (published as Field Notes)

**Content Fields:**
- `id` (UUID, PK)
- `userId` (FK → User)
- `title`, `subtitle`, `description`, `slug` (unique)
- `introText`
- `descriptionSource` (ai | edited | manual)

**Creation Context:**
- `functionType` - Purpose of the map
- `functionContext` - Additional context
- `scopeGeography` - Geographic scope
- `scopePlaceTypes[]` - Types of places included
- `scopeExclusions[]` - Types excluded
- `organizingLogic` (enum: TIME_BASED | NEIGHBORHOOD_BASED | ROUTE_BASED | PURPOSE_BASED | LAYERED)
- `organizingLogicNote` - Notes on organization
- `notes` - Internal notes
- `status` (enum: DRAFT | READY | PUBLISHED | ARCHIVED)
- `publishedAt`

**Design:**
- `templateType` (currently only "field-notes")
- `coverImageUrl`
- `primaryColor`, `secondaryColor`

**Access Control:**
- `accessLevel` (public | password | private)
- `passwordHash` - For password-protected maps
- `allowedEmails[]` - For private maps

**Metadata:**
- `published` (boolean)
- `viewCount`
- `createdAt`, `updatedAt`

**Relations:**
- ← **User** (many:1)
- → **Location** (1:many) - Legacy locations
- → **MapPlace** (1:many) - Modern place associations
- → **ImportJob** (1:many)

**Indexes:**
- `userId`, `slug`, `published`, `status`

---

### **Location** (`locations`) [LEGACY - Being Phased Out]
**Purpose:** Original location model (before Place/MapPlace refactor)

**Google Places Data:**
- `id` (UUID, PK)
- `listId` (FK → List)
- `googlePlaceId`
- `name`, `address`
- `latitude`, `longitude` (Decimal 10,8 / 11,8)
- `phone`, `website`, `instagram`
- `hours` (JSON)
- `description`
- `googlePhotos` (JSON)
- `googleTypes[]`
- `priceLevel` (0-4)
- `neighborhood`

**User-Added Data:**
- `userPhotos[]` - Uploaded image URLs
- `userNote` - Curator notes
- `category` - Food, Drinks, Coffee, etc.
- `descriptor` - Editorial description (max 120 chars)

**Organization:**
- `orderIndex` - Position in list

**Cache Management:**
- `placesDataCachedAt` - When Google data was last fetched

**Relations:**
- ← **List** (many:1)

**Indexes:**
- `listId`, `googlePlaceId`, `[listId, orderIndex]`, `[listId, category]`

---

### **Entity** (`entities`) [CANONICAL ENTITY]
**Purpose:** Canonical place entity with full Google + AI enrichment
> **Note:** Table was renamed from `places` to `entities` via migration `20260228100000_places_to_entities`. Prisma model name is `entities`.

**Core Data:**
- `id` (UUID, PK)
- `slug` (unique)
- `googlePlaceId` (unique)
- `name`, `address`
- `latitude`, `longitude` (Decimal 10,8 / 11,8)
- `phone`, `website`, `instagram`
- `tiktok` — **DB column exists but NOT in Prisma schema** (use `$executeRaw` to write)
- `hours` (JSON)
- `description`

**Google Places Data:**
- `googlePhotos` (JSON) - Array of photo references
- `googleTypes[]` - Raw Google Places types
- `priceLevel` (0-4)
- `neighborhood` - Reverse geocoded
- `cuisineType`
- `category`
- `sources` (JSON) - Editorial sources

**Voice Engine v1.1 - Taglines:**
- `tagline` - Selected tagline
- `taglineCandidates[]` - Alternative options generated
- `taglinePattern` (food | neighborhood | energy | authority)
- `taglineGenerated` - Timestamp
- `taglineSignals` (JSON) - Snapshot of merchant signals at generation

**Voice Engine v1.1 - Ad Units:**
- `adUnitType` (A | B | D | E)
- `adUnitOverride` (boolean) - Manual override flag

**Voice Engine v1.1 - Pull Quotes:**
- `pullQuote` - Quote text
- `pullQuoteSource` - Source name
- `pullQuoteAuthor` - Author name
- `pullQuoteUrl` - Source URL
- `pullQuoteType` (editorial | owner | self)

**Bento Grid Enrichment:**
- ~~`vibeTags[]`~~ - **Deprecated** (column removed from entities; language signals in `golden_records.identity_signals.language_signals`)
- `tips[]` - Helpful visitor tips: ["Go early for a seat", "Cash only"]

**Cache Management:**
- `placesDataCachedAt` - When Google data was last fetched

**Metadata:**
- `createdAt`, `updatedAt`

**Relations:**
- → **MapPlace** (1:many) - Appears on multiple maps
- → **ViewerBookmark** (1:many) - Saved by viewers

**Indexes:**
- `googlePlaceId`, `category`, `neighborhood`

---

### **MapPlace** (`map_places`) [JOIN TABLE]
**Purpose:** Many-to-many relationship between Place and List (Map)
**Why:** Same place can appear on multiple maps with different curator context

**Fields:**
- `id` (UUID, PK)
- `mapId` (FK → List)
- `placeId` (FK → Place)

**Curator-Specific Data (per-map):**
- `descriptor` (VARCHAR 120) - Map-specific editorial description
- `userNote` - Curator's private notes
- `userPhotos[]` - Map-specific photos
- `orderIndex` - Position in this specific map

**Metadata:**
- `createdAt`, `updatedAt`

**Relations:**
- ← **List** (many:1)
- ← **Place** (many:1)

**Unique Constraint:**
- `[mapId, placeId]` - A place can only appear once per map

**Indexes:**
- `mapId`, `placeId`, `[mapId, orderIndex]`

---

### **ViewerBookmark** (`viewer_bookmarks`)
**Purpose:** Users saving places for later / personal collections

**Fields:**
- `id` (UUID, PK)
- `viewerUserId` (FK → User, nullable)
- `placeId` (FK → Place)
- `visited` (boolean)
- `personalNote` - Private user notes
- `createdAt`, `updatedAt`

**Relations:**
- ← **User** (many:1)
- ← **Place** (many:1)

**Unique Constraint:**
- `[viewerUserId, placeId]` - Can't bookmark same place twice

**Indexes:**
- `viewerUserId`, `placeId`

---

### **ActivitySpot** (`activity_spots`)
**Purpose:** Skateparks, surf breaks, etc. (separate from food/drink places)

**Location:**
- `id` (CUID, PK)
- `name`, `slug` (unique)
- `latitude`, `longitude` (Float)
- `city`, `region`, `country`

**Type & Classification:**
- `layerType` (enum: SKATE | SURF)
- `spotType` - Skate: park/street/plaza | Surf: beach/reef/point
- `tags[]` - Skate: ["ledge", "rail", "bowl"] | Surf: ["hollow", "mellow"]

**Skate-Specific:**
- `surface` (smooth | rough | mixed)
- `skillLevel` (beginner | intermediate | advanced | all)

**Surf-Specific:**
- `exposure` - Primary swell direction
- `seasonality` - Best season info

**Editorial:**
- `description`
- `isPublic` (boolean)

**Source Tracking:**
- `source` (enum: OSM | CITY_DATA | EDITORIAL | COMMUNITY)
- `sourceId` - External ID (OSM node, city dataset ID)
- `sourceUrl`

**Status:**
- `verified` (boolean)
- `enabled` (boolean)
- `createdAt`, `updatedAt`

**Indexes:**
- `[layerType, city]`, `[layerType, latitude, longitude]`, `[source, sourceId]`

---

### **ImportJob** (`import_jobs`)
**Purpose:** Track bulk place import operations

**Fields:**
- `id` (UUID, PK)
- `userId` (FK → User)
- `listId` (FK → List, nullable)
- `status` (processing | completed | failed)
- `totalLocations`
- `processedLocations`
- `failedLocations`
- `errorLog` (JSON)
- `createdAt`, `completedAt`

**Relations:**
- ← **User** (many:1)
- ← **List** (many:1)

**Indexes:**
- `userId`, `status`

---

## Enums

### OrganizingLogic
```typescript
enum OrganizingLogic {
  TIME_BASED        // Chronological order (morning → night)
  NEIGHBORHOOD_BASED // Geographic clustering
  ROUTE_BASED       // Walking/driving route
  PURPOSE_BASED     // By activity type
  LAYERED           // Multiple organizing principles
}
```

### MapStatus
```typescript
enum MapStatus {
  DRAFT      // Being created
  READY      // Ready to publish
  PUBLISHED  // Live and public
  ARCHIVED   // Hidden from public
}
```

### LayerType
```typescript
enum LayerType {
  SKATE  // Skateboarding spots
  SURF   // Surf breaks
}
```

### SpotSource
```typescript
enum SpotSource {
  OSM          // OpenStreetMap
  CITY_DATA    // Official city datasets
  EDITORIAL    // Curated by team
  COMMUNITY    // User-contributed
}
```

---

## Key Data Flows

### 1. Map Creation Flow
```
User creates List
  ↓
Add Places to MapPlace (with descriptor, order)
  ↓
Link to canonical Place entity
  ↓
Backfill Google Places data on Place
  ↓
Generate AI content (Voice Engine) on Place
  ↓
Publish List (status: PUBLISHED)
```

### 2. Public Viewing Flow
```
User visits /map/[slug]
  ↓
Fetch List by slug
  ↓
Get MapPlaces (ordered, with descriptors)
  ↓
Join to Places (with Google + AI data)
  ↓
Render Field Notes template
```

### 3. Place Enrichment Flow
```
Place created with googlePlaceId
  ↓
Backfill script fetches Google Places API
  ↓
Updates: photos, hours, phone, address, types, priceLevel
  ↓
Voice Engine generates: tagline, tips, pullQuote (language signals now in `identity_signals.language_signals` via SceneSense)
  ↓
Place now "enriched" and ready for display
```

---

## Migration Notes

### Location → Place Migration
**Status:** In progress (both models coexist)

**Legacy:** `Location` was tied directly to `List` (1:many)
**New:** `Place` is canonical, `MapPlace` enables many:many

**Benefits:**
- Same place can appear on multiple maps
- Enrichment (Google + AI) done once per place
- Better data consistency
- Separate curator context (MapPlace) from canonical data (Place)

**Next Steps:**
- Migrate remaining Location data to Place/MapPlace
- Update all queries to use Place/MapPlace
- Deprecate Location model

---

## DB Tables & Columns Without Prisma Models

> **IMPORTANT:** These tables/columns exist in the production database but have NO corresponding Prisma model or field. Any code referencing them must use `$queryRaw` / `$executeRaw` instead of the typed Prisma client. Using `db.tableName.method()` will cause TypeScript build failures on Vercel.

### Tables without Prisma models

| Table | Purpose | FK to entities | Notes |
|-------|---------|---------------|-------|
| `entity_issues` | Data quality issues per entity | `entity_id` | Has unique constraint `(entity_id, issue_type)`. JSONB `detail` column. |
| `instagram_accounts` | Instagram account metadata | `entity_id` | Stores `instagram_user_id`, profile data. Will be superseded by `social_accounts` (see unified-social-signals-v1). |

### Columns without Prisma fields

| Table | Column | Type | Notes |
|-------|--------|------|-------|
| `entities` | `tiktok` | TEXT | TikTok handle. Added via DB migration but not in Prisma schema. |

### How to work with these

```typescript
// Reading
const issues = await db.$queryRaw<{ id: string; issue_type: string }[]>`
  SELECT id, issue_type FROM entity_issues WHERE entity_id = ${entityId}
`;

// Writing
await db.$executeRaw`
  UPDATE entities SET tiktok = ${handle} WHERE id = ${entityId}
`;

// Counting
const count = await db.$queryRaw<[{ count: bigint }]>`
  SELECT COUNT(*) as count FROM entity_issues WHERE entity_id = ${entityId}
`.then(r => Number(r[0].count));
```

### Why not just add them to Prisma?

The migration history has a fork between DB-only migrations and local migration files (see `MIGRATION_HISTORY_RECONCILIATION.md`). Running `prisma migrate` is unsafe until the fork is reconciled. Adding models to `schema.prisma` without a matching migration would create further drift.
