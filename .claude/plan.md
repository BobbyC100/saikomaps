# Coverage Ops Redesign: Entity Dossier Page

## Problem
The current Coverage Ops triage board is **issue-centric** — a flat list of problems with action buttons that re-run automation. But the operator mental model is **entity-centric**: "Open an entity, see everything about it, fill in what's missing."

## New Design

### Page 1: Entity List (redesign `/admin/coverage-ops`)
- **Entity rows, not issue rows** — each row = one entity
- Shows: name, slug, issue count, worst severity, blocking status
- Sorted by: blocking first, then by issue count/severity
- Summary stats remain (active issues, blocking entities, etc.)
- Filters: severity, blocking only, search by name
- Click an entity → navigates to its dossier page

### Page 2: Entity Dossier (new `/admin/coverage-ops/[slug]`)
The core new page. A full-screen entity profile with editable fields organized into sections:

#### Header
- Entity name (editable), slug, status badge, vertical badge
- Issue summary: "3 issues — 1 blocking"
- Quick actions: "Run Full Enrichment", "View Public Page →"

#### Section: Identity
- Google Place ID — show value or "Missing" with input to paste one + resolve button
- Name, primary vertical, entity type, status
- Source: which system provided the current GPID

#### Section: Location
- Address (editable text input)
- Neighborhood (editable — dropdown from known neighborhoods, or type custom)
- Lat/Lng (display, with "Derive from GPID" button if missing)
- Small map preview if coords exist

#### Section: Contact
- Website (editable URL input)
- Phone (editable)
- Instagram handle (editable — with "Discover" button to auto-search)
- Hours (display only for now)
- Reservation URL (editable)

#### Section: Editorial
- Description (editable textarea) + source/confidence indicator
- Tagline (editable) + pattern used
- Pull quote, author, source (editable)
- Tips (editable list)

#### Section: Issues & History
- All `entity_issues` for this entity with current status
- For each issue: type, severity, what the recommended tool is, when created
- Suppress/resolve controls inline
- Enrichment stage indicator: "Last enriched: Stage 7 on Mar 10"

#### Inline Save Pattern
- Each field group has a save button (or auto-saves on blur)
- Saves go to a new `PATCH /api/admin/entity/[slug]` endpoint
- Updates both `entities` table and `canonical_entity_state` where applicable
- After save, re-check if any issues are now resolved → auto-resolve them

## Files to Create/Modify

### New Files
1. **`app/admin/coverage-ops/[slug]/page.tsx`** — Entity dossier page (~600-800 lines)
2. **`app/api/admin/entity/[slug]/route.ts`** — GET (full entity data) + PATCH (field updates)

### Modified Files
3. **`app/admin/coverage-ops/page.tsx`** — Redesign from issue-centric to entity-centric list
4. **`app/api/admin/tools/scan-issues/route.ts`** — Add single-entity re-scan after field updates (already has `slug` support)

## API Design

### GET `/api/admin/entity/[slug]`
Returns the full dossier payload:
```json
{
  "entity": { /* all entity columns */ },
  "canonical_state": { /* canonical_entity_state row if exists */ },
  "issues": [ /* entity_issues rows */ ],
  "enrichment_runs": [ /* merchant_enrichment_runs recent history */ ],
  "surfaces": [ /* merchant_surfaces with latest artifact info */ ],
  "coverage_sources": [ /* editorial coverage */ ],
  "maps": [ /* which maps this appears on */ ],
  "instagram_account": { /* linked IG account if any */ }
}
```

### PATCH `/api/admin/entity/[slug]`
Accepts partial field updates:
```json
{
  "fields": {
    "website": "https://example.com",
    "instagram": "example_la",
    "neighborhood": "Silver Lake",
    "phone": "+12135551234"
  }
}
```
- Updates `entities` table
- Updates `canonical_entity_state` (if row exists)
- Re-runs issue scan for this entity → auto-resolves fixed issues
- Returns updated entity + issues

## Build Order
1. API route: `GET /api/admin/entity/[slug]` — assemble full dossier data
2. API route: `PATCH /api/admin/entity/[slug]` — field updates with issue re-scan
3. Entity dossier page: `/admin/coverage-ops/[slug]/page.tsx`
4. Redesign list page: `/admin/coverage-ops/page.tsx` — entity-centric rows linking to dossier
