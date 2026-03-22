---
doc_id: ARCH-EVENTS-PROGRAM-V1
doc_type: architecture
status: draft
title: "Events Program — Architecture-Aligned Spec (V1)"
owner: Bobby Ciccaglione
created: "2026-03-01"
last_updated: "2026-03-22"
project_id: SAIKO
systems:
  - enrichment
  - derived-signals
  - traces-place-page
  - coverage-ops
related_docs:
  - docs/architecture/coverage-source-enrichment-v1.md
  - docs/architecture/derived-signals-engine-v1.md
  - docs/architecture/enrichment-evidence-model-v1.md
summary: >
  Defines how Saiko detects, structures, and exposes event capabilities
  (private dining, group dining, catering) for places. Extends the existing
  offering_programs model with three new program types, adds events surface
  discovery, and wires through to the place page contract. V1 is detect →
  structure → expose only — no marketplace, booking, or pricing.
---

# Events Program — Architecture-Aligned Spec (V1)

---

## 1. Product Thesis

Saiko reveals how great places can be used — not just visited. Events are an extension of a place's core experience into group and private use.

V1 = Detect → Structure → Expose

- No marketplace, no booking, no pricing, no leads.

---

## 2. Existing Infrastructure

Event detection is not greenfield. The codebase already has:

| Existing Asset | Location | Status |
|---|---|---|
| `private_dining_present` boolean | `merchant_surface_scans` | Detected during crawl, not yet promoted |
| `has_events` in `program_signals` | `reservation_provider_matches` | Resy/Tock/SevenRooms report event capability |
| `event` + `recurring_program` signal types | `ProposedSignalType` enum | Newsletter extraction supports event signals |
| "events"/"catering" URL filtering | `operator-extract.ts` → `INDEX_NAV_PATH_SEGMENTS` | Currently **discarded** as nav noise — needs to be **captured** |
| `offering_programs` (7 programs, maturity+signals) | `derived_signals` table | Pattern to extend with event program types |
| `PlacePageOfferingPrograms` contract | `lib/contracts/place-page.ts` | Contract to extend |
| Surface discovery pipeline | `lib/merchant-surface-discovery.ts` | Add `events` surface type |
| Issue scanner | `lib/coverage/issue-scanner.ts` | Add event coverage gap issue types |

---

## 3. Data Model

### Decision: Extend offering_programs

Event capabilities extend the existing `offering_programs` derived signal (same maturity + signals pattern) rather than creating a parallel system. This keeps one unified program model.

### 3A. New Program Types

| Program Key | What It Represents | Maturity Scale |
|---|---|---|
| `private_dining_program` | Private/semi-private dining rooms, buyouts | `dedicated`: branded events page, events coordinator, inquiry form. `considered`: "private dining available" mention. `incidental`: back room exists. `none`: explicitly no private space. |
| `group_dining_program` | Group-friendly dining (set menus, large party accommodations) | `dedicated`: group menu PDF, minimum headcount page. `considered`: "we accommodate groups" mention. `incidental`: large tables available. |
| `catering_program` | On-site or off-site catering services | `dedicated`: catering page with menu/pricing. `considered`: "catering available" mention. `incidental`: implicit from event inquiries. |

Each follows the existing `ProgramEntry` shape: `{ maturity, signals[], confidence, evidence[] }`

### 3B. Signal Vocabulary

```
EVENT_SIGNALS:
  private_room_available
  full_buyout_available
  semi_private_available
  events_coordinator
  inquiry_form_present
  events_page_present
  catering_menu_present
  off_site_catering
  on_site_catering
  group_menu_available
  minimum_headcount
  prix_fixe_group_menu
```

### 3C. New Surface Type

Add `events` to `SurfaceType` — covers private dining pages, events pages, catering pages, group dining pages.

Classification patterns:
```
/events/, /private-dining/, /private-events/, /group-dining/,
/catering/, /host/, /buyout/, /celebrations/, /parties/
```

