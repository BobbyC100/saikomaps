---
doc_id: SKAI/DECISION-INDEX-SPEC-V1
doc_type: architecture
title: Decision Index v1
version: '1.0'
status: active
owner: Bobby Ciccaglione
created: 2026-03-09T00:00:00.000Z
last_updated: 2026-03-09T00:00:00.000Z
project_id: KNOWLEDGE-SYSTEM
supersedes: none
systems:
  - knowledge-system
  - decision-system
related_docs:
  - docs/decisions/DEC-001.md
---

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
