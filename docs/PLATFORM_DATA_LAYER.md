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
