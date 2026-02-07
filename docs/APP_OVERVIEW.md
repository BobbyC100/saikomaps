# Saiko Maps - Application Overview

## Core Concept
A curated map platform for creating and sharing beautiful, editorial-style lists of places (restaurants, wine bars, shops, etc.). Think "Spotify playlists but for places."

---

## Major Features

### 1. **Map Creation & Management**
- Users create custom maps/lists with places
- Add places with Google Place ID integration
- Order and curate places with descriptors/notes
- Public/private access control with optional password protection

### 2. **Place Data Enrichment**

#### Google Places API Integration
Automatic backfill of:
- Photos (stored as JSON references)
- Address, hours, phone, website
- Types/categories
- Price level (0-4)
- Reverse geocoded neighborhood

#### Voice Engine (AI Content Generation)
Powered by Anthropic Claude, generates:
- **Taglines:** Editorial one-liners (e.g., "Low-key wine bar with natural selections")
- **Vibe Tags:** Atmosphere descriptors (["Standing room", "Surf crowd"])
- **Tips:** Helpful visitor advice (["Go early for a seat", "Cash only"])
- **Pull Quotes:** Editorial quotes with source attribution

### 3. **Field Notes View** (Premium Template)
Magazine-quality presentation with three viewing modes:

#### Cover/Header Map
- Real Google Map with hydrology-inspired aesthetic
- Cool gray-blue roads (#9aabb5 highways, #c4ced3 arterials)
- Smart bounds with IQR outlier detection (zooms tight on core cluster)
- All pins same size, no labels
- Decorative elements: compass rose, scale bar, ocean wash overlay

#### List View
- Vertical feed of place cards
- Hero photos (Google or user-uploaded)
- AI-generated taglines and editorial content
- Metadata: category, price level, cuisine, neighborhood
- Curator descriptors
- Field Notes design: parchment/charcoal palette, Libre Baskerville typography

#### Expanded Map View
- Full-screen interactive map
- Marker clustering (prevents label soup at zoom-out)
- Labels positioned below pins
- Horizontal carousel of place cards at bottom
- Click pin → scroll to card, click card → center map
- Same hydrology aesthetic as cover map

### 4. **Map Viewing Modes**
- **Split Desktop View:** Map on left, scrollable place cards on right
- **Mobile Toggle:** Switch between list and map views
- **Expanded Map:** Full-screen exploration with card carousel

### 5. **Smart Geography**

#### Outlier Detection
IQR-based algorithm:
- Calculates distance from center for all places
- Uses interquartile range (IQR) to identify outliers
- Fits map bounds to core cluster (80%+ of pins)
- Outlier pins still render, just outside initial viewport
- Tighter multiplier for cover map (0.8) vs expanded (1.0)

#### Centroid Positioning
- Calculates average lat/lng of all included places
- Centers map on centroid after fitting bounds
- Keeps cluster visually centered

#### Neighborhood Aggregation
- Extracts neighborhoods from all places
- Counts frequency
- Displays sorted by popularity
- Dynamic singular/plural labels

#### Marker Clustering (Expanded View Only)
- Groups nearby pins when zoomed out
- Shows count in cluster marker
- Click cluster → zoom in → explode into individual pins
- Custom styling: Field Notes charcoal circle with parchment text

### 6. **Place Cards**
Display format for each place:
- Hero photo (Google or user-uploaded)
- AI-generated tagline
- Category badge
- Price level indicators ($-$$$$)
- Cuisine type
- Curator descriptor (editorial description from map creator)
- Vibe tags
- Tips
- Pull quotes
- Metadata: neighborhood, open status, hours

---

## Tech Stack

### Framework & Runtime
- **Next.js 16:** App Router, Turbopack, Server Components
- **React 19:** Client components for interactivity
- **TypeScript:** Full type safety

### Database & ORM
- **PostgreSQL:** Primary database
- **Prisma:** ORM with type-safe queries
- **Migrations:** Version-controlled schema changes

### External Services
- **Google Maps JavaScript API:**
  - Map rendering with custom styles
  - Place Details API for enrichment
  - Photo references
- **Google Places API:** Place data backfill
- **Anthropic Claude (API):** Voice Engine content generation
- **NextAuth.js:** Authentication & session management

### Styling & UI
- **Tailwind CSS:** Utility-first styling
- **Custom Design System:**
  - Field Notes palette: charcoal (#36454F), parchment (#F5F0E1), khaki (#C3B091)
  - Typography: Libre Baskerville (serif), system sans fallbacks
  - Print-inspired aesthetic

### Maps & Geo
- **@googlemaps/js-api-loader:** Dynamic Google Maps loading
- **@googlemaps/markerclusterer:** Marker clustering
- **Custom map styles:** Hydrology-inspired JSON styles
- **Smart bounds algorithm:** IQR-based outlier detection

---

## Data Models (Simplified)

### Core Entities
```
User → List (Maps) → MapPlace → Place
                              ↓
                        ViewerBookmark
```

### Key Models

**List (Map):**
- Title, description, slug
- Organizing logic (time/neighborhood/route/purpose-based)
- Template type (currently: field-notes)
- Access control (public/password/private)
- Status (draft/ready/published/archived)

**Place (Canonical):**
- Google Places data (address, photos, hours, types)
- AI-generated content (tagline, vibe tags, tips, pull quotes)
- Enrichment timestamps

**MapPlace (Junction):**
- Links Place to List (many-to-many)
- Curator-specific: descriptor, order, notes, photos per map

**Location (Legacy):**
- Original model (being phased out)
- Tied directly to List (1:many)
- Migrating to Place/MapPlace architecture

**ActivitySpot:**
- Skateparks, surf breaks
- Separate from food/drink places
- Layer-based display (SKATE | SURF)

---

## Key Workflows

### 1. Create Map
```
1. User creates List (title, description, organizing logic)
2. Add places via search or Google Place ID
3. Set order and curator descriptors per place
4. System creates MapPlace entries linking to canonical Place
5. Backfill Google Places data (photos, hours, address)
6. Generate AI content (taglines, vibe tags, tips)
7. Preview in Field Notes template
8. Publish → status: PUBLISHED
```

### 2. View Public Map
```
1. User visits /map/[slug]
2. Fetch List by slug
3. Load MapPlaces (ordered, with curator descriptors)
4. Join to Places (with Google + AI enrichments)
5. Render Field Notes template:
   - Cover map with smart bounds
   - Scrollable place cards
   - Expandable full-screen map
```

### 3. Enrich Place Data
```
1. Place created with googlePlaceId
2. Backfill script (`npm run backfill:google`):
   - Fetch Google Places details
   - Update photos, address, hours, phone, types, priceLevel
   - Set placesDataCachedAt timestamp
3. Voice Engine script (`npm run enrich:voice`):
   - Generate tagline with pattern detection
   - Create vibe tags from signals
   - Generate tips
   - Find/create pull quotes
4. Place now "enriched" and ready for beautiful display
```

---

## Admin & Maintenance

### Scripts (package.json)

**Data Enrichment:**
- `npm run backfill:google` - Fetch Google Places data
- `npm run enrich:voice` - Generate AI content
- `npm run test:voice-engine` - Test tagline generation

**Data Analysis:**
- `npm run analyze:coverage` - Check enrichment status
- `npm run diagnose:photos` - Investigate missing photos
- `npm run list:needs-photos` - Find places needing photo backfill

**Data Cleanup:**
- `npm run find:duplicates` - Detect duplicate places
- `npm run merge:duplicates` - Merge duplicate records

### Key Algorithms

**Smart Bounds (IQR Outlier Detection):**
```typescript
// Calculate distance from center for each place
const centerLat = avg(places.map(p => p.lat))
const centerLng = avg(places.map(p => p.lng))
const distances = places.map(p => distanceFrom(p, center))

// Find outliers using IQR
const q1 = quantile(distances, 0.25)
const q3 = quantile(distances, 0.75)
const iqr = q3 - q1
const upperFence = q3 + multiplier * iqr

// Filter to included (non-outlier) places
const included = places.filter(p => p.distance <= upperFence)

// Fit bounds to included only
map.fitBounds(boundsOf(included))
```

**Centroid Calculation:**
```typescript
const centroid = {
  lat: places.reduce((sum, p) => sum + p.lat, 0) / places.length,
  lng: places.reduce((sum, p) => sum + p.lng, 0) / places.length
}
map.panTo(centroid)
```

---

## Design System

### Field Notes Palette

**Light Theme:**
- **Charcoal:** `#36454F` (text, pins)
- **Parchment:** `#F5F0E1` (background, pin borders)
- **Khaki:** `#C3B091` (accents, labels)
- **Landscape:** `#e8e2d4` (map background)
- **Water:** `#c9d9e0` (soft blue-grey)
- **Roads:** `#9aabb5` (highways), `#c4ced3` (arterials)
- **Parks:** `#e2e5dc` (barely-there sage)

**Typography:**
- **Serif:** Libre Baskerville (headings, place names, labels)
- **Sans:** System font stack (body text, metadata)

**Map Styling:**
- Hydrology-inspired aesthetic
- Cool gray-blue roads
- Muted, desaturated look (saturation: -25)
- No POI labels
- Subtle neighborhood labels
- Hidden local roads

---

## Current Architecture Decisions

### Why Place + MapPlace?
**Problem:** Original `Location` model tied places directly to lists (1:many)
**Issue:** Same restaurant appears on multiple lists → duplicated data, inconsistent enrichment

**Solution:** Canonical `Place` entity + `MapPlace` junction table
**Benefits:**
- Place enrichment happens once
- Same place on multiple maps
- Curator context (descriptor, order) separated from canonical data
- Better data consistency

### Why Smart Bounds?
**Problem:** Geographic outliers (one place 10 miles away) force map to zoom out, making main cluster tiny
**Solution:** IQR-based outlier detection
**Result:** Tight zoom on core cluster, outliers still render but outside initial view

### Why Marker Clustering (Expanded Only)?
**Cover Map:** Visual overview showing distribution → no clustering
**Expanded Map:** Interactive navigation → clustering prevents label soup at zoom-out

---

## Future Considerations

### Location → Place Migration
- Migrate remaining `Location` records to `Place`/`MapPlace`
- Update all queries to use new schema
- Deprecate `Location` model

### Additional Templates
- Current: Field Notes (magazine-style)
- Future: Grid view, minimalist, interactive story

### Voice Engine Enhancements
- Pattern detection improvements
- Multi-language support
- Curator tone customization

### Performance
- Implement Redis caching for frequently accessed maps
- Optimize Google Places API calls (batch, rate limiting)
- Image optimization (CDN, WebP, responsive)
