# Saiko — Context Snapshot

> Generated: 2026-03-18T00:17:57.110Z
> Source: docs/registry.json (2026-03-17T00:45:00.000Z)
> Documents: 80 included / 86 total
> Filters: status=active

---

This file is generated. Do not edit it directly.
To regenerate: `npm run docs:context`

## Table of Contents

**FIELDS**
- [FIELDS-ENTITY-AWARENESS-STAGE-V1](#fields-entity-awareness-stage-v1) — Awareness Stage — Workbench: Defines the Awareness stage — Saiko's pre-identity, pre-enrichment intake layer. Covers source abstraction, organization responsibilities, readiness signals, and the workbench model.
- [FIELDS-ENTITY-PIPELINE-OVERVIEW-V1](#fields-entity-pipeline-overview-v1) — Entity Pipeline — Overview: High-level model of the stages through which an entity moves inside Saiko — from first contact (Awareness) through Identification to Enrichment. Mental model only; does not prescribe UI, schema, or workflow.
- [PIPE-CAPTURE-PROFILES-V1](#pipe-capture-profiles-v1) — (untitled): Defines capture profiles for each source type — what to attempt when a source is touched, and what can be promoted to Facts-tier vs stored as raw material.
- [FIELDS-ENRICHMENT-OPS-INVENTORY-V1](#fields-enrichment-ops-inventory-v1) — Enrichment Operations Inventory: Canonical inventory of all enrichment operations available on an entity record — automated (Google Places, neighborhood lookup), semi-automated (GPID, Instagram, Photos), and human-only (editorial fields). Coverage Dashboard and Entity Profile are designed from this inventory outward.
**KNOWLEDGE-SYSTEM**
- [SKAI/DECISION-INDEX-SPEC-V1](#skai-decision-index-spec-v1) — Decision Index v1
- [SYS-BOOT-CONTEXT-INVENTORY](#sys-boot-context-inventory) — Boot Context Inventory
- [SYS-COVERAGE-DASHBOARD-DESIGN-V1](#sys-coverage-dashboard-design-v1) — Coverage Dashboard — Design Principles: Design principles for the Coverage Dashboard — work surface, not report; smart counts; group by solution; automation first
- [SYS-DRAFT-TRIGGER-V1](#sys-draft-trigger-v1) — Draft Trigger v1: Defines when reusable knowledge must become a controlled draft.
- [SYS-PROMOTION-FLOW-V1](#sys-promotion-flow-v1) — Promotion Flow v1: Defines the controlled path from approved draft to canonical document.
- [SYS-RESEARCH-FORMAT-V1](#sys-research-format-v1) — Research Document Format: Defines the standard format for research documents ingested into the Saiko knowledge base
- [SKAI/RESEARCH-AI-KNOWLEDGE-ARCHITECTURE-V1](#skai-research-ai-knowledge-architecture-v1) — AI-Native Knowledge & Data Architecture Patterns (2023–2026)
- [DEC-002](#dec-002) — DEC-002 — Repo-Based Canonical Knowledge Store: All canonical knowledge documents live in the repository under /docs, using markdown with structured frontmatter for both human readability and machine parsing.
**PLACE-PAGE**
- [SKAI-DOC-TRACES-PLACE-PAGE-DESIGN-001](#skai-doc-traces-place-page-design-001) — Place Page Design v1: Canonical design spec for the Saiko place profile page — wireframe, data sources, content model, and rendering rules.
**SAIKO**
- [ARCH-AI-OPERATING-LAYER](#arch-ai-operating-layer) — AI OPERATING LAYER
- [ARCH-COVERAGE-OPS-DASHBOARD-V1](#arch-coverage-ops-dashboard-v1) — Coverage Ops Dashboard v1: 4-tab coverage operations dashboard spec — Overview, Tier Health, Enrichment Tools, Neighborhoods. Replaces prior 6-tab layout.
- [ARCH-COVERAGE-TIERS-V1](#arch-coverage-tiers-v1) — Coverage Tiers — Entity Enrichment Model: Defines the coverage tier model for entity enrichment. Six tiers from raw identity through experiential interpretation, with enrichment strategy (merchant surfaces first, editorial sources second, human third), entity-type signal requirements, and scanner integration points.
- [ARCH-ENTITY-CLASSIFICATION-LAYERS-V1](#arch-entity-classification-layers-v1) — Entity Classification Layers: Plain-language explanation of entity classification layers in the current schema — entityType vs primary_vertical vs category vs cuisine_type — including operational authority and usage guidance.
- [ARCH-IDENTITY-SCORING-V1](#arch-identity-scoring-v1) — Identity Scoring — Weighted Anchor Model: Weighted anchor scoring model for entity identity confidence. GPID is not required — entities reach publication threshold through any combination of anchors that demonstrates sufficient identity certainty.
- [ARCH-SOCIAL-FIELDS-V1](#arch-social-fields-v1) — Social Fields — Entity-Level Specification: Specification for social media handle fields on entities (Instagram, TikTok). Covers storage format, discovery, validation, identity weight, and the sentinel value convention for confirmed-none.
- [ARCH-SYSTEM-CONTRACT](#arch-system-contract) — SYSTEM CONTRACT
- [ARCHITECTURE-INSTAGRAM-API-INTEGRATION-V1](#architecture-instagram-api-integration-v1) — Instagram API Integration — Current State: Instagram Graph API integration state — Meta app config, permissions, verified endpoints, architectural models for media ingestion
- [ARCHITECTURE-INSTAGRAM-IMPLEMENTATION-V1](#architecture-instagram-implementation-v1) — Instagram Integration — Implementation & Impact Doc: Instagram integration implementation plan and system impact — tables, sync rules, temporal signals, interpretation layer, photo strategy, attachment model. V0.2 adds current state assessment, implementation phases, and data review results.
- [ARCHITECTURE-INSTAGRAM-INGESTION-V1](#architecture-instagram-ingestion-v1) — Instagram Ingestion — Field Spec v1: Instagram ingestion schema — 3 tables, field definitions, sync rules. Engineering handoff for migration + Prisma models.
- [COVOPS-APPROACH-V1](#covops-approach-v1) — Coverage Operations — Architectural Position: Architectural position for Coverage Operations — introduces entity_issues as a unified operational layer over existing queue fragments, with tool readiness assessment and phased implementation plan.
- [ENRICH-STRATEGY-V1](#enrich-strategy-v1) — Entity Enrichment Strategy: Entity enrichment lifecycle (Intake→Identify→Enrich→Assess→Publish), phased execution (free before paid), evidence-vs-canonical architecture, editorial coverage pipeline, and hard rules for enrichment ordering.
- [FIELDS-ERA-OVERVIEW-V1](#fields-era-overview-v1) — Entity Record Awareness (ERA) — One-Pager: Defines Entity Record Awareness (ERA) — how Saiko becomes aware a place exists, separating awareness from canonical (Golden) status to prevent silent drift.
- [FIELDS-VERTICAL-TAXONOMY-V1](#fields-vertical-taxonomy-v1) — Saiko Vertical Taxonomy: Defines Saiko's 12-vertical taxonomy — the primary domains of urban life used to classify every place in the system. Documents anthropological rationale, system role, technical anchors, and design implications.
- [SAIKO-COVERAGE-DASHBOARD-DESIGN-V1](#saiko-coverage-dashboard-design-v1) — Coverage Dashboard — Design Principles: Design principles for the Coverage Dashboard — a work surface for resolving data gaps, organized by solution type (automated vs. semi-automated vs. human-only) rather than by missing field.
- [SAIKO-DEFERRED-MIGRATION-GATES](#saiko-deferred-migration-gates) — Deferred Migration Gates: Gate conditions that must be satisfied before applying the two deferred Fields v2 migrations — slim entities and legacy table drop.
- [SAIKO-ENTITIES-CONTRACT-RECONCILIATION](#saiko-entities-contract-reconciliation) — Entities Contract Reconciliation: Field-level audit and decision log for the entities table — what belongs, what migrates, and what is retired as part of the Fields v2 architecture.
- [SAIKO-FIELDS-V2-TARGET-ARCHITECTURE](#saiko-fields-v2-target-architecture) — Saiko Fields v2 — Target Architecture Spec: Defines the four-layer Fields v2 architecture — entities routing shell, canonical_entity_state, interpretation_cache, and place_coverage_status — with anti-drift rules and current migration status.
- [SAIKO-MERCHANT-DATA-HIERARCHY](#saiko-merchant-data-hierarchy) — Saiko Merchant Data Hierarchy
- [SAIKO-PLATFORM-DATA-LAYER](#saiko-platform-data-layer) — PLATFORM_DATA_LAYER.md
- [SAIKO-PROVENANCE-SYSTEM](#saiko-provenance-system) — Saiko Maps - Provenance System
- [SAIKO-RESOLVER-AND-PLACES-DATA-FLOW](#saiko-resolver-and-places-data-flow) — Resolver pipeline and golden_records → places data flow
- [SKAI-DOC-FIELDS-GLOSSARY-001](#skai-doc-fields-glossary-001) — Saiko Architecture Glossary: Canonical glossary of core Fields and TRACES architecture terms for shared system language.
- [SKAI-DOC-FIELDS-SYSTEM-MAP-001](#skai-doc-fields-system-map-001) — Fields System Map - Signals to Interpretation: Top-level architecture map for Fields-to-TRACES flow from observations to cultural interpretation.
- [FEAT-MARKETS-SPEC-V1-2](#feat-markets-spec-v1-2) — Markets Integration — SPEC v1.2
- [PIPE-INSTAGRAM-WORKSTREAM-V1](#pipe-instagram-workstream-v1) — Instagram Integration — Workstream & Execution Plan: Phased execution plan for Instagram integration — 6 phases from data quality through contextual display. Includes codebase readiness assessment, effort estimates, timing recommendations, and per-phase task checklists.
- [SAIKO-ENERGY-SCORE-SPEC](#saiko-energy-score-spec) — Energy Score — Specification (Locked)
- [SAIKO-ENTITY-PROFILE-SPEC-V1](#saiko-entity-profile-spec-v1) — Entity Profile Page — Spec: Spec for /admin/entity/[id] — the canonical single-entity admin view showing all field states with inline resolution actions and a TimeFOLD editorial slot.
- [SAIKO-FIELDS-V2-CUTOVER-SPEC](#saiko-fields-v2-cutover-spec) — Fields v2 — Cutover Spec
- [SAIKO-FORMALITY-SCORE-SPEC](#saiko-formality-score-spec) — Formality Score — Specification (Locked)
- [SYS-COVERAGE-OPS-ISSUE-CONTRACT-V1](#sys-coverage-ops-issue-contract-v1) — Coverage Ops Issue Contract (v1): Canonical issue contract for Coverage Ops v1 — issue types, severity, gating, and UI action mappings.
- [SAIKO-DATA-PIPELINE-QUICK-START](#saiko-data-pipeline-quick-start) — Data Pipeline — Quick Start: Quick-start guide for entity intake and enrichment. Start here if you have a list of place names to add.
- [SAIKO-DATABASE-SCHEMA](#saiko-database-schema) — Saiko Maps - Database Schema
- [SAIKO-DATABASE-SETUP](#saiko-database-setup) — Database Setup
- [SAIKO-ENV-TEMPLATE](#saiko-env-template) — Environment Variables
- [SAIKO-GOOGLE-PLACES-SETUP](#saiko-google-places-setup) — Google Places API — Unblock Legacy Text Search
- [SAIKO-PIPELINE-COMMANDS](#saiko-pipeline-commands) — Pipeline Commands
- [SAIKO-PROVENANCE-QUICK-REF](#saiko-provenance-quick-ref) — Provenance System - Quick Reference
- [SAIKO-SITEMAP](#saiko-sitemap) — Saiko Maps - Sitemap
- [ENRICH-PLAYBOOK-V1](#enrich-playbook-v1) — City Launch Enrichment Playbook: Reusable, sequenced playbook for enriching 1,000+ entities at city-launch scale. Tool inventory, fully-enriched benchmark, gap analysis, 7-phase execution sequence (free→paid), cost model (~$5-10 per 1K entities), monitoring, and new-city checklist.
- [OPS-STALE-DEPLOYMENTS](#ops-stale-deployments) — Debugging Stale Deployments & Local Updates
- [SAIKO-DATA-SYNC-RUNBOOK](#saiko-data-sync-runbook) — Data Sync Runbook
- [SAIKO-LOCAL-DEV](#saiko-local-dev) — Local Development
- [SAIKO-PROD-MIGRATION-OPERATOR-RUNBOOK](#saiko-prod-migration-operator-runbook) — Production Migration Operator Runbook
- [SAIKO-PROD-PLACE-FIX-RUNBOOK](#saiko-prod-place-fix-runbook) — Production Place Page Fix - Runbook
- [SAIKO-MIGRATION-GUIDE](#saiko-migration-guide) — Migration Guide: Places → Golden Records
- [SAIKO-MIGRATION-HISTORY-RECONCILIATION](#saiko-migration-history-reconciliation) — Migration History Reconciliation Analysis
- [ARCHITECTURE-FIELDS-INGESTION-PIPELINE-V1](#architecture-fields-ingestion-pipeline-v1) — (untitled)
- [SAIKO-ADMIN-SPRING-CLEANING-2026-03](#saiko-admin-spring-cleaning-2026-03) — Admin Spring Cleaning Log — March 2026: Record of admin routes and features retired or fixed in March 2026 — Review Queue, Energy Engine, Appearances auth, GPID Queue URL. Captures rationale for each retirement.
- [SAIKO-SAIKOAI-EXTRACTION-PROMPT-V2-1](#saiko-saikoai-extraction-prompt-v2-1) — SaikoAI Extraction Prompt — V2.1
- [SAIKO-APP-OVERVIEW](#saiko-app-overview) — Saiko Maps - Application Overview
- [SAIKO-README](#saiko-readme) — Saiko Maps
- [OS-BEVERAGE-PROGRAM-VOCAB-V1](#os-beverage-program-vocab-v1) — Beverage Program + Signal Vocabulary (v1): Canonical beverage program model and signal vocabulary for derived offering enrichment. Defines 5 program containers, maturity scale, and locked signal sets for wine, beer, cocktail, non-alcoholic, and coffee/tea programs.
- [SAIKO-FIELDS-IDENTITY-VERIFICATION-2026-03](#saiko-fields-identity-verification-2026-03) — Place Identity - Implementation Verification: Repository and Neon DB verification snapshot for place identity implementation state as of 2026-03.
**saiko-fields**
- [SKAI-DOC-FIELDS-ATOMIC-SIGNALS-001](#skai-doc-fields-atomic-signals-001) — Atomic Cultural Signals: Defines the atomic cultural signal model used to structure place data in Saiko Fields.
- [SKAI-DOC-FIELDS-DATA-LAYER-CONTRACT-001](#skai-doc-fields-data-layer-contract-001) — Data Layer Contract: Defines architectural boundaries and data access rules between the Saiko Data Layer, Fields platform, and TRACES consumer product.
- [SKAI-DOC-FIELDS-DERIVED-SIGNALS-ENGINE-001](#skai-doc-fields-derived-signals-engine-001) — Derived Signals Engine: Defines how derived signals are computed, governed, versioned, and exposed within the Saiko Fields system.
- [SKAI-DOC-FIELDS-SIGNALS-REGISTRY-001](#skai-doc-fields-signals-registry-001) — Signals Registry: Defines how atomic and derived cultural signals are formally structured and governed within the Saiko Fields system.
**TRACES**
- [OS-OFFERING-SIGNALS-V1](#os-offering-signals-v1) — Offering Signals v1
- [SS-DISPLAY-CONTRACT-V2](#ss-display-contract-v2) — SceneSense Display Contract v2: Display contract for the revised SceneSense three-lens model (Atmosphere / Energy / Scene). Supersedes SS-DISPLAY-CONTRACT-V1.
- [SS-FW-001](#ss-fw-001) — Three Universal Lenses Framework: Defines the three universal lenses (Atmosphere, Energy, Scene) used by SceneSense to interpret restaurant environments.
- [SS-FW-002](#ss-fw-002) — Atmosphere Lens: Defines the Atmosphere lens — physical and sensory environment of the dining space.
- [SS-FW-003](#ss-fw-003) — Energy Lens: Defines the Energy lens — activity level and temporal rhythm of the place.
- [SS-FW-004](#ss-fw-004) — Scene Lens: Defines the Scene lens — social patterns of use and behavioral expectations.
- [SS-GLO-001](#ss-glo-001) — SceneSense Glossary of Terms: Canonical glossary of SceneSense terminology for engineers, editors, and models.
- [VOICE-SAIKO-VOICE-LAYER](#voice-saiko-voice-layer) — SAI-DOC-VOICE-001 — Saiko Voice Layer
- [RES-CUISINE-TRADITIONS-V1](#res-cuisine-traditions-v1) — Cuisine Traditions as Structured Signals: Research synthesis on cuisine traditions as structured signals for the Offering Signals model

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

## FIELDS-ENRICHMENT-OPS-INVENTORY-V1

| Field | Value |
|-------|-------|
| **Type** | reference |
| **Status** | active |
| **Project** | FIELDS |
| **Path** | `docs/ENRICHMENT-OPERATIONS-INVENTORY.md` |
| **Last Updated** | Thu Mar 12 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Canonical inventory of all enrichment operations available on an entity record — automated (Google Places, neighborhood lookup), semi-automated (GPID, Instagram, Photos), and human-only (editorial fields). Coverage Dashboard and Entity Profile are designed from this inventory outward. |
| **Systems** | fields-data-layer, data-pipeline, admin |

# Enrichment Operations Inventory

## Purpose
This document defines the canonical set of operations the system can perform on an entity record. The Coverage Dashboard and Entity Profile page are designed from this inventory outward — not from missing fields inward.

## Automated Operations (system does it, no human required)

Google Places Enrichment
- Requires: google_place_id
- Fills: address, latitude, longitude, neighborhood, phone, hours, website
- How to trigger: enrichment script via admin UI button or CLI
- Notes: single run resolves majority of missing-field problems for records with GPID

Neighborhood Reverse Lookup
- Requires: latitude + longitude
- Fills: neighborhood
- Notes: subset of Google Places enrichment, can run independently if coords exist

## Semi-Automated (system proposes, human confirms)

GPID Matching
- System finds Google Place candidate for an entity
- Human approves or rejects the match
- Tool: /admin/gpid-queue

Instagram Handle Finder
- AI-assisted lookup based on place name and location
- Human confirms before saving
- Tool: /admin/instagram

Photo Fetch and Eval
- System pulls available Google photos for the entity
- Human tags and approves by tier (Default vs Editorial)
- Tool: /admin/photo-eval

## Human Only

Editorial fields:
- description
- TimeFOLD Foreground signal (tagline)
- Any subjective classification

Manual field entry:
- Any field the system cannot find (no GPID, no coords, no discoverable web presence)

## Key principle
Always run automated operations first. Human work is reserved for what the system genuinely cannot resolve. Before surfacing a problem to a human, check whether an automated operation could resolve it given the data already on the record.

## Derivability rules (as of March 2026)
- Has GPID → can auto-fill address, coords, neighborhood, phone, hours, website
- Has coords but no neighborhood → can reverse lookup neighborhood
- Has no GPID and no coords → needs human to resolve GPID first, then enrich
- Missing Instagram → semi-automated finder, human confirms
- Missing description → human only
- Missing TimeFOLD signal → human only, after factual fields are complete

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

## SYS-COVERAGE-DASHBOARD-DESIGN-V1

| Field | Value |
|-------|-------|
| **Type** | system |
| **Status** | active |
| **Project** | KNOWLEDGE-SYSTEM |
| **Path** | `docs/system/coverage-dashboard-design-v1.md` |
| **Last Updated** | 2026-03-13 |
| **Summary** | Design principles for the Coverage Dashboard — work surface, not report; smart counts; group by solution; automation first |

# Coverage Dashboard — Design Principles

## Purpose

The Coverage Dashboard is a work surface, not a diagnostic report. Someone arrives here to fix problems and leave with fewer of them.

## The Core Rule

Every number shown must either confirm things are healthy or tell you what kind of action is needed. If a number doesn't imply an action, it doesn't belong on the page.

## Dumb count vs. smart count

- **Dumb:** "42 records missing opening hours"
- **Smart:** "31 can be auto-filled via Stage 1 enrichment — 11 still need human review"

The difference: a smart count tells you who does the work — the system or you.

## Problem grouping principle

Group problems by solution, not by field. The universe of solutions is constrained to the tools that exist. Design Coverage from the tools outward, not from the missing fields inward.

## Automation first

Automated operations run before any human review. Human work is reserved for what the system genuinely cannot resolve. The page should make it obvious which bucket each problem falls into.

## Operations inventory (as of March 2026)

### Automated
- **Google Places enrichment** — given a GPID, fetches address, coords, neighborhood, phone, hours, website
- **Neighborhood reverse lookup** — given coords, derives neighborhood

### Semi-automated (system proposes, human confirms)
- **GPID matching** — system finds candidate, human approves
- **Instagram handle finder** — AI-assisted, human confirms
- **Photo fetch and eval** — system pulls Google photos, human tags

### Human only
- **Editorial fields** — description, TimeFOLD signal
- **Manual field entry** — anything system cannot find

## Key insight (March 2026)

If a record has a GPID, operating facts are often machine-recoverable. Missing hours, price level, or business status are frequently automation problems first, not human problems first. Always check what the system can fix before surfacing a problem to a human.

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

## SYS-RESEARCH-FORMAT-V1

| Field | Value |
|-------|-------|
| **Type** | system |
| **Status** | active |
| **Project** | KNOWLEDGE-SYSTEM |
| **Path** | `docs/system/research-format-v1.md` |
| **Last Updated** | 2026-03-16 |
| **Summary** | Defines the standard format for research documents ingested into the Saiko knowledge base |
| **Systems** | knowledge-system, repo-workflow |

# Research Document Format

## Purpose

Defines the standard format for research documents ingested into the Saiko knowledge base. Research documents are synthesis artifacts — they compile findings from external sources, editorial analysis, and community intelligence into structured knowledge that informs future architecture, product design, and signal model decisions.

Research documents are distinct from architecture docs (which specify current system behavior) and domain specs (which define vocabulary and contracts). Research captures **what we learned** and **what it implies**, not **what the system does**.

## Directory and Naming

- **Location:** `docs/research/`
- **Filename pattern:** `{topic-slug}-v{N}.md` (e.g., `cuisine-traditions-signals-v1.md`)
- **Doc ID prefix:** `RES-` (e.g., `RES-CUISINE-TRADITIONS-V1`)
- **Doc type:** `research`

The `docs-registry.ts` scanner discovers research docs automatically — no script changes needed.

## Frontmatter Schema

### Standard fields (required — same as all canonical docs)

| Field | Type | Description |
|-------|------|-------------|
| `doc_id` | string | `RES-{DESCRIPTIVE-NAME}-V{N}` |
| `doc_type` | string | Always `research` |
| `status` | enum | `active`, `draft`, `superseded`, `archived` |
| `owner` | string | Document owner |
| `created` | date | Creation date (YYYY-MM-DD) |
| `last_updated` | date | Last modification date |
| `project_id` | string | Which project this informs (SAIKO, TRACES, etc.) |
| `systems` | array | System tags for cross-indexing |
| `related_docs` | array | File paths to related canonical docs |
| `summary` | string | One-line summary of the research |

### Research-specific fields (optional but recommended)

| Field | Type | Description |
|-------|------|-------------|
| `research_domain` | string | Area of product/system this informs (e.g., `offering-signals`, `scenesense`, `coverage-ops`) |
| `source_types` | array | Kinds of sources consulted: `academic`, `editorial`, `industry-taxonomy`, `food-community`, `primary-observation`, `trade-publication` |
| `actionable` | boolean | Whether the doc contains concrete implementable recommendations |
| `informs_docs` | array | Forward pointers to docs this research should feed into (can reference future/planned docs) |

## Body Template

```markdown
# {Title}

## Overview
1-2 paragraph executive summary. What was researched, why, and the key finding.

## Findings
Organized by theme, not by source. Each section synthesizes across sources.

### {Finding Theme 1}
...

### {Finding Theme 2}
...

## Signal / Design Implications
What this means for Saiko's data model, product, or operations. Concrete proposed signals, fields, or architectural changes.

## Recommendations
Numbered, actionable items. Each should be implementable or testable.

## Sources
Bulleted list grouped by type. Enough to trace provenance, not academic citation format.

### Editorial
- Source — topic/list

### Academic / Industry
- Author/org — title or description

### Community / Primary
- Forum/community — topic
```

## Promotion Workflow

Research documents follow the standard promotion path:

1. Research is conducted in a chat session or external tool
2. Findings are compiled into the body template above
3. Human approves promotion
4. Promote via:

```bash
npm run docs:promote -- \
  --path docs/research/{topic-slug}-v1.md \
  --content /path/to/draft.md \
  --doc-id RES-{NAME}-V1 \
  --doc-type research \
  --project-id {PROJECT} \
  --status active \
  --summary "{one-line summary}" \
  --systems {system1},{system2}
```

5. Run `npm run docs:registry` to update registry

## When to Create a Research Document

A research doc should be created when:

- **External research was conducted** that produced findings relevant to product or system design
- **A cross-cutting analysis** synthesized information from multiple sources into a coherent framework
- **Signal vocabulary or taxonomy work** produced candidate terms, categories, or classification schemes
- **Competitive or landscape analysis** produced reusable intelligence

A research doc should NOT be created for:

- One-off observations or opinions (keep in session notes)
- Implementation decisions (use architecture docs)
- Vocabulary definitions without supporting research (use domain specs)
- Status updates or progress reports

## Versioning

Research documents version like all canonical docs. If new research significantly updates or contradicts a prior doc:

1. Create `{topic}-v2.md` with updated findings
2. Patch the v1 doc's status to `superseded` via `apply-doc-patch`
3. Reference v1 in v2's `related_docs`

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
│  {Tagline}  (italic serif)      │   starts below identity) │
│  {Open/Closed state}            │                          │
│                                 │                          │
│  Reserve ↗  Website ↗           │                          │
│  Instagram ↗  TikTok ↗          │                          │
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
| **Saiko** | Tagline | AI editorial layers (interpretation_cache TAGLINE via Voice Engine v2) | Saiko's own editorial voice | Confident, understated, cool | Tagline rendered below identity subline |

These voices must never merge. ABOUT and Coverage Note are always separate sections.

### 3.2 ABOUT — Merchant Voice (Identity Layer)

**Purpose**: Introduces the place in the merchant's voice. Most important text block on page.

**Source hierarchy**:
1. Merchant-authored text (website about section, homepage intro, IG bio, pinned captions, manifesto)
2. Synthesized by Saiko from available signals (name, category, menu signals, known dishes, location context) when no merchant text exists — written in merchant style

**Tone**: Upbeat, descriptive, slightly enticing. Neutral-to-positive. NOT salesy, not marketing language, not exaggerated.

**Length**: ~40-80 words (compact identity paragraph, not a long story).

**Visual treatment**: Most important text block — visually distinct. Drop-cap first letter, serif typography, slightly larger line height, inset spacing.

**Implementation**: VOICE_DESCRIPTOR pipeline (WO-ABOUT-001) implements a 3-tier generation hierarchy stored in interpretation_cache:
- **Tier 1 (verbatim-v1)**: Extracted from merchant surface artifacts — coherence-filtered, quality-scored
- **Tier 2 (about-synth-v1)**: AI-synthesized from merchant text blocks in the merchant's voice
- **Tier 3 (about-compose-v1)**: AI-composed from structured signals when no merchant text exists

**Read path**: API reads VOICE_DESCRIPTOR from interpretation_cache (is_current=true), falls back to entities.description. Page renders with descriptionSource label for provenance.

**Current data**: entities.description has 5/143 (short one-liners, hand-seeded). Merchant surface text exists in merchant_surface_artifacts for enriched entities. VOICE_DESCRIPTOR pipeline ready for batch execution.

### 3.3 COVERAGE NOTE — External Media Voice (Cultural Validation)

**Purpose**: Surfaces a short quote from trusted editorial/media coverage. "Why is this place notable?"

**Source**: coverage_sources table (LA Times, Eater, Michelin, etc.) + pull quote fields.

**Format**: One sentence (preferred), max two short lines. Direct quotes whenever possible. Always attributed. Source name links to pullQuoteUrl when available.

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

Name → Identity Line (structural) → Tagline (Saiko editorial voice) → ABOUT (identity/merchant voice) → Coverage Note (credibility)

This moves the user from structure → identity → validation.

### 3.6 Structured Content (Left Column)

| Section | Data Source | Collapse Rule |
|---------|-----------|---------------|
| Business status banner | entities.business_status | Hide if OPERATIONAL or null |
| Identity (name, identity line, open state) | entities + evolved getIdentitySublineV2() | Name always shown |
| Tagline | interpretation_cache (TAGLINE) with entities.tagline fallback | Hide if null |
| Primary CTAs (Reserve, Website, Instagram, TikTok) | reservation_url, website, instagram, tiktok | Hide if all null |
| ABOUT | Merchant text (entities.description, merchant surfaces, or synthesized) | Hide if null |
| Offering | derived_signals (identity_signals + offering_programs) | Hide if all null |
| Coverage Note | coverage_sources + pull quote | Hide if empty |
| Tips | entities.tips | Hide if empty array |

### 3.7 Facts Rail (Right Column)

| Section | Data Source | Collapse Rule |
|---------|-----------|---------------|
| Hours | entities.hours (parsed) | Hide if null |
| Address | entities.address | Hide if null |
| Links | entities.website, instagram, tiktok, merchant_signals.menu_url | Hide if all null |
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
| Reservation URL | merchant_signals.reservation_url | ✅ (merchant_signals → entities fallback) | ✅ |
| Beverage programs | derived_signals.offering_programs | ✅ | ✅ (signal-aware composition) |
| VOICE_DESCRIPTOR (ABOUT) | interpretation_cache | ✅ | ✅ (3-tier fallback) |
| Business status | entities.business_status | ✅ | ✅ (banner for non-OPERATIONAL) |
| Place personality | derived_signals.identity_signals | ✅ | ✅ (scene sidebar + identity) |
| Signature dishes | derived_signals.identity_signals | ✅ | ✅ (Known For section) |
| Key producers | derived_signals.identity_signals | ✅ | ✅ (Known For section) |
| Origin story type | derived_signals.identity_signals | ✅ | ✅ (About accent line) |
| Language signals → SceneSense | derived_signals.identity_signals | ✅ | ✅ (routes to SceneSense lenses) |
| Identity signals (core 4) | derived_signals.identity_signals | ✅ | ✅ (offering signals: posture, service, price, wine intent) |
| Confidence metadata | derived_signals.identity_signals | — | — (pipeline internal, not page-facing) |

## 5. Rendering Rules

### 5.1 Offering Section — Signal-Aware Composition

Offering lines are composed from program maturity + program signals, not flat labels. The system uses static phrase assembly: structural signal names map to human-readable fragments and compose into natural sentences.

**Architecture**: `resolveSignalPhrases(signals[], vocabulary) → fragments[] → composeSentence(lead, fragments, connector) → sentence`

**Food**: Cuisine posture drives the lead phrase (e.g. "Seasonal, produce-driven kitchen"), food signals compose as detail fragments via `"built around"` connector. 16 signal phrases mapped (FOOD_SIGNAL_PHRASES). Falls back to maturity + cuisineType when posture is absent.

**Wine**: Wine program intent drives the lead phrase (9 intents mapped in WINE_INTENT_LEADS, e.g. "Producer-driven natural wine list"). Wine signals (3 locked: natural_wine_focus, orange_wine_presence, pet_nat_presence) compose via `"with"` connector. Falls back to maturity label if no intent.

**Cocktails**: Maturity drives the lead ("Dedicated cocktail program" / "Composed cocktail menu"), cocktail signals (locked v1: seasonal_menu) compose via `"featuring"`. Falls back to `servesCocktails` boolean.

**Beer**: Maturity drives the lead ("Dedicated beer program" / "Considered beer selection"), beer signals (locked v1: craft_beer_focus) compose via `"with"`. Falls back to `servesBeer` boolean.

**Non-Alcoholic**: Signal-first — if any of the 10 locked signals resolve (e.g. zero_proof_cocktails, house_soda_program, horchata_presence, na_spirits_presence), they drive the sentence via `"including"` connector. Maturity shapes the lead. Falls back to maturity-only label when no signals detected.

**Coffee & Tea**: Signal-first — if any of the 11 locked signals resolve (e.g. espresso_program, matcha_program, specialty_tea_presence, afternoon_tea_service), they compose via `"featuring"`. Falls back to maturity-only label.

**Service + Price**: Use existing phrase maps (SERVICE_MODEL_PHRASES, PRICE_PHRASES). No signal composition.

**Cap**: Max 6 offering lines rendered (OFFERING_CAP). Signal fragments capped at 3 per program.

**Collapse rule**: Programs with maturity `none` or `unknown` and no resolved signals do not render.

All signal vocabularies are defined in the Beverage Program + Signal Vocabulary v1 spec (SKAI-DOC-TRACES-BEVERAGE-PROGRAM-VOCAB-001). Display phrase mappings live in page.tsx alongside the rendering logic.

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
| scripts/generate-descriptions-v1.ts | VOICE_DESCRIPTOR batch pipeline |
| lib/voice-engine-v2/description-extraction.ts | Tier 1 extraction + coherence filter |
| lib/voice-engine-v2/description-prompts.ts | Tier 2/3 prompt templates |
| lib/voice-engine-v2/description-generator.ts | AI generation for Tier 2/3 |
| lib/scenesense.ts | SceneSense assembly |

## 9. Showcase Entity

**Camphor** (slug: camphor-restaurant-2-michelin-1-michelin-star-arts-district-french)
- Identity signals: cuisine_posture=balanced, service_model=small-plates, price_tier=$$$, wine_program_intent=classic, place_personality=chef-driven
- Reservation URL in merchant_signals
- 8 language signal descriptors
- Google Places: address, lat/lng, phone, hours, photos
- No description, no curator note

## 10. Resolved Decisions

1. **ABOUT vs Coverage Note vs Saiko Voice** — LOCKED. Three distinct voices, never merge. ABOUT = merchant voice (identity). Coverage Note = external media (validation). Saiko Voice = tagline rendered below identity subline (Voice Engine v2 output from interpretation_cache).

## 11. Open Questions

1. ~~**ABOUT content sourcing**~~: RESOLVED — VOICE_DESCRIPTOR pipeline (WO-ABOUT-001) implements 3-tier sourcing: verbatim merchant text → AI-synthesized from merchant blocks → AI-composed from signals. See about-description-spec-v1.md.
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
| 1.1 | 2026-03-16 | Tagline rendered on page (Saiko voice live). TikTok CTA added. Pull quote source linked via pullQuoteUrl. Wireframe and content model updated. | Bobby / Claude |
| 1.2 | 2026-03-16 | VOICE_DESCRIPTOR pipeline built (3-tier description hierarchy). Offering section rewritten with signal-aware composition across all 7 programs. Business status banner added. Beverage signal display phrases mapped for all locked v1 vocabularies. Data gaps table updated. Open question 1 resolved. | Bobby / Claude |
| 1.3 | 2026-03-17 | All data gaps closed. key_producers and origin_story_type wired through API → contract → page. Reservation URL confirmed wired (merchant_signals → entities fallback). Identity signals fully wired (7/10 page-facing, 3 confidence metadata internals). Data gaps table rewritten to reflect actual state. | Bobby / Claude |

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

## ARCH-COVERAGE-OPS-DASHBOARD-V1

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/coverage-ops-dashboard-v1.md` |
| **Last Updated** | 2026-03-15 |
| **Summary** | 4-tab coverage operations dashboard spec — Overview, Tier Health, Enrichment Tools, Neighborhoods. Replaces prior 6-tab layout. |
| **Systems** | coverage-operations, admin-tools |

# Coverage Ops Dashboard v1

## Purpose

Operator dashboard for data quality triage and enrichment pipeline management. Located at `/admin/coverage`, server-rendered from raw SQL. Scoped to all non-permanently-closed entities.

Replaces the prior 6-tab layout (Overview, Missing Fields, Neighborhoods, Red Flags, Field Breakdown, Tier 2 Visit Facts) with a consolidated 4-tab structure.

## Route

```
/admin/coverage?view=overview|tiers|pipeline|neighborhoods
```

Default view: `overview`.

## Tab Structure

| Tab | Param | Purpose |
|-----|-------|---------|
| Overview | `overview` | High-level counts, tier progress, enrichment funnel |
| Tier Health | `tiers` | Per-tier field completeness + ERA pipeline progress |
| Enrichment Tools | `pipeline` | Tool inventory + recent enrichment runs |
| Neighborhoods | `neighborhoods` | Scorecard grid by neighborhood |

## Overview Tab

### Summary Cards (row of 5)
- Total entities
- OPEN entities
- CANDIDATE entities
- Entities with GPID
- Distinct neighborhoods

### Tier Completion Bars
Three horizontal bars showing completion percentage:
- **Tier 1 Identity** — slug, name, latitude, google_place_id all non-null
- **Tier 2 Operational** — hours, phone, website, price_level, menu_url, reservation_url all non-null
- **Tier 3 Enrichment** — instagram, neighborhood, description all non-null

### Enrichment Funnel
Four-stage horizontal funnel:
```
Never Enriched → In Progress → Fully Enriched → Published
```
- Never Enriched: `enrichment_stage IS NULL`
- In Progress: `enrichment_stage` between 1-6
- Fully Enriched: `enrichment_stage = '7'`
- Published: `status = 'OPEN'`

## Tier Health Tab

### Summary Strip
Three cards at top showing all tiers at a glance — tier name, completion count, percentage, color-coded progress bar.

### ERA Pipeline Progress
Histogram showing entity count at each enrichment stage (NULL through 7). Gives operators a quick read on where entities are in the pipeline.

### Per-Tier Field Breakdowns
Three sections, one per tier. Each shows a table of fields with has/missing/total/coverage%.

**Tier 1 — Identity**
| Field | Description |
|-------|-------------|
| slug | URL-safe identifier |
| name | Display name |
| latitude | Geographic coordinate |
| google_place_id | GPID anchor |

**Tier 2 — Operational**
| Field | Description |
|-------|-------------|
| hours | Operating hours JSON |
| phone | Phone number |
| website | Primary website URL |
| price_level | Price tier (1-4) |
| menu_url | Menu link |
| reservation_url | Reservation link |

**Tier 3 — Enrichment**
| Field | Description |
|-------|-------------|
| instagram | Instagram handle |
| neighborhood | Neighborhood assignment |
| description | Entity description |

Tier 1 includes an expandable drill-down showing individual entities with identity issues.

## Enrichment Tools Tab

### Tool Inventory
Static table of all available enrichment tools. Each row shows: name, command (with copy-to-clipboard button), cost tier, and fields affected.

| Tool | Cost | Provider | Fields |
|------|------|----------|--------|
| Social discovery | Free | OpenAI GPT-4.1-mini | instagram, tiktok, website |
| Website fetch + parse | Free | — | menu, reservation, hours, phone |
| Populate canonical | Free | — | Evidence to canonical promotion |
| Website enrichment | Free | — | Website-derived fields |
| Menu URL sync | Free | — | menu_url |
| ERA pipeline (full) | Anthropic $ | Anthropic | All stages (identity signals, taglines) |
| Coverage apply (Google) | Google $$ | Google Places API | hours, phone, latlng, photos, price_level |

Commands use `node -r ./scripts/load-env.js ./node_modules/.bin/tsx` to load both `.env` and `.env.local`.

### Recent Enrichment Runs
Last 10 runs from `place_coverage_status`, showing entity name, slug, status, last attempt time, source, and missing field groups.

## Neighborhoods Tab

Scorecard grid by neighborhood. Each card shows entity count and field coverage stats for that neighborhood. Unchanged from prior dashboard version.

## Data Sources

### SQL Queries (`lib/admin/coverage/sql.ts`)
| Query | Used by |
|-------|---------|
| `OVERVIEW_COUNTS_SQL` | Overview cards |
| `TIER_COMPLETION_SQL` | Overview bars + Tier Health strip |
| `ENRICHMENT_STAGE_SQL` | Overview funnel + Tier Health histogram |
| `RECENT_RUNS_SQL` | Enrichment Tools recent runs |
| `TIER_FIELD_STATS_SQL` | Tier Health field breakdowns |
| `TIER1_ISSUES_SQL` | Tier Health Tier 1 drill-down |
| `ALL_NEIGHBORHOOD_SCORECARD_SQL` | Neighborhoods tab |

### Types (`lib/admin/coverage/types.ts`)
- `OverviewCounts` — summary card data
- `TierCompletion` — tier completion counts
- `EnrichmentStage` — stage distribution
- `RecentRun` — enrichment run record
- `TierFieldStat` — per-field has/missing/total
- `Tier1Issue` — entity with identity issues
- `NeighborhoodScorecard` — neighborhood stats

## Implementation Files

| File | Role |
|------|------|
| `app/admin/coverage/page.tsx` | Page component, view routing, all view renderers |
| `lib/admin/coverage/sql.ts` | Raw SQL queries |
| `lib/admin/coverage/types.ts` | TypeScript interfaces for query results |
| `lib/admin/coverage/run.ts` | `runOne` / `runMany` query helpers |
| `app/admin/coverage/components/ActionButtons.tsx` | `CopyCommandButton`, `RedFlagActions` client components |

---

## ARCH-COVERAGE-TIERS-V1

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/coverage-tiers-v1.md` |
| **Last Updated** | 2026-03-14 |
| **Summary** | Defines the coverage tier model for entity enrichment. Six tiers from raw identity through experiential interpretation, with enrichment strategy (merchant surfaces first, editorial sources second, human third), entity-type signal requirements, and scanner integration points. |
| **Systems** | coverage-operations, offering-signals, fields-data-layer, data-pipeline |

# Coverage Tiers — Entity Enrichment Model

---

## Purpose

This document defines what "complete coverage" means for an entity in Saiko, how to measure it, and in what order to pursue it.

Coverage is not binary. An entity progresses through tiers of enrichment depth. Each tier adds a layer of understanding — from "this place exists" to "here's what it feels like to be there."

---

## Enrichment Strategy

The enrichment priority order is fixed:

### 1. Merchant-owned surfaces first (the 80% source)

If an entity has a website, we scan it for everything: hours, menu, reservation links, social handles, descriptions, team info, philosophy, beverage programs, service model. Same with Instagram and TikTok — we grab everything useful.

This is the merchant speaking in their own words. It is the highest-fidelity, most authentic source of identity and offering signals.

Merchant-owned surfaces include:
- **Website** — homepage, about, menu, drinks, contact, press pages
- **Instagram** — bio, captions, posting frequency, visual identity
- **TikTok** — bio, content themes, audience engagement
- **Google Places** — hours, phone, address, photos, attributes, business status

If we've thoroughly defined our signal expectations at an entity-type level, merchant surfaces should yield 80% of what we need.

### 2. Approved editorial sources second

Auto-search approved publications for media coverage of the entity. This fills in what the merchant doesn't say about themselves: critical reception, awards, press mentions, pull quotes.

Approved sources include:
- Eater LA
- LA Times Food
- The Infatuation
- Michelin Guide
- Bon Appetit
- Timeout

Editorial coverage provides:
- Pull quotes and critical voice
- Awards and recognition signals
- Cultural positioning
- Trend and moment context

### 3. Human fills the gaps

The remaining 10-20% that can't be automated:
- Confirming "none" for fields that don't apply (taco cart with no website)
- Adding coverage links from niche or non-indexed sources
- Resolving ambiguous duplicates
- Correcting misattributed data
- Adding curator notes and contextual connections

---

## The Six Tiers

### Tier 1 — Identity & Location

**What it answers:** "Can this entity exist on a map?"

| Signal | Source | Required? |
|--------|--------|-----------|
| Name | Intake | Yes |
| Category | Google Places / manual | Yes |
| Coordinates (lat/lng) | Google Places / manual | Yes (blocking) |
| Address | Google Places | Yes |
| Neighborhood | Derived from coords | Yes |
| Cuisine type | Website / editorial / Google Places | Yes (restaurants) |
| Google Place ID | Google Places API | No (see identity scoring) |
| Phone | Google Places / website | No |
| Website | Discovery / manual | No |
| Instagram | Discovery / website | No |
| TikTok | Discovery / website | No |

**Scanner issue types:** `unresolved_identity`, `missing_coords`, `missing_neighborhood`, `missing_phone`, `missing_website`, `missing_instagram`, `missing_tiktok`, `missing_classification`, `potential_duplicate`

**Resolution tools:** Google Places lookup, social discovery, GPID resolver, neighborhood derivation

**Key principle:** GPID is not required for identity. Weighted anchor scoring determines identity completeness. Taco carts and mobile vendors can reach publication threshold without a Google Places listing. See `docs/architecture/identity-scoring-v1.md`.

**Status:** Fully implemented in Coverage Ops.

---

### Tier 2 — Visit Decision Facts

**What it answers:** "Should I go, and what should I expect when I arrive?"

| Signal | Source | Entity types |
|--------|--------|-------------|
| Hours | Google Places / website | All with fixed location |
| Price level | Google Places / menu | Restaurants, bars, cafes |
| Business status (open/closed) | Google Places / manual | All |
| Reservation URL | Website scan | Restaurants with reservations |
| Menu URL | Website scan | Restaurants, bars, cafes |

**Scanner issue types (planned):** `missing_hours`, `missing_price_level`, `missing_menu_link`, `missing_reservations`, `operating_status_unknown`, `google_says_closed`

**Resolution tools:** Stage 1 (Google Places backfill), website enrichment (Stage 6)

**Key principle:** Classification (category/cuisine) belongs to Tier 1 identity. Tier 2 assumes identity is already coherent, then answers visitability and arrival expectations (status, hours, price, reservation/menu affordances).

Operating status (temp/perm closed) should be auto-detected from Google Places `businessStatus` field AND manually overridable from Coverage Ops.

**Status:** Partially implemented. `google_says_closed` exists in Coverage Ops today; Tier 2 v1 adds scanner/UI coverage for missing hours, price level, menu links, reservation links, and operating status unknown.

---

### Tier 3 — Surface Evidence

**What it answers:** "Do we have raw source material to work with?"

| Signal | Source | Purpose |
|--------|--------|---------|
| Homepage captured | Website crawl | Foundation for all website-derived signals |
| Menu page captured | Website crawl | Food and beverage signal extraction |
| About page captured | Website crawl | Identity, team, philosophy extraction |
| Instagram profile captured | IG API | Merchant voice, temporal signals |
| TikTok profile captured | TikTok discovery | Merchant voice, content themes |
| Social links extracted | Website scan | Cross-reference social handles |
| Reservation provider detected | Website scan | Resy, OpenTable, Tock, SevenRooms |
| Ordering provider detected | Website scan | Toast, ChowNow, Square, DoorDash |

Storage: `merchant_surfaces` (immutable evidence), `merchant_surface_artifacts` (parsed outputs), `merchant_signals` (best-effort synthesis)

**Scanner issue types (planned):** `no_surfaces`, `surfaces_stale`, `surfaces_unparsed`

**Resolution tools:** ERA Stage 2 (surface discovery), Stage 3 (surface fetch), Stage 4 (surface parse)

**Key principle:** Surfaces are immutable evidence records. Never update — always append new rows. This preserves the audit trail and enables re-extraction when prompts improve.

**Status:** ERA pipeline handles this for entities with websites. Scanner does not yet flag surface-level issues.

---

### Tier 4 — Offering Signals

**What it answers:** "What does this place serve and how?"

Three-layer model (see `docs/offering-signals/offering-signals-v1.md`):

**Food Signals:**
- `cuisine_posture` — broad culinary identity
- `menu_format` — tasting menu, a la carte, counter
- `cooking_method` — wood-fired, raw bar, live-fire
- `dish_focus` — pasta, seafood, charcuterie
- `ingredient_focus` — seasonal produce, dry-aged beef
- `meal_focus` — dinner-only, all-day, brunch

**Beverage Signals** (see `docs/offering-signals/beverage-program-vocab-v1.md`):
- 5 program containers: `wine_program`, `beer_program`, `cocktail_program`, `non_alcoholic_program`, `coffee_tea_program`
- Each with maturity scale: `none` / `incidental` / `considered` / `dedicated` / `unknown`
- 25+ locked signal vocabulary items across all programs

**Service Signals:**
- `reservation_model` — required, recommended, not taken
- `walk_in_policy` — counter walk-in, bar only
- `seating_format` — counter, communal, table service
- `sharing_style` — sharing-forward, individual plates
- `pacing_style` — courses-driven, guest-controlled

**Priority tiers within offering signals:**
- **Tier 1 (Identity):** cuisine_posture, wine_program_intent, reservation_model — extracted first, required before lower tiers
- **Tier 2 (Distinctive):** wine_region_focus, cooking_method, cocktail_program — differentiates within category
- **Tier 3 (Detail):** ingredient_focus, pacing_style, sharing_style — rendered only in expanded contexts

**Stop-Early Rule:** If one Tier 1 signal at confidence >= 0.7 and one or two Tier 2 signals at confidence >= 0.6, stop crawling additional sources.

**Scanner issue types (planned):** `missing_offering_identity`, `thin_offering_signals`, `offering_signals_stale`

**Status:** Signal vocabulary locked. Extraction prompt exists (`saikoai-extraction-prompt-v2.1.md`). Programs exist in place-page contract but not yet materialized in DB storage. Phase 3 of Fields v2.

---

### Tier 5 — Editorial Coverage

**What it answers:** "What has been written about this place?"

| Signal | Source | Purpose |
|--------|--------|---------|
| Coverage source links | Editorial search / manual | Press mentions, reviews, features |
| Pull quote | Editorial extraction | Critical voice highlight |
| Pull quote author/source | Editorial extraction | Attribution |
| Description | Website / editorial / synthesis | Place narrative |
| Awards / recognition | Editorial extraction | Credibility signals |

Storage: `coverage_sources` (links), entity fields (pull quote, description)

**Scanner issue types (planned):** `thin_editorial_coverage`, `no_pull_quote`, `missing_description`

**Resolution tools (planned):** Editorial source auto-search against approved publications

**Key principle:** Editorial coverage is the merchant story told by others. It complements the merchant's own voice (Tier 3-4) with external validation and critical perspective.

**Status:** `coverage_sources` table exists. Manual entry possible. Auto-search against approved sources not yet built. Scanner does not yet flag editorial thinness.

---

### Tier 6 — Experiential Interpretation (SceneSense)

**What it answers:** "What does it feel like to be there?"

Three Universal Lenses (see `docs/scenesense/three-lenses-framework-v1.md`):

**Atmosphere Lens** — physical/sensory environment:
- Lighting, noise, spatial scale, seating density, comfort, indoor/outdoor

**Energy Lens** — activity level & temporal rhythm:
- Crowd intensity, movement, service tempo, busy windows, daypart shifts
- Backed by `energy_scores` table with component breakdown

**Scene Lens** — social patterns & behavioral expectations:
- Group size, social roles, dining occasions, formality, social register

**Place Relevance Level (PRL):**
- 1-4 scale measuring cultural significance and relevance
- Can be computed or manually overridden (`prlOverride`)

**Behavioral Tag Scores:**
- `cozy_score`, `date_night_score`, `late_night_score`, `after_work_score`, `scene_score`
- Float 0-1, versioned, dependency-tracked

Storage: `interpretation_cache` (SCENESENSE_PRL output type), `energy_scores`, `place_tag_scores`

**Scanner issue types (planned):** `missing_scenesense`, `scenesense_stale`, `missing_prl`

**Status:** Framework fully specified across 6 docs. Display contract v2 aligned to revised 3-lens model. Energy scores computed for enriched entities. Full SceneSense extraction pipeline not yet wired to Coverage Ops.

---

## Entity-Type Signal Requirements

Not every entity type needs every signal. A taco cart doesn't need a wine program assessment. A hotel doesn't need cuisine_posture.

### Restaurant (full-service)

**Required:** Name, coords, neighborhood, hours, price level, cuisine type, reservation model
**Expected:** Website, Instagram, menu URL, description, at least 1 editorial source, food program identity, beverage program assessment
**Nice-to-have:** TikTok, pull quote, SceneSense, tag scores

### Street food / Taco cart / Mobile vendor

**Required:** Name, coords (or appearance locations), neighborhood
**Expected:** Instagram OR TikTok, cuisine type, meal focus
**Confirmed-none common:** Website, phone, reservation URL, wine program
**Special:** `place_appearances` for location tracking, `marketSchedule` for schedule

### Bar / Wine bar

**Required:** Name, coords, neighborhood, hours
**Expected:** Website, Instagram, beverage program assessment (especially wine/cocktail), reservation model
**Nice-to-have:** TikTok, editorial coverage, SceneSense

### Coffee shop / Cafe

**Required:** Name, coords, neighborhood, hours
**Expected:** Website, Instagram, coffee/tea program assessment
**Nice-to-have:** Food program (if substantial), TikTok

### Hotel

**Required:** Name, coords, neighborhood, website, phone
**Expected:** Instagram, reservation URL, description, price level
**Different signals:** Room count, amenities, check-in/out, on-site dining (via entity relationships)

### Activity / Venue (non-food)

**Required:** Name, coords, neighborhood
**Expected:** Website, Instagram, description, hours
**Not applicable:** Most food/beverage signals

---

## Scanner Integration

The issue scanner (`lib/coverage/issue-scanner.ts`) should evolve to check coverage depth per tier:

### Current (Tier 1 only)
- `unresolved_identity` — no GPID
- `missing_coords` — no lat/lng (blocking)
- `missing_neighborhood` — no neighborhood
- `missing_phone` — no phone
- `missing_website` — no website
- `missing_instagram` — no Instagram
- `missing_tiktok` — no TikTok
- `potential_duplicate` — fuzzy name/GPID/social match

### Next phase (Tier 2)
- `missing_hours` — no hours data
- `missing_price_level` — no price level (restaurants only)
- `missing_menu_link` — no menu URL available for entities that should expose one
- `missing_reservations` — no reservation URL for reservation-relevant entities
- `operating_status_unknown` — no businessStatus data
- `google_says_closed` — Google businessStatus indicates closure

### Next phase (Tier 1 classification)
- `missing_classification` — category/cuisine unresolved for entity type expectations

### Future (Tiers 3-6)
- `no_surfaces` — no merchant surfaces captured
- `thin_offering_signals` — entity type expects offering signals but none present
- `thin_editorial_coverage` — zero or few coverage sources
- `missing_description` — no description from any source
- `missing_scenesense` — no SceneSense interpretation cached
- `missing_prl` — no PRL assigned

### Entity-type-aware severity

Issue severity should be influenced by entity type:
- `missing_website` is MEDIUM for a restaurant but should be LOW (or suppressed) for a taco cart
- `missing_instagram` is LOW for a hotel but MEDIUM for a street food vendor (IG is their primary channel)
- `thin_offering_signals` is HIGH for a full-service restaurant but irrelevant for an activity venue

---

## Measuring Coverage Completeness

Coverage completeness is a per-entity percentage based on entity type signal requirements.

```
completeness = signals_present / signals_expected_for_entity_type
```

This enables:
- Coverage dashboard showing "72% of restaurants have Tier 1 complete"
- Per-entity coverage score visible in admin
- Bulk actions targeting entities below a threshold

Completeness bands:
- **Publishable** (Tier 1 complete) — entity can appear on maps
- **Useful** (Tiers 1-2 complete) — user can make a visit decision
- **Rich** (Tiers 1-4 complete) — full offering story in merchant's words
- **Complete** (Tiers 1-6 complete) — experiential interpretation available

---

## Relationship to Existing Systems

| System | Role in coverage |
|--------|-----------------|
| ERA Pipeline (`scripts/enrich-place.ts`) | Executes enrichment stages 1-7 per entity |
| Issue Scanner (`lib/coverage/issue-scanner.ts`) | Detects coverage gaps, creates `entity_issues` |
| Coverage Ops UI (`/admin/coverage-ops`) | Operator triage board for resolving issues |
| Website Enrichment (`lib/website-enrichment/`) | Extracts signals from merchant websites |
| SaikoAI Extraction Prompt | AI prompt for parsing surface text into signals |
| Fields v2 (`observed_claims` → `canonical_entity_state`) | Sanctioned ground truth for extracted signals |
| Interpretation Cache | Versioned AI-generated editorial outputs |
| SceneSense Framework | Experiential interpretation model |

---

## What's Not Covered Here

- **Rendering rules** — how signals become UI text (see `docs/voice/saiko-voice-layer.md`)
- **SceneSense interpretation logic** — how raw signals become atmosphere/energy/scene descriptors (see SceneSense docs)
- **Signal freshness decay** — time-weighted confidence penalties (planned for Offering Signals v2)
- **Consumer-facing coverage indicators** — whether/how to show coverage depth to end users

---

## ARCH-ENTITY-CLASSIFICATION-LAYERS-V1

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/entity-classification-layers-v1.md` |
| **Last Updated** | 2026-03-14 |
| **Summary** | Plain-language explanation of entity classification layers in the current schema — entityType vs primary_vertical vs category vs cuisine_type — including operational authority and usage guidance. |
| **Systems** | fields-data-layer, coverage-operations, place-page |

# Entity Classification Layers

## Purpose

This document explains how Saiko currently classifies entities across schema and product logic, and which field is authoritative for each decision type.

---

## The Four Classification Fields

| Field | Meaning | Typical values |
|------|---------|----------------|
| `entities.entityType` (`entity_type`) | Coarse structural kind of entity | `venue`, `activity`, `public` |
| `entities.primary_vertical` | Primary domain classifier | `EAT`, `COFFEE`, `WINE`, `DRINKS`, `STAY`, ... |
| `entities.category` | Human-readable category label | `restaurant`, `wine bar`, `hotel`, ... |
| `entities.cuisineType` (`cuisine_type`) | Cuisine-specific subtype | `Mexican`, `Italian`, `Thai`, ... |

---

## Why Both `entityType` and `primary_vertical` Exist

They solve different problems:

- `entityType` tells the system what broad class of entity it is dealing with.
- `primary_vertical` tells the system what domain-specific operational logic should apply.

In practice, `entityType` is too coarse for operational rules like "should this place have a menu URL?" or "should reservations be expected?".

---

## Which Field Is Authoritative For What

### Structural decisions

Use: `entityType`

Examples:
- coarse API behavior for venue/activity/public branching
- generic admin search payloads that include entity kind

### Operational applicability and scanner gating

Use: `primary_vertical` (authoritative)

Examples from current repo reality:
- Tier 2 Coverage Ops scanner gates `missing_price_level`, `missing_menu_link`, and `missing_reservations` by `primary_vertical` in `lib/coverage/issue-scanner.ts`.
- Website enrichment category-only mode excludes lodging-like entities using `primary_vertical != STAY` in `scripts/run-website-enrichment.ts`.

### Display and descriptive identity

Use: `category` and `cuisine_type`

Examples:
- place-page output renders display category fallback using `primary_vertical` display mapping with category fallback in `app/api/places/[slug]/route.ts`.
- cuisine remains a descriptive identity signal, not the primary operational classifier.

---

## Operational Rule of Thumb

When building scanner rules, coverage tiers, or automation applicability:

1. use `primary_vertical` for domain gating
2. use `entityType` only for coarse structural branching
3. use `category`/`cuisine_type` for identity description and UI semantics

---

## Relationship to Coverage Tiers

- Tier 1 (Identity & Classification) includes category/cuisine identity semantics.
- Tier 2 (Visit Facts) uses `primary_vertical` to decide which visit facts should exist for which entities.
- Tier 3 (Experience / Interpretation) sits above both and uses enriched signals.

See `docs/architecture/coverage-tiers-v1.md` for the tier model.

---

## ARCH-IDENTITY-SCORING-V1

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/identity-scoring-v1.md` |
| **Last Updated** | 2026-03-14 |
| **Summary** | Weighted anchor scoring model for entity identity confidence. GPID is not required — entities reach publication threshold through any combination of anchors that demonstrates sufficient identity certainty. |
| **Systems** | identity-enrichment, coverage-operations |

# Identity Scoring — Weighted Anchor Model

## Core Principle

**GPID (Google Place ID) is not required for entity identity.**

Saiko is not a location-first database. Many entities we track — taco carts, pop-ups, mobile vendors, market stalls — don't have Google Places listings. Requiring GPID as a prerequisite for identity would permanently exclude these entities from publication.

Instead, identity confidence is computed from a weighted set of **anchors** — independent data points that corroborate an entity's existence and uniqueness.

## Anchor Weights

| Anchor | Weight | Why |
|--------|--------|-----|
| `gpid` (Google Place ID) | 4 | Strongest single signal — Google verified the business exists at this location |
| `website` | 3 | Official web presence — strong identity signal, especially for established businesses |
| `instagram` | 2 | Social presence — confirms entity is active and provides visual verification |
| `tiktok` | 2 | Social presence — especially relevant for street food, taco vendors, food reviewers |
| `verifiedAddress` | 2 | Physical location confirmed — address string matches a known format |
| `reservationProvider` | 1 | Corroborator — listed on Resy, OpenTable, etc. |
| `mediaMention` | 1 | Corroborator — mentioned in editorial coverage |
| `matchingCategory` | 1 | Corroborator — category aligns with intake data |
| `matchingNeighborhood` | 1 | Corroborator — neighborhood aligns with intake data |
| `matchingPhone` | 1 | Corroborator — phone number matches across sources |

## Scoring

Confidence is computed as `sum(triggered_weights) / MAX_WEIGHT` where `MAX_WEIGHT = 10`.

This means a score of 1.0 is achievable without GPID:
- website (3) + instagram (2) + tiktok (2) + verifiedAddress (2) + mediaMention (1) = 10

And a taco cart with just Instagram + TikTok + a media mention scores 0.5 — enough to be tracked and potentially published.

## Publication Threshold

Entities are considered publishable when they have sufficient identity confidence **and** key fields populated. The identity score is one input to the coverage operations system, which also checks for:
- Coordinates (required for map placement)
- Name (required)
- At least one contact/social anchor

## Implementation

- **Scoring function**: `lib/identity-enrichment.ts` → `computeConfidence()`
- **Anchor extraction**: `lib/identity-enrichment.ts` → `AnchorSet` interface
- **Name matching (identity scoring)**: Jaro-Winkler similarity ≥ 0.85 for near-exact matches
- **Name matching (GPID backfill)**: When `backfill-google-places.ts` searches by name (no pre-existing GPID or address), it guards against linking the wrong place using: (1) Jaro-Winkler ≥ 0.55 OR (2) substring containment (entity name ⊂ Google name or vice versa). Both must fail to reject. Our curated entity name is never overwritten by Google's display name — Google provides GPID, coords, hours, and photos only.
- **Coverage integration**: `lib/coverage/issue-scanner.ts` flags `unresolved_identity` only when GPID is missing — but this does NOT block publication if other anchors are sufficient

## Design Rationale

### Why not just use GPID?

1. **Taco carts and mobile vendors** — the core use case for Saiko. Many operate without a Google listing. Requiring GPID means excluding the most interesting, hardest-to-find places.

2. **New businesses** — Google Places listings lag behind real-world openings by weeks or months. A new restaurant with an Instagram, a website, and an Eater review is clearly a real entity.

3. **Data independence** — over-reliance on a single external provider (Google) creates brittleness. Multiple independent anchors provide more robust identity than one strong signal.

### Why weighted, not boolean?

A binary "has GPID = verified" model can't express nuance. A place with GPID but no other signals might be a closed business with a stale listing. A place with Instagram + TikTok + two media mentions but no GPID is clearly real. The weighted model captures this.

### Why these specific weights?

- **GPID at 4**: Google has done verification work (business owner claimed the listing, or Street View confirmed it). High signal but not insurmountable.
- **Website at 3**: An official website requires effort to create and maintain. Strong signal of an established business.
- **Social at 2 each**: Active social presence confirms the entity exists and is operating. Two platforms are worth more than one (independence).
- **Corroborators at 1 each**: These confirm but don't independently establish identity. A matching phone number is good, but phone numbers can be wrong or reused.

---

## ARCH-SOCIAL-FIELDS-V1

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/social-fields-spec-v1.md` |
| **Last Updated** | 2026-03-14 |
| **Summary** | Specification for social media handle fields on entities (Instagram, TikTok). Covers storage format, discovery, validation, identity weight, and the sentinel value convention for confirmed-none. |
| **Systems** | entities, coverage-operations, identity-enrichment |

# Social Fields — Entity-Level Specification

## Fields

| Column | Table | Type | Example value | Identity weight |
|--------|-------|------|---------------|-----------------|
| `instagram` | entities | TEXT, nullable | `tacos1986` | 2 |
| `tiktok` | entities | TEXT, nullable | `tacos1986official` | 2 |

## Storage Convention

- Store the **handle only** — no `@` prefix, no full URL
- Example: `tacos1986` not `@tacos1986` not `https://instagram.com/tacos1986`
- Sentinel value `NONE` means "confirmed this entity has no account on this platform"
- `NULL` means "unknown / not yet checked"

## Discovery Methods

### Automated (via `/api/admin/tools/discover-social`)

1. **Surface extraction** — if `merchant_surfaces` has an instagram/tiktok surface, extract handle from the URL
2. **Claude-powered search** — searches `"{entity name} {city} instagram/tiktok"`, extracts handle from results, validates format
3. **Website scraping** — `lib/website-enrichment/links.ts` extracts social links from entity websites (`instagram.com` → `instagram`, pattern extensible to TikTok)

### Manual (via Coverage Ops UI)

- Inline text field per issue row — paste handle directly
- "None" button — sets sentinel `NONE` value
- Google search link — opens `"{entity name} Los Angeles"` in new tab for manual lookup

## Validation

Handles must match: `/^[a-zA-Z0-9._]+$/`

Rejected patterns:
- Full URLs (extract handle instead)
- Post/reel/story URLs (not profile URLs)
- Literal strings `none`, `null`
- Empty or whitespace-only

## Integration Points

Social fields are wired into:

| System | File | What it does |
|--------|------|-------------|
| Issue scanner | `lib/coverage/issue-scanner.ts` | Flags `missing_instagram` / `missing_tiktok` (LOW severity) |
| Coverage Ops UI | `app/admin/coverage-ops/page.tsx` | Inline editing, discovery buttons, bulk actions |
| Identity scoring | `lib/identity-enrichment.ts` | Weight 2 each in anchor model |
| Place page API | `app/api/places/[slug]/route.ts` | Returns handles in response |
| Action strip | `components/merchant/ActionStrip.tsx` | Links to profile |
| Location card | `components/LocationCard.tsx` | Shows handle with link |
| Market facts | `components/merchant/MarketFactsCard.tsx` | Shows handle with link |
| Fields v2 | `lib/fields-v2/write-claim.ts` | Claim-to-entity mapping |
| Entity patch | `app/api/admin/entities/[id]/patch/route.ts` | Allows saving via API |

## Why TikTok?

TikTok is a first-class social field because:
1. **Street food discovery** — taco carts, pop-ups, and mobile vendors use TikTok as their primary (sometimes only) online presence
2. **Food reviewer platform** — reviewers post TikTok videos that drive significant discovery traffic
3. **Identity signal** — for entities without GPID or website, TikTok + Instagram together provide weight 4 in identity scoring, approaching the value of GPID alone (weight 4)

## Future: Additional Platforms

The same pattern can extend to other platforms (YouTube, X/Twitter, Threads) by:
1. Adding a nullable TEXT column to entities
2. Adding to `ANCHOR_WEIGHTS` in identity-enrichment
3. Adding `missing_{platform}` rule to issue scanner
4. Adding inline editing in Coverage Ops
5. Adding discovery mode to `discover-social` route

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

## ARCHITECTURE-INSTAGRAM-API-INTEGRATION-V1

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/instagram-api-integration-v1.md` |
| **Last Updated** | 2026-03-13 |
| **Summary** | Instagram Graph API integration state — Meta app config, permissions, verified endpoints, architectural models for media ingestion |

# Instagram API Integration — Current State

## Objective

Enable Saiko to access Instagram media via the official Instagram Graph API to support potential ingestion of media signals for places, merchants, and editorial surfaces.

This work establishes the first authenticated API connection between the Saiko system and Instagram.

## Current Status: Operational

The following capabilities are now operational.

### Meta Developer App

- **App name:** TRACES THREE
- **Platform:** Meta Developer Platform
- **Purpose:** Provides authenticated access to the Instagram Graph API

### Permissions Configured

Core permission:
- `instagram_business_basic`

Supporting permissions (via "Manage messaging & content on Instagram" use case):
- `instagram_manage_comments`
- `instagram_business_manage_messages`

### Account Connected

- **Username:** rjcicc
- **User ID:** 26071220029153617
- Successfully authorized for the application

### Access Token

- Working OAuth access token generated and stored
- **Location:** `.env.local` as `INSTAGRAM_ACCESS_TOKEN`
- Server-side only, not exposed to browser

### Verified Endpoints

**Identity:** `GET https://graph.instagram.com/me` — returns id + username

**Media:** `GET /me/media?fields=id,caption,media_type,media_url,permalink,timestamp` — returns media IDs, captions, image URLs, post timestamps, permalinks

## What This Enables

The system can programmatically retrieve:
- Instagram media, captions, timestamps, permalinks, media types

Potential integration points:
- Place pages
- Editorial surfaces
- Ingestion pipelines
- Media galleries

## Important API Constraints

The official Instagram API does **not** allow arbitrary scraping of other accounts. The API only returns data for:

1. Instagram accounts that authenticate with our app
2. Accounts we own or manage

This means the API cannot automatically ingest media from restaurants or venues unless they authorize the application. This constraint has architectural implications for Saiko's ingestion pipeline.

## Recommended Next Steps

### 1. Token Security

Rotate the access token (exposed during testing). Implement:
- `.env.local` storage (done)
- Server-side usage only (done)
- Periodic refresh policy (pending)

### 2. Server-Side Fetch Route

Add a backend endpoint (e.g. `/api/instagram/media`) to retrieve Instagram media using the stored token, so internal services can query without exposing tokens.

### 3. Media Ingestion Strategy

Three potential architectural models:

| Model | Description | Pros | Cons |
|-------|------------|------|------|
| **A — Merchant Authorization** | Restaurants authenticate their Instagram account | Fully compliant, reliable, scalable | Requires merchant participation |
| **B — Editorial Media Curation** | Editors manually attach Instagram posts to places | High quality, compliant, simple | Manual process |
| **C — Hybrid Signal Model** | Instagram as supplemental media source where available | Flexible, supports curated content | Inconsistent coverage |

**Recommended first version:** Editorial Media Attachment — editors select posts, system stores permalink + media_url + caption + timestamp, media displays on place pages. No scraping required.

### Longer-Term Opportunities

If Instagram becomes strategically important:
- Merchant account connection flow
- Automated media ingestion
- Instagram signal analysis (popularity/activity)
- Social discovery layers

## Key Takeaway

Instagram API integration is operationally verified. The next step is architectural: how Instagram media should be incorporated into the Saiko data and ingestion model.

---

## ARCHITECTURE-INSTAGRAM-IMPLEMENTATION-V1

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/instagram-implementation-v1.md` |
| **Last Updated** | 2026-03-13 |
| **Summary** | Instagram integration implementation plan and system impact — tables, sync rules, temporal signals, interpretation layer, photo strategy, attachment model. V0.2 adds current state assessment, implementation phases, and data review results. |
| **Systems** | instagram-api, enrichment-pipeline, merchant-surfaces |

# Instagram Integration — Implementation & Impact Doc

**Version:** 0.2
**Draft Date:** 2026-03-13
**Author:** Bobby / Claude
**Status:** Pre-engineering handoff — data review complete

## 1. Purpose & Architectural Intent

This document defines the implementation plan and system impact assessment for adding Instagram as a data source to the Saiko platform. It is intended as a handoff to engineering and as a seed document for the knowledge base.

Instagram is not just another data source. It is categorically different from every source we have ingested to date. Website content is foundational but static — updated infrequently, written for marketing purposes, not for communication. Google Business Profile is slow and aggregated. Editorial coverage is episodic and externally authored. Instagram is the merchant speaking directly, regularly, in their own voice, about what is happening right now.

Our places are alive. Instagram is what makes that true.

The architectural intent of this integration is to treat Instagram as a first-class input to the interpretation layer — not a bolt-on, not a supplemental source, but a primary merchant-authored voice that feeds signal extraction, confidence scoring, photo candidates, and contextual display. Every decision in this document should be made in service of that intent.

A secondary intent is to establish a pattern for ingesting broad, recurring datasets. Instagram is the first dataset of this type. The architecture we build here should be extensible — when the next dataset of this kind arrives, it should slot in cleanly without requiring every downstream feature to be individually updated.

## 2. Opportunities

Instagram unlocks capabilities that no other source in the current stack can provide. These are worth stating explicitly so the engineering team understands the editorial and product intent behind the technical work.

**Real merchant voice.** Instagram is the most direct line we have to how a place talks about itself. Website copy is written for conversion. Instagram is written for communication. That distinction matters for signal quality.

**Temporal pulse.** Instagram is the only source that tells us what is happening this week, today, hours ago. No other source in the stack has this property. This is a genuine and significant differentiation.

**Operational intelligence.** Closures, private events, hours changes, special menus, guest chefs — merchants post this information on Instagram before it appears anywhere else. In many cases it never appears anywhere else. We can have this information hours after it is posted.

**Visual intent.** Merchant-posted photos are editorially intentional. The merchant chose those images. They framed the shot. They decided it represented them. This is categorically different from user-submitted Google photos.

**Confidence lift.** Instagram signals can corroborate signals we were already extracting from other sources. A natural wine bar that mentions producers in their captions, describes their pours, posts about winemaker dinners — that is high-quality corroborating evidence for signals we may have only had weak confidence in before.

**Caption signal density.** Wine bars, natural wine focused restaurants, chef-driven spots — these entities often use captions to describe sourcing, producers, regions, dishes, philosophy. That is rich structured data hiding in plain text. It is some of the highest-quality signal we can extract relative to the cost of getting it.

**Contextual display.** Instagram is the data foundation for showing users information that is true right now, not just true in general. This is one of the most meaningful product differentiators we can build. Users learn that Saiko knows things other platforms do not. That builds trust compounding over time.

## 3. Current State & What's Already Done

As of 2026-03-13, significant infrastructure already exists. This section distinguishes what is built from what remains.

### Component Status

| Component | Status | Notes |
|---|---|---|
| `instagram_accounts` table | ✅ Schema exists | Empty — no ingestion run yet |
| `instagram_media` table | ✅ Schema exists | Empty — no ingestion run yet |
| `instagram_insight_snapshots` table | ✅ Schema exists | Empty |
| `instagram_temporal_signals` table | ❌ Not yet created | New — defined in Section 6 |
| `ingest-instagram.ts` | ✅ Operational | Business Discovery + batch + /me modes |
| API credentials | ✅ Configured | Never-expiring Page Access Token + IG User ID in `.env.local` |
| `merchant_surfaces` IG records | ✅ 90 rows exist | ~70 entities with discovered IG URLs |
| `entities.instagram` column | ⚠️ 7 populated | Quality issues; needs backfill from surfaces |
| API route serves IG handle | ✅ Working | Returns `entities.instagram` to client |
| Place page renders IG link | ✅ Working | StatusCell + primary CTAs |
| Caption signal extraction | ❌ Not built | Phase 2 |
| Temporal signal extraction | ❌ Not built | Phase 3 |
| Photo candidate scoring | ❌ Not built | Phase 4 |
| SceneSense IG wiring | ❌ Not built | Phase 5 |
| Contextual display UI | ❌ Not built | Phase 6 |

### Key Credentials

- **Facebook Page "Saiko Fields"** Graph API ID: `1048011751721611`
- **Instagram Business Account ID:** `17841401035810011`
- **Meta App:** TRACES THREE (app ID `1325848402713479`, development mode)
- **Token scopes:** `pages_show_list`, `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`
- **Token type:** Never-expiring Page Access Token (derived from long-lived user token)

### Handle Data Quality

The `entities.instagram` column has 7 entries but quality is poor. Meanwhile, `merchant_surfaces` has 90 instagram URLs across ~70 entities discovered by the surface pipeline. There is an immediate opportunity to backfill `entities.instagram` from `merchant_surfaces` by extracting clean handles from surface URLs.

Known handle issues:
- `LA Tutors 123` has literal string `"null"` (not SQL NULL)
- `Mochomitoss` has full URL `https://www.instagram.com/mochomitosss/` instead of clean handle
- Several handles don't resolve via Business Discovery (account may not be Business/Professional type)

### Batch Dry Run Results (2026-03-13)

| Entity | Handle | Status | Posts | Followers |
|---|---|---|---|---|
| Brothers Cousins | @brotherscousinstacos | ✅ Found | 209 | 61,721 |
| Tacos El Toro | @tacoseltoro_ | ✅ Found | 929 | 32,994 |
| Tacos Pasadita | @tacospasadita_ | ✅ Found | 30 | 2,911 |
| Balam Kitchen | @balammexicankitchen | ❌ Not found | — | — |
| Seco | @secolosangeles | ❌ Not found | — | — |
| Mochomitoss | @mochomitosss | ❌ Not found | — | — |
| LA Tutors 123 | @null | ❌ Bad data | — | — |

### Caption Data Observations

From the three successful accounts, caption characteristics vary significantly:
- **Brothers Cousins:** Bilingual (English/Spanish), operational content (location announcements, hours, closures), moderate caption length
- **Tacos El Toro:** Primarily Spanish, personal/storytelling content mixed with operational info, high posting cadence (929 posts)
- **Tacos Pasadita:** Primarily Spanish, location-focused, shorter captions with emoji-heavy formatting

This is a small sample skewed toward taco trucks. The ~70 entities with `merchant_surfaces` instagram records include fine dining, wine bars, and chef-driven restaurants likely to have richer caption signal density for SceneSense extraction.

### Platform Constraint

The TRACES THREE app is in **development mode**. All API calls are limited to test users and business accounts that have granted access. Before batch ingest at scale, the app will need Meta App Review approval. This is not a blocker for the current entity set but will be for production scale.

## 4. Affected Systems

The following systems are affected by the Instagram integration. This is not an exhaustive engineering audit — it is a map of known impact areas. Engineering should treat this as a starting point for discovery, not a complete specification.

**Data layer:** Three new tables, merchant_surface attachment, place_coverage_status freshness fields, interpretation_cache new input source, confidence scoring model.

**Ingest layer:** New fetch job for account and media, insights ingest job, caption extraction job, temporal and operational signal extraction job, future visual analysis job.

**Interpretation layer:** SceneSense and language_signals pipeline, ABOUT synthesis path, confidence scoring model, signal TTL and expiry concept which does not yet exist.

**API layer:** `/api/places/[slug]` route which will need to pull from new data sources, data contract in `place-page.ts` which will need homes for Instagram fields.

**Rendering layer:** Links rail for Instagram URL, Photos section for merchant IG candidates, ABOUT section where IG bio and captions enter the source hierarchy, SceneSense indirectly via language_signals.

**Voice layer:** ABOUT synthesis path needs to know Instagram exists and how to weight it. Caption register awareness — Instagram language is shorter and more casual than website copy and should not bleed into rendered output tone. Merchant voice fidelity — Instagram is the highest-trust merchant voice signal we have. Temporal voice signals — time-bound language in captions must be recognized and not absorbed into evergreen identity copy.

**Operational:** Fetch cost and rate limit management, storage growth planning, re-parse capability via raw payload preservation.

## 5. Tables

Three tables already exist in the Prisma schema (empty, never populated). A fourth for temporal signals is new and defined in Section 7.

### instagram_accounts

One record per connected Instagram account. Links to merchant_surface.

**Fields:** internal id, merchant surface link, instagram_user_id, username, account_type, media_count, canonical_instagram_url, last_fetched_at, last_successful_fetch_at, source_status, raw_payload.

**Derived fields:** latest_post_at, posting_cadence_30d, posting_cadence_90d, is_active_recently.

**Sync rule:** Overwrite mutable fields on each fetch, keep latest raw_payload.

### instagram_media

One record per post. Upsert by instagram_media_id.

**Fields:** internal id, instagram_media_id (unique), instagram_user_id, media_type, media_url, thumbnail_url, permalink, caption, timestamp, fetched_at, raw_payload.

**Derived fields:** caption_present, caption_length, posted_day_of_week, posted_hour_local, is_recent_post, signal_extracted_at, is_display_candidate, visual_analysis_run.

- `signal_extracted_at` tracks which posts have been run through caption extraction and when, supporting re-extraction if the model improves.
- `is_display_candidate` is a boolean flag for the photo scoring layer.
- `visual_analysis_run` is a boolean that future-proofs the schema for image analysis without requiring it now.

**Sync rule:** Upsert by instagram_media_id, preserve original timestamp, refresh mutable fields if changed.

### instagram_insight_snapshots

Append only. Never overwrite old values.

**Fields:** internal id, subject_type (account or media), subject_id, metric_name, metric_value, observed_at, window_label, raw_payload.

**Metrics:** impressions, reach, engagement.

**Sync rule:** Append only on every fetch. Historical snapshots are the record.

## 6. Sync & Ingest Rules

Each table has a distinct sync behavior. These are not interchangeable.

**Accounts overwrite.** Each fetch overwrites mutable fields. Accounts do not change frequently enough to require history. Keep latest raw_payload.

**Media upsert.** Upsert by instagram_media_id. Never duplicate a post. Preserve original timestamp — that is immutable, it is when they posted. Refresh mutable fields if changed since caption edits happen.

**Insights append only.** Every fetch creates a new snapshot row. This is how trending and cadence analysis gets built over time.

**Fetch cadence** is an open question to be resolved after data review. Options include daily for active accounts, every 48-72 hours for lower cadence accounts, or dynamic cadence driven by is_active_recently. Whatever cadence is chosen, the ingest job must be designed around Instagram API rate limits from day one, not retrofitted. Scheduling needs to account for rate limit headroom across the full merchant set.

**Raw payloads** are preserved on all three tables specifically so signals can be re-extracted later without re-fetching. This is a deliberate cost decision. We paid for the fetch. We should be able to use it more than once.

## 7. Temporal Signal Architecture

This is the most novel section in the document. Nothing in the current system thinks about time the way Instagram requires. This section defines a new signal class that did not previously exist in the platform.

Every other source produces evergreen signals. A website that says "wood-fired, seasonal, natural wine focused" is probably saying the same thing next year. Instagram produces both evergreen signals and perishable ones. The architecture must tell them apart.

**Evergreen signals** are extracted from captions and treated as stable identity information. Examples: "we source from small producers," "wood-fired open fire cooking," "natural wine focused." These flow into language_signals and through the existing SceneSense pipeline. No expiry.

**Temporal and operational signals** are time-bound. They are only true for a specific window. Examples: "closed this Sunday for a private event," "guest chef dinner Friday only," "truffle menu through end of March," "we will be at the farmers market Saturday." These require different handling entirely.

Temporal signals need what evergreen signals do not:
- A `valid_from` and `valid_until` or TTL field
- Separation from evergreen signal storage so they do not flow into SceneSense or ABOUT
- Their own extraction job that specifically looks for date and event language
- A display path that does not yet exist but must be designed for

**The trust implication** is the most operationally critical point in this document. If Saiko displays hours or open status that contradicts what a merchant posted on Instagram hours ago, that is a trust problem. Temporal signals from Instagram should be treated as higher recency authority than any other source on operational matters.

**Capture now, display later.** The display UI for temporal signals does not exist yet. That is acceptable. The capture infrastructure must exist from day one. Six months of event and closure data thrown away because the UI was not ready is not acceptable.

This architecture is the technical foundation for contextual display as a product capability. Contextual display — surfacing information that is true right now, not just true in general — is one of the most meaningful differentiators Saiko can build. Instagram is what makes it possible.

### instagram_temporal_signals

**Fields:** internal id, instagram_media_id (source post), signal_type (closure / event / hours_change / special_menu / other), signal_text (extracted language), valid_from, valid_until, confidence, extracted_at, is_expired.

A scheduled job will need to run expiry sweeps to set is_expired as signals age out.

**Open question:** How do temporal signals interact with `entities.hours`? If a post says "closed Sunday" but hours say open, who wins and does anything in the UI surface the conflict? This is a product decision to be made when contextual display is scoped.

## 8. Interpretation Layer Impact

Every interpretation feature in the current stack was built against a fixed input set. Instagram expands that input set in ways that are largely positive but require awareness before wiring.

Generally speaking Instagram provides another rich dataset for interpretation features to draw on. SceneSense gains more language_signals input. ABOUT synthesis gains more merchant text to work from. Confidence scoring gains a new corroborating source. These are additive improvements.

The concern worth flagging is that features may have been built with hardcoded assumptions about where signals come from. A feature that knows to look at specific fields from specific sources will not automatically know Instagram exists. Before wiring Instagram signals into any interpretation feature, engineering should audit how that feature currently sources its inputs and whether source assumptions are hardcoded.

**Flag for engineering review:** Before Instagram signals can be fully utilized by interpretation features, identify which features have hardcoded source assumptions that need to be made more flexible. This is not a blocker but it is a known risk area. Features most likely to be affected based on current knowledge:
- ABOUT synthesis path
- SceneSense and language_signals ingestion
- Confidence scoring model
- Identity line assembly

The longer-term architectural direction this points toward is a **source arbitration layer** — a unified signal pool with source, recency, and confidence attached, from which features draw without needing to know the specific origin. Instagram is the forcing function that makes this worth designing toward. Engineering should be aware of this direction even if the refactor is deferred.

## 9. Photo Strategy

Instagram photos should be ingested using the same pipeline philosophy as Google photos. The goal is a unified pool of quality-vetted photo candidates with source metadata attached. The rendering layer — TRACES — decides what gets displayed. The data layer surfaces the best candidates it can.

**The data layer is responsible for:**
- Ingesting the media
- Assessing quality signals (resolution, aspect ratio)
- Flagging display candidates via `is_display_candidate` on instagram_media
- Preserving source and recency metadata so TRACES can factor them into display decisions

**The data layer is not responsible for:**
- Deciding which photos get shown
- Ranking merchant Instagram above Google in the UI
- Any display logic

**Flag for engineering:** Instagram photo ingestion should mirror the existing Google photo pipeline wherever possible. Do not build a separate system. Extend what exists. TRACES consumes from a unified candidate pool with source metadata, not from source-specific photo tables. Review how the Google photo pipeline currently works before building the Instagram photo ingest path.

## 10. Attachment Model

Instagram attaches to `merchant_surface` first, not directly to `entities`. This is the structural decision that everything else depends on.

The chain is: `entities` → `merchant_surface` → `instagram_accounts` → `instagram_media` and `instagram_insight_snapshots`.

This keeps Instagram as a source record — a signal contributor — not a core identity record. `merchant_surface` is the right abstraction layer because it is where all merchant-authored sources live. Instagram is one of them. A place can exist in `entities` without an Instagram account. Instagram is additive, not load-bearing.

**Hard dependency:** `merchant_surface` must exist and be wired to entities before Instagram attachment works. If that table is not yet built, this is the first thing to resolve. Everything downstream — signal extraction, photo candidates, ABOUT sourcing, confidence scoring — depends on this link being clean.

**Unmatched accounts:** The ingest job needs a fallback state for Instagram accounts that cannot be confidently matched to an entity. Proposed: `source_status` set to `unmatched`. Unresolved accounts should not be dropped — they should be queued for review. Identity resolution for unmatched accounts is an open question.

## 11. Future Considerations

These are capabilities the architecture should not close the door on. Engineering should be aware they are coming.

**Visual signal extraction.** Running image analysis on display candidate photos. Dish recognition, ambiance signals, lighting, spatial density. Feeds SceneSense and confidence scoring. Schema is already designed to support this via `visual_analysis_run` flag on instagram_media. Cost model needs to be defined before building — run only on display candidates, not the full media archive. Do not build now.

**Contextual display.** The product expression of temporal signals. Surfacing time-bound information directly on the place page — closures, events, special menus, hours changes. `instagram_temporal_signals` is designed for this. Display UI does not exist yet but capture infrastructure will from day one.

**Signal expiry and TTL.** As temporal signals accumulate a scheduled expiry sweep job will be needed to set `is_expired` and keep the active signal pool clean.

**Source arbitration layer.** As the source set grows, individual features should not need to know where signals come from. A unified signal pool with source, recency, and confidence attached would make the interpretation layer source-agnostic. Instagram is the forcing function. Design toward this even if the refactor is deferred.

**Event detection and display.** Instagram posts about events are captured as temporal signals but not yet parsed for structured event data. A future extraction job could identify event type, date, and time and surface it as a dedicated display element.

**Merchant direct upload.** Instagram is a proxy for merchant-curated photos. Eventually merchants may upload directly. The photo pipeline should be designed so direct uploads slot into the same candidate pool without architectural changes.

**Instagram as identity signal.** For entities where Instagram is the primary or only merchant-authored presence, there may be a future case for Instagram signals contributing to identity line assembly. Not now.

## 12. Implementation Phases

### Phase 0 — Plumbing (DONE)
- ✅ `instagram_accounts`, `instagram_media`, `instagram_insight_snapshots` tables in schema
- ✅ `ingest-instagram.ts` script operational (Business Discovery, batch, /me modes)
- ✅ API credentials configured (never-expiring Page Access Token + IG User ID)
- ✅ `merchant_surfaces` has 90 instagram surface records across ~70 entities
- ✅ API route returns instagram handle; place page renders instagram link

### Phase 1 — Data Quality & First Real Ingest
- Backfill `entities.instagram` from `merchant_surfaces` (extract handles from ~90 URLs)
- Validate handles against Business Discovery API, flag unresolvable
- Fix known bad data (literal `"null"`, full URLs instead of handles)
- Run first real `--batch` ingest (populate `instagram_accounts` + `instagram_media`)
- Data review: caption length distribution, posting cadence, signal density across merchant types

### Phase 2 — Caption Signal Extraction
- Build caption extraction job (evergreen signals → `language_signals`)
- Wire extracted signals into Stage 5 (identity signal extraction) as supplemental input
- Define signal taxonomy: cuisine markers, producer mentions, philosophy language, dish names
- Handle bilingual content (significant Spanish-language caption presence in current data)

### Phase 3 — Temporal Signals
- Create `instagram_temporal_signals` table (new — only table not yet in schema)
- Build temporal extraction job (closures, events, hours changes, special menus)
- Build expiry sweep job (`is_expired` flag management)
- Capture-only — no display UI yet

### Phase 4 — Photo Candidate Pipeline
- Score `instagram_media` for display candidacy (`is_display_candidate`)
- Integrate into unified photo candidate pool alongside Google photos
- Source metadata preserved for TRACES rendering decisions

### Phase 5 — Interpretation Layer Wiring
- Audit hardcoded source assumptions in SceneSense, ABOUT synthesis, confidence scoring
- Wire Instagram signals into confidence model as corroborating source
- Caption register awareness for ABOUT synthesis (Instagram tone ≠ website tone)

### Phase 6 — Contextual Display
- Design temporal signal display UI
- Define minimum confidence thresholds for surfacing closures/events
- Product decision: Instagram vs. Google hours conflict resolution

## 13. Open Questions

### Data review (partially answered 2026-03-13)

- ✅ **What does the actual Instagram data look like?** — See Section 3. Three accounts resolved: Brothers Cousins (209 posts, 61K followers), Tacos El Toro (929 posts, 33K followers), Tacos Pasadita (30 posts, 2.9K followers). Small sample skewed toward taco trucks. Broader data review needed after Phase 1 handle backfill.
- ✅ **Is `merchant_surface` built and wired?** — Yes. 90 instagram surface records exist across ~70 entities. Surface types: homepage (115), about (89), instagram (90), contact (84), menu (74), reservation (10), drinks (4).
- ⏳ What percentage of merchants have active accounts vs dormant vs none? (Needs Phase 1 backfill first)
- ⏳ What is the average caption length and quality across the full set?
- ⏳ How many posts per week across the corpus?
- ⏳ What percentage of captions have extractable signals vs noise?

### Engineering discoveries

- ✅ **Is `merchant_surface` built and wired to entities?** — Yes. Resolved.
- Which interpretation features have hardcoded source assumptions that need refactoring before Instagram signals can flow in cleanly?
- How does the existing Google photo pipeline work and how cleanly can Instagram photos be added to it?
- What is the current confidence scoring model and where does source weighting live?

### Product decisions

- What is the fetch cadence for active vs inactive accounts?
- What is the TTL for temporal signals?
- When does contextual display activate — what is the minimum signal confidence to surface a closure or event on the place page?
- Does the References section need to acknowledge Instagram as a source?
- How do we handle cases where Instagram signals contradict existing entity data — who wins?

### Cost decisions

- What is the fetch cost across the full merchant set at various cadences?
- What does visual analysis cost per image and what is the break-even on display candidates only?
- What is the storage growth rate at current merchant set size and at projected scale?

### Identity resolution

- What happens to Instagram accounts that cannot be matched to an entity?
- Is there a review queue for unmatched accounts or do they sit in `source_status = unmatched` indefinitely?

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-13 | Initial implementation doc from planning session | Bobby / Claude |
| 0.2 | 2026-03-13 | Added current state (Section 3), implementation phases (Section 12), answered open questions from data review, renumbered sections | Bobby / Claude |

---

## ARCHITECTURE-INSTAGRAM-INGESTION-V1

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/instagram-ingestion-field-spec-v1.md` |
| **Last Updated** | 2026-03-13 |
| **Summary** | Instagram ingestion schema — 3 tables, field definitions, sync rules. Engineering handoff for migration + Prisma models. |

# Instagram Ingestion — Field Spec v1

## Scope

Ingest Instagram as a merchant-authored data source. Store account identity,
media records, captions, activity/freshness signals, and insights snapshots.

**Excluded from v1:** like_count, comments_count, location metadata.

---

## Tables

### 1. `instagram_accounts`

One row per connected Instagram account. Mutable — overwrite on each fetch.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PK, default uuid | Internal ID |
| `entity_id` | TEXT | FK → entities.id CASCADE, NOT NULL | Links account to entity |
| `instagram_user_id` | TEXT | UNIQUE, NOT NULL | IG API user ID |
| `username` | TEXT | NOT NULL | Handle (no @) |
| `account_type` | TEXT | | BUSINESS, CREATOR, PERSONAL |
| `media_count` | INT | | From API |
| `canonical_instagram_url` | TEXT | | `https://instagram.com/{username}` |
| `last_fetched_at` | TIMESTAMPTZ | | Last fetch attempt |
| `last_successful_fetch_at` | TIMESTAMPTZ | | Last 2xx fetch |
| `source_status` | TEXT | NOT NULL, default 'active' | active, revoked, error |
| `raw_payload` | JSONB | | Full API response |
| `created_at` | TIMESTAMPTZ | default now() | |
| `updated_at` | TIMESTAMPTZ | default now() | |

**Indexes:**
- `entity_id`
- `instagram_user_id` (unique)
- `username`

**Derived (compute in app, not stored):**
- `latest_post_at` — max(instagram_media.timestamp) for this account
- `posting_cadence_30d` / `posting_cadence_90d` — count of posts in window
- `is_active_recently` — post within last 30 days

---

### 2. `instagram_media`

One row per post/media object. Upsert by `instagram_media_id`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PK, default uuid | Internal ID |
| `instagram_media_id` | TEXT | UNIQUE, NOT NULL | IG API media ID |
| `instagram_user_id` | TEXT | NOT NULL | FK-like ref to account |
| `media_type` | TEXT | NOT NULL | IMAGE, VIDEO, CAROUSEL_ALBUM |
| `media_url` | TEXT | | CDN URL (expires) |
| `thumbnail_url` | TEXT | | For VIDEO type |
| `permalink` | TEXT | NOT NULL | Permanent IG URL |
| `caption` | TEXT | | Full caption text |
| `timestamp` | TIMESTAMPTZ | NOT NULL | Original post time (immutable) |
| `fetched_at` | TIMESTAMPTZ | NOT NULL, default now() | When we fetched it |
| `raw_payload` | JSONB | | Full API response |

**Carousel fields (stored in raw_payload):**
- `children.data[].id` — child media IDs
- `children.data[].media_type`, `media_url` — child details

**Indexes:**
- `instagram_media_id` (unique)
- `instagram_user_id`
- `timestamp`
- `(instagram_user_id, timestamp)` — activity queries

**Derived (compute in app, not stored):**
- `caption_present` — caption IS NOT NULL
- `caption_length` — char_length(caption)
- `posted_day_of_week` / `posted_hour_local` — from timestamp
- `is_recent_post` — timestamp within 30 days

---

### 3. `instagram_insight_snapshots`

Append-only. One row per metric observation. Never update or overwrite.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PK, default uuid | Internal ID |
| `subject_type` | TEXT | NOT NULL | 'account' or 'media' |
| `subject_id` | TEXT | NOT NULL | instagram_user_id or instagram_media_id |
| `metric_name` | TEXT | NOT NULL | impressions, reach, engagement |
| `metric_value` | DECIMAL(12,2) | NOT NULL | |
| `observed_at` | TIMESTAMPTZ | NOT NULL, default now() | When snapshot taken |
| `window_label` | TEXT | | 'day', 'week', 'days_28', 'lifetime' |
| `raw_payload` | JSONB | | Full API response for this metric |

**Indexes:**
- `(subject_type, subject_id)`
- `(subject_id, metric_name, observed_at)` — time series
- `observed_at`

---

## Sync Rules

### Accounts
- **Overwrite** mutable fields on each fetch (username, media_count, account_type, source_status, raw_payload)
- **Preserve** created_at
- **Update** last_fetched_at on every attempt; last_successful_fetch_at on success only

### Media
- **Upsert** by `instagram_media_id`
- **Never overwrite** `timestamp` (original post time is immutable)
- **Refresh** mutable fields: media_url, thumbnail_url, caption, raw_payload, fetched_at

### Insights
- **Append only** — insert new row for each observation
- **Never update** existing rows
- Dedup logic: skip insert if (subject_id, metric_name, observed_at, window_label) already exists

---

## Source Registry Entry

Add to `source_registry` (Fields v2):

```
id:              'instagram_api'
display_name:    'Instagram API'
source_type:     SOCIAL
trust_tier:      3
requires_human:  false
base_domain:     'instagram.com'
is_active:       true
```

---

## Entity Linkage

Instagram accounts attach to **entities** via `entity_id` FK.

This is consistent with merchant_surfaces, merchant_surface_scans, and all
Fields v2 tables. The account is a source record, not an identity record.

---

## Build Sequence

1. Migration: create 3 tables + indexes
2. Prisma schema: add 3 models
3. Seed: add `instagram_api` to source_registry
4. Ingest script: account + media fetch (stages 1–2)
5. Ingest script: insights fetch (stage 3)
6. Downstream: caption cue extraction (on top of media table)
7. Downstream: visual analysis (future)

---

## COVOPS-APPROACH-V1

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/coverage-ops-approach-v1.md` |
| **Last Updated** | Fri Mar 13 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Architectural position for Coverage Operations — introduces entity_issues as a unified operational layer over existing queue fragments, with tool readiness assessment and phased implementation plan. |
| **Systems** | coverage-operations, fields-data-layer, data-pipeline |

# Coverage Operations — Architectural Position

---

## Current State

Saiko currently contains several specialized queue and conflict systems:

- `review_queue`
- `gpid_resolution_queue`
- `sanction_conflicts`

These tables serve specific pipeline workflows, primarily around identity resolution and canonical sanctioning.

They are not designed to function as a unified operational system for entity repair.

As a result, we currently have:

- the ability to detect problems
- the ability to run enrichment and resolution tools
- several specialized review queues

But we do not have a single operational surface that represents:

> "This entity has this problem, and here is the next action required to resolve it."

This is why Coverage Operations currently cannot exist as a true work queue.

---

## The Structural Gap

The schema today contains **queue fragments, not a queue system**.

| Table | Purpose |
|-------|---------|
| `review_queue` | Raw-record identity merge review |
| `gpid_resolution_queue` | GPID matching review |
| `sanction_conflicts` | Canonical claim conflict arbitration |

These are pipeline-level objects, not operator-level tasks.

Coverage Operations requires a new abstraction: **entity-level operational issues**.

---

## Queue Inventory — Why Each Is Insufficient Alone

### review_queue

Built around `raw_id_a`, `raw_id_b`, `canonical_id`. Workflow vocabulary is merge/review resolution.

Serves: low-confidence matches, duplicate review, new canonical decisions, pre-canonical identity review.

Not suitable for Coverage Operations because:
- anchored to raw records, not entity-level operational problems
- heavily identity-specific
- workflow vocabulary is about merge/review resolution, not repair actions

**Recommendation:** keep for what it is. Do not stretch into Coverage Operations.

### gpid_resolution_queue

Has `entityId`, resolver output, candidate GPID, human review status, reason codes.

Closest in spirit, but too narrow. Cannot cover location repair, contact repair, social confirmation, editorial thinness.

Currently has **0 rows** — exists structurally but is not yet the operational center of gravity.

**Recommendation:** keep as a specialized engine / detail table. Let Coverage Operations reference it, not depend on it as the main abstraction.

### sanction_conflicts

Field conflict detection, sanctioning arbitration, claim-level resolution.

Useful for identity conflicts, contact conflicts, classification disputes. But too narrow and too backend-facing for the operator workflow.

**Recommendation:** may feed issues later, but should not be the primary UI object.

---

## The Proposed Addition

Introduce a new operational table: **`entity_issues`**

Each row represents one actionable problem associated with an entity.

Examples:

- Secco → missing website → needs human confirmation
- Mariscos Jalisco → unresolved identity → run GPID resolver
- Gjusta → thin editorial coverage → search articles

This table becomes the single operational source for Coverage Operations.

---

## Architectural Relationship

Existing systems remain unchanged. They become inputs to the issue generation layer.

```
entities
canonical_entity_state
review_queue
gpid_resolution_queue
sanction_conflicts
editorial coverage signals
        ↓
  issue generator
        ↓
  entity_issues
        ↓
  Coverage Operations UI
```

The UI reads only from `entity_issues`.

This prevents the UI from needing to interpret complex pipeline logic directly.

---

## Why This Layer Is Necessary

Without an issue layer, Coverage Operations would need to infer problems dynamically from multiple sources:

- entity fields
- canonical state
- queue statuses
- enrichment stages
- conflict records

This creates brittle UI logic and tightly couples the interface to internal pipeline behavior.

The issue layer isolates those concerns. It converts pipeline signals into operator-facing tasks.

---

## Important Design Principle

For Coverage Ops v1, `entity_issues.issue_type` is intentionally **field-level** so each row maps to one deterministic action in the UI.

Examples:
```
missing_hours
missing_menu_link
missing_price_level
missing_instagram
```

Workflow grouping is handled by `problem_class` (identity, location, contact, social, editorial), not by changing the issue type contract.

This keeps automation and operator actions straightforward while preserving a workflow-level view in lanes.

---

## Operational States

Each issue has a state representing the next action required.

```
needs_automation → processing → needs_human → resolved
                                           → suppressed
```

These states power the triage board in Coverage Operations.

---

## Example Issues

```
entity: Mariscos Jalisco
problem_class: identity
issue_type: unresolved_match
state: needs_automation
recommended_tool: google_places_lookup
blocking_publish: true
```

```
entity: Secco
problem_class: contact
issue_type: missing_website
state: needs_human
recommended_tool: confirm_none
blocking_publish: false
```

---

## Confirmed None Rule

Optional attributes require a persistent confirmation state.

```
website_status = confirmed_none
instagram_status = confirmed_none
phone_status = confirmed_none
```

Once confirmed, the issue generator stops producing issues for that attribute. This prevents repeated alerts and keeps queues manageable.

---

## Operational Insight — Same Symptom, Different Workflows

The current coverage dashboard surfaces symptoms, not problems.

Example: 40 entities show unknown neighborhood.

Analysis shows:
- 25 already have GPID
- 15 do not

These represent two different workflows:

**Case A — GPID exists:**
```
problem_class: location
issue_type: missing_neighborhood
tool: derive_neighborhood
```

**Case B — GPID missing:**
```
problem_class: identity
issue_type: unresolved_match
tool: google_places_lookup
```

A field-based dashboard cannot distinguish these cases cleanly. An issue system can.

---

## Editorial Coverage

Editorial coverage does not currently require new storage primitives.

Existing signals include:
- `entities.editorialSources`
- `coverage_sources`
- `place_coverage_status`

Editorial issues can initially be generated from: article count, source diversity, recency.

```
problem_class: editorial
issue_type: thin_editorial_coverage
recommended_tool: search_articles
```

---

## Anti-Patterns

### Don't build Coverage Operations directly on `entities`

Deriving everything live from entities + canonical_entity_state + queues will get messy fast. You'll encode brittle conditional logic in the UI: "if this field is null and that queue has a row and that status is X… then show this action unless that other status is Y…"

That feels okay for 2 weeks and then becomes annoying to maintain.

### Don't overload `needs_human_review`

`entities.needs_human_review` is too coarse. You now need to know: why, for what class, what next action, whether blocking, what was already attempted. A boolean can't carry that.

### Don't use `enrichment_stage` as operational state

`entities.enrichment_stage` is a loose string. Current values are mostly null and "7". That is not rich enough to drive Coverage Operations. It's okay as a pipeline artifact, but not as the triage model.

---

## Tool Readiness Assessment

**entity_issues without resolution tools is a complaint box.** Before building the issue layer, we need enough resolution actions that an operator can actually invoke from the UI.

### Tools that exist today

| Tool | Problem class | Current form | What it resolves |
|------|--------------|--------------|------------------|
| GPID resolution | identity | `lib/gpid-resolve.ts` + `/api/admin/intake/resolve` | Unresolved identity — matches entity to Google Place |
| Full enrichment pipeline | identity, contact, social | `scripts/enrich-place.ts` stages 1-7 + `/api/admin/enrich/[slug]` | End-to-end enrichment from GPID through tagline |
| Instagram discovery | social | `scripts/find-instagram-handles.ts` + `scripts/backfill-instagram-handles.ts` | Finds Instagram handles from website/surface data |

### Tools that need to be built

| Tool | Problem class | Complexity | What it resolves | Why it's buildable now |
|------|--------------|------------|------------------|----------------------|
| **Neighborhood derivation** | location | Low | 25 entities with GPID + coords but no neighborhood | Reverse geocode from existing lat/lng — one function |
| **Targeted stage re-run** | identity, contact, social | Medium | Re-run specific enrichment stage without full pipeline | `enrich-place.ts` already has `--from` and `--only` flags; needs API route |
| **Instagram as operator action** | social | Low-Medium | One-click Instagram discovery per entity from UI | Scripts exist; need API route + single-entity trigger |
| **Issue scanner/generator** | all | Medium | Automatically detect problems and create entity_issues rows | Query entities + canonical_entity_state for nulls, thin coverage, missing anchors |

### Tools that need design first

| Tool | Problem class | Open question |
|------|--------------|---------------|
| **Editorial source discovery** | editorial | What sources to search? What constitutes sufficient coverage? Product decision needed |
| **Contact verification** | contact | Verify against what? Google Places data? Fresh scrape? Needs spec |

### Tool readiness verdict

Identity and location problem classes have sufficient tooling to go operational today. Contact and social are close (scripts exist, need API routes). Editorial needs product design before tooling.

**Minimum viable tool set for Phase 1:** GPID resolution + neighborhood derivation + targeted stage re-run + issue scanner. This covers identity and location — the two highest-signal problem classes.

---

## Implementation Phases

### Phase 0 — Resolution Tools

Build the 3-4 resolution tools from the "needs to be built" list above. Each is a standalone API route an operator can invoke against an entity. Priority:

1. Neighborhood derivation (lowest complexity, 25 immediate fixes)
2. Targeted stage re-run API route (unlocks partial re-enrichment)
3. Instagram operator action (wire existing scripts to API)

### Phase 1 — Issue Layer

Add `entity_issues`. Build the issue scanner/generator.

Generate issues from:
- entity state
- canonical state
- review queues
- GPID queue
- sanction conflicts
- editorial signals

Existing queues remain unchanged.

### Phase 2 — Coverage Operations UI

Coverage Operations becomes a triage board driven entirely by `entity_issues`.

UI sections: publishable, needs automation, processing, needs human, suppressed.

Problem lanes: identity, location, contact, social, editorial.

### Phase 3 — System Simplification (Optional)

After the operational model stabilizes, specialized queues may be simplified or merged.

Possible outcomes:
- GPID queue becomes internal to identity tooling
- some review_queue logic migrates to issues
- sanction conflicts become operator-facing issues

These changes are not required initially.

---

## Final Position

Coverage Operations is not a schema rewrite.

It is an orchestration layer that normalizes operational problems across the system.

Existing specialized queues remain intact and feed issue generation.

`entity_issues` provides the unified task abstraction needed for a triage-based operational surface.

Resolution tools must exist before the issue layer — an issue without a resolution action is just a complaint.

---

## Implementation Status (as of 2026-03-14)

### What's been built

**Phase 0 — Resolution Tools: COMPLETE**

All four "needs to be built" tools are now operational:

| Tool | Route | Status |
|------|-------|--------|
| Neighborhood derivation | `/api/admin/tools/derive-neighborhood` | Live — reverse geocodes from lat/lng |
| Targeted stage re-run | `/api/admin/tools/enrich-stage` | Live — runs individual ERA stages via `spawn` |
| Instagram discovery | `/api/admin/tools/discover-social` (mode: instagram) | Live — Claude-powered search by name+city |
| TikTok discovery | `/api/admin/tools/discover-social` (mode: tiktok) | Live — same pattern as Instagram |
| Website discovery | `/api/admin/tools/discover-social` (mode: website) | Live — same pattern |
| GPID resolution | `/api/admin/tools/seed-gpid-queue` | Live — searches Google Places API for candidates |

**Phase 1 — Issue Layer: COMPLETE**

- `entity_issues` table exists and is populated by the issue scanner (`lib/coverage/issue-scanner.ts`)
- Scanner detects:
  - Tier 1 baseline: `unresolved_identity`, `missing_gpid`, `enrichment_incomplete`, `missing_coords`, `missing_neighborhood`, `missing_website`, `missing_phone`, `missing_instagram`, `missing_tiktok`, `potential_duplicate`
  - Tier 2 visit facts: `missing_hours`, `missing_price_level`, `missing_menu_link`, `missing_reservations`, `operating_status_unknown`, `google_says_closed`
- Issues have severity (CRITICAL/HIGH/MEDIUM/LOW), blocking_publish flag, problem_class grouping
- Re-scan is triggered manually from the UI or via API

**Phase 2 — Coverage Operations UI: COMPLETE (v1)**

Triage board at `/admin/coverage-ops`:
- Groups issues by problem_class (Identity, Location, Contact, Social)
- Severity pills (CRIT/HIGH/MED/LOW) with color coding
- Per-issue inline actions:
  - `Find GPID` for identity gaps
  - `Run Stage 1` for `missing_coords`, `missing_phone`, `missing_hours`, `missing_price_level`, `operating_status_unknown`
  - `Run Stage 6` for `missing_menu_link`, `missing_reservations`
  - `Discover IG/TikTok/Web` for social/website discovery
  - `Derive` for neighborhood backfill
  - `Mark Closed` / `Still Open` override for `google_says_closed`
- Bulk actions: grouped by action label (for example `Run Stage 1 (N)` / `Run Stage 6 (N)`)
- Inline editing: paste website URL, IG handle, TikTok handle, GPID directly
- "None" button for confirmed-no-value (taco carts without websites, etc.)
- "Skip" button for won't-fix items
- Google search link per entity row
- Duplicate detection modal with side-by-side comparison and merge
- Re-scan Issues button to refresh after actions complete

Coverage Dashboard at `/admin/coverage`:
- Summary metrics: total entities, publishable count, missing field counts
- Smart counts that distinguish automation-fixable from human-required

**Phase 3 — System Simplification: NOT STARTED**

Existing specialized queues remain intact. GPID resolution queue is referenced but mostly bypassed — `seed-gpid-queue` writes directly and auto-matches high-confidence results.

### Key architectural decisions made during implementation

1. **GPID is not required for entity identity.** Weighted anchor scoring (`lib/identity-enrichment.ts`) determines identity completeness. GPID carries weight 10 but entities with name + address + coords can reach publication threshold without it. This supports taco carts and mobile vendors that don't have Google Places listings.

2. **Issue types map to fields, not workflows.** The original doc recommended workflow-oriented types (`social_unverified`, `contact_unverified`). Implementation uses field-level types (`missing_instagram`, `missing_phone`) because they map cleanly to inline editing and specific resolution tools. The `problem_class` grouping provides the workflow-level organization.

3. **Inline resolution over queue navigation.** Instead of linking out to specialized queues (GPID Queue, Review Queue), most actions execute directly from Coverage Ops. The GPID Queue page still exists for complex multi-candidate review, but simple cases resolve inline.

4. **TikTok as first-class social field.** Added alongside Instagram with identical treatment across 16 files. Driven by the observation that TikTok is the primary social platform for street food vendors and food reviewers.

5. **Entity merge with evidence preservation.** When duplicates are merged, surfaces from the deleted entity are recreated (delete + insert) on the kept entity to respect the `merchant_surfaces` immutability trigger. Gap-fill copies non-null fields from the deleted entity to fill nulls on the kept entity.

### Open items

- **Operating status workflow polish**: Core schema support already exists (`entities.status`, `entities.businessStatus`) and closure actions are wired in Coverage Ops. Remaining work is scanner/UI refinement for `operating_status_unknown`, plus stronger operator states for temporary vs permanent closure review.
- **Media coverage links**: Human-added editorial mentions, reviews, article URLs. Needs a storage model (likely `entity_appearances` or similar) and an "Add coverage" action in Coverage Ops.
- **Editorial thinness detection**: Issue scanner should flag entities with zero or few editorial sources. Depends on media coverage storage.
- **Auto-rescan after actions**: Bulk actions should trigger a re-scan automatically instead of requiring manual button click.
- **Progress indicators**: Background actions (Stage 1, etc.) show "Queued" but no progress feedback. Need polling or SSE for real-time status.

---

## ENRICH-STRATEGY-V1

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/enrichment-strategy-v1.md` |
| **Last Updated** | 2026-03-16 |
| **Summary** | Entity enrichment lifecycle (Intake→Identify→Enrich→Assess→Publish), phased execution (free before paid), evidence-vs-canonical architecture, editorial coverage pipeline, and hard rules for enrichment ordering. |
| **Systems** | enrichment-pipeline, fields-data-layer |

# Entity Enrichment Strategy v1

## Entity Lifecycle

```
Intake (CANDIDATE) → Identify → Enrich → Assess → Publish
```

1. **Intake** — entity enters system as `CANDIDATE` via CSV import, single entry, or discovery
2. **Identify** — confirm entity type (EAT, PARK, SHOP, etc.), deduplicate, anchor identity
3. **Enrich** — fill fields using available data sources, cheapest first
4. **Assess** — check field completeness against the entity type's playbook; human review if needed
5. **Publish** — add to list, entity becomes reachable on maps

## Enrichment Phases

### Phase 1: Identity
- Deduplicate against existing entities (GPID, website domain, Instagram handle, slug, fuzzy name)
- Confirm entity type — determines which fields matter and which tools to run
- Entity type drives the **field playbook** (a restaurant needs hours/menu/reservation; a park does not)

### Phase 2: Free Enrichment (run all, order flexible)
Run all free sources. Order within this phase is flexible — optimize for signal density per call.

| Source | Cost | Signal Density (restaurants) | Fields |
|--------|------|------------------------------|--------|
| **Existing system data** | Free | Variable | Backfill from surfaces, scans, signals already in DB |
| **Website** | Free (crawl) | High | Hours, menu, reservation URL, phone, address, about/story |
| **Instagram API** | Free | Medium | Vibe, photos, identity signals, hours/menu in bio |
| **TikTok API** | Free | Medium-Low | Energy/vibe signals, content |
| **Editorial coverage** | Free (crawl) | High (subjective) | Chef, cuisine, awards, vibe quotes, neighborhood |
| **Social discovery** | Free | Low | Find handles if not provided at intake |

### Phase 3: AI Extraction
- Parse fetched surfaces (websites, social content, editorial articles) using AI
- Extract structured signals from unstructured content
- Cost: mixed — OpenAI for social discovery (GPT-4.1-mini + web search), Anthropic for identity extraction + taglines

### Phase 4: Paid API (gaps only)
- **Google Places API** — only for fields still missing after free enrichment, or to confirm existing data
- Run strategically, not by default
- Fields: latLng, hours, phone, photos, price level, business status

## Hard Rules
1. **Free before paid** — never call Google API if free sources haven't been exhausted
2. **Entity type drives playbook** — don't run restaurant tools on a park
3. **Evidence before canonical** — enrichment writes to evidence tables first, not directly to canonical state
4. **Pluggable architecture** — new data sources slot in as tools; the system doesn't hardcode a fixed pipeline order
5. **Provenance always** — every field tracks where its data came from

## Evidence vs Canonical

Not all discovered data should immediately become canonical state.

### Evidence Layer (where enrichment writes)
Enrichment pipelines write **evidence** — raw observations with provenance:
- `observed_claims` — structured field-level claims (e.g., "hours are X" from source Y)
- `merchant_surface_scans` — crawled page snapshots
- `merchant_signals` — extracted signals from surfaces
- `menu_fetches` — menu content snapshots
- `coverage_sources` — editorial links + extracted accolades

### Canonical Layer (where product reads)
- `canonical_entity_state` — the currently accepted truth, used by product surfaces

### Promotion: Evidence → Canonical
Evidence is promoted to canonical through sanctioning workflows:
- Multiple sources agree → auto-promote with high confidence
- Sources conflict → flag for human review
- Single source, trusted → auto-promote with medium confidence
- Uses `write-claim.ts` / Fields v2 sanctioning pattern

### Why This Matters
- A restaurant's website says hours are 11am-10pm. Google says 11am-9pm. Instagram bio says "open till 10." These are three pieces of **evidence**. The sanctioning step picks the winner and writes it to canonical.
- An Eater article says "Japanese-Italian fusion." The restaurant's own website says "Italian." Both are evidence. Canonical gets the sanctioned answer.

## Editorial Coverage Pipeline

### Approved Source Registry
Curated list of trusted publications, maintained by Bobby:
- Eater LA
- Michelin Guide
- The Infatuation
- LA Times Food
- TimeOut LA
- (expandable — more sources added over time)

### Pipeline
1. **Discovery** — for a given entity, search approved sources for mentions/articles/videos
2. **Fetch content** — crawl article text, pull video transcripts/captions, grab metadata
3. **AI extraction** — same pipeline for all text sources (article, transcript, caption). Extract structured signals.
4. **Store with provenance** — full link, publication/channel name, publish date, title, extracted signals, source type
5. **Surface on entity page** — accolades/awards badge visible to consumers

### Extraction Signals (Restaurant / EAT)

**Factual / Structured** → writes to evidence (`observed_claims`) → promoted to `canonical_entity_state`:
- Chef/owner name
- Cuisine type (Japanese, Mexican, New American)
- Neighborhood confirmation
- Price range indicators ("splurge-worthy," "$$$," "affordable")
- Opening date / "new restaurant" mentions

**Awards / Accolades** → writes to `coverage_sources` + entity page display:
- Michelin stars/recommendations
- List inclusions ("Eater 38," "Best New Restaurant 2025")
- Awards ("James Beard semifinalist")

**Subjective / Signal** → writes to evidence (`merchant_signals`) → promoted to `interpretation_cache`:
- Vibe/atmosphere descriptions ("intimate," "buzzy," "casual counter-service")
- Signature dishes mentioned by name
- Who it's for ("date night," "group dinners," "solo counter dining")
- Comparisons to other places
- Pull-quote-worthy sentences (for display on entity page)

**Meta** (stored on the source record):
- Article/video type (review, list, news, vlog)
- Author/creator name
- Publish date
- Sentiment (positive/negative/neutral)
- View count (video sources)

### Video Sources (YouTube, TikTok)

Video content enters the same extraction pipeline as editorial articles.

**Approach: Transcripts + metadata (cheapest path)**
- YouTube: free transcripts via API + title, description, view count, channel
- TikTok: captions come with content API + metadata
- Feed transcript text through the same AI extraction pipeline used for articles
- No vision/frame analysis needed (future option, not priority)

**Why video matters:**
- A food vlogger saying "best birria tacos in Silver Lake" is the same signal as an Eater article
- View counts are a popularity/buzz signal (500K views = notable)
- Comments are sentiment data ("I drove 2 hours for this" / "overrated")
- Video content captures energy/vibe signals that text reviews may miss

### Consumer-Facing Display
Editorial coverage is not just internal enrichment — it surfaces on the entity page:
- **Accolades section** — "Michelin Star," "Eater 38," "Infatuation Pick"
- **Pull quotes** — notable excerpts from reviews with attribution
- **Source links** — readers can click through to original articles

### Existing Infrastructure
- `coverage_sources` table — entity_id, source_name, url, article_title, published_at
- `entities.editorial_sources` — JSON field
- `operator_place_candidates.source_type` — can be `'editorial'`
- Currently: stores links only, no crawl/parse/extract automation

## Data Flow Architecture

```
Source → Fetch → Extract → Evidence → Sanction → Canonical → Product
```

### Layer Map

| Layer | Tables | Role |
|-------|--------|------|
| **Routing shell** | `entities` | Identity anchors, routing keys (slug, status, primary_vertical, entity_type) |
| **Evidence** | `observed_claims`, `merchant_signals`, `merchant_surface_scans`, `menu_fetches` | Raw observations from enrichment — multiple per field, with provenance |
| **Editorial** | `coverage_sources` | Source links, accolades, extracted editorial signals |
| **Canonical state** | `canonical_entity_state` | Sanctioned truth — one value per field, promoted from evidence |
| **Interpretation** | `interpretation_cache` | AI-generated outputs promoted from evidence (tagline, vibe, pull quotes) |
| **Coverage ops** | `place_coverage_status` | Enrichment progress tracking (last_enriched_at, needs_human_review) |

### Current Misalignment
- `coverage-apply.ts` writes hours, photos, attributes directly to `entities` — should write to evidence, then promote to `canonical_entity_state`
- Dashboard queries check `entities` fields — should join `canonical_entity_state`
- Enrichment score should measure `canonical_entity_state` completeness, not `entities` fields
- No enrichment tools write to evidence tables — they skip straight to `entities`

## Coverage Ops Dashboard

Implemented at `/admin/coverage`. 4-tab layout, server-rendered from raw SQL (`lib/admin/coverage/sql.ts`). Scoped to all non-permanently-closed entities.

### Tab Structure

| Tab | Query param | Purpose |
|-----|-------------|---------|
| **Overview** | `?view=overview` | Summary cards, tier completion bars, enrichment funnel |
| **Tier Health** | `?view=tiers` | Summary strip, ERA pipeline histogram, per-tier field breakdowns |
| **Enrichment Tools** | `?view=pipeline` | Tool inventory with copy-to-clipboard + recent enrichment runs |
| **Neighborhoods** | `?view=neighborhoods` | Scorecard grid by neighborhood |

### Tool Inventory (accessible from Enrichment Tools tab)
| Tool | Cost | Provider | Command |
|------|------|----------|---------|
| Social discovery | Free | OpenAI GPT-4.1-mini | `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/discover-social.ts` |
| Website fetch + parse | Free | — | `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/scan-merchant-surfaces.ts` |
| Populate canonical | Free | — | `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/populate-canonical-state.ts` |
| Website enrichment | Free | — | `npm run enrich:website` |
| Menu URL sync | Free | — | `npm run signals:menu:sync:local` |
| AI identity extraction | Anthropic $ | Anthropic | ERA stage 5 via `enrich-place.ts` |
| AI tagline generation | Anthropic $ | Anthropic | ERA stage 7 via `enrich-place.ts` |
| ERA pipeline (full) | Anthropic $ | Anthropic | `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/enrich-place.ts --slug=SLUG` |
| Coverage apply (Google) | Google $$ | Google Places API | `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/coverage-apply.ts --apply` |
| Editorial discovery | — | Not built | — |

## Enrichment Score

Each entity gets a composite enrichment score reflecting how "filled out" it is.

### Inputs
- **Field completeness** — % of playbook fields populated for this entity type
- **Source diversity** — how many distinct sources contributed data (1 = fragile, 5+ = well-covered)
- **Editorial coverage depth** — number of editorial mentions, weighted by source quality
- **Signal quality** — not just "has value" but "has confident, multi-source-confirmed value"

### Usage
- Dashboard sorts/filters by enrichment score — work on the lowest-scored entities first
- Score thresholds gate publication: e.g., "don't publish below 70%"
- Per-entity detail view shows which fields are dragging the score down

## Source Registry (by Entity Type)

The approved source list is **typed by entity** — different entities need different sources.

### Example: Restaurant (EAT)

| Source | Type | Cost | Signals |
|--------|------|------|---------|
| Eater LA | Editorial | Free | Awards, chef, cuisine, vibe, neighborhood |
| Michelin Guide | Editorial | Free | Stars, rating, cuisine |
| The Infatuation | Editorial | Free | Vibe, recommendations, price |
| LA Times Food | Editorial | Free | Reviews, chef, cuisine, awards |
| TimeOut LA | Editorial | Free | Lists, recommendations |
| Instagram | Social API | Free | Vibe, photos, identity, hours (bio) |
| TikTok | Social API | Free | Energy, vibe, content |
| Entity website | Crawl | Free | Hours, menu, reservation, phone, about |
| Google Places | Paid API | $$ | Hours, phone, latLng, photos, price level |

### Example: Park

| Source | Type | Cost | Signals |
|--------|------|------|---------|
| AllTrails | Crawl | Free | Trails, difficulty, ratings |
| LA Parks Dept | Crawl | Free | Hours, amenities, address |
| TimeOut Outdoors | Editorial | Free | Recommendations, features |
| Instagram | Social API | Free | Photos, vibe |
| Google Places | Paid API | $$ | Hours, latLng, photos |

### Registry Design
- Bobby maintains the master source list — approves which sources are trusted
- System auto-suggests sources based on entity type
- Each source entry specifies: name, type (editorial/social/crawl/api), cost tier, entity types it serves, fields it can provide
- New sources are added without rewriting pipeline code — just register and the orchestrator picks them up

## Future: Pluggable Source Architecture
- Support adding new APIs and data sources over time without rewriting the pipeline
- Each source registers: what fields it can provide, what it costs, what entity types it serves
- The enrichment orchestrator decides what to run based on what's missing and what's cheapest
- Sources can be enabled/disabled per entity type or globally

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

## FIELDS-VERTICAL-TAXONOMY-V1

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/vertical-taxonomy-v1.md` |
| **Last Updated** | Fri Mar 13 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Defines Saiko's 12-vertical taxonomy — the primary domains of urban life used to classify every place in the system. Documents anthropological rationale, system role, technical anchors, and design implications. |
| **Systems** | fields-data-layer, entity-resolution |

# Saiko Vertical Taxonomy

**Anthropological Rationale and System Role**

**System:** Fields Data Layer / Saiko Maps
**Status:** Active
**Applies to:** Fields, Traces, Saiko Maps

---

## 1. Purpose

The Saiko Vertical Taxonomy defines the primary domains of everyday life in a city.

It organizes places according to how they participate in human living — not according to traditional business categories.

Most mapping platforms categorize places by industry classification:

- Restaurant
- Retail
- Hotel
- Entertainment

Saiko instead categorizes places by **human activity domain**.

This approach reflects the underlying philosophy of Saiko: mapping the places that contribute to how people live well in a city.

A place appears on Saiko not because it exists, but because it meaningfully contributes to lived experience.

---

## 2. The 12 Vertical Domains

Saiko uses twelve verticals to represent the primary domains of urban life.

| Vertical | Display Label | Identity Noun |
|----------|--------------|---------------|
| `EAT` | Restaurant | restaurant |
| `COFFEE` | Coffee | café |
| `WINE` | Wine Bar | wine bar |
| `DRINKS` | Bar | bar |
| `BAKERY` | Bakery | bakery |
| `STAY` | Hotel | hotel |
| `SHOP` | Shop | shop |
| `CULTURE` | Culture | gallery |
| `WELLNESS` | Wellness | spa |
| `PURVEYORS` | Purveyor | market |
| `NATURE` | Nature | park |
| `ACTIVITY` | Activity | venue |

Each vertical represents a type of lived interaction with the city.

Together they form a minimal but complete model of the places people repeatedly move through in everyday life.

---

## 3. Anthropological Perspective

Anthropologists often study cities through activity systems rather than industries.

These systems describe how people obtain resources, socialize, care for themselves, and experience culture.

Viewed through this lens, the Saiko taxonomy maps the **infrastructure of daily life**.

### Provisioning
How people obtain food and everyday resources.
- `EAT` · `BAKERY` · `PURVEYORS` · `COFFEE`

### Social Gathering
Where people gather and interact.
- `WINE` · `DRINKS` · `COFFEE`

### Dwelling and Travel
Where people temporarily live.
- `STAY`

### Material Culture
Where objects circulate and become part of daily life.
- `SHOP`

### Cultural Expression
Spaces where art, performance, and meaning are produced.
- `CULTURE`

### Care of the Body
Spaces dedicated to maintaining physical and mental wellbeing.
- `WELLNESS`

### Landscape Interaction
Where people interact with the natural environment.
- `NATURE`

### Recreation and Movement
Places where people participate in physical activity or sport.
- `ACTIVITY`

> Note: `COFFEE` spans both Provisioning and Social Gathering. This dual role is intentional — the café functions as both a resource (daily caffeine) and a place of habitual social presence. This ambiguity reflects reality rather than a classification error.

This framework reflects the reality that cities are not simply collections of businesses — they are **systems of living environments**.

---

## 4. Why Twelve

The taxonomy intentionally balances three constraints:

- **Clarity** — each vertical is legible and non-overlapping in practice
- **Coverage** — the full range of urban lived experience is represented
- **Cognitive simplicity** — twelve is navigable without a lookup

Too many categories produce noise. Too few erase meaningful distinctions.

Twelve verticals provide enough resolution to represent the diversity of urban life while remaining intuitive for navigation and discovery.

They also map well onto natural mental models people already use when exploring a city:

- finding somewhere to eat
- getting coffee
- going out for drinks
- visiting a gallery
- going to the park

---

## 5. Technical Anchors

The taxonomy is defined in three places in the codebase. These are the sources of truth.

### `lib/primaryVertical.ts`
- `PRIMARY_VERTICALS` — the canonical array of all 12 valid values (used for validation and dropdowns)
- `VERTICAL_DISPLAY` — maps each vertical to its UI display label
- `categoryToPrimaryVertical()` — maps legacy string categories to the enum
- `resolvePrimaryVertical()` — resolves vertical from category + Google types, defaults to `EAT`

### `prisma/schema.prisma` → `PrimaryVertical` enum
The database-level enum. All entities store `primary_vertical` using this enum. `CANDIDATE` is the intake status for newly-created, pre-enrichment entities.

### `lib/contracts/place-page.identity.ts`
Defines the `SaikoCategory` type used at the API and display layer. Currently mirrors the 12 verticals (lowercased).

### Note on Dual Types
There are two parallel types in the codebase:

- **`PrimaryVertical`** (`@prisma/client`) — 12 uppercase enum values; used at write time, storage, and validation
- **`SaikoCategory`** — 11–12 lowercase string literals; used at read time and in display contracts

They cover the same domain. When modifying the taxonomy, both must be updated together.

---

## 5.1 Classification Layers (Current Schema)

Saiko currently uses four related classification fields, each with a different job:

| Field | Layer role | Typical values | Operational use |
|-------|------------|----------------|-----------------|
| `entities.entityType` (`entity_type`) | Structural entity kind | `venue`, `activity`, `public` | Coarse entity shape and generic API behavior |
| `entities.primary_vertical` | Primary domain classifier | `EAT`, `COFFEE`, `WINE`, `DRINKS`, `STAY`, ... | Routing, enrichment policy, scanner gating, reporting |
| `entities.category` | Human-readable/category fallback | `restaurant`, `wine bar`, `hotel`, ... | Display fallback and legacy compatibility |
| `entities.cuisineType` (`cuisine_type`) | Cuisine-specific subtype | `Mexican`, `Italian`, ... | Food identity/detail layer |

Practical rule of thumb:
- Use `entityType` when you need broad structural class.
- Use `primary_vertical` for operational logic and applicability decisions.
- Use `category` / `cuisine_type` for descriptive identity and presentation detail.

This layered model is the reason Coverage Ops Tier 2 gating now uses `primary_vertical` rather than `entityType`.

---

## 6. Relationship to the Fields Data Layer

In the Saiko architecture, the taxonomy lives primarily in **Fields**.

Fields is the place data infrastructure layer.

The vertical system serves several roles:

### Identity Classification
Each place has a `primary_vertical` that describes its core social function.

```
Gjelina        → EAT
Intelligentsia  → COFFEE
Silverlake Wine → WINE
```

### Query Organization
Verticals provide a stable dimension for discovery queries.

```
coffee near me
wine bars in echo park
parks in los angeles
```

### Data Modeling
Verticals sit at the top of the place type hierarchy, above more specific place types.

```
vertical: EAT      →  place_type: restaurant
vertical: CULTURE  →  place_type: gallery
```

---

## 7. Relationship to Traces

**Traces** is the planned consumer layer that interprets Fields data into lived experiences.

Within Traces, verticals help define experience surfaces:

```
EAT      → dining scenes
COFFEE   → daily ritual spaces
WINE     → slow evening social spaces
NATURE   → outdoor exploration
```

Verticals therefore act as the structural bridge between raw place data and lived experiences.

> **Fields** defines the place.
> **Traces** interprets the place within the context of human life.

---

## 8. Relationship to Saiko Philosophy

Saiko is not intended to be a comprehensive directory of businesses.

Instead, it is a curated map of places that meaningfully contribute to how people live well in a city.

**Inclusion itself implies recommendation.**

The taxonomy therefore organizes places that Saiko stands behind, not the entire universe of locations.

The result is a map that reflects lived culture rather than commercial inventory.

---

## 9. Design Implications

The vertical system influences several parts of the product.

### Navigation
Verticals become natural discovery entry points.

```
Eat · Coffee · Wine · Culture · Nature
```

### Editorial Structure
Verticals provide the foundation for lists, collections, and curated surfaces.

```
Best Coffee in LA
Great Wine Bars
Sunday Parks
```

### Data Signals
Certain signals are more relevant to certain verticals.

```
EAT     → menu signals, dining occasion
WINE    → wine list signals, pour style
NATURE  → landscape signals, public access
```

---

## 10. Future Evolution

The vertical taxonomy is expected to remain **relatively stable**.

Two additional layers may evolve over time:

- **Place Type** — more specific classification within a vertical (e.g., `restaurant → bistro, tasting menu, counter`)
- **Experience Signals** — vertical-specific attribute sets for discovery and matching

Example future structure:

```
vertical:           CULTURE
place_type:         museum
experience_signals: contemporary, architecture, public
```

This layered approach allows the system to grow without modifying the core taxonomy.

**What's already in place:**
- `PrimaryVertical` enum is stable and validated at intake
- `resolvePrimaryVertical()` handles legacy and unknown inputs with a safe `EAT` default
- `VERTICAL_DISPLAY` drives UI rendering

**What's not yet built for multi-vertical expansion:**
- Vertical-aware ERA enrichment signals (Stage 5 AI extraction currently targets EAT)
- Intake form vertical selector (currently hardcoded to `EAT`)
- Vertical-specific Programs model (price tier, service model, etc.)

---

## 11. Guiding Principle

The Saiko vertical taxonomy organizes places according to how people experience a city.

It models urban life as a set of recurring domains:

> eating · gathering · dwelling · moving · creating · resting

The map therefore reflects the structure of everyday living rather than the structure of commerce.

---

## SAIKO-COVERAGE-DASHBOARD-DESIGN-V1

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/COVERAGE-DASHBOARD-DESIGN-PRINCIPLES.md` |
| **Last Updated** | Thu Mar 12 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Design principles for the Coverage Dashboard — a work surface for resolving data gaps, organized by solution type (automated vs. semi-automated vs. human-only) rather than by missing field. |
| **Systems** | admin, coverage-dashboard |

# Coverage Dashboard — Design Principles

## Purpose
The Coverage Dashboard is a work surface, not a diagnostic report. Someone arrives here to fix problems and leave with fewer of them.

## The Core Rule
Every number shown must either confirm things are healthy or tell you what kind of action is needed. If a number doesn't imply an action, it doesn't belong on the page.

## Dumb count vs. smart count
Dumb: "42 records missing opening hours"
Smart: "31 can be auto-filled via Stage 1 enrichment — 11 still need human review"

The difference: a smart count tells you who does the work — the system or you.

## Problem grouping principle
Group problems by solution, not by field. The universe of solutions is constrained to the tools that exist. Design Coverage from the tools outward, not from the missing fields inward.

## Automation first
Automated operations run before any human review. Human work is reserved for what the system genuinely cannot resolve. The page should make it obvious which bucket each problem falls into.

## Operations inventory (as of March 2026)
Automated:
- Google Places enrichment — given a GPID, fetches address, coords, neighborhood, phone, hours, website
- Neighborhood reverse lookup — given coords, derives neighborhood

Semi-automated (system proposes, human confirms):
- GPID matching — system finds candidate, human approves
- Instagram handle finder — AI-assisted, human confirms
- Photo fetch and eval — system pulls Google photos, human tags

Human only:
- Editorial fields — description, TimeFOLD signal
- Manual field entry — anything system cannot find

## Key insight (March 2026)
If a record has a GPID, operating facts are often machine-recoverable. Missing hours, price level, or business status are frequently automation problems first, not human problems first. Always check what the system can fix before surfacing a problem to a human.

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
| **Last Updated** | 2026-03-14 |

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

### Tier Namespace Clarification

This document defines merchant profile **UI rendering tiers** (Tier 0-5) for `/place/[slug]` and related surfaces.

These tiers are not the same as Coverage Operations tiers. Coverage architecture uses:
- Tier 1 — Identity & Classification
- Tier 2 — Visit Facts
- Tier 3 — Experience / Interpretation

See `docs/architecture/coverage-tiers-v1.md` for the coverage-tier model used by scanners and Coverage Ops.

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

## SKAI-DOC-FIELDS-GLOSSARY-001

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/saiko-architecture-glossary-v1.md` |
| **Last Updated** | Sun Mar 15 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Canonical glossary of core Fields and TRACES architecture terms for shared system language. |
| **Systems** | fields-data-layer, traces, knowledge-system |

# Saiko Architecture Glossary

**Document ID:** SKAI-DOC-FIELDS-GLOSSARY-001  
**Layer:** Architecture  
**Status:** Active

---

## Atomic Signal

The smallest observable piece of structured information captured about a place.

Examples:

- `reservable = true`
- `natural_wine = true`

Atomic signals are non-interpretive.

---

## Derived Signal

A computed signal generated from atomic signals.

Examples:

- dinner score
- scene energy

Derived signals remain structured data.

---

## Identity Signal

A signal that helps determine whether two observations refer to the same place.

Examples:

- name
- coordinates
- address

---

## Identity Anchor

A high-confidence identity signal.

Examples:

- GPID
- Instagram handle
- website domain

---

## Identity Resolution

The process that groups signals into canonical entities.

---

## Canonical Entity

The system's resolved representation of a real-world place.

Also known as Place Identity.

---

## Canonical State

The authoritative version of entity data used by downstream systems.

---

## Source Evidence

Raw signals captured from external systems.

Examples:

- Google Places
- social platforms

---

## Sanction

A canonical decision applied to signals or entity state.

---

## Cultural Interpretation

Human-readable meaning derived from structured signals.

Produced by TRACES.

---

## Product API

The stable interface through which consumer systems access Fields data.

---

## SKAI-DOC-FIELDS-SYSTEM-MAP-001

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/fields-system-map-v1.md` |
| **Last Updated** | Sun Mar 15 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Top-level architecture map for Fields-to-TRACES flow from observations to cultural interpretation. |
| **Systems** | fields-data-layer, traces |

# SAIKO FIELDS

## System Map - Signals to Interpretation

**Document ID:** SKAI-DOC-FIELDS-SYSTEM-MAP-001  
**System:** Fields / TRACES  
**Layer:** Architecture  
**Status:** Active  
**Owner:** Saiko

---

## Purpose

This document defines the high-level system architecture for Saiko Fields and its relationship to TRACES.

It explains how the system moves from real-world observations to structured entities, derived understanding, and finally user-facing cultural interpretation.

This is the top-level mental model for the Saiko platform.

---

## Core System Flow

Real World  
-> Source Systems / Observations  
-> Atomic Cultural Signals  
-> Identity Resolution  
-> Canonical Entity  
-> Derived Signals  
-> Product API  
-> TRACES Interpretation  
-> User Experience

---

## Layer Definitions

### Real World

The real places, behaviors, offerings, and cultural conditions that exist outside the system.

Examples:

- a restaurant opening
- a wine bar changing operators
- a menu changing seasonally
- a neighborhood becoming popular for late dinners

### Source Systems / Observations

Inputs that provide evidence about the real world.

Examples:

- Google Places
- Instagram
- websites
- editorial submissions
- operator input
- ingestion feeds
- manual research

These are evidence sources, not truth authorities.

### Atomic Cultural Signals

Atomic signals are the smallest observable pieces of structured information captured about a place.

Examples:

- `primary_vertical = EAT`
- `reservable = true`
- `natural_wine = true`
- `neighborhood = Silver Lake`

Atomic signals are:

- observable
- structured
- sourceable
- durable
- non-interpretive

Fields stores and maintains atomic signals.

### Identity Resolution

Identity resolution determines whether signals refer to:

- an existing entity
- or a new entity

Evidence used in identity resolution includes:

- Google Place ID
- Instagram handle
- website
- name similarity
- coordinates
- address
- resolver rules

Identity is resolved from evidence agreement, not defined by any single platform.

### Canonical Entity

The canonical entity is the system's stable representation of a real-world place.

It is:

- the resolved identity record
- the anchor for enrichment
- the owner of canonical state
- the object consumed by downstream systems

This entity is commonly referred to as Place Identity.

### Derived Signals

Derived signals are computed features produced from atomic signals and canonical state.

Examples:

- dinner destination score
- scene energy
- date-night probability
- confidence levels
- completeness flags

Derived signals remain structured data, not narrative interpretation.

### Product API

The Product API provides stable, versioned access to Fields data.

Consumer systems should read through these APIs or canonical views.

Consumer systems should not read raw ingestion tables directly.

### TRACES Interpretation

TRACES transforms structured signals into human-readable cultural understanding.

Examples:

- identity language
- scene descriptions
- discovery logic
- intent matching
- cultural summaries

Fields structures knowledge.  
TRACES interprets it.

---

## Ownership Boundaries

| Concern | Owner |
|---|---|
| Source ingestion | Fields |
| Atomic signals | Fields |
| Identity resolution | Fields |
| Canonical entity | Fields |
| Derived signals | Fields |
| Product API | Fields |
| Cultural interpretation | TRACES |
| Interface language | TRACES |
| User experience | TRACES |

---

## Architectural Rules

1. Source systems do not define truth on their own.
2. Identity is resolved from evidence.
3. Fields stores signals and canonical state.
4. Derived signals occur downstream of identity.
5. TRACES interprets structured inputs.
6. Consumer products should not read raw source tables directly.
7. The data layer is a standalone system of record.

---

## Summary

Saiko transforms observations into structured cultural understanding.

Signals -> Resolver -> Entity -> Derived Signals -> Interpretation

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

## PIPE-INSTAGRAM-WORKSTREAM-V1

| Field | Value |
|-------|-------|
| **Type** | spec |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/pipelines/instagram-integration-workstream-v1.md` |
| **Last Updated** | 2026-03-13 |
| **Summary** | Phased execution plan for Instagram integration — 6 phases from data quality through contextual display. Includes codebase readiness assessment, effort estimates, timing recommendations, and per-phase task checklists. |
| **Systems** | instagram-api, enrichment-pipeline, merchant-surfaces, scenesense |

# Instagram Integration — Workstream & Execution Plan

**Version:** 1.0
**Date:** 2026-03-13
**Author:** Bobby / Claude
**Status:** Active — Phase 1 in progress

---

## Codebase Readiness Assessment

Before the phases: what the codebase review found.

### What's already built (Phase 0 — Done)

| Component | Status |
|---|---|
| `instagram_accounts` table | ✅ In schema, indexed, linked to `entities` |
| `instagram_media` table | ✅ In schema, indexed, linked to `instagram_accounts` |
| `instagram_insight_snapshots` table | ✅ In schema, append-only structure |
| `instagram_temporal_signals` table | ❌ New — only missing table |
| `ingest-instagram.ts` | ✅ Production-ready — 3 modes (Business Discovery, batch, /me) |
| API credentials | ✅ Never-expiring Page Access Token + IG_USER_ID in `.env.local` |
| `merchant_surfaces` IG records | ✅ ~90 records across ~70 entities |
| `entities.instagram` column | ⚠️ 7 populated, quality issues |
| Instagram registered as source | ✅ `source_registry` — trust_tier 3, threshold 0.80 |
| API route serves IG handle | ✅ Returns `entities.instagram` to client |
| Place page renders IG link | ✅ StatusCell + primary CTAs |

### Interpretation layer: no major refactoring required

The Fields v2 / `derived_signals` architecture is source-agnostic. Key findings:

- **Signal extraction** reads from `merchant_surface_artifacts.text_blocks` — source-independent. Feed it text, it extracts signals. No hardcoded assumptions.
- **SceneSense** reads `derived_signals` with `signal_key='identity_signals'`. No source assumptions.
- **Voice/tagline gen** consumes signal extraction output. No source assumptions.
- **API route** already has `instagram` column. Source-independent.
- **Review queue** completely source-agnostic.
- **Surface parse** has Instagram in `SKIP_FETCH_TYPES` — needs Instagram-specific parse path (Phase 2).

### Key gating constraint: Meta App Review

The TRACES THREE app is in **development mode**. All API calls limited to test users and business accounts that granted access. Batch ingest of the full ~70-entity set requires Meta App Review approval. This is calendar-time-gated (2-6 weeks). **Start the submission process as soon as Phase 1 validates data quality.** Everything else is unblocked.

---

## Phase 1 — Data Quality & First Real Ingest

**Status:** In progress
**Estimated effort:** 2-3 days
**Gate:** None — can start immediately

### Tasks

- [ ] Backfill `entities.instagram` from `merchant_surfaces`
  - Query `merchant_surfaces` WHERE surface_type = 'instagram'
  - Extract clean handles from source_url (e.g. `https://instagram.com/brotherscousinstacos/` → `brotherscousinstacos`)
  - Script: `scripts/backfill-instagram-handles.ts`
  - Dry-run first to review candidates; write only on confirmation
- [ ] Fix known bad data
  - Literal `"null"` string on LA Tutors 123 → SQL NULL
  - Full URLs stored as handles → cleaned by backfill script
  - Any other anomalies surfaced during review
- [ ] Run first real `--batch` ingest
  - Command: `npx tsx scripts/ingest-instagram.ts --batch`
  - Dry-run first: `--dry-run --batch`
  - Validates which handles resolve via Business Discovery
  - Populates `instagram_accounts` + `instagram_media`
- [ ] Data review after ingest
  - Count: how many accounts resolved vs failed?
  - Caption quality: what % have captions? Average length?
  - Posting cadence: how many posts/week across corpus?
  - Signal density: what % of captions have extractable content (vs pure emoji/hashtags)?
  - Language: what % are primarily Spanish vs English vs bilingual?
- [ ] Submit Meta App Review
  - Document required permissions: `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`
  - Begin submission process — 2-6 week calendar gate, start early

### Success criteria

- `entities.instagram` populated for all entities that have a `merchant_surfaces` instagram record
- `instagram_accounts` + `instagram_media` populated for all resolvable handles
- Data review completed with findings documented (append to Section 3 of `instagram-implementation-v1.md`)
- Meta App Review submitted

---

## Phase 2 — Caption Signal Extraction

**Status:** Pending Phase 1
**Estimated effort:** 4-6 days
**Gate:** Phase 1 data in tables; data review confirms signal density worth extracting

### Context

The signal extraction pipeline (`extract-identity-signals.ts`) is already source-agnostic — it reads from `merchant_surface_artifacts.text_blocks` and extracts signals regardless of origin. Instagram captions need a bridge: a path from `instagram_media.caption` into the same text-blocks format the pipeline expects.

### Tasks

- [ ] Build caption bridge: Instagram media → text blocks
  - Script or job that reads `instagram_media` rows where `signal_extracted_at IS NULL`
  - Packages captions as text blocks in the same format as `merchant_surface_artifacts`
  - Option A: writes synthetic `merchant_surface_artifacts` rows (cleanest re-use of existing pipeline)
  - Option B: feeds captions directly into signal extraction as an alternate input (simpler but less reusable)
- [ ] Handle bilingual content
  - ~30-40% of corpus is Spanish-primary or bilingual (taco trucks etc.)
  - Signal extraction prompt may need bilingual awareness
  - Test on Tacos El Toro (929 posts, primarily Spanish) as validation case
- [ ] Define Instagram-specific signal taxonomy additions
  - Existing taxonomy covers: cuisine_posture, language_signals, place_personality, etc.
  - Instagram adds: producer_mentions, sourcing_language, dish_narrative, philosophy_language
  - Review whether existing fields cover these or if new signal keys needed
- [ ] Mark extracted posts: set `signal_extracted_at` on `instagram_media` rows
  - Supports re-extraction if model improves
- [ ] Wire into coverage dashboard
  - Add caption extraction status as a coverage dimension (% of entities with extracted IG signals)

### Success criteria

- Caption signals flowing into `language_signals` / `derived_signals` for all entities with resolved IG handles
- Re-extraction supported via `signal_extracted_at` timestamp
- SceneSense receiving richer input for wine bars, chef-driven spots, natural wine focused restaurants

---

## Phase 3 — Temporal Signal Architecture

**Status:** Pending Phase 1
**Estimated effort:** 5-7 days
**Gate:** Phase 1 data in tables; independent of Phase 2

### Context

Temporal signals are a new signal class that doesn't exist anywhere in the current system. Every other source produces evergreen signals. Instagram is the first source that produces perishable ones. This phase builds the capture infrastructure — display comes later.

### Tasks

- [ ] Create `instagram_temporal_signals` migration
  - Fields: id, instagram_media_id, signal_type (closure/event/hours_change/special_menu/other), signal_text, valid_from, valid_until, confidence, extracted_at, is_expired
  - Script: `prisma/migrations/[date]_add_instagram_temporal_signals/`
- [ ] Build temporal extraction job
  - Reads `instagram_media` captions
  - Looks specifically for: date language, event language, closure language, hours change language
  - AI extraction prompt focused on: "does this caption announce something time-bound?"
  - Parses out: what is it, when, how confident
  - Writes to `instagram_temporal_signals`
- [ ] Build expiry sweep job
  - Scheduled job: sets `is_expired = true` on signals where `valid_until < now()`
  - Keeps active signal pool clean
  - Can run daily via cron or as part of ingest job
- [ ] Capture-only — no display UI yet
  - Signals accumulate but are not surfaced to users
  - This is correct: 6 months of data before display is better than displaying prematurely

### Success criteria

- `instagram_temporal_signals` table created and populated for merchants with operational posting patterns
- Expiry sweep job running
- At minimum: capture working for Brothers Cousins (operational content, bilingual), Tacos El Toro (high cadence)
- Open question documented: how do temporal signals interact with `entities.hours` in conflict cases?

---

## Phase 4 — Photo Candidate Pipeline

**Status:** Pending Phase 1
**Estimated effort:** 3-4 days
**Gate:** Phase 1 — `instagram_media` populated

### Context

Instagram merchant photos are editorially intentional — categorically different from user-submitted Google photos. They should enter the same unified photo candidate pool with source metadata attached, so TRACES can make display decisions with full context.

### Tasks

- [ ] Review existing Google photo pipeline
  - How does `place_photo_eval` work?
  - What fields does it use for tier/type classification?
  - How does TRACES consume photo candidates today?
- [ ] Build `is_display_candidate` scoring logic for `instagram_media`
  - Quality signals: media_type = IMAGE or CAROUSEL_ALBUM (VIDEO typically lower priority)
  - Recency signal: posted within last 6 months
  - Caption quality signal: captions with substantive text → higher merchant intent
  - Aspect ratio / resolution: if accessible from media_url metadata
- [ ] Update `instagram_media` rows: set `is_display_candidate` flag
- [ ] Integration path into unified candidate pool
  - Determine how TRACES currently resolves candidates from `place_photo_eval`
  - Add Instagram candidates to the same pool with source='instagram', recency timestamp
  - Do not build a separate system; extend what exists

### Success criteria

- `is_display_candidate` populated on `instagram_media` with sensible scoring
- Instagram photos available to TRACES alongside Google photos
- Source metadata preserved: TRACES knows origin and recency of each candidate

---

## Phase 5 — Interpretation Layer Wiring

**Status:** Pending Phase 2
**Estimated effort:** 3-5 days
**Gate:** Phase 2 caption signals flowing

### Context

The interpretation layer is largely source-agnostic already. This phase is about explicit wiring, not refactoring. Key things that need awareness of Instagram as a source:

### Tasks

- [ ] Confidence model: add Instagram as corroborating source
  - When Instagram signals match existing signals, confidence should increase
  - Instagram is tier-3 trust but high recency — calibrate accordingly
- [ ] ABOUT synthesis: register caption tone awareness
  - Instagram language is shorter, more casual, sometimes in first person
  - Should feed ABOUT synthesis as supporting evidence but not set the register
  - Safeguard: Instagram text should not bleed into rendered output tone
- [ ] SceneSense: verify Instagram signals flowing through `language_signals`
  - Validate that `derived_signals` rows from Instagram caption extraction are being read by SceneSense
  - Run SceneSense on a wine bar entity before/after to confirm signal lift
- [ ] Audit remaining hardcoded source assumptions
  - Priority: identity line assembly — does it hardcode sources?
  - Check: confidence scoring model source weighting
- [ ] Register `instagram_api` in `source_registry` table (if not already done)
  - Seed script entry exists; verify it was applied to prod DB

### Success criteria

- SceneSense results visibly improved for entities with high-quality Instagram captions
- Confidence scores reflect Instagram corroboration
- No tone bleed from Instagram captions into ABOUT text register
- `instagram_api` confirmed in `source_registry`

---

## Phase 6 — Contextual Display

**Status:** Deferred — pending Phases 3, 4, and product decisions
**Estimated effort:** 5-8 days
**Gate:** Phase 3 temporal signals; product decisions on confidence thresholds and conflict resolution

### Context

Contextual display is the product expression of the temporal signal architecture. It is one of the most meaningful differentiators Saiko can build. Users learn that Saiko knows things other platforms do not.

### Product decisions required before building

- What is the minimum confidence to surface a closure or event on the place page?
- How do we handle Instagram signal vs. `entities.hours` conflicts — who wins?
- What does the display component look like? Banner? Inline note? Separate section?
- Does the place page need a "last updated" signal based on Instagram freshness?

### Tasks (pending product decisions)

- [ ] Design temporal signal display component
- [ ] Define confidence threshold for display activation
- [ ] Build conflict resolution logic: Instagram vs. hours
- [ ] Wire `instagram_temporal_signals` into API route (`/api/places/[slug]`)
- [ ] Update place page data contract (`lib/contracts/place-page.identity.ts`)
- [ ] Implement display UI
- [ ] Add Instagram freshness signal to place page (optional: "last posted 2 days ago")

### Success criteria

- Closures and special events visible on place page within hours of Instagram post
- Conflict cases handled with defined precedence rule
- No false positives from low-confidence temporal extractions

---

## Open Questions Tracker

| Question | Phase | Status |
|---|---|---|
| What % of corpus has active vs dormant accounts? | 1 | ⏳ Phase 1 data review |
| Average caption length and quality across full set? | 1 | ⏳ Phase 1 data review |
| What % have extractable signals vs emoji/hashtag noise? | 1 | ⏳ Phase 1 data review |
| How many posts/week across corpus? | 1 | ⏳ Phase 1 data review |
| Instagram text blocks: synthetic artifacts vs direct injection? | 2 | 🔲 Engineering decision |
| Bilingual signal extraction: prompt changes needed? | 2 | 🔲 Engineering decision |
| `instagram_api` in `source_registry` — applied to prod? | 5 | 🔲 Verify |
| How do temporal signals interact with `entities.hours`? | 6 | 🔲 Product decision |
| Confidence threshold for surfacing closures/events? | 6 | 🔲 Product decision |
| Fetch cadence: daily vs dynamic by is_active_recently? | 1 | 🔲 After data review |
| Meta App Review: what permissions to request? | 1 | 🔲 Submit Phase 1 |

---

## Timing

| Phase | Effort | Dependencies | Start |
|---|---|---|---|
| Phase 0 | Done | — | Done |
| **Phase 1** | 2-3 days | None | **Now** |
| Phase 2 | 4-6 days | Phase 1 data | After Phase 1 |
| Phase 3 | 5-7 days | Phase 1 data | Can parallel Phase 2 |
| Phase 4 | 3-4 days | Phase 1 media | Can parallel Phases 2-3 |
| Phase 5 | 3-5 days | Phase 2 signals | After Phase 2 |
| Phase 6 | 5-8 days | Phase 3 + product decisions | Deferred |
| Meta App Review | 2-6 weeks (calendar) | Phase 1 validation | Submit during Phase 1 |

**Total active engineering: ~22-33 days across Phases 1-5.**

Phase 6 (contextual display) is independent and can be scoped separately once the capture infrastructure is in place.

---

## Revision History

| Version | Date | Changes | Author |
|---|---|---|---|
| 1.0 | 2026-03-13 | Initial workstream doc — all 6 phases, readiness assessment, open questions, timing | Bobby / Claude |

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

## SAIKO-ENTITY-PROFILE-SPEC-V1

| Field | Value |
|-------|-------|
| **Type** | spec |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/ENTITY-PROFILE-SPEC.md` |
| **Last Updated** | Thu Mar 12 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Spec for /admin/entity/[id] — the canonical single-entity admin view showing all field states with inline resolution actions and a TimeFOLD editorial slot. |
| **Systems** | admin, entity-profile |

# Entity Profile Page — Spec

## Route
/admin/entity/[id]

## Purpose
Canonical admin view for a single place record. One page that shows everything about an entity, the state of every field, and inline actions to resolve gaps.

Surgical workflow: fix one specific place fully. Queue pages (Instagram, GPID, Photo Eval) are the bulk workflow for the same actions.

## Two modes
Resolution mode — fix missing or low-confidence fields inline
Editorial mode — write the TimeFOLD Foreground signal once factual identity is solid

## Layout

Header strip (read-only, edit override button):
- name, slug, neighborhood, category, status badge, google_place_id, created_at

Field grid:
Each field card has one of three states:
- Populated — value + confidence score if available, green indicator
- Low confidence — value + score + Review action, yellow indicator
- Missing — empty state + inline resolution action, red indicator

Fields and resolution actions:
- google_place_id — trigger GPID lookup, approve match
- address / latitude / longitude — pull from Google Places API
- phone — pull from Google Places API
- website — inline input + save
- instagram — inline input + save
- hours_json — pull from Google Places API
- cuisine_type — inline select + save
- category — inline select + save
- description — inline textarea + save
- photos — trigger Google Photos fetch, tag and approve
- enrichment_tier — read-only badge from entity_enrichment_tiers view

TimeFOLD slot (below field grid):
- Label: Temporal Signal
- If populated: display read-only with Edit button
- If empty: single-line input, placeholder "e.g. Long-running neighborhood fixture."
- Save button → PATCH entities.tagline
- UI note: "One line. No dates. Write what this place means right now."

## Entry points into this page
- Coverage Dashboard Problem Records table — each row links here
- Instagram Backfill — each place row has View Entity link
- GPID Queue — each item links here
- Photo Eval — each place links here

## Constraints
- Do not use entities.enrichment_stage
- Do not use golden_records.data_completeness
- Server component for initial data load
- Client components for inline resolution actions
- All writes through existing API patterns, no raw SQL from client

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

## SYS-COVERAGE-OPS-ISSUE-CONTRACT-V1

| Field | Value |
|-------|-------|
| **Type** | system |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/system/coverage-ops-issue-contract-v1.md` |
| **Last Updated** | 2026-03-14 |
| **Summary** | Canonical issue contract for Coverage Ops v1 — issue types, severity, gating, and UI action mappings. |
| **Systems** | coverage-operations, issue-scanner, admin |

# Coverage Ops Issue Contract (v1)

## Purpose

This document is the single source of truth for Coverage Ops issue semantics in v1.

It defines:
- issue type names
- severity and problem class
- gating/applicability rules
- action mappings used by Coverage Ops UI

Issue types remain field-level in v1 for deterministic operator actions.

---

## Read Precedence

Scanner checks canonical first, then entity fallback where applicable:

1. `canonical_entity_state`
2. `entities`

This applies to visit-fact checks like hours, price level, and reservation links.

---

## Tier 2 Visit Facts Contract

| issue_type | problem_class | severity | gating/applicability | detection summary | UI action |
|-----------|---------------|----------|----------------------|-------------------|----------|
| `missing_hours` | `location` | medium | all active entities | no `canonical_entity_state.hours_json` and no `entities.hours` fallback | Run Stage 1 |
| `missing_price_level` | `location` | low | food/drink verticals (`EAT`, `COFFEE`, `WINE`, `DRINKS`, `BAKERY`) | no `canonical_entity_state.price_level` and no `entities.priceLevel` fallback | Run Stage 1 |
| `missing_menu_link` | `location` | low | food/drink verticals (`EAT`, `COFFEE`, `WINE`, `DRINKS`, `BAKERY`) | no `canonical_entity_state.menu_url` | Run Stage 6 |
| `missing_reservations` | `location` | low | reservation-likely verticals (`EAT`, `DRINKS`, `WINE`, `STAY`) | no `canonical_entity_state.reservation_url` and no `entities.reservationUrl` fallback | Run Stage 6 |
| `operating_status_unknown` | `location` | medium | only when `entities.googlePlaceId` exists | `entities.businessStatus` missing/blank | Run Stage 1 |
| `google_says_closed` | `identity` | high | entity has Google status | Google reports closure inconsistent with current entity status | Mark Closed / Still Open |

---

## Baseline Tier 1/Identity Issue Contract (Current)

| issue_type | problem_class | severity | UI action |
|-----------|---------------|----------|----------|
| `unresolved_identity` | `identity` | critical | Find GPID / inline GPID entry |
| `missing_gpid` | `identity` | medium | Find GPID |
| `enrichment_incomplete` | `identity` | high | Enrich |
| `missing_coords` | `location` | high | Run Stage 1 |
| `missing_neighborhood` | `location` | medium | Derive |
| `missing_website` | `contact` | medium | Discover Web / inline website |
| `missing_phone` | `contact` | low | Run Stage 1 / inline phone |
| `missing_instagram` | `social` | low | Discover IG / inline handle |
| `missing_tiktok` | `social` | low | Discover TikTok / inline handle |
| `potential_duplicate` | `identity` | medium | Review / Merge |

`potential_duplicate` is generated via duplicate scan path and handled in Coverage Ops merge flow.

---

## Action Routing

Current action routes used by Coverage Ops:

- Stage 1/6 enrichment: `POST /api/admin/tools/enrich-stage`
- Neighborhood derivation: `POST /api/admin/tools/derive-neighborhood`
- Social/website discovery: `POST /api/admin/tools/discover-social`
- GPID find: `POST /api/admin/tools/seed-gpid-queue`
- Closure override/write: `PATCH /api/admin/entities/[id]/patch`
- Resolve/suppress issue state: `POST /api/admin/tools/scan-issues`

---

## Provenance (v1)

No schema changes are required for v1 provenance hints.

If needed in issue detail payloads, derive lightweight fields from existing data:
- `source_system`
- `source_url`
- `observed_at`
- `confidence`

Suggested source order:
1. sanctioned claim path (`canonical_sanctions` -> `observed_claims`)
2. evidence fallback (`merchant_surface_scans`, `menu_fetches`, `merchant_enrichment_runs`)

---

## SAIKO-DATA-PIPELINE-QUICK-START

| Field | Value |
|-------|-------|
| **Type** | reference |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/DATA_PIPELINE_QUICK_START.md` |
| **Last Updated** | 2026-03-17 |
| **Summary** | Quick-start guide for entity intake and enrichment. Start here if you have a list of place names to add. |
| **Systems** | data-pipeline |

# Data Pipeline — Quick Start

You have a list of restaurant/bar/cafe names. Here's how to get them into Saiko and enriched.

---

## Fastest path: Smart Enrich

Give it names, it does the rest. Finds the website, Instagram, neighborhood, and coordinates — cheapest path first.

```bash
# One name
npm run enrich:smart -- --name="Bavel"

# A list
npm run enrich:smart -- --names="Bavel,Bestia,Republique,Kismet,Sushi Park"

# From a file (one name per line)
npm run enrich:smart -- --file=data/new-places.txt

# Cheap mode — just web search + scrape, no Google API (~$0.01/entity)
npm run enrich:smart -- --file=data/new-places.txt --cheap
```

Smart enrich handles dedup (won't create duplicates), intake (creates CANDIDATE entities), discovery (finds website + IG via Haiku), surface scraping (free), and gap fill (Google Places only if needed).

---

## What it does per entity

| Phase | Cost | What happens |
|---|---|---|
| 1. Discover | ~$0.01 | Claude Haiku + web search → finds website, Instagram, neighborhood |
| 2. Scrape | FREE | Fetches the website, discovers menu/about/contact pages |
| 3. Parse | FREE | Extracts structured data from scraped HTML |
| 4. Gap fill | ~$0.03 | Google Places for coords/hours — only if still missing after scraping |

Total: $0.01–0.04 per entity. At 100 entities: ~$1–4.

---

## If you need deep enrichment

After smart enrich, entities have identity (website, IG, coords, GPID). For AI-generated signals and taglines, run the full pipeline:

```bash
# Full pipeline on entities that already exist
npm run enrich:place -- --batch=50 --concurrency=5
```

This adds: AI identity signals (chef, cuisine, vibe), menu/reservation URL extraction, and generated taglines. Costs ~$0.06–0.08 more per entity (Claude Sonnet calls).

---

## Bulk intake from CSV

For structured data (with columns like Google Place ID, website, neighborhood):

```bash
# Via API
curl -X POST localhost:3000/api/admin/intake \
  -F "file=@data/new-places.csv"
```

CSV columns: `Name, Google Place ID, Website, Instagram Handle, Neighborhood`

The intake endpoint handles dedup automatically — GPID match, domain match, IG match, then fuzzy name match. Ambiguous matches go to the intake review queue.

---

## Check what needs work

```bash
# See all data quality issues
curl "localhost:3000/api/admin/tools/scan-issues?detail=true" | jq '.issues | length'

# Or use the Coverage Ops dashboard
open http://localhost:3000/admin/coverage-ops
```

---

## Full command reference

See `docs/PIPELINE_COMMANDS.md` for the complete operator reference.

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
| **Last Updated** | 2026-03-17 |
| **Systems** | database |

# Database Setup

## Production: Neon (PostgreSQL)

Saiko uses **Neon** as its single production database with connection pooling.

- **Provider:** Neon (PostgreSQL, managed)
- **Region:** US-East-1 (AWS)
- **Connection:** Pooler endpoint (`-pooler.` subdomain)
- **ORM:** Prisma 6.0
- **Schema:** 57 models, 63+ migrations

The `DATABASE_URL` in `.env.local` should point to the Neon pooler endpoint:
```
DATABASE_URL="postgresql://neondb_owner:<password>@ep-<id>-pooler.<region>.neon.tech/neondb?sslmode=require&channel_binding=require"
```

Production `DATABASE_URL` is also set in Vercel Environment Variables (dashboard).

---

## Local Development: Postgres

For local dev without hitting Neon:

### Option A: Postgres.app (easiest on Mac)

1. Download [Postgres.app](https://postgresapp.com/)
2. Open it and click "Initialize"
3. Add to PATH: `sudo mkdir -p /etc/paths.d && echo /Applications/Postgres.app/Contents/Versions/latest/bin | sudo tee /etc/paths.d/postgresapp`

### Option B: Homebrew

```bash
brew install postgresql@16
brew services start postgresql@16
```

### Create the database

```bash
createdb saiko_maps
```

### Use local DB with dev server

```bash
npm run dev:local
```

This runs `scripts/db-local.sh`, which overrides `DATABASE_URL` to `postgresql://youruser@localhost:5432/saiko_maps`.

---

## Migrations

```bash
npx prisma migrate dev       # Dev: create + apply migrations
npx prisma migrate deploy    # Prod: apply pending migrations only
npx prisma generate          # Regenerate Prisma client after schema changes
```

Migrations live in `prisma/migrations/`. The codebase favors **additive migrations**. Destructive migrations (column drops, table drops) are deferred and require manual pre-flight checks — see `docs/DEFERRED_MIGRATION_GATES.md`.

---

## Verify Connection

```bash
npm run db:whoami             # Show which DB you're connected to
curl localhost:3000/api/health  # Health check (dev server running)
npx prisma db pull            # Pull schema from DB (confirms connection)
```

---

## Troubleshooting

### "User was denied access on the database"
- PostgreSQL isn't running, or `DATABASE_URL` has wrong credentials
- Check: `psql $DATABASE_URL -c "SELECT 1"` — does it connect?

### Wrong database
- The dev server banner shows which DB classification (NEON / LOCAL) is in use
- `npm run db:whoami` confirms the connection
- If using wrapper scripts, `SAIKO_DB_FROM_WRAPPER=1` ensures the wrapper's URL wins

---

## SAIKO-ENV-TEMPLATE

| Field | Value |
|-------|-------|
| **Type** | reference |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/ENV_TEMPLATE.md` |
| **Last Updated** | 2026-03-17 |

# Environment Variables

Saiko uses three env files. No more.

| File | Role | Gitignored |
|---|---|---|
| `.env` | Non-sensitive defaults and feature flags | Yes |
| `.env.local` | All secrets (DB, API keys, tokens). Overrides `.env`. | Yes |
| `.env.example` | Template with every variable name and comments. No values. | No |

Production secrets live in **Vercel Environment Variables** (dashboard), not in files.

---

## Setup

```bash
# 1. Copy the template
cp .env.example .env.local

# 2. Fill in your secrets (DATABASE_URL, API keys, etc.)
#    See .env.example for the full list with comments.

# 3. Run
npm run dev
```

---

## Variable Reference

### Database
| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` | `.env.local` | Neon pooler endpoint. `postgresql://...@...-pooler...neon.tech/neondb` |
| `DB_ENV` | `.env.local` | `dev` or `prod` |

### Auth
| Variable | Where | Notes |
|---|---|---|
| `NEXTAUTH_SECRET` | `.env.local` | Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `.env` | `http://localhost:3000` (default) |
| `ADMIN_EMAILS` | `.env.local` | Comma-separated admin allowlist |

### AI
| Variable | Where | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | `.env.local` | Claude API key |

### Rate Limiting
| Variable | Where | Notes |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | `.env.local` | From Upstash dashboard |
| `UPSTASH_REDIS_REST_TOKEN` | `.env.local` | From Upstash dashboard |

### Storage (Cloudflare R2)
| Variable | Where | Notes |
|---|---|---|
| `R2_ACCESS_KEY_ID` | `.env.local` | R2 auth |
| `R2_SECRET_ACCESS_KEY` | `.env.local` | R2 auth |
| `R2_ENDPOINT` | `.env.local` | `https://<account>.r2.cloudflarestorage.com` |
| `R2_BUCKET_NAME` | `.env` | `saiko-assets` (not secret) |

### Google
| Variable | Where | Notes |
|---|---|---|
| `GOOGLE_PLACES_API_KEY` | `.env.local` | Backend Places API |
| `GOOGLE_PLACES_ENABLED` | `.env` | `false` by default (cost control) |
| `GOOGLE_OAUTH_CLIENT_ID` | `.env.local` | Google Docs sync |
| `GOOGLE_OAUTH_CLIENT_SECRET` | `.env.local` | Google Docs sync |

### Error Tracking (Sentry)
| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | `.env.local` | Client-side Sentry DSN |
| `SENTRY_DSN` | `.env.local` | Server-side (same value) |

### Feature Flags
| Variable | Where | Notes |
|---|---|---|
| `GOOGLE_PLACES_ENABLED` | `.env` | `false` = no Places API calls |
| `DEBUG_ROUTES_ENABLED` | `.env` | `false` = debug endpoints return 404 |
| `AUTH_DEBUG` | `.env.local` | `true` = verbose auth logging (dev only) |

---

## Load Order

Next.js loads `.env` first, then `.env.local` (overrides). The `scripts/load-env.js` loader follows the same pattern. Wrapper scripts (`db-neon.sh`, `db-local.sh`) set `DATABASE_URL` before loading, so their value wins.

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
| **Last Updated** | 2026-03-17 |
| **Systems** | data-pipeline |

# Pipeline Commands

Operator reference for all enrichment and coverage tools. All commands assume you're in the project root with environment loaded.

---

## Smart Enrich (recommended entry point)

Cost-optimized pipeline. Discovers identity via cheap Haiku web search first, scrapes for free, only calls Google Places if gaps remain. ~$0.01–0.04/entity.

```bash
# Single entity
npm run enrich:smart -- --name="Bavel"
npm run enrich:smart -- --name="Bestia" --neighborhood="Arts District"

# Batch (comma-separated)
npm run enrich:smart -- --names="Bavel,Bestia,Republique,Kismet"

# Batch from file (one name per line)
npm run enrich:smart -- --file=data/new-places.txt

# Cheap only (~$0.01/entity — skip Google Places)
npm run enrich:smart -- --names="Bavel,Bestia" --cheap

# Dry run (no writes)
npm run enrich:smart -- --name="Bavel" --dry-run
```

**API:**
```bash
# Single
curl -X POST localhost:3000/api/admin/smart-enrich \
  -H "Content-Type: application/json" \
  -d '{"name": "Bavel"}'

# Batch
curl -X POST localhost:3000/api/admin/smart-enrich \
  -H "Content-Type: application/json" \
  -d '{"names": ["Bavel", "Bestia", "Republique"]}'
```

---

## Full 7-Stage Pipeline

When you need the full enrichment pipeline (Google Places + AI signals + taglines). ~$0.12/entity.

```bash
# Single entity (stages 2–7, website-first)
npm run enrich:place -- --slug=republique

# Include Google Places (stage 1)
npm run enrich:place -- --slug=republique --from=1

# Resume from specific stage
npm run enrich:place -- --slug=republique --from=3

# Run only one stage
npm run enrich:place -- --slug=republique --only=5

# Batch (25 entities, website-first)
npm run enrich:batch

# Batch with concurrency
npm run enrich:place -- --batch=50 --concurrency=5

# Batch including Google Places
npm run enrich:place -- --batch=50 --include-google
```

**Stages:**
1. Google Places identity commit (GPID, coords, hours, photos)
2. Surface discovery (find homepage/menu/about/contact URLs)
3. Surface fetch (capture raw HTML)
4. Surface parse (structure captured content into artifacts)
5. Identity signal extraction (AI → derived_signals)
6. Website enrichment (menu_url, reservation_url → Fields v2)
7. Tagline generation (AI → interpretation_cache)

---

## GPID Resolution

Find Google Place IDs for entities that don't have one.

```bash
# Single entity (via API)
curl -X POST localhost:3000/api/admin/tools/seed-gpid-queue \
  -H "Content-Type: application/json" \
  -d '{"entityId": "entity-uuid-here"}'

# Batch by entity IDs (single API call)
curl -X POST localhost:3000/api/admin/tools/seed-gpid-queue \
  -H "Content-Type: application/json" \
  -d '{"entityIds": ["id1", "id2", "id3"]}'

# Scan all entities without GPID (up to 200)
curl -X POST localhost:3000/api/admin/tools/seed-gpid-queue \
  -H "Content-Type: application/json" -d '{}'
```

High-confidence matches (≥0.85 similarity) are auto-applied. Ambiguous/no-match cases go to the GPID Queue at `/admin/gpid-queue` for human review.

---

## Social Discovery

Find Instagram, TikTok, or website via Claude Haiku + web search. ~$0.01/call.

```bash
# Single entity (synchronous, ~5s)
curl -X POST localhost:3000/api/admin/tools/discover-social \
  -H "Content-Type: application/json" \
  -d '{"mode": "instagram", "slug": "republique"}'

# Modes: instagram | tiktok | website | both
curl -X POST localhost:3000/api/admin/tools/discover-social \
  -H "Content-Type: application/json" \
  -d '{"mode": "both", "slug": "republique"}'

# Batch (background)
curl -X POST localhost:3000/api/admin/tools/discover-social \
  -H "Content-Type: application/json" \
  -d '{"mode": "instagram", "limit": 50}'
```

---

## Enrichment Stage Re-run

Run a specific enrichment stage without the full pipeline.

```bash
# Run stage 5 only (AI signal extraction)
curl -X POST localhost:3000/api/admin/tools/enrich-stage \
  -H "Content-Type: application/json" \
  -d '{"slug": "republique", "stage": 5}'

# Run stages 3–7
curl -X POST localhost:3000/api/admin/tools/enrich-stage \
  -H "Content-Type: application/json" \
  -d '{"slug": "republique", "from": 3}'
```

---

## Issue Scanning

Detect data quality issues across all entities.

```bash
# Full scan (all non-CANDIDATE entities)
curl -X POST localhost:3000/api/admin/tools/scan-issues \
  -H "Content-Type: application/json" \
  -d '{"action": "scan"}'

# Scan single entity
curl -X POST localhost:3000/api/admin/tools/scan-issues \
  -H "Content-Type: application/json" \
  -d '{"action": "scan", "slug": "republique"}'

# Get issue summary
curl -X POST localhost:3000/api/admin/tools/scan-issues \
  -H "Content-Type: application/json" \
  -d '{"action": "summary"}'

# Get detailed issues for triage board
curl "localhost:3000/api/admin/tools/scan-issues?detail=true"
```

---

## Coverage Dashboards

| Page | URL | Purpose |
|---|---|---|
| Coverage | `/admin/coverage` | Diagnostic dashboard — resolution health, tier summary, neighborhoods, missing fields |
| Coverage Ops | `/admin/coverage-ops` | Triage board — actionable issues with inline resolution tools |
| GPID Queue | `/admin/gpid-queue` | Human review queue for ambiguous GPID matches |

---

## Health Check

```bash
curl localhost:3000/api/health
# Returns: { "status": "ok", "db": "connected", "latency_ms": N }
```

---

## Cost Reference

| Tool | Cost/entity | When to use |
|---|---|---|
| Smart enrich (cheap) | ~$0.01 | New entity intake — find website + IG |
| Smart enrich (full) | ~$0.01–0.04 | New entity + fill all gaps including coords |
| Full pipeline (enrich:place) | ~$0.12 | Deep enrichment — AI signals + taglines |
| Social discovery | ~$0.01 | Fill missing Instagram/TikTok/website |
| GPID resolution | ~$0.03 | Find Google Place ID for coords/hours |

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

## ENRICH-PLAYBOOK-V1

| Field | Value |
|-------|-------|
| **Type** | runbook |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/enrichment-playbook-v1.md` |
| **Last Updated** | 2026-03-16 |
| **Summary** | Reusable, sequenced playbook for enriching 1,000+ entities at city-launch scale. Tool inventory, fully-enriched benchmark, gap analysis, 7-phase execution sequence (free→paid), cost model (~$5-10 per 1K entities), monitoring, and new-city checklist. |
| **Systems** | enrichment-pipeline, fields-data-layer, coverage-operations |

# City Launch Enrichment Playbook v1

Reusable, sequenced playbook for enriching 1,000+ entities at city-launch
scale. Designed to maximize coverage at minimum cost. Free before paid.
Evidence before canonical. Dry-run before writes.

---

## 1. Tool Inventory

### 1A. ERA Pipeline Stages (orchestrated by `npm run enrich:place`)

| # | Stage | Script | Source | Writes To | Cost |
|---|-------|--------|--------|-----------|------|
| 1 | Google Places identity | `backfill-google-places.ts` | Google Places API | `entities` (GPID, coords, address, hours, photos, neighborhood) | **$$** ~$0.007/entity |
| 2 | Surface discovery | `run-surface-discovery.ts` | Entity website (domain crawl) | `merchant_surfaces` (homepage, about, menu, contact URLs) | Free |
| 3 | Surface fetch | `run-surface-fetch.ts` | Discovered surface URLs | `merchant_surfaces` (raw HTML/text, content_hash) | Free |
| 4 | Surface parse | `run-surface-parse.ts` | Stored raw_html/raw_text | `merchant_surface_artifacts` (structured text_blocks) | Free |
| 5 | Identity signals (AI) | `extract-identity-signals.ts` | Parsed artifacts (menu, about, wine copy) | `derived_signals` (cuisine_posture, service_model, price_tier, wine_program, personality, signature_dishes) | **$** ~$0.001/entity (Claude Haiku) |
| 6 | Website enrichment | `run-website-enrichment.ts` | Website HTML | `merchant_signals` + `entities` (menu_url, reservation_url, category, cuisine); also `observed_claims` at confidence >= 0.75 | **$** ~$0.002-0.005/entity (Claude) |
| 7 | Tagline generation (AI) | `generate-taglines-v2.ts` | Identity signals + entity data | `interpretation_cache` (TAGLINE, candidates, pattern) | **$** ~$0.0008/entity (Claude) |

Pipeline defaults to `--from=2` (skips Google Places). Use `--include-google`
to start from stage 1.

### 1B. Social Discovery

| Tool | Trigger | Source | Writes To | Cost |
|------|---------|--------|-----------|------|
| discover-social (Instagram) | `POST /api/admin/tools/discover-social` `{ mode: "instagram", slug }` | Claude Haiku + web_search | `entities.instagram` (medium/high confidence only) | **$** ~$0.001/entity |
| discover-social (TikTok) | `POST /api/admin/tools/discover-social` `{ mode: "tiktok", slug }` | Claude Haiku + web_search | `entities.tiktok` (medium/high confidence only) | **$** ~$0.001/entity |
| discover-social (website) | `POST /api/admin/tools/discover-social` `{ mode: "website", slug }` | Claude Haiku + web_search | `entities.website` (medium/high confidence only) | **$** ~$0.001/entity |
| discover-social (batch) | `POST /api/admin/tools/discover-social` `{ mode: "both", limit: N }` | Claude Haiku + web_search | `entities.instagram` + `entities.website` | **$** ~$0.002/entity |

**Note:** Batch mode spawns `scripts/discover-social.ts` as background process.
This script does **not yet exist on disk** — the API route handles single-entity
inline, but the batch script file is missing. Needs to be created before bulk
social discovery runs.

### 1C. Merchant Surface Scanner

| Tool | Command | Source | Writes To | Cost |
|------|---------|--------|-----------|------|
| scan-merchant-surfaces | `npx tsx scripts/scan-merchant-surfaces.ts [--limit=N] [--slug=<slug>]` | Entity website homepage | `merchant_surface_scans` (platform, menu format/URL, reservation platform/URL, ordering platform/URL, Instagram URL, newsletter, gift cards, careers, private dining, sibling entities) | Free |

This is a detection-only pass — append-only snapshots to
`merchant_surface_scans`. Covers EAT entities in the LA bounding box with
websites. Concurrency=6, timeout=12s.

### 1D. Canonical Population

| Tool | Command | Source | Writes To | Cost |
|------|---------|--------|-----------|------|
| populate-canonical-state | `npx tsx scripts/populate-canonical-state.ts [--dry-run] [--limit=N]` | `entities` + `golden_records` (fallback) | `canonical_entity_state`, `canonical_sanctions`, `observed_claims`, `derived_signals`, `interpretation_cache` | Free |

Promotes existing entity data to the Fields v2 canonical layer. Creates
`canonical_entity_state` rows with sanctions recording provenance. Also migrates
taglines to `interpretation_cache` and identity signals to `derived_signals`.

### 1E. Coverage Gap Fill (Google Places)

| Tool | Command | Source | Writes To | Cost |
|------|---------|--------|-----------|------|
| coverage-apply | `npm run coverage:apply:neon -- --limit=20 --apply` | Google Places API (Details + Attributes) | `entities` (hours, googlePhotos, googlePlacesAttributes, businessStatus), `place_coverage_status` | **$$** ~$0.007-0.02/entity |

Targets three specific gap groups: `NEED_GOOGLE_PHOTOS`, `NEED_HOURS`,
`NEED_GOOGLE_ATTRS`. Requires `--apply` flag for writes (default is dry-run).
Rate limit 250ms between calls. JSON report written to `data/coverage/`.

### 1F. Instagram / Meta Toolchain

Full Instagram pipeline — discovery, ingestion, and operator actions. Requires
`INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_USER_ID` in `.env.local`.

**Discovery (find handles):**

| Tool | Command | Source | Writes To | Cost |
|------|---------|--------|-----------|------|
| Handle extraction from surfaces | `npm run backfill:instagram-handles` | Parsed `merchant_surfaces` (Instagram URLs in HTML) | `entities.instagram` | Free |
| Handle finder (web search) | `npm run find:instagram` | Web search for official IG handles | CSV output for review → merge | Free |
| Handle finder (LA county) | `npm run find:instagram:la` | Web search, LA county scope | `data/instagram-la-suggestions.csv` | Free |
| Handle finder (Tier 1+2) | `npm run find:instagram:tier12` | Web search, top-tier entities | `data/instagram-tier12-suggestions.csv` | Free |
| Scrape from websites | `scripts/scrape-instagram-from-websites.ts` | Entity website HTML | `entities.instagram` | Free |
| Merge to golden records | `npm run merge:instagram` | Suggestions CSV | `golden_records` | Free |

**Ingestion (fetch media via Meta Graph API):**

| Tool | Command | Source | Writes To | Cost |
|------|---------|--------|-----------|------|
| Single entity | `npm run ingest:instagram -- --username=<handle> --entity-id=<id>` | Instagram Business Discovery API | `instagram_accounts`, `instagram_media` | Free (rate-limited) |
| Batch (all with handles) | `npm run ingest:instagram -- --batch` | Instagram Business Discovery API | `instagram_accounts`, `instagram_media` | Free (rate-limited) |
| Hours from Instagram | `scripts/backfill-instagram-hours.ts` | Instagram business profile data | Entity hours | Free |

**Admin API (operator actions):**

| Action | Endpoint | What it does |
|--------|----------|-------------|
| `backfill` | `POST /api/admin/tools/instagram-discover` `{ action: "backfill" }` | Extract handles from `merchant_surfaces` → `entities.instagram` (background) |
| `ingest` | `POST /api/admin/tools/instagram-discover` `{ action: "ingest", slug }` | Fetch media for one entity via Graph API (background) |
| `ingest batch` | `POST /api/admin/tools/instagram-discover` `{ action: "ingest", batch: true }` | Fetch media for all entities with handles (background) |
| `set` | `POST /api/admin/tools/instagram-discover` `{ action: "set", entityId, handle }` | Manually set handle (inline) |
| `confirm none` | `POST /api/admin/tools/instagram-discover` `{ action: "set", entityId, none: true }` | Confirm entity has no Instagram (inline, sets `NONE`) |

**Rate limits:** Meta Graph API — 200-3000 calls/hour depending on endpoint.
Default inter-account delay: 3s. Media limit per account: 200 (configurable).

**Export tools (for offline review):**

| Tool | Command | Output |
|------|---------|--------|
| Export backfill list | `npm run export:instagram` | CSV of entities needing IG handles |
| Export LA county | `npm run export:instagram:la` | CSV of LA county entities missing IG |
| Export Tier 1+2 | `npm run export:instagram:tier12` | CSV of top-tier entities missing IG |

### 1G. Standalone Backfill Tools

| Tool | npm script | Source | Writes To | Cost |
|------|-----------|--------|-----------|------|
| Google Place ID backfill | `backfill:gpid:neon` | Google Places Text Search | `golden_records.google_place_id` | **$$** ~$0.007/entity |
| Website from Google | `backfill:websites` | Google Places Details | `entities.website` | **$$** ~$0.007/entity |
| Address backfill | `backfill:entities-address` | Google Places Details | `entities.address` | **$$** ~$0.007/entity |
| Neighborhood backfill | `backfill:neighborhood` | Google Places address_components | `entities.neighborhood` | **$$** ~$0.007/entity |
| Google attrs backfill | `backfill:google-attrs` | Google Places API | `entities.googlePlacesAttributes` | **$$** ~$0.02/entity |
| Confidence scoring | `backfill:confidence` | Multi-source analysis | `entities.confidence` | Free |

### 1H. Admin API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/enrich/[slug]` | POST | Trigger single-entity pipeline (background, stages 2-7) |
| `/api/admin/enrich/[slug]` | GET | Poll enrichment progress (stage 1-7, done flag) |
| `/api/admin/tools/enrich-stage` | POST | Re-run specific stage or resume from stage |
| `/api/admin/tools/discover-social` | POST | Social handle/website discovery (Claude + web_search) |
| `/api/admin/tools/scan-issues` | POST | Run issue scanner on entity |
| `/api/admin/tools/derive-neighborhood` | POST | Derive neighborhood from coordinates |
| `/api/admin/tools/instagram-discover` | POST | Instagram handle discovery |
| `/api/admin/tools/seed-gpid-queue` | POST | Queue entities for GPID resolution |

### 1I. Coverage Dashboard SQL (lib/admin/coverage/sql.ts)

Cross-reference point. The Coverage Ops dashboard runs these audit queries:

- `OVERVIEW_COUNTS_SQL` — total DB, addressable, reachable, dark inventory
- `REACHABLE_MISSING_FIELDS_SQL` — per-field null counts for reachable entities
  (slug, name, latlng, google_place_id, hours, phone, website, instagram, neighborhood)
- `REACHABLE_NEIGHBORHOOD_SCORECARD_SQL` — per-neighborhood completion rates
- `REACHABLE_REDFLAGS_SQL` — entities failing Tier-1 (missing slug/name/coords/GPID)
- `FIELDS_BREAKDOWN_*_SQL` — field completion across reachable, addressable, total DB cohorts

### 1J. Missing Tools (referenced in prompt but not yet built)

| Tool | Gap | Status |
|------|-----|--------|
| `scripts/discover-social.ts` (batch CLI) | Batch social discovery spawned by API route | API route exists, batch script file does not |
| `signals:menu:sync` npm script | Menu URL sync from merchant signals | No npm script or script file found |

---

## 2. Fully Enriched Entity — the Benchmark

Definition of "done" varies by `primary_vertical`. A restaurant (EAT) is the
most demanding. Other verticals (COFFEE, SHOP, STAY) require subsets.

### EAT Entity — Complete Profile

**Identity-critical** (required for publication):
- `name` — sanctioned via Fields v2
- `latitude`, `longitude` — from Google Places or intake CSV
- `google_place_id` — optional but strongly preferred (taco carts may lack)
- `address` — from Google Places or website

**Operational** (expected for quality):
- `neighborhood` — from Google Places address_components
- `phone` — from Google Places or website
- `website` — from intake, Google Places, or discover-social
- `hours` — from Google Places or website
- `instagram` — from website scrape, discover-social, or manual
- `tiktok` — from website scrape, discover-social, or manual
- `price_level` — from Google Places
- `reservation_url` — from website enrichment (Stage 6) or scan-merchant-surfaces
- `menu_url` — from website enrichment (Stage 6) or scan-merchant-surfaces
- `category` + `cuisine_type` — from website enrichment (Stage 6)

**Content** (differentiating):
- `derived_signals.identity_signals` — from AI extraction (Stage 5)
- `interpretation_cache.TAGLINE` — from AI generation (Stage 7)
- `description` — from editorial source, website, or synthesis

**Canonical layer** (Fields v2):
- `canonical_entity_state` row populated with best values from evidence
- `canonical_sanctions` audit trail for each sanctioned field
- `observed_claims` backing each canonical value

**Convenience / display**:
- `google_photos` — from Google Places
- `merchant_signals` — menu/reservation/ordering URLs + providers
- `merchant_surface_scans` — homepage detection snapshot

**Fully enriched** in pipeline terms = `interpretation_cache` has a `TAGLINE`
row with `is_current=true`.

### Other Verticals — Reduced Playbooks

| Vertical | Drops compared to EAT |
|----------|----------------------|
| COFFEE | No reservation_url, no menu_url usually, no cuisine_type |
| SHOP | No menu_url, no reservation_url, hours requirement relaxed |
| STAY | No menu_url, reservation_url = booking link, no cuisine_type |
| CULTURE | No menu_url, no reservation_url, no cuisine_type |

---

## 3. Coverage Gap Analysis

### Gap Ranking (estimated, pre-query)

Based on the issue scanner rules (`lib/coverage/issue-scanner.ts`) and the
coverage dashboard SQL queries:

| Rank | Gap | Issue Type | Blocking? | Tool to Fix |
|------|-----|-----------|-----------|-------------|
| 1 | No enrichment run at all | `enrichment_incomplete` | Yes | ERA pipeline (stages 2-7) |
| 2 | Missing website | `missing_website` | No | `discover-social` (mode=website) or `backfill:websites` (Google $$) |
| 3 | Missing Instagram | `missing_instagram` | No | `backfill:instagram-handles` (free, from surfaces) then `discover-social` (mode=instagram, $) |
| 4 | Missing neighborhood | `missing_neighborhood` | No | `derive-neighborhood` API or `backfill:neighborhood` (Google $$) |
| 5 | Missing hours | `missing_hours` | No | `coverage:apply:neon --apply` (Google $$) |
| 6 | Missing phone | `missing_phone` | No | Google Places (Stage 1 $$) |
| 7 | Missing TikTok | `missing_tiktok` | No | `discover-social` (mode=tiktok, $) |
| 8 | Missing price level | `missing_price_level` | No | Google Places or AI inference (Stage 5) |
| 9 | Missing GPID | `missing_gpid` | No | `backfill:gpid:neon` (Google $$) |
| 10 | Missing coords | `missing_coords` | Yes | Google Places (Stage 1 $$) |
| 11 | Missing canonical_entity_state | N/A | No | `populate-canonical-state.ts` (free) |

### Actual Counts (run before execution)

Run these queries to get current numbers before starting:

```bash
# Overview counts (total, addressable, reachable, dark inventory)
# Uses OVERVIEW_COUNTS_SQL from lib/admin/coverage/sql.ts

# Missing fields for reachable entities
# Uses REACHABLE_MISSING_FIELDS_SQL

# Or use the Coverage Ops dashboard at /admin/coverage-ops
```

### The Two Populations

1. **Has website (~80%)** — full pipeline (stages 2-7) can run autonomously.
   Google Places (stage 1) is optional if coords/address exist from intake.

2. **No website (~20%)** — parks, markets, street vendors, civic venues.
   Need `discover-social` (website mode) first, then pipeline. If no website
   found, need Google Places for identity + social discovery for handles.

---

## 4. Tool-to-Gap Mapping

| Field Gap | Free Tool | Paid Tool (fallback) |
|-----------|-----------|---------------------|
| website | `discover-social` (mode=website, $0.001) | `backfill:websites` (Google, $0.007) |
| instagram | `backfill:instagram-handles` (from surfaces) | `discover-social` (mode=instagram, $0.001) |
| tiktok | (none free) | `discover-social` (mode=tiktok, $0.001) |
| neighborhood | `derive-neighborhood` API (from existing coords) | `backfill:neighborhood` (Google, $0.007) |
| hours | (none free) | `coverage:apply:neon` (Google, $0.007) |
| phone | (none free) | Google Places Stage 1 ($0.007) |
| coords | (none free) | Google Places Stage 1 ($0.007) |
| price_level | Stage 5 AI inference (from menu text) | Google Places Stage 1 ($0.007) |
| menu_url | Stage 6 or `scan-merchant-surfaces` (free) | (none needed) |
| reservation_url | Stage 6 or `scan-merchant-surfaces` (free) | (none needed) |
| google_place_id | (none free) | `backfill:gpid:neon` (Google, $0.007) |
| identity_signals | Stage 5 (requires surfaces, $0.001) | (none) |
| tagline | Stage 7 (requires Stage 5 output, $0.0008) | (none) |
| canonical_entity_state | `populate-canonical-state.ts` (free) | (none needed) |
| google_photos | (none free) | `coverage:apply:neon` (Google, $0.007) |

### Gaps with NO existing tool:

- **TikTok ingestion** — field exists in schema, `discover-social` can find
  handles, but no automated content ingestion script (unlike Instagram)
- **Editorial coverage crawl** — `coverage_sources` stores editorial links
  but no automated discovery/extraction pipeline exists

---

## 5. Execution Sequence — the Playbook

### Pre-flight Checklist

1. **Entities ingested** — `name`, `slug`, `primary_vertical` at minimum.
   Ideally `website` and/or `googlePlaceId` from intake CSVs.
2. **Source + attribute registries populated** — `source_registry`,
   `attribute_registry` seeded with `seed-fields-v2-registries.ts`
3. **API keys set** — `ANTHROPIC_API_KEY` (required), `GOOGLE_PLACES_API_KEY`
   + `GOOGLE_PLACES_ENABLED=true` (Phase 5 only), `INSTAGRAM_ACCESS_TOKEN` (optional)
4. **Dry run** — `npm run enrich:place -- --batch=5 --dry-run` to verify
   pipeline connectivity

### Phase 1 — Surface Discovery (free to low cost)

**Goal:** Fill `website` and `instagram` for entities that are missing them.
Do not call Google Places API at this stage.

**Step 1a — Extract IG handles from existing surfaces (free):**
```bash
npm run backfill:instagram-handles -- --dry-run
npm run backfill:instagram-handles
```
Parses already-fetched `merchant_surfaces` for Instagram links. Pure DB + string parsing.

**Step 1b — AI social discovery for remaining gaps (Anthropic $):**
```bash
# Single entity
curl -X POST /api/admin/tools/discover-social \
  -d '{ "mode": "both", "slug": "example-place", "dryRun": true }'

# Batch — NOTE: batch script doesn't exist yet, single-entity only via API
# For now, loop over slugs from a missing-website query
```

**Scope:** Entities where `website IS NULL` or `instagram IS NULL`.
**Cost:** ~$0.001/entity (Claude Haiku + web_search).
**Expected yield:** 40-60% of missing websites, 50-70% of missing IG handles.

### Phase 2 — Free Enrichment (free)

**Goal:** Run all free enrichment tools on entities that now have surfaces.

**Step 2a — Merchant surface scan (free):**
```bash
npx tsx scripts/scan-merchant-surfaces.ts --limit=200 --dry-run
npx tsx scripts/scan-merchant-surfaces.ts --limit=200
```
Detects platform, menu format/URL, reservation/ordering providers, Instagram
URL, newsletter, sibling entities. Writes to `merchant_surface_scans`.

**Step 2b — ERA pipeline stages 2-4 (free):**
```bash
# Surface discovery + fetch + parse
npm run enrich:place -- --batch=50 --concurrency=5 --only=2
npm run enrich:place -- --batch=50 --concurrency=5 --only=3
npm run enrich:place -- --batch=50 --concurrency=5 --only=4
```

**Step 2c — Website enrichment (Anthropic $):**
```bash
npm run enrich:website -- --limit=50
```
Extracts menu_url, reservation_url, category, cuisine from website HTML.
Writes to `merchant_signals` and `merchant_enrichment_runs`. Also writes
`observed_claims` for high-confidence extractions (>= 0.75).

**Step 2d — Instagram content ingestion (free, rate-limited):**
```bash
npm run ingest:instagram -- --batch
```
For entities with `instagram != null` but no `instagram_accounts` row.
Rate limited by Meta (~200-3000 calls/hour).

### Phase 3 — Canonical Population (free)

**Goal:** Promote evidence to `canonical_entity_state`. Check field
completeness after this step before proceeding to paid phases.

```bash
npx tsx scripts/populate-canonical-state.ts --dry-run
npx tsx scripts/populate-canonical-state.ts
```

Creates `canonical_entity_state` rows, `canonical_sanctions` audit trail,
migrates existing taglines to `interpretation_cache`, and identity signals
to `derived_signals`.

**Post-phase check:** Query `canonical_entity_state` for field completeness.
Identify which entities still have gaps that require AI or Google.

### Phase 4 — AI Extraction (Anthropic $)

**Goal:** Run AI stages on entities that have surfaces but still lack
identity signals and taglines.

**Scope:** Entities with `merchant_surface_artifacts` (from Phase 2) but no
`derived_signals.identity_signals`. Do NOT run AI on entities with no
surfaces — there's nothing to extract from.

```bash
# Identity signal extraction (Stage 5)
npm run enrich:place -- --batch=50 --concurrency=5 --only=5

# Tagline generation (Stage 7) — requires Stage 5 output
npm run enrich:place -- --batch=50 --concurrency=5 --only=7
```

**Prioritization:** Entities closest to publication threshold first (most
fields already populated, just missing signals/tagline).

**Cost:** ~$0.002/entity (Stage 5 + Stage 7 combined).

### Phase 5 — Google Places (Google $$, gaps only)

**Goal:** Fill remaining null fields that free methods couldn't resolve.
Only for entities that still have gaps after all prior phases.

**Step 5a — Coverage apply (targeted gap fill):**
```bash
npm run coverage:apply:neon -- --limit=20
# Review the dry-run report, then:
npm run coverage:apply:neon -- --limit=50 --apply
```
Targets `NEED_GOOGLE_PHOTOS`, `NEED_HOURS`, `NEED_GOOGLE_ATTRS` only.
Requires GPID. Rate limit 250ms.

**Step 5b — GPID resolution (for entities without one):**
```bash
npm run backfill:gpid:neon -- --limit=50
```

**Step 5c — Full Google enrichment (for entities with no surfaces at all):**
```bash
npm run enrich:place -- --batch=50 --include-google --concurrency=3
```
Only for the ~20% of entities with no website and no surfaces.

**Hard rule:** Never call Google API if free sources haven't run first.

**Cost estimate for 1,000 entities:** ~$3-7 (not all need it; many already
have coords and data from intake CSVs).

---

## 6. Hard Rules

1. **Free before paid** — never call Google API if free sources haven't run
2. **Evidence before canonical** — enrichment writes to evidence tables first,
   not directly to `entities` or `canonical_entity_state`
3. **Entity type drives playbook** — don't run restaurant tools on a park
4. **Provenance always** — every field must track its source
5. **No bulk writes without a dry-run report first** — show what will be
   written before committing
6. **Idempotent** — all tools check for existing data before writing; safe
   to re-run

---

## 7. Cost Summary for 1,000 Entities

| Phase | Entities | Cost/Entity | Total | Notes |
|-------|----------|-------------|-------|-------|
| 1. Surface discovery (IG handles) | ~800 | $0 | $0 | Free (parse surfaces) |
| 1. Surface discovery (AI) | ~200 | $0.002 | ~$0.40 | Missing website + IG |
| 2. Free enrichment (scan + pipeline 2-4) | ~800 | $0 | $0 | Free |
| 2. Website enrichment (Claude) | ~800 | $0.003 | ~$2.40 | Anthropic $ |
| 2. Instagram ingestion | ~400 | $0 | $0 | Free (rate-limited) |
| 3. Canonical population | ~1000 | $0 | $0 | Free |
| 4. AI extraction (stages 5+7) | ~600 | $0.002 | ~$1.20 | Anthropic $ |
| 5. Google Places gap fill | ~300 | $0.007 | ~$2.10 | Targeted, not all |
| **Total** | | | **~$6.10** | |

**Per-city launch cost: ~$5-10 for 1,000 entities.**

---

## 8. Monitoring & Observability

### During Runs

- **Logs:** `data/logs/enrich-<slug>-<timestamp>.log` per entity
- **Progress:** `entities.enrichment_stage` (1-7), `entities.last_enriched_at`
- **Admin API:** `GET /api/admin/enrich/<slug>` returns current stage + done flag
- **Cost tracking:** `merchant_enrichment_runs.cost_usd` per extraction

### After Runs

- Coverage Ops dashboard at `/admin/coverage-ops` (Overview, Missing Fields,
  Neighborhoods, Red Flags tabs)
- `REACHABLE_MISSING_FIELDS_SQL` for per-field gap counts
- `FIELDS_BREAKDOWN_*_SQL` for cross-cohort comparison

### Key Metrics to Track

| Metric | Target | How to Check |
|--------|--------|-------------|
| Entities with TAGLINE | >70% of total | `interpretation_cache` count |
| Entities with website | >80% | `entities.website IS NOT NULL` count |
| Entities with GPID | >70% | `entities.googlePlaceId IS NOT NULL` count |
| Entities with identity_signals | >60% | `derived_signals` count |
| canonical_entity_state populated | >90% | `canonical_entity_state` count |
| Blocking issues | 0 | `entity_issues WHERE blocking_publish=true` |

---

## 9. New City Checklist

- [ ] Intake CSVs ingested (`npm run intake`)
- [ ] Entity types + verticals assigned
- [ ] Dedup pass run (check for intake duplicates)
- [ ] Source + attribute registries seeded
- [ ] **Phase 1:** Surface discovery (IG handles from surfaces, then AI discovery)
- [ ] **Phase 2:** Free enrichment (scan surfaces, pipeline 2-4, website enrichment, IG ingestion)
- [ ] **Phase 3:** Canonical population (populate-canonical-state)
- [ ] Check enrichment stats — identify remaining gaps
- [ ] **Phase 4:** AI extraction (stages 5+7 for entities with surfaces)
- [ ] **Phase 5:** Google Places gap fill (targeted, not blanket)
- [ ] Final enrichment stats — verify >70% TAGLINE coverage
- [ ] Triage blocking issues via `/admin/coverage-ops`
- [ ] Retry failed entities
- [ ] Publish ready entities to maps

---

## 10. Known Limitations & Deferred Entities

### Current Limitations

1. **Batch discover-social script missing** — `scripts/discover-social.ts`
   is referenced by the API route for batch mode but does not exist on disk.
   Single-entity discovery works via the API route. Batch requires a script
   to be created.

2. **`signals:menu:sync` does not exist** — no npm script or script file
   found. Menu URL syncing happens within Stage 6 (website enrichment) and
   `scan-merchant-surfaces.ts` but there is no standalone sync tool.

3. **No-website entities** — stages 2-7 require a website. ~20% of entities
   (parks, markets, carts) need `discover-social` (website mode) first. If
   no website found, they are deferred to Google-only + manual.

4. **Tagline not wired to API** — `interpretation_cache.TAGLINE` exists but
   the API route (`/api/places/[slug]`) still reads `entities.tagline`.

5. **TikTok ingestion** — field and discovery exist but no automated content
   ingestion script (unlike Instagram).

6. **Editorial coverage pipeline** — `coverage_sources` stores links but
   no automated discovery/extraction is built.

7. **Stage 5 sparse content** — entities with <50 chars of parseable text
   from surfaces skip signal extraction.

### Deferred Entities (will not be enriched by this playbook)

- Entities with `businessStatus = 'CLOSED_PERMANENTLY'`
- Entities outside the LA bounding box (lat 33.6-34.5, lon -118.9 to -117.6)
- Entities with no website AND no Google Place ID (need manual identity first)

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
| **Last Updated** | 2026-03-17 |

# Data Sync Runbook

Copy-paste commands only. Single database provider: **Neon (PostgreSQL)**.

---

## 1. Check production state

Get your Neon URL from `.env.local` (the `DATABASE_URL` line). Then:

```bash
export NEON_URL="postgresql://..."   # paste from .env.local

psql "$NEON_URL" -c "SELECT count(*) AS entities FROM public.entities;"
psql "$NEON_URL" -c "SELECT count(*) AS lists FROM public.lists;"
psql "$NEON_URL" -c "SELECT count(*) AS map_places FROM public.map_places;"
psql "$NEON_URL" -c "SELECT count(*) AS place_coverage_status FROM public.place_coverage_status;"
psql "$NEON_URL" -c "SELECT count(*) AS place_tag_scores FROM public.place_tag_scores;"
psql "$NEON_URL" -c "SELECT count(*) AS energy_scores FROM public.energy_scores;"
psql "$NEON_URL" -c "SELECT slug FROM public.entities ORDER BY updated_at DESC NULLS LAST LIMIT 10;"
```

---

## 2. Sync source → production Neon

Once you know SOURCE and TARGET URLs, run:

### Dry-run (counts only; no writes)

```bash
npx tsx scripts/sync-db.ts --source "$SOURCE_URL" --target "$TARGET_URL"
```

### Apply (upserts into target)

```bash
npx tsx scripts/sync-db.ts --source "$SOURCE_URL" --target "$TARGET_URL" --apply
```

Sync order: `entities` → `energy_scores` → `place_tag_scores` → `place_coverage_status`. All upserts; no schema changes, no drops.

---

## 3. Dev: which DB the app uses

- **Default (Neon):**
  ```bash
  npm run dev
  ```
  Uses `.env` then `.env.local`; `DATABASE_URL` from `.env.local` wins. Banner shows DB classification.

- **Local DB:**
  ```bash
  npm run dev:local
  ```
  Uses `scripts/db-local.sh` to override `DATABASE_URL` with localhost.

- **Explicit Neon wrapper:**
  ```bash
  ./scripts/db-neon.sh node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/<your-script>.ts
  ```
  Reads `DATABASE_URL` from `.env.local`. Sets `SAIKO_DB_FROM_WRAPPER=1`.

The startup banner always shows which DB is in use. No ambiguity.

---

## 4. Sanity: dev-only DB identity endpoint

With the dev server running:

```bash
curl -sS http://localhost:3000/api/debug/db
```

Returns JSON: `classification`, `host`, `database`, `places_count`. Only available when `DEBUG_ROUTES_ENABLED=true`; 404 otherwise.

---

## 5. Health check (production)

```bash
curl -sS https://yourdomain.com/api/health
```

Returns `{ "status": "ok", "db": "connected", "latency_ms": ... }` or 503 if DB is unreachable.

---

## SAIKO-LOCAL-DEV

| Field | Value |
|-------|-------|
| **Type** | runbook |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/LOCAL_DEV.md` |
| **Last Updated** | 2026-03-17 |

# Local Development

Saiko runs on Next.js 16 + Prisma + Neon (PostgreSQL).

---

## Setup

```bash
# Install dependencies
npm install

# Copy env template and fill in your secrets
cp .env.example .env.local
# Edit .env.local — add DATABASE_URL, ANTHROPIC_API_KEY, NEXTAUTH_SECRET, etc.

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

---

## Environment Files

| File | What goes here |
|---|---|
| `.env` | Non-sensitive defaults (already committed). Feature flags, app URL, bucket name. |
| `.env.local` | **All secrets.** DB URL, API keys, tokens. See `.env.example` for the full list. |

Production secrets live in Vercel Environment Variables, not in files.

---

## Run

```bash
npm run dev           # Start dev server (default: Neon DB from .env.local)
npm run dev:local     # Start dev server against local Postgres
```

The startup banner shows which DB is in use.

---

## Database

```bash
npx prisma migrate dev     # Create + apply migrations locally
npx prisma migrate deploy  # Apply pending migrations (no generation)
npx prisma studio          # Database GUI
npm run db:whoami           # Check which DB you're connected to
```

### Wrapper scripts (for pipeline scripts)

```bash
./scripts/db-neon.sh <cmd>    # Run command against Neon (reads .env.local)
./scripts/db-local.sh <cmd>   # Run command against localhost:5432
```

These set `SAIKO_DB_FROM_WRAPPER=1`, which pipeline scripts check as a safety guard.

---

## Commands

```bash
npm run dev            # Start dev server
npm run build          # prisma generate && next build
npm run type-check     # TypeScript check (needs NODE_OPTIONS="--max-old-space-size=3072")
npx prisma studio      # Database GUI
```

---

## Health Check

Dev server running? Check the DB connection:

```bash
curl -sS http://localhost:3000/api/health
```

Returns `{ "status": "ok", "db": "connected" }` or 503 if unreachable.

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

## ARCHITECTURE-FIELDS-INGESTION-PIPELINE-V1

| Field | Value |
|-------|-------|
| **Type** | document |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/fields-ingestion-pipeline-v1.md` |
| **Last Updated** | 2026-03-16 |



---

## SAIKO-ADMIN-SPRING-CLEANING-2026-03

| Field | Value |
|-------|-------|
| **Type** | document |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/ADMIN-SPRING-CLEANING-LOG.md` |
| **Last Updated** | Thu Mar 12 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Record of admin routes and features retired or fixed in March 2026 — Review Queue, Energy Engine, Appearances auth, GPID Queue URL. Captures rationale for each retirement. |
| **Systems** | admin |

# Admin Spring Cleaning Log — March 2026

## Retired: Review Queue (/admin/review)

What it did: Human adjudication of ML resolver output — "same place or different place" decisions for entity matches with confidence between 0.70 and 0.90.

Why retired: The ML-based deduplication pipeline is no longer active. The 20 pending records were corrupted ingest artifacts from a deprecated editorial_era_intake path — not real deduplication candidates. The review queue was solving a problem that no longer exists in the current ingest path.

Action taken:
- Route archived
- Nav item removed
- Admin dashboard card removed
- pending records cleared from review_queue table

## Retired: Energy Engine (/admin/energy)

What it did: Displayed energy/atmosphere scoring for places — a 0-100 classification system intended as a precursor to SceneSense vibe tagging.

Why retired: The scoring system ran but produced no meaningful signal. 143 records all scored 0-9 out of 100, avg confidence 0.01. The system was superseded by place_tag_scores (Cozy tag) which has real coverage. No consumer surface ever consumed energy_scores.

Action taken:
- Route archived
- Nav item removed
- Admin dashboard card removed
- energy_scores table retained but not active

## Fixed: Appearances auth (/admin/appearances)

Issue: Route was redirecting to /login instead of loading within authenticated admin session.
Fix: Applied same auth guard used by other admin routes.

## Fixed: GPID Queue URL

Old route: /admin/identity/gpid-queue
New route: /admin/gpid-queue
Reason: Flattened to match nav label and pattern of other admin pages.

## Admin nav after spring cleaning
Dashboard / Intake / Coverage / Instagram / Photos / GPID Queue / Appearances

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
| **Last Updated** | 2026-03-14 |

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

> Note: This page-level tier model is a UI/content hierarchy for merchant profile rendering. It is separate from the Coverage Architecture tier model documented in `docs/architecture/coverage-tiers-v1.md`.

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

## OS-BEVERAGE-PROGRAM-VOCAB-V1

| Field | Value |
|-------|-------|
| **Type** | specification |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/offering-signals/beverage-program-vocab-v1.md` |
| **Last Updated** | 2026-03-14 |
| **Summary** | Canonical beverage program model and signal vocabulary for derived offering enrichment. Defines 5 program containers, maturity scale, and locked signal sets for wine, beer, cocktail, non-alcoholic, and coffee/tea programs. |
| **Systems** | offering-signals, fields-data-layer |

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

---

## SAIKO-FIELDS-IDENTITY-VERIFICATION-2026-03

| Field | Value |
|-------|-------|
| **Type** | verification |
| **Status** | active |
| **Project** | SAIKO |
| **Path** | `docs/architecture/place-identity-implementation-verification-2026-03.md` |
| **Last Updated** | Sun Mar 15 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Repository and Neon DB verification snapshot for place identity implementation state as of 2026-03. |
| **Systems** | fields-data-layer, entity-resolution |

# Place Identity - Implementation Verification

**Document ID:** SAIKO-FIELDS-IDENTITY-VERIFICATION-2026-03  
**Layer:** Architecture Verification  
**Status:** Active  
**Verified Against:** Repo + Neon DB

---

## Purpose

This document records the current implementation state of Place Identity relative to the architecture documents.

---

## Confirmed Identity Fields in `entities`

Core fields:

- `id`
- `slug`
- `name`
- `status`
- `neighborhood`
- `google_place_id`
- `website`
- `enrichment_stage`
- `last_enriched_at`

Identity-adjacent:

- `address`
- `latitude`
- `longitude`
- `instagram`
- `tiktok`
- `tagline`

---

## Fields Referenced in Architecture but Missing

- `instagram_handle`
- `website_domain`
- `cuisine_posture`
- `service_model`
- `entity_tagline`
- `successor_of`
- `predecessor_of`
- `identity_note`

---

## Naming Differences

| Concept | Schema |
|---|---|
| instagram_handle | instagram |
| googlePlaceId | google_place_id |
| coordinates | latitude + longitude |
| entity_tagline | tagline |

---

## Lifecycle Status Enum

Schema enum:

- OPEN
- CLOSED
- PERMANENTLY_CLOSED
- CANDIDATE

Current DB counts:

- OPEN - 323
- CANDIDATE - 288
- CLOSED - 1

Not implemented:

- PUBLISHED
- TEMP_CLOSED

---

## Identity Anchor Constraints

Existing:

- `google_place_id` unique
- `slug` unique

Missing:

- `instagram` uniqueness
- `website` uniqueness

---

## Resolver Thresholds in Code

Active:

- `NAME_SIMILARITY_THRESHOLD` ~= 0.85
- `NEARBY_RADIUS` ~= 200m

`90/70` thresholds appear only in a backup script.

---

## Canonical vs Source Separation

Source tables:

- `observed_claims`
- `source_registry`

Canonical tables:

- `canonical_entity_state`
- `canonical_sanctions`

The `entities` table still contains mixed operational fields.

---

## SKAI-DOC-FIELDS-ATOMIC-SIGNALS-001

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | saiko-fields |
| **Path** | `docs/architecture/atomic-cultural-signals-v1.md` |
| **Last Updated** | Sun Mar 15 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Defines the atomic cultural signal model used to structure place data in Saiko Fields. |
| **Systems** | Fields, TRACES |

# Atomic Cultural Signals

**Document ID:** SKAI-DOC-FIELDS-ATOMIC-SIGNALS-001  
**System:** Fields / TRACES  
**Layer:** Architecture  
**Status:** Active  
**Owner:** Bobby

---

## Purpose

This document defines the Atomic Cultural Signal model used by Saiko Fields.

Atomic Cultural Signals are the smallest structured observations about a place.
They are the foundation of identity resolution, enrichment, and downstream interpretation.

---

## System Position

Core architecture flow:

Real world observations  
-> Atomic Cultural Signals (Fields)  
-> Identity Resolution (Fields)  
-> Canonical Entity (Fields)  
-> Derived Signals (Fields)  
-> Cultural Interpretation (TRACES)

Atomic signals sit between source observations and identity resolution.

---

## What Atomic Signals Are

Atomic signals are:

- **observable** - grounded in evidence
- **structured** - represented in typed fields
- **sourceable** - attributable to a source
- **durable** - retained as data truth
- **non-interpretive** - they describe what is observed, not what it means

Examples:

- `primary_vertical = EAT`
- `neighborhood = Silver Lake`
- `reservable = true`
- `cuisine = Taiwanese`
- `natural_wine = true`

---

## Structural Properties

Atomic signals are designed to be:

- composable across many sources
- independently verifiable
- stable under ingestion reruns
- suitable for identity matching and confidence scoring

Atomic signals are not narrative output and are not ranking artifacts.

---

## Atomic vs Derived vs Interpretation

### Atomic Signals (Fields)

Atomic signals are raw structured observations.

### Derived Signals (Fields)

Derived signals are computed from atomic signals and canonical entity state.
They remain structured data.

Examples:

- confidence levels
- completeness flags
- feature scores

### Cultural Interpretation (TRACES)

Interpretation is human-readable cultural meaning generated from structured inputs.
It is downstream of both atomic and derived signals.

Examples:

- identity language
- scene summaries
- intent-oriented discovery framing

---

## Fields vs TRACES Responsibilities

| Concern | Owner |
|---|---|
| Source observation ingestion | Fields |
| Atomic signal definition and storage | Fields |
| Identity resolution | Fields |
| Canonical entity state | Fields |
| Derived signal computation | Fields |
| Cultural interpretation output | TRACES |

Fields structures and governs signals.  
TRACES interprets structured signals.

---

## Non-Goals

Atomic Cultural Signals are not:

- external platform truth authority
- direct user-facing narrative copy
- model interpretation output
- a replacement for canonical entity governance

---

## Summary

Atomic Cultural Signals are the durable, sourceable, non-interpretive data layer
that allows Saiko to move from observations to identity, then to interpretation.

---

## SKAI-DOC-FIELDS-DATA-LAYER-CONTRACT-001

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | saiko-fields |
| **Path** | `docs/architecture/data-layer-contract-v1.md` |
| **Last Updated** | Sun Mar 15 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Defines architectural boundaries and data access rules between the Saiko Data Layer, Fields platform, and TRACES consumer product. |
| **Systems** | Fields, TRACES |

# Data Layer Contract

**Document ID:** SKAI-DOC-FIELDS-DATA-LAYER-CONTRACT-001  
**System:** Fields / TRACES  
**Layer:** Architecture  
**Status:** Active  
**Owner:** Bobby

---

## Overview

This document defines strict architectural boundaries between the Saiko Data Layer,
the Fields platform, and the TRACES product.

Its purpose is to prevent coupling, preserve data truth contracts, and ensure
interpretation logic stays in the correct system layer.

---

## System Layers

### Data Layer

The canonical system-of-record layer for observed signals, identity resolution outputs,
canonical entity state, and governed data contracts.

### Fields Platform

The operational platform layer that manages ingestion, signal normalization, identity
resolution, sanctioning, and derived signal production.

### TRACES Product

The consumer-facing interpretation layer that reads structured canonical outputs and
produces user-facing cultural understanding.

---

## Responsibilities of Each Layer

| Layer | Responsibilities |
|---|---|
| Data Layer | Store canonical signals and identity state; enforce data truth contracts; provide canonical access surfaces. |
| Fields Platform | Ingest evidence; produce atomic and derived signals; resolve identity; maintain canonical state integrity. |
| TRACES Product | Consume canonical data; perform interpretation services; render product experiences and language. |

---

## Data Ownership Rules

1. Fields owns canonical signals and identity state.
2. Fields is the system of record for signals and identity.
3. TRACES does not own source signal truth; it owns interpretation outputs.
4. Product-facing interpretations must be derived from canonical data contracts, not ad hoc raw source reads.

---

## Access Rules

1. Products must not read raw ingestion tables.
2. Products must read from canonical entity state or product APIs.
3. Downstream consumers must treat product APIs and canonical views as the only supported interfaces.
4. Any new consumer path must be contract-defined before adoption.

---

## Forbidden Patterns

- Reading ingestion/raw evidence tables directly from product code.
- Re-implementing identity resolution rules inside product services or UI.
- Interpreting raw signals directly in UI components.
- Embedding interpretation heuristics in frontend rendering logic.
- Allowing TRACES to mutate canonical signal truth.

---

## Examples

### Allowed

- TRACES service reads canonical entity state and derived signals through approved data access surfaces.
- Product API exposes stable fields consumed by product clients.
- Fields pipeline writes normalized atomic/derived signals to canonical storage.

### Not Allowed

- UI code reads raw ingestion rows and decides whether a place is identity-complete.
- Frontend computes narrative interpretation from low-level signal fragments.
- Product service bypasses canonical contracts and queries raw source tables directly.

---

## Architectural Rules (Normative)

1. Products must not read raw ingestion tables.
2. Products must read from canonical entity state or product APIs.
3. Signals must not be interpreted inside UI code.
4. Interpretation logic belongs in TRACES services.
5. Fields is the system of record for signals and identity.

---

## SKAI-DOC-FIELDS-DERIVED-SIGNALS-ENGINE-001

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | saiko-fields |
| **Path** | `docs/architecture/derived-signals-engine-v1.md` |
| **Last Updated** | Sun Mar 15 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Defines how derived signals are computed, governed, versioned, and exposed within the Saiko Fields system. |
| **Systems** | Fields, TRACES |

# Derived Signals Engine

**Document ID:** SKAI-DOC-FIELDS-DERIVED-SIGNALS-ENGINE-001  
**System:** Fields / TRACES  
**Layer:** Architecture  
**Status:** Active  
**Owner:** Bobby

---

## Overview

The Derived Signals Engine defines how Saiko Fields computes structured derived outputs
from canonical data inputs.

This document specifies computation contracts, ownership boundaries, explainability
requirements, versioning expectations, and exposure rules for derived signals.

---

## What a Derived Signal Is

A derived signal is a computed output, not a raw observation.

Derived signals are produced by applying explicit derivation logic to one or more
trusted inputs.

Derived signals remain structured system data. They are not user-facing interpretation.

---

## Relationship to Atomic Signals

Atomic signals are source-grounded, non-interpretive observations.

Derived signals may consume atomic signals as core inputs and transform them into
higher-order structured outputs used for ranking, routing, decision support, or
interpretation inputs.

Atomic signals remain canonical observation truth; derived signals are computed layers
above that truth.

---

## Relationship to Canonical Entity State

Derived signals may use:

- atomic signals
- canonical entity state
- sanctioned canonical decisions

Canonical entity state provides resolved, sanctioned context that allows derivation
logic to run on consistent entity truth rather than raw or conflicting evidence.

---

## Computation Rules

1. Every derived signal must define explicit derivation logic.
2. Inputs must be contract-defined and traceable.
3. Output type must be deterministic and registry-defined.
4. Derivation logic must operate on canonicalized inputs, not uncontrolled raw ingestion reads.
5. Computation should be stable under reruns for the same input state and version.

---

## Ownership and Layer Boundaries

| Concern | Owner |
|---|---|
| Derived signal definition | Fields |
| Derived signal computation | Fields |
| Registry and governance for derived signals | Fields |
| Interpretation consumption of derived signals | TRACES |

Fields owns derived-signal truth contracts.
TRACES may consume derived signals for interpretation, but does not define raw derived-signal truth.

---

## Versioning Rules

Derived signals must be versionable when formulas materially change.

Material change examples:

- changed weighting model
- changed required inputs
- changed score normalization behavior
- changed classification thresholds

Version updates should preserve backward auditability and allow historical interpretation
to be traced to the derivation version used at compute time.

---

## Explainability Rules

Every derived signal must be explainable back to:

- input signals/state used
- derivation logic applied
- output produced

Explainability requirements:

1. Inputs are named and contract-defined.
2. Derivation logic is documented at a high level.
3. Output semantics are explicit.
4. Ownership is explicit.

---

## Exposure Rules

1. Derived signals are exposed as structured data through canonical data surfaces.
2. Consumer products should read derived signals through canonical entity state or product APIs.
3. Derived signals should not be transformed into interpretation inside UI code.
4. Interpretation logic remains a TRACES service concern.

---

## Example Derived Signals

### `scene_energy`

- `signal_id`: `scene_energy`
- `input_signals`: temporal activity indicators, social/activity-related atomic signals, canonical context fields
- `derivation_logic`: weighted aggregation of activity and context indicators into normalized energy score
- `output_type`: `numeric (0.0-1.0)`
- `owner_system`: `Fields`

### `date_night_probability`

- `signal_id`: `date_night_probability`
- `input_signals`: ambiance-related atomic signals, reservation posture, canonical category/context fields
- `derivation_logic`: model-based probability score from relevant romantic/occasion-oriented indicators
- `output_type`: `numeric (0.0-1.0)`
- `owner_system`: `Fields`

### `wine_program_strength`

- `signal_id`: `wine_program_strength`
- `input_signals`: beverage-related atomic signals, menu/wine list indicators, canonical offering context
- `derivation_logic`: weighted scoring of wine-focused indicators into strength band/score
- `output_type`: `numeric or enum (contract-defined)`
- `owner_system`: `Fields`

---

## Future Evolution

The Derived Signals Engine is expected to evolve with:

- stronger per-signal version metadata
- richer lineage capture between inputs and outputs
- expanded explainability artifacts for operator tooling
- tighter contract integration with Signals Registry governance

Future evolution must preserve the core contract:
derived signals are structured, explainable, versionable computations owned by Fields,
and consumed by TRACES for interpretation.

---

## SKAI-DOC-FIELDS-SIGNALS-REGISTRY-001

| Field | Value |
|-------|-------|
| **Type** | architecture |
| **Status** | active |
| **Project** | saiko-fields |
| **Path** | `docs/architecture/signals-registry-v1.md` |
| **Last Updated** | Sun Mar 15 2026 17:00:00 GMT-0700 (Pacific Daylight Time) |
| **Summary** | Defines how atomic and derived cultural signals are formally structured and governed within the Saiko Fields system. |
| **Systems** | Fields, TRACES |

# Signals Registry

**Document ID:** SKAI-DOC-FIELDS-SIGNALS-REGISTRY-001  
**System:** Fields / TRACES  
**Layer:** Architecture  
**Status:** Active  
**Owner:** Bobby

---

## Overview

The Signals Registry is the canonical specification layer for all formal signals in Saiko Fields.

It defines how signals are named, typed, governed, and consumed across the system.
This includes both atomic signals and derived signals.

The registry operationalizes the signal model defined in `SKAI-DOC-FIELDS-ATOMIC-SIGNALS-001`.

---

## Why Signals Need a Registry

Without a formal registry, signals drift across ingestion, identity, enrichment, and interpretation layers.
Different teams can reuse the same signal name with conflicting meaning, or introduce duplicate signals
with inconsistent structure.

A registry is required to ensure:

- shared signal semantics across Fields and TRACES
- strict type and value consistency
- stable ownership and governance
- clear lineage from source observation to interpretation
- safe evolution over time without architecture drift

---

## Signal Definition Structure

Every registered signal must define the following fields:

- `signal_id`
- `signal_type` (`atomic` | `derived`)
- `data_type` (`boolean`, `enum`, `numeric`, `text`, etc.)
- `allowed_values`
- `source_type` (`google`, `editorial`, `ingestion`, `derived`)
- `derivation_logic` (required for derived signals)
- `owner_system` (`Fields` | `TRACES`)
- `created_at`
- `last_updated`
- `description`

This structure is the minimum canonical contract for signal registration.

---

## Atomic vs Derived Signals

### Atomic Signals

Atomic signals are observable, sourceable, structured facts captured from evidence.
They are non-interpretive and owned by Fields.

Examples:

- `reservable`
- `serves_dinner`
- `primary_vertical`

### Derived Signals

Derived signals are computed from atomic signals and canonical state.
They remain structured, but include explicit derivation logic and lineage.

Examples:

- `scene_energy`
- confidence/completeness flags
- routing or scoring features

Interpretation layers consume atomic and derived signals, but interpretation itself is not a signal type.

---

## Signal Ownership

Ownership is set per signal definition and governs change authority.

| Signal concern | Owner system |
|---|---|
| Atomic signal definition and structure | Fields |
| Derived signal computation contract | Fields |
| Interpretation usage and narrative rendering | TRACES |
| Registry governance and canonical definitions | Fields (with TRACES alignment for interpretation-facing signals) |

TRACES does not redefine atomic semantics.
TRACES consumes registry-defined signals for interpretation outputs.

---

## Signal Lifecycle

Signals move through controlled lifecycle states:

1. **Proposed** - candidate definition drafted
2. **Registered** - definition approved and entered in registry
3. **Active** - used by system contracts
4. **Deprecated** - retained for compatibility, no new dependencies
5. **Archived** - removed from active use, preserved for history

Lifecycle transitions require governance review and backward-compatibility checks.

---

## Signal Governance Rules

1. Every active signal must have a unique `signal_id`.
2. Every signal must declare `signal_type`, `data_type`, and `owner_system`.
3. `allowed_values` must be explicit for enum-like or constrained signals.
4. Derived signals must define `derivation_logic`.
5. New signals cannot silently redefine an existing signal's meaning.
6. Changes to active signal semantics require versioned change review.
7. Interpretation layers may consume signals but cannot alter registry truth contracts.

---

## Example Signal Definitions

### `serves_dinner`

- `signal_id`: `serves_dinner`
- `signal_type`: `atomic`
- `data_type`: `boolean`
- `allowed_values`: `true | false`
- `source_type`: `ingestion`
- `derivation_logic`: `null`
- `owner_system`: `Fields`
- `created_at`: `2026-03-16`
- `last_updated`: `2026-03-16`
- `description`: Indicates whether the place is observed to serve dinner.

### `reservable`

- `signal_id`: `reservable`
- `signal_type`: `atomic`
- `data_type`: `boolean`
- `allowed_values`: `true | false`
- `source_type`: `google`
- `derivation_logic`: `null`
- `owner_system`: `Fields`
- `created_at`: `2026-03-16`
- `last_updated`: `2026-03-16`
- `description`: Indicates whether reservations are supported by the place.

### `scene_energy`

- `signal_id`: `scene_energy`
- `signal_type`: `derived`
- `data_type`: `numeric`
- `allowed_values`: `0.0-1.0`
- `source_type`: `derived`
- `derivation_logic`: Computed from a weighted combination of atomic behavioral, temporal, and context signals.
- `owner_system`: `Fields`
- `created_at`: `2026-03-16`
- `last_updated`: `2026-03-16`
- `description`: Structured estimate of place energy level used by downstream interpretation and ranking layers.

---

## Future Evolution

The Signals Registry is expected to evolve with:

- typed validation policies per signal family
- versioned registry snapshots
- lineage references between derived and source signals
- tighter contract links to identity and interpretation systems

Future evolution must preserve the core principle:
signal definitions are canonical data architecture contracts, not ad hoc feature-level metadata.

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

## RES-CUISINE-TRADITIONS-V1

| Field | Value |
|-------|-------|
| **Type** | research |
| **Status** | active |
| **Project** | TRACES |
| **Path** | `docs/research/cuisine-traditions-signals-v1.md` |
| **Last Updated** | 2026-03-16 |
| **Summary** | Research synthesis on cuisine traditions as structured signals for the Offering Signals model |
| **Systems** | offering-signals, scenesense |

# Cuisine Traditions as Structured Signals

## Overview

The dominant paradigm for classifying restaurants — service level, price point, formality — is a Western fine dining framework. It describes one quadrant of the restaurant universe with precision and handles the rest poorly. For cuisines where restaurant identity is rooted in tradition, format, and cultural practice, this framework produces flat, uninformative outputs.

This research synthesizes findings from editorial sources, academic restaurant taxonomy, industry classification systems, and food community discourse to propose a structured signal vocabulary for representing cuisine traditions in Saiko's Offering Signals model. The core proposal: four new signal types — `cuisine_tradition`, `food_format`, `restaurant_archetype`, and `regional_origin` — that encode what a place *is* from within its own cultural tradition, not from an external reference frame.

## Findings

### How Diners Actually Categorize Restaurants

The restaurant industry's existing classification terms — "fast food," "fine dining," "casual upscale" — were developed without consideration for internal consistency, and new terms continue to emerge through consumer and trade media, creating ongoing confusion in restaurant taxonomy. Academic and industry systems alike tend to organize restaurants along two axes: service formality and price. This is useful for some things. It is not useful for explaining the difference between a tonkotsu ramen shop and a shoyu ramen counter, or between a Jalisco-style birrieria and a Sonoran taqueria, or between a Central Texas brisket pit and a Memphis rib joint.

Real diners — as revealed by food communities, editorial coverage, and search behavior — categorize along entirely different axes:

**By cooking technique or preparation tradition.** "Birria tacos" signals not just a dish but a whole production system: the consomme, the dipping ritual, the trompo or pot, the specific chile marriage. The preparation is the identity.

**By regional origin.** Birria is not simply an ingredient — it is a preparation that can apply to multiple proteins, varying regionally across Jalisco, Michoacan, Zacatecas, and Colima. When someone says they want birria, they are invoking a regional school of cooking, not just a menu item. The same applies to Central Texas BBQ, Edomae sushi, and Neapolitan pizza — each phrase communicates a set of standards, methods, and expectations that no price tier or service style can convey.

**By vessel and service format.** A ramen counter is not just "noodle soup." The counter, the single-item focus, the soup variants (tonkotsu, shoyu, miso, shio), the interaction style — these are definitional. Counter dining is one of the most traditional service styles in Japanese restaurants; guests sit directly in front of the chef and watch the food being prepared, and this format communicates culinary craftsmanship as much as the food itself.

**By cultural practice embedded in the meal.** Omakase is a multi-course experience where the chef selects dishes from seasonal inspiration, the diner is usually seated at a counter directly in front of the chef, and the experience is deliberately paced to allow full appreciation of each course. This is not a service tier — it is a philosophical contract between diner and chef. Similarly, izakaya are informal gathering places that provide a relaxed atmosphere where diners share small dishes with drinks, an experience that is defined less by any single dish and more by its social role in Japanese culture.

The key insight: for format-driven cuisines, the restaurant *is* the format. A birrieria is not a "casual Mexican restaurant that happens to serve birria." It is a birrieria. The format carries the identity.

### Existing Taxonomy Systems and Their Gaps

A review of how existing systems handle this reveals consistent limitations:

**Yelp categories** flatten regional specificity into broad ethnic identifiers ("Mexican," "Japanese," "Chinese") with some secondary tags ("Ramen," "Sushi Bars," "Tacos"). They capture format when it maps neatly to a recognizable noun, but cannot distinguish between a Jalisco-style birrieria and a Sonoran taqueria, or between an Edomae sushi counter and a California roll sushi bar.

**Michelin Guide** handles this in inverse fashion: it focuses on the top end of the tradition spectrum (kaiseki, omakase, Neapolitan-certified pizza, etc.) with richly nuanced language, but provides no structured vocabulary. Its intelligence lives in prose, not signals.

**Wikipedia cuisine taxonomies** are the most structurally interesting reference. They organize along preparation method, region, and cultural context — much closer to how food communities actually think. The birria article, for example, distinguishes Jalisco-style vs. Tijuana beef birria vs. Michoacan lamb birria, and traces each variant's distinguishing characteristics.

**OpenStreetMap** uses cuisine=* tags at a relatively coarse level (cuisine=ramen, cuisine=sushi, cuisine=bbq) that capture format when the food community has already codified it into a short noun.

One scholar argues that all restaurants can be categorized along polar opposites — high or low, cheap or dear, familiar or exotic, formal or informal — and that any restaurant will be relatively high or low on each axis. This is elegant as a theoretical framework but operationally useless for distinguishing between restaurant types that share the same service tier, price range, and formality level but represent entirely different cultural traditions.

The gap in all existing systems: none encodes *cuisine tradition* — the specific school of cooking, regional origin, preparation method, or cultural format that defines a restaurant's identity from the inside rather than the outside.

### Cross-Cuisine Survey of Named Traditions

**Japanese** — among the most format-codified cuisines in the world:
- Ramen-ya: single-format noodle shop organized around broth style (tonkotsu, shoyu, shio, miso, tsukemen). The broth school is the primary identity signal.
- Izakaya: Japanese pub format; shared small plates, strong drink program, late-night culture.
- Sushi-ya / Edomae counter: chef-facing counter service, omakase-forward, rooted in Tokyo's Edo-period vinegar-fish tradition.
- Yakitori-ya: charcoal skewer specialist; the grill is the whole identity.
- Tempura-ya, tonkatsu-ya, soba-ya, udon-ya: each is a single-technique specialist with its own production grammar.
- Kaiseki: multi-course seasonal haute cuisine. Formal, ritualized, seasonal sequencing.

**Mexican** — highly regionalized, with dozens of named taco and preparation traditions:
- Taqueria al pastor: defined by the trompo (vertical spit) and the specific Pueblan-Lebanese heritage of marinated pork.
- Birrieria: Jalisco-origin slow-stewed meat (goat, beef) served with consomme; Tijuana beef variant is the US-dominant format with the consomme-dipping ritual.
- Mariscos: Pacific coastal seafood program; aguachile, ceviche, seafood cocktails, pescado zarandeado. Nayarit and Sinaloa traditions.
- Barbacoa (pit): weekend-only slow-pit beef head and cheek; South Texas tradition rooted in Mexican ranch food.
- Taqueria de canasta: basket tacos; pre-steamed, low-price, street-portable.
- Fonda regional: mom-and-pop regional restaurant defined by a specific state's cuisine (Oaxacan, Sinaloan, Jaliscan, Chilango).

**American BBQ** — defined by primary protein, cooking method, fuel and wood, seasoning philosophy, sauce approach, and serving traditions:
- Central Texas pit: brisket-forward, salt-and-pepper rub, post oak smoke, no sauce, butcher paper service, meat by the pound.
- Carolina whole hog: vinegar-sauced pulled pork, wood pit, the whole hog as the statement.
- Kansas City: wide protein range, thick molasses-tomato sauce, burnt ends as signature.
- Memphis: pork ribs, wet vs. dry rub as the organizing debate, hickory smoke.

**Chinese** — highly format-driven, organized by meal type and social format:
- Dim sum house: cart or order-card service; shared small plates for groups; weekend morning ritual; specific vocabulary of dishes (har gow, siu mai, char siu bao, turnip cake).
- Hot pot: communal cooking-at-the-table format; defined by broth base (Sichuan mala, clear broth, tomato) and ingredient array.
- Peking duck house: specific to the roast duck ceremony, often with tableside carving.
- Cantonese seafood restaurant: live tank selection, family-style large plates.

**Italian** — regional school distinctions:
- Neapolitan pizzeria: wood-fired, 00 flour, DOC tomatoes, certified by Associazione Verace Pizza Napoletana in the most serious cases.
- Sicilian / Detroit / NY slice / Roman al taglio: each slice format carries its own tradition and production grammar.
- Osteria vs. trattoria vs. ristorante: Italian restaurant taxonomy has a centuries-old internal classification that most US systems ignore.

### Restaurant Archetypes (Cross-Cuisine)

Separate from cuisine tradition, there is a layer of format archetypes that appear across cuisines and carry meaning independent of what's being cooked:

**Counter specialist.** One technique, minimal menu, chef or cook in direct view. Ramen counter, sushi counter, yakitori stand, tamale counter. Identity defined by mastery of a single thing.

**Street food stand / taqueria format.** Walk-up or window service, standing or minimal seating, high-volume, technique-focused. Taco stand, birrieria, mariscos truck, banh mi counter. Price and speed are part of the identity, not incidental.

**Pit / smoke operation.** The physical smoker or pit is the visible heart of the place. Central Texas BBQ, Carolina whole hog house. The equipment is the brand.

**Communal table / shared format.** Korean BBQ, hot pot, dim sum, Ethiopian injera spread. The sharing mechanism is not just practical — it is the social meaning of the meal.

**Tasting-menu room.** Small, counter-facing or intimate, chef-driven sequence, prix fixe only. Kaiseki, omakase, creative tasting menu. Format signals total creative control by the kitchen.

**Wine bar / small plates.** Natural wine-forward, snacks and small plates, counter or low-seating, grazing format. Now a recognizable archetype across European and American cities.

### Cuisines Where Format Defines Identity

Japanese is the most thoroughgoing example. Sushi-ya, ramen-ya, izakaya, soba-ya, udon-ya, and tempura-ya are each distinct restaurant types with specific service contracts and identity signals.

Mexican is deeply format-driven at the street and casual level, and deeply regional at any level. "Mexican restaurant" is nearly meaningless as a signal — the meaningful identifiers are the regional tradition (Jaliscan, Sinaloan, Oaxacan, Chilango) and the format (taqueria, birrieria, mariscos, fonda).

BBQ — in American, Korean, and Argentine forms — is organized almost entirely around cooking method and equipment. The pit, the smoke, and the wood species are the identity.

Chinese at the specialty end — dim sum, hot pot, Peking duck — is organized around meal format and social ritual.

## Signal / Design Implications

### Proposed Signal Types

**`cuisine_tradition`** — The specific named school, regional preparation style, or cultural format that defines a restaurant's identity from the inside. Distinct from cuisine category.

Examples: `birria_tijuana_style`, `central_texas_bbq`, `tonkotsu_ramen`, `edomae_sushi`, `neapolitan_pizza`, `dim_sum_yum_cha`, `sichuan_hot_pot`, `al_pastor_taqueria`, `nayarit_mariscos`

This is the highest-fidelity signal. It encodes not just what cuisine but which school of that cuisine. It requires editorial judgment to assign.

**`food_format`** — The organizational logic of the food itself — how it's produced, assembled, and delivered to the diner.

Examples: `trompo_roasted`, `pit_smoked`, `consomme_dip`, `omakase_sequence`, `cart_service`, `counter_specialist`, `standing_bar`, `communal_table`, `whole_animal`

A strong complement to cuisine tradition. A tonkotsu ramen shop and a shoyu ramen shop share a food_format (counter specialist, single-bowl service) but have distinct cuisine_tradition values.

**`restaurant_archetype`** — The social and operational format of the place — how it functions as a space, not just what it produces.

Examples: `taqueria`, `izakaya`, `birrieria`, `barbecue_pit`, `sushi_counter`, `dim_sum_house`, `pizza_slice_shop`, `natural_wine_bar`, `yakitori_ya`, `mariscos_stand`

These terms are borrowed from the cultural vocabulary that already exists. The signal work is standardization and confidence scoring, not invention.

**`regional_origin`** — The specific geographic provenance of the tradition. Used to distinguish sub-traditions within a broader cuisine family.

Examples: `jalisco_mx`, `tijuana_mx`, `central_texas`, `carolina_eastern`, `oaxaca_mx`, `kyoto_jp`, `edo_tokyo_jp`, `sichuan_cn`, `naples_it`

Should be treated as a compositional signal — it modifies cuisine_tradition to produce specific readings like "Jalisco-style birria" vs. "Tijuana beef birria."

### Taxonomy Diagram

```
                    ┌─────────────────────────────┐
                    │      cuisine_tradition       │  ← Highest specificity
                    │  (school / named tradition)  │
                    │  e.g., tonkotsu_ramen,       │
                    │        central_texas_bbq,    │
                    │        birria_tijuana_style   │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │        food_format           │  ← Production grammar
                    │  (technique / delivery)      │
                    │  e.g., pit_smoked,           │
                    │        counter_specialist,   │
                    │        consomme_dip           │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │    restaurant_archetype      │  ← Venue type
                    │  (social / operational)      │
                    │  e.g., taqueria, izakaya,    │
                    │        bbq_pit, dim_sum_house│
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │            regional_origin              │  ← Modifier (cross-cutting)
              │  Composes with any layer above          │
              │  e.g., jalisco_mx + birria = goat stew  │
              │        tijuana_mx + birria = beef dip   │
              └────────────────────────────────────────┘
```

## Recommendations

1. **Adopt a three-layer model.** Cuisine signals should operate across three distinct layers: `cuisine_tradition` (the school), `food_format` (the production grammar), and `restaurant_archetype` (the venue type). These are not redundant — a place can have a clear archetype but a mixed or evolving tradition.

2. **Borrow from native vocabulary.** The single most defensible source for `restaurant_archetype` values is the vocabulary food communities already use. "Birrieria," "izakaya," "yakitori-ya," "mariscos" — these terms are self-explanatory to people who know the cuisine and require only brief glosses for those who don't.

3. **Treat cuisine tradition as an editorial signal, not an automated one.** `cuisine_tradition` is a high-specificity, high-confidence signal that requires human judgment to assign correctly. A restaurant can call itself a "ramen shop" and serve noodle soup in a broth that no Tokyo ramen community would recognize. The signal should reflect what the place actually is according to the tradition, not just what it claims.

4. **Handle regional origin as a modifier, not a standalone.** `regional_origin` is most useful as a compositional qualifier on top of `cuisine_tradition`. "Birria" + `jalisco_mx` reads as traditional goat stew; "Birria" + `tijuana_mx` reads as beef consomme-dip taco format. The combination is what carries meaning.

5. **Challenge the assumption that format-driven cuisines are lower-tier.** The signal model should be capable of representing the depth of a Central Texas brisket pit with exceptional smoke work and a 40-year legacy with the same fidelity as a tasting-menu restaurant. Both are high-craft cultural artifacts.

## What This Changes for Saiko

The practical implication: a birrieria in Boyle Heights, a tonkotsu counter in Little Tokyo, and a Central Texas-style pit in Culver City can all be described with precision — not just tagged as "Mexican," "Japanese," and "American BBQ." The signal vocabulary gives TRACES enough raw material to generate descriptions like "a Jalisco-tradition birria house doing consomme-dip tacos" or "a Hakata-school tonkotsu counter with an 18-hour bone broth" rather than falling back to generic editorial.

The deeper structural point: these signals describe what a place is from within its own cultural tradition, not from outside looking in. That's consistent with Saiko's editorial positioning and with the Voice Engine's existing approach — describe the place on its own terms, not in comparison to a default Western reference frame.

## Sources

### Editorial
- Eater LA — best-of maps (Venice, Arts District, Silver Lake, Downtown LA, burritos, breakfast burritos)
- The Infatuation LA — restaurant reviews and guides
- LA Times — 101 Best Restaurants list
- LA Taco — breakfast burritos, best burritos coverage

### Academic / Industry
- Restaurant classification scholarship — polar-opposite categorization models (service formality, price tier, familiarity)
- OpenStreetMap — cuisine=* tagging system
- Associazione Verace Pizza Napoletana — Neapolitan pizza certification standards

### Community / Primary
- Wikipedia cuisine taxonomies — birria regional variants, Japanese restaurant formats, BBQ regional schools
- Food community discourse — how diners self-organize around tradition, format, and regional origin rather than price/service tier

---

## Registry Metadata

| Field | Value |
|-------|-------|
| Registry generated | 2026-03-17T00:45:00.000Z |
| Context generated | 2026-03-18T00:17:57.122Z |
| Docs included | 80 |
| Docs missing on disk | 0 |
| Filters applied | status=active |
