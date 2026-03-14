---
doc_id: PIPE-INSTAGRAM-WORKSTREAM-V1
doc_type: spec
status: active
owner: Bobby Ciccaglione
created: '2026-03-13'
last_updated: '2026-03-13'
project_id: SAIKO
summary: >-
  Phased execution plan for Instagram integration — 6 phases from data quality
  through contextual display. Includes codebase readiness assessment, effort
  estimates, timing recommendations, and per-phase task checklists.
systems:
  - instagram-api
  - enrichment-pipeline
  - merchant-surfaces
  - scenesense
related_docs:
  - docs/architecture/instagram-implementation-v1.md
  - docs/architecture/instagram-api-integration-v1.md
  - docs/architecture/instagram-ingestion-field-spec-v1.md
---

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