### 3D. New Canonical Fields

Registered in `attribute_registry`, stored in `canonical_entity_state`:

| attribute_key | attribute_class | sanction_threshold |
|---|---|---|
| `events_url` | CANONICAL | 0.70 |
| `catering_url` | CANONICAL | 0.70 |
| `event_inquiry_email` | CANONICAL | 0.70 |
| `event_inquiry_form_url` | CANONICAL | 0.70 |

These flow through the standard `write-claim.ts` pipeline (observed_claims → sanction → canonical).

### 3E. No New Tables

Everything routes through existing infrastructure:
- Detection → `merchant_surfaces` (surface_type = 'events')
- Parsed artifacts → `merchant_surface_artifacts`
- Claims → `observed_claims` → `canonical_entity_state`
- Programs → `derived_signals` (signal_key = 'offering_programs')

---

## 4. Enrichment Pipeline

### Stage 2 — Surface Discovery (extend)

Add `events` surface type + classification patterns. Events pages get `merchant_surfaces` rows automatically.

### Stage 3 — Surface Fetch (no changes)

Already fetches all discovered surfaces regardless of type.

### Stage 4 — Surface Parse (extend)

For `surface_type='events'`, extract contact info + event capability mentions. Write to `merchant_surface_artifacts` as `artifact_type='events_parse_v1'`.

### Stage 6 — Website Enrichment (extend)

- Stop filtering "events" and "catering" from `INDEX_NAV_PATH_SEGMENTS`
- Extract `events_url`, `catering_url`, `event_inquiry_email`, `event_inquiry_form_url`
- Write claims via `writeClaimAndSanction()` to canonical fields

### Offering Programs Assembly (extend)

Add 3 new program keys. Source signals from:
1. `merchant_surface_scans.private_dining_present` (existing)
2. `reservation_provider_matches.program_signals.has_events` (existing)
3. `merchant_surface_artifacts` where `artifact_type='events_parse_v1'` (new)
4. `identity_signals` if any event-related signals extracted (existing)

Maturity inference:
- Dedicated events page + inquiry form → `dedicated`
- Mention on about/contact page → `considered`
- `private_dining_present` boolean only → `incidental`
- No signals → `unknown`

---

## 5. API & Product Contract

### Contract Extension

Add to `PlacePageOfferingPrograms`:
- `private_dining_program`, `group_dining_program`, `catering_program` (same `PlacePageProgramEntry` shape)

Add to response:
- `eventsUrl`, `cateringUrl`, `eventInquiryEmail`, `eventInquiryFormUrl`

### API Route

- Extend `PROGRAM_KEYS` array
- Read new canonical fields from entity/canonical state

---

## 6. Coverage Ops

### New Issue Types

| issue_type | problem_class | severity | blocking_publish | detect |
|---|---|---|---|---|
| `missing_events_surface` | editorial | low | false | Has website, no events surface, not suppressed |
| `thin_event_program` | editorial | low | false | Has events surface but all event maturities are `unknown` |

### Coverage Ops UI

- Labels for new issue types
- Inline action: "Run Stage 2" for re-discovery
- Inline editable: `events_url` paste field

---

## 7. UI Exposure (Traces)

Place page action layer — shows when any event program has maturity `considered` or `dedicated`:

- "Private Events" → `events_url` or `event_inquiry_form_url`
- "Group Dining" → `events_url`
- "Catering" → `catering_url`

Falls back to `event_inquiry_email` if no URL. Hidden if all event programs are `none`/`unknown`/`incidental`.

Reads from API contract only. Does not touch data tables.

---

## 8. Not V1

- No event marketplace
- No booking system
- No pricing / hourly rates
- No capacity filters UI
- No availability tracking
- No lead management

---

## 9. Future (Post-V1)

- Event suitability scoring
- Group size inference
- "Good for groups" ranking
- Lead capture / routing
- Event-specific search UI
- Availability / demand modeling
