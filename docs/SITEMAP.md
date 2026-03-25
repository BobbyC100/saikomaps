---
doc_id: SAIKO-SITEMAP
doc_type: reference
status: active
owner: Bobby Ciccaglione
created: '2026-03-10'
last_updated: '2026-03-24'
project_id: SAIKO
summary: ''
---
# Saiko — Sitemap

## Public Routes

### Homepage
- `/` - Landing page

### Public Map Viewing
- `/map/[slug]` - Public map view (Field Notes template)
  - Examples: `/map/silver-lake-natural-wine`, `/map/venice-coffee-shops`
  - Features:
    - Split view (desktop): Map + scrollable place cards
    - Toggle view (mobile): Switch between list/map
    - Expanded map mode: Full-screen with carousel
    - Smart bounds with outlier detection
    - Hydrology-inspired map styling

### Entity Pages
- `/place/[slug]` - Standalone entity detail page (route group: `(viewer)`)
  - Example: `/place/buvons`, `/place/republique`
  - Displays: photos (Instagram/Google), tagline, description, coverage, offerings, hours, contact
  - Three-tier content hierarchy with graceful degradation

### Explore
- `/explore` - Browse and search entities
  - Filter by vertical, neighborhood, cuisine
  - Search with location bias

### Coverage (Public)
- `/coverage` - Geographic coverage and data quality metrics (public, no auth required)

---

## Authentication Routes

**Route Group:** `(auth)` - Shared layout for auth pages

- `/login` - User login page
- `/signup` - User registration page

---

## Creator/Dashboard Routes

**Route Group:** `(creator)` - Dashboard and creator tools

### Dashboard & Management
- `/dashboard` - User dashboard/home
  - View all created maps
  - Quick stats
  - Recent activity

### Import Tools
- `/import` - Import places to maps
  - CSV/JSON upload
  - Preview before import
  - Job status tracking

### Content Management
- `/review` - Review/moderate content
  - Review AI-generated content
  - Approve/edit taglines, tips, quotes

### Setup & Configuration
- `/setup` - Initial setup wizard
  - First-time user onboarding
  - Account configuration

### Templates
- `/templates` - Browse map templates
  - Currently: Field Notes
  - Future: Additional templates

### Testing
- `/test-add-location` - Test location addition
  - Development/QA tool

---

## Editor Routes

**Route Group:** `(editor)` - Map creation and editing interfaces

### Map Creation
- `/maps/new` - Create new map
  - Set title, description, organizing logic
  - Choose template
  - Access control settings

### Map Editing
- `/maps/[mapId]/edit` - Edit existing map
  - Update metadata
  - Modify settings
  - Manage places

### Legacy Create Flow
*Note: May be consolidated with `/maps/[mapId]/edit`*

- `/create` - Create map flow entry point
- `/create/[mapId]/locations` - Add/manage locations for map
  - Search places
  - Add by Google Place ID
  - Set order and descriptors
- `/create/[mapId]/preview` - Preview map before publish
  - See how it looks in Field Notes template
  - Test different views

---

## Admin Routes

**Requires:** Admin authentication (email in `ADMIN_EMAILS`)

| Route | Purpose |
|-------|---------|
| `/admin` | Admin home |
| `/admin/coverage` | Coverage dashboard — resolution health, tier summary, neighborhood coverage, missing fields |
| `/admin/coverage-ops` | Coverage operations triage board — actionable issues with inline resolution tools |
| `/admin/entity/[id]` | Entity profile — detailed entity inspection, enrichment controls, signal viewer |
| `/admin/gpid-queue` | GPID resolution queue — human review for ambiguous Google Place ID matches |
| `/admin/instagram` | Instagram handle management — add, edit, remove handles |
| `/admin/photo-eval` | Photo quality evaluation |
| `/admin/intake` | Entity intake tools |
| `/admin/actors` | Actor/operator management |
| `/admin/appearances` | Place appearance management |

---

## API Routes

### AI & Generation
- `POST /api/ai/generate-map-details`
  - Generate AI-powered map description
  - Input: map context, scope, organizing logic
  - Output: AI-written description

### Authentication
- `/api/auth/[...nextauth]` - NextAuth.js handler
  - Sign in, sign out, callbacks
- `POST /api/auth/signup` - User registration endpoint

### Import System
- `POST /api/import/upload` - Upload import file (CSV/JSON)
- `POST /api/import/preview` - Preview import data before processing
- `POST /api/import/process` - Process import job (create places)
- `GET /api/import/status/[jobId]` - Check import job status
- `POST /api/import/add-to-list` - Add imported places to list

### Lists/Maps Management
- `GET /api/maps` - List user's maps (authenticated)
- `POST /api/maps` - Create new map
- `GET /api/maps/[id]` - Get map details (authenticated)
- `PUT /api/maps/[id]` - Update map
- `DELETE /api/maps/[id]` - Delete map
- `POST /api/maps/[id]/archive` - Archive map (soft delete)
- `POST /api/maps/[id]/publish` - Publish map (make public)
- `POST /api/maps/[id]/regenerate-description` - Regenerate AI description
- `GET /api/maps/public/[slug]` - Get public map data (unauthenticated)
  - Used by `/map/[slug]` page
  - Returns: list metadata, places with enrichments, MapPlace data

