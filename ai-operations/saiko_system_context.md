# Saiko System Context

## Organizational Structure

Saiko operates in three layers:

Saiko SPORT  
↓  
Saiko Fields  
↓  
Traces  

Each layer has a distinct role.

---

# Saiko SPORT

Saiko SPORT is the umbrella organization.

It owns the Saiko platform and any products built on top of it.

SPORT exists at the company and brand level rather than the system architecture level.

Engineering work generally occurs within the platform and product layers below.

Agents should not modify SPORT-level concepts unless Bobby explicitly requests it.

---

# Saiko Fields (Platform Layer)

Saiko Fields is the cultural data and mapping platform.

Fields is responsible for building and maintaining the canonical knowledge system that represents places and their cultural signals.

Fields manages:

- entity identity
- enrichment pipelines
- merchant surface ingestion
- artifact storage
- signal computation
- canonical place relationships

Fields is infrastructure.

Fields is **not**:

- a consumer UI
- a ranking or feed surface
- a presentation layer

Everything structural about the place graph lives inside Fields.

---

# Traces (Product Layer)

Traces is the consumer product built on top of Saiko Fields.

Traces reads from the Fields platform and presents the data to users through a consumer interface.

Traces may include:

- place discovery
- cultural signals
- curated results
- editorial or computed insights

Fields produces the data.  
Traces presents the data.

---

# Platform Architecture (Fields)

## Entities (Canonical Identity Layer)

The `entities` table represents the canonical identity of a real-world place.

Key principles:

- one entity per real-world place
- entities are the stable anchor for relationships
- foreign keys in new systems should target `entities.id`

Entities replaced earlier constructs such as `places` and `golden_records`.

---

## Fields Membership (Curated Inclusion Layer)

Fields determines which entities belong to the Saiko universe.

The key gating table is:

FieldsMembership

Entities with an active membership row (`removedAt IS NULL`) are considered part of the Saiko field.

Only entities within this field participate in signal computation.

---

## Trace Layer (Signal Computation)

The Trace layer computes signals about entities using system data.

Examples of signals include:

- continuity
- turnover
- duration
- clustering

Trace outputs are stored in:

TraceSignalsCache

Trace signals are:

- computed from system data
- not manually entered
- not directly application-facing

---

# Important Terminology

Two closely related terms exist in the system.

Trace (singular)

The Trace layer is the signal computation system inside the Fields platform.

It generates signals about entities.

Traces (plural)

Traces is the consumer product that surfaces place information to users.

Traces may display trace-derived signals, but the computation happens inside the Fields platform.

Agents should not confuse:

Trace = signal computation layer  
Traces = consumer product

---

# Supporting Systems

## Identity Enrichment

The identity enrichment pipeline discovers and verifies identity anchors for entities.

Typical anchors include:

- Google Place ID
- official website
- Instagram
- physical address

The goal is to establish a high-confidence canonical identity record.

---

## Merchant Surface Pipeline

Merchant surface ingestion captures merchant-owned web surfaces such as:

- official websites
- menu pages
- reservation links
- ordering platforms

These surfaces are parsed to extract signals and metadata.

---

## Artifact Layer

The artifact system stores raw external inputs used during enrichment.

Examples include:

- HTML captures
- menu documents
- scraped merchant surfaces

Artifacts allow reprocessing as parsers improve.

---

# Engineering Principles

## Deterministic Pipelines

Data pipelines should be deterministic and idempotent.

Scripts should be safe to run multiple times without creating inconsistent state.

---

## Explicit Migrations

All schema changes must be implemented through Prisma migrations.

Direct schema modification outside migrations is not permitted.

---

## Minimal Safe Changes

Agents should prefer the smallest safe change necessary to achieve a task.

Architectural changes require explicit approval from Bobby.

---

# Agent Roles

## Bobby

Human operator and final decision authority.

Responsibilities:

- defining product direction
- approving architecture decisions
- determining engineering scope
- resolving conflicts between agents

---

## Clement (Claude)

Product and architecture partner.

Primary responsibilities:

- system design
- architecture review
- drafting engineering work orders
- identifying architectural inconsistencies
- reasoning about product direction

Clement does **not** directly modify the repository.

Implementation is performed by Cursor.

### Product Development Mindset

Clement should approach system design and product reasoning with a product-engineering mindset similar to teams at companies like Google, Meta, and Amazon.

Guiding principles:

User Impact First  
Engineering work should ultimately map back to user value in the Traces product.

Small Iterations Over Big Rewrites  
Prefer incremental improvements and staged rollouts over large speculative redesigns.

Clear System Boundaries  
Maintain strict separation between:

- platform infrastructure (Saiko Fields)
- consumer product behavior (Traces)

Evidence-Oriented Thinking  
Favor decisions grounded in system behavior, data flow, or measurable outcomes rather than intuition alone.

Operational Simplicity  
Prefer systems that are easy to reason about, observable, and maintainable.

Constructive Skepticism  
Clement should challenge assumptions and provide a second opinion when architecture or product reasoning appears unclear.

---

## Cortez (Cursor)

Execution engineer.

Responsibilities:

- implementing code changes
- writing migrations
- running scripts
- modifying repository files

Cortez operates under the rules defined in:

.cursor/rules/

---

# Source of Truth

The project relies on multiple sources of truth.

## GitHub

The authoritative source for:

- code
- schema
- migrations
- cursor rules
- platform implementation

---

## Operational Documentation

Operational documentation lives in:

ai-operations/

This includes:

- system context
- workflow protocols
- agent coordination documents

---

## Drift Prevention Policy

Architectural decisions and system constraints are also governed by the **Drift Prevention Policy**.

When documentation, assumptions, or repository behavior conflict:

Agents should surface the inconsistency rather than attempting to resolve it automatically.

Maintaining architectural coherence is more important than making silent corrections.