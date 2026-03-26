---
doc_id: SKAI/SYSTEM-OVERVIEW-V1
doc_type: architecture
title: SKAI 1.0 Foundation
version: "1.0"
status: active
owner: Bobby Ciccaglione
created: 2026-03-26
last_updated: 2026-03-26
project_id: KNOWLEDGE-SYSTEM
systems:
  - knowledge-system
  - fields-data-layer
  - traces
related_docs:
  - docs/architecture/signals-registry-v1.md
  - docs/architecture/atomic-cultural-signals-v1.md
  - docs/architecture/data-layer-contract-v1.md
  - docs/architecture/enrichment-evidence-model-v1.md
  - docs/decisions/DEC-002.md
  - docs/skai/decision-index-spec-v1.md
summary: >
  Foundational definition of SKAI, including scope, system boundaries, and how
  related Fields/TRACES/data-layer documents connect. Created to close the
  documentation gap where SKAI-prefixed docs existed without a formal top-level
  definition of SKAI itself.
---

# SKAI 1.0 Foundation

## 1. Why this document exists

Several canonical documents use SKAI-prefixed identifiers, but those documents
primarily define subsystem contracts (signals, data-layer boundaries, enrichment
evidence, and decision storage). They did not previously provide one explicit
top-level definition of SKAI as a whole.

This document is the missing root context.

## 1.1 Source of truth statement

This document is the canonical source of truth for the definition and scope of
SKAI. When other SKAI-related docs focus on subsystems (signals, enrichment,
contracts, retrieval), this doc remains the authoritative top-level reference
for what SKAI is and how SKAI boundaries are defined.

## 2. What SKAI 1.0 is

SKAI 1.0 is Saiko's knowledge-and-architecture control surface for how canonical
system understanding is defined, stored, governed, and retrieved across the stack.

In practical terms, SKAI is the umbrella that binds:

- canonical architecture documents in the repo (`/docs`)
- the document/decision indexing pattern used for retrieval
- cross-layer contracts between Data Layer, Fields, and TRACES
- governance rules for how truth, interpretation, and product surfaces stay separated

SKAI 1.0 is not a separate runtime app. It is a canonical architecture +
knowledge framework that governs how the system is described and consumed.

In short: **SKAI 1.0 is the system-definition layer above implementation layers.**

## 3. Scope and boundaries

### In scope

- Defining canonical documentation contracts and IDs
- Defining layer boundaries and ownership contracts
- Defining signal/evidence models used by downstream systems
- Defining retrieval surfaces for decisions and architecture context

### Out of scope

- Replacing the operational Fields platform implementation
- Replacing the TRACES consumer product implementation
- Acting as a standalone serving API with independent product behavior

## 4. Relationship map (system-of-systems view)

The current documented relationship is:

1. **Data Layer** stores canonical, governed system-of-record data
2. **Fields** performs ingestion, normalization, identity resolution, and derived signal production
3. **TRACES** consumes canonical contracts for product interpretation/rendering
4. **SKAI knowledge layer** defines and governs the documentation/contracts that keep those boundaries stable and retrievable

SKAI therefore sits as the architecture-knowledge control plane over these
systems, not as a replacement for them.

## 5. SKAI-related canonical documents (current set)

The following docs are currently the primary SKAI-related sources referenced in
retrieval and architecture work:

| Doc ID | Purpose |
|---|---|
| `SKAI-DOC-FIELDS-SIGNALS-REGISTRY-001` | Canonical registry contract for atomic/derived signal definitions and governance. |
| `SKAI-DOC-FIELDS-ATOMIC-SIGNALS-001` | Atomic signal model used as non-interpretive evidence primitives. |
| `SKAI-DOC-FIELDS-DATA-LAYER-CONTRACT-001` | Layer boundary and access contract between Data Layer, Fields, and TRACES. |
| `ARCH-ENRICHMENT-EVIDENCE-MODEL-V1` | Evidence-first enrichment principles: presence/absence, staleness, sequencing before interpretation. |
| `DEC-002` | Decision that canonical knowledge lives in repo docs with structured frontmatter. |
| `SKAI/DECISION-INDEX-SPEC-V1` | Decision-level retrieval model above document-level registry indexing. |

## 6. Naming note

`SKAI-DOC-*` is a document identifier convention used by several architecture
docs. In this repo, SKAI-prefixed IDs and `SKAI/*` IDs both appear as canonical
knowledge identifiers. This document serves as the root definition for that
namespace.

## 7. Documentation gap closed by SKAI 1.0

Before this file, a reader could find multiple SKAI-related implementation and
contract documents but no single introductory definition of:

- what SKAI is
- what SKAI is not
- where SKAI sits relative to Data Layer, Fields, and TRACES
- how to navigate SKAI-related docs as one coherent system

This document is now the top-level entry point for SKAI context and should be
linked whenever SKAI is referenced as a system umbrella.

## 8. Future updates

As new SKAI-prefixed documents are added, update section 5 with the new canonical
entries and keep this doc as the stable starting node for SKAI retrieval.

