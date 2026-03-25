---
doc_id: SAIKO-DATABASE-SCHEMA
doc_type: reference
status: active
owner: Bobby Ciccaglione
created: '2026-03-10'
last_updated: '2026-03-24'
project_id: SAIKO
systems:
  - database
summary: 'Schema reference for the Saiko PostgreSQL database. Covers core entity tables, enrichment/signal tables, map/list tables, and Fields v2 canonical layer.'
---
# Saiko — Database Schema

## Overview

The database has 50+ models organized across several domains:

| Domain | Key tables | Purpose |
|--------|-----------|---------|
| **Entity core** | `entities`, `canonical_entity_state` | Canonical place identity and Fields v2 state |
| **Enrichment signals** | `derived_signals`, `interpretation_cache`, `energy_scores`, `place_tag_scores` | AI-extracted and computed signals |
| **Coverage** | `coverage_sources`, `coverage_source_extractions` | Editorial article sourcing and extraction |
| **Instagram** | `instagram_accounts`, `instagram_media` | Social media photo ingestion |
| **Merchant surfaces** | `merchant_surfaces`, `merchant_surface_artifacts`, `merchant_signals` | Website enrichment pipeline |
| **Maps/Lists** | `lists`, `map_places` | User-created curated maps |
| **Users** | `users`, `viewer_bookmarks`, `saved_maps` | Authentication and user data |
| **People/Actors** | `people`, `person_places`, `Actor`, `EntityActorRelationship` | Chef/owner/curator attribution |
| **Resolution** | `raw_records`, `resolution_links`, `gpid_resolution_queue` | Entity resolution and GPID matching |
| **Issues** | `entity_issues`, `review_queue` | Data quality tracking |

---

## Core Entity Tables

### **entities** (canonical place table)

The primary system-of-record table. Every place in Saiko is an entity.

**Identity:**
- `id` (UUID, PK), `slug` (unique), `name`, `address`
- `latitude`, `longitude` (Decimal)
- `googlePlaceId` (unique nullable)
- `phone`, `website`, `instagram`, `tiktok`

**Classification:**
- `primaryVertical` (PrimaryVertical enum — 13 values)
- `category` (string — human-readable fallback)
- `cuisineType` (string — e.g., "Mexican", "Italian")
- `entityType` (string — structural kind: venue, activity, public)
- `neighborhood` (string — reverse geocoded or derived)

**Editorial:**
- `tagline` — AI-generated one-liner
- `description`, `descriptionSource`
- `pullQuote`, `pullQuoteAuthor`, `pullQuoteSource`
- `tips[]` — visitor tips array

**Google Places Data:**
- `googlePhotos` (JSON) — photo references array
- `googleTypes[]` — raw Google Places types
- `priceLevel` (0-4)
- `hours` (JSON)

**State Model (three independent axes):**
- `operatingStatus` (OperatingStatus: OPEN, CLOSED, UNKNOWN)
- `enrichmentStatus` (EnrichmentStatus: CANDIDATE, ENRICHING, ENRICHED, FAILED)
- `publicationStatus` (PublicationStatus: DRAFT, PUBLISHED, ARCHIVED)

**Enrichment Metadata:**
- `lastEnrichedAt`, `placesDataCachedAt`
- `confidence` (JSON), `overallConfidence`

**Indexes:** `slug`, `googlePlaceId`, `category`, `neighborhood`, `primaryVertical`, `status`, `lastEnrichedAt`

---

### **canonical_entity_state** (Fields v2)

The Fields v2 canonical layer. Stores sanctioned (validated) attribute state per entity.

**Fields:**
- `id`, `entityId` (FK → entities, unique)
- `sanctioned_name`, `sanctioned_address`, `sanctioned_phone`, `sanctioned_website`
- `sanctioned_hours`, `sanctioned_instagram`
- `sanctioned_latitude`, `sanctioned_longitude`
- `sanctioned_neighborhood`
- `menu_url`, `reservation_url`, `reservation_provider`
- `about_text`, `about_source_url`
- `updatedAt`

---

## Enrichment & Signal Tables

### **derived_signals**

