---
doc_id: PIPE-CAPTURE-PROFILES-V1
doc_type: spec
status: active
owner: Bobby Ciccaglione
created: 2026-03-12
last_updated: 2026-03-12
project_id: FIELDS
systems:
  - fields-data-layer
  - entity-resolution
related_docs:
  - docs/FIELDS_V2_TARGET_ARCHITECTURE.md
  - docs/architecture/entity-pipeline-overview-v1.md
summary: Defines capture profiles for each source type — what to attempt when a source is touched, and what can be promoted to Facts-tier vs stored as raw material.
---

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
