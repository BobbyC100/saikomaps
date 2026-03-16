---
doc_id: ARCH-ENTITY-LIFECYCLE-CLOSURE-V1
status: DRAFT
owner: Bobby
created: 2026-03-16
last_updated: 2026-03-16
layer: Concept Doc (Layer 1)
companion_to: PI-CONCEPT-V1
---

# Entity Lifecycle and Closure Specification

> **Status:** DRAFT — Not Canon. Pending verification items below.
> **Layer:** Concept Doc (Layer 1) — companion to Place Identity Concept Doc (PI-CONCEPT-V1).
> **Scope:** Lifecycle state management, closure as a claim, Reference Confidence Model. Does not redefine Place Identity. For identity fields, anchors, resolution, and core principles see PI-CONCEPT-V1.

---

## 1. Purpose

This document defines how lifecycle state is managed, how closure evidence is structured, and how the Reference Confidence Model evaluates source credibility. The goal is to ensure that canonical entity state is always the product of human-confirmed evidence, never a direct mutation from an external signal.

---

## 2. Core Principles

Entities represent real-world things. Records in databases are references to those entities.

Identity is stable. Signals and enrichment may change, but identity remains durable.

Evidence is stored as a ledger. The system records evidence rather than replacing it.

Canonical state requires human confirmation. External signals cannot directly mutate canonical identity.

Editorial authority governs interpretation. Machines gather signals. Humans make final identity decisions.

---

## 3. Entity Lifecycle States

Entities move through defined lifecycle states. Full definitions and transition rules are in PI-CONCEPT-V1 Section 5. States listed here for reference.

| Status | Meaning | In Schema |
|---|---|---|
| CANDIDATE | Created but not enriched | yes |
| OPEN | ERA pipeline has run at least once, entity is active | yes |
| PUBLISHED | Meets all Tier 1 and Tier 2 identity requirements, live in Traces | `[planned]` |
| TEMP_CLOSED | Temporarily closed, suppressed from Traces, in monthly recheck queue | `[planned]` |
| CLOSED | Permanently closed, retained for data integrity and temporal history | yes |

Current PlaceStatus enum: OPEN, CLOSED, PERMANENTLY_CLOSED, CANDIDATE. PUBLISHED and TEMP_CLOSED are designed but not yet added.

---

## 4. Closure as a Claim

Closure is treated as a claim derived from evidence, not an automatic system state change.

Signals suggesting closure generate entries in the `status_claims` ledger. Human review determines whether the claim updates canonical status. Canonical lifecycle state is never mutated directly by an external signal.

---

## 5. Closure Signals

Signals suggesting closure may originate from:

- Google Places status (`businessStatus` field)
- Merchant website
- Social media announcements
- Editorial reporting
- City licensing or regulatory data
- Field observation
- Absence of expected merchant activity

Each signal generates a closure claim associated with the entity. Claims may be supported by multiple references. Multiple signals supporting the same claim increase the likelihood the claim is valid.

---

## 6. Human Verification

Closure claims enter a review queue. Reviewers examine the evidence before confirming or rejecting.

Possible outcomes: CONFIRMED or REJECTED. Only confirmed claims can update canonical lifecycle state.

---

## 7. Status Claims Ledger

Table: `status_claims` `[planned — not yet in schema]`

| Field | Type | Description |
|---|---|---|
| id | UUID | Internal identifier |
| entity_id | UUID | Reference to the entity |
| claim_type | enum | TEMP_CLOSED, CLOSED, or REOPENED |
| source_type | enum | GOOGLE, WEBSITE, INSTAGRAM, TIKTOK, EDITORIAL, CITY_DATA, or FIELD_OBSERVATION |
| reference_id | UUID? | Optional link to evidence reference |
| observed_at | timestamp | When the signal was observed |
| effective_at | timestamp? | When the real-world status change occurred, if known |
| claim_confidence | float? | Optional aggregated confidence score from RCM |
| review_status | enum | PENDING, CONFIRMED, or REJECTED |
| reviewed_by | string? | Operator who reviewed |
| reviewed_at | timestamp? | Timestamp of review |
| notes | text? | Free text |
| created_at | timestamp | Record creation timestamp |

Status claims represent evidence, not canonical truth. Canonical lifecycle state remains on the entity record.

---

## 8. Reference Confidence Model

The Reference Confidence Model assigns a confidence score between 0.0 and 1.0 to each reference. Confidence reflects how much Saiko trusts a source, not whether the claim is true.

Confidence is based on: source reliability, recency, corroboration, and source transparency.

Signals inherit confidence from the references that produced them. The detailed scoring model will be defined in `saiko-fields-rcm-v1.md`.

---

## 9. System Flow

```
references → reference confidence (RCM) → atomic signals → status claims → human verification → canonical entity status
```

This ensures evidence is preserved in a ledger, identity remains stable, machines gather signals, and humans confirm canonical truth.

---

## 10. Verification Items

- [x] PUBLISHED lifecycle state is the canonical fifth state — CONFIRMED as design target. Not yet in PlaceStatus enum (current: OPEN, CLOSED, PERMANENTLY_CLOSED, CANDIDATE). `schema.prisma:708-713`
- [x] primary_vertical confirmed values: EAT, COFFEE, WINE, DRINKS, SHOP, STAY, EXPERIENCE — CONFIRMED via ARCH-ENTITY-CLASSIFICATION-LAYERS-V1 2026-03-16.
- [x] entity_type confirmed values: venue, activity, public — CONFIRMED via ARCH-ENTITY-CLASSIFICATION-LAYERS-V1 2026-03-16.
- [ ] status_claims table — NOT YET IN SCHEMA. Future schema addition. No table, model, or migration found in codebase.

---

## 11. Promotion Criteria

Document moves to ACTIVE when:

- All open verification items confirmed
- Bobby approval
- Added to architecture registry
- PI-CONCEPT-V1 cross-references confirmed consistent

---

*Saiko Fields · Entity Lifecycle and Closure · Draft 2026-03-16 · Not Canon*
