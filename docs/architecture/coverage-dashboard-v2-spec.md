---
doc_id: ARCH-COVERAGE-DASHBOARD-V2
status: DRAFT
owner: Bobby
created: 2026-03-20
last_updated: 2026-03-20
layer: Concept Doc
depends_on:
  - ARCH-ENTITY-STATE-MODEL-V1
  - ENRICH-STRATEGY-V1
  - SKAI-DOC-FIELDS-ENRICHMENT-MODEL-V1
---

# Coverage Dashboard v2 — Spec

> **Status:** DRAFT — Pending Bobby approval.
> **Scope:** Defines the Coverage Dashboard layout, data model, and how it connects to enrichment orchestration. Replaces the current Pipeline/Actions/Neighborhoods dashboard with a strategy-aware, action-first design.

---

## 1. Purpose

The Coverage Dashboard is the operator's primary surface for understanding and improving Saiko's entity coverage. It answers three questions in priority order:

1. **What needs my attention right now?** (Gaps & Recommended Actions)
2. **How well-rounded is each neighborhood?** (Neighborhood Overview)
3. **What's the state of the whole system?** (System Summary)

The dashboard is designed around the near-term model: the system recommends actions based on the enrichment strategy, the operator approves and monitors. The architecture supports full automation later without requiring a dashboard redesign.

---

## 2. Layout

Actions first, context below. The operator opens the dashboard and immediately sees what to do.

### Top: Gaps & Recommended Actions

The primary workspace. Shows what's missing across the system and recommends the smartest way to fix it — taking into account the enrichment strategy (free before paid), cost, speed, and what has already been tried.

### Middle: Neighborhood Overview

Scannable table showing how well-rounded each neighborhood is. Bucket-level completeness (Identity %, Access %), program depth distribution, vertical mix, publication count. This is the diagnostic layer — where you go to understand coverage shape and decide where to focus.

### Bottom: System Summary

High-level state of the universe. Counts by operating status, enrichment status, publication status. Recent activity chart. This is the context layer — glanceable, not the primary workspace.

---

## 3. Gaps & Recommended Actions (Detail)

### 3.1 What It Shows

Gaps are grouped by **what's missing**, not by which script fixes them. The system identifies patterns across entities and presents them as addressable batches.

Example groupings:

- "43 entities missing hours — 38 have websites (recommend: website crawl, free), 5 have no website (recommend: Google Places API, paid)"
- "12 entities in Silver Lake missing Instagram — recommend: social discovery (free, AI-assisted)"
- "8 entities with no identity resolution — recommend: GPID resolution (Google Places, paid)"
- "15 entities with Access < 50% — most common gap: phone (12), hours (9), reservations (7)"

Each gap shows:
- **What's missing** — the data gap, in bucket terms (Identity / Access / Offering) and specific fields
- **How many entities** — count and optionally which neighborhoods are most affected
- **Recommended action** — the enrichment path the strategy recommends
- **Cost** — free, low cost, or paid (with estimated API cost if applicable)
- **What's been tried** — if previous enrichment runs didn't resolve the gap, show that so the operator knows not to re-run the same thing
- **Action button** — kicks off the recommended enrichment, or shows options if multiple paths exist

### 3.2 How Recommendations Work

The system follows the enrichment strategy hierarchy:

1. **Check existing evidence** — is the data already in observed_claims or merchant_surfaces but not yet sanctioned into canonical state? If so, recommend sanctioning review, not re-enrichment.
2. **Free sources first** — website crawl, Instagram API, TikTok API, editorial discovery. High signal density, zero cost.
3. **AI extraction** — parse already-fetched surfaces for structured data. Low cost (API calls to LLM).
4. **Paid APIs last** — Google Places API. Only recommended when free sources have been exhausted or don't apply.

The recommendation engine considers:
- **Entity vertical** — a park doesn't need reservation URL enrichment. The vertical-aware completeness model (enrichment-model-v1.md) defines what's expected.
- **What's already been tried** — `enrichment_stage`, `merchant_enrichment_runs`, and `entity_issues` track previous attempts. Don't recommend re-running something that already failed.
- **Cost** — always surface the cost of the recommendation. "Free" is always preferred. Paid actions should show estimated cost.
- **Batch efficiency** — group entities that need the same enrichment into batches. "Run website crawl on 38 entities" is better than 38 individual actions.

### 3.3 Action Types

