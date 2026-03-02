Love it. Last 10 yards. We stay sharp. No drift.

Below is the tightened v2 — same structure, cleaner edges, no ambiguity, no accidental overreach. You can paste this over the existing section.

⸻

DUPLICATION CLUSTERS (v2)

This document identifies groups of scripts that likely represent the same underlying durable data capability expressed multiple times.

These are structural hypotheses — not deletion directives.

The purpose of this section is to:
	•	Identify capability overlap
	•	Surface consolidation opportunities
	•	Clarify which capabilities must become canonical
	•	Separate durable systems from historical artifacts
	•	Align script structure with Fields’ long-term data architecture

⸻

Cluster 1 — Google Source Synchronization

Intended Capability

Controlled synchronization of authoritative Google Places data into Fields.

This includes:
	•	Google Place ID resolution
	•	Details fetching
	•	Attribute hydration (types, photos, address, lat/lng, etc.)
	•	Field-scoped updates with re-run safety
	•	Provenance-aware writes

Important constraint:
Google is a source, not the truth.
All updates must respect Fields’ identity model and provenance rules.

Scripts in Cluster
	•	backfill-google-ids.ts
	•	backfill-google-place-ids.ts
	•	backfill-golden-google-place-id.ts
	•	backfill-golden-gpid-from-places-api.ts
	•	backfill-google-places.ts
	•	backfill-google-places-attrs.ts
	•	backfill-websites-from-google.ts
	•	backfill-golden-latlng-from-google.ts
	•	backfill-entities-address-from-google.ts
	•	enrich-google-places.ts
	•	enrich-google-places-v2.ts

Structural Observation

These scripts represent multiple versions and fragments of the same core capability: syncing Google as an external source of structured place data.

Canonicalization Direction

This cluster must converge into:

A single, idempotent, re-runnable Google Sync Engine.

All other scripts in this cluster must be classified as:
	•	Sub-components
	•	Executors
	•	One-time migrations
	•	Or deprecated

⸻

Cluster 2 — Identity Resolution & Duplicate Enforcement

Intended Capability

Detection, scoring, merging, and enforcement of identity uniqueness across:
	•	Places
	•	Golden records
	•	(Future scope: Actors and Relationships)

This capability defines what an entity is and guarantees idempotent ingestion.

Scripts in Cluster
	•	cleanup-duplicate-places.ts
	•	merge-duplicate-places.ts
	•	find-duplicate-places.ts
	•	find-potential-duplicates.ts
	•	recompute-golden-merge-quality.ts
	•	resolver-pipeline.ts

Structural Observation

These scripts represent overlapping expressions of identity detection and merge enforcement across the system’s evolution.

The identity capability is durable.
The fragmentation is not.

Canonicalization Direction

This cluster must converge into:

A single Identity Resolution Pipeline with deterministic dedupe enforcement.

⸻

Canonicalization Target (Cluster 2)

Canonical Capability Name:
Identity Resolution Pipeline

Definition:
A single, deterministic, idempotent system that:
	•	Detects potential duplicate entities
	•	Scores merge candidates
	•	Enforces uniqueness constraints
	•	Applies merges safely
	•	Logs merge decisions
	•	Can be re-run without corrupting state

All identity-related scripts must either:
	•	Become part of this pipeline
	•	Be classified as executors
	•	Or be deprecated

⸻

Canonical Candidate (Cluster 2)

Canonical candidate script: scripts/resolver-pipeline.ts

Why (evidence):
	•	Largest script in the cluster (535 LOC)
	•	Likely contains orchestration logic rather than a single-purpose operation
	•	Other scripts appear to be candidate finders or merge executors

⸻

Cluster 2 — Script Classification (v0)
	•	scripts/resolver-pipeline.ts — PIPELINE (canonical)
	•	scripts/find-potential-duplicates.ts — HELPER (candidate identification)
	•	scripts/find-duplicate-places.ts — HELPER (candidate identification, narrower scope)
	•	scripts/recompute-golden-merge-quality.ts — HELPER (merge scoring / QA recompute)
	•	scripts/merge-duplicate-places.ts — EXECUTOR (applies merges; may become pipeline subcommand)
	•	scripts/cleanup-duplicate-places.ts — EXECUTOR (applies cleanup; may become pipeline subcommand)

⸻

Cluster 3 — Golden → Places Lifecycle

Intended Capability

Promotion, synchronization, and lifecycle management of Golden records into the canonical places table.

This capability defines where canonical place truth lives and how it is updated.

Scripts in Cluster
	•	promote-golden-to-places.ts
	•	sync-golden-to-places.ts
	•	export-to-golden-full.ts
	•	export-to-resolver.ts
	•	export-to-resolver-full.ts
	•	intake-golden-first.ts
	•	resolve-golden-first.ts

Structural Observation

These scripts represent overlapping expressions of the Golden → Resolver → Places lifecycle.

The lifecycle is durable.
The fragmentation is not.

Canonicalization Direction

This cluster must converge into:

A single Golden Promotion & Sync Pipeline with defined lifecycle stages and idempotent writes.

⸻

Cluster 4 — Coverage, Audit & Integrity Systems

Intended Capability

Measurement, reporting, and enforcement of:
	•	Data completeness
	•	Enrichment coverage
	•	Tier validation
	•	Field integrity
	•	Schema compliance

This layer answers: How healthy is the dataset?

Scripts in Cluster
	•	coverage-apply.ts
	•	coverage-apply-tags.ts
	•	coverage-apply-description.ts
	•	coverage-census.ts
	•	coverage-queue.ts
	•	coverage-report.ts
	•	coverage-run.ts
	•	analyze-data-completeness.ts
	•	analyze-enrichment-status.ts
	•	audit-*
	•	check-*
	•	verify-*
	•	diagnose-*

Structural Observation

This appears to be a fragmented Quality & Coverage layer with mixed responsibilities:
	•	Some scripts compute
	•	Some apply
	•	Some report
	•	Some verify

Canonicalization Direction

This cluster must converge into:

A unified Coverage & Integrity Engine responsible for audit, enforcement, and reporting.

⸻

Governing Test

For each cluster, apply this question:

If every script in this cluster disappeared tomorrow, what durable data capability would Fields lose?

If the answer is:
	•	“Nothing permanent” → the cluster is non-durable.
	•	“The same core capability” → consolidation is required.
	•	“Multiple distinct capabilities” → the cluster must be subdivided.

⸻

This is now:
	•	Strategically aligned
	•	Architecturally scoped
	•	Guardrail-aware
	•	Future-proofed
	•	Honest about current vs future scope

Paste that in.

When it’s saved, we do one final sanity check — and then we stop touching the doc and move to implementation sequencing.