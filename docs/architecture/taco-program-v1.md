---
doc_id: SKAI-DOC-TACO-PROGRAM-V1
doc_type: architecture
status: active
title: "Taco Program — Format-Based Offering System v1"
owner: Bobby Ciccaglione
created: "2026-03-19"
last_updated: "2026-03-19"
project_id: SAIKO
summary: "Canonical specification for taco program. Format-based system anchored in subtype (filling + technique), with tortilla as co-equal structural component."
systems:
  - offering-programs
  - food-programs
related_docs:
  - docs/architecture/program-template-v1.md
  - docs/architecture/enrichment-model-v1.md
---

# Taco Program — v1 Specification

**Program Key:** `taco_program`
**Program Class:** `food`
**Status:** Active (2026-03-19)

---

## 1. Definition

The taco program represents a tortilla-based food format in which fillings are served within or on a tortilla, typically in handheld form.

The program is defined by the interaction of:

- **Taco subtype** (filling + technique) — PRIMARY AXIS
- **Tortilla system** (material + craft) — CO-EQUAL STRUCTURAL
- **Preparation method** — SUPPORTING
- **Salsa / accompaniment structure** — SUPPORTING

**Principle:** Taco is a **format program**, not a cuisine. It crosses cuisines and cultures.

---

## 2. Scope

### Included

- Street tacos (al pastor, asada, carnitas, barbacoa, etc.)
- Regional Mexican taco expressions (Sonoran, Baja, Yucatán, etc.)
- Guisado-style tacos
- Seafood tacos (mariscos, fish, shrimp)
- Fried tacos (tacos dorados, flautas, taquitos)
- Hybrid and contemporary tacos (K-Mex, Alta California, chef-driven)
- Pollo (chicken) tacos, vegetarian tacos

### Excluded

- Burritos (different format)
- Quesadillas (different format, unless taco-adjacent)
- Lettuce wraps or non-tortilla formats
- Non-handheld plated dishes using similar ingredients

---

## 3. Structural Model

### Primary Axis: Taco Subtype

**This is the organizing spine of the program.**

Taco subtype (filling + technique) is the strongest signal cluster and drives most differentiation:

| Subtype | Defining Characteristics |
|---------|---|
| **Al Pastor** | Vertical spit (trompo), marinated pork, achiote-forward |
| **Carnitas** | Braised/stewed pork, slow-cooked in fat |
| **Carne Asada** | Grilled beef, often mesquite or charcoal |
| **Birria** | Braised meat (beef/goat), consommé service |
| **Barbacoa** | Pit-cooked or braised, traditionally beef/lamb |
| **Seafood** | Fish, shrimp, octopus (mariscos) |
| **Guisado** | Stewed filling (vegetable, potato, chorizo-based) |
| **Pollo** | Chicken-based, various preparations |
| **Vegetarian** | Plant-based fillings (nopales, rajas, beans, etc.) |

### Secondary Axis: Tortilla System

**Co-equal but not dominant. Required structural component.**

Tortilla matters because it materially affects the program's execution and expression:

| Signal | Meaning |
|--------|---------|
| **Handmade Tortilla** | Made fresh, in-house or by partner |
| **Corn Tortilla** | Traditional, often preferred for flavor/tradition |
| **Flour Tortilla** | Sonoran/Northern tradition |
| **Nixtamalized Corn** | Traditional lime-treated process |
| **Heirloom Corn** | Premium sourced varieties |

### Tertiary Axis: Cooking Method

- **Trompo** (vertical spit for al pastor)
- **Mesquite / Charcoal Grill** (asada, carne)
- **Braised / Stewed** (carnitas, birria, guisado)
- **Fried** (tacos dorados, flautas, taquitos)

### Quaternary Axis: Accompaniment

- **Salsa Program** (house salsas, variety, heat levels)
- **Consommé Service** (birria-specific)

---

## 4. Signal Hierarchy

### Tier 1 — Identity (Program Trigger)

Indicates presence of a taco program.

- `taco_presence` — "tacos" detected on menu
- `taco_focus` — tacos are featured/prominent
- `taqueria_identity` — place identifies as taqueria or taco-centric

**Rule:** Any Tier 1 signal → program exists (at least "considered" maturity)

### Tier 2 — Primary Differentiation (Subtype Signals)

**These are the organizing spine.** Define what kind of taco program:

- `al_pastor_presence`
- `birria_presence`
- `carnitas_presence`
- `carne_asada_presence`
- `seafood_taco_presence` (mariscos)
- `guisado_presence`
- `barbacoa_presence`
- `pollo_taco_presence`
- `vegetarian_taco_presence`

**Rule:** 2+ subtype signals + structural support → "dedicated" maturity

### Tier 2b — Structural Execution Signals

#### Tortilla System

- `handmade_tortilla`
- `corn_tortilla_presence`
- `flour_tortilla_presence`
- `nixtamal_presence`
- `heirloom_corn_presence`

#### Cooking Method

