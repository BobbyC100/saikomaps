---
doc_id: OS-OFFERING-SIGNALS-V1
doc_type: domain-spec
status: active
owner: Bobby Ciccaglione
created: '2026-03-10'
last_updated: '2026-03-10'
project_id: TRACES
systems:
  - offering-signals
  - traces
summary: ''
---
# Offering Signals v1

## 1. Purpose

Offering Signals convert messy raw sources — menus, wine lists, editorial coverage, and merchant text — into atomic, confidence-scored facts about a place. They are the structured intermediary between unstructured data and rendered UI.

TRACES consumes these signals to decide what to say about a place, at what depth, and in what order. Signals are not prose; they are facts with provenance. The rendering layer (TRACES) is responsible for turning signals into natural language.

---

## 2. Core Principles

- **Atomic** — one fact per signal. A signal records a single, specific claim about a place's offering.
- **Queryable and composable** — signals can be filtered, ranked, and combined programmatically without parsing free text.
- **Confidence scored** — every signal carries a `confidence` value (0–1) reflecting source reliability and extraction certainty.
- **Source traceable** — every signal records where it came from (`sourceType`, `sourceUrl`, `extractedAt`), enabling audits and re-extraction.

---

## 3. Four-Layer Model

### Food Signals
Facts about what a place serves and how it cooks: cuisine posture, cooking method, dish and ingredient focus, menu format, meal focus.

### Beverage Signals
Facts about the drinks program: wine depth and style, cocktail program type, beer selection, non-alcoholic options.

### Service Signals
Facts about how a place operates for guests: reservation model, walk-in policy, seating format, pacing, and sharing style.

### Event Signals (added 2026-03-18)
Facts about how a place can be used for private, group, and off-site experiences: private dining rooms, buyouts, group menus, catering capabilities, events coordination. Event signals feed three program containers (`private_dining_program`, `group_dining_program`, `catering_program`) using the same maturity model as beverage programs. See `ARCH-EVENTS-PROGRAM-V1` and the Signals Registry for full definitions.

---

## 4. Priority Tiers

Signals are classified into three tiers that drive both extraction priority and rendering logic.

### Tier 1 — Identity
The most essential facts that define what a place fundamentally is. Examples: `cuisine_posture`, `wine_program_intent`, `reservation_model`.

Tier 1 signals are extracted first and are required before lower tiers are pursued. A confident Tier 1 result gates further crawling (see Stop-Early Rule below).

### Tier 2 — Distinctive
Facts that differentiate a place within its category. Examples: `wine_region_focus`, `cooking_method`, `dish_focus`, `cocktail_program`.

Tier 2 signals add specificity to identity. One or two strong Tier 2 signals are sufficient for most rendering contexts.

### Tier 3 — Detail
Granular facts that add depth for users who want more. Examples: `ingredient_focus`, `wine_style_focus`, `pacing_style`, `sharing_style`.

Tier 3 signals are rendered only in expanded or detail contexts and are not required for baseline coverage.

---

## 5. Crawl / Extraction Policy

Sources are crawled and signals extracted in priority order:

1. **Menu / wine list** (highest signal density for food and beverage tiers)
2. **Editorial coverage** (coverage_sources excerpts, press, guides)
3. **Secondary sources** (merchant website meta, about text)

Within each source, extraction proceeds from most specific signals to most general — attempting Tier 1 first, then Tier 2, then Tier 3.

### Stop-Early Rule

If at any point the following conditions are met, do not crawl additional sources:

- At least one Tier 1 (Identity) signal with confidence ≥ 0.7
- At least one or two Tier 2 (Distinctive) signals with confidence ≥ 0.6

Continuing to crawl beyond this threshold risks over-indexing on secondary sources and inflating lower-confidence signals.

---

## 6. Instagram Rule

Instagram bios are treated as **operational merchant signals** — not narrative descriptions.

Content extracted from Instagram bios is appropriate for: hours, reservation/walk-in policy, address, and service model signals. It is **not** appropriate for food, beverage, or identity signals, which require higher-fidelity sources (menus, editorial, website).

See also: `docs/voice/saiko-voice-layer.md` for the merchant text cleaning policy.

---

## 7. Voice Tone Rule

Food and beverage signal values — and any prose generated from them — should reflect a knowledgeable but casual register. The target tone is **restaurant conversation**: the way a well-informed friend describes a place, not the way a critic reviews it.

Avoid:
- Superlatives ("exceptional", "curated", "innovative")
- Passive constructions ("is known for", "has been described as")
- Marketing language ("destination dining", "thoughtfully sourced")

Prefer:
- Direct, specific claims ("natural-leaning wine list", "no-res counter only", "seafood-forward small plates")

---

## 8. Signal Vocabulary (v1)

### Food Signals

| Signal type | Description |
|---|---|
| `cuisine_posture` | Broad culinary identity (e.g. Japanese, Italian-American, New American) |
| `menu_format` | How the menu is structured (tasting menu, à la carte, counter, etc.) |
| `cooking_method` | Dominant preparation style (wood-fired, raw bar, live-fire, etc.) |
| `dish_focus` | Primary dish category emphasis (pasta, seafood, charcuterie, etc.) |
| `ingredient_focus` | Key ingredients or sourcing emphasis (seasonal produce, dry-aged beef, etc.) |
| `meal_focus` | Meal occasions the place primarily serves (dinner-only, lunch, all-day, etc.) |

### Beverage Signals

| Signal type | Description |
|---|---|
| `wine_program_intent` | High-level character of the wine program (natural-leaning, classic, etc.) |
| `wine_program_type` | Program format (by-the-glass focused, bottle-forward, etc.) |
| `wine_region_focus` | Regional concentration if any (Burgundy-heavy, California-centric, etc.) |
| `wine_style_focus` | Style emphasis within the program (skin-contact, lo-fi, Old World, etc.) |
| `wine_program_depth` | List depth signal (deep, concise, rotating, etc.) |
| `wine_service_model` | How wine is served (sommelier-driven, self-select, poured-by-server, etc.) |
| `cocktail_program` | Cocktail program character (classic-focused, original cocktails, none, etc.) |
| `beer_program` | Beer selection character (craft, macro-only, rotating taps, etc.) |
| `na_program` | Whether a non-alcoholic program exists and its character |
| `na_beer` | Specific NA beer presence |
| `na_wine` | Specific NA wine presence |
| `na_cocktails` | Specific NA cocktail presence |

### Service Signals

| Signal type | Description |
|---|---|
| `reservation_model` | How reservations work (required, recommended, not taken, etc.) |
| `walk_in_policy` | Walk-in availability and nature (counter walk-in, bar only, etc.) |
| `seating_format` | Seating style (counter, communal, table service, bar-only, etc.) |
| `sharing_style` | Whether dishes are designed to share (sharing-forward, individual plates, etc.) |
| `pacing_style` | How the meal progresses (courses-driven, all-at-once, guest-controlled, etc.) |

---

## 9. V2 Direction

Future improvements to the Offering Signals system will focus on three areas:

**Context-aware rendering** — signals will be rendered differently depending on the user's intent profile and session context. A user in discovery mode gets a high-level identity read; a user who has already viewed the menu gets Tier 2 specifics surfaced.

**Signal freshness decay** — signals extracted from older sources will carry a time-weighted confidence penalty. Menu signals older than 90 days or editorial signals older than 12 months will be flagged for re-extraction before rendering.

**Device-aware description modes** — short-form signals (mobile, cards) will draw from Tier 1 only; expanded signals (full place page, desktop) will layer in Tier 2 and Tier 3 where available.
