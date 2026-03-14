# Saiko — Context Snapshot

> Generated: 2026-03-12T18:08:20.607Z
> Source: docs/registry.json (2026-03-12T18:08:20.327Z)
> Documents: 50 included / 51 total
> Filters: status=active

---

This file is generated. Do not edit it directly.
To regenerate: `npm run docs:context`

## Table of Contents

**FIELDS**
- [FIELDS-ENTITY-AWARENESS-STAGE-V1](#fields-entity-awareness-stage-v1) — Awareness Stage — Workbench: Defines the Awareness stage — Saiko's pre-identity, pre-enrichment intake layer. Covers source abstraction, organization responsibilities, readiness signals, and the workbench model.
- [FIELDS-ENTITY-PIPELINE-OVERVIEW-V1](#fields-entity-pipeline-overview-v1) — Entity Pipeline — Overview: High-level model of the stages through which an entity moves inside Saiko — from first contact (Awareness) through Identification to Enrichment. Mental model only; does not prescribe UI, schema, or workflow.
- [PIPE-CAPTURE-PROFILES-V1](#pipe-capture-profiles-v1) — (untitled): Defines capture profiles for each source type — what to attempt when a source is touched, and what can be promoted to Facts-tier vs stored as raw material.
**KNOWLEDGE-SYSTEM**
- [SKAI/DECISION-INDEX-SPEC-V1](#skai-decision-index-spec-v1) — Decision Index v1
- [SYS-BOOT-CONTEXT-INVENTORY](#sys-boot-context-inventory) — Boot Context Inventory
- [SYS-DRAFT-TRIGGER-V1](#sys-draft-trigger-v1) — Draft Trigger v1: Defines when reusable knowledge must become a controlled draft.
- [SYS-PROMOTION-FLOW-V1](#sys-promotion-flow-v1) — Promotion Flow v1: Defines the controlled path from approved draft to canonical document.
- [SKAI/RESEARCH-AI-KNOWLEDGE-ARCHITECTURE-V1](#skai-research-ai-knowledge-architecture-v1) — AI-Native Knowledge & Data Architecture Patterns (2023–2026)
- [DEC-002](#dec-002) — DEC-002 — Repo-Based Canonical Knowledge Store: All canonical knowledge documents live in the repository under /docs, using markdown with structured frontmatter for both human readability and machine parsing.
**PLACE-PAGE**
- [SKAI-DOC-TRACES-PLACE-PAGE-DESIGN-001](#skai-doc-traces-place-page-design-001) — Place Page Design v1: Canonical design spec for the Saiko place profile page — wireframe, data sources, content model, and rendering rules.
**SAIKO**
- [ARCH-AI-OPERATING-LAYER](#arch-ai-operating-layer) — AI OPERATING LAYER
- [ARCH-SYSTEM-CONTRACT](#arch-system-contract) — SYSTEM CONTRACT
- [FIELDS-ERA-OVERVIEW-V1](#fields-era-overview-v1) — Entity Record Awareness (ERA) — One-Pager: Defines Entity Record Awareness (ERA) — how Saiko becomes aware a place exists, separating awareness from canonical (Golden) status to prevent silent drift.
- [SAIKO-DEFERRED-MIGRATION-GATES](#saiko-deferred-migration-gates) — Deferred Migration Gates: Gate conditions that must be satisfied before applying the two deferred Fields v2 migrations — slim entities and legacy table drop.
- [SAIKO-ENTITIES-CONTRACT-RECONCILIATION](#saiko-entities-contract-reconciliation) — Entities Contract Reconciliation: Field-level audit and decision log for the entities table — what belongs, what migrates, and what is retired as part of the Fields v2 architecture.
- [SAIKO-FIELDS-V2-TARGET-ARCHITECTURE](#saiko-fields-v2-target-architecture) — Saiko Fields v2 — Target Architecture Spec: Defines the four-layer Fields v2 architecture — entities routing shell, canonical_entity_state, interpretation_cache, and place_coverage_status — with anti-drift rules and current migration status.
- [SAIKO-MERCHANT-DATA-HIERARCHY](#saiko-merchant-data-hierarchy) — Saiko Merchant Data Hierarchy
- [SAIKO-PLATFORM-DATA-LAYER](#saiko-platform-data-layer) — PLATFORM_DATA_LAYER.md
- [SAIKO-PROVENANCE-SYSTEM](#saiko-provenance-system) — Saiko Maps - Provenance System
- [SAIKO-RESOLVER-AND-PLACES-DATA-FLOW](#saiko-resolver-and-places-data-flow) — Resolver pipeline and golden_records → places data flow
- [FEAT-MARKETS-SPEC-V1-2](#feat-markets-spec-v1-2) — Markets Integration — SPEC v1.2
- [SAIKO-ENERGY-SCORE-SPEC](#saiko-energy-score-spec) — Energy Score — Specification (Locked)
- [SAIKO-FIELDS-V2-CUTOVER-SPEC](#saiko-fields-v2-cutover-spec) — Fields v2 — Cutover Spec
- [SAIKO-FORMALITY-SCORE-SPEC](#saiko-formality-score-spec) — Formality Score — Specification (Locked)
- [SAIKO-DATA-PIPELINE-QUICK-START](#saiko-data-pipeline-quick-start) — Data Pipeline Quick Reference
- [SAIKO-DATABASE-SCHEMA](#saiko-database-schema) — Saiko Maps - Database Schema
- [SAIKO-DATABASE-SETUP](#saiko-database-setup) — Database Setup for Saiko Maps
- [SAIKO-ENV-TEMPLATE](#saiko-env-template) — Environment Variables Setup
- [SAIKO-GOOGLE-PLACES-SETUP](#saiko-google-places-setup) — Google Places API — Unblock Legacy Text Search
- [SAIKO-PIPELINE-COMMANDS](#saiko-pipeline-commands) — Saiko Maps — Pipeline Commands
- [SAIKO-PROVENANCE-QUICK-REF](#saiko-provenance-quick-ref) — Provenance System - Quick Reference
- [SAIKO-SITEMAP](#saiko-sitemap) — Saiko Maps - Sitemap
- [OPS-STALE-DEPLOYMENTS](#ops-stale-deployments) — Debugging Stale Deployments & Local Updates
- [SAIKO-DATA-SYNC-RUNBOOK](#saiko-data-sync-runbook) — Data Sync Runbook
- [SAIKO-LOCAL-DEV](#saiko-local-dev) — Local Development
- [SAIKO-PROD-MIGRATION-OPERATOR-RUNBOOK](#saiko-prod-migration-operator-runbook) — Production Migration Operator Runbook
- [SAIKO-PROD-PLACE-FIX-RUNBOOK](#saiko-prod-place-fix-runbook) — Production Place Page Fix - Runbook
- [SAIKO-MIGRATION-GUIDE](#saiko-migration-guide) — Migration Guide: Places → Golden Records
- [SAIKO-MIGRATION-HISTORY-RECONCILIATION](#saiko-migration-history-reconciliation) — Migration History Reconciliation Analysis
- [SAIKO-SAIKOAI-EXTRACTION-PROMPT-V2-1](#saiko-saikoai-extraction-prompt-v2-1) — SaikoAI Extraction Prompt — V2.1
- [SAIKO-APP-OVERVIEW](#saiko-app-overview) — Saiko Maps - Application Overview
- [SAIKO-README](#saiko-readme) — Saiko Maps
**TRACES**
- [OS-OFFERING-SIGNALS-V1](#os-offering-signals-v1) — Offering Signals v1
- [SS-DISPLAY-CONTRACT-V2](#ss-display-contract-v2) — SceneSense Display Contract v2: Display contract for the revised SceneSense three-lens model (Atmosphere / Energy / Scene). Supersedes SS-DISPLAY-CONTRACT-V1.
- [SS-FW-001](#ss-fw-001) — Three Universal Lenses Framework: Defines the three universal lenses (Atmosphere, Energy, Scene) used by SceneSense to interpret restaurant environments.
- [SS-FW-002](#ss-fw-002) — Atmosphere Lens: Defines the Atmosphere lens — physical and sensory environment of the dining space.
- [SS-FW-003](#ss-fw-003) — Energy Lens: Defines the Energy lens — activity level and temporal rhythm of the place.
- [SS-FW-004](#ss-fw-004) — Scene Lens: Defines the Scene lens — social patterns of use and behavioral expectations.
- [SS-GLO-001](#ss-glo-001) — SceneSense Glossary of Terms: Canonical glossary of SceneSense terminology for engineers, editors, and models.
- [VOICE-SAIKO-VOICE-LAYER](#voice-saiko-voice-layer) — SAI-DOC-VOICE-001 — Saiko Voice Layer

---

## FIELDS-ENTITY-AWARENESS-STAGE-V1

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | FIELDS |
| **Path** | `docs/architecture/entity-awareness-stage-v1.md` |
| **Last Updated** | Wed Mar 11 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Defines the Awareness stage — Saiko's pre-identity, pre-enrichment intake layer. Covers source abstraction, organization responsibilities, readiness signals, and the workbench model. |
| **Systems** | entity-resolution, fields-data-layer |

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

---

## FIELDS-ENTITY-PIPELINE-OVERVIEW-V1

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | FIELDS |
| **Path** | `docs/architecture/entity-pipeline-overview-v1.md` |
| **Last Updated** | Wed Mar 11 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | High-level model of the stages through which an entity moves inside Saiko — from first contact (Awareness) through Identification to Enrichment. Mental model only; does not prescribe UI, schema, or workflow. |
| **Systems** | entity-resolution, fields-data-layer |

# Entity Pipeline — Overview

**System:** Saiko
**Domain:** Entity Lifecycle
**Status:** Conceptual (Locked)
**Scope:** System model, not implementation

---

## Purpose

Define the high-level stages through which an entity moves inside the Saiko system, from first contact to enriched state.

This document establishes mental model only. It does not prescribe UI, schema, or workflow.

---

## Pipeline Stages

### 1. Awareness

- System has received signals that an entity may exist
- Signals are stored in a structured, attributable form
- No identity, truth, or readiness is asserted

### 2. Identification

- System attempts to uniquely identify the entity
- Identity anchors are evaluated
- Canonical identifiers may be assigned

### 3. Enrichment

- Structured, editorial, and derived data is added
- External systems may be consulted
- Cost, confidence, and completeness are relevant

---

## Maturity (State, Not Stage)

- "Mature" describes depth and quality of enrichment
- Maturity is relative to entity type
- Not all entities are expected to reach the same maturity

---

## Core Principle

Intake does not assert truth.
Truth, identity, and confidence are earned downstream.

---

## PIPE-CAPTURE-PROFILES-V1

| Field | Value |
|-------|-------|
| **Type** | spec |
| **Status** | active |
| **Project** | FIELDS |
| **Path** | `docs/pipelines/pipe-capture-profiles-v1.md` |
| **Last Updated** | Wed Mar 11 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Defines capture profiles for each source type — what to attempt when a source is touched, and what can be promoted to Facts-tier vs stored as raw material. |
| **Systems** | fields-data-layer, entity-resolution |

## 1. One-line Definition

**Capture Profile** = the small, explicit checklist of fields we attempt to capture whenever we touch a given source, including a strict rule for what can be promoted into Facts-tier vs stored as raw material.

---

## 2. Core Principle

**Opportunistic Capture (with guardrails):**  
When a pipeline touches a source, it may capture additional high-value, low-ambiguity fields that are commonly present-without expanding scope into crawling, inference, or "nice-to-have" extraction.

This is especially important for sources that are:
- operator-maintained (Instagram)
- high-change (hours, closures, reservation links)
- expensive to fetch repeatedly (web pages, external APIs)

---

## 3. Two-step Write Model (Always)

All capture profiles follow the same two-step model:

### A) Store Raw Material (append-only / non-destructive)
Store what we saw, when we saw it, and from where.  
This is safe, reversible, and preserves provenance.

### B) Promote to Facts-tier (only when explicit + parseable)
Only promote fields to canonical facts when the input is:
- explicit (not implied)
- parseable deterministically
- confidence-appropriate for that source
- consistent with conflict policy (survivorship / precedence)

---

## 4. Capture Profiles (v1)

### 4.1 Google Places (Coverage Capture)
**Primary target:** baseline identity + operational facts (coverage).  
**Secondary capture checklist (when present):**
- phone, website
- lat/lng, address
- hours (structured)
- business_status
- price_level
- photos (refs/urls)
- "serves_*" attributes / place attributes (if returned)

**Promotion policy:**
- Generally promotable (structured, authoritative), subject to Saiko policies (e.g., no Google rating/review display).

---

### 4.2 Website Enrichment (Deterministic, cost-aware)
**Primary target:** extract safe structured facts from the merchant website (no deep crawl).  
**Secondary capture checklist (when present):**
- reservation link(s)
- menu link(s)
- winelist / drinks link(s)
- "hours" text snippet (raw, plus parsed only if unambiguous)
- service-mode phrases ("walk-ins only", "counter service") as raw phrases
- key outbound links (Instagram, ordering)

**Promotion policy:**
- Promote only what is explicitly labeled and parseable.
- Otherwise store as raw snippets with provenance.

---

### 4.3 Instagram (Operator-Maintained Surface)
**Primary target:** capture operator-maintained identity/links and high-change facts that often live only in IG.  
**Secondary capture checklist (when present):**
**Identity**
- handle
- display name (if available)
- bio text (raw snapshot)

**Links**
- website / "link in bio" URL
- reservation URL (Resy/Tock/OpenTable)
- order URL (Toast/ChowNow/etc.)

**Facts (ONLY if explicit)**
- hours string (raw)
- "closed/temporarily closed" language (raw)
- explicit service mode phrases ("walk-ins only", "no reservations") (raw)

**Promotion policy:**
- Store raw bio + link targets always.
- Promote hours only if explicit and parseable (and tracked with provenance + freshness).
- Never infer hours from vibes or posting cadence.

---

### 4.4 Editorial Coverage (Curated Sources)
**Primary target:** coverage + excerpts for trust/coverage surfaces.  
**Secondary capture checklist (when present):**
- canonical URL + published date
- excerpt(s) / pull quote candidates
- claims that can be safely captured as "editorial observations" (not facts):  
  e.g., "order at the counter", "natural wine focus" (store as observations with attribution)

**Promotion policy:**
- Coverage is first-class.
- Observations should not override Facts-tier unless corroborated by higher-confidence sources.

---

### 4.5 Menu / Winelist (Offering Intelligence)
**Primary target:** offering signals and menu/winelist understanding.  
**Secondary capture checklist (when present):**
- menu_url / winelist_url
- price hints (ranges), only as "ballpark" unless explicit
- offering flags (wine program intent, cuisine posture, service model hints) as derived signals with confidence + provenance
- notable explicit terms ("tasting menu", "omakase", "by-the-glass", "bottle shop") as normalized tags
- update timestamp / fetch timestamp for freshness tracking

**Promotion policy:**
- Promote explicit, source-backed offering facts (e.g., menu URL, clearly stated service mode).
- Keep inferred interpretation (posture/tone) in derived-signal tier, not Facts-tier.
- Preserve raw extracted snippets for auditability and future model improvements.

---

## 5. Non-Goals (Guardrails)

Capture Profiles are **not** permission to:
- add new crawl depth
- scrape unrelated pages "while we're here"
- infer facts from tone, imagery, or weak language
- overwrite higher-confidence facts without explicit policy allowance
- expand pipeline scope without a new decision/work order

---

## 6. Freshness and Re-touch Policy

Because many target fields are high-change, each promoted value must carry:
- `source`
- `observed_at`
- `captured_at`
- `confidence`
- pointer to raw evidence (when available)

Suggested freshness windows (v1 defaults):
- Hours / closure indicators: short TTL (re-verify frequently)
- Reservation / ordering links: medium TTL
- Stable identity fields: longer TTL

---

## 7. Conflict and Survivorship Rules

When multiple sources disagree:
1. Apply source precedence policy (defined elsewhere in Saiko survivorship docs).
2. Prefer explicit structured values over ambiguous text.
3. Preserve losing candidates in raw/trace layers for audit.
4. Never silently drop conflicts; log them for review when confidence is close.

---

## 8. Implementation Requirements (v1)

Each pipeline implementing a Capture Profile should:
- define `primary_target` and `secondary_capture_checklist`
- write raw captures append-only with provenance
- run deterministic parse/normalize step
- promote only fields meeting profile promotion criteria
- emit counters/metrics:
  - touched_sources
  - raw_fields_captured
  - facts_promoted
  - conflicts_detected
  - promotions_blocked_by_policy

---

## 9. Operational Outcome

Adopting Capture Profiles should produce:
- fewer repeated source touches for commonly needed fields
- higher provenance quality
- reduced enrichment drift
- clearer separation between **what we saw** and **what we trust**

---

## 10. Change Control

Changes to source-specific checklists or promotion rules require:
- a decision update (or linked addendum)
- explicit note of affected pipelines
- migration/backfill plan if promotion behavior changes historically

---

## SKAI/DECISION-INDEX-SPEC-V1

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | KNOWLEDGE-SYSTEM |
| **Path** | `docs/skai/decision-index-spec-v1.md` |
| **Last Updated** | Sun Mar 08 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Systems** | knowledge-system, decision-system |

# Decision Index v1

## 1. Purpose

This document defines the field specification for Saiko's Decision Index.

The Decision Index is the retrieval layer that sits above the document store.
Documents are canonical containers. Decisions are atomic retrieval units.
The registry (`registry.json`) indexes documents. The Decision Index indexes
the decisions those documents contain, at a granularity that enables
decision-level retrieval at project kickoff, postmortem, and design time.

The distinction that motivates this layer:

> A document can contain multiple decisions.  
> A decision can be relevant across multiple retrieval contexts.  
> Retrieving documents is not the same as retrieving relevant prior decisions.

The Decision Index makes Saiko a decision engine, not a document archive.
Knowledge does not wait to be searched. It is surfaced at the moment of work.

---

## 2. System Position

The Decision Index occupies a specific layer in the Saiko knowledge architecture.

```
documents             canonical containers, governed by SKI/LIFT contract
registry.json         document-level index, entry point for document queries
decisions/            decision records, one file per decision
decision_index.json   machine-generated retrieval index over decision records
```

Decision records live at `/docs/decisions/DEC-NNN.md`.  
The `decision_index.json` is generated from those files, not hand-maintained.  
It is a derived artifact. The `.md` files are authoritative.

---

## 3. Field Specification

Every decision record must carry the following fields. Required fields are
enforced by CI validation on every PR touching `/docs/decisions/`.

| Field | Type | Required | Retrieval Job |
|---|---|---|---|
| `decision_id` | `DEC-[NNN]` | required | Stable cross-reference target for documents, postmortems, and kickoff packets. Primary link between decision index and document store. |
| `title` | short string | required | Human-scannable label. Used by retrieval system and humans to assess relevance before reading full record. |
| `decision_summary` | 1–2 sentence string | required | The actual decision in plain language. Distinct from title. Enables kickoff packets to surface decision content without loading source documents. |
| `problem_domains` | controlled vocab list | required | Primary retrieval axis. Matched against project classification at kickoff. Must use controlled vocabulary. See section 4. |
| `systems_affected` | controlled vocab list | required | Scopes retrieval to the system being worked on. Prevents unrelated decisions from surfacing in context packets. |
| `decision_type` | controlled vocab | required | Filters by nature of decision. Enables retrieval of architecture decisions separately from policy or ops decisions. |
| `status` | controlled vocab | required | Determines whether decision is active guidance, historical context, or invalidated. Superseded decisions remain retrievable with reduced weight. |
| `source_documents` | DOC ID list | required | Links decision back to canonical containers holding full reasoning. Decision record is a retrieval target, not the full record. |
| `assumptions` | string list | required | Beliefs the decision depended on at time of making. Load-bearing field. Postmortem compares outcome against assumptions. Without this, learning loop has no input. |
| `outcome_status` | controlled vocab | required | Distinguishes validated from open decisions. Decisions with known outcomes are higher-value retrieval context. Drives postmortem capture trigger. |
| `outcome_summary` | 1–2 sentence string | optional | Plain language result. Populated after validation. Enables kickoff packet to show what happened, not just what was decided. |
| `superseded_by` | `DEC-[NNN]` | optional | Points to successor decision. Keeps chain of reasoning navigable across supersessions. |
| `tags` | freeform list | optional | Supplement to controlled vocab. For cross-cutting concerns that do not fit problem domain vocabulary. Secondary retrieval only. |
| `created` | ISO date | required | Audit field. Enables recency-weighted retrieval. |
| `last_updated` | ISO date | required | Audit field. Signals whether record is being maintained. |

---

## 4. Controlled Vocabularies

Problem domains and decision types use controlled vocabularies. Freeform values
degrade retrieval over time. New values must be added to this document before
being used in decision records. The CI check validates against this list.

### Problem Domains

Primary retrieval axis. A decision record may carry multiple values.

| Value | Meaning |
|---|---|
| `ingestion` | How knowledge enters the system from external surfaces. |
| `capture-automation` | Automated or semi-automated capture of knowledge from workflows or AI sessions. |
| `lifecycle` | Document and decision state management: creation, promotion, supersession, archival. |
| `governance` | Policy enforcement, ownership, review processes, CI validation. |
| `data-model` | Core data primitives, schema design, entity definitions. |
| `retrieval` | How knowledge is queried, surfaced, and delivered to consumers. |
| `rendering` | How data and knowledge are transformed into consumer-facing outputs. |
| `editorial` | Voice, tone, curation standards, and content quality rules. |
| `ops-workflow` | Engineering workflows, deployment, operational procedures. |
| `product-definition` | Product behavior, feature scope, consumer experience decisions. |

### Decision Types

One value per record.

| Value | Meaning |
|---|---|
| `architecture` | Structural decisions about system design and component relationships. |
| `policy` | Rules governing how the system or team operates. |
| `product` | Decisions about product behavior, scope, or direction. |
| `operational` | Decisions about workflows, processes, or tooling. |
| `research-conclusion` | Findings from research that have been adopted as directional. |

### Status Values

| Value | Meaning |
|---|---|
| `active` | Current guidance. Should be surfaced in retrieval by default. |
| `superseded` | Replaced by a newer decision. Retrievable for historical reasoning. Not primary guidance. |
| `invalidated` | Decision was found to be wrong or no longer applicable. Retrievable for learning value only. |
| `draft` | Decision is being formed. Not yet authoritative. Not surfaced in kickoff retrieval. |

### Outcome Status Values

| Value | Meaning |
|---|---|
| `unknown` | Outcome has not yet been observed. Decision is still active but unvalidated. |
| `validated` | Outcome matched expectations. Assumptions held. High-confidence retrieval context. |
| `invalidated` | Outcome did not match. One or more assumptions were wrong. High learning value. |
| `mixed` | Partial match. Some assumptions held, some did not. Requires nuanced reading. |

---

## 5. Retrieval Examples

### Project kickoff query

New project: knowledge ingestion automation.  
Query: `ACTIVE` decisions where `problem_domains` includes `ingestion` or
`capture-automation`, `systems_affected` includes `Knowledge System`.  
Returns: DEC-003, DEC-007, DEC-011 with summaries and source doc links.  
Context packet assembled without human search.

### Postmortem learning query

Project closes. Query: decisions made during this project where `outcome_status`
was `unknown` at kickoff. Prompt: update `outcome_status` and `outcome_summary`
for each. Validated decisions strengthen future retrieval confidence.
Invalidated decisions become high-value learning context for similar future work.

### Supersession check

Before making a new architectural decision: query decisions where `problem_domains`
and `systems_affected` overlap with the proposed decision. Surface any prior
decisions in the same space, their assumptions, and their outcomes.
Prevents relitigating settled decisions. Surfaces relevant prior reasoning.

---

## 6. Deferred Fields

The following fields are explicitly excluded from v1. They require a working
index with measurable retrieval quality before they add value. Adding them
now would be premature optimization.

- **Confidence score** — numeric weight on decision reliability
- **Relevance weight** — retrieval ranking signal
- **Embedding vector** — semantic similarity index
- **Ownership routing** — assignment logic beyond source documents
- **Scoring systems** — any composite quality metric

These are retrieval optimization concerns. They require a corpus to optimize
against. Build the corpus first.

---

## 7. Implementation Notes

**File format:** one `.md` file per decision at `/docs/decisions/DEC-NNN.md`.
Easier to review, edit, and reference in PRs than a single large JSON file.
Cleaner git diffs. Human-readable without tooling.

**Machine index:** `decision_index.json` generated from `.md` files. Not hand-maintained.
Generation can be a simple CI step or a local script. The `.md` files are truth.

**CI validation:** same pattern as `/docs` validation. Required fields present,
controlled vocab values valid, `superseded_by` references resolve to real files.

**Starting point:** do not backfill all prior decisions immediately. Create records
for decisions being made now and for the highest-value prior decisions that
will be retrieved frequently. Grow the index organically from kickoff use.

---

## SYS-BOOT-CONTEXT-INVENTORY

| Field | Value |
|-------|-------|
| **Type** | system |
| **Status** | active |
| **Project** | KNOWLEDGE-SYSTEM |
| **Path** | `docs/system/boot-context-inventory.md` |
| **Last Updated** | Mon Mar 09 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Systems** | boot-system |

# Boot Context Inventory

**Generated:** 2026-03-10  
**WO:** WO-BOOT-003  
**Status:** initial sweep — read-only audit

This document lists all files relevant to the Boot Up context system.
It will be used to decide which documents Boot should retrieve, which
decisions Boot should surface, and which artifacts should be promoted
into canonical docs.

---

## Boot System

| File | Description |
|---|---|
| `scripts/boot.ts` | Boot Up engine. Reads latest session artifact, runs system checks, prints structured context packet. Read-only. |
| `scripts/session-end.ts` | Session close script. Collects explicit boot fields interactively and writes session artifact to `ai-operations/sessions/`. |
| `scripts/session-start.ts` | Session open script. Displays current repo state from `ai-operations/state/repo_state.md`. |

---

## Session Artifacts

| File | Description |
|---|---|
| `ai-operations/sessions/2026-03-10-session-01.json` | Session artifact. v1 schema (legacy fields: `next_move`, `open_threads`, `systems_advanced`). |
| `ai-operations/sessions/2026-03-10-session-02.json` | Session artifact. v1 schema (legacy fields). Contains `next_move: "test boot up tomorrow morning"`. |

**Note:** New session artifacts written after WO-BOOT-002 will carry explicit boot fields:
`next_session_objective`, `recommended_first_work_order`, `projects_for_next_session`,
`open_items`, `verification_notes`, `system_status`, `commit_hash`.

---

## AI Operations Layer

| File | Description |
|---|---|
| `ai-operations/system_contract.md` | Saiko system context. Org structure, platform layers (SPORT / Fields / Traces), agent roles (Bobby / Clement / Cortez). |
| `ai-operations/docs/boot_protocol.md` | Stub — one-line pointer to `docs/operations/ai_boot_protocol.md`. Target file does not exist. |
| `ai-operations/state/repo_state.md` | Snapshot of repo branch, commit, and status. Generated by `scripts/repo-state.ts`. |
| `ai-operations/systems/registry.json` | System registry. 4 entries: `ai-operations`, `repo-workflow`, `fields-data-layer`, `traces-product`. Not a document registry. |
| `ai-operations/GETTING_STARTED.md` | Entity resolution quick-start doc. Not boot-relevant. Legacy content. |

---

## Architecture Docs

| File | Description |
|---|---|
| `docs/architecture/system_contract.md` | Authoritative architectural contract for SaikoFields and TRACES. Status: ACTIVE v1.0. |
| `docs/architecture/ai_operating_layer.md` | Catalog of AI operating systems: Boot Protocol, System Contract, Session Log, Cursor Rules. Status: STAGING. |
| `docs/architecture/README.md` | Architecture directory index. Currently empty. |
| `docs/architecture/NEWSLETTER_INGESTION_QUICK_REFERENCE.md` | Newsletter ingestion quick reference. Not boot-relevant. |
| `docs/architecture/NEWSLETTER_INGESTION_ALIGNMENT_REPORT.md` | Newsletter ingestion alignment report. Not boot-relevant. |
| `docs/architecture/NEWSLETTER_INGESTION_APPROVAL_V1.md` | Newsletter ingestion approval record. Not boot-relevant. |
| `docs/architecture/NEWSLETTER_INGESTION_SECURITY_AUDIT.md` | Newsletter ingestion security audit. Not boot-relevant. |
| `docs/architecture/NEWSLETTER_INGESTION_IMPLEMENTATION_SUMMARY.md` | Newsletter ingestion implementation summary. Not boot-relevant. |

---

## SKI Knowledge Documents

| File | Description |
|---|---|
| `docs/skai/decision-index-spec-v1.md` | Decision Index v1 spec. Defines field specification, controlled vocabularies, and retrieval patterns for the Decision Index. Status: ACTIVE. |
| `docs/skai/research-ai-knowledge-architecture-v1.md` | AI-Native Knowledge & Data Architecture Patterns (2023–2026). Research synthesis. Status: DRAFT. |

**Note:** Both documents were referenced in `DEC-001` and in `scripts/generate-decision-index.ts` before
being written to the repo. Controlled vocabulary in `generate-decision-index.ts` is sourced from `SKI/BASE-004`.

---

## Decision System

| File | Description |
|---|---|
| `docs/decisions/DEC-001.md` | Canonical knowledge architecture — documents stored in repository. Status: active. |
| `docs/decision_index.json` | Machine-readable decision index. Generated by `scripts/generate-decision-index.ts`. Schema version 1.0. |
| `scripts/generate-decision-index.ts` | Reads `docs/decisions/DEC-*.md`, validates frontmatter against `SKI/BASE-004` vocab, writes `decision_index.json`. |
| `scripts/decision-cli.ts` | CLI for querying `decision_index.json` by domain or system. Also generates kickoff context packets. |

---

## Registries / Indexes

| File | Description |
|---|---|
| `ai-operations/systems/registry.json` | System registry. 4 entries with `id`, `name`, `layer`. Tracks systems, not documents. Manually maintained. |
| `docs/decision_index.json` | Decision index. Machine-generated. Closest current analog to a document registry — scoped to decisions only. |

**Gap:** No `docs/registry.json` exists. No document-level registry covering the full canonical corpus exists yet.

---

## Cursor Rules (Agent Context)

| File | Description |
|---|---|
| `.cursor/rules/00-saiko-core.mdc` | Core agent rules. Cortez identity, scope constraints, DB access rules (`/lib/db`), migration requirements. Always applied. |
| `.cursor/rules/05-workorder-discipline.mdc` | Work order naming conventions, baseline doc discipline, scope rules. Always applied. |
| `.cursor/rules/10-migration-safety.mdc` | Migration and schema safety rules. Agent-requestable. |
| `.cursor/rules/30-traces-architecture.mdc` | Trace layer invariants. Agent-requestable. |
| `.cursor/rules/merchant-page-review.mdc` | Merchant page review rules. Agent-requestable. |

---

## Supporting Scripts

| File | Description |
|---|---|
| `scripts/repo-state.ts` | Generates `ai-operations/state/repo_state.md` snapshot of current branch, commit, and git status. |

---

## Research / Feature Docs (knowledge-adjacent)

| File | Description |
|---|---|
| `docs/scenesense/display-contract-v1.md` | SceneSense display contract. References knowledge architecture. |
| `docs/features/markets/SPEC_v1.2.md` | Markets feature specification. |

---

## Gaps and Missing Files

| Expected | Status |
|---|---|
| `docs/operations/ai_boot_protocol.md` | Missing. Referenced by `ai-operations/docs/boot_protocol.md` stub but does not exist. |
| `docs/registry.json` | Missing. No document-level registry exists. Only a system registry and decision index. |
| `AGENTS.md` | Not present in repo. |
| `.cursorrules` (root) | Not present. Agent rules are in `.cursor/rules/*.mdc` instead. |
| `CLAUDE.md` | Not present. |
| `llms.txt` | Not present. |
| `docs/sessions/` | Does not exist. Sessions live at `ai-operations/sessions/`. |
| `SKI/BASE-002` | Written 2026-03-10 → `docs/skai/research-ai-knowledge-architecture-v1.md` |
| `SKI/BASE-004` | Written 2026-03-10 → `docs/skai/decision-index-spec-v1.md` |

---

## Recommended Boot Retrieval Targets

When Boot Up context retrieval is implemented, the following files are
the highest-priority candidates for inclusion in the boot context packet:

**Always load:**
- Latest session artifact (`ai-operations/sessions/`)
- `ai-operations/system_contract.md`
- `docs/architecture/system_contract.md`
- `docs/architecture/ai_operating_layer.md`

**Load on demand (by project domain):**
- `docs/decision_index.json` — query by `systems_affected` matching active project
- `docs/skai/decision-index-spec-v1.md` — when working on the knowledge or decision system
- `.cursor/rules/00-saiko-core.mdc` and `05-workorder-discipline.mdc` — always implicitly active via Cursor

**Do not load into boot packet (too large / not relevant to context):**
- `ai-operations/sessions/*.json` (historical, beyond the latest)
- `data/` directory
- `ai-operations/GETTING_STARTED.md`

---

## SYS-DRAFT-TRIGGER-V1

| Field | Value |
|-------|-------|
| **Type** | system |
| **Status** | active |
| **Project** | KNOWLEDGE-SYSTEM |
| **Path** | `docs/system/draft-trigger-v1.md` |
| **Last Updated** | Mon Mar 09 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Defines when reusable knowledge must become a controlled draft. |
| **Systems** | knowledge-system, repo-workflow |

# Draft Trigger v1

## Purpose

Define the exact moment when knowledge must stop living only in chat and begin existing as a controlled draft.

## Rule

A draft is created when a conversation or work session produces knowledge that is likely to be reused, referenced, or governed later.

## Trigger Conditions

A draft must be created when any one of these happens.

### 1. New named artifact requested

Examples:

- "write the spec"
- "draft the workstream snapshot"
- "create the policy doc"
- "make the decision record"

This means the work has crossed from discussion into artifact creation.

### 2. Existing canonical doc needs non-trivial change

Examples:

- new section
- changed position or recommendation
- changed workflow
- changed metadata model
- changed system behavior

A trivial typo fix does not trigger a draft.  
A meaningful content change does.

### 3. Reusable knowledge emerges from discussion

Examples:

- architecture conclusion
- research synthesis
- operating rule
- policy
- workflow definition
- naming or metadata standard

If the knowledge is likely to matter outside the current chat, it should become a draft.

## What does not trigger a draft

These do not require draft creation by default:

- brainstorming fragments
- incomplete notes
- throwaway examples
- temporary explanation text
- unresolved ideas with no clear artifact yet

## Draft Output

When triggered, the system must produce a draft container with at least:

```yaml
doc_type:
project_id:
draft_source:
proposed_title:
proposed_path:
```

`draft_source` values:

- `chat`
- `cursor`
- `manual`
- `imported`

## Draft State

All drafts begin as:

```yaml
status: draft
```

They are not canonical.
They are candidates for promotion.

---

## SYS-PROMOTION-FLOW-V1

| Field | Value |
|-------|-------|
| **Type** | system |
| **Status** | active |
| **Project** | KNOWLEDGE-SYSTEM |
| **Path** | `docs/system/promotion-flow-v1.md` |
| **Last Updated** | Mon Mar 09 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Defines the controlled path from approved draft to canonical document. |
| **Systems** | knowledge-system, repo-workflow |

# Promotion Flow v1

## Purpose

Define the controlled path from approved draft to canonical document.

## Rule

Nothing becomes canonical until it passes through the promotion flow.

## Input

The promotion flow starts when Bobby explicitly approves a draft.

Approval language can be simple:

- "promote this"
- "make this canonical"
- "add this to the system"
- "update the canonical doc"

## Flow

### Step 1. Identify intent

The system first determines which of these actions applies:

- `create_new`
- `update_existing`
- `supersede_existing`
- `reject`

The system may suggest the action, but Bobby is final authority.

### Step 2. Run collision check

The system checks for likely overlap using:

- exact `doc_id`
- exact path
- fuzzy title match
- fuzzy filename match
- `project_id` overlap
- `related_docs` overlap

For v1, collision check is warning-only.  
It does not auto-decide.

### Step 3. Select canonical target

One of two outcomes follows.

#### New canonical doc

The system proposes:

- path
- title
- `doc_type`
- `project_id`

#### Existing canonical doc update

The system identifies the target doc and the update type:

- frontmatter update
- section replace
- body append
- superseding version

### Step 4. Normalize metadata

Before writing, the system ensures the document has the canonical envelope:

```yaml
doc_id:
doc_type:
status:
owner:
created:
last_updated:
project_id:
systems:
related_docs:
summary:
```

For workstream docs only, optionally:

```yaml
workstream_state:
```

### Step 5. Apply repo change

The system writes the file or updates the existing one through the repo layer.

Allowed v1 outcomes:

- create new markdown file
- apply frontmatter patch
- apply section replacement patch

### Step 6. Register canonical doc

If a registry exists, update it.
If no registry exists yet, the repo file itself becomes the canonical source and the registry step is deferred.

### Step 7. Mark result

The document must end in one of these states:

- `status: active`
- `status: superseded`
- `status: archived`

A promoted doc cannot remain ambiguous.

## Output

A successful promotion produces:

- one canonical file path
- one canonical doc state
- one clear relation to existing docs
- zero ambiguity about which version governs

## Failure Conditions

Promotion must stop and ask for a decision if:

- two likely canonical targets are found
- no valid target can be identified
- `doc_type` cannot be inferred reasonably
- update would overwrite a different active document without confirmation

## Behavioral Rule

A workstream is not cleanly closed until any approved draft has either:

- been promoted
- been explicitly rejected
- been explicitly left in draft

No silent in-between state.

---

## SKAI/RESEARCH-AI-KNOWLEDGE-ARCHITECTURE-V1

| Field | Value |
|-------|-------|
| **Type** | research |
| **Status** | active |
| **Project** | KNOWLEDGE-SYSTEM |
| **Path** | `docs/skai/research-ai-knowledge-architecture-v1.md` |
| **Last Updated** | Sun Mar 08 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Systems** | knowledge-system |

# AI-Native Knowledge & Data Architecture Patterns (2023–2026)

## 1. Purpose

This document synthesizes current best practices (2023–2026) in knowledge and
data architecture for AI-native companies. It is research, not a design spec.
The goal is to understand what the modern standard looks like before designing
Saiko's own knowledge control system.

---

## 2. Separation of Data vs Knowledge

The most consistent pattern across modern engineering organizations is that
structured product data and operational knowledge are treated as separate layers.
They have different consumers, different update cycles, and different governance
requirements. Conflating them creates systems that serve neither well.

### The two-layer model

**Data layer:** structured, queryable, schema-enforced product records. Consumed by
application code, analytics, and product surfaces. Changes through structured
pipelines with validation.

**Knowledge layer:** human and machine-readable documents capturing intent, policy,
decisions, and operational logic. Consumed by engineers, AI assistants, support
systems, and product features. Changes through authoring and promotion workflows.

### Why they stay separate

Data and knowledge have fundamentally different properties.

Data is queryable, record-level, and schema-bound. It is best governed through
database migrations, validation schemas, and API contracts.

Knowledge is document-level, context-rich, and narrative. It is best governed
through version control, document lifecycle states, and ownership rules.

Companies that merge these into one system end up with either overly rigid
documentation or underdocumented data contracts. The separation is a feature.

---

## 3. Canonical Source of Truth

The dominant pattern among engineering-led companies (Stripe, Vercel, Linear,
Supabase, and others) is: the repository is the canonical knowledge store.

This is not a universal standard. Many companies use Notion, Confluence, or
Google Docs as their primary surfaces. But for knowledge that must be machine-
readable, version-controlled, and consumed by AI systems and tooling, the
repo is the only surface that satisfies all requirements simultaneously.

### The three-surface model

Most companies operate across three surfaces, with different roles for each.

- **Thinking surface:** chat, whiteboards, design sessions. Ephemeral. No governance.
- **Drafting surface:** Google Docs, Notion. Collaborative, human-readable. Low governance.
- **Canonical surface:** the repository. Version-controlled, machine-readable, authoritative.

The key architectural insight is that the canonical surface is not where most
authoring happens. It is where documents land when they are ready to be
treated as authoritative. The gap between drafting and canonical is where
most knowledge systems break down.

### What lives in the repo vs what is mirrored

Canonical documents live in the repo. All other surfaces are mirrors or drafts.

**What belongs in the repo:** architecture contracts, system policies, operational
protocols, product definitions, ADRs, editorial standards, support policies,
canonical FAQs, and the document registry.

**What belongs outside the repo:** raw meeting notes, exploratory drafts, chat
transcripts, in-progress design discussions, and presentations. These can
reference canonical docs but are not themselves authoritative.

### Versioning patterns

Three patterns are in use across the industry.

**Git-native versioning:** full change history via commits and branches. Every
modification is tracked. Documents are plain text or structured markdown.
Best for: engineering teams, AI-consumed docs, policy documents.

**Document-system versioning:** platforms like Notion offer version history but
it is tied to the platform. Harder to query programmatically or reference
by stable ID. Best for: human-readable wikis, onboarding materials.

**Hybrid:** documents authored in Google Docs or Notion, then promoted into the
repo as the canonical source once reviewed. The draft stays for reference.
Best for: teams that need low-friction drafting but require stable canonical refs.

---

## 4. AI-Native Knowledge Systems

The term "context engineering" has largely replaced "prompt engineering" as
the operative concept. The insight is that AI output quality is primarily a
function of what context is provided, not how the prompt is phrased.

For companies building AI-assisted workflows, this means the knowledge system
is not a documentation concern. It is a product infrastructure concern.

### Emerging patterns for AI-consumable knowledge

**AGENTS.md / CLAUDE.md / .cursorrules**  
Repo-level instruction files consumed by AI coding assistants. Encode
project conventions, architectural constraints, known anti-patterns, and
stack-specific rules. Teams that maintain these well report substantially
better AI coding assistant performance.

**llms.txt**  
A proposed standard (gaining adoption) where websites and systems provide
a structured markdown file at a known path specifically for LLM consumption.
Analogous to `robots.txt` but for AI agents. Signals what knowledge is
available, where to find it, and how to interpret the system.

**RAG pipelines**  
Retrieval-augmented generation is now a standard pattern for AI systems
that need to answer questions grounded in internal knowledge. Documents
are chunked, embedded as vectors, and retrieved at query time. The quality
of RAG output is almost entirely dependent on the quality and structure of
the underlying document corpus. Poorly structured knowledge = poor RAG.

**MCP servers (Model Context Protocol)**  
Anthropic's MCP, now adopted by OpenAI, Google, and Microsoft, is becoming
the standard for agents to access external tools, APIs, and knowledge stores.
Think of it as a plug standard for AI tool access. Companies building
knowledge systems now need to consider MCP-compatibility for agent access.

**Structured metadata on documents**  
AI systems consume documents better when documents have stable IDs,
predictable field names, machine-readable lifecycle states, and explicit
consumer system declarations. This is the minimal requirement for a
knowledge corpus to be reliably queryable by agents.

### The context window constraint

A core engineering reality: AI models do not perform reliably with arbitrarily
large contexts. Research shows model accuracy degrades around 32,000 tokens
even for models claiming million-token windows. The implication is that
knowledge systems cannot work by dumping all documents into every prompt.

The solution is structured retrieval: the system selects the most relevant
documents for a given task and provides only those. This requires documents
to have good metadata (for filtering) and stable IDs (for reference).
A registry that lists all controlled documents and their metadata is the
infrastructure that makes this possible.

---

## 5. Document Governance

The most widely adopted governance pattern in engineering organizations is
the Architecture Decision Record (ADR). AWS, Microsoft, and most major
engineering orgs now treat ADRs as a standard practice.

### ADR pattern

Each ADR is a short document capturing: the decision, the context that
drove it, the alternatives considered, and the consequences. ADRs are
immutable once accepted. If a decision changes, a new ADR supersedes the
old one rather than modifying it. This preserves the decision history.

ADRs live in the repository alongside the code they govern. They are
committed with the changes they document. Standard lifecycle: Proposed,
Accepted, Deprecated, Superseded.

### Broader document governance

Beyond ADRs, the recurring elements of strong document governance are:

- **Document IDs:** stable, human-readable identifiers that allow downstream
  systems to reference specific documents without relying on file paths.

- **Lifecycle states:** explicit status fields (Draft, Active, Superseded, Archived)
  so consumers always know what they are reading and whether it is current.

- **Ownership:** every controlled document has a named owner responsible for
  maintaining it. Documents without owners decay.

- **Consumer system declarations:** each document records which systems depend
  on it. This enables impact assessment when a document changes.

- **A central registry:** a machine-readable index of all controlled documents
  with status, path, owner, and consumer systems. This is the entry point
  for any downstream system querying the knowledge store.

---

## 6. Ingestion from AI Workflows

AI collaboration is producing substantial knowledge. Design reasoning,
architectural decisions, and operational protocols are all being generated
in chat interfaces. The majority of companies are not yet capturing this
knowledge in structured form. It accumulates in chat history and is lost.

### The gap

Current state at most companies, including most well-run startups:

```
AI output → manual copy → Google Doc → never promoted
```

The knowledge gets generated, noted somewhere, and then fragmented.
Future engineers and AI systems cannot access it reliably.

### Emerging patterns for AI knowledge ingestion

The most advanced teams are experimenting with structured promotion flows:

```
AI output → draft document in repo → review → status: active
```

The key shift is treating the repo as the default landing zone for
knowledge worth keeping, rather than an optional archive step.

Some teams use AI itself to draft structured documents from conversation
transcripts or design sessions. This creates a loop where AI collaboration
produces AI-consumable knowledge artifacts.

This area is early. Most companies are still figuring out which knowledge
from AI workflows is worth promoting and what the promotion process should
look like. There is no dominant standard yet.

---

## 7. Knowledge Consumption

The key insight from the most mature AI-native systems is that knowledge
consumption is not a human UX problem alone. AI agents, coding assistants,
support bots, and product features all consume the same underlying knowledge
corpus. The knowledge system must serve all of them.

### Consumption patterns by consumer type

**Engineering / AI coding assistants (Cursor, Claude Code, Copilot)**  
Consume `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, inline code comments, and
linked documentation. Best served by repo-native structured docs with
stable paths. Context is injected at task time via file references or
tool-mediated retrieval.

**Internal AI agents**  
Consume via RAG pipelines or direct document retrieval. Require structured
metadata (for filtering), stable IDs (for citation), and a registry
(for discovery). MCP servers are becoming the standard interface layer.

**Support systems**  
Typically consume a curated subset of canonical knowledge: FAQs, policies,
product definitions. Usually served through a dedicated support knowledge
base that mirrors canonical docs from the repo. Freshness is critical.

**Documentation portals**  
Human-readable mirrors of canonical docs. Generated from the repo source.
The repo is authoritative. The portal is a rendered view.

**Marketing and editorial systems**  
Consume brand foundations, voice standards, product definitions. Usually
accessed via a reference portal or embedded in AI prompts at generation time.

---

## 8. Real-World Examples

### Stripe

Stripe is notable for its writing culture. The CEO and CTO both publish
regularly to Stripe's internal blog. Engineers are expected to write longer
documents as a normal part of development. The company uses an internal
"Go" link system that turns documents into stable short references. This
makes canonical documents referenceable across the organization without
depending on file paths or external URLs.

Stripe's API review process treats every API change as a documentation event.
No change ships without a corresponding document. The documentation is not
downstream of the decision. It is part of the decision process.

### Anthropic (engineering team)

Anthropic's engineering team reports that approximately 90% of the code for
Claude Code is written by Claude Code itself. This is only possible because
the team has invested heavily in structured knowledge artifacts (`AGENTS.md`,
project rules, codebase documentation) that give the AI sufficient context
to operate reliably. The knowledge system is the infrastructure that makes
AI-assisted development work at this level.

### The AGENTS.md pattern (industry-wide)

OpenAI standardized `AGENTS.md` in 2025 as a repo-level instruction file for
AI coding agents. Anthropic uses `CLAUDE.md`. Cursor uses `.cursorrules`.
The names differ but the pattern is the same: a structured, repo-native
document that encodes architectural decisions, coding standards, and
known constraints for AI agent consumption.

Teams that invest in these files report better AI coding assistant output.
Teams that do not have them report AI assistants that ignore project
conventions and generate inconsistent code.

### The llms.txt standard

A proposed standard now gaining adoption across developer tools companies.
A file at `/llms.txt` provides a structured map of a system's knowledge for
AI consumption. Analogous to `robots.txt`. Signals what is available, how it
is organized, and what an AI agent should know before engaging with the system.
Supabase, Vercel, and others have adopted it for their documentation sites.

---

## 9. Architectural Patterns: Summary

**Pattern 1: Repo as canonical store**  
The git repository is the single source of truth for controlled documents.
All other surfaces are mirrors or working drafts. Standard at engineering-led
companies. Best suited for: documents that must be machine-readable,
version-controlled, and consumed by AI systems or tooling.

**Pattern 2: Wiki as primary surface**  
Notion, Confluence, or similar wiki systems hold the authoritative knowledge.
Easier for non-engineering contributors. Less suited to AI consumption.
Best suited for: onboarding materials, HR policies, and knowledge that
does not need to be consumed programmatically.

**Pattern 3: Hybrid model**  
Wiki or Google Docs for drafting and human-readable access. Repo for
canonical controlled documents. Documents are promoted from the drafting
surface to the repo when they reach `active` status. The most common pattern
at companies with both technical and non-technical contributors.

**Pattern 4: RAG corpus**  
Canonical documents are indexed into a vector store for AI retrieval.
The repo remains authoritative. The vector store is a derived artifact.
This pattern extends the repo-as-canonical-store model with AI retrieval
capability. Requires document quality and metadata to be high.

---

## 10. Tradeoffs

### Repo-first vs wiki-first

Repo-first: better for AI consumption, versioning, and programmatic access.
Harder for non-technical contributors. Lower-friction for engineering teams.

Wiki-first: better for broad contribution, human readability, rich formatting.
Harder to make machine-readable or AI-consumable without extra tooling.

### Structured docs vs free-form docs

Structured (defined metadata, IDs, lifecycle states): higher authoring overhead,
significantly better for AI consumption, system integration, and governance.

Free-form: lower friction, but degrades over time as the corpus grows.

### High-friction governance vs low-friction ingestion

Strict governance (review gates, approval flows) produces higher-quality
canonical knowledge but slows ingestion. Low-friction ingestion produces
more knowledge but increases noise and versioning complexity.

The best systems solve this with lifecycle states: anything can enter as `draft`
without a gate, but only `active` documents are treated as authoritative.

---

## 11. Recommended Architecture: Modern Startup

Based on the patterns above, the recommended architecture for a small,
AI-native startup with engineering, product, and editorial functions is:

**Layer 1: Canonical Store**  
Git repository, `/docs` directory.  
All controlled documents live here. Structured markdown with defined
metadata fields. Governed by document lifecycle states.

**Layer 2: Document Registry**  
`/docs/registry.json` or equivalent.  
Machine-readable index of all controlled documents: ID, path, status,
version, owner, consumer systems. The entry point for any system
querying the knowledge store.

**Layer 3: AI Context Files**  
`CLAUDE.md` or `AGENTS.md` at repo root and relevant subdirectories.  
Encodes architectural constraints, stack-specific rules, and known
anti-patterns for AI coding assistant consumption.

**Layer 4: Drafting Surface**  
Google Docs or Notion. Low-friction authoring. Not authoritative.
Documents are promoted from here to the repo when ready.

**Layer 5: Retrieval Layer** *(deferred)*  
A RAG index over the canonical corpus enables AI agent retrieval at scale.
Not required at early stage. Becomes necessary as the corpus grows.
Derived from the repo. The repo remains authoritative.

**Layer 6: Publishing Surfaces** *(deferred)*  
Documentation portal, support knowledge base, marketing reference.
All mirror canonical docs from the repo. Not authoritative themselves.

---

## 12. Key Findings

For Saiko specifically, the following findings are most relevant.

**Data and knowledge should remain separate layers.** SaikoFields is a data
platform. The knowledge control system governs operational and product
knowledge. They are different systems with different consumers and governance.

**The repo-as-canonical model is the right call.** AI coding assistants, internal
agents, and future retrieval systems all require machine-readable, versioned,
stable-path documents. Only the repo provides this.

**Document structure is infrastructure, not overhead.** The metadata fields
already defined in SKI/LIFT (ID, status, owner, consumer systems) are
exactly the fields that make documents queryable by AI systems. This
investment pays forward to every downstream consumer.

**The registry is the missing piece.** A machine-readable index of all
controlled documents is what makes the system queryable without humans
in the loop. Without it, downstream systems must know document paths
in advance.

**AI knowledge ingestion is unsolved industry-wide.** No dominant standard
has emerged for promoting AI collaboration output into canonical form.
The companies doing this best are using AI to draft the documents from
conversation transcripts, then promoting those drafts through review.
Saiko's existing LIFT/SKAI format positions it well to do this.

---

## DEC-002

| Field | Value |
|-------|-------|
| **Type** | decision |
| **Status** | active |
| **Project** | KNOWLEDGE-SYSTEM |
| **Path** | `docs/decisions/DEC-002.md` |
| **Last Updated** | Wed Mar 11 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | All canonical knowledge documents live in the repository under /docs, using markdown with structured frontmatter for both human readability and machine parsing. |
| **Systems** | knowledge-system, repo-workflow |

# DEC-002 — Repo-Based Canonical Knowledge Store

**Status:** Active
**Date:** 2026-03-12
**Authority:** Bobby Ciccaglione

---

## Context

Saiko requires a system for storing institutional knowledge that is both human-readable and machine-accessible. External documentation systems introduce friction for indexing, retrieval, and automation.

To support automated knowledge retrieval, project kickoff context packets, and decision indexing, canonical documents must live in a location that supports version control, deterministic structure, and programmatic access.

---

## Decision

All canonical knowledge documents will live directly in the repository under the `/docs` directory.

Markdown with structured frontmatter will be used so documents remain readable to humans while also enabling machine parsing and indexing.

Decision records extracted from those documents are stored separately under `/docs/decisions/` and indexed through the Decision Index.

---

## Expected Impact

This architecture enables:

- Version-controlled knowledge
- Automated decision indexing
- Reproducible project context retrieval
- Machine-readable documentation for AI systems

---

## Relations

- Implements the architecture described in `SKAI/DECISION-INDEX-SPEC-V1`
- Supersedes any prior use of external documentation systems (Notion, Google Docs) as canonical knowledge stores

---

## SKAI-DOC-TRACES-PLACE-PAGE-DESIGN-001

| Field | Value |
|-------|-------|
| **Type** | traces |
| **Status** | active |
| **Project** | PLACE-PAGE |
| **Path** | `docs/traces/place-page-design-v1.md` |
| **Last Updated** | Tue Mar 10 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Canonical design spec for the Saiko place profile page — wireframe, data sources, content model, and rendering rules. |
| **Systems** | place-page, enrichment-pipeline, scenesense |

# Place Page Design v1

## 1. Purpose

Define the canonical layout, data contract, content model, and rendering rules for the entity profile page so that:
- Every enrichment signal has a clear home (or is explicitly excluded)
- The page degrades gracefully when data is sparse
- Design decisions are documented and durable

## 2. Layout

### 2.1 Structure

Two-column layout from the top. No hero image.

- **Left column (~60%)**: Identity + primary CTAs + editorial content
- **Right column (~40%)**: Structured facts rail (hours, address, links, SceneSense)
- **Below columns (full-width)**: Photos → More Maps → References

### 2.2 Wireframe

┌─────────────────────────────────┬──────────────────────────┐
│  {Name}            (lg serif)   │                          │
│  {Identity Line}                │  (softened — right col   │
│  {Open/Closed state}            │   starts below identity) │
│                                 │                          │
│  Reserve ↗  Directions ↗        │                          │
│  ───────────────────────────────│──────────────────────────│
│                                 │  HOURS                   │
│  ABOUT                          │  {formatted hours}       │
│  {description}                  │──────────────────────────│
│  ───────────────────────────────│  ADDRESS                 │
│  OFFERING                       │  {address}  Map ↗        │
│  Food / Wine / Service / Price  │──────────────────────────│
│  ───────────────────────────────│  LINKS                   │
│  COVERAGE NOTE                  │  Website ↗ Instagram ↗   │
│  {pull quote + attribution}     │  Menu ↗                  │
│  ───────────────────────────────│──────────────────────────│
│  TIPS                           │  SCENE                   │
│  · tip 1  · tip 2              │  {scene tags}            │
│                                 │──────────────────────────│
│                                 │  ATMOSPHERE              │
│                                 │  {atmosphere tags}       │
│                                 │──────────────────────────│
│                                 │  AMBIANCE                │
│                                 │  {ambiance tags}         │
└─────────────────────────────────┴──────────────────────────┘
  PHOTOS [grid — collapses if none]
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MORE MAPS [3 map cards, centered — collapses if none]
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  REFERENCES

### 2.3 Right Column Softening

Right column has an empty spacer at the top so the place name dominates. Right column content starts at the same vertical level as the first light rule below the primary CTAs.

### 2.4 Rule Hierarchy

Two tiers:
- **Heavy rule (3px)**: separates major zones — columns→photos, photos→more maps, maps→references. Plain line, no title.
- **Labeled divider (1px)**: separates blocks within each column. Section title centered inline with the 1px line, rule extends on both sides. Editorial/magazine feel.
- **No rule** between items inside a block (individual offering lines, individual tips, individual coverage sources).

## 3. Content Model (LOCKED)

### 3.1 Three Voices — Never Merge

The place page combines up to three distinct narrative voices:

| Voice | Section | Source | Purpose | Tone | Status |
|-------|---------|--------|---------|------|--------|
| **Merchant** | ABOUT | Website about, IG bio, merchant text; synthesized if absent | "What is this place?" | Upbeat, descriptive, slightly enticing, neutral-to-positive | Implement now |
| **External media** | COVERAGE NOTE | LA Times, Eater, Michelin, etc. (coverage_sources) | "Why is this place notable?" | Direct quote, attributed, 1-2 lines max | Implement now |
| **Saiko** | (future) | AI editorial layers (interpretation_cache TAGLINE, etc.) | Saiko's own editorial voice | TBD | Not on page yet |

These voices must never merge. ABOUT and Coverage Note are always separate sections.

### 3.2 ABOUT — Merchant Voice (Identity Layer)

**Purpose**: Introduces the place in the merchant's voice. Most important text block on page.

**Source hierarchy**:
1. Merchant-authored text (website about section, homepage intro, IG bio, pinned captions, manifesto)
2. Synthesized by Saiko from available signals (name, category, menu signals, known dishes, location context) when no merchant text exists — written in merchant style

**Tone**: Upbeat, descriptive, slightly enticing. Neutral-to-positive. NOT salesy, not marketing language, not exaggerated.

**Length**: ~40-80 words (compact identity paragraph, not a long story).

**Visual treatment**: Most important text block — visually distinct. Drop-cap first letter, serif typography, slightly larger line height, inset spacing.

**Current data**: entities.description has 5/143 (short one-liners, hand-seeded). Merchant surface text exists in merchant_surface_artifacts for enriched entities. Synthesis path needed for the rest.

### 3.3 COVERAGE NOTE — External Media Voice (Cultural Validation)

**Purpose**: Surfaces a short quote from trusted editorial/media coverage. "Why is this place notable?"

**Source**: coverage_sources table (LA Times, Eater, Michelin, etc.) + pull quote fields.

**Format**: One sentence (preferred), max two short lines. Direct quotes whenever possible. Always attributed.

**Example**: "The best tortillas in Los Angeles." — LA Times

**Not**: ratings, reviews, user comments, popularity metrics. Trusted cultural signals only.

**Naming**: "Curator's Note" is misleading (implies Saiko editorial). Options: Coverage Note, Press Note, In the Press, What They Say. TBD.

### 3.4 Identity Line (Structural Layer)

**Purpose**: Canonical structural description of the place. Sits directly under the name.

**Source**: Assembled from `primaryVertical`, `wine_program_intent`, `cuisine_posture`, `cuisineType`, `service_model`, `neighborhood` by evolved `getIdentitySublineV2()`.

**Model**: `[Offering] [Format] [and Secondary Format] in [Neighborhood]`

**Examples**:
- "Natural wine bar and daytime café in Silver Lake"
- "French restaurant in the Arts District"
- "Wood-fired bakery in Venice"

**Tone**: Calm, precise, industry-native, guidebook-like. Uses hospitality vocabulary, not invented terms. 6–12 words.

**Fallback**: If only format + neighborhood → "Restaurant in Silver Lake"

### 3.5 Reading Flow

Name → Identity Line (structural) → ABOUT (identity/merchant voice) → Coverage Note (credibility)

This moves the user from structure → identity → validation.

### 3.6 Structured Content (Left Column)

| Section | Data Source | Collapse Rule |
|---------|-----------|---------------|
| Identity (name, identity line, open state) | entities + evolved getIdentitySublineV2() | Name always shown |
| Primary CTAs (Reserve, Directions) | merchant_signals.reservation_url, lat/lng | Hide if no data |
| ABOUT | Merchant text (entities.description, merchant surfaces, or synthesized) | Hide if null |
| Offering | derived_signals (identity_signals + offering_programs) | Hide if all null |
| Coverage Note | coverage_sources + pull quote | Hide if empty |
| Tips | entities.tips | Hide if empty array |

### 3.7 Facts Rail (Right Column)

| Section | Data Source | Collapse Rule |
|---------|-----------|---------------|
| Hours | entities.hours (parsed) | Hide if null |
| Address | entities.address | Hide if null |
| Links | entities.website, instagram, merchant_signals.menu_url | Hide if all null |
| Scene | scenesense.scene | Hide if PRL < 3 |
| Atmosphere | scenesense.atmosphere | Hide if PRL < 3 |
| Ambiance | scenesense.ambiance | Hide if PRL < 3 |

### 3.8 Full-Width Sections

| Section | Data Source | Collapse Rule |
|---------|-----------|---------------|
| Photos | entities.googlePhotos | Hide if empty |
| More Maps | appearsOn (published maps) | Hide if empty. Max 3 cards. |
| References | Coverage sources + data provenance | Always show if any content rendered |

## 4. Data Gaps (Current → Target)

| Data | Exists in DB | Wired to API? | Wired to Page? |
|------|-------------|---------------|----------------|
| Reservation URL | merchant_signals.reservation_url | ❌ (reads entities.reservationUrl) | Partially |
| Beverage programs | derived_signals.offering_programs | ❌ | ❌ |
| Place personality | derived_signals.identity_signals | ❌ | ❌ |
| Signature dishes | derived_signals.identity_signals | ❌ | ❌ |
| Language signals → SceneSense | derived_signals.identity_signals | ❌ (passed as null) | Indirectly |
| Full identity signals (6 extra fields) | derived_signals.identity_signals | ❌ (only 4/10 read) | ❌ |

## 5. Rendering Rules

### 5.1 Offering Section

Beverage programs use the locked maturity vocabulary (SKAI-DOC-TRACES-BEVERAGE-PROGRAM-VOCAB-001):
- `dedicated` → "Dedicated wine program" (or beer/cocktail)
- `considered` → "Considered wine selection"
- `incidental` → "Wine available"
- `none` / `unknown` → do not render

Food line uses cuisine_posture phrases. Service + Price use existing phrase maps.

### 5.2 SceneSense (SKAI-DOC-SS-001)

- PRL < 3 → render nothing (all three surfaces hidden)
- PRL 3 (LITE) → max 2 tags per surface
- PRL 4 (FULL) → max 4 tags per surface
- UI renders arrays as-is — no re-sorting, filtering, capping
- Never read raw language_signals in UI

### 5.3 Collapse Rules

Every block collapses silently if empty. No placeholders, no "coming soon", no empty states. Per Merchant Data Hierarchy v2.1: blocks earn their space.

## 6. Design Philosophy

- Text-first research paper / museum placard / guidebook
- NOT Yelp / Google Maps / food blog
- Strong typographic hierarchy
- No hero image
- Existing CSS token system: 35+ custom properties in place.css

## 7. Build Approach

Incremental (data first):
- **Phase 1**: Wire all data gaps through contract → API → page. No layout changes. Verify with Camphor on localhost.
- **Phase 2**: Restructure to the two-column wireframe.

## 8. Key Files

| File | Role |
|------|------|
| app/(viewer)/place/[slug]/page.tsx | Profile page component |
| app/(viewer)/place/[slug]/place.css | Tokenized CSS |
| app/api/places/[slug]/route.ts | API route |
| lib/contracts/place-page.ts | Data contract |
| lib/contracts/place-page.identity.ts | Identity line helpers |
| scripts/assemble-offering-programs.ts | WO-006 beverage programs |
| lib/scenesense.ts | SceneSense assembly |

## 9. Showcase Entity

**Camphor** (slug: camphor-restaurant-2-michelin-1-michelin-star-arts-district-french)
- Identity signals: cuisine_posture=balanced, service_model=small-plates, price_tier=$$$, wine_program_intent=classic, place_personality=chef-driven
- Reservation URL in merchant_signals
- 8 language signal descriptors
- Google Places: address, lat/lng, phone, hours, photos
- No description, no curator note

## 10. Resolved Decisions

1. **ABOUT vs Coverage Note vs Saiko Voice** — LOCKED. Three distinct voices, never merge. ABOUT = merchant voice (identity). Coverage Note = external media (validation). Saiko Voice = future, not on page yet. AI tagline from interpretation_cache is Saiko Voice — deferred.

## 11. Open Questions

1. **ABOUT content sourcing**: Does every place get an ABOUT? If so, where does synthesized ABOUT text come from for places without merchant-authored text? (Only 5/143 have entities.description. Merchant surface artifacts have raw website text but no ABOUT extraction yet.)
2. **Coverage Note naming**: "Curator's Note" is misleading. Final name TBD (Coverage Note, Press Note, In the Press, What They Say).
3. **Reference Ledger launch rule**: "No derived signals unless ≥1 ledger reference exists" — when does this gate activate?
4. **Reference Confidence Model**: Not all references are equal (LA Times vs merchant site). Needs design.
5. **Established year**: Where does it live? (Future field for identity block)
6. **Offering summary**: Single-sentence "sign language" from Place Page Data Contract v1 — how does it relate to the Offering section?

---
Revision History

| Version | Date | Changes | Author |
|---|---|---|---|
| 1.0 | 2026-03-11 | Initial design spec from planning session | Bobby / Claude |

---

## ARCH-AI-OPERATING-LAYER

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/ai_operating_layer.md` |
| **Last Updated** | 2026-03-10 |
| **Systems** | platform |

# AI OPERATING LAYER
Saiko Engineering System

Status: STAGING
Date: 2026-03-10
Authority: Bobby Ciccaglione

## Purpose

This document lists the operational systems that govern AI-assisted engineering in the Saiko repository.

These systems provide structure for:

- architecture stability
- AI session continuity
- engineering workflow discipline
- drift prevention

These systems are infrastructure for the engineering system rather than product functionality.

---

## Operational Systems

### Boot Protocol

Defines how engineering sessions begin and end.

File:
ai-operations/docs/boot_protocol.md

Commands:
npm run session:start
npm run session:end

Status:
STAGING — operational testing

---

### System Contract

Defines the architectural rules governing the SaikoFields platform and TRACES product.

File:
docs/architecture/system_contract.md

Status:
ACTIVE

---

### Drift Prevention Policy

Defines locked architectural decisions and drift prevention procedures.

Status:
ACTIVE

---

### Session Log Dataset

Structured log of engineering sessions.

Location:
ai-operations/sessions/

Generated by:
npm run session:end

Status:
STAGING

---

### Cursor Operational Rules

Persistent rule set used by Cursor to enforce architecture and workflow constraints.

Location:
.cursor/rules/

Status:
ACTIVE

---

## ARCH-SYSTEM-CONTRACT

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/system_contract.md` |
| **Last Updated** | 2026-03-10 |
| **Systems** | platform |

# SYSTEM CONTRACT
SaikoFields / TRACES

Status: ACTIVE
Version: v1.0
Date: 2026-03-09
Authority: Bobby Ciccaglione

## Purpose

This document defines the architectural contract for the SaikoFields platform and the TRACES product.

It describes the structural rules that govern the system architecture.

Other operational documents reference this contract.

## Sections

1. System Identity
2. System Layers
3. Core Principles
4. Data Model Rules
5. Platform Boundaries
6. Rendering Layer
7. Operational Constraints
8. Active Systems

---

## 1. System Identity

Saiko is a cultural place data platform.

The system is composed of two primary layers:

**SaikoFields**
The infrastructure layer responsible for collecting, storing, and structuring cultural place data.

**TRACES**
The consumer product layer responsible for rendering Fields data into human-readable experiences such as maps, guides, and place pages.

SaikoFields produces datasets.

TRACES consumes those datasets to create user-facing products.

The separation between these layers is a foundational architectural rule of the system.

---

## 2. System Layers

The Saiko system operates across three structural layers.

**Saiko SPORT**
The organizational umbrella for the Saiko ecosystem.
Defines product direction, brand, and strategic scope.

**SaikoFields**
The infrastructure layer responsible for collecting, structuring, and maintaining cultural place datasets.
Fields is the canonical data layer of the system.

**TRACES**
The consumer product layer built on top of SaikoFields.
TRACES renders Fields data into user-facing experiences such as maps, guides, and place pages.

### Layer Responsibilities

SPORT defines the mission.
Fields produces the data.
TRACES presents the data.

### Architectural Rule

SaikoFields must remain independent of any specific consumer product implementation.

TRACES may evolve, but Fields must remain stable as a reusable data platform.

---

## 3. Core Principles

The Saiko platform follows several core architectural principles.

### Dataset Orientation

SaikoFields produces structured datasets describing cultural places and their relationships.
The system is designed to support multiple products and analytical uses built on top of these datasets.

### Append-Oriented Records

Fields data is append-oriented whenever possible.
New information is recorded as additional signals or records rather than overwriting historical data.

### Trace-Based Meaning

All cultural meaning in the system enters through Traces.
Objects such as entities, actors, and collections do not carry direct meaning relationships between each other.

Relationships are expressed through Trace records.

### Rendering Separation

Human-readable output is generated by the consumer layer.

SaikoFields stores structured data only.
Rendering systems such as TRACES transform this data into human-readable experiences.

### Provenance

All signals and traces must maintain provenance.
The system should be able to answer where a piece of information originated and how it entered the system.

---

## 4. Data Model Rules

The SaikoFields data model is designed to represent cultural places and the signals that describe them.

### Core Objects

The system uses a small number of core object types:

**Entities**
Represent real-world places or cultural venues.

**Actors**
Represent people or organizations that participate in cultural activity.

**Collections**
Represent curated groupings of entities.

**Traces**
Represent relationships and signals between objects.

### Trace Rule

Direct foreign key relationships between core objects are avoided.

Instead, relationships are expressed through Trace records that link objects together.

This structure ensures that meaning in the system is expressed through signals rather than fixed schema relationships.

### Stability

The set of core object types should remain small and stable.

New functionality should typically be expressed through additional traces or signals rather than introducing new core object types.

---

## 5. Platform Boundaries

The Saiko system maintains strict boundaries between infrastructure and consumer layers.

### Fields Responsibilities

SaikoFields is responsible for:

- ingesting cultural place data
- structuring datasets
- maintaining signals and traces
- preserving provenance
- exposing structured datasets to consumers

SaikoFields does not render user-facing content.

### TRACES Responsibilities

TRACES is responsible for:

- rendering human-readable experiences
- generating descriptions and editorial synthesis
- building user interfaces such as maps, guides, and place pages
- consuming Fields datasets through defined interfaces

TRACES does not modify core Fields datasets directly.

### Architectural Boundary

SaikoFields functions as a reusable data platform.

Consumer products such as TRACES may evolve independently, but must interact with Fields through defined interfaces rather than modifying infrastructure behavior.

---

## 6. Rendering Layer

Human-readable output is produced by consumer products built on top of SaikoFields.

Rendering systems transform structured data into experiences such as:

- place pages
- guides
- maps
- search results
- editorial descriptions

SaikoFields does not generate or persist rendered text.

Rendering logic belongs to the consumer layer.

In the current system architecture, this rendering layer is implemented by TRACES.

The separation between structured data and rendered output ensures that the same dataset can support multiple consumer products without altering the underlying data layer.

---

## 7. Operational Constraints

The Saiko system operates under a set of operational constraints designed to protect architectural integrity and data reliability.

### Database Access

All database access must occur through the designated data access layer.

Direct database access outside the approved data access modules is prohibited.

### Migrations

Schema changes must be implemented through formal migration files.

Untracked schema changes are considered system drift.

### Environment Validation

Environment variables must be validated before any database connection or system startup.

### Infrastructure Discipline

Infrastructure scripts, ingestion pipelines, and enrichment programs must respect the architectural boundaries defined in this document.

### Drift Protection

The system is protected by the System Drift Prevention Policy (SKI/OPS-001).

That document defines locked decisions, drift detection procedures, and the supersede process required to modify core architectural rules.

---

## 8. Active Systems

The Saiko platform contains several operational subsystems responsible for maintaining and enriching the cultural place dataset.

These systems operate within the architectural constraints defined in this document.

### Ingestion Pipeline

Responsible for collecting and importing cultural place data into SaikoFields.

### Enrichment Systems

Programs that expand datasets by extracting structured signals from external sources such as merchant websites or structured data feeds.

### Trace System

Responsible for recording relationships and signals between entities, actors, and collections.

### Product APIs

Interfaces that expose structured Fields datasets to consumer products such as TRACES.

### Rendering Systems

Consumer-layer systems responsible for transforming structured data into human-readable experiences.

The current rendering system is implemented through TRACES.

---

## FIELDS-ERA-OVERVIEW-V1

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/fields-era-overview-v1.md` |
| **Last Updated** | Wed Mar 11 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Defines Entity Record Awareness (ERA) — how Saiko becomes aware a place exists, separating awareness from canonical (Golden) status to prevent silent drift. |
| **Systems** | fields-data-layer, data-pipeline |

# Entity Record Awareness (ERA) — One-Pager

**Scope:** Top-of-funnel place awareness → canonical promotion

---

## What This Is

Entity Record Awareness (ERA) describes how Saiko becomes aware that a place exists.

ERA is the first contact layer of the Saiko system. It comes before enrichment, confidence scoring, and canonical (Golden) status.

This document exists to:
- Establish a shared mental model for how records enter Saiko
- Separate awareness from truth
- Prevent silent canonical drift

This is not a UI spec or a redesign proposal.

---

## Core Principle

**Awareness ≠ Canon**

A place being known to Saiko does not mean:
- It is correct
- It is complete
- It should be trusted
- It should be promoted

ERA answers exactly one question: "Does the system know this place exists?"

Canonical status is earned later through explicit gates.

---

## How Places Become Known (ERA Paths)

Saiko becomes aware of places through multiple entry paths. All of these create entities (awareness records), not canon.

**Primary ERA Surfaces**
- Map Creation UI — Search, Google Maps link, CSV upload
- Add-to-List / Import flows
- CLI ingestion scripts

**Key Characteristics**
- Some paths require a `google_place_id`
- Some paths allow records without GPID
- No ERA path directly confers Golden status

ERA paths are intentionally permissive; canon is intentionally strict.

---

## ERA vs Canon (Golden Records)

Saiko is designed as a golden-first canonical system.

- ERA creates awareness
- Canon (Golden Records) represents belief

**Canon is controlled by:**
- Explicit promotion steps
- GPID requirements
- Survivorship and merge rules
- Enrichment and confidence gates

Promotion is opt-in, never implicit.

---

## Known Risks (If ERA Is Not Managed)

Without explicit ERA discipline, systems drift. Observed drift takes the form of:
- Entities without GPID
- Duplicate entities for the same place
- Orphan entities that never enrich
- Missing coordinates or stalled confidence scores

These are symptoms, not root causes. The root cause is uncontrolled awareness → canon assumptions.

---

## Why ERA Exists

ERA exists to allow Saiko to:
- Be curious without being careless
- Accept imperfect inputs without polluting canon
- Separate discovery from belief
- Scale ingestion without sacrificing integrity

ERA is not a weakness in the system. It is the safety layer that makes canonical rigor possible.

---

## Bottom Line

- ERA is how Saiko learns a place exists
- Canon is how Saiko decides a place matters
- Confusing the two creates drift
- Separating them creates durability

This document is the canonical reference for that separation.

---

## SAIKO-DEFERRED-MIGRATION-GATES

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/DEFERRED_MIGRATION_GATES.md` |
| **Last Updated** | Wed Mar 11 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Gate conditions that must be satisfied before applying the two deferred Fields v2 migrations — slim entities and legacy table drop. |
| **Systems** | fields-data-layer, database |

# Deferred Migration Gates

**Purpose:** Define the explicit conditions that must be true before applying either of the two deferred Fields v2 migrations.

These migrations are not abandoned. They represent the intended final state of the Fields v2 architecture. They are deferred because prerequisites are incomplete, not because the direction has changed.

---

## The Two Deferred Migrations

| Migration | File | What it does |
|-----------|------|--------------|
| Migration 1 | `20260306200000_slim_entities_fields_v2` | Removes non-routing fields from `entities` table |
| Migration 2 | `20260306300000_drop_legacy_tables_fields_v2` | Drops legacy tables no longer needed in v2 |

---

## Gate 1 — Prerequisites for Migration 1 (Slim Entities)

All of the following must be true before applying `20260306200000`:

### Data migration complete
- [ ] All canonical factual fields migrated to `canonical_entity_state` and verified
- [ ] `scripts/populate-canonical-state.ts` has run successfully across full entity corpus
- [ ] Row count parity verified: every `entities` row has a corresponding `canonical_entity_state` row

### Operational fields migrated
- [ ] `last_enriched_at` migrated to `place_coverage_status.last_success_at`
- [ ] `needs_human_review` migrated to `place_coverage_status.needs_human_review`
- [ ] `category_enrich_attempted_at` migrated to `place_coverage_status.last_attempt_at`

### API and application reads updated
- [ ] All API routes reading factual fields from `entities` updated to read from `canonical_entity_state`
- [ ] Dual-read period completed and verified — no active reads from fields being removed
- [ ] No active references to `enrichment_stage` in any live code path

### FK rewires complete
- [ ] EntityActorRelationship FK rewired to `entities.id` — `scripts/migrate-actor-relationships-to-entities.ts` complete
- [ ] All remaining downstream FK references verified against `entities.id` not legacy table IDs

### Verification
- [ ] Smoke test: place page renders correctly for 10 spot-checked entities
- [ ] Zero application errors in staging after migration dry-run

---

## Gate 2 — Prerequisites for Migration 2 (Drop Legacy Tables)

Gate 1 must be fully complete before Gate 2 is evaluated.

All of the following must additionally be true before applying `20260306300000`:

### Legacy tables are provably unused
- [ ] Zero active reads from legacy tables in any API route, script, or cron
- [ ] Zero active writes to legacy tables
- [ ] Search across codebase for legacy table names confirms no live references

### Interpretation cache stable
- [ ] `interpretation_cache` populated for all entity types that previously relied on legacy table fields
- [ ] `is_current` flag logic verified correct per `(entity_id, output_type, prompt_version)`

### Backup confirmed
- [ ] Point-in-time backup of database taken immediately before applying
- [ ] Recovery path documented and tested

### Final verification
- [ ] Full regression pass on place page, map view, and search surfaces
- [ ] Ken sign-off on Gate 2 readiness

---

## Rule

Neither migration may be applied until its gate conditions are fully checked.

Partial completion does not qualify. Gates are binary: all conditions met, or not ready.

If a condition cannot be met as written, it must be explicitly revisited and the gate updated — not silently bypassed.

---

## SAIKO-ENTITIES-CONTRACT-RECONCILIATION

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/ENTITIES_CONTRACT_RECONCILIATION.md` |
| **Last Updated** | Wed Mar 11 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Field-level audit and decision log for the entities table — what belongs, what migrates, and what is retired as part of the Fields v2 architecture. |
| **Systems** | fields-data-layer, database |

# Entities Contract Reconciliation

**Purpose:** Field-level audit and decision log for the `entities` table.
Defines which fields belong on `entities`, which migrate to downstream layers, and which are retired.

---

## Governing Principle

`entities` is a routing shell. It is not a data store.

Every field on `entities` must justify its presence as a routing or identity anchor. Fields that fail that test belong elsewhere or are retired.

See `docs/FIELDS_V2_TARGET_ARCHITECTURE.md` for the full four-layer model.

---

## Field Disposition Table

### Keep on `entities` (routing shell justified)

| Field | Justification |
|-------|---------------|
| `id` | Primary key — durable FK anchor for all downstream tables |
| `slug` | URL-safe routing key — must never change once set |
| `primary_vertical` | Required for routing, filtering, display scoping |
| `status` | PlaceStatus: OPEN / CLOSED / PERMANENTLY_CLOSED — product-facing gate |
| `businessStatus` | From Google — CLOSED_PERMANENTLY gates page display at routing layer |
| `entity_type` | venue / activity / public — base classification |
| `created_at` | Immutable provenance timestamp |
| `updated_at` | Lifecycle tracking |

---

### Migrate to `canonical_entity_state`

| Field | Reason |
|-------|--------|
| `name` | Canonical factual data — not routing |
| `google_place_id` | Identity anchor but lives in canonical state, not routing shell |
| `address` | Factual data |
| `neighborhood` | Factual data |
| `latitude` / `longitude` | Factual data |
| `phone` | Factual data |
| `website` | Factual data |
| `instagram` | Factual data |
| `hours_json` | Factual data — high churn, belongs in canonical state |
| `price_level` | Factual data |
| `reservation_url` | Factual data |
| `menu_url` | Factual data |
| `winelist_url` | Factual data |
| `description` | Factual/editorial — canonical state |
| `cuisine_type` | Factual data |
| `category` | Factual data |
| `tips` | Editorial — canonical state |
| `google_photos` | Factual reference data |
| `google_places_attributes` | Factual reference data |

---

### Migrate to `place_coverage_status`

| Field on `entities` | Target field | Source value |
|---------------------|-------------|--------------|
| `last_enriched_at` | `last_success_at` | `source = 'WEBSITE_ENRICHMENT'` |
| `needs_human_review` | `needs_human_review` | — |
| `category_enrich_attempted_at` | `last_attempt_at` | `source = 'CATEGORY_ENRICH'` |
| `enrichment_stage` | Retire | Type-drifted, not consumed by v2 paths |

---

### Migrate to `interpretation_cache`

| Field | Reason |
|-------|--------|
| `tagline` | AI-generated interpretive output — not factual |
| `pull_quote` | Editorial interpretive output |
| `tips` (AI-generated variant) | Interpretive — if AI-generated, belongs here not canonical state |

---

### Retire (no new home)

| Field | Reason |
|-------|--------|
| `restaurantGroupId` | Legacy relationship model — superseded by actor relationships |
| `adUnitOverride` | Legacy product feature — not part of v2 |
| `chef_recs` | Legacy — superseded by actor relationship model |
| `prlOverride` | Legacy — superseded by interpretation_cache + confidence system |
| `enrichment_stage` | Type-drifted — not consumed by any v2 path |

---

## Migration Status

| Migration | Status |
|-----------|--------|
| Slim entities (remove non-routing fields) | Deferred — migration `20260306200000_slim_entities_fields_v2` |
| Drop legacy tables | Deferred — migration `20260306300000_drop_legacy_tables_fields_v2` |
| `canonical_entity_state` population | In progress — `scripts/populate-canonical-state.ts` |
| `place_coverage_status` operational fields | Not yet migrated |
| EntityActorRelationship FK rewire | In progress |
| FieldsMembership FK rewire | Done |
| TraceSignalsCache FK rewire | Done |

---

## Decision Log

**2026-03-09:** Fields v2 four-layer model locked. `entities` defined as routing shell only.
All field dispositions in this document derive from that architectural decision.
See `docs/FIELDS_V2_TARGET_ARCHITECTURE.md` Anti-Drift Rules 1–4.

---

## SAIKO-FIELDS-V2-TARGET-ARCHITECTURE

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/FIELDS_V2_TARGET_ARCHITECTURE.md` |
| **Last Updated** | Wed Mar 11 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Defines the four-layer Fields v2 architecture — entities routing shell, canonical_entity_state, interpretation_cache, and place_coverage_status — with anti-drift rules and current migration status. |
| **Systems** | fields-data-layer, database |

# Saiko Fields v2 — Target Architecture Spec

**Status:** Reference / Enforced
**Purpose:** Anti-drift alignment for the Fields v2 migration completion
**Last Updated:** 2026-03-12

---

## Core Principle

Fields v2 separates entity identity, canonical current-state data, editorial/interpretive output, and operational workflow state into four distinct layers.

Each layer has:
- a clear purpose
- a clear lifecycle
- a clear owner
- minimal overlap with adjacent layers

**The anti-drift rule:** If a field is proposed for `entities`, it must justify why it belongs to the routing shell and cannot live in one of the other three layers. Default to no.

---

## Target Layer Model

```
                 ┌──────────────────────┐
                 │       entities       │
                 │  routing shell only  │
                 └──────────┬───────────┘
                            │ entity_id
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌─────────────────┐ ┌────────────────────┐ ┌──────────────────────┐
│canonical_entity_│ │ interpretation_    │ │ place_coverage_      │
│state            │ │ cache              │ │ status               │
│                 │ │                    │ │                      │
│ factual truth   │ │ editorial /        │ │ operational workflow │
│ current state   │ │ derived outputs    │ │ state                │
└─────────────────┘ └────────────────────┘ └──────────────────────┘
```

---

## Layer A — entities

**Role:** Routing shell / durable entity anchor

### What it is
`entities` is the thin, stable shell used to identify and route to an entity across the system. Every place that exists in Saiko has exactly one `entities` row. All downstream tables FK to `entities.id`.

### Allowed fields (target final state)

| Field | Justification |
|-------|---------------|
| `id` | Primary key — durable FK anchor for all downstream tables |
| `slug` | URL-safe routing key — must never change once set |
| `primary_vertical` | Type classification required for routing, filtering, display scoping |
| `status` | PlaceStatus: OPEN / CLOSED / PERMANENTLY_CLOSED — product-facing status |
| `businessStatus` | From Google — CLOSED_PERMANENTLY gates page display at the routing layer |
| `entity_type` | venue / activity / public — base classification |
| `created_at` | Immutable provenance timestamp |
| `updated_at` | Lifecycle tracking |

### What does NOT belong here

| Category | Examples | Correct layer |
|----------|----------|---------------|
| Canonical data | name, address, coordinates, phone, website, hours | `canonical_entity_state` |
| Editorial content | tagline, pull_quote, tips, descriptions | `interpretation_cache` |
| Operational pipeline state | enrichment stages, retry counts, review flags | `place_coverage_status` |
| Confidence/scoring | confidence scores, sanction metadata | `canonical_sanctions` |
| Enrichment metadata | description_source, last_enriched_at | `place_coverage_status` |
| Legacy / deprecated | restaurantGroupId, adUnitOverride, chef_recs, prlOverride | Retire — no new home |

### Lifecycle
Very stable. Should be low-churn. An `entities` row is created once and rarely changes. The routing shell should not be the subject of enrichment pipelines.

---

## Layer B — canonical_entity_state

**Role:** Canonical current-state entity data

### What it is
`canonical_entity_state` holds the best current structured truth about an entity. Values here are sanctioned — they are backed by a row in `canonical_sanctions` that records which observed claim won and why.

This is the table that answers: **What is currently true about this entity?**

### Allowed fields (representative examples)
- `name`, `google_place_id`
- `address`, `neighborhood`
- `latitude`, `longitude`
- `phone`, `website`, `instagram`
- `hours_json`, `price_level`
- `reservation_url`, `menu_url`, `winelist_url`
- `description`, `cuisine_type`, `category`, `tips`
- `google_photos`, `google_places_attributes`
- `last_sanctioned_at`, `sanctioned_by`

### What does NOT belong here
- Interpretive outputs (taglines, pull quotes) — those go in `interpretation_cache`
- Pipeline state (retry counts, error codes) — those go in `place_coverage_status`
- Claim-level evidence — that lives in `observed_claims`

### Lifecycle
Changes when the current structured truth changes — i.e., when a new sanctioned value supersedes the previous one. Lower churn than `place_coverage_status`, higher churn than `entities`.

---

## Layer C — interpretation_cache

**Role:** Editorial / derived / interpretive outputs

### What it is
`interpretation_cache` holds rendered or derived interpretation that is useful for product surfaces but is not the canonical factual source of truth. These outputs are regenerable and versioned.

This layer answers: **How do we describe or interpret this entity for product use?**

### Allowed output types (InterpretationType enum)

| Type | Description |
|------|-------------|
| `TAGLINE` | Short descriptive tagline for product display |
| `PULL_QUOTE` | Editorial pull quote with attribution |
| `SCENESENSE_PRL` | Place Readiness Level + atmosphere descriptors |
| `VOICE_DESCRIPTOR` | Long-form voice-engine narrative |

### What does NOT belong here
- Factual data (addresses, hours) — those go in `canonical_entity_state`
- Pipeline state — that goes in `place_coverage_status`
- Raw observed claims — those go in `observed_claims`

### Lifecycle
Regenerable. Can be invalidated and rebuilt. Versioned by `prompt_version` and `model_version`. `expires_at` allows time-based invalidation. `is_current` flags the active row per `(entity_id, output_type, prompt_version)`.

---

## Layer D — place_coverage_status

**Role:** Operational workflow state

### What it is
`place_coverage_status` holds machine/process state for ingestion, coverage, retries, failures, and enrichment progress. It is the operational dashboard for each entity's data pipeline status.

This layer answers: **What is the workflow status of enrichment and coverage for this entity?**

### Allowed fields (representative examples)
- `last_success_at`, `last_attempt_at`, `last_attempt_status`
- `last_error_code`, `last_error_message`
- `last_missing_groups`
- `source` — which pipeline produced this status
- `needs_human_review` — flag for human intervention required

### Fields that should migrate here from entities

| `entities` field | Target field in `place_coverage_status` |
|------------------|-----------------------------------------|
| `last_enriched_at` | `last_success_at` (source = `'WEBSITE_ENRICHMENT'`) |
| `needs_human_review` | `needs_human_review` |
| `enrichment_stage` | Retire — type-drifted and not consumed by v2 paths |
| `category_enrich_attempted_at` | `last_attempt_at` (source = `'CATEGORY_ENRICH'`) |

### Lifecycle
High-churn. Changes frequently with machine activity. Designed for rapid read/write from pipeline scripts.

---

## Anti-Drift Rules

**Rule 1: `entities` is closed to new operational fields**
No new pipeline state, enrichment metadata, review flags, or workflow residue may be added to `entities`. Any proposed addition must be justified as a routing shell necessity.

**Rule 2: `canonical_entity_state` is closed to interpretive outputs**
Taglines, pull quotes, narrative descriptions, and AI-generated copy belong in `interpretation_cache`. `canonical_entity_state` holds structured facts only.

**Rule 3: `interpretation_cache` is not a source of truth**
Nothing that requires factual accuracy should be read from `interpretation_cache` alone. Downstream consumers must fall back to `canonical_entity_state` for factual fields.

**Rule 4: Deferred migrations are the plan, not abandoned code**
The two deferred migrations (`20260306200000_slim_entities_fields_v2` and `20260306300000_drop_legacy_tables_fields_v2`) represent the intended final state of this architecture. They are not to be removed. Prerequisites must be completed and gates must be checked before applying.

---

## Current Migration Status

| Layer | Status |
|-------|--------|
| `entities` routing shell | Deferred — blocked by slim-entities prerequisites |
| `canonical_entity_state` population | In progress — `scripts/populate-canonical-state.ts` exists |
| `interpretation_cache` (taglines, pull quotes) | Partially populated — dual-read in API routes |
| `place_coverage_status` (operational fields) | Not yet migrated — `last_enriched_at`, `needs_human_review` still on `entities` |
| EntityActorRelationship FK rewire | In progress — `scripts/migrate-actor-relationships-to-entities.ts` |
| FieldsMembership FK rewire | Done — migration `20260307000000` applied |
| TraceSignalsCache FK rewire | Done — migration `20260307000001` applied |
| Legacy tables drop | Deferred — blocked by Gate 2 prerequisites |

---

## SAIKO-MERCHANT-DATA-HIERARCHY

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/saiko-merchant-data-hierarchy.md` |
| **Last Updated** | 2026-03-10 |

# Saiko Merchant Data Hierarchy

**Version:** 2.1  
**Status:** Locked  
**Last Updated:** Feb 2026

This document defines the locked data hierarchy for all merchant/place surfaces across Saiko Maps. The hierarchy governs what renders, where it renders, and in what order.

---

## Core Principle

**Data tells the story, not the template.**

Blocks earn their space. If a tier has no data, it collapses cleanly and silently. No placeholders, no apologies, no "coming soon" messages.

---

## Tier Structure

### Tier 0 — Identity + Action

The essential layer. These always render (except when explicitly missing).

| Field | Type | Behavior |
|-------|------|----------|
| **Hero Photo** | Image | Always renders |
| **Name** | String | Always renders |
| **Tagline** | String | Optional, renders if present |
| **Primary Actions** | Buttons | Call, Reserve, Directions (conditional on data) |

**Collapse Logic:**
- Hero and Name never collapse
- Action buttons render only if data exists (phone, reservation URL, coordinates)

---

### Tier 1 — Visual Identity

Establishes mood and personality through imagery.

| Component | Behavior |
|-----------|----------|
| **Instagram Row** | Renders if handle exists; SLIM treatment (single-line, not button-weight) |
| **Photo Collage** | Renders if ≥1 non-hero photo exists; hero must be excluded |
| **Vibe Tags** | Renders if tags exist; optional editorial layer |

**Collapse Logic:**
- Instagram collapses if handle missing or invalid
- Collage collapses if no non-hero photos
- Tags collapse if empty

**Critical Rules:**
- Hero photo must NEVER appear in collage
- Instagram row must be visually lighter than Tier 0 actions
- No "photos coming soon" placeholder

---

### Tier 2 — Editorial + Context

Trust-building through curation and editorial voice.

| Component | Behavior |
|-----------|----------|
| **Trust Block** | Curator note + coverage; collapses if both empty |
| **Hours Card** | **ALWAYS RENDERS** (even with missing data) |

**Trust Block Logic:**
- Curator note renders first if present
- Coverage quote can render without curator note
- Coverage sources can render even if quote is missing
- If none exist → TrustBlock fully collapses
- Never show fake/generated quotes

**Hours Card Logic (CRITICAL):**
- Default: compact (today's window + expand affordance)
- Missing data: shows "Hours unavailable" with neutral styling
- Full week schedule only visible after user expands
- **Never collapses entirely**

---

### Tier 3 — Reference (Facts)

Practical information for visit planning.

| Component | Behavior |
|-----------|----------|
| **Address Card** | Renders if address exists |
| **Map Tile** | Renders if coordinates exist; small/reference-only |

**Map Tile Rules:**
- Must be small and reference-only
- NO "Get Directions" CTA (belongs in Tier 0)
- Collapses if no coordinates

---

### Tier 4 — Attributes

Practical details in compressed format.

| Component | Behavior |
|-----------|----------|
| **Attributes Card** | Renders if ≥1 attribute exists; chip compression |

**Attributes Rules:**
- Render as chips (max ~6 visible by default)
- "+N more" chip to expand
- Never render as labeled table/spec sheet
- No "Service Options / Parking / Meals" row labels

---

### Tier 5 — Discovery

Cross-references and editorial closure.

| Component | Behavior |
|-----------|----------|
| **Also On Lists** | Renders if merchant appears on other lists |
| **House Card** | Renders if house content exists; fixed placement (always last) |

**House Card:**
- Saiko editorial voice / closing thought
- Optional, but when present, always renders last
- Never appears above "Also On"

---

## Render Order (Non-Negotiable)

1. **HeroHeader**
2. **PrimaryActionSet**
3. **InstagramConfidenceRow** *(conditional)*
4. **PhotoCollage** *(conditional)*
5. **VibeTagsRow** *(conditional)*
6. **TrustBlock** *(conditional)*
7. **HoursCard** *(always)*
8. **AddressCard** *(conditional)*
9. **MapTile** *(conditional)*
10. **AttributesCard** *(conditional)*
11. **AlsoOnLists** *(conditional)*
12. **HouseCard** *(conditional, Tier 5)*

---

## Failure Modes

### ❌ Promotion Drift

The page starts to feel like a polished Google profile instead of a curated editorial guide.

**Red flags:**
- Attributes dominate the page
- Map becomes hero-sized
- Instagram styled like a primary button
- Photos pushed below the fold
- Spec sheet labeling (Service Options / Parking / etc.)

### ❌ Empty Containers

Components render with visible padding/borders but no content.

**Examples:**
- Trust block with empty curator shell
- Attributes card with no chips
- Photo collage showing hero duplicate

### ❌ Tier Inversion

Components render out of order.

**Examples:**
- Instagram inside PrimaryActionSet
- Collage below TrustBlock
- Attributes above Hours/Address/Map
- House above "Also On"

---

## Testing Scenarios

### Scenario A — Fully Curated

All tiers render; order intact. The ideal case.

### Scenario B — Editorial Lite

No curator note, but coverage exists. Trust block should render as coverage-only with no empty curator shell.

### Scenario C — Baseline

No trust data, minimal fields. Page should still feel intentional:
- Tier 0 (identity + actions if available)
- Tier 1 (hero/collage if any)
- Tier 3 (HoursCard still present, even if showing "Hours unavailable")
- Tier 4 (attributes if any)
- Tier 5 (house optional)

**Fail if:** Scenario C feels "broken" with gaps, empty cards, or odd stacking.

---

## Surfaces Using This Hierarchy

This hierarchy applies to **all** place-data surfaces:

1. **Merchant Profile Page** (`/place/[slug]`) — Full implementation
2. **Map Popup** — Subset (Tier 0 + Tier 1 only)
3. **List Card** — Subset (Hero + Name + Tagline + Tags)
4. **Share Card** — Subset (Template-specific; always includes hero + name)

**Never invert the hierarchy** across surfaces. A popup shows a subset of the full page, not a reordering.

---

## Change Control

This hierarchy is **locked**. Changes require:

1. Documented rationale
2. Testing across all three scenarios (A, B, C)
3. Visual QA on mobile + desktop
4. Approval from product owner

Do not add new tiers without updating this document.

---

*Saiko Maps · Data Hierarchy Spec · v2.1*

---

## SAIKO-PLATFORM-DATA-LAYER

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/PLATFORM_DATA_LAYER.md` |
| **Last Updated** | 2026-03-10 |

# PLATFORM_DATA_LAYER.md

Saiko Data Layer — Operating Instruction v1
Status: ACTIVE
Owner: Bobby
Last Updated: 2026-02-15

⸻

## 1. Architectural Position (Non-Negotiable)

Saiko is structured as:

1. Saiko Data Layer (Product API)
2. Saiko Maps (Product)
3. Saiko LA (Consumer Product)

Saiko Maps and Saiko LA sit on top of the Data Layer.

The Data Layer is not an implementation detail of Maps.
It is a standalone product responsible for ingesting, structuring, storing, and serving place intelligence.

All features must respect this separation.

⸻

## 2. Core Principle

Ingest first. Apply later.

Menu and winelist signals:
	•	Are ingested once
	•	Are structured and stored
	•	Are freshness-controlled
	•	Are cost-protected

They are not applied directly during ingestion.

Application logic (ranking, tagging, description) must occur downstream of storage.

No feature should bypass the data layer.

⸻

## 3. Layer Responsibilities

### Ingestion Layer

Responsible for:
	•	Scraping
	•	LLM extraction
	•	Validation
	•	Freshness tracking
	•	Cost protection
	•	Storing structured output

Not responsible for:
	•	Ranking
	•	UI logic
	•	Editorial phrasing
	•	Consumer formatting

⸻

### Storage Layer

Source of truth for:
	•	menu_signals
	•	winelist_signals
	•	golden_records
	•	identity fields
	•	signal status fields
	•	provenance metadata

Raw extraction and structured interpretation live here.

No consumer product should read raw signal tables directly.

⸻

### Product API Layer

Exposes stable contracts.

All consumer products consume these contracts, not internal tables.

Contracts must be:
	•	Versionable
	•	Predictable
	•	Refactor-safe
	•	Free of UI-specific logic

⸻

## 4. Product API Contracts (v0)

### A. PlaceCard Contract

Used by:
	•	Search
	•	Explore
	•	Priority Zone (Bento v5)

Purpose:
Fast, ranked, identity-forward surface.

Must include:
	•	id
	•	slug
	•	name
	•	primary_category
	•	neighborhood
	•	price_tier
	•	hero_image
	•	external_credibility_signals
	•	internal_signal_status (menu, winelist)
	•	structured_identity_tags
	•	open_status
	•	distance (if applicable)

PlaceCard does not compute ranking.
It delivers structured data.

⸻

### B. PlaceDetail Contract

Used by:
	•	Saiko LA place page
	•	Saiko Maps place page

Must include:

Everything in PlaceCard, plus:
	•	structured_menu_signals
	•	structured_winelist_signals
	•	cuisine_posture
	•	service_model
	•	identity_confidence
	•	editorial_quote
	•	provenance

No front-end inference allowed.

⸻

### C. Search Contract

Used by:
	•	Saiko LA search
	•	Saiko Maps search

Responsible for:
	•	Query matching
	•	Ranking logic
	•	Pagination

May later include:
	•	Signal-aware boosts
	•	Identity-aware ranking

Search consumes structured PlaceCard data.
It does not perform extraction.

⸻

### D. Recommendation Contract

Used by:
	•	Related places
	•	Neighborhood surfaces
	•	Similar places

Responsible for:
	•	Similarity logic
	•	Identity overlap
	•	Structured tag similarity
	•	Future signal-aware ranking

Recommendation does not re-extract signals.

⸻

## 5. Current State (Explicit)

As of 2026-02-15:

Signals are:
	•	Ingested
	•	Structured
	•	Stored
	•	Freshness-controlled
	•	Cost-protected
	•	Partially surfaced via badges

Signals are NOT yet:
	•	Used in ranking
	•	Used in recommendation scoring
	•	Used to refine structured identity tags
	•	Used to generate descriptions

This is intentional.

The data layer is being stabilized first.

⸻

## 6. Future Direction (Ordered)

Phase 1:
Refine structured identity tags using stored signals.

Phase 2:
Introduce signal-aware ranking (small weighted boosts).

Phase 3:
Generate structured description summaries from stored signals.

No ingestion changes required for these.

⸻

## 7. Guardrails
	•	No feature may bypass structured storage.
	•	No consumer may read raw signal extraction tables directly.
	•	No ranking logic may be embedded in ingestion scripts.
	•	Data layer changes must not break contract stability.
	•	Consumer products may evolve without restructuring ingestion.

⸻

## 8. Strategic Intent

We are not building a map UI.

We are building a structured place intelligence system.

Saiko LA and Saiko Maps are interchangeable clients of the same product API.

The data layer is the leverage.

⸻

---

## SAIKO-PROVENANCE-SYSTEM

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/PROVENANCE_SYSTEM.md` |
| **Last Updated** | 2026-03-10 |
| **Systems** | data-pipeline |

# Saiko Maps - Provenance System

**Chain of Custody for Places**

Every place in Saiko Maps must have a provenance record proving it was added by Bobby, not AI.

## The Rule

```
AI cannot add places. AI can only process places that Bobby added.
```

## Quick Start

### Run an audit

```bash
npm run audit
```

Output:
```
🔍 SAIKO MAPS PROVENANCE AUDIT
════════════════════════════════════════════════════════════

📊 SUMMARY
────────────────────────────────────
  Total places:        1,320
  With provenance:     1,320
  Without provenance:  0

👤 ADDED BY (Chain of Custody)
────────────────────────────────────
  ✓ bobby_bulk_import: 1,320

════════════════════════════════════════════════════════════
✅ AUDIT PASSED
All places have provenance records with human approval.
════════════════════════════════════════════════════════════
```

### What triggers a failure

1. **Orphan places** - Places with no provenance record at all
2. **AI-added places** - Provenance with `addedBy` containing: claude, cursor, ai, auto, bot, etc.

## Daily Workflow

### Adding New Places via CSV

1. Claude researches and generates CSV (AI work)
2. CSV sits in `/data/` as a **suggestion**
3. Bobby reviews and runs `npm run ingest:csv` - **this is the approval stamp**
4. Import script creates provenance with `addedBy: 'bobby_bulk_import'`

Claude never writes directly to `golden_records`. The CSV is the handoff point.

## Commands

```bash
npm run audit                    # Quick audit check
npm run provenance:audit         # Full audit with details
npm run provenance:backfill      # Backfill provenance for new places
```

## Source Types

| Type | Use Case |
|------|----------|
| `editorial` | From a publication (Eater, Infatuation, LA Times) |
| `google_saves` | Bobby's personal Google Maps saves |
| `chef_rec` | Chef recommendation (link to interview/video if available) |
| `video` | From a video source |
| `personal` | Bobby's personal pick, no external source |
| `map_feature` | Added because it's on a curated Saiko map |

## Forbidden Actors

These values in `addedBy` will **fail the audit**:

- `claude`
- `cursor`
- `ai`
- `auto`
- `automated`
- `system`
- `bot`
- `script` (unless explicitly Bobby-approved)

## Database Schema

```prisma
model provenance {
  id            String    @id @default(cuid())
  place_id      String
  
  // WHO - Chain of custody
  added_by      String    // 'bobby', 'bobby_bulk_import' - NEVER AI
  
  // WHY - Source justification
  source_type   String?   // 'editorial', 'google_saves', 'chef_rec', etc.
  source_name   String?   // 'Eater LA', 'Bobby Google Saves', etc.
  source_url    String?   // article/video link if available
  source_date   DateTime? // when published
  
  // CONTEXT
  notes         String?   // freeform context
  import_batch  String?   // 'sfv_expansion', 'beach_cities', etc.
  
  created_at    DateTime  @default(now())
  
  golden_record golden_records @relation(...)
  
  @@index([place_id])
  @@index([added_by])
  @@index([import_batch])
}
```

## Troubleshooting

### "Found orphan places"

Run backfill:
```bash
npm run provenance:backfill
```

### "AI-added places found"

This is a serious issue. Investigate how it happened and either:
1. Delete the place if it shouldn't exist
2. Update provenance if Bobby actually approved it

```sql
-- Fix if Bobby actually approved it
UPDATE provenance 
SET added_by = 'bobby_manual_fix', 
    notes = 'Originally mis-tagged, Bobby confirmed approval'
WHERE place_id = 'xxx';
```

## Current Status

As of February 2026:
- ✅ 1,320 places with provenance
- ✅ 100% Bobby-approved
- ✅ Zero AI-added places
- ✅ Full audit trail

## Why This Matters

1. **Trust**: Users know every place is Bobby-curated, not AI slop
2. **Quality**: Human curation is the differentiator
3. **Accountability**: Clear audit trail for every place
4. **Compliance**: Proves editorial oversight if needed for partnerships/press

---

## SAIKO-RESOLVER-AND-PLACES-DATA-FLOW

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/RESOLVER_AND_PLACES_DATA_FLOW.md` |
| **Last Updated** | 2026-03-10 |
| **Systems** | data-pipeline |

# Resolver pipeline and golden_records → places data flow

## 1. Which tables does the resolver pipeline write to?

**Script:** `scripts/resolver-pipeline.ts`  
**Command:** `npm run resolver:run` (or `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/resolver-pipeline.ts`)

The resolver **writes to**:

| Table | When | Where in code |
|-------|------|----------------|
| **golden_records** | Creates a new canonical place when no candidates match, or when best score &lt; REVIEW_THRESHOLD (“kept separate”) | `prisma.golden_records.create()` — e.g. lines 244–257 (placekey), 312–324 (no candidates), 407–419 (kept separate) |
| **entity_links** | Every time a raw record is linked to a canonical (golden) id | `prisma.entity_links.create()` — e.g. lines 261–268, 328–335, 366–373, 423–430 |
| **raw_records** | Marks a raw record as processed | `prisma.raw_records.update(..., { data: { is_processed: true } })` — e.g. lines 271–274, 337–340, 375–378, 432–435 |
| **review_queue** | Only when best match has score in [REVIEW_THRESHOLD, AUTO_LINK_THRESHOLD) (e.g. 0.70–0.90) | `createReviewQueueItem()` in `lib/review-queue.ts` → `prisma.review_queue.create()` — called from resolver line 386–395 |

The resolver does **not** write to:

- **resolution_links** — that table is written by **`scripts/resolve-golden-first.ts`** (different pipeline).
- **places** — the resolver never touches `places`.

---

## 2. When does the resolver set `raw_records.is_processed = true`?

**Always** when it “disposes” of a raw record in a non–dry-run run. Specifically:

1. **Google Place ID pre-pass** (`googlePlaceIdPrepass`)  
   After linking a raw record to an existing canonical via matching `google_place_id`:  
   `scripts/resolver-pipeline.ts` ~lines 192–195.

2. **Placekey pre-pass** (`placekeyPrepass`)  
   After creating one new golden and linking all raw records that share that placekey:  
   ~lines 271–274.

3. **H3 + ML phase** (`resolveUnprocessedRecords`):
   - **No candidates** → create new golden + entity_link → set `is_processed: true` (~337–340).
   - **Best score ≥ AUTO_LINK_THRESHOLD (0.90)** → create entity_link only → set `is_processed: true` (~375–378).
   - **Best score &lt; REVIEW_THRESHOLD (0.70)** (“kept separate”) → create new golden + entity_link → set `is_processed: true` (~432–435).
   - **Best score in [0.70, 0.90)** → only creates a **review_queue** item; it does **not** set `is_processed: true` (so that record can be re-processed or resolved by human review).

So: for your 86 backbone_seed rows, each one had no H3 candidates, so each got a new `golden_records` row, an `entity_links` row, and `is_processed: true`. That’s why the next run reports 0 unprocessed.

---

## 3. What promotes resolver results into `golden_records` and/or `places`?

- **golden_records**  
  The resolver **itself** creates `golden_records` when it creates a new canonical (no candidates or “kept separate”). Nothing else is required for resolver output to appear in `golden_records`.

- **places**  
  The only script that is intended to **promote from golden_records into places** in this flow is:

  **`scripts/promote-golden-to-places.ts`**

  - **Command (dry-run):**  
    `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/promote-golden-to-places.ts`  
  - **Command (actually write to `places`):**  
    `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/promote-golden-to-places.ts --commit --allow-places-write`

  It:

  - Reads **golden_records** with:
    - `promotion_status` in `PENDING` | `VERIFIED` | `PUBLISHED`
    - `confidence >= threshold` (default 0.7)
    - `lat` and `lng` not null
    - Optionally filtered by `resolution_links.raw_record.intake_batch_id` when you pass `--batch <batchId>`
  - For each such golden not already in `places` (by slug), it **creates** a row in **places** (only if `--commit` and `--allow-places-write` are passed).

Important: **`scripts/resolver-pipeline.ts` does not set `golden_records.confidence`** when it creates new golden records. So the 86 backbone golden records have `confidence = null`. The promote script requires `confidence >= 0.7`, so those 86 are **not** selected and never get promoted to `places`. That’s why you see only 9 rows in `places` (those 9 likely came from another flow, e.g. seed or export).

To promote the backbone golden records you would need to either:

- Set `confidence` (and optionally `promotion_status`) on those golden records (e.g. via a one-off update or a small script), then run promote with `--commit --allow-places-write`, or  
- Change the promote script to treat “new entity” goldens (e.g. from resolver) as promotable when confidence is null (e.g. treat null as 1.0 for “new_entity” links).

---

## 4. Optional: alternative resolver that uses `resolution_links`

**`scripts/resolve-golden-first.ts`** is a different, deterministic resolver that:

- Reads **raw_records** (optionally by batch).
- Writes **resolution_links** and **golden_records** (and links raw → golden).
- Does **not** write to **places**.

So in this codebase:

- **Resolver pipeline** (`resolver-pipeline.ts`): raw → golden_records + entity_links + raw.is_processed (and sometimes review_queue). No resolution_links, no places.
- **Promote** (`promote-golden-to-places.ts`): golden_records → places, gated by confidence and flags; optional filter by resolution_links / intake_batch_id.

---

## 5. File reference

| Purpose | File |
|--------|------|
| Resolver pipeline (H3 + ML, creates golden + entity_links, sets is_processed) | `scripts/resolver-pipeline.ts` |
| Create review queue items (used by resolver for medium-confidence matches) | `lib/review-queue.ts` → `createReviewQueueItem()` |
| Promote golden_records → places (only writer to places in this flow) | `scripts/promote-golden-to-places.ts` |
| Alternative resolver (writes resolution_links + golden_records) | `scripts/resolve-golden-first.ts` |

---

## 6. Sanity check and “what places exist”

### Mental model

- **places** = canonical “real” things the product shows (what users see).
- **golden_records** = canonical candidates / staging (resolver output before promote).
- **raw_records** = intake exhaust (lots of duplicates/noise).
- **entity_links** = glue from raw → golden.

### 1) Sanity check in Prisma Studio

- **places** has no `source_name`; to see recently promoted backbone places, filter by **created_at** (e.g. `>= 2026-02-18` or your promote date).
- Spot-check these names (all 86 backbone places are in `places` with slugs like `unknown-<uuid-prefix>`):
  - Heritage Square Museum → slug `unknown-43ad9252`
  - Watts Towers → slug `unknown-16e44bc6`
  - Olvera Street → slug `unknown-662b447a`
  - Union Station Los Angeles → slug `unknown-6109d974`

### 2) In the app: confirm they render

- Place by slug: **GET `/api/places/[slug]`** (e.g. `/api/places/unknown-16e44bc6` for Watts Towers). Uses `db.places.findUnique({ where: { slug } })`.
- Viewer page: **`/place/[slug]`** (e.g. `http://localhost:3000/place/unknown-16e44bc6`).
- **Note:** **GET `/api/places/search?query=...`** uses the **Google Places API**, not the local `places` table, so searching “Watts Towers” there may not return your backbone row. To “see” backbone places in the app, use the slug URL above or whatever list/explore endpoint reads from `places`.

### 3) Inventory: what places exist

Use either query below (by category or by neighborhood) for a ranked list.

**By category (counts, then top names):**

```sql
SELECT
  COALESCE(category, '(none)') AS category,
  COUNT(*) AS n
FROM places
GROUP BY category
ORDER BY n DESC;
```

**By neighborhood (counts, then top names):**

```sql
SELECT
  COALESCE(neighborhood, '(none)') AS neighborhood,
  COUNT(*) AS n
FROM places
GROUP BY neighborhood
ORDER BY n DESC;
```

**Prisma equivalent (by category):**

```ts
const byCategory = await db.places.groupBy({
  by: ['category'],
  _count: true,
  orderBy: { _count: { category: 'desc' } },
});
```

**Prisma equivalent (by neighborhood):**

```ts
const byNeighborhood = await db.places.groupBy({
  by: ['neighborhood'],
  _count: true,
  orderBy: { _count: { neighborhood: 'desc' } },
});
```

---

## 7. Setting DATABASE_URL cleanly (psql / scripts)

If you set `DATABASE_URL` by capturing output from `node -r ./scripts/load-env.js ...`, Dotenv’s log lines can be included and break `psql` (e.g. “database … does not exist”). Use one of these:

**Option A – set the URL explicitly (no Dotenv):**

```bash
unset DATABASE_URL
export DATABASE_URL="postgresql://bobbyciccaglione@localhost:5432/saiko_maps"
```

**Option B – load from .env but only use the URL (silence Dotenv logs):**

```bash
export DATABASE_URL="$(node -r ./scripts/load-env.js -e 'console.log(process.env.DATABASE_URL)' 2>/dev/null)"
```

Then confirm and run queries:

```bash
psql "$DATABASE_URL" -c "\dt" | head
psql "$DATABASE_URL" -c "
SELECT
  COALESCE(NULLIF(TRIM(neighborhood), ''), '(none)') AS neighborhood,
  COUNT(*) AS places
FROM public.places
GROUP BY 1
ORDER BY places DESC
LIMIT 50;
"
```

---

## FEAT-MARKETS-SPEC-V1-2

| Field | Value |
|-------|-------|
| **Type** | spec |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/features/markets/SPEC_v1.2.md` |
| **Last Updated** | 2026-03-10 |

# Markets Integration — SPEC v1.2

**Version:** 1.2  
**Owner:** Ken  
**Status:** ACTIVE  
**Last verified vs code:** 2026-02-15  
**Canonical path:** /docs/features/markets/SPEC_v1.2.md

---

## Summary

Add recurring public markets (farmers markets, night markets, food halls, flea markets) as first-class Places using the existing Place system.

No new page template.  
No event engine.  
No vendor directory.

Markets validate Saiko as a layered civic mapping platform, not a restaurant-only directory.

---

## Scope

### Included
- Add `placeType` field to places
- Add `categories` table with FK relation
- Add `marketSchedule` JSON field
- Add `parentId` field (future-proof only, unused at launch)
- Update `/api/places/[slug]` to expose classification fields
- Add page-level gating to replace HoursCard with MarketFactsCard for markets

### Excluded
- One-off events
- Ticketing
- Vendor directory
- Real-time schedule logic
- New page templates

---

## Schema Changes

### 1. Enum

```prisma
enum PlaceType {
  venue
  activity
  public
}
```

### 2. Categories Model

```prisma
model categories {
  id        String  @id @default(cuid())
  slug      String  @unique
  label     String
  is_active Boolean @default(true)

  places    places[]
}
```

### 3. Places Model Additions

Add to `places`:

```prisma
placeType     PlaceType @default(venue) @map("place_type")

categoryId    String? @map("category_id")
category      categories? @relation(fields: [categoryId], references: [id])

parentId      String? @map("parent_id")
parent        places?  @relation("PlaceHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
children      places[] @relation("PlaceHierarchy")

marketSchedule Json? @map("market_schedule")

@@index([categoryId])
@@index([parentId])
```

**Migration name:**

```
markets_foundation_place_type_category
```

---

## Seed Data (V1)

Insert initial categories:
- `restaurant`
- `market`
- `food_hall`

No additional taxonomy required for v1.

---

## API Changes

**File:** `app/api/places/[slug]/route.ts`

Add to location payload:

```typescript
placeType: place.placeType,
categorySlug: place.category?.slug ?? (typeof place.category === "string" ? place.category : null),
marketSchedule: place.marketSchedule ?? null,
```

Do not remove legacy category string yet.

Backward compatibility required.

---

## Page Logic Changes

**File:** `app/(viewer)/place/[slug]/page.tsx`

Add to `LocationData`:

```typescript
placeType?: "venue" | "activity" | "public" | null;
categorySlug?: string | null;
marketSchedule?: unknown | null;
```

Add gating:

```typescript
const isMarket =
  location.placeType === "public" &&
  location.categorySlug === "market";
```

Render logic:
- If `isMarket` → render `<MarketFactsCard />`
- Else → render `<HoursCard />`

No other module order changes.

---

## MarketFactsCard (New Component)

**File:** `components/merchant/MarketFactsCard.tsx`

Minimal UI:
- Weekly schedule display
- Website link
- Instagram link
- Optional vendor type tags

No complex schedule logic.  
No time-based filtering.  
No event expansion.

---

## Acceptance Criteria

- Schema migration applies cleanly
- `prisma migrate status` shows no drift
- Existing restaurant pages unchanged
- Market page renders without HoursCard
- Restaurant pages still render HoursCard
- Build passes
- No TypeScript errors

---

## Conflict Rules

If production schema differs from this spec:
- Production code is canonical.
- Update spec or create alignment PR.
- Do not silently edit this document.

---

## Notes

Markets are modeled as Places with `placeType = public` and `category = market`.

This is not an event system.

This validates the platform taxonomy without expanding surface area.

---

## SAIKO-ENERGY-SCORE-SPEC

| Field | Value |
|-------|-------|
| **Type** | spec |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/ENERGY_SCORE_SPEC.md` |
| **Last Updated** | 2026-03-10 |

# Energy Score — Specification (Locked)

**System:** Saiko Maps — Place Profile System  
**Category:** Energy (0–100 spectrum)  
**Date:** February 17, 2026  
**Status:** Locked — pipeline-generated, auditable, no mocks. Post-run we only tune weights/lexicons, not dimensions.

**Implementation note (v1):** `popular_times` is NOT available from the Google Places API. Energy v1 ships without the popularity component. Formula = language + flags + sensory. Confidence weights: language 0.50, flags 0.30, sensory 0.20. Schema supports adding popularity later (Option B) without breaking versions.

---

## Relationship to Formality

Energy structure is locked (inputs + ranges + confidence + missing-data handling + event baseline rule). Formality follows the same standard; see `FORMALITY_SCORE_SPEC.md`.

---

## What It Measures

How stimulating the environment is on a typical peak service window. Not "best night ever," not event-only spikes. The baseline energy of the place when it's doing what it does.

```
Calm ←————————————→ Buzzing
0                                    100
```

---

## Inputs (In Priority Order)

### A) Popular-Times Density (0–50 points)

Derived from Google "popular times" / visit density proxies. Capped at 50 (not 60) to prevent raw traffic volume from dominating the score. Density contributes to stimulation but not linearly — a packed quiet omakase counter is not the same energy as a packed loud trattoria.

**Compute:**
- **Peak intensity:** max(popularity) over week → 0–30 points
- **Peak width:** contiguous minutes above 70% of peak → 0–15 points
- **Sustained consistency:** inverse of variance — steady high traffic scores higher than spiky bursts → 0–5 points

Wide, sustained intensity = energetic baseline. Short chaotic spike ≠ high energy place.

**Event baseline rule:** If recurring event windows are detectable (e.g., weekly DJ night shows as a spike pattern), downweight those windows in baseline calculation. Score reflects what the place is on a normal busy night, not its best event night. If event frequency data is unavailable, use median popularity rather than peak to reduce spike inflation.

### B) Crowd / Noise Language (-25 to +25 points)

From editorial coverage + about page copy + extracted identity terms. Expanded range (from ±20) to give social perception more influence relative to raw traffic data.

**Two lexicons:**

High-energy terms: bustling, packed, loud, buzzing, electric, lively, raucous, scene, party, roaring, pumping, chaotic, wild

Low-energy terms: quiet, calm, intimate, hushed, peaceful, low-key, relaxed, serene, gentle, whisper, subdued, mellow

**Scoring:**
- Term hits weighted by source quality (editorial coverage > about page)
- Decay by freshness (older coverage downweighted)
- Net score from balance of high vs. low hits
- Range: -25 to +25

### C) Operational Accelerants (0–15 points)

From Google Places flags and structured data.

| Signal | Points |
|--------|--------|
| liveMusic = true | +10 |
| Bar-forward (serves beer/cocktails as primary) | +5 |
| goodForGroups = true | +5 |

Cap at 15. These are additive indicators, not decisive on their own.

### D) Capacity / Compression Proxy (0–15 points)

High demand in a small space raises perceived energy. The room is doing more than its footprint suggests.

**Signals:**
- "Tiny dining room," "tight space," "bar packed," "hard to get in"
- "Shoulder to shoulder," "no empty seats," "standing room"
- Reservation friction (see below)

**Reservation friction (recommended if available):**
If reservability + booking scarcity signals exist (Resy/OpenTable availability snapshots, waitlist frequency, "booked out" language), convert to 0–10 points and feed into compression score.

### E) Sensory Intensity Modifier (-5 to +10 points)

Grounded in environmental psychology research on multisensory arousal (Krishna, 2012; Bitner, 1992; Ryu & Jang, 2008). Sensory inputs — sound, sight, smell, touch — directly raise or lower stimulation. We can detect proxies for these from text data.

**Sound signals (strongest sensory driver of energy):**

| Signal | Source | Points |
|--------|--------|--------|
| DJ nights, live band, live music specificity | About page, editorial | +3 |
| "No music," "ambient playlist," "quiet background" | About page, editorial | -2 |

Note: liveMusic flag already captured in Section C. This captures specificity beyond the boolean — a DJ set reads differently than a solo acoustic guitarist.

**Sight signals (visual arousal):**

| Signal | Source | Points |
|--------|--------|--------|
| Neon, vibrant colors, bright/warm lighting | About page, editorial | +2 |
| Dim, dark, candlelit, muted tones | About page, editorial | -2 |

Note: Visual signals also feed Ambiance tags (Moody, Airy, etc.). The Energy modifier captures the arousal component only — does the visual environment stimulate or sedate?

**Smell signals (olfactory arousal):**

| Signal | Source | Points |
|--------|--------|--------|
| Open kitchen, wood-fire, charcoal, live cooking | About page, editorial, menu | +3 |
| Bakery, coffee roaster, smoker | About page, editorial | +2 |

Open kitchens and live fire create ambient sensory stimulation — heat, smoke, sizzle, aroma. These raise perceived energy even before the crowd arrives.

**Touch signals (haptic environment):**

Touch primarily feeds Formality, not Energy. Not scored here. The material quality of the environment (linen vs. paper, leather vs. plastic) shapes expectations and behavioral codes but does not directly raise or lower stimulation.

**Sensory modifier cap:** -5 to +10 points. This is a refinement layer, not a primary driver.

---

## Final Energy Score

```
Energy = clamp(
    Popularity (0–50)
  + Language (-25..+25)
  + Flags (0–15)
  + Compression (0–15)
  + Sensory (-5..+10),
  0, 100
)
```

**Maximum theoretical score:** 115, clamped to 100.  
**Minimum theoretical score:** -30, clamped to 0.

### Missing Data Handling

If Popular-Times data is unavailable (new restaurants, low Google coverage):

- Do **not** score Popularity as 0. That penalizes new places unfairly.
- Instead, **reweight remaining components proportionally** to fill the 0–100 range.
- Normalize: `Energy = clamp( (Language + Flags + Compression + Sensory) × (100 / 65), 0, 100 )`
- Confidence drops significantly (loses 0.40 contribution). Score is directional, not precise.
- Store the score. Display only if remaining confidence ≥ 0.5.

---

## Energy Confidence (0–1)

Based on coverage of available inputs:

| Input Present | Confidence Contribution |
|---------------|------------------------|
| Popular-times data | 0.40 |
| Editorial coverage / about page text | 0.30 |
| Google Places flags | 0.10 |
| Compression signals | 0.10 |
| Sensory signals | 0.10 |

Language confidence raised to 0.30 (from 0.25) to reflect its expanded scoring range and importance as the primary social-perception input.

**Confidence drives display:** If confidence is below 0.5, the Energy score is stored but not displayed on the merchant page. Low-confidence scores are available for internal use (Voice Engine, recommendations) but not surfaced to users.

---

## Calibration Examples

| Place | Expected Energy | Why |
|-------|----------------|-----|
| Dunsmoor | ~70 | Compressed dining room, serious demand density, but not a party. High popularity + compression, moderate language. |
| Buvons | ~56 | Patio wine bar, social but not loud. Moderate popularity, positive language, low compression. Events (DJ nights) create spikes but don't alter baseline. |
| Dan Tana's | ~82 | Loud institution, packed nightly, high-density bar, reservation friction. High on every axis. |
| Covell | ~64 | Wine bar with conversational hum, spatial compression from long bar format, but naturally capped by intimate scale. |
| Quiet neighborhood sushi bar | ~25 | Low popularity density, "quiet," "intimate" language, no flags, no compression. |
| Taco truck | ~40 | Moderate traffic, outdoor, casual, no compression, no sensory modifiers. |
| Nightclub-adjacent late night spot | ~90+ | Peak popularity, "packed," "loud," liveMusic, DJ, neon, maximal compression. |

---

## Edge Cases

**Event-driven spikes:** Handled in Section A. Recurring event windows are downweighted in baseline calculation. If event frequency is undetectable, median popularity is used instead of peak. This prevents places like Buvons (periodic DJ nights) from scoring artificially high.

**Seasonal variation:** Patio-forward places may have different energy profiles summer vs. winter. V1 does not account for this. Flag for V2.

**Time-of-day variation:** A place can be calm at lunch and buzzing at dinner. V1 scores the peak service window. Time-of-day profiles are a V2 feature that could leverage popular-times hourly data.

**New places / insufficient data:** Handled in Missing Data section above. Remaining components are reweighted proportionally. Score is stored but only displayed if confidence ≥ 0.5.

---

## Research Foundation

The Energy score is grounded in the **Arousal** dimension of the Mehrabian-Russell PAD Model (1974), which identifies arousal as one of three fundamental emotional responses to any environment. Arousal measures stimulation level — from sleepy/inactive to excited/alert.

The sensory modifier draws from:
- **Bitner (1992)** — Servicescape model identifying ambient conditions (sound, scent, temperature) as environmental stimuli
- **Ryu & Jang (2008)** — DINESCAPE scale confirming ambience and lighting as distinct dimensions of restaurant environment perception
- **Krishna (2012)** — Sensory marketing framework establishing that all five senses influence consumer arousal and behavior
- **QSR/Curion sensory research** — Color studies showing warm/bright colors raise arousal; cool/dark colors lower it

The novel contribution: applying these validated frameworks to data-derived text signals rather than in-person measurement. We cannot measure decibel levels or scent intensity from data — but we can detect language proxies for sensory environments that the research confirms drive arousal.

---

## SAIKO-FIELDS-V2-CUTOVER-SPEC

| Field | Value |
|-------|-------|
| **Type** | spec |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/FIELDS_V2_CUTOVER_SPEC.md` |
| **Last Updated** | 2026-03-10 |
| **Systems** | database |

# Fields v2 — Cutover Spec

**Status:** Ready to execute Phase 0–2. Phases 3–5 gated on verification.

---

## Knowledge Model

```
Observed Claims  →  Canonical Entity State  →  Derived Signals  →  Interpretation  →  Product
```

---

## Phase 0 — Exports (before any destructive work)

Run all six exports. Do not proceed until every file is confirmed non-empty and spot-checked.

| File | Source query | Purpose |
|---|---|---|
| `exports/seed-places.csv` | `SELECT id, slug, name, website, google_place_id, instagram, neighborhood FROM entities WHERE status='OPEN'` | Reseed list |
| `exports/seed-human-decisions.csv` | See query below | Highest-trust signals — preserve as human-reviewed claims |
| `exports/human-operator-links.csv` | `SELECT * FROM PlaceActorRelationship` | Manually linked operators |
| `exports/human-coverage-sources.csv` | `SELECT * FROM coverage_sources` | Editorial links |
| `exports/human-gpid-decisions.csv` | `SELECT * FROM gpid_resolution_queue WHERE human_status IS NOT NULL` | Confirmed GPIDs |
| `exports/trusted-sources.csv` | `SELECT * FROM sources` | Trust tier registry |

**Human decisions query:**
```sql
SELECT
  e.slug,
  e.name,
  'category_override'     AS decision_type,
  e.category              AS value,
  'entities.category'     AS source_field
FROM entities e
WHERE e.description_reviewed = true   -- manually reviewed descriptions
UNION ALL
SELECT e.slug, e.name, 'gpid_confirmed', q.candidate_gpid, 'gpid_resolution_queue'
FROM gpid_resolution_queue q
JOIN entities e ON e.id = q."entityId"
WHERE q.human_status = 'APPROVED'
UNION ALL
SELECT e.slug, e.name, 'operator_link', a.name, 'PlaceActorRelationship'
FROM "PlaceActorRelationship" par
JOIN entities e ON e.id = par."entityId"
JOIN "Actor" a ON a.id = par."actorId";
```

These re-enter the system as `observed_claims` with `source_id = 'human_review'`, `extraction_method = 'HUMAN'`, and are auto-sanctioned via `SanctionMethod.HUMAN_APPROVED`.

---

## Phase 1 — Safety Snapshot

```bash
pg_dump $DATABASE_URL -Fc -f saiko-fields-v1-snapshot-$(date +%Y%m%d).dump
```

Store off-cluster. Verify file size. Record Neon branch/project name and timestamp.

---

## Phase 2 — Seed Registries + Populate Canonical State

```bash
# 1. Seed source_registry and attribute_registry (idempotent)
npx ts-node scripts/seed-fields-v2-registries.ts

# 2. Dry run first — verify entity count
npx ts-node scripts/populate-canonical-state.ts --dry-run

# 3. Populate all entities
npx ts-node scripts/populate-canonical-state.ts
```

Expected output: `~247 entities created, 0 errors`.

---

## Phase 2b — Sanctioning Spot-Check Gate ⚠️

**Do not proceed to Phase 3 until this passes.**

Manually verify 10–15 entities covering: a chain restaurant, a solo operator, a wine bar, a coffee shop, a place with manual GPID override.

For each spot-check entity, confirm:

```sql
-- 1. canonical_entity_state is populated
SELECT name, google_place_id, address, hours_json IS NOT NULL
FROM canonical_entity_state WHERE entity_id = '<id>';

-- 2. At least one canonical_sanction per identity-critical field
SELECT attribute_key, sanction_method, is_current
FROM canonical_sanctions
WHERE entity_id = '<id>' AND is_current = true
ORDER BY attribute_key;

-- 3. No open sanction_conflicts for identity-critical fields
SELECT * FROM sanction_conflicts
WHERE entity_id = '<id>' AND status = 'OPEN';

-- 4. Place page still renders correctly (visual check)
-- GET /api/places/<slug>
```

If any spot-check entity has wrong canonical winners, fix `populate-canonical-state.ts` and re-run before continuing.

---

## Phase 3 — Rewire API + Verify

The API route (`app/api/places/[slug]/route.ts`) is already updated with dual-read: `canonical_entity_state` primary, `entities` columns fallback. No further code change needed.

Verify in production:
- [ ] 5+ place pages load with correct data
- [ ] `prl`, `scenesense`, `offeringSignals` all populated
- [ ] `tagline` and `pullQuote` populated from `interpretation_cache`
- [ ] No 500 errors in logs

---

## Phase 4 — Slim Entities

Run only after Phase 3 is verified green.

```bash
psql $DATABASE_URL -f prisma/migrations/20260306200000_slim_entities_fields_v2/migration.sql
```

This drops all data-carrying columns from `entities`, leaving only the routing shell:  
`id`, `slug`, `business_status`, `primary_vertical`, `created_at`, `updated_at`.

After applying: re-run spot-check verification from Phase 2b.

---

## Phase 5 — Drop Legacy Tables

Run only after Phase 4 is verified green. Requires a fresh snapshot immediately before.

```bash
pg_dump $DATABASE_URL -Fc -f saiko-fields-v2-pre-drop-$(date +%Y%m%d).dump
psql $DATABASE_URL -f prisma/migrations/20260306300000_drop_legacy_tables_fields_v2/migration.sql
```

Pre-flight checks before running:
```sql
SELECT COUNT(*) FROM canonical_entity_state;  -- must equal entities count
SELECT COUNT(*) FROM canonical_sanctions;     -- must be non-zero
SELECT COUNT(*) FROM derived_signals;         -- must be non-zero
SELECT COUNT(*) FROM interpretation_cache;    -- must be non-zero
```

---

## System Classification: Analytics, Cache, Dashboard, Reporting

### Rewire to Fields v2 (keep the system, change the input source)

| System | Current dependency | New input | Priority |
|---|---|---|---|
| `energy_scores` / `place_tag_scores` | reads from `entities` + `golden_records` | read from `canonical_entity_state` + `derived_signals` | Before Phase 5 |
| Admin energy dashboard (`/admin/energy`) | reads `energy_scores` directly | no change — table preserved | Low |
| SceneSense assembly (`lib/scenesense/`) | reads `golden_records.identity_signals` | read from `derived_signals` (signal_key='identity_signals') | Before Phase 5 |
| Voice Engine v2 (`lib/voice-engine-v2/`) | reads `golden_records.tagline_signals` | read from `derived_signals` | Before Phase 5 |
| Search route (`/api/search`) | reads `golden_records` for identity signals + menu/winelist | read from `canonical_entity_state` + `derived_signals` | Before Phase 5 |
| `TraceSignalsCache` | FKs to `golden_records.canonical_id` | rewire FK to `entities.id` (after golden_records drop) | Before Phase 5 |

### Discard (treat as disposable — regenerate from clean state)

| System | Table(s) | Reason |
|---|---|---|
| MDM resolver pipeline | `raw_records`, `entity_links`, `resolution_links` | Replaced by `observed_claims` + `canonical_sanctions` |
| Legacy review queue | `review_queue`, `review_audit_log` | Replaced by `sanction_conflicts` |
| Merchant signals | `merchant_signals`, `merchant_enrichment_runs` | Replaced by `observed_claims` write path |
| Legacy confidence scoring | `entities.confidence`, `entities.field_confidences` | Replaced by `canonical_sanctions.sanction_method` + `canonical_sanctions.confidence` |
| Mixed provenance JSONB | `golden_records.provenance_v2`, `golden_records.source_attribution` | Replaced by `canonical_sanctions` audit trail |
| `coverage_runs` | `coverage_runs` | Run metadata only — disposable |
| Tagline generation cache on golden | `golden_records.tagline`, `golden_records.tagline_candidates` | Replaced by `interpretation_cache` |
| Signal cache on golden | `golden_records.identity_signals`, `golden_records.cuisine_posture`, etc. | Replaced by `derived_signals` |

### Discard and rebuild (materialized views)

| View | Current definition | Fields v2 replacement |
|---|---|---|
| `v_places_la_bbox` | `SELECT * FROM places WHERE lat/lng IN bbox` | `SELECT ces.* FROM canonical_entity_state ces JOIN entities e ON e.id = ces.entity_id WHERE ces.latitude BETWEEN 33.70 AND 34.85 AND ces.longitude BETWEEN -118.95 AND -117.60` |
| `v_places_la_bbox_golden` | joins `places` + `golden_records` by `google_place_id` | Drop. Use `canonical_entity_state` directly — the join is now internal. |

Both views depend on `places` (old table name) and `golden_records`. Drop and recreate against `canonical_entity_state` before Phase 5.

`app/api/admin/photo-eval/queue/route.ts` uses `v_places_la_bbox` — update this query to join `canonical_entity_state` directly before Phase 5.

### Rewire admin dashboard stats (`/api/admin/stats`)

Currently reads: `review_queue`, `golden_records`, `entity_links`, `raw_records`.

Replace with:

| Old stat | New query |
|---|---|
| `review_queue.count` | `sanction_conflicts.count WHERE status='OPEN'` |
| `golden_records.count` | `canonical_entity_state.count` |
| `entity_links.count` | `canonical_sanctions.count WHERE is_current=true` |
| `raw_records.count` | `observed_claims.count` |

---

## Slug Continuity

`slug` is registered in `attribute_registry` with:  
`identity_critical: true`, `sanction_threshold: 0.95`, `decay_policy: NONE`.

The `slug` column on `entities` is never dropped — it is the external routing key for all URLs and must survive every migration phase. The `canonical_entity_state` does not need its own `slug` column because the FK from `canonical_entity_state.entity_id → entities.id` gives you `entities.slug` in one join.

---

## Freeze List (scripts to not run against prod until v2 is stable)

Stop all direct writes to `golden_records`, `raw_records`, `merchant_signals` before Phase 3:

```
scripts/extract-identity-signals.ts   → OK (writes derived_signals in v2 path)
scripts/generate-taglines-v2.ts       → OK (writes interpretation_cache in v2 path)
scripts/resolver-pipeline.ts          → FREEZE until MDM rewrite
scripts/resolve-golden-first.ts       → FREEZE
scripts/promote-golden-to-places.ts   → FREEZE
scripts/sync-golden-to-places.ts      → FREEZE
scripts/backfill-google-places.ts     → FREEZE (reads ok, writes target golden)
scripts/enrich-google-places.ts       → FREEZE
```

Enrichment scripts that write via `lib/fields-v2/write-claim.ts` (`writeClaimAndSanction`) are safe to run at any phase.

---

## Rollback

If anything in Phase 3 or later breaks:

1. Restore from snapshot: `pg_restore -d $DATABASE_URL saiko-fields-v1-snapshot-YYYYMMDD.dump`
2. The `canonical_entity_state`, `observed_claims`, and `canonical_sanctions` tables can be truncated and repopulated — they contain no data that doesn't exist in `entities` or `golden_records`.
3. The API route fallback path (reading from legacy `entities` columns when `canonical_state` is null) remains active until the slim-entities migration runs.

---

## Open Decisions (Bobby must confirm before Phase 3)

1. **`description` auto-sanction**: Can `description` from a tier-1 editorial source (Eater, LA Times) be auto-sanctioned `AUTO_HIGH_CONFIDENCE`, or does it always require `HUMAN_APPROVED`?

2. **Entity creation policy**: For a new place arriving from a tier-1 source that doesn't match any existing entity: create the `entities` row immediately, or route to `sanction_conflicts` for human review? Proposed: create directly for tier 1–2, conflict queue for tier 3+.

3. **`google_places_attributes` granularity**: Store as one claim per API call (blob as `raw_value`), or decompose into individual claims per serving flag? Proposed: one blob claim.

4. **SceneSense PRL caching**: Is the PRL computation a pure weighted sum from `derived_signals` (render-time), or LLM-backed (cache in `interpretation_cache`)? Determines whether `SCENESENSE_PRL` cache entries are needed.

---

## SAIKO-FORMALITY-SCORE-SPEC

| Field | Value |
|-------|-------|
| **Type** | spec |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/FORMALITY_SCORE_SPEC.md` |
| **Last Updated** | 2026-03-10 |

# Formality Score — Specification (Locked)

**System**: Saiko Maps — Place Profile System  
**Category**: Formality (0–100 spectrum)  
**Date**: February 17, 2026  
**Status**: Locked — pipeline-generated, auditable, no mocks. Post-run we only tune weights/lexicons, not dimensions.

---

## Relationship to Energy

Energy structure is locked (inputs + ranges + confidence + missing-data handling + event baseline rule). Formality follows the same standard: same doc shape, same implementation discipline.

---

## What It Measures

How much the place dictates your behavior — expectations around reservation norms, service ritual, pacing, and how put-together you need to be.

```
Come-as-you-are  ←———————————————————————————→  Put-together
       0                                                   100
```

Formality is not quality. It is behavioral constraint.

---

## Inputs (Priority Order)

### A) Service Model (0–40 points)

**Source**: Identity layer (`service_model`) + extracted service signals.

**Base mapping (Identity)**:

| Identity value | Points |
|----------------|--------|
| counter / fast casual / truck | 5–12 |
| bar-first (wine bar, cocktail bar with bites) | 10–18 |
| full-service a la carte | 20–30 |
| tasting menu / omakase / coursed prix fixe | 30–40 |

**Modifiers** (from coverage/about/menu language):

- “tasting,” “omakase,” “prix fixe,” “coursed” → +5 (cap 40)
- “order at counter,” “grab-and-go,” “walk-up” → -5 (floor 0)

**Rationale**: Service ritual is the strongest driver of behavioral expectation.

---

### B) Price Tier (0–25 points)

**Source**: Identity layer (`price_tier`).

| price_tier | Points |
|------------|--------|
| $ | 5 |
| $$ | 12 |
| $$$ | 20 |
| $$$$ | 25 |

Price is a constraint proxy, not the constraint itself — capped at 25.

---

### C) Reservation Norms / Friction (0–20 points)

**Source**: Google `reservable` + coverage language + booking scarcity signals.

| Signal | Points |
|--------|--------|
| reservable true | +8 |
| “reservations recommended” | +5 |
| “reservation required” / “hard to get” / “booked out” | +10 |
| waitlist / deposit / cancellation policy language | +5 |

Cap at 20.

---

### D) Dress / Ritual Language (-5 to +10 points)

**Source**: Coverage + about copy.

**High-formality terms (+)**: refined, elegant, polished, upscale, white-tablecloth, jacket, formal, ceremony, pairings, sommelier-led, choreographed  

**Low-formality terms (-)**: casual, laid-back, no-fuss, come-as-you-are, counter-service, shorts welcome, beachy  

Range: -5 to +10. Stronger upward push than downward; low formality is already captured by service model.

---

### E) Tableware / Material Cues (0–5 points)

**Source**: Text (or later curated sources) when detectable.

- “linen,” “white tablecloth,” “crystal,” “fine china” → +3 to +5
- “paper plates,” “plastic cups,” “standing room” → 0 (do not go negative)

Cap at 5. Optional in V1; include if signals exist.

---

## Final Formality Score

```
Formality = clamp(
    ServiceModel (0–40)
  + PriceTier (0–25)
  + Reservation (0–20)
  + Language (-5..+10)
  + Materials (0–5),
  0, 100
)
```

- **Max theoretical**: 40 + 25 + 20 + 10 + 5 = 100  
- **Min theoretical**: 0 (after clamp)

---

## Missing Data Handling

If `price_tier` or `service_model` is missing (rare if Identity is functioning):

- Reweight remaining components proportionally to 100.
- Confidence drops sharply.
- Store score; **do not display** unless confidence ≥ 0.5.

Formality should be mostly computable from Identity + reservability even with limited text.

---

## Formality Confidence (0–1)

| Input | Contribution |
|-------|--------------|
| service_model | 0.40 |
| price_tier | 0.25 |
| reservation signals | 0.20 |
| coverage/about language | 0.10 |
| material cues | 0.05 |

**Display threshold**: 0.5 (same as Energy, consistent rule).

---

## Calibration Examples (LA Validation Set)

| Place | Target ~Score | Notes |
|-------|----------------|-------|
| Dunsmoor | ~72 | Full-service, $$$, reservation friction, coursed pacing language |
| Dan Tana’s | ~76 | Classic full-service, $$$, reservation expectations, ritual cues |
| Covell | ~46 | Bar-first, $$, walk-in friendly, casual posture despite wine seriousness |
| Buvons | ~44 | Patio wine bar, $$, casual language, light reservation constraint |

---

## Edge Cases

- **High price / low ritual** (expensive counter-service): price pushes up, service model pulls down → score lands mid.
- **Low price / high ritual** (formal tea service, special omakase pop-up): service model and reservation friction dominate.
- **Scene-y clubs with bottle service**: can be high energy but not necessarily high formality; Formality stays driven by service + reservation + ritual language, not nightlife status.

---

## Implementation Order

1. Lock the Formality structure (this spec).
2. Implement scoring functions (same pipeline pattern as Energy).
3. Run full LA dataset + output distributions.
4. Tune only weights/lexicons as needed; do not change dimensions or input set.

---

## SAIKO-DATA-PIPELINE-QUICK-START

| Field | Value |
|-------|-------|
| **Type** | reference |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/DATA_PIPELINE_QUICK_START.md` |
| **Last Updated** | 2026-03-10 |
| **Systems** | data-pipeline |

# Data Pipeline Quick Reference

Copy this into your new chat: **"Session Starter: Data Pipeline for Saiko Maps - Review @DATA_PIPELINE_SESSION_STARTER.md"**

---

## Current State

✅ **Merchant Page v2** - Complete with bento grid, graceful degradation  
✅ **Data audit scripts** - Can check any field for completeness  
✅ **Manual update scripts** - Instagram & phone bulk updaters ready  

🔴 **Critical gaps:** Instagram (99.7% missing), Pull Quotes (98% missing)  
🟡 **Important gaps:** Vibe Tags (98% missing), Phone (10% missing)

---

## What We Built Today

1. **ActionStrip.tsx** - Nav/Call/Insta buttons (text style, not woodcut)
2. **audit-data.js** - Check completeness of any field
3. **update-instagram.js** - Bulk Instagram handle updates
4. **update-phone.js** - Bulk phone number updates

---

## Files to Review

- `DATA_PIPELINE_SESSION_STARTER.md` - Full context
- `CRITICAL_DATA_UPDATES.md` - Manual workflow guide
- `prisma/schema.prisma` - Database schema
- `scripts/audit-data.js` - Audit tool
- `scripts/update-instagram.js` - Instagram updater
- `scripts/update-phone.js` - Phone updater
- `lib/extractQuote.ts` - Quote extraction logic (could be background job)

---

## Pipeline Goals

1. **Automated backfill** - Instagram, phone, website from Google/web scraping
2. **AI content generation** - Pull quotes (from sources), vibe tags (from reviews)
3. **Refresh scheduling** - Hours daily, photos weekly, reviews monthly
4. **Quality control** - Validation, approval queue, rollback

---

## Quick Commands

```bash
# See full data audit
node scripts/audit-data.js --summary

# List missing Instagram (671)
node scripts/update-instagram.js --list

# List missing phone (68)
node scripts/update-phone.js --list

# Check editorial coverage
node scripts/audit-data.js --field sources
```

---

## Test URLs

```
http://localhost:3000/place/seco           # Has coverage + curator
http://localhost:3000/place/stir-crazy     # Has coverage, no curator
http://localhost:3000/place/great-white-central-la  # Just added IG
```

---

**Ready for next session!** 🚀

---

## SAIKO-DATABASE-SCHEMA

| Field | Value |
|-------|-------|
| **Type** | reference |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/DATABASE_SCHEMA.md` |
| **Last Updated** | 2026-03-10 |
| **Systems** | database |

# Saiko Maps - Database Schema

## Core Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ECOSYSTEM                           │
└─────────────────────────────────────────────────────────────────┘

                            ┌──────────┐
                            │   User   │
                            │   (id)   │
                            └────┬─────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
             ┌──────▼──────┐ ┌──▼──────┐ ┌──▼────────┐
             │    List     │ │ Viewer  │ │  Import   │
             │   (maps)    │ │Bookmark │ │   Job     │
             └──────┬──────┘ └────┬────┘ └───────────┘
                    │             │
                    │             │
┌───────────────────┴─────────────┴──────────────────────────────┐
│                      PLACE ECOSYSTEM                            │
└─────────────────────────────────────────────────────────────────┘

         ┌─────────────────┐
         │      List       │
         │  (Maps/Guides)  │
         └────────┬────────┘
                  │
         ┌────────┴─────────────────┐
         │                          │
    ┌────▼─────┐           ┌────────▼────────┐
    │ Location │           │    MapPlace     │
    │ (legacy) │           │  (join table)   │
    └──────────┘           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │     Place       │
                           │  (canonical)    │
                           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │ ViewerBookmark  │
                           └─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      ACTIVITY LAYERS                             │
└─────────────────────────────────────────────────────────────────┘

                        ┌──────────────┐
                        │ ActivitySpot │
                        │ (skate/surf) │
                        └──────────────┘
```

## Detailed Schema Breakdown

### **User** (`users`)
**Purpose:** Creator accounts, authentication

**Fields:**
- `id` (UUID, PK)
- `email` (unique)
- `name`
- `passwordHash`
- `avatarUrl`
- `subscriptionTier` (free | personal | business)
- `createdAt`, `updatedAt`

**Relations:**
- → **List** (1:many) - Created maps
- → **ViewerBookmark** (1:many) - Saved places
- → **ImportJob** (1:many) - Import operations

---

### **List** (`lists`)
**Purpose:** Maps/Guides created by users (published as Field Notes)

**Content Fields:**
- `id` (UUID, PK)
- `userId` (FK → User)
- `title`, `subtitle`, `description`, `slug` (unique)
- `introText`
- `descriptionSource` (ai | edited | manual)

**Creation Context:**
- `functionType` - Purpose of the map
- `functionContext` - Additional context
- `scopeGeography` - Geographic scope
- `scopePlaceTypes[]` - Types of places included
- `scopeExclusions[]` - Types excluded
- `organizingLogic` (enum: TIME_BASED | NEIGHBORHOOD_BASED | ROUTE_BASED | PURPOSE_BASED | LAYERED)
- `organizingLogicNote` - Notes on organization
- `notes` - Internal notes
- `status` (enum: DRAFT | READY | PUBLISHED | ARCHIVED)
- `publishedAt`

**Design:**
- `templateType` (currently only "field-notes")
- `coverImageUrl`
- `primaryColor`, `secondaryColor`

**Access Control:**
- `accessLevel` (public | password | private)
- `passwordHash` - For password-protected maps
- `allowedEmails[]` - For private maps

**Metadata:**
- `published` (boolean)
- `viewCount`
- `createdAt`, `updatedAt`

**Relations:**
- ← **User** (many:1)
- → **Location** (1:many) - Legacy locations
- → **MapPlace** (1:many) - Modern place associations
- → **ImportJob** (1:many)

**Indexes:**
- `userId`, `slug`, `published`, `status`

---

### **Location** (`locations`) [LEGACY - Being Phased Out]
**Purpose:** Original location model (before Place/MapPlace refactor)

**Google Places Data:**
- `id` (UUID, PK)
- `listId` (FK → List)
- `googlePlaceId`
- `name`, `address`
- `latitude`, `longitude` (Decimal 10,8 / 11,8)
- `phone`, `website`, `instagram`
- `hours` (JSON)
- `description`
- `googlePhotos` (JSON)
- `googleTypes[]`
- `priceLevel` (0-4)
- `neighborhood`

**User-Added Data:**
- `userPhotos[]` - Uploaded image URLs
- `userNote` - Curator notes
- `category` - Food, Drinks, Coffee, etc.
- `descriptor` - Editorial description (max 120 chars)

**Organization:**
- `orderIndex` - Position in list

**Cache Management:**
- `placesDataCachedAt` - When Google data was last fetched

**Relations:**
- ← **List** (many:1)

**Indexes:**
- `listId`, `googlePlaceId`, `[listId, orderIndex]`, `[listId, category]`

---

### **Place** (`places`) [CANONICAL ENTITY]
**Purpose:** Canonical place entity with full Google + AI enrichment

**Core Data:**
- `id` (UUID, PK)
- `slug` (unique)
- `googlePlaceId` (unique)
- `name`, `address`
- `latitude`, `longitude` (Decimal 10,8 / 11,8)
- `phone`, `website`, `instagram`
- `hours` (JSON)
- `description`

**Google Places Data:**
- `googlePhotos` (JSON) - Array of photo references
- `googleTypes[]` - Raw Google Places types
- `priceLevel` (0-4)
- `neighborhood` - Reverse geocoded
- `cuisineType`
- `category`
- `sources` (JSON) - Editorial sources

**Voice Engine v1.1 - Taglines:**
- `tagline` - Selected tagline
- `taglineCandidates[]` - Alternative options generated
- `taglinePattern` (food | neighborhood | energy | authority)
- `taglineGenerated` - Timestamp
- `taglineSignals` (JSON) - Snapshot of merchant signals at generation

**Voice Engine v1.1 - Ad Units:**
- `adUnitType` (A | B | D | E)
- `adUnitOverride` (boolean) - Manual override flag

**Voice Engine v1.1 - Pull Quotes:**
- `pullQuote` - Quote text
- `pullQuoteSource` - Source name
- `pullQuoteAuthor` - Author name
- `pullQuoteUrl` - Source URL
- `pullQuoteType` (editorial | owner | self)

**Bento Grid Enrichment:**
- ~~`vibeTags[]`~~ - **Deprecated** (column removed from entities; language signals in `golden_records.identity_signals.language_signals`)
- `tips[]` - Helpful visitor tips: ["Go early for a seat", "Cash only"]

**Cache Management:**
- `placesDataCachedAt` - When Google data was last fetched

**Metadata:**
- `createdAt`, `updatedAt`

**Relations:**
- → **MapPlace** (1:many) - Appears on multiple maps
- → **ViewerBookmark** (1:many) - Saved by viewers

**Indexes:**
- `googlePlaceId`, `category`, `neighborhood`

---

### **MapPlace** (`map_places`) [JOIN TABLE]
**Purpose:** Many-to-many relationship between Place and List (Map)
**Why:** Same place can appear on multiple maps with different curator context

**Fields:**
- `id` (UUID, PK)
- `mapId` (FK → List)
- `placeId` (FK → Place)

**Curator-Specific Data (per-map):**
- `descriptor` (VARCHAR 120) - Map-specific editorial description
- `userNote` - Curator's private notes
- `userPhotos[]` - Map-specific photos
- `orderIndex` - Position in this specific map

**Metadata:**
- `createdAt`, `updatedAt`

**Relations:**
- ← **List** (many:1)
- ← **Place** (many:1)

**Unique Constraint:**
- `[mapId, placeId]` - A place can only appear once per map

**Indexes:**
- `mapId`, `placeId`, `[mapId, orderIndex]`

---

### **ViewerBookmark** (`viewer_bookmarks`)
**Purpose:** Users saving places for later / personal collections

**Fields:**
- `id` (UUID, PK)
- `viewerUserId` (FK → User, nullable)
- `placeId` (FK → Place)
- `visited` (boolean)
- `personalNote` - Private user notes
- `createdAt`, `updatedAt`

**Relations:**
- ← **User** (many:1)
- ← **Place** (many:1)

**Unique Constraint:**
- `[viewerUserId, placeId]` - Can't bookmark same place twice

**Indexes:**
- `viewerUserId`, `placeId`

---

### **ActivitySpot** (`activity_spots`)
**Purpose:** Skateparks, surf breaks, etc. (separate from food/drink places)

**Location:**
- `id` (CUID, PK)
- `name`, `slug` (unique)
- `latitude`, `longitude` (Float)
- `city`, `region`, `country`

**Type & Classification:**
- `layerType` (enum: SKATE | SURF)
- `spotType` - Skate: park/street/plaza | Surf: beach/reef/point
- `tags[]` - Skate: ["ledge", "rail", "bowl"] | Surf: ["hollow", "mellow"]

**Skate-Specific:**
- `surface` (smooth | rough | mixed)
- `skillLevel` (beginner | intermediate | advanced | all)

**Surf-Specific:**
- `exposure` - Primary swell direction
- `seasonality` - Best season info

**Editorial:**
- `description`
- `isPublic` (boolean)

**Source Tracking:**
- `source` (enum: OSM | CITY_DATA | EDITORIAL | COMMUNITY)
- `sourceId` - External ID (OSM node, city dataset ID)
- `sourceUrl`

**Status:**
- `verified` (boolean)
- `enabled` (boolean)
- `createdAt`, `updatedAt`

**Indexes:**
- `[layerType, city]`, `[layerType, latitude, longitude]`, `[source, sourceId]`

---

### **ImportJob** (`import_jobs`)
**Purpose:** Track bulk place import operations

**Fields:**
- `id` (UUID, PK)
- `userId` (FK → User)
- `listId` (FK → List, nullable)
- `status` (processing | completed | failed)
- `totalLocations`
- `processedLocations`
- `failedLocations`
- `errorLog` (JSON)
- `createdAt`, `completedAt`

**Relations:**
- ← **User** (many:1)
- ← **List** (many:1)

**Indexes:**
- `userId`, `status`

---

## Enums

### OrganizingLogic
```typescript
enum OrganizingLogic {
  TIME_BASED        // Chronological order (morning → night)
  NEIGHBORHOOD_BASED // Geographic clustering
  ROUTE_BASED       // Walking/driving route
  PURPOSE_BASED     // By activity type
  LAYERED           // Multiple organizing principles
}
```

### MapStatus
```typescript
enum MapStatus {
  DRAFT      // Being created
  READY      // Ready to publish
  PUBLISHED  // Live and public
  ARCHIVED   // Hidden from public
}
```

### LayerType
```typescript
enum LayerType {
  SKATE  // Skateboarding spots
  SURF   // Surf breaks
}
```

### SpotSource
```typescript
enum SpotSource {
  OSM          // OpenStreetMap
  CITY_DATA    // Official city datasets
  EDITORIAL    // Curated by team
  COMMUNITY    // User-contributed
}
```

---

## Key Data Flows

### 1. Map Creation Flow
```
User creates List
  ↓
Add Places to MapPlace (with descriptor, order)
  ↓
Link to canonical Place entity
  ↓
Backfill Google Places data on Place
  ↓
Generate AI content (Voice Engine) on Place
  ↓
Publish List (status: PUBLISHED)
```

### 2. Public Viewing Flow
```
User visits /map/[slug]
  ↓
Fetch List by slug
  ↓
Get MapPlaces (ordered, with descriptors)
  ↓
Join to Places (with Google + AI data)
  ↓
Render Field Notes template
```

### 3. Place Enrichment Flow
```
Place created with googlePlaceId
  ↓
Backfill script fetches Google Places API
  ↓
Updates: photos, hours, phone, address, types, priceLevel
  ↓
Voice Engine generates: tagline, tips, pullQuote (language signals now in `identity_signals.language_signals` via SceneSense)
  ↓
Place now "enriched" and ready for display
```

---

## Migration Notes

### Location → Place Migration
**Status:** In progress (both models coexist)

**Legacy:** `Location` was tied directly to `List` (1:many)
**New:** `Place` is canonical, `MapPlace` enables many:many

**Benefits:**
- Same place can appear on multiple maps
- Enrichment (Google + AI) done once per place
- Better data consistency
- Separate curator context (MapPlace) from canonical data (Place)

**Next Steps:**
- Migrate remaining Location data to Place/MapPlace
- Update all queries to use Place/MapPlace
- Deprecate Location model

---

## SAIKO-DATABASE-SETUP

| Field | Value |
|-------|-------|
| **Type** | reference |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/DATABASE_SETUP.md` |
| **Last Updated** | 2026-03-10 |
| **Systems** | database |

# Database Setup for Saiko Maps

## Error: "User was denied access on the database"

This usually means PostgreSQL isn't running, or your `DATABASE_URL` has wrong credentials.

---

## 1. Install & run PostgreSQL

### Option A: Postgres.app (easiest on Mac)

1. Download [Postgres.app](https://postgresapp.com/)
2. Open it and click "Initialize" to start the server
3. Add to your PATH: `sudo mkdir -p /etc/paths.d && echo /Applications/Postgres.app/Contents/Versions/latest/bin | sudo tee /etc/paths.d/postgresapp`
4. Restart your terminal

**Default connection:** `postgresql://localhost:5432` (no username/password for local)

### Option B: Homebrew

```bash
brew install postgresql@16
brew services start postgresql@16
```

**Default:** User = your Mac username, no password. Database = your username by default.

---

## 2. Create the database

```bash
# With Postgres.app or Homebrew, create the DB:
createdb saiko_maps
```

---

## 3. Set DATABASE_URL in .env

**Postgres.app (typical):**
```
DATABASE_URL="postgresql://localhost:5432/saiko_maps"
```

**Homebrew (use your Mac username):**
```
DATABASE_URL="postgresql://YOUR_MAC_USERNAME@localhost:5432/saiko_maps"
```

**With password (if you set one):**
```
DATABASE_URL="postgresql://username:yourpassword@localhost:5432/saiko_maps"
```

> ⚠️ Replace `user` and `password` with your **actual** PostgreSQL username and password. The template `postgresql://user:password@...` uses placeholders.

---

## 4. Run migrations

```bash
npx prisma migrate deploy
```

---

## 5. Verify connection

```bash
npx prisma db pull
```

If that succeeds, your connection works.

---

## SAIKO-ENV-TEMPLATE

| Field | Value |
|-------|-------|
| **Type** | reference |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/ENV_TEMPLATE.md` |
| **Last Updated** | 2026-03-10 |

# Environment Variables Setup

Create a `.env` file in the root directory with the following variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/saikomaps?schema=public"

# Google Places API (server-side: search, place details, photos)
GOOGLE_PLACES_API_KEY="your_google_places_api_key_here"

# Google Maps JavaScript API (client-side: map on /map/[slug])
# Enable "Maps JavaScript API" in Google Cloud Console. Can be same key if both APIs are enabled.
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"

# Anthropic (for AI-generated map descriptions)
ANTHROPIC_API_KEY="your_anthropic_api_key_here"

# AWS S3 (for image storage)
AWS_S3_BUCKET="saikomaps-prod"
AWS_ACCESS_KEY_ID="your_aws_access_key"
AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
AWS_REGION="us-east-1"
CLOUDFRONT_URL="https://your-cloudfront-url.cloudfront.net"

# Authentication (NextAuth.js)
NEXTAUTH_SECRET="generate_a_random_secret_here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Use Clerk instead
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_key"
# CLERK_SECRET_KEY="your_clerk_secret"
```

## Quick Setup for Development

For local development with Supabase:
1. Sign up at https://supabase.com
2. Create a new project
3. Copy the `DATABASE_URL` from Settings > Database
4. Add your Google Places API key from Google Cloud Console

---

## SAIKO-GOOGLE-PLACES-SETUP

| Field | Value |
|-------|-------|
| **Type** | reference |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/GOOGLE_PLACES_SETUP.md` |
| **Last Updated** | 2026-03-10 |

# Google Places API — Unblock Legacy Text Search

Use when `backfill-google-place-ids` returns `REQUEST_DENIED`.

## 1) Enable the correct API in GCP

[APIs & Services → Library](https://console.cloud.google.com/apis/library)

Search "Places API" and **Enable** the one **NOT** labeled "(New)" — that's the legacy API for `maps.googleapis.com/maps/api/place/textsearch`.

## 2) Fix API key restrictions

Console → APIs & Services → Credentials → your API key

- **Application restrictions:** None (for validation)
- **API restrictions:** Don't restrict key (for validation)
- Confirm **Billing** is enabled on the project

(Re‑restrict after it works.)

## 3) Env vars (load-env loads .env then .env.local)

In `.env.local`:

```
GOOGLE_PLACES_ENABLED=true
GOOGLE_PLACES_API_KEY=YOUR_REAL_KEY
```

## 4) Proof test

```bash
node -r ./scripts/load-env.js -e "console.log('ENABLED', process.env.GOOGLE_PLACES_ENABLED); console.log('HAS_KEY', !!process.env.GOOGLE_PLACES_API_KEY)"
```

Dry run:

```bash
npm run backfill:google-place-ids:neon -- --la-only --limit 5 --verbose
```

Apply:

```bash
npm run backfill:google-place-ids:neon -- --la-only --apply --limit 25 --verbose
```

## 5) Verify writes

```bash
./scripts/db-neon.sh psql -Atc "SELECT count(*) FROM public.v_places_la_bbox WHERE google_place_id IS NULL OR btrim(COALESCE(google_place_id,''))='';"
./scripts/db-neon.sh psql -c "SELECT slug, name, google_place_id FROM public.v_places_la_bbox ORDER BY name;"
```

## Key/project mismatch

Ensure the API key is in the **same project** where:
- Places API (legacy) is enabled
- Billing is enabled

---

## SAIKO-PIPELINE-COMMANDS

| Field | Value |
|-------|-------|
| **Type** | reference |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/PIPELINE_COMMANDS.md` |
| **Last Updated** | 2026-03-10 |
| **Systems** | data-pipeline |

# Saiko Maps — Pipeline Commands

Quick reference for monitoring and managing the scraping/extraction pipeline.

---

## 🔍 Check Progress (Quick Status)

```bash
npx tsx scripts/check-pipeline-progress.ts
```

Shows:
- Scraping progress (X/572 complete)
- Content found (menus, wine lists, about pages)
- Extraction progress
- Estimated time remaining

**Run this anytime to see current status.**

---

## 📊 Monitor Logs

### Scraper Log
```bash
tail -f scrape-output.log
```

### Monitor Log
```bash
tail -f monitor-output.log
```

---

## 🎯 Current Status

**What's Running:**
- ✅ Phase 1: Website scraper (background, PID in scrape-output.log)
- ✅ Auto-monitor: Watching for completion, will auto-start Phase 2

**Expected Timeline:**
- Phase 1: ~1.9 hours (scraping 572 websites)
- Phase 2: ~60-90 minutes (AI extraction, auto-starts when Phase 1 done)
- **Total: ~3-3.5 hours**

---

## 📈 Manual Phase 2 (if needed)

If you want to manually start extraction:

```bash
# Extract all ready places
npx tsx scripts/extract-identity-signals.ts

# Or test on subset first
npx tsx scripts/extract-identity-signals.ts --limit=50 --verbose
```

---

## 🛑 Stop Everything

```bash
# Find running processes
ps aux | grep "scrape-menus\|monitor-and-extract"

# Kill specific process
kill <PID>
```

---

## 📁 Output Files

- `scrape-output.log` - Scraping progress and results
- `monitor-output.log` - Auto-monitor status checks
- Database: `golden_records` table (Prisma)

---

## 🔮 What Happens Next

1. **Phase 1** runs for ~1.9 hours
2. **Monitor** checks every 30 seconds for completion
3. When Phase 1 done, **Phase 2 auto-starts**
4. Phase 2 extracts identity signals (~60-90 min, ~$6)
5. **Done!** You'll have 300-400 places with full identity signals

---

## 💡 Tips

- Check progress anytime with `npx tsx scripts/check-pipeline-progress.ts`
- Monitor logs show real-time updates every 30 seconds
- No need to watch - it runs fully automated
- Safe to close terminal, processes run in background
- Cost: $0 for scraping, ~$6 for AI extraction

---

**Last updated:** Feb 10, 2026

---

## SAIKO-PROVENANCE-QUICK-REF

| Field | Value |
|-------|-------|
| **Type** | reference |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/PROVENANCE_QUICK_REF.md` |
| **Last Updated** | 2026-03-10 |
| **Systems** | data-pipeline |

# Provenance System - Quick Reference

## ✅ SYSTEM IS ACTIVE

All 1,320 places now have provenance records proving Bobby added them!

## Run an audit anytime

```bash
npm run audit
```

## When Adding New Places

Currently, new places get provenance automatically during backfill, but here's how to add them manually if needed:

### After running the resolver for a new batch:

```bash
# Example: After adding San Fernando Valley expansion
npm run ingest:csv -- data/sfv-places.csv sfv_expansion
npm run resolver:run

# Then create provenance for new golden records
npm run provenance:backfill
```

The backfill script is smart - it only creates provenance for golden_records that don't have one yet.

## Current Status

```
Total places:        1,320
With provenance:     1,320
Without provenance:  0

👤 All added by: bobby_bulk_import
📚 Source types: google_saves (673), editorial (647)
```

## Important

- Run `npm run audit` before any major changes
- Run `npm run audit` periodically to catch any issues
- If audit fails, investigate immediately

## Batch Tracking

All places are tracked by their `import_batch`:
- `saiko_seed` - Original 673 seed places
- `beach_cities_expansion` - 49 places
- `southeast_la_expansion` - 59 places  
- `harbor_area_expansion` - 100 places
- `saiko_instagram_test` - 430 Instagram backfills

## Next Steps

When you run SFV expansion:
1. Generate CSV with Claude
2. Run `npm run ingest:csv -- data/sfv-places.csv sfv_expansion`
3. Run `npm run resolver:run`
4. Run `npm run provenance:backfill` (creates provenance for new places)
5. Run `npm run audit` (verify everything is good)

Done! 🎉

---

## SAIKO-SITEMAP

| Field | Value |
|-------|-------|
| **Type** | reference |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/SITEMAP.md` |
| **Last Updated** | 2026-03-10 |

# Saiko Maps - Sitemap

## Public Routes

### Homepage
- `/` - Landing page

### Public Map Viewing
- `/map/[slug]` - Public map view (Field Notes template)
  - Examples: `/map/silver-lake-natural-wine`, `/map/venice-coffee-shops`
  - Features:
    - Split view (desktop): Map + scrollable place cards
    - Toggle view (mobile): Switch between list/map
    - Expanded map mode: Full-screen with carousel
    - Smart bounds with outlier detection
    - Hydrology-inspired map styling

### Individual Place Pages
- `/place/[slug]` - Standalone place detail page
  - Example: `/place/covell`
  - Displays: photos, tagline, vibe tags, tips, pull quotes, hours, contact

---

## Authentication Routes

**Route Group:** `(auth)` - Shared layout for auth pages

- `/login` - User login page
- `/signup` - User registration page

---

## Creator/Dashboard Routes

**Route Group:** `(creator)` - Dashboard and creator tools

### Dashboard & Management
- `/dashboard` - User dashboard/home
  - View all created maps
  - Quick stats
  - Recent activity

### Import Tools
- `/import` - Import places to maps
  - CSV/JSON upload
  - Preview before import
  - Job status tracking

### Content Management
- `/review` - Review/moderate content
  - Review AI-generated content
  - Approve/edit taglines, tips, quotes

### Setup & Configuration
- `/setup` - Initial setup wizard
  - First-time user onboarding
  - Account configuration

### Templates
- `/templates` - Browse map templates
  - Currently: Field Notes
  - Future: Additional templates

### Testing
- `/test-add-location` - Test location addition
  - Development/QA tool

---

## Editor Routes

**Route Group:** `(editor)` - Map creation and editing interfaces

### Map Creation
- `/maps/new` - Create new map
  - Set title, description, organizing logic
  - Choose template
  - Access control settings

### Map Editing
- `/maps/[mapId]/edit` - Edit existing map
  - Update metadata
  - Modify settings
  - Manage places

### Legacy Create Flow
*Note: May be consolidated with `/maps/[mapId]/edit`*

- `/create` - Create map flow entry point
- `/create/[mapId]/locations` - Add/manage locations for map
  - Search places
  - Add by Google Place ID
  - Set order and descriptors
- `/create/[mapId]/preview` - Preview map before publish
  - See how it looks in Field Notes template
  - Test different views

---

## API Routes

### AI & Generation
- `POST /api/ai/generate-map-details`
  - Generate AI-powered map description
  - Input: map context, scope, organizing logic
  - Output: AI-written description

### Authentication
- `/api/auth/[...nextauth]` - NextAuth.js handler
  - Sign in, sign out, callbacks
- `POST /api/auth/signup` - User registration endpoint

### Import System
- `POST /api/import/upload` - Upload import file (CSV/JSON)
- `POST /api/import/preview` - Preview import data before processing
- `POST /api/import/process` - Process import job (create places)
- `GET /api/import/status/[jobId]` - Check import job status
- `POST /api/import/add-to-list` - Add imported places to list

### Lists/Maps Management
- `GET /api/maps` - List user's maps (authenticated)
- `POST /api/maps` - Create new map
- `GET /api/maps/[id]` - Get map details (authenticated)
- `PUT /api/maps/[id]` - Update map
- `DELETE /api/maps/[id]` - Delete map
- `POST /api/maps/[id]/archive` - Archive map (soft delete)
- `POST /api/maps/[id]/publish` - Publish map (make public)
- `POST /api/maps/[id]/regenerate-description` - Regenerate AI description
- `GET /api/maps/public/[slug]` - Get public map data (unauthenticated)
  - Used by `/map/[slug]` page
  - Returns: list metadata, places with enrichments, MapPlace data

### Lists API (Legacy)
*Note: May be consolidated with /api/maps*
- `GET /api/lists/[slug]/locations` - Get locations for list

### Locations/Places
- `GET /api/locations/[locationId]` - Get location details (legacy)
- `GET /api/places/search` - Search places
  - Query params: `q` (search term), `lat`, `lng`, `radius`
- `GET /api/places/[slug]` - Get place by slug
- `GET /api/places/details/[placeId]` - Get place details
  - Returns: full place data with enrichments

### Map Places (Junction Table)
- `GET /api/map-places/[mapPlaceId]` - Get map-place relationship
- `PUT /api/map-places/[mapPlaceId]` - Update map-place data
  - Update: descriptor, order, notes, photos
- `DELETE /api/map-places/[mapPlaceId]` - Remove place from map

### Activity Spots (Skate/Surf)
- `GET /api/spots` - List activity spots
  - Query params: `layerType` (SKATE/SURF), `city`, `bounds`
- `GET /api/spots/[id]` - Get spot details
- `GET /api/spots/geojson` - Get spots as GeoJSON
  - For map layer rendering

### Open Graph Images
- `GET /api/og/[mapId]` - Generate OG image for map
  - Dynamic social sharing image
  - Shows map preview + title

### Debug
- `GET /api/debug/locations` - Debug locations data
  - Development tool

---

## URL Patterns & Examples

### Public Map Viewing
```
https://saiko.com/map/silver-lake-natural-wine
https://saiko.com/map/venice-beach-coffee-shops
https://saiko.com/map/dtla-lunch-spots
```

### Individual Place Pages
```
https://saiko.com/place/covell
https://saiko.com/place/tabula-rasa-bar
https://saiko.com/place/psychic-wines
```

### Map Editing
```
https://saiko.com/maps/abc123-uuid/edit
https://saiko.com/create/abc123-uuid/locations
https://saiko.com/create/abc123-uuid/preview
```

### User Dashboard
```
https://saiko.com/dashboard
https://saiko.com/import
https://saiko.com/templates
```

---

## Route Groups Explained

### `(auth)` - Authentication
- Shared layout with auth-specific styling
- No navigation header
- Centered forms

### `(creator)` - Dashboard & Tools
- Routes for map creators
- Requires authentication
- Shared creator navigation

### `(editor)` - Map Editing
- Direct map creation/editing interfaces
- Requires authentication & ownership
- Focused editing UI

### `(viewer)` - Public Viewing
- Public-facing content
- No authentication required
- Separate layout from creator tools

---

## Authentication & Authorization

### Public Routes (No Auth Required)
- `/` - Homepage
- `/map/[slug]` - Public maps
- `/place/[slug]` - Place detail pages

### Protected Routes (Auth Required)
- `/dashboard` - User dashboard
- `/maps/*` - Map management
- `/create/*` - Map creation
- All creator/editor routes

### Authorization Levels
- **Public Maps:** Anyone can view
- **Password-Protected Maps:** Requires password
- **Private Maps:** Only allowed emails
- **Map Editing:** Only map owner

---

## API Authentication

### Public Endpoints
- `GET /api/maps/public/[slug]`
- `GET /api/places/[slug]`
- `GET /api/places/search`

### Protected Endpoints
- All `POST`, `PUT`, `DELETE` operations
- User-specific data (`/api/maps` list)
- Map editing endpoints

### Authentication Method
- NextAuth.js session-based auth
- JWT tokens
- Cookie-based sessions

---

## OPS-STALE-DEPLOYMENTS

| Field | Value |
|-------|-------|
| **Type** | runbook |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/debugging/stale-deployments.md` |
| **Last Updated** | 2026-03-10 |

# Debugging Stale Deployments & Local Updates

When `/place/[slug]` or the API doesn't reflect recent code changes, use this playbook.

---

## Quick Diagnostics

### 1. Verify Which Build Answered

**DevTools (browser):**
1. Open `/place/[slug]` (e.g. `/place/seco`)
2. DevTools → **Network** tab
3. Find the `places/[slug]` request
4. Click it → **Response Headers**

**Look for:**
- `X-Build-Id` — commit SHA (Vercel) or timestamp (local)
- `X-Env` — `development` | `staging` | `production`
- `X-Server-Time` — when the server handled the request

### 2. Verification Script

```bash
# Local
./scripts/verify-place-api-headers.sh http://localhost:3000 seco

# Staging
./scripts/verify-place-api-headers.sh https://your-staging-domain.com seco
```

**Example output:**
```
=== Place API Headers ===
URL: http://localhost:3000/api/places/seco

x-build-id: local-dev
x-env: development
x-server-time: 2026-02-18T23:00:00.000Z
cache-control: no-store, no-cache, must-revalidate

=== Summary ===
X-Build-Id:  local-dev
X-Env: development
```

---

## Common Causes

| Cause | Symptom | Fix |
|-------|---------|-----|
| **Browser cache** | "from disk cache" in Network tab | Hard refresh (Cmd+Shift+R / Ctrl+Shift+R), or use Incognito |
| **Stale .next** | Code changes don't appear | `npm run dev:clean` (clears .next, restarts dev) |
| **Edge / CDN cache** | Staging shows old data | Add `?__nocache=1` to API URL, or wait for cache TTL |
| **Wrong domain** | Hitting prod instead of staging | Check DevTools request URL |
| **Client fetch caching** | useEffect fetch returns stale | Dev uses `cache: 'no-store'` + `Cache-Control: no-cache` |

---

## Exact Commands

### Reset local dev (fresh build)
```bash
npm run dev:clean
```

### Bypass cache for a single request
```
/api/places/seco?__nocache=1
```
Adds `X-Cache-Bypass: 1` and forces `Cache-Control: no-store`.

### Debug logging (server-side)
```bash
DEBUG_HEADERS=1 npm run dev
```
Logs `slug`, `buildId`, `env`, `bypassCache` for each API request.

---

## What "Good" Looks Like

**Local dev:**
- `X-Build-Id`: `local-dev` or ISO timestamp
- `X-Env`: `development`
- `Cache-Control`: `no-store, no-cache, must-revalidate`
- No "from disk cache" on the fetch

**Staging:**
- `X-Build-Id`: short commit SHA (e.g. `ad9e848`)
- `X-Env`: `staging` or `preview`
- Navigating to `/place/[slug]` reflects latest deploy

**Production:**
- `X-Build-Id`: commit SHA
- `X-Env`: `production`
- `Cache-Control`: `private, max-age=60, stale-while-revalidate=120` (normal requests)

---

## Architecture Note

The place page fetches data **client-side** in `useEffect`. That means:
- First paint shows loading state
- API response determines content
- Browser/CDN caching affects what you see

To eliminate client-side staleness entirely, consider moving the fetch to a server component or SSR (Phase 4 in the task list).

---

## SAIKO-DATA-SYNC-RUNBOOK

| Field | Value |
|-------|-------|
| **Type** | runbook |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/DATA_SYNC_RUNBOOK.md` |
| **Last Updated** | 2026-03-10 |

# Data Sync Runbook

Copy-paste commands only. No branching instructions.

---

## 1. Identify source of truth (run on BOTH Neon and Supabase)

Set the URL for the DB you are querying, then run the same block for the other DB.

### Neon (production)

Get your Neon URL from `.env` or `.env.vercel.prod` (the `DATABASE_URL` line). Then:

```bash
export NEON_URL="postgresql://..."   # paste from .env or .env.vercel.prod

psql "$NEON_URL" -c "SELECT count(*) AS places FROM public.places;"
psql "$NEON_URL" -c "SELECT count(*) AS lists FROM public.lists;"
psql "$NEON_URL" -c "SELECT count(*) AS map_places FROM public.map_places;"
psql "$NEON_URL" -c "SELECT count(*) AS place_coverage_status FROM public.place_coverage_status;"
psql "$NEON_URL" -c "SELECT count(*) AS place_tag_scores FROM public.place_tag_scores;"
psql "$NEON_URL" -c "SELECT count(*) AS energy_scores FROM public.energy_scores;"
psql "$NEON_URL" -c "SELECT slug FROM public.places ORDER BY updated_at DESC NULLS LAST LIMIT 10;"
```

### Supabase

Get your Supabase URL from `.env.vercel` (the `DATABASE_URL` line). Then:

```bash
export SUPABASE_URL="postgresql://..."   # paste from .env.vercel

psql "$SUPABASE_URL" -c "SELECT count(*) AS places FROM public.places;"
psql "$SUPABASE_URL" -c "SELECT count(*) AS lists FROM public.lists;"
psql "$SUPABASE_URL" -c "SELECT count(*) AS map_places FROM public.map_places;"
psql "$SUPABASE_URL" -c "SELECT count(*) AS place_coverage_status FROM public.place_coverage_status;"
psql "$SUPABASE_URL" -c "SELECT count(*) AS place_tag_scores FROM public.place_tag_scores;"
psql "$SUPABASE_URL" -c "SELECT count(*) AS energy_scores FROM public.energy_scores;"
psql "$SUPABASE_URL" -c "SELECT slug FROM public.places ORDER BY updated_at DESC NULLS LAST LIMIT 10;"
```

Compare counts and recency. The DB with more places and more recent updates is the source of truth. Production is Neon; typically Neon is the source of truth.

---

## 2. Sync source → production Neon

Once you know SOURCE (e.g. Neon staging or Supabase) and TARGET (production Neon), run:

### Dry-run (counts only; no writes)

```bash
npx tsx scripts/sync-db.ts --source "$SOURCE_URL" --target "$TARGET_URL"
```

Example with real URLs (replace with your values):

```bash
npx tsx scripts/sync-db.ts --source "postgresql://user:pass@source-host/db" --target "postgresql://user:pass@neon-host/neondb"
```

### Apply (upserts into target)

```bash
npx tsx scripts/sync-db.ts --source "$SOURCE_URL" --target "$TARGET_URL" --apply
```

Sync order: `places` → `energy_scores` → `place_tag_scores` → `place_coverage_status`. All upserts; no schema changes, no drops.

---

## 3. Dev: which DB the app uses

- **Local DB (localhost):**
  ```bash
  npm run dev:local
  ```
  Uses `.env` then `.env.local`; DATABASE_URL from `.env.local` wins. Banner shows CLASSIFICATION: LOCAL.

- **Neon DB:**
  ```bash
  npm run dev:neon
  ```
  Uses `.env` (and optionally `.env.vercel.prod` for DATABASE_URL). Banner shows CLASSIFICATION: NEON.

The startup banner always shows which DB is in use. No ambiguity.

---

## 4. Sanity: dev-only DB identity endpoint

With the dev server running (e.g. `npm run dev:neon`):

```bash
curl -sS http://localhost:3000/api/debug/db
```

Returns JSON: `classification`, `host`, `database`, `places_count`. Only available when `NODE_ENV=development`; 404 in production.

---

## 5. One-liner summary

- **Counts (Neon vs Supabase):** Set `NEON_URL` or `SUPABASE_URL`, run the `psql ... -c "SELECT count(*) ..."` blocks above.
- **Sync to prod Neon:** `npx tsx scripts/sync-db.ts --source <url> --target <prod-neon-url>` then add `--apply` to write.
- **Dev DB choice:** `npm run dev:local` or `npm run dev:neon`; banner confirms which DB.

---

## SAIKO-LOCAL-DEV

| Field | Value |
|-------|-------|
| **Type** | runbook |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/LOCAL_DEV.md` |
| **Last Updated** | 2026-03-10 |

# Local Development

Saiko runs on Next.js + Prisma. Single data path, no branching.

---

## Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your DATABASE_URL
```

---

## Database

### Migrate

```bash
npx prisma migrate dev
```

### Seed

Populates database with test scenarios A, B, C:

```bash
npm run seed
```

### Reset

```bash
npx prisma migrate reset
```

### Studio

```bash
npx prisma studio
```

---

## Run

```bash
npm run dev
```

Visit:
- `/demo` — All 3 scenarios side-by-side
- `/place/scenario-a` — Fully curated
- `/place/scenario-b` — Editorial lite  
- `/place/scenario-c` — Baseline

---

## Environment Variables

```
DATABASE_URL=postgresql://user:pass@localhost:5432/saikomaps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
```

---

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run type-check   # TypeScript check
npm run seed         # Seed database
npx prisma studio    # Database GUI
```

---

## Merchant Page Testing

After seeding, test the tier hierarchy:

1. Visit `/place/scenario-a`
2. Open merchant-page-implementation-checklist.md
3. Verify all 11 sections pass
4. Check tier order (1-12)
5. Confirm HoursCard always renders
6. Verify hero excluded from collage

---

*That's it. No deployment docs, no multi-db branching.*

---

## SAIKO-PROD-MIGRATION-OPERATOR-RUNBOOK

| Field | Value |
|-------|-------|
| **Type** | runbook |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/PROD_MIGRATION_OPERATOR_RUNBOOK.md` |
| **Last Updated** | 2026-03-10 |
| **Systems** | database |

# Production Migration Operator Runbook

**Golden-First Rollout — Recovery + Deploy**

**Goal:** Clear failed migration and successfully run `migrate deploy`  
**Time:** ~5–10 minutes  
**Mode:** Execute, don’t improvise

**One-file wrapper (optional):** After preflight, you can run `./scripts/prod-migrate-recover-and-deploy.sh` to automate Steps 1–4. It stops on any error (`set -euo pipefail`).

---

## 🔒 Preflight (Do Not Skip)

- [ ] Confirm `DATABASE_URL` points to production
- [ ] Confirm you are on correct git commit
- [ ] Confirm no active Vercel deploy running
- [ ] Confirm no concurrent migration attempt

---

## Step 1 — Inspect Failed Migration

Run (`--schema` required so Prisma finds the schema):

```bash
npx prisma db execute --schema=prisma/schema.prisma --stdin <<'SQL'
SELECT
  migration_name,
  started_at,
  finished_at,
  rolled_back_at,
  applied_steps_count,
  logs
FROM "_prisma_migrations"
WHERE migration_name = '20260217000000_add_password_reset_tokens';
SQL
```

Copy the output.

---

## Step 2 — Check Table Existence

```bash
npx prisma db execute --schema=prisma/schema.prisma --stdin <<'SQL'
SELECT to_regclass('public.password_reset_tokens') AS password_reset_tokens_table;
SQL
```

**Interpret result:**

- `password_reset_tokens` (or `public.password_reset_tokens`) → table exists
- empty / `null` → table does not exist

**Exact resolve command** (matches folder; run only after Step 2):  
`npx prisma migrate resolve --applied 20260217000000_add_password_reset_tokens`  
(See **`docs/P3009_RECOVERY_SNIPPET.md`** for full context.)

---

## Step 3 — Resolve

**If table exists:**

```bash
npx prisma migrate resolve --applied 20260217000000_add_password_reset_tokens
```

**If table does NOT exist:**

```bash
npx prisma migrate resolve --rolled-back 20260217000000_add_password_reset_tokens
```

---

## Step 4 — Deploy Remaining Migrations

```bash
npx prisma migrate deploy
```

**Expected outcome:**

- No P3009 error
- Remaining migrations apply successfully

---

## Step 5 — Verify Schema

Confirm golden-first fields exist:

```bash
npx prisma db pull
```

Confirm:

- `golden_records` has new fields (e.g. `confidence`, `promotion_status`)
- `resolution_links` table exists
- `raw_records` has new fields (e.g. `intake_batch_id`, `source_type`, `imported_at`)

---

## 🚨 STOP CONDITIONS

**Do NOT proceed to intake if:**

- `migrate deploy` fails again
- Any unexpected SQL errors appear
- Migration status still shows failed state

Escalate before continuing.

---

## Step 6 — Handoff

Once deploy succeeds:

**Proceed to:** `docs/GOLDEN_FIRST_POST_DEPLOY_CHECKLIST.md`

**Order:**

1. Intake
2. Resolve
3. Sanity-check
4. Promotion dry-run
5. Promotion commit (only if safe)

---

## Why This Exists

To eliminate:

- Guesswork
- Improvised commands
- Production risk
- Migration drift

Follow it exactly.

---

*This keeps your system behaving like a data company, not a startup guessing in prod.*

*If you want to tighten even further, we can add a one-line shell wrapper that automates Steps 1–4 and refuses to continue unless conditions pass.*

---

## SAIKO-PROD-PLACE-FIX-RUNBOOK

| Field | Value |
|-------|-------|
| **Type** | runbook |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/PROD_PLACE_FIX_RUNBOOK.md` |
| **Last Updated** | 2026-03-10 |

# Production Place Page Fix - Runbook

**Issue**: Place pages return 404 because production database has 0 places.

**Root Cause**: Production Neon database was never seeded after migrations.

---

## Part A: Fix Place Page 404 Handling ✅ DONE

**Changes Made**:
- Updated `app/(viewer)/place/[slug]/page.tsx` to handle API 404 and 500 errors
- Added proper error states:
  - **404**: Shows "Place Not Found" UI with link to browse maps
  - **500**: Shows "Something Went Wrong" with retry button
  - **Loading**: Shows spinner (existing)

**Files Changed**:
- `app/(viewer)/place/[slug]/page.tsx`

**Testing**:
```bash
# Test 404 handling (before seeding prod)
curl https://saikomaps.vercel.app/place/nonexistent-slug
# Should show "Place Not Found" UI in browser

# Test error UI in dev
npm run dev
# Visit http://localhost:3000/place/fake-slug
```

---

## Part B: Seed Production Database

### Option 1: Run Seed Script (Recommended)

**Prerequisites**:
- Production DATABASE_URL from Vercel

**Steps**:

1. **Get Production DATABASE_URL**:
   ```bash
   # Go to Vercel dashboard
   # https://vercel.com/bobbyai/saikomaps/settings/environment-variables
   # Copy the Production DATABASE_URL value
   ```

2. **Run seed script**:
   ```bash
   DATABASE_URL='<paste-prod-url-here>' \
   npx tsx scripts/seed-prod-places.ts
   ```

3. **Verify seeding**:
   ```bash
   # Should output:
   # ✓ Seeded: Seco → /place/seco
   # ✓ Seeded: Budonoki → /place/budonoki
   # ✓ Seeded: Tacos 1986 → /place/tacos-1986
   # ✓ Seeded: Redbird → /place/redbird-downtown-los-angeles
   # ✓ Seeded: Republique → /place/republique
   # ✅ Seed complete! Total places: 5
   ```

4. **Test production endpoints**:
   ```bash
   curl -i https://saikomaps.vercel.app/api/places/seco | head -40
   # Should return HTTP 200 with JSON payload
   
   curl -i https://saikomaps.vercel.app/api/places/budonoki | head -40
   # Should return HTTP 200
   
   curl -i https://saikomaps.vercel.app/api/places/republique | head -40
   # Should return HTTP 200
   ```

5. **Test in browser**:
   - https://saikomaps.vercel.app/place/seco (should load page)
   - https://saikomaps.vercel.app/place/budonoki (should load page)
   - https://saikomaps.vercel.app/place/nonexistent (should show 404 UI)

---

### Option 2: Import from Existing Database (If Available)

**If you have an existing database with real places data**:

1. **Export from source DB**:
   ```bash
   # Example: Export places table
   pg_dump <source-database-url> \
     --table=places \
     --data-only \
     --file=places-export.sql
   ```

2. **Import to production**:
   ```bash
   psql '<prod-database-url>' < places-export.sql
   ```

3. **Verify import**:
   ```bash
   DATABASE_URL='<prod-url>' \
   node -e "
   const {PrismaClient} = require('@prisma/client');
   const db = new PrismaClient();
   db.places.count().then(c => console.log('Places:', c)).finally(() => db.\$disconnect());
   "
   ```

---

## Verification Checklist

- [ ] Production database has places (count > 0)
- [ ] `/api/places/seco` returns 200
- [ ] `/api/places/budonoki` returns 200
- [ ] `/api/places/republique` returns 200
- [ ] `/place/seco` loads page (no infinite loader)
- [ ] `/place/nonexistent-slug` shows 404 UI
- [ ] Error handling works (try disabling network in devtools)

---

## Seed Script Details

**File**: `scripts/seed-prod-places.ts`

**What it does**:
- Upserts 5 curated LA places (seco, budonoki, tacos-1986, redbird, republique)
- Idempotent: safe to run multiple times
- Uses real coordinates and addresses

**Customization**:
- Edit `SEED_PLACES` array to add/modify places
- Replace with real data from your source database

---

## Troubleshooting

### Seed script fails with "DATABASE_URL not set"
- Make sure to prefix command with `DATABASE_URL='...'`
- Check that URL doesn't have quotes or newlines

### Seed script fails with connection error
- Verify DATABASE_URL is correct
- Check Neon database is running
- Ensure IP allowlist permits your connection (if applicable)

### API still returns 404 after seeding
- Verify places were created:
  ```bash
  DATABASE_URL='<prod-url>' \
  node -e "const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();db.places.findMany({select:{slug:true,name:true},take:10}).then(console.log).finally(()=>db.\$disconnect());"
  ```
- Check slug matches exactly (case-sensitive)
- Clear Vercel cache: redeploy or use `?nocache=1` query param

### Place page still shows infinite loader
- Check browser console for errors
- Verify error handling code was deployed
- Try hard refresh (Cmd+Shift+R)

---

## Next Steps (Future)

1. **Bulk import**: If you have a full places dataset, create import script
2. **Production seed job**: Consider automated seeding on first deploy
3. **Data sync**: Set up sync from authoritative source DB if applicable
4. **Monitoring**: Add logging/alerts for empty database state

---

**Status**: Ready to execute
**Estimated time**: 5-10 minutes
**Risk**: Low (seed script is idempotent and safe)

---

## SAIKO-MIGRATION-GUIDE

| Field | Value |
|-------|-------|
| **Type** | guide |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/MIGRATION_GUIDE.md` |
| **Last Updated** | 2026-03-10 |
| **Systems** | database |

# Migration Guide: Places → Golden Records

## Overview

This guide explains how to migrate the merchant page from querying the old `places` table to the new `golden_records` table powered by entity resolution.

## Migration Strategy

We'll use a **gradual rollout** approach with a feature flag to minimize risk:

### Phase 1: Parallel Operation (Safe)
- Keep existing `places` table queries working
- Add new `golden_records` queries behind feature flag
- Test in development/staging

### Phase 2: Gradual Rollout
- Enable for internal testing (10% of traffic)
- Monitor error rates and data quality
- Expand to 50%, then 100%

### Phase 3: Full Migration
- All traffic uses `golden_records`
- Archive `places` table (don't delete yet)

## Implementation

### Step 1: Create API Wrapper (Dual-Query Support)

Create a new API utility that can query either table:

```typescript
// lib/place-api.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type PlaceSource = 'legacy' | 'golden';

export async function getPlaceBySlug(slug: string, source: PlaceSource = 'legacy') {
  if (source === 'golden') {
    // Query golden_records
    const golden = await prisma.golden_records.findUnique({
      where: { slug },
    });
    
    if (!golden) return null;
    
    // Transform golden record to match legacy Place shape
    return {
      id: golden.canonical_id,
      slug: golden.slug,
      name: golden.name,
      address: golden.address_street,
      latitude: golden.lat,
      longitude: golden.lng,
      phone: golden.phone,
      website: golden.website,
      instagram: golden.instagram_handle,
      hours: golden.hours_json,
      description: golden.description,
      googlePhotos: null, // TODO: Migrate photo handling
      googleTypes: [],
      priceLevel: golden.price_level,
      neighborhood: golden.neighborhood,
      category: golden.category,
      // vibeTags removed from entities — vibe signals stay in golden_records.vibe_tags / identity_signals.vibe_words
      pullQuote: golden.pull_quote,
      pullQuoteSource: golden.pull_quote_source,
      pullQuoteUrl: golden.pull_quote_url,
      // Meta fields
      dataCompleteness: golden.data_completeness,
      sourceCount: golden.source_count,
      sourceAttribution: golden.source_attribution,
    };
  } else {
    // Query legacy places table
    return await prisma.place.findUnique({
      where: { slug },
    });
  }
}
```

### Step 2: Add Feature Flag

```typescript
// lib/feature-flags.ts

export function shouldUseGoldenRecords(userId?: string): boolean {
  // For now, only enable in development
  if (process.env.NODE_ENV === 'development') {
    return process.env.USE_GOLDEN_RECORDS === 'true';
  }
  
  // TODO: Add percentage-based rollout
  // const rolloutPercent = parseFloat(process.env.GOLDEN_RECORDS_ROLLOUT || '0');
  // return Math.random() * 100 < rolloutPercent;
  
  return false;
}
```

### Step 3: Update Merchant Page API Route

```typescript
// app/api/places/[slug]/route.ts

import { getPlaceBySlug } from '@/lib/place-api';
import { shouldUseGoldenRecords } from '@/lib/feature-flags';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const source = shouldUseGoldenRecords() ? 'golden' : 'legacy';
    const place = await getPlaceBySlug(params.slug, source);
    
    if (!place) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      ...place,
      // Add metadata about which source was used
      __meta: { source },
    });
  } catch (error) {
    console.error('Error fetching place:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Step 4: Testing Checklist

Before enabling golden_records in production:

- [ ] Run `npm run export:resolver` to seed all existing places
- [ ] Verify all golden_records have valid slugs
- [ ] Test merchant page with `USE_GOLDEN_RECORDS=true`
- [ ] Compare data quality (completeness, accuracy)
- [ ] Test edge cases:
  - [ ] Places with multiple sources
  - [ ] Places with missing data
  - [ ] Places with conflicting data
  - [ ] Newly ingested places (from CSV)

### Step 5: Gradual Rollout

```typescript
// lib/feature-flags.ts - Updated

export function shouldUseGoldenRecords(userId?: string): boolean {
  // Internal testing (always enabled for admins)
  if (userId && isAdmin(userId)) {
    return true;
  }
  
  // Percentage-based rollout
  const rolloutPercent = parseFloat(process.env.GOLDEN_RECORDS_ROLLOUT || '0');
  
  // Use consistent hashing for same user
  if (userId) {
    const hash = hashCode(userId);
    return (hash % 100) < rolloutPercent;
  }
  
  // Random rollout for anonymous users
  return Math.random() * 100 < rolloutPercent;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
```

Rollout schedule:
1. Week 1: 0% (development only)
2. Week 2: 10% (internal testing)
3. Week 3: 50% (if no issues)
4. Week 4: 100% (full migration)

## Data Quality Monitoring

Track these metrics during rollout:

```typescript
// lib/monitoring.ts

export async function logDataQuality(placeId: string, source: PlaceSource) {
  const metrics = {
    source,
    timestamp: new Date(),
    placeId,
    // Track which fields are populated
    hasPhone: !!place.phone,
    hasWebsite: !!place.website,
    hasInstagram: !!place.instagram,
    hasHours: !!place.hours,
    hasDescription: !!place.description,
    // Track data completeness
    completeness: place.dataCompleteness,
    sourceCount: place.sourceCount,
  };
  
  // Send to analytics
  console.log('[DATA_QUALITY]', JSON.stringify(metrics));
}
```

Compare metrics:
- **Completeness**: Is data more complete in golden_records?
- **Error rate**: Are there more 404s or 500s?
- **Load time**: Is performance acceptable?
- **User reports**: Are users reporting issues?

## Rollback Plan

If issues arise during rollout:

1. **Immediate rollback**: Set `GOLDEN_RECORDS_ROLLOUT=0`
2. **Fix issues**: Debug using logs and error reports
3. **Re-test**: Verify fix in development
4. **Gradual re-rollout**: Start at 10% again

## Post-Migration

Once 100% traffic is on golden_records:

### 1. Archive Legacy Table
```sql
-- Rename for safety
ALTER TABLE places RENAME TO places_archived_20260209;

-- Add archived timestamp
ALTER TABLE places_archived_20260209 ADD COLUMN archived_at TIMESTAMP DEFAULT NOW();
```

### 2. Update All Queries
Search codebase for `prisma.place.` and update to `prisma.golden_records.`

### 3. Clean Up Feature Flags
Remove `shouldUseGoldenRecords()` checks once migration is complete.

## Common Issues

### Issue: Slug collisions after migration
**Cause:** Two places might have same slug (e.g., "taco-zone-downtown")  
**Fix:** System auto-increments slugs. Verify redirects work.

### Issue: Missing photos in golden_records
**Cause:** Photo handling not migrated yet  
**Fix:** Keep querying `places` table for photos during transition, or migrate googlePhotos to raw_json.

### Issue: Broken URLs (404s)
**Cause:** Slug changed during export  
**Fix:** Create slug redirect table:
```sql
CREATE TABLE slug_redirects (
  old_slug VARCHAR(255) PRIMARY KEY,
  new_slug VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Environment Variables

```env
# .env.local

# Enable golden records (boolean)
USE_GOLDEN_RECORDS=false

# Rollout percentage (0-100)
GOLDEN_RECORDS_ROLLOUT=0

# Monitoring
LOG_DATA_QUALITY=true
```

## Success Criteria

Migration is successful when:

- ✅ 100% of traffic on golden_records
- ✅ 0% increase in error rate vs. baseline
- ✅ Data completeness improved (or maintained)
- ✅ No user-reported issues for 2 weeks
- ✅ Legacy `places` table archived

---

## SAIKO-MIGRATION-HISTORY-RECONCILIATION

| Field | Value |
|-------|-------|
| **Type** | guide |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/MIGRATION_HISTORY_RECONCILIATION.md` |
| **Last Updated** | 2026-03-10 |
| **Systems** | database |

# Migration History Reconciliation Analysis

**Status:** Analysis Only — No Changes Applied  
**Date:** 2026-03-09  
**Analyst:** Cursor (Cortez)  
**Input:** Confirmed facts from `prisma migrate status`, `_prisma_migrations` direct query, repo inspection

---

## 1. Executive Summary

The local migration folder and the database migration history have forked. This is not catastrophic, but it is a structural risk that must be understood before any further migrations are applied.

**What happened in plain English:**

Between approximately 2026-02-20 and 2026-03-03, seven migrations were applied directly to the database without corresponding files being committed to the local repo. These were either applied via `psql` directly, or from a branch that was never merged. The local repo continued generating migrations without knowing the DB had diverged. The two histories interleave chronologically but do not share the same set of entries.

**The current risk:**

1. `prisma migrate deploy` cannot be trusted in this state. It will attempt to apply local migrations in order, but those migrations may conflict with changes already present in the DB (or may be redundant with DB-only migrations that achieved the same thing via different SQL).

2. `20260306200000_slim_entities_fields_v2` is recorded in the DB as failed/rolled-back. It is not applied. But its entry exists in `_prisma_migrations` in an error state — Prisma will detect this and may refuse to proceed without manual intervention.

3. There is at least one likely live schema mismatch: the DB-only migration `20260301000000_rename_place_id_to_entity_id_signals_overlays` may have renamed columns in `proposed_signals` and `operational_overlays` to `entity_id`, while the local Prisma schema still maps these as `place_id`. If true, Prisma queries against these tables will silently resolve to wrong column names and may produce errors in production.

4. Eight local migrations are not applied to the DB at all. Some of these depend on the DB already being in a state that the DB-only migrations may have altered differently.

**The immediate priority is: do not run `prisma migrate deploy` until the fork is understood and a reconciled baseline is established.**

---

## 2. Fork Explanation

### Where the fork began

The local migration folder's February 2026 sequence is:

```
20260220000000_v_places_la_bbox_golden_add_golden_text
20260221000000_add_saiko_fields_trace_v02
20260222120000_add_place_photo_eval
...
```

The DB-only migrations fall at:

```
20260220100000_add_website_source_confidence_updated_at   ← between local 220000 and 221000
20260220200000_add_website_source_class                   ← between local 220000 and 221000
```

This means the fork did not start at the end of local history — it started *inside* the February migration sequence. Migrations `20260220100000` and `20260220200000` were inserted between two local migrations chronologically, meaning they were applied to the DB at some point while local `20260221000000` onward was also being developed.

### The most likely mechanism (inferred, not confirmed)

**Direct psql application without local file creation.** Someone ran SQL directly against the DB (or applied a file that was never committed to the repo) at least twice in the `2026-02-20` window. The `_prisma_migrations` table was updated (either manually or via `prisma db execute`), but no corresponding `.sql` file was created under `prisma/migrations/`. This left a "phantom" migration trail in the DB that local Prisma cannot see.

This pattern then continued through March 3 — five more DB-only migrations accumulated, each applied directly or from an unmerged branch.

### Why the local migrations are not in the DB

The local migrations from `20260306100000` onward were created after the fork was already present. When `prisma migrate dev` was run to create them, it only saw local history and did not know the DB had diverged. The DB at that point had the 7 extra migrations applied, making the two histories incompatible. Running `prisma migrate status` now surfaces this incompatibility.

**Key confirmed fact that narrows this:** `20260221000000_add_saiko_fields_trace_v02` is present locally AND is in the DB applied history (it is not in either of the two mismatch lists). This means the fork point is narrow: DB-only entries `20260220100000` and `20260220200000` were applied between the last shared migration (`20260220000000`) and the next shared migration (`20260221000000`). The database accepted `20260221000000` even with the intervening DB-only migrations because Prisma migration history is strictly ordered by timestamp, not by content dependency.

---

## 3. DB-Only Migrations

These seven migrations are in the DB's `_prisma_migrations` table but have no corresponding local files.

---

### `20260220100000_add_website_source_confidence_updated_at`

**Likely purpose:** Adds `website_source`, `confidence`, and `updated_at` fields to `golden_records`. The current local Prisma schema shows `golden_records` has `website_source String?`, `website_confidence Decimal?`, and `website_updated_at DateTime?` — these fields are likely what this migration added.

**Superseded by local migration?** No. These fields exist in the schema and would have required a migration to add them. Since no local migration adds them, this DB-only migration is the source of truth for their existence.

**Recommendation:** Reconstruct as a local file. The migration content can be inferred from the schema diff, or recovered by querying the DB `_prisma_migrations` table for the applied SQL (if `applied_steps_count` is non-zero and it has a `finished_at`).

---

### `20260220200000_add_website_source_class`

**Likely purpose:** Adds `website_source_class String?` to `golden_records`. The local schema shows: `website_source_class String? // first_party | third_party | ai_inferred`. No local migration adds this field.

**Superseded by local migration?** No — same situation as above.

**Recommendation:** Reconstruct as a local file alongside `20260220100000`.

---

### `20260301000000_rename_place_id_to_entity_id_signals_overlays`

**Likely purpose:** Completes the `place_id → entity_id` rename started by `20260228100000_places_to_entities`. That migration renamed `place_id` columns in many tables but appears to have missed `proposed_signals` and `operational_overlays`.

**Active risk:** If this migration successfully ran in the DB, the columns in `proposed_signals` and `operational_overlays` are now called `entity_id` in the database. The local Prisma schema still maps both as `@map("place_id")`:

- `proposed_signals.placeId @map("place_id")` (schema line 1233)  
- `operational_overlays.placeId @map("place_id")` (schema line 1256)

If the DB renamed these columns, Prisma queries against `proposed_signals` and `operational_overlays` will try to reference `place_id` but the column is `entity_id` — causing query failures. This is a **live schema mismatch risk** that should be verified immediately with:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name IN ('proposed_signals', 'operational_overlays')
  AND column_name IN ('place_id', 'entity_id');
```

**Superseded by local migration?** No. No local migration addresses these two tables.

**Recommendation:** Verify DB column names first. If the rename happened, create a local migration file documenting it and update the Prisma schema `@map` annotations.

---

### `20260301100000_add_launch_readiness_to_place_coverage_status`

**Likely purpose:** Adds launch-readiness tracking to `place_coverage_status`. The current schema includes `last_missing_groups Json? @map("last_missing_groups")` — this field may have been added here. Alternatively, this may have added a `is_launch_ready` boolean or a readiness score column that was later removed or not reflected in the local schema.

**Superseded by local migration?** Possibly partially — the fields it added may already be in the schema, or may have been superseded by the Fields v2 approach to readiness scoring. Cannot confirm without the migration file.

**Recommendation:** Recover the SQL from `_prisma_migrations.migration` column (Prisma stores the applied SQL), inspect it, and determine whether the fields are present in the current DB schema. If present: create a local file. If not: document as retired.

---

### `20260303000000_add_traces`

**Likely purpose:** Given `20260221000000_add_saiko_fields_trace_v02` added `FieldsMembership`, `TraceSignalsCache`, and `Actor` tables (with `IF NOT EXISTS` guards and idempotent FK adds), this March 3 migration likely adds a different traces-related concept. Candidates:

- A v1 or interim traces schema that predated v02  
- Additional fields or indexes on `TraceSignalsCache`  
- A separate `traces` table (distinct from `TraceSignalsCache`) for event logging  

The migration name `add_traces` (without a version suffix) is distinct enough from `add_saiko_fields_trace_v02` that they likely address different tables.

**Superseded by local migration?** Unknown without the file. If it adds a standalone `traces` table not present in the local schema, it is not superseded.

**Recommendation:** Recover from `_prisma_migrations`. If it creates objects not in the local schema, add a local file. If superseded, document and retire.

---

### `20260303200000_neutralize_restaurant_group_id`

**Likely purpose:** Makes `restaurant_group_id` safe to deprecate — likely removes the FK constraint from `entities.restaurant_group_id` to `restaurant_groups`, or sets a `NOT NULL` to nullable, or marks it in some way. The current schema has the deprecation comment:

```prisma
restaurantGroupId String? @map("restaurant_group_id") // DEPRECATED: use place_actor_relationships. No new writes.
```

The field is already nullable in the schema. This migration likely made the column nullable in the DB (or dropped the FK constraint) to enable the deprecation path.

**Superseded by local migration?** Possibly — the local `20260228000000_place_actor_relationships` migration and the subsequent `backfill-place-actor-relationships.ts` script handle the replacement side. The neutralization of the column itself is what this DB-only migration covers.

**Recommendation:** Verify current DB state of the `restaurant_group_id` FK constraint. If the FK is gone, reconstruct the local file documenting its removal. If the FK still exists, this migration may not have applied correctly.

---

### `20260303210000_timefold_v1_entities`

**Likely purpose:** "Timefold" is not a term used elsewhere in the local repo. This migration is the most opaque of the seven. Candidates:

- Adds time-zone or time-window fields to entities (market schedule, hours folding)  
- Adds a first version of event/appearance scheduling logic at the entity level  
- Adds a `timefold` operational concept for entities that change over time (pop-ups, temporary closures, seasonal operations)  

None of these appear in the local schema as a distinctly labeled "timefold" concept. The `marketSchedule Json?` field on entities is already present locally and scheduled for removal in the slim-entities migration. It's possible `timefold_v1_entities` added that field, or it added something else entirely.

**Recommendation:** Recover from `_prisma_migrations`. This is the highest-uncertainty DB-only migration. Do not proceed past the reconciliation phase without understanding its content.

---

## 4. Local-Only Unapplied Migrations

These are in the local `prisma/migrations/` folder but are absent from the DB's `_prisma_migrations`.

---

### `20260306300000_drop_legacy_tables_fields_v2`

**Intended:** Yes — this is the second deferred architectural gate migration (drops `golden_records`, legacy MDM tables, etc.).

**Depends on unresolved prerequisites?** Yes. Multiple: `slim_entities_fields_v2` must be applied first, all reads migrated off `golden_records`, `migrate-actor-relationships-to-entities.ts` applied, etc. See `docs/DEFERRED_MIGRATION_GATES.md`.

**Should remain pending?** Yes. This is intentionally deferred. Do not apply.

**Should be rewritten?** Not yet — but if the DB-only migrations introduced schema changes that this migration assumes, it may need updating. Assess after DB-only migrations are recovered.

---

### `20260307000000_rewire_fieldsmembership_to_entities`

**Intended:** Yes — explicitly rewires `FieldsMembership` FK from `golden_records` to `entities`.

**Complication:** Migration `20260221000000_add_saiko_fields_trace_v02` already includes an idempotent `ADD CONSTRAINT` block that adds `FieldsMembership_entity_id_fkey → entities.id`. If that block successfully executed in the DB (because no FK existed at creation time), then `20260307000000` is redundant — the DB already has the correct FK. If the `20260221000000` block silently failed (because a golden_records FK was already present at that time), then `20260307000000` is still needed.

**Safest approach before applying:** Run the verification query:
```sql
SELECT conname, confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'FieldsMembership_entity_id_fkey';
```
If it shows `entities`, this migration is a no-op and can be marked applied without running. If it shows `golden_records`, it must be applied (safe DDL).

---

### `20260307000001_rewire_tracesignalscache_to_entities`

**Intended:** Yes — mirrors `20260307000000` for `TraceSignalsCache`.

**Same complication and recommendation as above.** Verify:
```sql
SELECT conname, confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'TraceSignalsCache_entity_id_fkey';
```

---

### `20260307000003_add_merchant_surface_scans`

**Intended:** Yes — adds `merchant_surface_scans` table, which is present in the local Prisma schema and actively used by enrichment scripts.

**Depends on prerequisites?** Only that `entities` exists (it does). This migration is safe and self-contained.

**Should remain pending?** Yes, in the sense that it hasn't been applied to DB. But it SHOULD be applied (after migration history is reconciled) — the table it creates is in active use by local scripts.

**Risk:** If the DB already has `merchant_surface_scans` from some other path (e.g., applied manually), running this migration will fail with "table already exists."

---

### `20260307000004_add_menu_fetches`

**Same situation as above** for `menu_fetches` table. Both tables are schema-present and script-active. Safe to apply once history is reconciled and DB state verified.

---

### `20260307000005_add_menu_fetches_pdf_fields`

**Intended:** Yes — adds PDF-specific fields to `menu_fetches`. Depends on `20260307000004` being applied first.

---

### `20260307000006_add_identity_enrichment`

**Intended:** Yes — adds `identity_enrichment_runs` table (used by the review queue system, present in local schema).

---

### `20260308000000_add_merchant_surfaces` and `20260309000000_add_merchant_surface_artifacts`

**Intended:** Yes — add the `merchant_surfaces` and `merchant_surface_artifacts` tables, both present in local schema and actively used.

**Note:** Three of these are new table creations (`merchant_surface_scans`, `merchant_surfaces`, `merchant_surface_artifacts`) and four are additive changes. All are safe to apply in isolation assuming prior history is clean. The question is whether any of the DB-only migrations created conflicting or overlapping tables.

---

## 5. slim_entities_fields_v2 Rollback Analysis

### What the migration file shows

`20260306200000_slim_entities_fields_v2/migration.sql` uses four `ALTER TABLE entities DROP COLUMN IF EXISTS ...` blocks. It is labeled at the top as a DEFERRED migration with explicit "do not apply until" conditions. It was designed to be applied manually via `psql`.

Despite this label, it appears in the DB's `_prisma_migrations` as failed/rolled-back multiple times. This means it was attempted — possibly via `prisma migrate deploy` or `prisma migrate dev` — more than once, each time failing and being rolled back.

### Most likely cause of rollback

**PostgreSQL will reject `ALTER TABLE ... DROP COLUMN` if any view depends on that column.** The migration does not include `DROP VIEW` statements before the column drops.

From earlier analysis:

- `v_places_la_bbox` — selects approximately 35 columns from `entities` including `name`, `address`, `latitude`, `longitude`, `description`, `tagline`, and all the fields being dropped
- `v_entity_launch_readiness_v0` — also selects multiple columns from `entities` that are being dropped

If either of these views existed in the DB at migration time, PostgreSQL would raise:

```
ERROR: cannot drop column <column> of table entities because other objects depend on it
DETAIL: view v_places_la_bbox depends on column <column> of table entities
HINT: Use DROP ... CASCADE to drop the dependent objects too.
```

This causes the entire transaction to roll back. Prisma records a failed migration.

**Secondary possible cause:** The migration was attempted before `canonical_entity_state` was populated, but that would not cause a DB error — it would only cause data loss (product pages breaking). The view dependency is the only thing that would cause an automatic rollback at the DB level.

**Confirmed prerequisite failure:** The migration header states explicit prerequisites including "canonical_entity_state is fully populated." That gate was not checked (or not met) before the migration was attempted.

### Should it be retried, replaced, or retired?

**Recommendation: retained, but its DB error state must be resolved before any further migrate commands.**

The migration's intent is correct and the architecture it implements is the target state. It should not be retired. However:

1. The error state in `_prisma_migrations` must be cleared before Prisma will allow further migration deploys. This requires either running `prisma migrate resolve --rolled-back <migration-name>` or marking it as manually applied if it did succeed at some point.

2. Before retrying, `v_places_la_bbox` and `v_entity_launch_readiness_v0` must be explicitly dropped (via a preparatory migration or manual SQL).

3. All gate conditions in `docs/DEFERRED_MIGRATION_GATES.md` must be satisfied before retry.

---

## 6. Recommended Source of Truth

### Recommendation: the DB is the source of truth for applied state; the local schema is the source of truth for intended state — but they need reconciliation before either can be trusted fully.

**Rationale:**

- The DB has successfully applied migrations (including the 7 DB-only ones) that represent real structural decisions made during development. These cannot be ignored.
- The local Prisma schema accurately reflects the intended final architecture (Fields v2 four-layer model). It was not created with knowledge of the DB-only migrations, but those migrations are additive (adding fields and renaming columns) rather than contradictory to the local schema's intent.
- A `prisma db pull` to regenerate the schema from the DB would capture the DB-only migrations' effects, but would also capture the rolled-back state of `slim_entities_fields_v2` (i.e., `entities` still has all its data columns) — which is correct for the current moment.

**What to NOT do:** Do not treat the local migration folder as the authoritative history and attempt to make the DB conform to it via force-apply. The DB has data and structures built on top of the 7 DB-only migrations. Applying conflicting migrations on top of them is unsafe.

**What to do:** Create a reconciled baseline — a new set of local migration files that reflects the DB's actual applied history, then bring the local-only unapplied migrations forward from there.

---

## 7. Safe Path Forward

This is sequencing only. No implementation yet.

### Phase 1: Understand DB reality (before any migration commands)

**1a.** Query `_prisma_migrations` for each DB-only migration's content:
```sql
SELECT migration_name, applied_steps_count, finished_at, logs
FROM _prisma_migrations
WHERE migration_name IN (
  '20260220100000_add_website_source_confidence_updated_at',
  '20260220200000_add_website_source_class',
  '20260301000000_rename_place_id_to_entity_id_signals_overlays',
  '20260301100000_add_launch_readiness_to_place_coverage_status',
  '20260303000000_add_traces',
  '20260303200000_neutralize_restaurant_group_id',
  '20260303210000_timefold_v1_entities'
)
ORDER BY migration_name;
```

Confirm each has `finished_at IS NOT NULL` and `applied_steps_count > 0` (i.e., they actually ran successfully).

**1b.** Verify the `proposed_signals` and `operational_overlays` column name issue:
```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_name IN ('proposed_signals', 'operational_overlays')
  AND column_name IN ('place_id', 'entity_id');
```

**1c.** Verify FK targets for `FieldsMembership` and `TraceSignalsCache`:
```sql
SELECT conname, confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname IN (
  'FieldsMembership_entity_id_fkey',
  'TraceSignalsCache_entity_id_fkey'
);
```

**1d.** Confirm the `slim_entities_fields_v2` error state:
```sql
SELECT migration_name, applied_steps_count, finished_at, logs, rolled_back_at
FROM _prisma_migrations
WHERE migration_name LIKE '%slim_entities%';
```

---

### Phase 2: Resolve the slim_entities_fields_v2 error state

The rolled-back migration entry in `_prisma_migrations` will block `prisma migrate deploy`. It must be resolved before any other migrations can be applied via Prisma.

**2a.** Run:
```bash
npx prisma migrate resolve --rolled-back 20260306200000_slim_entities_fields_v2
```

This tells Prisma to treat the migration as "rolled back / not applied." The migration remains in the folder and can be retried later when prerequisites are met. This does NOT apply the migration — it only clears the error state.

---

### Phase 3: Create local files for DB-only migrations

For each of the 7 DB-only migrations: recover the SQL from `_prisma_migrations.migration` column (if stored — some Prisma versions store applied SQL, some don't), then create matching local files. If SQL is not stored, reconstruct from schema diffs.

**Order to create them in:**
```
20260220100000_add_website_source_confidence_updated_at
20260220200000_add_website_source_class
20260301000000_rename_place_id_to_entity_id_signals_overlays
20260301100000_add_launch_readiness_to_place_coverage_status
20260303000000_add_traces
20260303200000_neutralize_restaurant_group_id
20260303210000_timefold_v1_entities
```

After creating each file, run:
```bash
npx prisma migrate resolve --applied <migration_name>
```

This tells Prisma to register these as applied without running them (since they're already in the DB).

---

### Phase 4: Verify the rewire migrations (20260307000000, 20260307000001)

After Phase 1c confirms FK targets:

- If `FieldsMembership` → `entities`: mark `20260307000000` as applied (`prisma migrate resolve --applied`)
- If `FieldsMembership` → `golden_records`: apply `20260307000000` normally  
- Same logic for `TraceSignalsCache` / `20260307000001`

---

### Phase 5: Apply the remaining safe local-only migrations

Once migration history is clean and `prisma migrate status` shows no drift, apply in order:

```
20260307000003_add_merchant_surface_scans
20260307000004_add_menu_fetches
20260307000005_add_menu_fetches_pdf_fields
20260307000006_add_identity_enrichment
20260308000000_add_merchant_surfaces
20260309000000_add_merchant_surface_artifacts
```

Verify each with `prisma migrate status` between applies during initial stabilization.

---

### Phase 6: Return to deferred migration prerequisites

Only after Phase 5 is complete and `prisma migrate status` shows a clean history:

- Satisfy Gate 1 prerequisites (see `docs/DEFERRED_MIGRATION_GATES.md`)
- Drop the dependent views
- Retry `20260306200000_slim_entities_fields_v2`
- Proceed to Gate 2 prerequisites
- Apply `20260306300000_drop_legacy_tables_fields_v2`

---

## 8. Immediate Do / Do Not Do

### DO NOT do right now

| Action | Why |
|---|---|
| Run `prisma migrate deploy` | Will attempt to apply local-only migrations in an unknown order against a DB that may conflict |
| Run `prisma migrate dev` | May create new migrations based on schema drift that compound the confusion |
| Apply `20260306200000_slim_entities_fields_v2` manually via psql | The error state must be cleared first; views must be dropped first; prerequisites must be met |
| Apply `20260306300000_drop_legacy_tables_fields_v2` | Gate 1 is not satisfied; would permanently drop golden_records before migration history is clean |
| Delete or modify any migration file | Migration files are the audit trail; altering them creates additional inconsistency |
| Run `prisma db push` | Would attempt to make the DB conform to the local schema and destroy the DB-only migration work |
| Apply `20260307000000` or `20260307000001` | Not until Phase 1c confirms whether they're needed or redundant |

### DO (in order)

1. **First:** Run Phase 1 queries against the DB and capture results. This is read-only and establishes ground truth.

2. **Second:** Verify the `proposed_signals`/`operational_overlays` column name issue (Phase 1b). If `entity_id` exists in DB but schema says `place_id`, this is a live production risk requiring immediate local schema update.

3. **Third:** Run `prisma migrate resolve --rolled-back 20260306200000_slim_entities_fields_v2` to clear the error state and unblock Prisma.

4. **Fourth:** Begin Phase 3 — create local migration files for the 7 DB-only migrations and register them as applied.

5. **Fifth:** Once history is clean, proceed with Phase 4 and 5.

The deferred architectural migrations (slim-entities, drop-legacy-tables) should not be retried until the migration history fork is fully resolved.

---

## Appendix: Migration Timeline (Confirmed)

```
LOCAL ONLY                DB ONLY                     SHARED (both)
─────────────────────────────────────────────────────────────────
                                                       ... through 20260220000000
           20260220100000_add_website_source_*         ← DB-only (between local 220000 and 221000)
           20260220200000_add_website_source_class      ← DB-only
                                                       20260221000000_add_saiko_fields_trace_v02
                                                       20260222120000 through 20260231000000
           20260301000000_rename_place_id_*             ← DB-only
           20260301100000_add_launch_readiness_*        ← DB-only
           20260303000000_add_traces                    ← DB-only
           20260303200000_neutralize_restaurant_group   ← DB-only
           20260303210000_timefold_v1_entities          ← DB-only
                                                       20260305000000 through 20260306100000
                          [slim_entities: ROLLED BACK] 20260306200000 (error state in DB)
20260306300000 (local, never applied)
20260307000000 (local, never applied) ─── FK may already be correct in DB
20260307000001 (local, never applied) ─── FK may already be correct in DB
20260307000003 through 20260309000000 (local, never applied)
```

---

*This document is analysis only. No schema changes, migrations, or data modifications were made during its production.*

---

## SAIKO-SAIKOAI-EXTRACTION-PROMPT-V2-1

| Field | Value |
|-------|-------|
| **Type** | document |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/saikoai-extraction-prompt-v2.1.md` |
| **Last Updated** | 2026-03-10 |

# SaikoAI Extraction Prompt — V2.1

Production-ready system prompt for the enrichment pipeline.
Drop directly into your job runner.

Tested against: Maru Coffee (Los Feliz) — 5 patches applied from real-world test.

---

See `lib/saikoai/prompts/place-extraction.ts` for the prompt implementation.
See `docs/extraction-test-output-maru-coffee.json` for sample output.

---

## Changelog

- **V2.2**: Patches from first live extraction (Maru Coffee batch run). Patch 6: Curator note voice — lead with feel, ban "Wikipedia voice". Patch 7: Null fields must have editor hints (hard requirement). Patch 8: Equipment/brand name filter across all fields.

- **V2.1.1**: Added framing section. System prompt now states explicitly: SaikoAI populates the editorial bento fields on each Merchant Profile; Google Places handles the basics (name, address, hours, coordinates, category); SaikoAI handles the sensory, experiential, editorial stuff. Fields section header restates the split.

- **V2.1**: Tested against Maru Coffee (Los Feliz) with real sources.
  Added curator_note exclusion list (no credentials, equipment, dates).
  Added curator_note length cap (2-3 sentences, max 4). Added multi-
  location handling rule (one card per materially different location).
  Added source age penalty (>3 years = confidence downgrade). Added
  universal price normalization scale ($–$$$$). Added null field
  guidance for editors (actionable fill suggestions).

---

## SAIKO-APP-OVERVIEW

| Field | Value |
|-------|-------|
| **Type** | overview |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/APP_OVERVIEW.md` |
| **Last Updated** | 2026-03-10 |

# Saiko Maps - Application Overview

## Core Concept
A curated map platform for creating and sharing beautiful, editorial-style lists of places (restaurants, wine bars, shops, etc.). Think "Spotify playlists but for places."

---

## Major Features

### 1. **Map Creation & Management**
- Users create custom maps/lists with places
- Add places with Google Place ID integration
- Order and curate places with descriptors/notes
- Public/private access control with optional password protection

### 2. **Place Data Enrichment**

#### Google Places API Integration
Automatic backfill of:
- Photos (stored as JSON references)
- Address, hours, phone, website
- Types/categories
- Price level (0-4)
- Reverse geocoded neighborhood

#### Voice Engine (AI Content Generation)
Powered by Anthropic Claude, generates:
- **Taglines:** Editorial one-liners (e.g., "Low-key wine bar with natural selections")
- **Vibe Tags:** Atmosphere descriptors (["Standing room", "Surf crowd"])
- **Tips:** Helpful visitor advice (["Go early for a seat", "Cash only"])
- **Pull Quotes:** Editorial quotes with source attribution

### 3. **Field Notes View** (Premium Template)
Magazine-quality presentation with three viewing modes:

#### Cover/Header Map
- Real Google Map with hydrology-inspired aesthetic
- Cool gray-blue roads (#9aabb5 highways, #c4ced3 arterials)
- Smart bounds with IQR outlier detection (zooms tight on core cluster)
- All pins same size, no labels
- Decorative elements: compass rose, scale bar, ocean wash overlay

#### List View
- Vertical feed of place cards
- Hero photos (Google or user-uploaded)
- AI-generated taglines and editorial content
- Metadata: category, price level, cuisine, neighborhood
- Curator descriptors
- Field Notes design: parchment/charcoal palette, Libre Baskerville typography

#### Expanded Map View
- Full-screen interactive map
- Marker clustering (prevents label soup at zoom-out)
- Labels positioned below pins
- Horizontal carousel of place cards at bottom
- Click pin → scroll to card, click card → center map
- Same hydrology aesthetic as cover map

### 4. **Map Viewing Modes**
- **Split Desktop View:** Map on left, scrollable place cards on right
- **Mobile Toggle:** Switch between list and map views
- **Expanded Map:** Full-screen exploration with card carousel

### 5. **Smart Geography**

#### Outlier Detection
IQR-based algorithm:
- Calculates distance from center for all places
- Uses interquartile range (IQR) to identify outliers
- Fits map bounds to core cluster (80%+ of pins)
- Outlier pins still render, just outside initial viewport
- Tighter multiplier for cover map (0.8) vs expanded (1.0)

#### Centroid Positioning
- Calculates average lat/lng of all included places
- Centers map on centroid after fitting bounds
- Keeps cluster visually centered

#### Neighborhood Aggregation
- Extracts neighborhoods from all places
- Counts frequency
- Displays sorted by popularity
- Dynamic singular/plural labels

#### Marker Clustering (Expanded View Only)
- Groups nearby pins when zoomed out
- Shows count in cluster marker
- Click cluster → zoom in → explode into individual pins
- Custom styling: Field Notes charcoal circle with parchment text

### 6. **Place Cards**
Display format for each place:
- Hero photo (Google or user-uploaded)
- AI-generated tagline
- Category badge
- Price level indicators ($-$$$$)
- Cuisine type
- Curator descriptor (editorial description from map creator)
- Vibe tags
- Tips
- Pull quotes
- Metadata: neighborhood, open status, hours

---

## Tech Stack

### Framework & Runtime
- **Next.js 16:** App Router, Turbopack, Server Components
- **React 19:** Client components for interactivity
- **TypeScript:** Full type safety

### Database & ORM
- **PostgreSQL:** Primary database
- **Prisma:** ORM with type-safe queries
- **Migrations:** Version-controlled schema changes

### External Services
- **Google Maps JavaScript API:**
  - Map rendering with custom styles
  - Place Details API for enrichment
  - Photo references
- **Google Places API:** Place data backfill
- **Anthropic Claude (API):** Voice Engine content generation
- **NextAuth.js:** Authentication & session management

### Styling & UI
- **Tailwind CSS:** Utility-first styling
- **Custom Design System:**
  - Field Notes palette: charcoal (#36454F), parchment (#F5F0E1), khaki (#C3B091)
  - Typography: Libre Baskerville (serif), system sans fallbacks
  - Print-inspired aesthetic

### Maps & Geo
- **@googlemaps/js-api-loader:** Dynamic Google Maps loading
- **@googlemaps/markerclusterer:** Marker clustering
- **Custom map styles:** Hydrology-inspired JSON styles
- **Smart bounds algorithm:** IQR-based outlier detection

---

## Data Models (Simplified)

### Core Entities
```
User → List (Maps) → MapPlace → Place
                              ↓
                        ViewerBookmark
```

### Key Models

**List (Map):**
- Title, description, slug
- Organizing logic (time/neighborhood/route/purpose-based)
- Template type (currently: field-notes)
- Access control (public/password/private)
- Status (draft/ready/published/archived)

**Place (Canonical):**
- Google Places data (address, photos, hours, types)
- AI-generated content (tagline, SceneSense output, tips, pull quotes)
- Enrichment timestamps

**MapPlace (Junction):**
- Links Place to List (many-to-many)
- Curator-specific: descriptor, order, notes, photos per map

**Location (Legacy):**
- Original model (being phased out)
- Tied directly to List (1:many)
- Migrating to Place/MapPlace architecture

**ActivitySpot:**
- Skateparks, surf breaks
- Separate from food/drink places
- Layer-based display (SKATE | SURF)

---

## Key Workflows

### 1. Create Map
```
1. User creates List (title, description, organizing logic)
2. Add places via search or Google Place ID
3. Set order and curator descriptors per place
4. System creates MapPlace entries linking to canonical Place
5. Backfill Google Places data (photos, hours, address)
6. Generate AI content (taglines, SceneSense output, tips)
7. Preview in Field Notes template
8. Publish → status: PUBLISHED
```

### 2. View Public Map
```
1. User visits /map/[slug]
2. Fetch List by slug
3. Load MapPlaces (ordered, with curator descriptors)
4. Join to Places (with Google + AI enrichments)
5. Render Field Notes template:
   - Cover map with smart bounds
   - Scrollable place cards
   - Expandable full-screen map
```

### 3. Enrich Place Data
```
1. Place created with googlePlaceId
2. Backfill script (`npm run backfill:google`):
   - Fetch Google Places details
   - Update photos, address, hours, phone, types, priceLevel
   - Set placesDataCachedAt timestamp
3. Voice Engine script (`npm run enrich:voice`):
   - Generate tagline with pattern detection
   - Route language signals through SceneSense
   - Generate tips
   - Find/create pull quotes
4. Place now "enriched" and ready for beautiful display
```

---

## Admin & Maintenance

### Scripts (package.json)

**Data Enrichment:**
- `npm run backfill:google` - Fetch Google Places data
- `npm run enrich:voice` - Generate AI content
- `npm run test:voice-engine` - Test tagline generation

**Data Analysis:**
- `npm run analyze:coverage` - Check enrichment status
- `npm run diagnose:photos` - Investigate missing photos
- `npm run list:needs-photos` - Find places needing photo backfill

**Data Cleanup:**
- `npm run find:duplicates` - Detect duplicate places
- `npm run merge:duplicates` - Merge duplicate records

### Key Algorithms

**Smart Bounds (IQR Outlier Detection):**
```typescript
// Calculate distance from center for each place
const centerLat = avg(places.map(p => p.lat))
const centerLng = avg(places.map(p => p.lng))
const distances = places.map(p => distanceFrom(p, center))

// Find outliers using IQR
const q1 = quantile(distances, 0.25)
const q3 = quantile(distances, 0.75)
const iqr = q3 - q1
const upperFence = q3 + multiplier * iqr

// Filter to included (non-outlier) places
const included = places.filter(p => p.distance <= upperFence)

// Fit bounds to included only
map.fitBounds(boundsOf(included))
```

**Centroid Calculation:**
```typescript
const centroid = {
  lat: places.reduce((sum, p) => sum + p.lat, 0) / places.length,
  lng: places.reduce((sum, p) => sum + p.lng, 0) / places.length
}
map.panTo(centroid)
```

---

## Design System

### Field Notes Palette

**Light Theme:**
- **Charcoal:** `#36454F` (text, pins)
- **Parchment:** `#F5F0E1` (background, pin borders)
- **Khaki:** `#C3B091` (accents, labels)
- **Landscape:** `#e8e2d4` (map background)
- **Water:** `#c9d9e0` (soft blue-grey)
- **Roads:** `#9aabb5` (highways), `#c4ced3` (arterials)
- **Parks:** `#e2e5dc` (barely-there sage)

**Typography:**
- **Serif:** Libre Baskerville (headings, place names, labels)
- **Sans:** System font stack (body text, metadata)

**Map Styling:**
- Hydrology-inspired aesthetic
- Cool gray-blue roads
- Muted, desaturated look (saturation: -25)
- No POI labels
- Subtle neighborhood labels
- Hidden local roads

---

## Current Architecture Decisions

### Why Place + MapPlace?
**Problem:** Original `Location` model tied places directly to lists (1:many)
**Issue:** Same restaurant appears on multiple lists → duplicated data, inconsistent enrichment

**Solution:** Canonical `Place` entity + `MapPlace` junction table
**Benefits:**
- Place enrichment happens once
- Same place on multiple maps
- Curator context (descriptor, order) separated from canonical data
- Better data consistency

### Why Smart Bounds?
**Problem:** Geographic outliers (one place 10 miles away) force map to zoom out, making main cluster tiny
**Solution:** IQR-based outlier detection
**Result:** Tight zoom on core cluster, outliers still render but outside initial view

### Why Marker Clustering (Expanded Only)?
**Cover Map:** Visual overview showing distribution → no clustering
**Expanded Map:** Interactive navigation → clustering prevents label soup at zoom-out

---

## Future Considerations

### Location → Place Migration
- Migrate remaining `Location` records to `Place`/`MapPlace`
- Update all queries to use new schema
- Deprecate `Location` model

### Additional Templates
- Current: Field Notes (magazine-style)
- Future: Grid view, minimalist, interactive story

### Voice Engine Enhancements
- Pattern detection improvements
- Multi-language support
- Curator tone customization

### Performance
- Implement Redis caching for frequently accessed maps
- Optimize Google Places API calls (batch, rate limiting)
- Image optimization (CDN, WebP, responsive)

---

## SAIKO-README

| Field | Value |
|-------|-------|
| **Type** | overview |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/README.md` |
| **Last Updated** | 2026-03-10 |

# Saiko Maps

**Create something worth giving to someone else.**

Saiko Maps is a lightweight creative tool for making cool, personal maps — fast. Curated templates that are more visual, playful, and expressive than traditional mapping tools. Built for people who care about aesthetics but don't want to spend hours designing.

---

## What It Is

A location-sharing app where every map looks like it belongs in a magazine, not a spreadsheet. Users pick a template, drop their favorite spots, add a personal take, and share it. The result is an editorial-style map experience — think Eater guides meets personal travel journals.

Maps live at shareable URLs. Each place gets its own merchant profile page with photos, hours, editorial context, and curator notes. Share cards let users push maps to Instagram Stories, feeds, and messages with template-matched visuals.

## Who It's For

90s kids who want to share places they love — travel memories, local recommendations, personal guides. The friend who always knows the spot.

---

## Templates

Four aesthetic-first templates, each with its own personality, color palette, typography, and share card design.

| Template | Tone | Font | Vibe |
|---|---|---|---|
| **Postcard** | Warm, nostalgic | Nunito | Polaroid vacation snapshots, golden hour, faded coral |
| **Neon** | Bold, nightlife | Bebas Neue | Drive poster energy, Tokyo signage, 2am underground |
| **Field Notes** | Minimal, editorial | Libre Baskerville | Well-kept travel journal, worn leather, quiet confidence |
| **Zine** | DIY, irreverent | Special Elite | Cut-and-paste, punk flyers, record shop staples |

*All template fonts are free via Google Fonts.*

---

## Brand

### Palette

Brand colors used for app chrome and marketing:

| Color | Hex |
|---|---|
| Red | `#D64541` |
| Light Blue | `#89B4C4` |

*Each template carries its own palette — see the Brand Bible for full color specs.*

### Logo

Square divided diagonally with two mirrored circles. Inspired by nautical signal flags — vintage, handmade quality without being literal about maps.

### Voice

Knowledgeable, casual, warm, minimal. Knows what it's talking about, doesn't over-explain, feels like a friend who has good taste. Be direct. Sound like a person, not a brand. Make it feel easy.

---

## Key Surfaces

### Map View

Split-view layout — location cards on the left, interactive map on the right (desktop). Mobile-first toggle between list and map. Template-specific styling applies to pins, cards, popups, and covers.

### Merchant Profile (`/place/[slug]`)

Individual place pages with a three-tier data hierarchy:

- **Tier 1 — Identity + Action:** Hero photo, name, meta row, action trio (Call · Instagram · Directions), photo gallery
- **Tier 2 — Editorial + Context:** Curator's note, coverage quotes, hours
- **Tier 3 — Reference + Discovery:** Styled map tile, coverage links, "Also On" cross-references

*Data degrades gracefully — if a tier has no data, the space collapses. See Merchant Data Hierarchy for the full spec.*

### Share Cards

Optimized for social sharing. The share is a teaser, not the whole map — tapping opens the full map link.

| Format | Ratio | Use |
|---|---|---|
| **Stories (Primary)** | 9:16 | IG Stories, TikTok, Reels |
| **Feed (Secondary)** | 1:1 | IG Feed, Twitter, iMessage |

*Each template has its own share card design — Postcard looks like a vintage postcard, Field Notes like a torn journal page, etc.*

---

## Design Reference Files

| File | What It Contains |
|---|---|
| `saiko-brand-bible-v3.docx` | Full brand guide — palettes, typography, voice, templates, share card specs |
| `saiko-merchant-data-hierarchy.md` | Locked data hierarchy for merchant profiles and all place-data surfaces |
| `cover-concepts.html` | V1 cover card explorations (Field Notes template) |
| `cover-concepts-v2.html` | V2 covers — typography + vitals, bento grid, blueprint constellation, surf map |
| `pin-popup-concepts.html` | V1 pin popup explorations — journal entry, bento card, minimal pill, blueprint |
| `pin-popup-concepts-v2.html` | V2 popups — refined bento + pill, labeled pin style explorations |
| `field-notes-final-concept.html` | Final interactive concept — stacked label pins + bento card popup, light/dark |

---

## Design Principles

- **Aesthetic-first templates** — each template is a complete visual system, not a skin
- **The data tells the story, not the template** — blocks earn their space; sparse pages degrade gracefully
- **Minimal info, maximum personality** — every surface shows only what it needs to
- **Every surface is a subset of the same hierarchy** — map popup, list card, merchant profile, and share card all pull from the same tiered data model, never inverted
- **Lo-fi over high-gloss** — grain, texture, candid moments; imperfection adds character
- **The share is a teaser, not the whole thing** — social cards drive curiosity, not completeness

---

## Development

Built with Cursor AI as the primary development tool, with Claude providing structured specifications and troubleshooting guidance. Session-based authentication with database foreign key relationships for user management.

**All PRs must follow `/docs/PR_TEMPLATE.md`.**

### Password recovery

Forgot-password flow uses Resend for email. Set in `.env.local`:

- `RESEND_API_KEY` — from [Resend](https://resend.com)
- `RESEND_FROM_EMAIL` — sender address (e.g. `Saiko Maps <noreply@yourdomain.com>`)
- `NEXT_PUBLIC_APP_URL` — base URL for reset links (e.g. `https://app.example.com`)

Without `RESEND_API_KEY`, the app still returns success but does not send email (useful for local dev).

---

## Authentication Architecture

### Auth System
- **Provider:** NextAuth v4 with Credentials provider
- **Strategy:** JWT sessions (30-day expiration)
- **Password Hashing:** bcryptjs

### Auth Guards (Centralized)

All authentication logic is centralized in `lib/auth/guards.ts`:

```typescript
import { requireUserId, requireAdmin, requireOwnership } from '@/lib/auth/guards'

// Require any authenticated user
export async function POST(req: NextRequest) {
  const userId = await requireUserId() // Throws 401 if not authed
}

// Require admin user
export async function POST(req: NextRequest) {
  const userId = await requireAdmin() // Throws 403 if not admin
}

// Require resource ownership
export async function PATCH(req: NextRequest) {
  const userId = await requireUserId()
  const resource = await db.findUnique(...)
  await requireOwnership(resource.userId) // Throws 403 if not owner
}
```

### Environment Variables

Required for authentication:
```bash
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

### Admin Access

Admin users are determined by email address in `ADMIN_EMAILS` environment variable.

Protected routes:
- `/admin/*` - Admin panel
- `/api/admin/*` - Admin API endpoints

### Rate Limiting (Upstash)

AI and other sensitive endpoints use Upstash Redis for rate limiting. Set in `.env.local`:

```bash
UPSTASH_REDIS_REST_URL=<your-upstash-url>
UPSTASH_REDIS_REST_TOKEN=<your-upstash-token>
```

Without these, development allows requests with a warning; production fails closed.

---

## Public Routes

### Coverage Metrics
- `GET /coverage` - View geographic coverage and data quality metrics
- Public access (no authentication required)
- Moved from `/admin/coverage` in v1.2.0

---

**Saiko Maps · 2026**

---

## OS-OFFERING-SIGNALS-V1

| Field | Value |
|-------|-------|
| **Type** | domain-spec |
| **Status** | active |
| **Project** | TRACES |
| **Path** | `docs/offering-signals/offering-signals-v1.md` |
| **Last Updated** | 2026-03-10 |
| **Systems** | offering-signals, traces |

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

## 3. Three-Layer Model

### Food Signals
Facts about what a place serves and how it cooks: cuisine posture, cooking method, dish and ingredient focus, menu format, meal focus.

### Beverage Signals
Facts about the drinks program: wine depth and style, cocktail program type, beer selection, non-alcoholic options.

### Service Signals
Facts about how a place operates for guests: reservation model, walk-in policy, seating format, pacing, and sharing style.

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

---

## SS-DISPLAY-CONTRACT-V2

| Field | Value |
|-------|-------|
| **Type** | domain-spec |
| **Status** | active |
| **Project** | TRACES |
| **Path** | `docs/scenesense/display-contract-v2.md` |
| **Last Updated** | 2026-03-12 |
| **Summary** | Display contract for the revised SceneSense three-lens model (Atmosphere / Energy / Scene). Supersedes SS-DISPLAY-CONTRACT-V1. |
| **Systems** | scenesense, traces |

# SceneSense Display Contract v2

**Supersedes:** SS-DISPLAY-CONTRACT-V1
**Framework:** SS-FW-001 (Three Universal Lenses)

---

## 1. Overview

SceneSense is the interpretation layer between raw signals and rendered UI copy. It assembles short, deterministic descriptor strings through three lenses: Atmosphere, Energy, and Scene.

**Data flow:**

```
identity_signals.language_signals
        ↓
  CanonicalSceneSense  (lib/scenesense/mappers.ts)
        ↓
  generateSceneSenseCopy  (lib/scenesense/voice-engine.ts)
        ↓
  lint pass  (lib/scenesense/lint.ts)
        ↓
  VoiceOutput  { atmosphere[], energy[], scene[] }
        ↓
  /api/places/[slug]  →  PlacePageSceneSense
        ↓
  SceneSenseCard / sidebar rendering
```

---

## 2. Output Shape

```typescript
type PlacePageSceneSense = {
  atmosphere: string[];
  energy: string[];
  scene: string[];
};
```

SceneSense is `null` when PRL < 3.

---

## 3. PRL Gate

| PRL | SceneSense | Mode | Max per surface |
|-----|-----------|------|-----------------|
| 1–2 | `null` | — | — |
| 3 | Active | LITE | 2 |
| 4 | Active | FULL | 4 |

---

## 4. Surface Contracts

### 4.1 Atmosphere

**Describes:** Physical and sensory environment of the space.

**Source signals:** `identity_signals.{noise, lighting, density, seating, tempo}`

| Token | Label |
|-------|-------|
| DIM | Dim |
| WARM | Warm-lit |
| BRIGHT | Bright |
| LOUD | Loud |
| CONVERSATIONAL | Conversational |
| QUIET | Quiet |
| TIGHT | Tight room |
| AIRY | Airy |
| PACKED | Packed |
| BAR_FORWARD | Bar-forward |
| PATIO_FRIENDLY | Patio-friendly |
| LINGER_FRIENDLY | Lingering-friendly |
| QUICK_TURN | Quick-turn tables |

**Confidence floor:** `confidence.atmosphere ≥ 0.45`

Atmosphere describes stable physical qualities. It does not include activity or social signals.

---

### 4.2 Energy

**Describes:** Activity level and temporal rhythm of the place.

**Source signals:** `identity_signals.language_signals` → energy character tokens; `energy.busy_windows`, `energy.time_variants`

| Token | Label |
|-------|-------|
| BUZZY | Buzzy |
| CHILL | Chill |
| LIVELY | Lively |
| LOW_KEY | Low-key |
| CALM | Calm |
| STEADY | Steady |
| ELECTRIC | Electric (FULL mode only) |

**Time variant output (FULL mode, `confidence.energy ≥ 0.65`):**
`{early} early evening · {late} late`

**Busy window output:**
- FULL mode + `confidence.energy ≥ 0.75` + numeric hours available → `Busiest: 7–9 PM`
- Otherwise → `Typically busiest in the evening`

**Confidence floor:** `confidence.energy ≥ 0.45`

**Confidence defaults:**
- With language signals: `0.8`
- Without: `0.6`

---

### 4.3 Scene

**Describes:** Social patterns of use, formality, and social register.

**Source signals:** `identity_signals.{roles, context, formality, register}`

| Signal | Tokens → Labels |
|--------|----------------|
| Roles | `DATE_FRIENDLY` → Date-friendly, `AFTER_WORK` → After-work, `GROUP_FRIENDLY` → Group-friendly, `SOLO_FRIENDLY` → Solo-friendly |
| Context | `NEIGHBORHOOD_STAPLE` → Neighborhood staple, `DESTINATION_LEANING` → Destination-leaning |
| Formality | `CASUAL` → Casual, `CASUAL_REFINED` → Casual-refined, `REFINED` → Refined |
| Register | `RELAXED` → Relaxed, `POLISHED` → Polished, `UNPRETENTIOUS` → Unpretentious |

**LITE fallback:** If < 2 items, append `Easy repeat spot`.

**Confidence floor:** `confidence.scene ≥ 0.45`

**Confidence defaults:**
- With signature dishes: `0.7`
- Without: `0.5`

---

## 5. Signal Ownership

Service model (`FULL_SERVICE`, `COUNTER_SERVICE`, `BAR_SERVICE`) belongs to **Programs**, not SceneSense. It is not rendered in any SceneSense surface.

Price tier (`$`, `$$`, `$$$`, `$$$$`) belongs to **Programs**. It may inform SceneSense interpretation (e.g., `$$$$` increases probability of `Refined`) but the descriptor belongs to Scene.

---

## 6. Lint Rules

| Code | Description |
|------|-------------|
| A1_PRL_LT_3 | SceneSense dropped — PRL < 3 |
| A1_PRL3_NOT_LITE | PRL 3 must use LITE mode |
| A2_CAP_EXCEEDED | Surface capped to maxPerSurface |
| A4_TAG_CLOUD_COMMAS | Comma-heavy string triggers REGENERATE |
| B1_BANNED_WORD | Banned vocabulary (locals, tourist, best, worst, always, never, ...) |
| B2_POPULAR_TIMES | "popular times" phrase removed |
| B3_EXCLUSIONARY | Exclusionary language removed |
| C1_NUMERIC_TIME_NOT_ALLOWED | Numeric time in energy without FULL + high confidence |
| C1_NUMERIC_TIME_NON_ENERGY | Numeric time in atmosphere or scene |
| C2_BUSY_NON_ATMOSPHERE | Busy/peak language in energy or scene |
| D2_LITE_TOO_STRONG | LITE mode: buzziest/peak/settles after removed from energy |
| E1_DUP_EXACT | Exact duplicate across surfaces |

---

## 7. Confidence Defaults

| Surface | Default | With strong signal |
|---------|---------|-------------------|
| `atmosphere` | 0.6 | 0.6 (physical signals not yet flowing) |
| `energy` | 0.6 | 0.8 (when language_signals present) |
| `scene` | 0.5 | 0.7 (when signature_dishes present) |

---

## 8. UI Rendering Obligations

The UI must:
- Render only surfaces with at least one statement (empty arrays = no render)
- Maintain surface order: Atmosphere → Energy → Scene
- Render label strings as: `ATMOSPHERE`, `ENERGY`, `SCENE`
- Null-guard: if `scenesense === null`, render nothing
- Not fall back to raw `identity_signals`

---

## 9. Changes from v1

| Item | v1 | v2 |
|------|----|----|
| Three surfaces | Atmosphere / Ambiance / Scene | Atmosphere / Energy / Scene |
| Energy tokens | Rendered in Atmosphere | Rendered in Energy |
| Formality | Rendered in Ambiance | Rendered in Scene |
| Social register (Relaxed/Polished/Unpretentious) | Rendered in Ambiance | Rendered in Scene |
| Service model | Rendered in Ambiance | Dropped (Programs, not SceneSense) |
| Atmosphere confidence boost | 0.8 when language_signals present | 0.6 flat (energy tokens moved out) |
| Energy confidence | 0.6 flat | 0.8 when language_signals present |

---

## SS-FW-001

| Field | Value |
|-------|-------|
| **Type** | domain-spec |
| **Status** | active |
| **Project** | TRACES |
| **Path** | `docs/scenesense/three-lenses-framework-v1.md` |
| **Last Updated** | 2026-03-12 |
| **Summary** | Defines the three universal lenses (Atmosphere, Energy, Scene) used by SceneSense to interpret restaurant environments. |
| **Systems** | scenesense, traces |

# Three Universal Lenses Framework

## Purpose

Define the universal interpretation framework used by SceneSense to describe how places are experienced.

SceneSense interprets restaurant environments through three lenses:

- Atmosphere
- Energy
- Scene

Each lens describes a different dimension of guest experience.

---

## Core Model

Dining environments contain three universal components:

| Component | Lens |
|-----------|------|
| Place | Atmosphere |
| Activity | Energy |
| People | Scene |

This mapping forms the conceptual foundation of SceneSense.

---

## Lens Roles

**Atmosphere** describes the physical and sensory qualities of the space.

**Energy** describes the activity level and temporal rhythm within the space.

**Scene** describes the social patterns of use and behavioral expectations.

---

## System Boundary

Restaurant information in Saiko exists in two layers.

### Programs (House Perspective)

Programs describe what the restaurant offers and operates.

Examples:

- food program
- beverage program
- service model
- price tier

Programs describe operations.

### SceneSense (Guest Perspective)

SceneSense interprets how the place is experienced once guests are present.

It does not describe offerings or operations.

Instead it interprets:

- environment
- activity
- social use

---

## Signal Ownership

### Programs

| Signal | Examples |
|--------|----------|
| food_program | wood-fired cooking, sushi counter |
| beverage_program | natural wine list, craft cocktails |
| service_model | full-service, counter-service, bar-service |
| price_tier | $, $$, $$$, $$$$ |

Programs describe what the restaurant operates and sells.

### SceneSense

**Atmosphere** (environmental signals):

- lighting
- noise
- density
- spatial layout
- seating style
- material feel

**Energy** (activity signals):

- crowd intensity
- movement
- tempo
- busy windows
- daypart activity

**Scene** (social signals):

- dining posture
- group patterns
- social role
- formality
- social register

---

## Programs Influence SceneSense

Programs are not SceneSense. But program signals can inform interpretation.

Example: `price_tier = $$$$` may increase the probability of descriptors like `formal dining` or `special-occasion dining`. But the descriptor belongs to Scene, not Programs.

Programs describe the restaurant's operating model. SceneSense describes how the space behaves socially once guests arrive.

---

## Observational Principle

SceneSense descriptors must describe observable conditions.

Descriptors avoid:

- opinions
- recommendations
- marketing language

Correct:

- dim room
- lively evenings
- group dining

Incorrect:

- amazing
- trendy
- must-try

---

## Cultural Neutrality

Descriptors must function across global dining contexts.

The SceneSense vocabulary avoids culturally specific constructs.

Neutral:

- group dining
- late-night crowd
- neighborhood crowd

Contextual interpretations may exist at the local interpretation layer, but the signal vocabulary remains universal.

---

## Ambiance Deprecation

Earlier SceneSense versions included an Ambiance surface that mixed signals from three conceptual domains: environmental perception, service posture, and social expectations.

To resolve this ambiguity, the model was revised. Signals previously associated with Ambiance are redistributed:

| Signal | New Owner |
|--------|-----------|
| physical comfort (material feel, spatial warmth) | Atmosphere |
| social register (relaxed, polished, unpretentious) | Scene |
| formality | Scene |
| activity tokens | Energy |
| service model | Programs |

The display contract (SS-DISPLAY-CONTRACT-V1) currently specifies the prior three-surface model (Atmosphere / Ambiance / Scene). A v2 display contract aligned to this framework will be produced as a follow-up when the code migration is implemented.

---

## SS-FW-002

| Field | Value |
|-------|-------|
| **Type** | domain-spec |
| **Status** | active |
| **Project** | TRACES |
| **Path** | `docs/scenesense/atmosphere-lens-v1.md` |
| **Last Updated** | 2026-03-12 |
| **Summary** | Defines the Atmosphere lens — physical and sensory environment of the dining space. |
| **Systems** | scenesense, traces |

# Atmosphere Lens

## Definition

Atmosphere describes the physical and sensory environment of a place.

It answers:

> What does the space feel like?

Atmosphere describes the environment independently of crowd activity.

---

## Observable Dimensions

Atmosphere signals include:

- lighting
- noise environment
- spatial scale
- seating density
- seating layout
- environmental comfort (material feel, spatial warmth)
- indoor / outdoor conditions

---

## Example Descriptors

- dim room
- bright room
- tight dining room
- airy space
- warm-lit room
- cozy seating

---

## Interpretation Boundary

Atmosphere describes the space itself.

Atmosphere does not interpret:

- crowd activity
- social patterns
- dining roles

Those belong to Energy and Scene.

---

## Stability

Atmosphere descriptors tend to be relatively stable.

A place that is a dim room is usually dim regardless of who is present.

---

## SS-FW-003

| Field | Value |
|-------|-------|
| **Type** | domain-spec |
| **Status** | active |
| **Project** | TRACES |
| **Path** | `docs/scenesense/energy-lens-v1.md` |
| **Last Updated** | 2026-03-12 |
| **Summary** | Defines the Energy lens — activity level and temporal rhythm of the place. |
| **Systems** | scenesense, traces |

# Energy Lens

## Definition

Energy describes the activity level and rhythm of the place over time.

It answers:

> How active is the place, and when?

---

## Observable Dimensions

Energy signals include:

- crowd intensity
- movement levels
- service tempo
- busy windows
- daypart activity shifts

---

## Example Descriptors

- low-key
- steady flow
- lively evenings
- busy late night
- quiet lunch

---

## Interpretation Boundary

Energy describes activity occurring within the space.

Energy does not describe:

- room structure
- seating layout
- lighting conditions

Those belong to Atmosphere.

---

## Temporal Nature

Energy descriptors may vary by time.

Examples:

- low-key afternoons
- lively evenings
- busy weekends

---

## SS-FW-004

| Field | Value |
|-------|-------|
| **Type** | domain-spec |
| **Status** | active |
| **Project** | TRACES |
| **Path** | `docs/scenesense/scene-lens-v1.md` |
| **Last Updated** | 2026-03-12 |
| **Summary** | Defines the Scene lens — social patterns of use and behavioral expectations. |
| **Systems** | scenesense, traces |

# Scene Lens

## Definition

Scene describes the social patterns of use within a place.

It answers:

> Who gathers here and how is the place used socially?

---

## Observable Dimensions

Scene signals include:

- group size patterns
- social roles
- dining occasions
- behavioral expectations
- formality
- social register

---

## Example Descriptors

- neighborhood crowd
- group dining
- solo dining
- special-occasion dining
- destination dining

---

## Formality

Formality describes the behavioral expectations of the space.

Examples:

- casual dining
- refined dining

Formality reflects guest posture and behavior rather than room design.

---

## Social Register

Social register describes the tonal quality of the social environment.

Examples:

- relaxed dining
- polished dining
- unpretentious dining

These signals were previously part of the Ambiance surface. They belong to Scene because they describe social behavior and expectations, not physical space.

---

## Distinction from Programs

Programs describe what the restaurant operates.

Examples:

- tasting menu
- counter service
- natural wine list

Scene describes how guests use the place.

Examples:

- group dining
- special-occasion dining
- refined dining

---

## SS-GLO-001

| Field | Value |
|-------|-------|
| **Type** | domain-spec |
| **Status** | active |
| **Project** | TRACES |
| **Path** | `docs/scenesense/glossary-v1.md` |
| **Last Updated** | 2026-03-12 |
| **Summary** | Canonical glossary of SceneSense terminology for engineers, editors, and models. |
| **Systems** | scenesense, traces |

# SceneSense Glossary of Terms

## Core System Terms

### SceneSense

SceneSense is the interpretation layer that synthesizes signals about how a place feels and functions socially. It converts structured signals and editorial inputs into short observational descriptors that describe the lived experience of a place.

SceneSense describes guest experience, not restaurant operations.

### Lens

A lens is a conceptual dimension used to interpret a place. Each lens describes a distinct aspect of guest experience.

SceneSense uses three universal lenses:

- Atmosphere
- Energy
- Scene

Each lens produces a small set of descriptors describing that dimension.

### Descriptor

A descriptor is a short observational phrase produced by SceneSense to describe a place through a specific lens.

Descriptors must be:

- observational
- culturally neutral
- globally applicable
- non-evaluative

Example descriptors:

- dim room
- lively evenings
- neighborhood crowd

Descriptors are the smallest unit of SceneSense output.

### Surface

A surface is the user-facing representation of a SceneSense lens.

Example surfaces on a place page:

- Atmosphere surface
- Energy surface
- Scene surface

Each surface renders descriptors generated by the SceneSense engine.

### Signal

A signal is a piece of structured information that contributes to SceneSense interpretation.

Signals may originate from:

- identity signals
- language signals
- photos
- hours patterns
- editorial notes
- spatial metadata

Signals are interpreted by the SceneSense engine but are not shown directly to users.

### Interpretation

Interpretation is the process of translating signals into observational descriptors.

Interpretation differs from data extraction. SceneSense does not simply display data — it interprets signals into experiential meaning.

### Confidence

Confidence represents the reliability of SceneSense interpretation for a given place.

Confidence may be computed globally or per lens.

Higher confidence indicates that sufficient signals exist to support stable interpretation.

---

## Architectural Terms

### Programs

Programs describe what a restaurant offers and operates. Programs belong to the house perspective of the establishment.

Examples:

- food program
- beverage program
- service model
- price tier

Programs are not part of SceneSense.

### Price Tier

Price tier represents restaurant economics, not guest experience.

Examples: $, $$, $$$, $$$$

Price tier belongs to Programs. It may inform SceneSense interpretation (e.g., `$$$$` may increase probability of `formal dining`) but the resulting descriptor belongs to Scene, not Programs.

### SceneSense Layer

The SceneSense layer describes how a place is experienced by guests once the establishment is operating.

SceneSense interprets social and spatial patterns rather than describing offerings.

### House Language

House language refers to the vocabulary used by restaurant professionals to describe the establishment's concept, programs, and operations.

Examples:

- tasting menu
- natural wine list
- counter service

This language belongs to Programs.

### Guest Language

Guest language describes how people experience the space once it is in use.

SceneSense uses guest language.

Examples:

- warm-lit room
- lively evenings
- after-work crowd

---

## The Three SceneSense Lenses

### Atmosphere

Atmosphere describes the physical and sensory environment of the dining space.

It answers: What does the room feel like?

Atmosphere captures environmental qualities that remain stable regardless of who is present.

Examples:

- dim room
- bright room
- tight dining room
- airy space
- cozy seating

Atmosphere describes place.

### Energy

Energy describes the level and rhythm of activity within the space.

It answers: How active is the room and when?

Energy often varies by time of day or day of week.

Examples:

- low-key
- steady flow
- lively evenings
- busy late night

Energy describes activity.

### Scene

Scene describes the social patterns of use within the place.

It answers: Who gathers here and for what purpose?

Scene reflects the recurring role a place plays within its local dining ecosystem.

Examples:

- neighborhood crowd
- group dining
- solo dining
- special-occasion dining
- destination dining

Scene describes people patterns.

### Social Register

Social register describes the tonal quality of the social environment. It captures behavioral posture rather than physical space.

Examples:

- relaxed dining
- polished dining
- unpretentious dining

Social register belongs to the Scene lens. These signals were previously part of the deprecated Ambiance surface.

### Formality

Formality describes the behavioral expectations of the space. It reflects guest posture and behavior rather than room design.

Examples:

- casual dining
- refined dining

Formality belongs to the Scene lens.

---

## Deprecated Terms

### Ambiance

Ambiance was a surface in earlier SceneSense versions that mixed environmental, service, and social signals. It has been deprecated.

Signals previously associated with Ambiance are redistributed:

| Signal | New Owner |
|--------|-----------|
| physical comfort | Atmosphere |
| social register (relaxed, polished, unpretentious) | Scene |
| formality | Scene |
| activity tokens | Energy |
| service model | Programs |

See SS-FW-001 (Three Universal Lenses Framework) for the full rationale.

---

## Interpretation Principles

### Observability

SceneSense descriptors must describe observable conditions or behaviors. Descriptors must avoid subjective judgments.

Valid: dim room, busy evenings, group dining

Invalid: amazing, trendy, romantic

### Cultural Neutrality

Descriptors must be globally applicable and not rely on specific cultural norms.

Neutral: group dining, late-night crowd

Culturally specific: date-night spot, girls night out

Local interpretation may exist in separate layers, but SceneSense signals remain universal.

### Non-Evaluative Language

SceneSense does not provide ratings, opinions, or recommendations. Descriptors describe conditions rather than judging quality.

Example: loud room, busy evenings

These statements describe experience without implying positive or negative value.

---

## VOICE-SAIKO-VOICE-LAYER

| Field | Value |
|-------|-------|
| **Type** | domain-spec |
| **Status** | active |
| **Project** | TRACES |
| **Path** | `docs/voice/saiko-voice-layer.md` |
| **Last Updated** | 2026-03-10 |
| **Systems** | voice-engine, traces |

# SAI-DOC-VOICE-001 — Saiko Voice Layer

**Document ID:** SAI-DOC-VOICE-001
**Title:** Saiko Voice Layer
**System:** TRACES
**Layer:** Product Interpretation / Rendering
**Status:** Active
**Owner:** Saiko
**Purpose:** Translate structured signals into editorial natural language.

---

## 1. Overview

The Saiko Voice Layer converts structured data signals from Fields into short editorial sentences used in the TRACES interface.

It allows the interface to read like a field guide, not a database.

Instead of exposing taxonomy fields directly to users, the system renders concise phrases that describe the place's identity and current energy.

**Example output:**

```
Culver City restaurant
Open now — lively room
```

The system performs signal → language translation, not data generation.

---

## 2. System Boundary

The Voice Layer belongs to the TRACES product layer, not the Fields data layer.

**Architecture:**

```
Fields (structured signals)
      ↓
SceneSense (Atmosphere / Ambiance / Scene)
      ↓
TRACES Voice Layer
      ↓
UI Sentences
```

Fields stores the raw language signals.
SceneSense interprets and routes them to the correct lens.
TRACES renders those signals into editorial language.

---

## 3. Inputs (Signals)

The Voice Layer consumes signals already returned by the API — it never reads raw `identity_signals` directly.

| Signal | Field | Example |
|---|---|---|
| Category | `primary_vertical` | `restaurant` |
| Neighborhood | `neighborhood` | `Culver City` |
| Open State | derived from `hours` | `Open now` |
| Energy Phrase | `scenesense.atmosphere[0]` | `Lively` |

The energy phrase comes from `scenesense.atmosphere` — the first item in the atmosphere surface, which may be an energy label (Lively, Chill, etc.) or a physical room label (Warm-lit, Quiet, etc.).

---

## 4. Phrase Mapping

SceneSense atmosphere labels are converted into editorial fragments through a lookup table.

**ATMOSPHERE_PHRASES**

| SceneSense label | Phrase |
|---|---|
| Lively | lively room |
| Buzzy | buzzy room |
| Chill | laid-back feel |
| Low-key | low-key feel |
| Calm | calm atmosphere |
| Steady | steady energy |
| Electric | electric energy |
| Warm-lit | warm-lit room |
| Conversational | conversational room |
| Quiet | quiet room |

Labels not in the table are rendered lowercased. The system never invents signals.

---

## 5. Rendering Logic

The identity block contains two lines.

### Line 1 — Identity

```
{neighborhood} {category}
```

Example: `Culver City restaurant`

**Rules**
- Lowercase category
- Join with space
- Omit line if both values are missing

### Line 2 — Signals Sentence

```
{open_state} — {energy_phrase}
```

Example: `Open now — lively room`

**Construction**
- `open_state` derived from hours parsing (`openNowExplicit` must be true)
- `energy_phrase` sourced from `scenesense.atmosphere[0]`, mapped through ATMOSPHERE_PHRASES
- Separator rules:

| open_state | energy_phrase | Result |
|---|---|---|
| present | present | `Open now — lively room` |
| absent | present | `lively room` |
| present | absent | `Open now` |
| absent | absent | line omitted |

---

## 6. Guardrails

| Constraint | Rule |
|---|---|
| No signal invention | Only signals already present may be rendered |
| Deterministic output | Same signals always produce the same sentence |
| Short sentences | Identity block must remain glance-readable |
| Dynamic signals distinct | Open/Closed indicators use `<em>` styling |
| No raw signal reads | Voice Layer never reads `identity_signals` directly |

---

## 7. Implementation

Voice logic lives in a dedicated module:

```
lib/voice/saiko.ts
```

**Primary export:**

```typescript
renderIdentityBlock(signals: VoiceSignals): {
  subline: string | null;
  sentence: string | null;
}
```

**Helper functions:**

```typescript
renderLocation(signals: VoiceSignals): string | null
renderEnergy(atmosphere: string[]): string | null   // consumes scenesense.atmosphere
```

**Input type:**

```typescript
interface VoiceSignals {
  neighborhood: string | null | undefined;
  category: string | null | undefined;
  // atmosphere sourced from scenesense.atmosphere (SceneSense output)
  atmosphere?: string[] | null | undefined;
}
```

---

## 8. Architectural Principles

| Principle | Meaning |
|---|---|
| Pure | signals → language, no side effects |
| Stateless | no database writes |
| Deterministic | same input always produces same output |
| Cacheable | rendered text can be cached but never stored as canonical data |

---

## 9. Layer Responsibilities

| Layer | Stores | Does not store |
|---|---|---|
| Fields | Structured signals, authored content, provenance | Rendered text, presentation logic |
| SceneSense | Interpretation logic, lens routing | Raw signal data, rendered text |
| TRACES | Phrase maps, render logic, cached output | Raw signal data |

Fields never stores rendered text.
SceneSense never stores signals — it interprets them.
TRACES never stores signal data.

---

## 10. Future Capabilities

| Expansion | Description |
|---|---|
| Time-aware phrasing | "Open tonight", "Opens at 5pm", "Closed Mondays" |
| Multi-lens rendering | Voice layer may pull from ambiance or scene for richer sentences |
| Neighborhood context | "Heart of Silver Lake", "Quiet corner of Culver City" |
| Vertical-specific voice | Coffee shops, hotels, parks, restaurants |
| Voice tuning | Editorial tone variations per context |

---

## Registry Metadata

| Field | Value |
|-------|-------|
| Registry generated | 2026-03-12T18:08:20.327Z |
| Context generated | 2026-03-12T18:08:20.609Z |
| Docs included | 50 |
| Docs missing on disk | 0 |
| Filters applied | status=active |
