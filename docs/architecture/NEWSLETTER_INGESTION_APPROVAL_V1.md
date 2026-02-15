# Newsletter Ingestion — Approval Framework v1
Status: ACTIVE (Phase 1: Manual Review Only)
Scope: Tool / Ingestion Layer (no product/UI requirements)

## Purpose
Ingest verified operator newsletters as **high-authority operational deltas** (closures, events, temporary overrides), while preventing silent drift in canonical data.

Core posture:
- Preserve provenance
- Require explicit approval
- Use time-bounded overlays that expire automatically
- Do not ingest subjective/promotional claims

---

## Two-Table Hybrid (Locked)

proposed_signals (source of truth; immutable extraction record)
  ↓ (approval/validation)
operational_overlays (materialized approved state)
  ↓ (render logic)
Display with expiration checking

Rationale:
- proposed_signals preserves "what the source said" + evidence
- operational_overlays provides a simple "what's active now" query and auto-expiration

---

## Source Authority Rules — Operator Email

### Authoritative for (operational deltas)
- Temporary closures (vacation / private event)
- Hours overrides (explicitly time-bounded)
- Special event timing
- Ticket pricing
- Off-site pop-ups (as separate event records or flagged overlays)
- Recurring programming announcements (NOT auto-approved; see exclusions)

### Not authoritative for (ignore)
- Subjective or promotional claims
- Identity positioning ("best", "iconic", "unforgettable")
- Editorial language
- Permanent identity assertions

Extraction must ignore qualitative copy and only extract fact-like, time-bounded data.

---

## Canonical Mutation Rule (Defensive)
Newsletter ingestion:
- MUST NOT directly overwrite canonical hours or canonical fields
- MUST create proposed signals with provenance
- MAY create overlays only via approval (Phase 1)
- MUST auto-expire overlays based on ends_at

Canonical hours remain the baseline; overlays temporarily supersede display only within their time window.

---

## Display Model ("Confidence-first")
- If an approved overlay is active for *now*: display overlay truth.
- If content indicates uncertainty without explicit bounds: do NOT override; display canonical + a small uncertainty notice (handled later; ingestion can emit an `uncertainty` signal type).
- If no overlay: display canonical.

---

## Approval Framework v1

### Phase 1: Manual Review Only (Launch)
All proposed_signals start `status: proposed`.
No automatic promotion.

Review queue should show:
- signal_type
- extracted temporal bounds
- conflicting canonical data (if any)
- source excerpt (evidence)
- approve / reject / edit

Approval creates an operational_overlay and updates proposed_signal status.

### Phase 2: Narrow Auto-Approval Whitelist (Post-Launch)
Deferred. Not implemented in Phase 1.
(Whitelists + gates exist as a future spec; do not build now.)

---

## Explicit Exclusions (Never Auto-Approve)
Even in Phase 2, these must remain manual:
- recurring programming ("every Wednesday")
- holiday ambiguity ("holiday hours may apply")
- conditional language ("may", "might", "possibly")
- structural changes (permanent hours, relocation, concept changes)
- ambiguous "this week" statements without explicit times

---

## Contra / Tricky Areas (Specific Provisions)

### A) Holiday ambiguity
If date range is unclear:
- do NOT override hours
- emit uncertainty signal with limited TTL (implementation later)

### B) Recurring programming drift
Recurring overlays require revalidation cadence (future).
Do not auto-approve recurring in v1.

### C) Marketing language without time markers
No date/time markers = no overlay.
Extraction must require explicit temporal markers for operational overlays.

### D) Conflicting sources (website vs newsletter)
Approved overlay temporarily supersedes canonical during its window.
After ends_at, revert to canonical automatically.
Repeated conflicts should be flagged for review (future).

### E) Off-site events
Off-site announcements must not mutate the primary place hours.
They should become separate event/overlay records flagged as off-site.

---

## Data Objects (Schema Targets)

### proposed_signals
- place_id
- source reference (newsletter/email id + sender domain)
- signal_type (closure | hours_override | event | recurring_program | uncertainty)
- extracted_data (json)
- confidence_score (optional; not used for auto-approval in v1)
- status (proposed | approved | rejected | superseded)
- evidence_excerpt (short)
- timestamps

### operational_overlays
- place_id
- source_signal_id (FK -> proposed_signals)
- overlay_type (closure | hours_override | event | uncertainty)
- starts_at
- ends_at
- override_data (json)
- approval_method (manual for v1)
- timestamps

---

## Phase 1 Deliverable (Engineering)
Implement schema + minimal helper functions to:
1) create proposed signal
2) approve proposed signal into overlay (manual)
3) query active overlays for a place at a given time

No UI required in Phase 1. No auto-approval.
