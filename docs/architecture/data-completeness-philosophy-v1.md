---
doc_id: ARCH-DATA-COMPLETENESS-PHILOSOPHY-V1
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: 2026-03-18
last_updated: 2026-03-18
systems:
  - fields
  - coverage-ops
  - enrichment
related_docs:
  - ARCH-IDENTITY-SCORING-V1
  - ARCH-COVERAGE-TIERS-V1
  - ENRICH-STRATEGY-V1
summary: >
  Saiko's philosophy on data completeness — composite confidence over checklists,
  multiple paths to the same truth, and no single golden field.
---

# Data Completeness Philosophy

## Core Principle

**There is no single piece of golden data.**

Identity, location, and completeness are never determined by the presence or
absence of any one field. They are composite assessments built from whatever
signals are available. A taco cart with an Instagram handle and a neighborhood
is just as identified as a Michelin restaurant with a Google Place ID.

## Identity Is Composite

Identity confidence comes from the *combination* of available anchors, not a
checklist of required fields.

The weighted anchor model (ARCH-IDENTITY-SCORING-V1) defines this:

| Anchor | Weight | Why it matters |
|--------|--------|----------------|
| GPID | 4 | Google verification — strong but NOT required |
| Website | 3 | Official presence, merchant voice |
| Instagram | 2 | Social proof, visual identity |
| Coords | 2 | Plottable on a map |
| Neighborhood | 1 | Locatable to an area |
| Phone | 1 | Contactable, corroborates identity |

**Threshold: score ≥ 4 = sufficient identity.**

This means:
- Website alone (3) + phone (1) = 4 → sufficient
- Instagram (2) + coords (2) = 4 → sufficient
- GPID alone (4) = 4 → sufficient
- Instagram (2) + neighborhood (1) + phone (1) = 4 → sufficient

No field is sacred. No field is required.

## Location Has Many Signals

Location is knowable through any of:
- Latitude/longitude (exact coords)
- Google Place ID (implies a geocodable location)
- Street address (geocodable)
- Neighborhood (area-level)
- Cross-streets or landmarks
- Appearance in a known market, food hall, or complex

A mobile taco cart may never have stable coords. It has a neighborhood, an
Instagram, maybe a schedule. That's enough. Do not treat missing coords as a
location gap if neighborhood or any other location signal exists.

## How to Evaluate Gaps

When assessing whether an entity needs more data, ask:

1. **Can we identify it?** (identity score ≥ 4)
2. **Can someone find it?** (any location signal)
3. **Can someone decide to visit?** (hours, category, any description)
4. **Can we tell its story?** (merchant surfaces, editorial, tagline)

These are progressive tiers, not a flat checklist. An entity at tier 1 is
publishable. An entity at tier 4 is rich. Both belong in the system.

## What This Means for Tooling

### Gap checks
Never report a missing field as a "gap" in isolation. Report whether the
entity has sufficient *identity*, sufficient *location*, and sufficient
*narrative*. Individual missing fields are enrichment opportunities, not
blockers.

### Enrichment ordering
Prioritize by composite value, not by filling every cell:
1. Does the entity lack identity? → discover anchors (any anchors)
2. Does the entity lack location? → find any location signal
3. Does the entity lack narrative? → generate description, tagline
4. Are there nice-to-haves? → fill remaining fields opportunistically

### Coverage dashboards
Group coverage by what it enables (identity health, location, visit planning,
narrative), not as a flat field-by-field report. The question is never "how
many entities have GPID" — it's "how many entities have sufficient identity."

### Issue scanning
The issue scanner (lib/coverage/issue-scanner.ts) already implements weighted
scoring for `unresolved_identity`. All other issue types should follow the
same philosophy: flag structural gaps, not missing individual fields.

## Anti-Patterns

Do NOT:
- Treat GPID as a prerequisite for anything
- Report "missing_gpid" as a problem if identity score is ≥ 4
- Require all location fields (coords + address + neighborhood) simultaneously
- Block publication on a single missing field
- Build enrichment logic that assumes complete world coverage
- Chase 100% fill rates on any individual column

DO:
- Evaluate entities holistically
- Accept multiple paths to the same truth
- Prioritize enrichment by composite value gained
- Treat absence as opportunity, not failure
- Design for the taco cart, not just the Michelin restaurant
