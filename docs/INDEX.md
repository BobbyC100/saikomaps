# Saiko Maps — Documentation Index

**Last updated:** 2026-02-15

This is the canonical index of all active documentation for the Saiko Maps platform.

---

# Canonical Authority Set

These documents govern system behavior.
If any other documentation conflicts with these, the documents below take precedence.

---

## Product

- /README.md
- /docs/APP_OVERVIEW.md

---

## Rendering

- /docs/BENTO_CARDS_LOCKED_SPEC.md

Supporting (non-authoritative unless explicitly referenced):
- /docs/MERCHANT_PAGE_BENTO_GRID.md
- /docs/BENTO_CARD_DESIGN_PATTERNS.md
- /docs/BENTO_GRID_VISUAL_REFERENCE.md

---

## Data

- /docs/DATABASE_SCHEMA.md
- /lib/signals/README.md
- /lib/signals/RERUN_GUARD_AND_DATA_INTEGRITY.md

---

## External APIs

- /ENRICHMENT_WORKFLOW.md

---

## Workflow

- /docs/DOC_POLICY.md
- /docs/PR_TEMPLATE.md

---

## System Architecture

- [APP_OVERVIEW.md](./APP_OVERVIEW.md) — High-level application architecture
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — Complete database schema reference
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) — Local database setup guide
- [LOCAL_DEV.md](./LOCAL_DEV.md) — Local development environment setup
- [SITEMAP.md](./SITEMAP.md) — Application routing structure

---

## Design System

- [BENTO_CARD_DESIGN_PATTERNS.md](./BENTO_CARD_DESIGN_PATTERNS.md) — Card component design patterns
- [BENTO_GRID_VISUAL_REFERENCE.md](./BENTO_GRID_VISUAL_REFERENCE.md) — Visual reference for grid layouts
- [homepage-design-spec.md](./homepage-design-spec.md) — Homepage design specification
- [homepage-architecture.md](./homepage-architecture.md) — Homepage architecture and components

---

## Feature Specifications

### Markets
- [features/markets/SPEC_v1.2.md](./features/markets/SPEC_v1.2.md) — Markets integration specification

### Merchant Pages
- [MERCHANT_PAGE_BENTO_GRID.md](./MERCHANT_PAGE_BENTO_GRID.md) — Merchant page bento grid specification
- [BENTO_CARDS_LOCKED_SPEC.md](./BENTO_CARDS_LOCKED_SPEC.md) — Locked bento cards specification
- [QUIET_CARDS_IMPLEMENTATION.md](./QUIET_CARDS_IMPLEMENTATION.md) — Quiet cards implementation guide
- [ACTION_CARD_CLARIFICATIONS.md](./ACTION_CARD_CLARIFICATIONS.md) — Action card design clarifications

---

## Implementation Logs

- [BENTO_CARDS_BUILD_COMPLETE.md](./BENTO_CARDS_BUILD_COMPLETE.md) — Bento cards build completion summary
- [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) — General implementation completion log
- [SKATE_SPOT_INTEGRATION.md](./SKATE_SPOT_INTEGRATION.md) — Skate spot integration notes

---

## Process & Workflow

- [DOC_POLICY.md](./DOC_POLICY.md) — Documentation standards and governance policy
- [PR_TEMPLATE.md](./PR_TEMPLATE.md) — Pull request template and guidelines
- [saikoai-extraction-prompt-v2.1.md](./saikoai-extraction-prompt-v2.1.md) — AI extraction prompt specification

---

## Reference & Context

- [LA_FOOD_WHOS_WHO.md](./LA_FOOD_WHOS_WHO.md) — LA food scene context
- [design-references/](./design-references/) — Visual design reference materials
- [wireframes/](./wireframes/) — UI wireframes and mockups

---

## Deprecated / Historical

These documents are kept for historical context but are no longer actively maintained:

- [archive/MERCHANT_PAGE_GRID_SYSTEM_V1.md](./archive/MERCHANT_PAGE_GRID_SYSTEM_V1.md) — Legacy grid system spec (superseded by BENTO_CARDS_LOCKED_SPEC.md)
- [BENTO_CARDS_SPEC_REVIEW.md](./BENTO_CARDS_SPEC_REVIEW.md)
- [BENTO_CARDS_SPEC_REVIEW_FINAL.md](./BENTO_CARDS_SPEC_REVIEW_FINAL.md)
- [BENTO_CARDS_SPEC_UPDATE_LOG.md](./BENTO_CARDS_SPEC_UPDATE_LOG.md)
- [DESIGN_DECISIONS_ALIGNMENT.md](./DESIGN_DECISIONS_ALIGNMENT.md)
- [HOURS_STATUS_CLARIFICATION.md](./HOURS_STATUS_CLARIFICATION.md)
- [BENTO_GRID_ALIGNMENT_SUMMARY.md](./BENTO_GRID_ALIGNMENT_SUMMARY.md)
- [bento-card-before-after.md](./bento-card-before-after.md)
- [field-notes-comparison.md](./field-notes-comparison.md)
- [field-notes-final-concept.html](./field-notes-final-concept.html)
- [field-notes-final-concept5.html](./field-notes-final-concept5.html)
- [pin-popup-concepts-v2.html](./pin-popup-concepts-v2.html)
- [pin-popup-concepts.html](./pin-popup-concepts.html)
- [saiko-explore-implementation-spec.md](./saiko-explore-implementation-spec.md)
- [PIN_DEBUGGING.md](./PIN_DEBUGGING.md)

---

## Navigation

When working with Cursor:
1. Start with this INDEX.md to understand what exists
2. Reference feature specs in `/features/` for implementation details
3. Check design system docs before creating new UI components
4. Review process docs before submitting PRs

**Keep this index updated** when adding new documentation.
