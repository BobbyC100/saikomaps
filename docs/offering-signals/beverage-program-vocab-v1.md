---
doc_id: OS-BEVERAGE-PROGRAM-VOCAB-V1
doc_type: specification
status: active
owner: Bobby Ciccaglione
created: '2026-03-14'
last_updated: '2026-03-14'
project_id: SAIKO
systems:
  - offering-signals
  - fields-data-layer
related_docs:
  - docs/offering-signals/offering-signals-v1.md
  - docs/scenesense/three-lenses-framework-v1.md
summary: >-
  Canonical beverage program model and signal vocabulary for derived offering
  enrichment. Defines 5 program containers, maturity scale, and locked signal
  sets for wine, beer, cocktail, non-alcoholic, and coffee/tea programs.
---

# Beverage Program + Signal Vocabulary (v1)

**System:** Saiko Fields / TRACES
**Status:** Working Lock

**Purpose:** Define the canonical beverage program model and the initial signal vocabulary for derived offering enrichment.

---

## 1. Scope

This document locks the **beverage-side program model** for Traces.

It does **not** define UI copy.
It does **not** define SceneSense interpretation.
It does **not** replace the broader Fields signal taxonomy.

It defines:

- beverage program containers
- beverage signal vocabulary
- naming conventions
- maturity usage
- localization rule

---

## 2. Core Rule

Programs are **stable derived containers**.
Signals are **derived descriptors** that feed those programs.
Facts / atomic observations remain in Fields.

The stack is:

```
Atomic / observable facts
  → derived beverage signals
    → derived beverage programs
      → interpretation / rendering
```

---

## 3. Beverage Program Containers (Locked)

These are the canonical beverage program containers inside the derived offering model.

- `wine_program`
- `beer_program`
- `cocktail_program`
- `non_alcoholic_program`
- `coffee_tea_program`

These containers are **global** and should remain stable across markets.
They are peers under the broader beverage layer.

---

## 4. Program Maturity Scale (Locked)

All beverage programs use the same maturity scale:

- `none`
- `incidental`
- `considered`
- `dedicated`
- `unknown`

Definitions:

- `none` = clear evidence the program is absent
- `incidental` = present, but not a meaningful part of the entity's identity
- `considered` = intentional and relevant to the offering
- `dedicated` = clearly a defining program
- `unknown` = insufficient evidence

This scale measures **intentionality / centrality**, not size alone.

---

## 5. Wine Program Signals (Locked v1)

Canonical signals:

- `extensive_wine_list`
- `natural_wine_presence`
- `aperitif_focus`

Notes:

- `aperitif_focus` belongs to `wine_program`, not `cocktail_program`
- future market-local wine signals may be added without changing the program container
- examples of future localized wine signals: `vin_au_verre_presence`, `champagne_focus`, `sake_presence` (if later split or mapped carefully)

---

## 6. Beer Program Signals (Locked v1)

Canonical signals:

- `beer_program`

Notes:

- beer is a first-class beverage program container
- v1 remains shallow
- future expansion may add signals such as:
  - `craft_beer_presence`
  - `draft_beer_focus`
  - `brewery_affiliation`
  - `na_beer_presence` (if not kept under non-alcoholic only)

---

## 7. Cocktail Program Signals (Locked v1)

Canonical signals:

- `cocktail_program`

Notes:

- `aperitif_focus` is not a cocktail signal
- v1 cocktail treatment is intentionally shallow
- future expansion may add:
  - `classic_cocktail_focus`
  - `house_cocktail_focus`
  - `tiki_program`
  - `martini_focus`

---

## 8. Non-Alcoholic Program Signals (Locked v1)

Canonical signals:

- `basic_na_beverages`
- `agua_fresca_program`
- `horchata_presence`
- `house_soda_program`
- `zero_proof_cocktails`
- `na_spirits_presence`
- `na_beer_wine_presence`
- `functional_beverage_presence`
- `fermented_beverage_presence`
- `cultural_soda_presence`

Definitions:

- `basic_na_beverages` = default soft drinks / basic non-alcoholic beverages
- `agua_fresca_program` = aguas frescas as an intentional beverage offering
- `horchata_presence` = horchata explicitly present
- `house_soda_program` = house-made soda / lemonade / similar
- `zero_proof_cocktails` = structured spirit-free / non-alcoholic cocktail program
- `na_spirits_presence` = NA spirits or direct analogue bottles used
- `na_beer_wine_presence` = NA beer and/or NA wine offered
- `functional_beverage_presence` = adaptogen / nootropic / wellness beverage offering
- `fermented_beverage_presence` = kombucha / shrubs / vinegar drinks / similar
- `cultural_soda_presence` = Mexican Coke, Jarritos, Topo Chico, or similar culturally specific soft drinks

