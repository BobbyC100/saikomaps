---
doc_id: SAIKO-APP-OVERVIEW
doc_type: overview
status: active
owner: Bobby Ciccaglione
created: '2026-03-10'
last_updated: '2026-03-24'
project_id: SAIKO
summary: 'High-level overview of the Saiko platform: entity data system, enrichment pipeline, map creation, and consumer surfaces.'
---
# Saiko — Application Overview

## Core Concept
A curated cultural place-data platform. Saiko maps the places that meaningfully contribute to how people live well in a city. The system is built around a canonical entity data layer with editorial enrichment, published as curated maps and individual entity pages.

---

## System Layers

Saiko has three architectural layers (see CLAUDE.md for full rules):

| Layer | Responsibility | Key surfaces |
|-------|---------------|--------------|
| **Data Layer** | System of record — canonical entity identity, structured facts, signals, confidence, provenance | `entities`, `canonical_entity_state`, `derived_signals`, `coverage_sources` |
| **Saiko Fields** | Platform/infrastructure — transforms raw data into stable product-safe contracts, enrichment orchestration | Entity page contract (`EntityPageData`), photo pipeline, SceneSense |
| **Traces** | Consumer product — presentation, interaction, user-facing experience | Map views, entity pages, homepage, explore |

---

## Major Features

### 1. Entity Data Enrichment

The core enrichment pipeline is a 7-stage Entity Record Awareness (ERA) system:

| Stage | Name | What it does |
|-------|------|-------------|
| 1 | Google Places identity | GPID commit, coordinates, hours, photos |
| 2 | Surface discovery | Find homepage, menu, about, contact URLs |
| 3 | Surface fetch | Capture raw HTML from discovered surfaces |
| 4 | Surface parse | Structure captured content into artifacts |
| 5 | Identity signal extraction | AI extraction into `derived_signals` |
| 6 | Website enrichment | menu_url, reservation_url into Fields v2 |
| 7 | Interpretation | Tagline, voice descriptor, SceneSense into `interpretation_cache` |

**Smart Enrich** is a cost-optimized alternative (~$0.01-0.04/entity) that uses Haiku web search + scraping before falling back to Google Places.

See `docs/PIPELINE_COMMANDS.md` for all operator commands.

#### Coverage Source Enrichment
A separate 4-stage pipeline discovers, fetches, and extracts signals from editorial coverage (Eater, LA Times, Infatuation, etc.):
- Backfill → Discover → Fetch → Extract
- Signals stored in `coverage_sources` + `coverage_source_extractions`

#### Instagram Ingestion
Batch ingestion of Instagram account data and recent media for entities with handles. Photos are classified by `photoType` (INTERIOR, FOOD, BAR_DRINKS, CROWD_ENERGY, DETAIL, EXTERIOR) and ranked for display.

#### SceneSense
Saiko's atmosphere/energy/scene signal engine. Produces:
- **PRL** (Place Reachability Level, 1-5) — how easy to reach/access
- **Atmosphere signals** — quiet, lively, intimate, etc.
- **Energy signals** — calm, buzzy, electric, etc.
- **Scene signals** — date night, solo dinner, group, etc.

### 2. Map Creation & Management
- Users create custom maps/lists with entities
- Add entities with Google Place ID integration
- Order and curate with descriptors/notes per map
- Public/private access control with optional password protection
- Published as "Field Notes" template (magazine-style presentation)

### 3. Entity Pages (`/place/[slug]`)
Individual entity detail pages with a three-tier content hierarchy:
- **Tier 1 — Identity + Action:** Hero photos (Instagram or Google), name, meta row, action buttons
- **Tier 2 — Editorial + Context:** Description, coverage quotes, offerings, hours
- **Tier 3 — Reference + Discovery:** Map tile, coverage links, "Also On" cross-references

Data degrades gracefully — if a tier has no data, the space collapses.

### 4. Field Notes View (Map Template)
Magazine-quality map presentation with three viewing modes:

- **Cover Map** — Google Map with hydrology-inspired aesthetic, smart bounds (IQR outlier detection)
- **List View** — Vertical feed of entity cards with photos, taglines, metadata, curator descriptors
- **Expanded Map** — Full-screen interactive map with marker clustering and horizontal card carousel

### 5. Homepage (saikofields.com)
Platform front door with three content sections:
- **By Neighborhood** — curated allow-list, real entity counts
- **By Category** — `primaryVertical` groupings with editorial labels
- **Collections** — published maps/lists

See `docs/homepage-solutions.md` for implementation plan.

---

## Tech Stack

### Framework & Runtime
- **Next.js 16:** App Router, Turbopack, Server Components
- **React 19:** Client components for interactivity
- **TypeScript:** Full type safety

### Database & ORM
- **PostgreSQL:** Primary database (Neon pooled connections)
- **Prisma:** ORM with type-safe queries, 50+ models
- **Migrations:** Version-controlled schema changes

