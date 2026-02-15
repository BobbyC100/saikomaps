# PlaceCanonical — Data Contract

**Status**: Authoritative · Living  
**Audience**: Product, Engineering, Data Pipelines, AI Systems (Cursor, assistants)  
**Applies to**: All customer-facing Saiko surfaces

⸻

## 1. Definition

**PlaceCanonical** is Saiko's customer-facing, editorially trusted representation of a place.

It is the only data shape permitted on public Saiko surfaces.  
It represents what Saiko stands behind—not raw inputs, not evidence, not vendor data.

If data appears in the product, it appears through PlaceCanonical or a derived subset of it.

⸻

## 2. Scope: Saiko Places vs External Places

- **Saiko Place**: a place intentionally included in Saiko Maps. Inclusion implies **Saiko endorsement**.
- **External Place**: a place accessible for reference/list-making (e.g., from Google Places), but **not curated or endorsed** by Saiko.

**PlaceCanonical applies only to Saiko Places.**  
External Places must never be represented with PlaceCanonical or any Saiko-endorsement semantics.

⸻

## 3. Consumers

PlaceCanonical (or an explicit subset) is consumed by:
- Place Page
- Explore
- Map / Collections
- AI-facing summaries and reference contexts (read-only)

**Rule**:  
Any customer-facing surface must consume PlaceCanonical.  
No surface may query raw tables or staging fields directly.

⸻

## 4. Field Categories (by intent)

PlaceCanonical fields are grouped by purpose, not storage.

### A. Identity & Location (Canonical)

Stable identifiers and geography a user can rely on.
- `id`, `slug`, `name`, `status`
- `address`, `latitude`, `longitude`
- `neighborhood` (override wins), `city`

**Guarantee**: normalized, human-readable, no internal IDs.

⸻

### B. Primary Actions (Canonical)

Direct ways to engage with the place.
- `menuUrl`
- `winelistUrl`
- `reservationUrl`
- `aboutUrl`

**Guarantee**:  
These URLs are canonical, validated, and never auto-overwritten by crawlers.

⸻

### C. Contact & Facts (Canonical)

Core facts required for orientation and action.
- `phone`
- `instagram` (handle, normalized)
- `website`
- `hours`

**Note on hours**: hours are treated as facts. No apology or uncertainty language is introduced at the data level.

⸻

### D. Editorial Trust Layer (Derived · Saiko IP)

Saiko's synthesis and point of view.
- `saikoSummary` (content + provenance)
- `pullQuote` (quote, author, source)
- `coverages` (approved only)
- `curatorNote` (map context)

**Guarantee**:  
All editorial fields are Saiko-authored, approved, or derived.  
No raw vendor descriptions are exposed.

⸻

### E. Identity Signals (Derived)

Curated signals that help users understand what kind of place this is.
- `cuisine` (primary, secondary)
- `priceLevel`
- `intentProfile`
- `vibeTags`

**Rule**:  
Signals are expressive, not exhaustive. They are not a feature checklist.

⸻

### F. Attributes (Derived · Filtered)

Narrow, opinionated signals derived from external sources.
- `accessibility`
- `parking`
- `dining`

**Constraint**:  
Attributes are intentionally filtered and may not expand without product approval.

⸻

### G. Media (Canonical Presentation)

Presentation-ready media assets.
- `photos.hero`
- `photos.gallery`

**Rule**:  
Media is treated as presentation assets, not raw vendor payloads.

⸻

### H. Relationships (Derived)

Contextual relationships that add meaning.
- `restaurantGroup`
- `appearsOn` (maps / collections)

These express Saiko's graph of places, not an exportable dataset.

⸻

## 5. Guarantees to Consumers

Consumers of PlaceCanonical may assume:
- No staging or evidence fields are present
- No raw Google or vendor descriptions are present
- Fields are normalized and presentation-ready
- Editorial content is intentional and trusted
- Fallback behavior has already been resolved server-side

**Rule**:  
UI code must not invent semantics or fallbacks.

⸻

## 6. Forbidden Content (Hard Rules)

The following must **never** appear in PlaceCanonical or any customer response:
- Any `discovered_*` fields
- Crawl evidence or audit payloads
- Raw Google descriptions, types, or IDs
- Internal IDs, foreign keys, or timestamps
- Ranking, scoring, or ad configuration metadata

**Enforcement**:  
Customer routes must assert and reject forbidden keys at runtime.

⸻

## 7. Promotion Boundary (Evidence → Canonical)

Data enters PlaceCanonical only through intentional promotion.
- Crawlers and imports produce Evidence
- Evidence is reviewed, validated, and promoted
- Canonical fields are never auto-overwritten
- Editorial and derived fields are Saiko IP

**Rule**:  
If a field requires review, it remains evidence until promoted.

⸻

## 8. AI & Discovery Posture

PlaceCanonical is designed to support AI reference, not AI ingestion.
- It expresses entities, relationships, and meaning
- It avoids bulk, export-friendly representations
- It prioritizes synthesis over exhaustiveness

**Principle**:  
PlaceCanonical should be easy to understand, hard to reconstruct, and impossible to commoditize.

⸻

## 9. Change Management

- Any addition to PlaceCanonical requires product review
- Any expansion of attributes or signals requires explicit approval
- If a field does not clearly belong to a category above, it does not ship

**Rule**:  
If intent is unclear, the field is not canonical.

⸻

## 10. Final Statement

PlaceCanonical is the contract between Saiko's data, its product, and its users.  
It encodes trust, intent, and confidence—and protects them as the system scales.

⸻

## See Also

- [API Contract: Place Canonical](./API-CONTRACT-PLACE-CANONICAL.md) — Implementation specification for the `/api/places/[slug]` endpoint
- [Field List: Schema to API](./FIELD-LIST-SCHEMA-TO-API.md) — Detailed field mappings from Prisma to API response