Notes:

- NA drinks do not automatically imply an NA program
- taco trucks and similar entities may have `cultural_soda_presence` or `horchata_presence` while remaining only `incidental` at the program level
- dedicated sober bars are a different entity pattern and should not be confused with incidental NA coverage inside restaurants

---

## 9. Coffee / Tea Program Signals (Locked v1)

Canonical signals:

- `coffee_program`
- `espresso_program`
- `specialty_coffee_presence`
- `tea_program`
- `specialty_tea_presence`
- `matcha_program`
- `bubble_tea_program`
- `bubble_tea_chain`
- `tea_house_structure`
- `afternoon_tea_service`
- `arabic_coffee_program`

Definitions:

- `coffee_program` = coffee is present as a menu offering
- `espresso_program` = espresso-based drinks are a meaningful part of the menu
- `specialty_coffee_presence` = third-wave / single-origin / pour-over / roaster-driven coffee
- `tea_program` = tea is present beyond minimal default service
- `specialty_tea_presence` = curated tea list / loose-leaf / notable tea focus
- `matcha_program` = matcha is a meaningful beverage signal
- `bubble_tea_program` = bubble tea / boba is a defining beverage format
- `bubble_tea_chain` = large-format standardized chain boba pattern
- `tea_house_structure` = venue structurally organized around tea
- `afternoon_tea_service` = formal tea service program
- `arabic_coffee_program` = Yemeni / Arabic coffee tradition is a defining beverage signal

Notes:

- boba belongs inside `coffee_tea_program`, not its own program container
- backend canonical term is `bubble_tea_program`
- local UI language may render this as "Boba" in Los Angeles
- tea remains inside `coffee_tea_program` for v1 and is not split into a separate top-level program

---

## 10. Naming Convention (Locked)

Backend signal names should use **canonical descriptive language**, not local slang.

Rules:

1. use lowercase snake_case
2. prefer descriptive beverage formats over brand language
3. prefer globally portable naming in backend vocabulary
4. allow local rendering in UI / voice
5. avoid interpretation terms in signal names

Examples:

- use `bubble_tea_program`, not `boba_program`
- use `arabic_coffee_program`, not `jalsa_style`
- use `afternoon_tea_service`, not `high_tea_vibes`
- use `natural_wine_presence`, not `cool_wine_list`

---

## 11. Localization Rule (Locked)

Beverage programs are **global containers**.
Signals may be **global or market-local**.

Rule:

```
Global schema
Local signal vocabulary
Shared evidence / confidence model
```

Examples:

Los Angeles may use:
- `agua_fresca_program`
- `bubble_tea_program`
- `natural_wine_presence`

Paris may later use:
- `vin_au_verre_presence`
- `apero_structure`

Tokyo may later use:
- `kissaten_style`
- `sake_presence`

These all map into the same global beverage program containers.
Localization affects **signals**, not **program containers**.

---

## 12. Assembly Principle (Locked)

Programs are derived summaries of beverage signals.

Program output should include:
- `maturity`
- `signals`
- `confidence`
- `evidence`

Program evidence must be scoped only to the signals that feed that program.
No cross-program evidence bleed is allowed.

---

## 13. What Is Explicitly Out of Scope for v1

Not part of this lock:

- deep wine producer extraction
- importer / distributor inference
- cocktail style taxonomy
- coffee origin taxonomy
- tea lineage taxonomy
- detailed service posture interpretation
- consumer-facing label language
- SceneSense usage rules

These may come later, but are not required for Beverage Program Vocabulary v1.

---

## 14. Locked Summary

Program containers locked:
- `wine_program`
- `beer_program`
- `cocktail_program`
- `non_alcoholic_program`
- `coffee_tea_program`

Signal sets locked for v1:

**Wine:** `extensive_wine_list`, `natural_wine_presence`, `aperitif_focus`

**Beer:** `beer_program`

**Cocktail:** `cocktail_program`

**Non-Alcoholic:** `basic_na_beverages`, `agua_fresca_program`, `horchata_presence`, `house_soda_program`, `zero_proof_cocktails`, `na_spirits_presence`, `na_beer_wine_presence`, `functional_beverage_presence`, `fermented_beverage_presence`, `cultural_soda_presence`

**Coffee / Tea:** `coffee_program`, `espresso_program`, `specialty_coffee_presence`, `tea_program`, `specialty_tea_presence`, `matcha_program`, `bubble_tea_program`, `bubble_tea_chain`, `tea_house_structure`, `afternoon_tea_service`, `arabic_coffee_program`

Maturity scale locked: `none`, `incidental`, `considered`, `dedicated`, `unknown`
