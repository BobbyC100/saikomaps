---
doc_id: FIELDS-VERTICAL-TAXONOMY-V1
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: 2026-03-12
last_updated: 2026-03-12
project_id: SAIKO
systems:
  - fields-data-layer
  - entity-resolution
related_docs:
  - docs/architecture/entity-pipeline-overview-v1.md
  - docs/architecture/fields-era-overview-v1.md
  - docs/FIELDS_V2_TARGET_ARCHITECTURE.md
summary: Defines Saiko's 12-vertical taxonomy — the primary domains of urban life used to classify every place in the system. Documents anthropological rationale, system role, technical anchors, and design implications.
---

# Saiko Vertical Taxonomy

**Anthropological Rationale and System Role**

**System:** Fields Data Layer / Saiko Maps
**Status:** Active
**Applies to:** Fields, Traces, Saiko Maps

---

## 1. Purpose

The Saiko Vertical Taxonomy defines the primary domains of everyday life in a city.

It organizes places according to how they participate in human living — not according to traditional business categories.

Most mapping platforms categorize places by industry classification:

- Restaurant
- Retail
- Hotel
- Entertainment

Saiko instead categorizes places by **human activity domain**.

This approach reflects the underlying philosophy of Saiko: mapping the places that contribute to how people live well in a city.

A place appears on Saiko not because it exists, but because it meaningfully contributes to lived experience.

---

## 2. The 12 Vertical Domains

Saiko uses twelve verticals to represent the primary domains of urban life.

| Vertical | Display Label | Identity Noun |
|----------|--------------|---------------|
| `EAT` | Restaurant | restaurant |
| `COFFEE` | Coffee | café |
| `WINE` | Wine Bar | wine bar |
| `DRINKS` | Bar | bar |
| `BAKERY` | Bakery | bakery |
| `STAY` | Hotel | hotel |
| `SHOP` | Shop | shop |
| `CULTURE` | Culture | gallery |
| `WELLNESS` | Wellness | spa |
| `PURVEYORS` | Purveyor | market |
| `NATURE` | Nature | park |
| `ACTIVITY` | Activity | venue |

Each vertical represents a type of lived interaction with the city.

Together they form a minimal but complete model of the places people repeatedly move through in everyday life.

---

## 3. Anthropological Perspective

Anthropologists often study cities through activity systems rather than industries.

These systems describe how people obtain resources, socialize, care for themselves, and experience culture.

Viewed through this lens, the Saiko taxonomy maps the **infrastructure of daily life**.

### Provisioning
How people obtain food and everyday resources.
- `EAT` · `BAKERY` · `PURVEYORS` · `COFFEE`

### Social Gathering
Where people gather and interact.
- `WINE` · `DRINKS` · `COFFEE`

### Dwelling and Travel
Where people temporarily live.
- `STAY`

### Material Culture
Where objects circulate and become part of daily life.
- `SHOP`

### Cultural Expression
Spaces where art, performance, and meaning are produced.
- `CULTURE`

### Care of the Body
Spaces dedicated to maintaining physical and mental wellbeing.
- `WELLNESS`

### Landscape Interaction
Where people interact with the natural environment.
- `NATURE`

### Recreation and Movement
Places where people participate in physical activity or sport.
- `ACTIVITY`

> Note: `COFFEE` spans both Provisioning and Social Gathering. This dual role is intentional — the café functions as both a resource (daily caffeine) and a place of habitual social presence. This ambiguity reflects reality rather than a classification error.

This framework reflects the reality that cities are not simply collections of businesses — they are **systems of living environments**.

---

## 4. Why Twelve

The taxonomy intentionally balances three constraints:

- **Clarity** — each vertical is legible and non-overlapping in practice
- **Coverage** — the full range of urban lived experience is represented
- **Cognitive simplicity** — twelve is navigable without a lookup

Too many categories produce noise. Too few erase meaningful distinctions.

Twelve verticals provide enough resolution to represent the diversity of urban life while remaining intuitive for navigation and discovery.

They also map well onto natural mental models people already use when exploring a city:

- finding somewhere to eat
- getting coffee
- going out for drinks
- visiting a gallery
- going to the park

---

## 5. Technical Anchors

The taxonomy is defined in three places in the codebase. These are the sources of truth.

