---
doc_id: ARCH-PERSON-ACTORS-V1
doc_type: architecture
status: active
title: "Person Actors — Chef & Sommelier Mapping (V1)"
owner: Bobby Ciccaglione
created: "2026-03-01"
last_updated: "2026-03-22"
project_id: SAIKO
systems:
  - entity-model
  - actors
  - admin
related_docs:
  - docs/architecture/coverage-source-enrichment-v1.md
summary: >
  Maps chefs, sommeliers, and beverage professionals to venues as first-class
  person actors in the Saiko graph. Uses the existing Actor model with
  kind=person and five new ActorRole values. V1 is manual entry and linking
  only — no automated extraction. V1.5 adds candidate generation from website
  enrichment and coverage source extraction.
---

# Person Actors — Chef & Sommelier Mapping (V1)

---

## 1. Purpose

Map chefs, sommeliers, and beverage professionals to venues as first-class actors in the Saiko graph. People are not places, but they have durable relationships to places that users care about.

V1 = Manual entry and linking only. No automated extraction.

---

## 2. Model

Person actors use the existing `Actor` model with `kind = person`.

### Actor Table

| Field | Value |
|---|---|
| kind | `person` |
| name | Full name (e.g., "Walter Manzke") |
| slug | Deterministic: `walter-manzke` (collision: `-2`, `-3`) |
| website | Optional personal site |
| description | Optional bio/context |
| visibility | `INTERNAL` (default) |
| confidence | `1.0` for manual entry |
| sources | `{ seed: "manual_entry", created_at, created_by }` |

### Roles (ActorRole enum)

Five person-specific roles added in V1:

| Role | Meaning |
|---|---|
| `chef` | Executive chef, head chef, chef de cuisine |
| `sommelier` | Sommelier, head sommelier |
| `pastry_chef` | Pastry chef, pastry director |
| `beverage_director` | Beverage director, bar director |
| `wine_director` | Wine director, wine program lead |

### Linking

Person actors link to venues via `PlaceActorRelationship`:

```
PlaceActorRelationship {
  entityId    → entities.id
  actorId     → Actor.id
  role        → ActorRole (chef, sommelier, etc.)
  isPrimary   → true/false
  confidence  → 1.0 (manual)
  sources     → { seed: "manual_entry", ... }
}
```

**Primary override rule:** If a venue already has `isPrimary = true` for the same role with a different actor, the existing primary is demoted to `isPrimary = false`. One primary per (entity, role).

---

## 3. Scope (V1)

### What V1 includes

- Manual creation of person actors via admin UI
- Manual linking to venues with role selection
- One actor can link to multiple venues (chef at two restaurants)
- One venue can have multiple person actors (chef + sommelier)
- Primary flag per role per venue
- Public actor page at `/actor/[slug]` (shared with operator actors)

### What V1 excludes

- No automated extraction from websites
- No historical/founding roles (former chef, opening chef)
- No temporal bounds (start_date, end_date on relationships)
- No confidence scoring below 1.0 (all manual = high confidence)
- No candidate review queue for person actors

### Scope decisions

| Decision | Rationale |
|---|---|
| Current roles only | Historical roles get muddy fast — "founding chef" vs "former chef" vs "consulting chef" |
| Manual entry only | People data from websites is noisy — titles change, pages go stale, multiple people per role |
| No extraction pipeline | Will be added in V1.5 as candidate generation, not auto-write |

---

## 4. Admin Interface

### Create Person: `/admin/actors/add-person`

Form fields:
- **Name** (required) — person's full name
- **Role** (required) — dropdown: Chef, Sommelier, Pastry Chef, Beverage Director, Wine Director
- **Link to venue** (optional) — typeahead search by venue name, links in same request
- **Website** (optional) — personal site
- **Description** (optional) — brief context

After creation, shows confirmation with link to actor page.

### API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/actors/create-person` | POST | Create Actor(kind=person) + optional venue link |
| `/api/admin/actors/[actorId]/link-place` | POST | Link existing actor to additional venue |

---

## 5. Future (V1.5 / V2)

### V1.5 — Extraction as candidate pipeline

Two extraction sources feed person-actor candidates:

**Website enrichment** detects person-role patterns from venue websites:
- "Executive Chef: John Smith"
- "Our sommelier, Jane Doe"
- "Wine Director: Alex Park"
- "led by chef Maria Lopez"

**Coverage source extraction** detects person-role patterns from editorial
articles (see COVERAGE-SOURCE-ENRICHMENT-V1). The `people` field in
`coverage_source_extractions` captures: name, role, context, isPrimary.
Coverage extraction uses an expanded role vocabulary including: chef,
executive_chef, sous_chef, pastry_chef, sommelier, beverage_director,
wine_director, bartender, general_manager, foh_director, foh_manager,
owner, founder, partner, operator.

Both sources generate **candidate observations**, not canonical actors.
Candidates go through:
1. Match against existing person actors
2. If match found → propose relationship for review
3. If no match → create review candidate (not auto-create actor)

### V2 — Temporal relationships

Add `startDate` / `endDate` to `PlaceActorRelationship`:
- Track chef transitions ("Walter Manzke at République since 2015")
- Enable historical queries ("who was the chef at X in 2020?")
- Express founding roles with time bounds

### V2 — Additional roles

Potential additions to the `ActorRole` enum (some already used in coverage
extraction's person vocabulary but not yet in the schema enum):
- `founding_chef`
- `consulting_chef`
- `bartender` — already in coverage extraction vocabulary
- `general_manager` — already in coverage extraction vocabulary
- `foh_director` — already in coverage extraction vocabulary
- `foh_manager` — already in coverage extraction vocabulary
- `creative_director`

---

## 6. Relationship to Operator Actors

Person actors and operator actors coexist in the same `Actor` table and `PlaceActorRelationship` system. They differ only in `kind` and typical `role`:

| Kind | Typical Roles | Ingestion |
|---|---|---|
| `operator` | operator, owner, parent, brand | Automated (URL ingestion pipeline) |
| `person` | chef, sommelier, pastry_chef, etc. | Manual (V1), candidate pipeline (V1.5) |

Both link to venues through `PlaceActorRelationship`. A venue can have both an operator actor and multiple person actors.

---

## 7. Files

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | ActorRole enum (5 new values) |
| `prisma/migrations/20260318100000_add_person_actor_roles/` | Migration |
| `app/admin/actors/add-person/page.tsx` | Admin create form |
| `app/api/admin/actors/create-person/route.ts` | Create API |
| `app/api/admin/actors/[actorId]/link-place/route.ts` | Link API |
| `lib/utils/actorSlug.ts` | Slug generation (shared) |
| `lib/actors/approveCandidate.ts` | Primary override logic (shared) |
