---
doc_id: FIELDS-ENTITY-AWARENESS-STAGE-V1
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: 2026-03-12
last_updated: 2026-03-12
project_id: FIELDS
systems:
  - entity-resolution
  - fields-data-layer
related_docs:
  - docs/architecture/entity-pipeline-overview-v1.md
  - docs/architecture/fields-era-overview-v1.md
  - docs/FIELDS_V2_TARGET_ARCHITECTURE.md
summary: Defines the Awareness stage — Saiko's pre-identity, pre-enrichment intake layer. Covers source abstraction, organization responsibilities, readiness signals, and the workbench model.
---

# Awareness Stage — Workbench

**System:** Saiko
**Domain:** Entity Intake & Preparation
**Status:** Conceptual (Locked)
**Scope:** Pre-ID operational layer

---

## Definition

The Awareness stage is a pre-identity, pre-enrichment system stage responsible for intake and organization of entity signals.

It functions as both:
- a **waystation** — entities may pause safely
- a **workbench** — humans and systems may add information

Nothing in this stage is public-facing or canonical.

---

## Responsibilities

### 1. Source Abstraction

- Accept signals from: humans, CSVs, APIs, feeds
- Normalize inputs into a common internal structure
- Preserve attribution and provenance

### 2. Organization (Not Decision)

- Structure and align incoming signals
- Do not resolve identity
- Do not execute enrichment
- Do not assert truth

---

## Readiness Signals (Outputs)

The Awareness stage reports — but does not enforce — two signals:

**ID Readiness**
- Is the entity identifiable?
- How strong are its identity anchors?
- How ambiguous or costly would identification be?

**Enrichment Readiness**
- How much usable data already exists?
- What is the expected enrichment cost?
- Is enrichment likely to be high value?

---

## Workbench Model

- Single place to add and manage profile-related data
- Supports human and machine edits
- Safe environment for incomplete or messy records
- Editing does not imply publication or canonization

**Workbench ≠ authority**
**Workbench = signal collection + preparation surface**

---

## Non-Goals

- No publishing
- No canonical ID assignment
- No confidence guarantees
- No enforcement of readiness thresholds