- `trompo_presence` (al pastor spit)
- `mesquite_or_charcoal_grill`
- `braised_stewed_preparation`
- `fried_taco_presence`

#### Accompaniment

- `salsa_program`

**Rule:** Supporting structure signals elevate quality and depth within the program

### Tier 3 — Refinement & Expression

- `regional_style_reference` (Sonoran, Tijuana, Yucatán, etc.)
- `hybrid_taco_signal` (K-Mex, Alta California, etc.)
- `chef_driven_taco_signal`
- `tortilla_supplier_notability` (known molino or tortillería)

**Rule:** Tier 3 signals contextualize and enrich, do not override subtype

---

## 5. Maturity Model

### **Dedicated**

The place has a **focused, expressed taco program**.

**Triggered by:**

- `taco_specialist` signal
- **OR** 2+ strong subtype signals + supporting execution signals (tortilla, cooking method, salsa)

**Examples:**

- Leo's Tacos (al pastor + trompo + corn tortilla) → dedicated
- Sonoratown (asada + mesquite + Sonoran flour tortilla) → dedicated
- Mariscos Playa Hermosa (seafood tacos + fresh market sourcing) → dedicated

### **Considered**

The place **offers tacos meaningfully** but not as core identity.

**Triggered by:**

- Any Tier 1 signal (taco_presence, taco_focus)

**Examples:**

- Mexican restaurant with strong taco menu but broader focus → considered
- Casual spots with 2-3 taco options → considered

### **Unknown**

No meaningful taco signals detected.

---

## 6. Key Principles

### Principle 1: Taco is a Format, Not a Cuisine

Taco exists across multiple cuisines and regions. Cuisine is modeled separately.

**Example:**
- An Italian restaurant could theoretically serve tacos (format)
- Tacos appear in Oaxacan, Sonoran, and Baja traditions (regional variations)
- Taco program is orthogonal to cuisine classification

### Principle 2: Subtype is the Organizing Spine

Al pastor, birria, carnitas, etc. define the primary structure.

**Important:** These are not separate programs.

All taco variations live within `taco_program`. The subtype is **a signal cluster within the program**, not a program boundary.

### Principle 3: Tortilla is Structural, Not Decorative

- Tortilla is a required component
- Tortilla quality materially affects the program
- Tortilla carries regional and technical meaning

**BUT:**

Tortilla does not override subtype as the primary axis. A handmade-tortilla taqueria with weak subtype signals is still "considered," not elevated to "dedicated."

### Principle 4: No Subtype → No Program Fragmentation

We do not create:
- `birria_program`
- `al_pastor_program`
- `carnitas_program`

All variations live within `taco_program`. This prevents taxonomy explosion while preserving signal richness.

### Principle 5: Regional Identity is Contextual

Sonoran, Tijuana, Yucatán, etc. are **signals**, not programs.

**Example:**
- "Sonoran taco" = taco_program + regional_style_reference signal
- Not a separate program

### Principle 6: Supports Full Spectrum

The taco program spans:

- Street vendors and truck spots
- Casual taquerias
- Sit-down restaurants
- Chef-driven contemporary concepts

All within one coherent system.

---

## 7. Real-World Examples

### Example 1: Leo's Tacos (Al Pastor Stand)

| Signal | Presence |
|--------|----------|
| taco_presence | ✅ |
| al_pastor_presence | ✅ |
| trompo_presence | ✅ |
| corn_tortilla_presence | ✅ |

**Maturity:** **Dedicated** (al pastor subtype + cooking method + tortilla structure)

---

### Example 2: Sonoratown (Regional Taqueria)

| Signal | Presence |
|--------|----------|
| taco_focus | ✅ |
| carne_asada_presence | ✅ |
| flour_tortilla_presence | ✅ |
| mesquite_or_charcoal_grill | ✅ |
| regional_style_reference (Sonoran) | ✅ |

**Maturity:** **Dedicated** (asada subtype + Sonoran tortilla system + grill method)

---

### Example 3: Mariscos Playa Hermosa (Seafood Taqueria)

| Signal | Presence |
|--------|----------|
| taqueria_identity | ✅ |
| seafood_taco_presence | ✅ |
| handmade_tortilla | ✅ |
| salsa_program | ✅ |

**Maturity:** **Dedicated** (seafood subtype + handmade tortillas + salsa depth)

---

### Example 4: Generic Mexican Restaurant with Tacos

| Signal | Presence |
|--------|----------|
| taco_presence | ✅ |
| *weak subtype signals* | ⚠️ |
| *no notable tortilla/structure signals* | ⚠️ |

**Maturity:** **Considered** (tacos available, but not a focused program)

---

## 8. Program Integrity Stress Tests

### Test 1: High Tortilla Craft, Weak Subtype

**Scenario:** A contemporary restaurant with exceptional handmade heirloom-corn tortillas but taco offerings are varied and not signature.

**Result:** Tortilla signals elevate within program, but subtype weakness means maturity stays "considered" (not upgraded to "dedicated").