- **Enrich** — run an enrichment pipeline step on a batch of entities
- **Review** — flag entities for human review (conflicting evidence, low confidence sanctions, entities that enrichment couldn't resolve)
- **Re-enrich** — re-run enrichment on entities where data may be stale or where new sources are available
- **Promote** — evidence exists but hasn't been sanctioned; recommend sanctioning review

### 3.4 Filtering and Scoping

The operator can filter the gaps view by:
- **Neighborhood** — "show me gaps in Silver Lake only"
- **Vertical** — "show me gaps in EAT entities only"
- **Bucket** — "show me Identity gaps only"
- **Cost** — "show me only free actions"

---

## 4. Neighborhood Overview (Detail)

### 4.1 What It Shows

A table where each row is a neighborhood. Columns reflect the concepts that matter for assessing coverage balance.

| Column | What It Shows |
|---|---|
| **Neighborhood** | Name |
| **Entities** | Total count of entities in the neighborhood |
| **Published** | Count or percentage of entities with publicationStatus: PUBLISHED |
| **Identity** | Percentage of entities passing the Identity completeness bucket (vertical-aware) |
| **Access** | Percentage of entities passing the Access completeness bucket (vertical-aware) |
| **Program Depth** | Distribution of entities by offering program count (0, 1, 2, 3+). Replaces the Offering completeness percentage — program depth gives the operator a more actionable read on how much offering data we actually have per entity. |
| **Verticals** | Compact visualization of the vertical mix — e.g., a small stacked bar or tag list showing the distribution (EAT: 30, COFFEE: 8, CULTURE: 5, SHOP: 3) |

### 4.2 What "Neighborhood Completeness" Means

Neighborhood completeness is not a single number. It's a composite assessment of:

1. **Entity record completeness** — of the entities we have, how complete are their records? Measured by the three-bucket model (Identity, Access, Offering) aggregated to the neighborhood level.

2. **Vertical balance** — does the neighborhood have a reasonable mix of verticals? A neighborhood with 40 restaurants and no coffee shops or culture is imbalanced. This doesn't mean we can add entities that don't exist — but it highlights where discovery or intake work might be valuable.

3. **Publication rate** — what percentage of entities in the neighborhood are actually published? A neighborhood with 50 entities but only 20 published has a publication gap.

The neighborhood table shows these dimensions so the operator can scan for: neighborhoods with low completeness (need enrichment), neighborhoods with shallow program depth (need offering enrichment), neighborhoods with lopsided verticals (may need discovery), and neighborhoods with low publication rates (may have blocking issues).

### 4.3 Interaction

Clicking a neighborhood row could expand or navigate to a detail view showing:
- Individual entities in the neighborhood, sortable by completeness
- Gaps specific to that neighborhood (filtered version of the top-level gaps view)
- Vertical breakdown with counts

This detail view is where neighborhood-specific enrichment actions live — "enrich all Silver Lake entities missing hours."

---

## 5. System Summary (Detail)

### 5.1 What It Shows

The three state axes from the Entity State Model, displayed as summary cards:

**Enrichment Status**
- INGESTED: [count] — entities waiting to be processed
- ENRICHING: [count] — currently in the pipeline
- ENRICHED: [count] — pipeline complete

**Publication Status**
- PUBLISHED: [count] — live on Saiko surfaces
- UNPUBLISHED: [count] — not visible

**Operating Status**
- SOFT_OPEN: [count]
- OPERATING: [count]
- TEMPORARILY_CLOSED: [count]
- PERMANENTLY_CLOSED: [count]

Plus the recent activity chart (last 7 days of enrichment and intake activity) that already exists.

### 5.2 Why This Is at the Bottom

The system summary is context, not action. It tells you the overall shape of the universe but doesn't help you decide what to do next. The gaps/actions view does that. The neighborhood view helps you decide where to focus. The system summary confirms the overall health.

---

## 6. Connection to Enrichment Orchestration

### 6.1 Current State

Enrichment is manual. The operator decides what to run, on which entities, using which scripts. The dashboard shows gaps but doesn't recommend actions.

### 6.2 Near-Term Target (This Spec)

The dashboard recommends actions based on the enrichment strategy. The operator reviews and approves. The system executes the approved enrichment batch and reports results. The dashboard is a **recommendation and approval surface**.

Key capabilities:
- Strategy-aware recommendations (free before paid, vertical-aware)
- Batch operations (enrich 38 entities at once, not one at a time)
- Cost visibility (show estimated cost before the operator approves)
- History awareness (don't recommend re-running what already failed)
- Result reporting (after enrichment runs, show what changed)

### 6.3 Future State

The system runs enrichment automatically. When an entity moves from INGESTED to ENRICHING, the full strategy executes without human intervention — free sources, AI extraction, paid APIs for gaps. The operator doesn't approve individual actions; they monitor outcomes and intervene only on exceptions (conflicts, low confidence, failures).

The dashboard becomes a **monitoring surface**:
- "12 entities enriched in the last 24 hours, 3 flagged for review"
- "Silver Lake Identity coverage went from 78% to 92% this week"
- "4 entities hit paid API limits — queued for next billing cycle"

The transition from recommendation → monitoring requires no dashboard redesign. The same layout works — actions just move from "recommended, awaiting approval" to "completed" or "in progress" automatically.

---

## 7. What This Spec Does Not Define

- Exact UI component design (colors, spacing, card layouts)
- API route structure for the new dashboard data
- Enrichment orchestration engine (the recommendation logic itself)
- Automated pipeline triggers (future state)
- Notification system for completed enrichment runs

---

## 8. Relationship to Existing Docs

| Doc | Relationship |
|---|---|
| entity-state-model-v1.md | System Summary uses the three state axes |
| enrichment-strategy-v1.md | Recommendations follow the enrichment strategy hierarchy |
| enrichment-model-v1.md | Completeness buckets (Identity, Access, Offering) drive gap detection and neighborhood metrics |
| coverage-tiers-v1.md | Tier definitions inform what "complete" means per vertical |
| coverage-ops-dashboard-v1.md | Superseded by this spec |

---

*Saiko Fields · Coverage Dashboard v2 · Draft 2026-03-20 · Pending Bobby Approval*