AI-extracted structured signals per entity. Keyed by `signalKey`.

- `id`, `entityId` (FK → entities)
- `signalKey` — e.g., `identity_signals`, `offering_programs`
- `signalValue` (JSON) — structured extraction output
- `version`, `createdAt`, `updatedAt`

**Common signal keys:**
- `identity_signals` — language signals, vibe words, cultural markers
- `offering_programs` — food_program, wine_program, beer_program, cocktail_program

### **interpretation_cache**

SceneSense and voice engine outputs. Typed by `outputType`.

- `id`, `entityId` (FK → entities)
- `outputType` (InterpretationType: TAGLINE, PULL_QUOTE, VOICE_DESCRIPTOR, TIMEFOLD)
- `content` (JSON) — the generated interpretation
- `isCurrent` (boolean) — marks active version
- `promptVersion`, `modelVersion`
- `generatedAt`, `createdAt`

### **energy_scores**

Computed energy scores per entity.

- `id`, `entityId` (FK → entities)
- `energy_score`, `raw_energy_score`
- `source_signals` (JSON)

### **place_tag_scores**

Scene/atmosphere tag scores per entity.

- `id`, `entityId` (FK → entities)
- `tag`, `score`, `raw_score`
- `source_signals` (JSON)

---

## Coverage Tables

### **coverage_sources**

Editorial articles about entities from approved publications.

- `id`, `entityId` (FK → entities)
- `url` (unique per entity), `sourceSlug`, `sourceName`
- `articleTitle`, `articleAuthor`, `articlePublishedAt`
- `archivedText` — full article text (captured by fetch stage)
- `enrichmentStage` (CoverageEnrichmentStage: INGESTED, FETCHED, EXTRACTED, FAILED)
- `sourceType` (CoverageSourceType)
- `discoveredAt`, `fetchedAt`, `extractedAt`

### **coverage_source_extractions**

AI-extracted signals from coverage articles.

- `id`, `coverageSourceId` (FK → coverage_sources)
- `entityId` (FK → entities)
- `people` (JSON) — mentioned chefs/owners
- `food_evidence`, `beverage_evidence`, `service_evidence` (JSON)
- `atmosphere_signals`, `origin_story`, `accolades` (JSON)
- `pull_quotes` (JSON), `sentiment`, `article_type`, `relevance_score`
- `promptVersion`, `extractedAt`

---

## Instagram Tables

### **instagram_accounts**

One row per entity with an Instagram handle.

- `id`, `entityId` (FK → entities, unique)
- `instagramUserId` (unique), `username`
- `mediaCount`, `followersCount`, `followsCount`
- `accountType` (BUSINESS / CREATOR / PERSONAL)
- `canonicalInstagramUrl`
- `rawPayload` (JSON)

### **instagram_media**

Recent media items per account (up to 12 per entity).

- `id`, `instagramAccountId` (FK → instagram_accounts)
- `instagramMediaId` (unique)
- `mediaType` (IMAGE / VIDEO / CAROUSEL_ALBUM)
- `mediaUrl` — CDN URL (expires)
- `permalink` — permanent IG post URL (fallback)
- `caption`, `timestamp`
- `photoType` (nullable) — AI-classified: INTERIOR, FOOD, BAR_DRINKS, CROWD_ENERGY, DETAIL, EXTERIOR
- `rawPayload` (JSON)

**Photo ranking:** Photos are ranked by `photoType` preference (INTERIOR first, EXTERIOR last). Unclassified photos sort after classified ones.

---

## Merchant Surface Tables

### **merchant_surfaces**

Discovered web pages for entities (homepage, menu, about, contact).

- `id`, `entityId` (FK → entities)
- `url`, `surfaceType` (homepage, menu, about, contact, instagram, etc.)
- `discoveredAt`, `fetchedAt`

### **merchant_surface_artifacts**

Structured content extracted from merchant surfaces.

- `id`, `surfaceId` (FK → merchant_surfaces)
- `artifactType`, `content` (JSON)
- `extractedAt`

### **merchant_signals**

Structured merchant signals per entity.

