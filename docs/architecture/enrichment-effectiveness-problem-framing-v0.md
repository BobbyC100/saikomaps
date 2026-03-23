---
doc_id: ARCH-ENRICHMENT-EFFECTIVENESS-V0
status: PROBLEM_FRAMING
owner: Bobby
created: 2026-03-20
last_updated: 2026-03-20
layer: Problem Framing (pre-spec)
related_docs:
  - docs/architecture/enrichment-strategy-v1.md
  - docs/architecture/enrichment-model-v1.md
  - docs/architecture/coverage-dashboard-v2-spec.md
---

# Enrichment Effectiveness — Problem Framing (v0)

> **Status:** Problem Framing — intentionally avoids prescribing solutions.
> **Purpose:** Define how Saiko should evaluate the effectiveness of enrichment methods, in service of continuously improving the ingestion system.

---

## 1. Purpose

This document defines how Saiko evaluates the effectiveness of enrichment methods (scripts and sources).

At a surface level, the goal is to measure how well each method performs — how often it succeeds, where it fails, and what value it adds.

However, this measurement exists in service of a larger objective:

**To continuously improve Saiko's ingestion system — making it more effective, more efficient, and more cost-aware over time.**

Enrichment methods are not static tools. They are part of an evolving system that must:

- Adapt based on observed performance
- Improve as new patterns and data sources emerge
- Scale across new geographies, verticals, and languages

The long-term goal is:

**To develop the most effective, efficient, and lowest-cost ingestion approach possible.**

Where:

- **Effective** means the method successfully achieves its intended outcome (fills the targeted data gap)
- **Efficient** means it does so with minimal resource usage (time, compute, API calls)
- **Cost-aware** means it minimizes direct monetary spend while still achieving acceptable outcomes

This document does not prescribe a fixed optimization strategy. Instead, it frames how the system can observe and reason about performance in order to improve over time.

---

## 2. Trade-off Framing

In practice, no single enrichment method will optimize for all three dimensions simultaneously:

- A method may be highly effective but expensive (e.g., paid APIs)
- A method may be cheap but inconsistent (e.g., scraping or discovery)
- A method may be fast but low-yield (e.g., shallow extraction)

This introduces an inherent trade-off space:

**Effectiveness ↔ Efficiency ↔ Cost**

The system must operate within this space, making decisions about:

- When to prefer free but less reliable methods
- When to escalate to paid but high-confidence sources
- When additional attempts are no longer justified
- When a method should be improved, replaced, or constrained

These trade-offs may vary depending on:

- Entity subtype (a restaurant vs a park vs a taco cart)
- Gap type (hours vs phone vs menu URL vs identity resolution)
- Current system state (early ingestion vs refinement vs maintenance)
- Budget or cost thresholds

---

## 3. What the System Needs to Observe

To make intelligent decisions about enrichment, the system needs to track performance across several dimensions.

### 3.1 Per Method

For each enrichment method (e.g., website crawl, Instagram API, Google Places API, editorial discovery):

- **Hit rate** — what percentage of attempts successfully extract the targeted data?
- **Coverage** — which fields does this method typically produce?
- **Cost per attempt** — what is the direct monetary cost (API fees, compute)?
- **Cost per successful extraction** — what does it cost to actually get usable data?
- **Time per attempt** — how long does the method take to run?
- **Failure modes** — when it fails, why? (source unavailable, data not present, extraction error, rate limit)

### 3.2 Per Field

For each data field (e.g., hours, phone, reservation URL, menu URL):

- **Which methods produce this field?** — ranked by hit rate and cost
- **What is the typical enrichment path?** — do most entities get hours from website, Google, or Instagram?
- **Where are the persistent gaps?** — fields that remain unfilled after all methods have been tried

### 3.3 Per Vertical / Subtype

Performance varies by entity type. Website crawling may have a high hit rate for restaurant hours but a low hit rate for park hours (because parks don't have traditional websites). The system should be able to observe these patterns:

- Hit rate by method × vertical
- Cost efficiency by method × vertical
- Recommended method ranking by vertical

### 3.4 Over Time

Methods degrade or improve. A website scraper might break when a common restaurant platform changes its template. A new API might become available. The system should track performance trends, not just point-in-time snapshots.

---

## 4. Existing Data That Supports This

The current system already captures much of the raw data needed:

- **`merchant_enrichment_runs`** — tracks what enrichment was run on which entity, when, and what stage
- **`observed_claims`** — tracks what data was extracted, from which source, with what confidence
- **`entity_issues`** — tracks what's still missing after enrichment
- **`merchant_surface_scans`** — tracks which surfaces were crawled and when
- **`enrichment_stage`** — tracks where the entity is in the pipeline

The gap is in **aggregation and reasoning**. The raw data exists, but the system doesn't currently compute hit rates, cost efficiency, or method rankings from it. That computation layer is what this problem framing is pointing toward.

---

## 5. Connection to Negative Confidence

A related concept (discussed alongside this framing): the system currently has no clean way to represent "we checked and the data isn't there." The absence of a field could mean "we haven't looked," "we looked and it's not there," or "it's not applicable."

Enrichment effectiveness measurement depends on distinguishing these cases:

- If a method was run and the field was extracted → success
- If a method was run and the field was NOT extracted → failure (or confirmed absence)
- If a method was not run → unknown

Without negative confidence (a way to record "we checked, it's not there, confidence: 0.85"), the system can't accurately compute hit rates or know when to stop trying.

---

## 6. Open Question

**How should the system balance effectiveness, efficiency, and cost when selecting or recommending enrichment methods?**

This document does not answer that question directly. It defines the need for a system that can observe performance and make that decision more intelligently over time.

Possible approaches (not endorsed, just noted):

- Static rules (the current approach — "free before paid, always")
- Weighted scoring (rank methods by a composite of hit rate, cost, and speed)
- Adaptive routing (the system learns which method works best for a given entity type × gap type and routes accordingly)
- Budget-constrained optimization (given a monthly API budget, maximize total gap-fill across the portfolio)

The right approach likely evolves over time, starting simple and becoming more sophisticated as measurement data accumulates.

---

## 7. Goal for Next Iteration

The next iteration should:

- Define what "success" means for an enrichment attempt (field extracted? field sanctioned? field published?)
- Propose a measurement schema (where hit rates and cost data are stored and computed)
- Define how measurements feed into the dashboard's recommendation engine
- Clarify the relationship between enrichment effectiveness and the enrichment strategy hierarchy

---

*Saiko Fields · Enrichment Effectiveness · Problem Framing v0 · 2026-03-20*