**Why:** Tortilla is structural, not organizing. Subtype defines program identity.

### Test 2: Single Strong Subtype + Excellent Structure

**Scenario:** Al pastor specialist with premium trompo, corn tortillas, perfect salsas.

**Result:** "Dedicated" (single strong subtype + complete supporting structure).

**Why:** Subtype + structure is sufficient; does not require 2+ subtypes.

### Test 3: Multiple Subtypes, Weak Structure

**Scenario:** Restaurant with 5 taco subtypes (asada, carnitas, birria, pollo, vegetarian) but generic tortillas and limited salsa program.

**Result:** "Considered" or borderline "dedicated" depending on signal density.

**Why:** Subtype breadth helps, but structure matters. Many signals = higher confidence in "dedicated."

### Test 4: Format Boundary

**Scenario:** Same restaurant also serves burritos prominently.

**Result:** Tacos and burritos score separately.

- `taco_program` based on taco signals
- Burritos do not bleed into taco program (different format)

---

## 9. Signal Coverage: Current Status

**Signals Defined:** 34 total

| Tier | Count | Status |
|------|-------|--------|
| Tier 1 | 3 | ✅ Ready for extraction |
| Tier 2 (Subtypes) | 9 | ⚠️ Partial (keyword-based) |
| Tier 2b (Structure) | 10 | ⚠️ Needs menu context |
| Tier 3 (Refinement) | 4 | ⚠️ Needs semantic understanding |

### Signal Extraction Notes

- **Tier 1:** "tacos", "taqueria" keywords → Ready
- **Tier 2:** Subtype keywords ("al pastor", "birria", "carnitas") → Ready, keyword-based
- **Tier 2b:** Tortilla/cooking signals ("handmade", "trompo", "mesquite") → Needs menu context
- **Tier 3:** Regional references ("Sonoran", "Oaxacan") → Works via keyword, needs semantic understanding for context

---

## 10. Comparison: Taco vs Dumpling vs Sushi vs Ramen

| Aspect | Dumpling | Sushi | Ramen | Taco |
|--------|----------|-------|-------|------|
| **Program Type** | Format + Filling | Format + Technique | Format + Broth | Format + Subtype |
| **Primary Axis** | Subtype (jiaozi, xlb, etc.) | Technique (omakase, nigiri) | Broth system | Subtype (asada, birria) |
| **Secondary Axis** | Cooking (fried, steamed) | Sourcing | Noodle quality | Tortilla system |
| **Signal Count** | 14 | 14 | 13 | 34 |
| **Spanning Scope** | Asian cuisines | Japanese + hybrid | Japanese + Asian | Latin + contemporary |

**Result:** All four programs follow coherent signal + maturity logic. Taco has higher signal count due to regional variation and broader cultural expression.

---

## 11. Canonical Maturity Assignments (LA Anchors)

| Place | Subtype | Maturity | Notes |
|---|---|---|---|
| **Leo's Tacos** | al pastor | dedicated | Trompo + corn tortilla |
| **Sonoratown** | asada | dedicated | Mesquite + Sonoran flour |
| **Tacos 1986** | carne asada | dedicated | Charcoal grill + corn |
| **Mariscos Playa Hermosa** | seafood | dedicated | Fresh sourcing + handmade |
| **Al Waha** | mixed | considered | Multiple subtypes, weaker structure |
| **Guelaguetza** | mixed (Oaxacan) | considered | Guisado focus but broader menu |

---

## 12. Next Steps & Future Iteration

### Short-term (Post-Launch)

- Map 10-15 real LA taco spots into schema
- Audit signal coverage (what % of signals are detectable?)
- Refine Tier 2b extraction logic (tortilla, cooking method from menu context)

### Medium-term

- Consider `tortilla_quality` as composite signal (craft level + sourcing + material type)
- Break `salsa_program` into sub-signals (heat levels, house-made, variety)
- Explore upstream signal: tortillería partnerships or sourcing relationships

### Long-term

- Cross-cuisine regional taco variants (Korean, Filipino, Indian tacos)
- Contemporary / fusion taco expressions (quantify vs confuse with chef_driven_taco_signal)
- Confidence scoring per subtype (al pastor may have stronger signals than vegetarian tacos)

---

## Summary

The taco program is a **format-based system anchored in subtype** (filling + technique), **supported by tortilla craft and preparation method**, and **enriched by regional and cultural context**.

It is designed to:

✅ Avoid fragmentation into micro-programs
✅ Preserve cultural specificity (Sonoran, Tijuana, Oaxacan)
✅ Scale across diverse taco expressions (street → chef-driven)
✅ Remain structurally consistent with other programs (dumpling, sushi, ramen)
✅ Support the full spectrum of taco culture in LA and beyond

**Status:** Specification locked, ready for signal extraction and real-world validation.

---

**Document Status:** Active
**Next Review:** Post-validation (10+ LA places mapped)