### Lists API (Legacy)
*Note: May be consolidated with /api/maps*
- `GET /api/lists/[slug]/locations` - Get locations for list

### Locations/Places
- `GET /api/locations/[locationId]` - Get location details (legacy)
- `GET /api/places/search` - Search places
  - Query params: `q` (search term), `lat`, `lng`, `radius`
- `GET /api/places/[slug]` - Get place by slug
- `GET /api/places/details/[placeId]` - Get place details
  - Returns: full place data with enrichments

### Map Places (Junction Table)
- `GET /api/map-places/[mapPlaceId]` - Get map-place relationship
- `PUT /api/map-places/[mapPlaceId]` - Update map-place data
  - Update: descriptor, order, notes, photos
- `DELETE /api/map-places/[mapPlaceId]` - Remove place from map

### Activity Spots (Skate/Surf)
- `GET /api/spots` - List activity spots
  - Query params: `layerType` (SKATE/SURF), `city`, `bounds`
- `GET /api/spots/[id]` - Get spot details
- `GET /api/spots/geojson` - Get spots as GeoJSON
  - For map layer rendering

### Open Graph Images
- `GET /api/og/[mapId]` - Generate OG image for map
  - Dynamic social sharing image
  - Shows map preview + title

### Admin Tools API
- `POST /api/admin/tools/scan-issues` - Run entity issue scanner (full scan or single entity)
- `POST /api/admin/tools/enrich-stage` - Run specific enrichment stage for an entity
- `POST /api/admin/tools/discover-social` - Discover Instagram/TikTok/website via AI
- `POST /api/admin/tools/derive-neighborhood` - Derive neighborhood from coordinates
- `POST /api/admin/tools/seed-gpid-queue` - Seed GPID resolution queue

### Admin Entity API
- `GET /api/admin/entities/[id]/detail` - Full entity detail
- `GET /api/admin/entities/[id]/coverage` - Entity coverage sources
- `POST /api/admin/entities/[id]/coverage` - Add coverage source manually
- `POST /api/admin/entities/[id]/mark-nomadic` - Mark entity as nomadic
- `GET /api/admin/entities/[id]/timefold` - Entity timefold data
- `POST /api/admin/entities/compare` - Compare entities for merge
- `POST /api/admin/entities/merge` - Merge duplicate entities

### Admin Enrichment API
- `POST /api/admin/enrich/[slug]` - Run enrichment on entity by slug
- `POST /api/admin/smart-enrich` - Smart enrich (single or batch)

### Admin Coverage API
- `GET /api/admin/coverage-dashboard` - Coverage dashboard data
- `GET /api/admin/stats` - System statistics

### Admin Instagram API
- `GET/POST /api/admin/instagram` - Instagram handle CRUD

### Admin Intake API
- `POST /api/admin/intake` - Entity intake
- `POST /api/admin/intake/resolve` - Resolve intake entity

---

## URL Patterns & Examples

### Public Map Viewing
```
https://saiko.com/map/silver-lake-natural-wine
https://saiko.com/map/venice-beach-coffee-shops
https://saiko.com/map/dtla-lunch-spots
```

### Individual Place Pages
```
https://saiko.com/place/covell
https://saiko.com/place/tabula-rasa-bar
https://saiko.com/place/psychic-wines
```

### Map Editing
```
https://saiko.com/maps/abc123-uuid/edit
https://saiko.com/create/abc123-uuid/locations
https://saiko.com/create/abc123-uuid/preview
```

### User Dashboard
```
https://saiko.com/dashboard
https://saiko.com/import
https://saiko.com/templates
```

---

## Route Groups Explained

### `(auth)` - Authentication
- Shared layout with auth-specific styling
- No navigation header
- Centered forms

### `(creator)` - Dashboard & Tools
- Routes for map creators
- Requires authentication
- Shared creator navigation

### `(editor)` - Map Editing
- Direct map creation/editing interfaces
- Requires authentication & ownership
- Focused editing UI

### `(viewer)` - Public Viewing
- Public-facing content
- No authentication required
- Separate layout from creator tools

---

## Authentication & Authorization

### Public Routes (No Auth Required)
- `/` - Homepage
- `/map/[slug]` - Public maps
- `/place/[slug]` - Place detail pages

### Protected Routes (Auth Required)
- `/dashboard` - User dashboard
- `/maps/*` - Map management
- `/create/*` - Map creation
- All creator/editor routes

### Authorization Levels
- **Public Maps:** Anyone can view
- **Password-Protected Maps:** Requires password
- **Private Maps:** Only allowed emails
- **Map Editing:** Only map owner

---

## API Authentication

### Public Endpoints
- `GET /api/maps/public/[slug]`
- `GET /api/places/[slug]`
- `GET /api/places/search`

### Protected Endpoints
- All `POST`, `PUT`, `DELETE` operations
- User-specific data (`/api/maps` list)
- Map editing endpoints

### Authentication Method
- NextAuth.js session-based auth
- JWT tokens
- Cookie-based sessions