- `id`, `entityId` (FK → entities)
- `menuUrl`, `reservationUrl`, `winelistUrl`
- `hasOnlineOrdering`, `hasDelivery`
- Various boolean/string fields for service capabilities

---

## Map & List Tables

### **lists** (maps/guides)

User-created curated maps.

- `id` (UUID), `userId` (FK → users), `slug` (unique)
- `title`, `subtitle`, `description`, `introText`
- `organizingLogic` (OrganizingLogic enum)
- `status` (MapStatus: DRAFT, READY, PUBLISHED, ARCHIVED)
- `templateType` (currently: "field-notes")
- `published` (boolean), `publishedAt`
- `accessLevel` (public / password / private)
- `coverImageUrl`, `primaryColor`, `secondaryColor`
- `viewCount`

### **map_places** (junction table)

Many-to-many: Entity ↔ List. Same entity can appear on multiple maps with different curator context.

- `id`, `mapId` (FK → lists), `entityId` (FK → entities)
- `descriptor` (VARCHAR 120) — curator's editorial note for this map
- `userNote`, `userPhotos[]`
- `orderIndex`
- Unique constraint: `[mapId, entityId]`

---

## User Tables

### **users**
- `id`, `email` (unique), `name`, `passwordHash`
- `subscriptionTier` (free / personal / business)
- `avatarUrl`

### **viewer_bookmarks**
- `viewerUserId` (FK → users), `placeId` (FK → entities)
- `visited` (boolean), `personalNote`

---

## People & Actor Tables

### **people**
- `id`, `slug`, `name`, `role` (PersonRole), `bio`, `imageUrl`

### **person_places**
- `personId` (FK → people), `entityId` (FK → entities)
- `role` (PersonPlaceRole: CHEF, OWNER, FOUNDER, etc.)

### **Actor** / **EntityActorRelationship**
- Restaurant group / operator relationships to entities

---

## Resolution Tables

### **gpid_resolution_queue**
- Entities needing Google Place ID resolution
- `entityId`, `status` (GpidResolverStatus), `matchConfidence`
- Human review fields: `humanStatus`, `humanDecision`

### **entity_issues**
- Data quality issues detected by issue scanner
- `entityId`, `issueType`, `severity`, `details` (JSON)
- `resolvedAt` — null until resolved

---

## Key Enums

### PrimaryVertical (13 values)
```
EAT · COFFEE · WINE · DRINKS · BAKERY · SHOP · CULTURE ·
NATURE · STAY · WELLNESS · PURVEYORS · ACTIVITY · PARKS
```
Plus `CANDIDATE` for pre-enrichment intake entities.

### Entity State Enums
```
OperatingStatus:   OPEN · CLOSED · UNKNOWN
EnrichmentStatus:  CANDIDATE · ENRICHING · ENRICHED · FAILED
PublicationStatus:  DRAFT · PUBLISHED · ARCHIVED
```

### Coverage Pipeline
```
CoverageEnrichmentStage:  INGESTED · FETCHED · EXTRACTED · FAILED
```

### Interpretation Types
```
InterpretationType:  TAGLINE · PULL_QUOTE · VOICE_DESCRIPTOR · TIMEFOLD
```

---

## Key Data Flows

### Entity Enrichment Flow
```
Entity created (CANDIDATE)
  ↓
Smart Enrich (website + IG discovery)
  ↓
Full Pipeline stages 1–7 (Google → AI signals → interpretation)
  ↓
Coverage source enrichment (discover → fetch → extract)
  ↓
Instagram ingestion (account + media + photo classification)
  ↓
Entity now ENRICHED with full signal set
```

### Map Creation Flow
```
User creates List
  ↓
Add Entities to MapPlace (with descriptor, order)
  ↓
Link to canonical Entity
  ↓
Publish List (status: PUBLISHED)
```

### Entity Page Serving Flow
```
Request: GET /api/places/[slug]
  ↓
Fetch entity + derived_signals + interpretation_cache
  ↓
Fetch Instagram photos (ranked by photoType)
  ↓
Fetch coverage highlights
  ↓
Assemble EntityPageData contract
  ↓
Return to consumer layer
```