### `lib/primaryVertical.ts`
- `PRIMARY_VERTICALS` — the canonical array of all 12 valid values (used for validation and dropdowns)
- `VERTICAL_DISPLAY` — maps each vertical to its UI display label
- `categoryToPrimaryVertical()` — maps legacy string categories to the enum
- `resolvePrimaryVertical()` — resolves vertical from category + Google types, defaults to `EAT`

### `prisma/schema.prisma` → `PrimaryVertical` enum
The database-level enum. All entities store `primary_vertical` using this enum. `CANDIDATE` is the intake status for newly-created, pre-enrichment entities.

### `lib/contracts/place-page.identity.ts`
Defines the `SaikoCategory` type used at the API and display layer. Currently mirrors the 12 verticals (lowercased).

### Note on Dual Types
There are two parallel types in the codebase:

- **`PrimaryVertical`** (`@prisma/client`) — 12 uppercase enum values; used at write time, storage, and validation
- **`SaikoCategory`** — 11–12 lowercase string literals; used at read time and in display contracts

They cover the same domain. When modifying the taxonomy, both must be updated together.

---

## 6. Relationship to the Fields Data Layer

In the Saiko architecture, the taxonomy lives primarily in **Fields**.

Fields is the place data infrastructure layer.

The vertical system serves several roles:

### Identity Classification
Each place has a `primary_vertical` that describes its core social function.

```
Gjelina        → EAT
Intelligentsia  → COFFEE
Silverlake Wine → WINE
```

### Query Organization
Verticals provide a stable dimension for discovery queries.

```
coffee near me
wine bars in echo park
parks in los angeles
```

### Data Modeling
Verticals sit at the top of the place type hierarchy, above more specific place types.

```
vertical: EAT      →  place_type: restaurant
vertical: CULTURE  →  place_type: gallery
```

---

## 7. Relationship to Traces

**Traces** is the planned consumer layer that interprets Fields data into lived experiences.

Within Traces, verticals help define experience surfaces:

```
EAT      → dining scenes
COFFEE   → daily ritual spaces
WINE     → slow evening social spaces
NATURE   → outdoor exploration
```

Verticals therefore act as the structural bridge between raw place data and lived experiences.

> **Fields** defines the place.
> **Traces** interprets the place within the context of human life.

---

## 8. Relationship to Saiko Philosophy

Saiko is not intended to be a comprehensive directory of businesses.

Instead, it is a curated map of places that meaningfully contribute to how people live well in a city.

**Inclusion itself implies recommendation.**

The taxonomy therefore organizes places that Saiko stands behind, not the entire universe of locations.

The result is a map that reflects lived culture rather than commercial inventory.

---

## 9. Design Implications

The vertical system influences several parts of the product.

### Navigation
Verticals become natural discovery entry points.

```
Eat · Coffee · Wine · Culture · Nature
```

### Editorial Structure
Verticals provide the foundation for lists, collections, and curated surfaces.

```
Best Coffee in LA
Great Wine Bars
Sunday Parks
```

### Data Signals
Certain signals are more relevant to certain verticals.

```
EAT     → menu signals, dining occasion
WINE    → wine list signals, pour style
NATURE  → landscape signals, public access
```

---

## 10. Future Evolution

The vertical taxonomy is expected to remain **relatively stable**.

Two additional layers may evolve over time:

- **Place Type** — more specific classification within a vertical (e.g., `restaurant → bistro, tasting menu, counter`)
- **Experience Signals** — vertical-specific attribute sets for discovery and matching

Example future structure:

```
vertical:           CULTURE
place_type:         museum
experience_signals: contemporary, architecture, public
```

This layered approach allows the system to grow without modifying the core taxonomy.

**What's already in place:**
- `PrimaryVertical` enum is stable and validated at intake
- `resolvePrimaryVertical()` handles legacy and unknown inputs with a safe `EAT` default
- `VERTICAL_DISPLAY` drives UI rendering

**What's not yet built for multi-vertical expansion:**
- Vertical-aware ERA enrichment signals (Stage 5 AI extraction currently targets EAT)
- Intake form vertical selector (currently hardcoded to `EAT`)
- Vertical-specific Programs model (price tier, service model, etc.)

---

## 11. Guiding Principle

The Saiko vertical taxonomy organizes places according to how people experience a city.

It models urban life as a set of recurring domains:

> eating · gathering · dwelling · moving · creating · resting

The map therefore reflects the structure of everyday living rather than the structure of commerce.