### External Services
- **Google Maps JavaScript API:** Map rendering with custom styles
- **Google Places API:** Entity data enrichment (Stage 1)
- **Anthropic Claude:** AI signal extraction (Sonnet), social discovery (Haiku)
- **Meta Graph API:** Instagram Business Discovery for photo ingestion
- **NextAuth.js:** Authentication & session management
- **Upstash Redis:** Rate limiting for AI endpoints

### Styling & UI
- **Tailwind CSS 4:** Utility-first styling
- **CSS Modules:** Component-scoped styles
- **Custom Design System:** Parchment/charcoal palette, Libre Baskerville + Instrument Serif typography

---

## Data Models (Simplified)

### Core Flow
```
User → List (Maps) → MapPlace → Entity (canonical)
                                     ↓
                              derived_signals
                              interpretation_cache
                              instagram_media
                              coverage_sources
```

### Key Models

**Entity** (`entities`):
- Canonical place identity: slug, name, address, coordinates
- Classification: `primaryVertical` (13 domains), `category`, `cuisineType`, `neighborhood`
- Editorial: tagline, description, pullQuote, tips
- State: `operatingStatus`, `enrichmentStatus`, `publicationStatus`
- Enrichment: `lastEnrichedAt`, `confidence` (JSONB)

**List** (`lists`):
- Title, description, slug, organizing logic
- Template type (currently: field-notes)
- Access control (public/password/private)
- Status (DRAFT/READY/PUBLISHED/ARCHIVED)

**MapPlace** (`map_places`):
- Junction table: Entity ↔ List (many-to-many)
- Curator-specific: descriptor, order, notes, photos per map

**Derived Signals** (`derived_signals`):
- AI-extracted signals keyed by `signalKey` (identity_signals, offering_programs)
- JSON value with provenance

**Interpretation Cache** (`interpretation_cache`):
- SceneSense, taglines, voice descriptors
- Typed by `outputType` (TAGLINE, PULL_QUOTE, VOICE_DESCRIPTOR, TIMEFOLD)

**Coverage Sources** (`coverage_sources`):
- Editorial articles about entities from approved publications
- Staged pipeline: INGESTED → FETCHED → EXTRACTED

---

## Admin Surfaces

| Page | URL | Purpose |
|------|-----|---------|
| Coverage Dashboard | `/admin/coverage` | Resolution health, tier summary, neighborhood coverage |
| Coverage Ops | `/admin/coverage-ops` | Triage board — actionable issues with inline resolution tools |
| GPID Queue | `/admin/gpid-queue` | Human review for ambiguous Google Place ID matches |
| Entity Profile | `/admin/entity/[id]` | Detailed entity inspection and enrichment controls |
| Instagram Admin | `/admin/instagram` | Instagram handle management |
| Photo Eval | `/admin/photo-eval` | Photo quality evaluation |

---

## Key Workflows

### 1. Create Map
```
1. User creates List (title, description, organizing logic)
2. Add entities via search or Google Place ID
3. Set order and curator descriptors per entity
4. System creates MapPlace entries linking to canonical Entity
5. Publish → status: PUBLISHED
```

### 2. Enrich Entity
```
1. Entity created (via intake, import, or map addition)
2. Smart Enrich discovers identity (website, Instagram, coords)
3. Full pipeline runs stages 2-7 (surface discovery → interpretation)
4. Coverage source enrichment finds/extracts editorial articles
5. Instagram ingestion fetches and classifies photos
6. Entity now fully enriched and ready for display
```

### 3. View Public Map
```
1. User visits /map/[slug]
2. Fetch List by slug with MapPlaces (ordered, with descriptors)
3. Join to Entities (with enrichments via EntityPageData contract)
4. Render Field Notes template
```

---

## Design System

### Palette
- **Charcoal:** `#36454F` (text, pins)
- **Parchment:** `#F5F0E1` (background)
- **Khaki:** `#C3B091` (accents, labels)
- **Warm White:** `#FAF8F3` (card backgrounds)

### Typography
- **Instrument Serif:** Card titles, display text
- **Libre Baskerville:** Headings, editorial content
- **DM Sans / Nunito:** Body text, metadata

### Map Styling
- Hydrology-inspired aesthetic
- Cool gray-blue roads, muted desaturated palette
- Smart bounds with IQR outlier detection

---

## Architecture Decisions

### Why Entity + MapPlace?
**Problem:** Original `Location` model tied places directly to lists (1:many) — same restaurant on multiple lists meant duplicated data and inconsistent enrichment.

**Solution:** Canonical `entities` table + `map_places` junction table. Enrichment happens once per entity. Same entity on multiple maps. Curator context separated from canonical data.

### Why 13 Verticals?
Saiko classifies places by human activity domain, not business category. See `docs/architecture/vertical-taxonomy-v1.md`.

### Why Coverage Sources?
Editorial coverage from trusted publications provides independent signal about entity identity, quality, and offerings — stronger than self-reported data alone.
