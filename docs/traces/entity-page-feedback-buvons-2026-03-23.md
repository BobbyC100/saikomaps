---
doc_id: TRACE-ENTITY-PAGE-FEEDBACK-BUVONS-2026-03-23
doc_type: trace
status: active
owner: Bobby Ciccaglione
created: 2026-03-23
last_updated: 2026-03-25
project_id: SAIKO
systems:
  - traces
  - entity-page
related_docs:
  - docs/traces/entity-page-structural-fixes-v1.md
summary: >
  Production review notes for Buvons entity page voice/copy quality, including
  issues discovered, fixes shipped, and remaining follow-up items.
---

# Entity Page Voice/Copy Feedback — Buvons (2026-03-23)

> Source: Bobby's live review of Buvons entity page on production.
> Status: PARTIALLY RESOLVED (updated 2026-03-25) — major page fixes shipped; remaining items are broader system/design follow-ups.

---

## Entity Context

Buvons is a natural wine bar, wine shop, and restaurant. The wine shop and wine bar share one space; the restaurant is in another. They have two addresses, and the shop has different hours than the restaurant.

---

## Issues Found

### 1. Tagline duplicates neighborhood (Long Beach appears twice)

**Current rendering:**
```
Buvons
RESTAURANT IN LONG BEACH                    ← identity subline
Natural wine. Small producers. French-Mediterranean cooking. Long Beach.   ← tagline
```

**Problem:** "Long Beach" appears in the identity subline AND at the end of the tagline. Can't have both.

**Fix needed:** Strip neighborhood from tagline when identity subline already contains it — OR — remove neighborhood from one of the two. Decision: TBD (likely strip from tagline since identity subline owns location).

**Files:** `page.tsx` (tagline rendering, ~line 827–829), possibly tagline generation pipeline.

---

### 2. "Concept-driven" is a data leak

**Current rendering:**
```
ABOUT
Buvons is a natural wine bar, bottle shop, and restaurant in Long Beach...
Concept-driven                               ← origin story accent line
```

**Problem:** `originStoryType` value ("concept-first" → "Concept-driven") is rendering as a visible accent line. This is an internal classification token, not user-facing copy. Data leak.

**Fix needed:** Remove the origin story accent line from rendering entirely. The `ORIGIN_STORY_PHRASES` block and its render logic (page.tsx ~line 901–903) should be removed or gated behind a flag.

**Files:** `page.tsx` lines 901–903 (render), lines 375–382 (phrase map).

---

### 3. Offering lines are too terse — need to be sentence-length

**Current rendering:**
```
OFFERING
Food       Broadly composed menu
Wine       Considered wine selection
Service    À la carte ordering
```

**Problem:** These read as labels, not sentences. They should be richer — a sentence each that actually tells you something about the experience.

**What "sentence-length" looks like (directional):**
- Food: "Broadly composed menu with seasonal, French-Mediterranean plates" (pulls in cuisine context)
- Wine: "Considered wine selection focused on small, natural producers" (pulls in identity signals)
- Service: "À la carte ordering — dishes arrive as they're ready" (adds experiential detail)

**Fix needed:** The `buildOfferingLines()` composition system needs to produce richer output. Current fallback paths (no signals, no posture) produce stub phrases. The function needs better sentence templates when signal data is thin.

**Files:** `page.tsx` `buildOfferingLines()` (~lines 428–587), phrase maps.

---

### 4. Scene section — is it duplicative?

**Current rendering:**
```
SCENE
Higher-end pricing
```

**Question from Bobby:** Is Scene showing info that's already elsewhere on the page? Price is already derivable from the Offering section. If Scene only contains price, it's adding an empty-feeling sidebar section for redundant info.

**Fix needed:** Audit what Scene renders vs what's already on the page. If Scene is only showing price (which is already an offering line), consider either enriching Scene with actual scene data or collapsing it when it would only duplicate.

**Files:** `page.tsx` lines 1068–1078 (Scene render), line 778 (priceText extraction).

---

### 5. Known For — pulling wrong data, needs proper wiring

**Current rendering:**
```
KNOWN FOR
Producers: Antoine Chevalier, Benjamin Taillandier, Fabien Jouves, Lassaigne, Marcel Lapierre
```

**Problem:** Known For is showing only key producers as a flat comma list. The section name implies broader knowledge (dishes, specialties, defining characteristics). The data wiring needs to be revisited — what should Known For actually contain, and is the current source (derived_signals.keyProducers) the right one?

**Files:** `page.tsx` lines 922–938 (Known For render).

---

### 6. Description also mentions Long Beach (triple redundancy)

**Current rendering:**
```
ABOUT
Buvons is a natural wine bar, bottle shop, and restaurant in Long Beach, California.
```

**Problem:** "Long Beach" now appears THREE times on the page: identity subline, tagline, and description. The description is merchant-sourced text (or synthesized), so stripping it there is harder — but the tagline fix (issue #1) should at minimum eliminate one instance.

---

## Implemented Since Review (2026-03-25)

- Tagline neighborhood dedupe added at render-time.
- Offering fallback improved so food program can still render when signal detail is thin.
- References index moved higher in the page.
- Coverage section moved above photos.
- People section added with reported-role framing.
- Buvons-specific role correction applied: Marie Delbarry surfaces as former role.
- Footer typo corrected to "Saiko Fields Los Angeles."
- Hero top spacing reduced; Known For typography normalized.

## Still Open / Follow-up

- Known For source strategy and composition depth remain product/policy follow-up.
- Pipeline-level description/tagline location constraints remain a generation-policy follow-up.

## Priority

These are voice/copy quality issues visible on production right now. They affect how Saiko presents its most enriched entities.

---

*Saved from Bobby's live review session — 2026-03-23*
