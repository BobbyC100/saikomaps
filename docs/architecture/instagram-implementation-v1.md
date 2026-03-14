---
doc_id: ARCHITECTURE-INSTAGRAM-IMPLEMENTATION-V1
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: '2026-03-13'
last_updated: '2026-03-13'
project_id: SAIKO
summary: >-
  Instagram integration implementation plan and system impact — tables, sync
  rules, temporal signals, interpretation layer, photo strategy, attachment
  model. V0.2 adds current state assessment, implementation phases, and data
  review results.
systems:
  - instagram-api
  - enrichment-pipeline
  - merchant-surfaces
related_docs:
  - docs/architecture/instagram-api-integration-v1.md
  - docs/architecture/instagram-ingestion-field-spec-v1.md
---
# Instagram Integration — Implementation & Impact Doc

**Version:** 0.2
**Draft Date:** 2026-03-13
**Author:** Bobby / Claude
**Status:** Pre-engineering handoff — data review complete

## 1. Purpose & Architectural Intent

This document defines the implementation plan and system impact assessment for adding Instagram as a data source to the Saiko platform. It is intended as a handoff to engineering and as a seed document for the knowledge base.

Instagram is not just another data source. It is categorically different from every source we have ingested to date. Website content is foundational but static — updated infrequently, written for marketing purposes, not for communication. Google Business Profile is slow and aggregated. Editorial coverage is episodic and externally authored. Instagram is the merchant speaking directly, regularly, in their own voice, about what is happening right now.

Our places are alive. Instagram is what makes that true.

The architectural intent of this integration is to treat Instagram as a first-class input to the interpretation layer — not a bolt-on, not a supplemental source, but a primary merchant-authored voice that feeds signal extraction, confidence scoring, photo candidates, and contextual display. Every decision in this document should be made in service of that intent.

A secondary intent is to establish a pattern for ingesting broad, recurring datasets. Instagram is the first dataset of this type. The architecture we build here should be extensible — when the next dataset of this kind arrives, it should slot in cleanly without requiring every downstream feature to be individually updated.

## 2. Opportunities

Instagram unlocks capabilities that no other source in the current stack can provide. These are worth stating explicitly so the engineering team understands the editorial and product intent behind the technical work.

**Real merchant voice.** Instagram is the most direct line we have to how a place talks about itself. Website copy is written for conversion. Instagram is written for communication. That distinction matters for signal quality.

**Temporal pulse.** Instagram is the only source that tells us what is happening this week, today, hours ago. No other source in the stack has this property. This is a genuine and significant differentiation.

**Operational intelligence.** Closures, private events, hours changes, special menus, guest chefs — merchants post this information on Instagram before it appears anywhere else. In many cases it never appears anywhere else. We can have this information hours after it is posted.

**Visual intent.** Merchant-posted photos are editorially intentional. The merchant chose those images. They framed the shot. They decided it represented them. This is categorically different from user-submitted Google photos.

**Confidence lift.** Instagram signals can corroborate signals we were already extracting from other sources. A natural wine bar that mentions producers in their captions, describes their pours, posts about winemaker dinners — that is high-quality corroborating evidence for signals we may have only had weak confidence in before.

**Caption signal density.** Wine bars, natural wine focused restaurants, chef-driven spots — these entities often use captions to describe sourcing, producers, regions, dishes, philosophy. That is rich structured data hiding in plain text. It is some of the highest-quality signal we can extract relative to the cost of getting it.

**Contextual display.** Instagram is the data foundation for showing users information that is true right now, not just true in general. This is one of the most meaningful product differentiators we can build. Users learn that Saiko knows things other platforms do not. That builds trust compounding over time.

## 3. Current State & What's Already Done

As of 2026-03-13, significant infrastructure already exists. This section distinguishes what is built from what remains.

### Component Status

| Component | Status | Notes |
|---|---|---|
| `instagram_accounts` table | ✅ Schema exists | Empty — no ingestion run yet |
| `instagram_media` table | ✅ Schema exists | Empty — no ingestion run yet |
| `instagram_insight_snapshots` table | ✅ Schema exists | Empty |
| `instagram_temporal_signals` table | ❌ Not yet created | New — defined in Section 6 |
| `ingest-instagram.ts` | ✅ Operational | Business Discovery + batch + /me modes |
| API credentials | ✅ Configured | Never-expiring Page Access Token + IG User ID in `.env.local` |
| `merchant_surfaces` IG records | ✅ 90 rows exist | ~70 entities with discovered IG URLs |
| `entities.instagram` column | ⚠️ 7 populated | Quality issues; needs backfill from surfaces |
| API route serves IG handle | ✅ Working | Returns `entities.instagram` to client |
| Place page renders IG link | ✅ Working | StatusCell + primary CTAs |
| Caption signal extraction | ❌ Not built | Phase 2 |
| Temporal signal extraction | ❌ Not built | Phase 3 |
| Photo candidate scoring | ❌ Not built | Phase 4 |
| SceneSense IG wiring | ❌ Not built | Phase 5 |
| Contextual display UI | ❌ Not built | Phase 6 |

### Key Credentials

- **Facebook Page "Saiko Fields"** Graph API ID: `1048011751721611`
- **Instagram Business Account ID:** `17841401035810011`
- **Meta App:** TRACES THREE (app ID `1325848402713479`, development mode)
- **Token scopes:** `pages_show_list`, `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`
- **Token type:** Never-expiring Page Access Token (derived from long-lived user token)

### Handle Data Quality

The `entities.instagram` column has 7 entries but quality is poor. Meanwhile, `merchant_surfaces` has 90 instagram URLs across ~70 entities discovered by the surface pipeline. There is an immediate opportunity to backfill `entities.instagram` from `merchant_surfaces` by extracting clean handles from surface URLs.

Known handle issues:
- `LA Tutors 123` has literal string `"null"` (not SQL NULL)
- `Mochomitoss` has full URL `https://www.instagram.com/mochomitosss/` instead of clean handle
- Several handles don't resolve via Business Discovery (account may not be Business/Professional type)

### Batch Dry Run Results (2026-03-13)

| Entity | Handle | Status | Posts | Followers |
|---|---|---|---|---|
| Brothers Cousins | @brotherscousinstacos | ✅ Found | 209 | 61,721 |
| Tacos El Toro | @tacoseltoro_ | ✅ Found | 929 | 32,994 |
| Tacos Pasadita | @tacospasadita_ | ✅ Found | 30 | 2,911 |
| Balam Kitchen | @balammexicankitchen | ❌ Not found | — | — |
| Seco | @secolosangeles | ❌ Not found | — | — |
| Mochomitoss | @mochomitosss | ❌ Not found | — | — |
| LA Tutors 123 | @null | ❌ Bad data | — | — |

### Caption Data Observations

From the three successful accounts, caption characteristics vary significantly:
- **Brothers Cousins:** Bilingual (English/Spanish), operational content (location announcements, hours, closures), moderate caption length
- **Tacos El Toro:** Primarily Spanish, personal/storytelling content mixed with operational info, high posting cadence (929 posts)
- **Tacos Pasadita:** Primarily Spanish, location-focused, shorter captions with emoji-heavy formatting

This is a small sample skewed toward taco trucks. The ~70 entities with `merchant_surfaces` instagram records include fine dining, wine bars, and chef-driven restaurants likely to have richer caption signal density for SceneSense extraction.

### Platform Constraint

The TRACES THREE app is in **development mode**. All API calls are limited to test users and business accounts that have granted access. Before batch ingest at scale, the app will need Meta App Review approval. This is not a blocker for the current entity set but will be for production scale.

## 4. Affected Systems

The following systems are affected by the Instagram integration. This is not an exhaustive engineering audit — it is a map of known impact areas. Engineering should treat this as a starting point for discovery, not a complete specification.

**Data layer:** Three new tables, merchant_surface attachment, place_coverage_status freshness fields, interpretation_cache new input source, confidence scoring model.

**Ingest layer:** New fetch job for account and media, insights ingest job, caption extraction job, temporal and operational signal extraction job, future visual analysis job.

**Interpretation layer:** SceneSense and language_signals pipeline, ABOUT synthesis path, confidence scoring model, signal TTL and expiry concept which does not yet exist.

**API layer:** `/api/places/[slug]` route which will need to pull from new data sources, data contract in `place-page.ts` which will need homes for Instagram fields.

**Rendering layer:** Links rail for Instagram URL, Photos section for merchant IG candidates, ABOUT section where IG bio and captions enter the source hierarchy, SceneSense indirectly via language_signals.

**Voice layer:** ABOUT synthesis path needs to know Instagram exists and how to weight it. Caption register awareness — Instagram language is shorter and more casual than website copy and should not bleed into rendered output tone. Merchant voice fidelity — Instagram is the highest-trust merchant voice signal we have. Temporal voice signals — time-bound language in captions must be recognized and not absorbed into evergreen identity copy.

**Operational:** Fetch cost and rate limit management, storage growth planning, re-parse capability via raw payload preservation.

## 5. Tables

Three tables already exist in the Prisma schema (empty, never populated). A fourth for temporal signals is new and defined in Section 7.

### instagram_accounts

One record per connected Instagram account. Links to merchant_surface.

**Fields:** internal id, merchant surface link, instagram_user_id, username, account_type, media_count, canonical_instagram_url, last_fetched_at, last_successful_fetch_at, source_status, raw_payload.

**Derived fields:** latest_post_at, posting_cadence_30d, posting_cadence_90d, is_active_recently.

**Sync rule:** Overwrite mutable fields on each fetch, keep latest raw_payload.

### instagram_media

One record per post. Upsert by instagram_media_id.

**Fields:** internal id, instagram_media_id (unique), instagram_user_id, media_type, media_url, thumbnail_url, permalink, caption, timestamp, fetched_at, raw_payload.

**Derived fields:** caption_present, caption_length, posted_day_of_week, posted_hour_local, is_recent_post, signal_extracted_at, is_display_candidate, visual_analysis_run.

- `signal_extracted_at` tracks which posts have been run through caption extraction and when, supporting re-extraction if the model improves.
- `is_display_candidate` is a boolean flag for the photo scoring layer.
- `visual_analysis_run` is a boolean that future-proofs the schema for image analysis without requiring it now.

**Sync rule:** Upsert by instagram_media_id, preserve original timestamp, refresh mutable fields if changed.

### instagram_insight_snapshots

Append only. Never overwrite old values.

**Fields:** internal id, subject_type (account or media), subject_id, metric_name, metric_value, observed_at, window_label, raw_payload.

**Metrics:** impressions, reach, engagement.

**Sync rule:** Append only on every fetch. Historical snapshots are the record.

## 6. Sync & Ingest Rules

Each table has a distinct sync behavior. These are not interchangeable.

**Accounts overwrite.** Each fetch overwrites mutable fields. Accounts do not change frequently enough to require history. Keep latest raw_payload.

**Media upsert.** Upsert by instagram_media_id. Never duplicate a post. Preserve original timestamp — that is immutable, it is when they posted. Refresh mutable fields if changed since caption edits happen.

**Insights append only.** Every fetch creates a new snapshot row. This is how trending and cadence analysis gets built over time.

**Fetch cadence** is an open question to be resolved after data review. Options include daily for active accounts, every 48-72 hours for lower cadence accounts, or dynamic cadence driven by is_active_recently. Whatever cadence is chosen, the ingest job must be designed around Instagram API rate limits from day one, not retrofitted. Scheduling needs to account for rate limit headroom across the full merchant set.

**Raw payloads** are preserved on all three tables specifically so signals can be re-extracted later without re-fetching. This is a deliberate cost decision. We paid for the fetch. We should be able to use it more than once.

## 7. Temporal Signal Architecture

This is the most novel section in the document. Nothing in the current system thinks about time the way Instagram requires. This section defines a new signal class that did not previously exist in the platform.

Every other source produces evergreen signals. A website that says "wood-fired, seasonal, natural wine focused" is probably saying the same thing next year. Instagram produces both evergreen signals and perishable ones. The architecture must tell them apart.

**Evergreen signals** are extracted from captions and treated as stable identity information. Examples: "we source from small producers," "wood-fired open fire cooking," "natural wine focused." These flow into language_signals and through the existing SceneSense pipeline. No expiry.

**Temporal and operational signals** are time-bound. They are only true for a specific window. Examples: "closed this Sunday for a private event," "guest chef dinner Friday only," "truffle menu through end of March," "we will be at the farmers market Saturday." These require different handling entirely.

Temporal signals need what evergreen signals do not:
- A `valid_from` and `valid_until` or TTL field
- Separation from evergreen signal storage so they do not flow into SceneSense or ABOUT
- Their own extraction job that specifically looks for date and event language
- A display path that does not yet exist but must be designed for

**The trust implication** is the most operationally critical point in this document. If Saiko displays hours or open status that contradicts what a merchant posted on Instagram hours ago, that is a trust problem. Temporal signals from Instagram should be treated as higher recency authority than any other source on operational matters.

**Capture now, display later.** The display UI for temporal signals does not exist yet. That is acceptable. The capture infrastructure must exist from day one. Six months of event and closure data thrown away because the UI was not ready is not acceptable.

This architecture is the technical foundation for contextual display as a product capability. Contextual display — surfacing information that is true right now, not just true in general — is one of the most meaningful differentiators Saiko can build. Instagram is what makes it possible.

### instagram_temporal_signals

**Fields:** internal id, instagram_media_id (source post), signal_type (closure / event / hours_change / special_menu / other), signal_text (extracted language), valid_from, valid_until, confidence, extracted_at, is_expired.

A scheduled job will need to run expiry sweeps to set is_expired as signals age out.

**Open question:** How do temporal signals interact with `entities.hours`? If a post says "closed Sunday" but hours say open, who wins and does anything in the UI surface the conflict? This is a product decision to be made when contextual display is scoped.

## 8. Interpretation Layer Impact

Every interpretation feature in the current stack was built against a fixed input set. Instagram expands that input set in ways that are largely positive but require awareness before wiring.

Generally speaking Instagram provides another rich dataset for interpretation features to draw on. SceneSense gains more language_signals input. ABOUT synthesis gains more merchant text to work from. Confidence scoring gains a new corroborating source. These are additive improvements.

The concern worth flagging is that features may have been built with hardcoded assumptions about where signals come from. A feature that knows to look at specific fields from specific sources will not automatically know Instagram exists. Before wiring Instagram signals into any interpretation feature, engineering should audit how that feature currently sources its inputs and whether source assumptions are hardcoded.

**Flag for engineering review:** Before Instagram signals can be fully utilized by interpretation features, identify which features have hardcoded source assumptions that need to be made more flexible. This is not a blocker but it is a known risk area. Features most likely to be affected based on current knowledge:
- ABOUT synthesis path
- SceneSense and language_signals ingestion
- Confidence scoring model
- Identity line assembly

The longer-term architectural direction this points toward is a **source arbitration layer** — a unified signal pool with source, recency, and confidence attached, from which features draw without needing to know the specific origin. Instagram is the forcing function that makes this worth designing toward. Engineering should be aware of this direction even if the refactor is deferred.

## 9. Photo Strategy

Instagram photos should be ingested using the same pipeline philosophy as Google photos. The goal is a unified pool of quality-vetted photo candidates with source metadata attached. The rendering layer — TRACES — decides what gets displayed. The data layer surfaces the best candidates it can.

**The data layer is responsible for:**
- Ingesting the media
- Assessing quality signals (resolution, aspect ratio)
- Flagging display candidates via `is_display_candidate` on instagram_media
- Preserving source and recency metadata so TRACES can factor them into display decisions

**The data layer is not responsible for:**
- Deciding which photos get shown
- Ranking merchant Instagram above Google in the UI
- Any display logic

**Flag for engineering:** Instagram photo ingestion should mirror the existing Google photo pipeline wherever possible. Do not build a separate system. Extend what exists. TRACES consumes from a unified candidate pool with source metadata, not from source-specific photo tables. Review how the Google photo pipeline currently works before building the Instagram photo ingest path.

## 10. Attachment Model

Instagram attaches to `merchant_surface` first, not directly to `entities`. This is the structural decision that everything else depends on.

The chain is: `entities` → `merchant_surface` → `instagram_accounts` → `instagram_media` and `instagram_insight_snapshots`.

This keeps Instagram as a source record — a signal contributor — not a core identity record. `merchant_surface` is the right abstraction layer because it is where all merchant-authored sources live. Instagram is one of them. A place can exist in `entities` without an Instagram account. Instagram is additive, not load-bearing.

**Hard dependency:** `merchant_surface` must exist and be wired to entities before Instagram attachment works. If that table is not yet built, this is the first thing to resolve. Everything downstream — signal extraction, photo candidates, ABOUT sourcing, confidence scoring — depends on this link being clean.

**Unmatched accounts:** The ingest job needs a fallback state for Instagram accounts that cannot be confidently matched to an entity. Proposed: `source_status` set to `unmatched`. Unresolved accounts should not be dropped — they should be queued for review. Identity resolution for unmatched accounts is an open question.

## 11. Future Considerations

These are capabilities the architecture should not close the door on. Engineering should be aware they are coming.

**Visual signal extraction.** Running image analysis on display candidate photos. Dish recognition, ambiance signals, lighting, spatial density. Feeds SceneSense and confidence scoring. Schema is already designed to support this via `visual_analysis_run` flag on instagram_media. Cost model needs to be defined before building — run only on display candidates, not the full media archive. Do not build now.

**Contextual display.** The product expression of temporal signals. Surfacing time-bound information directly on the place page — closures, events, special menus, hours changes. `instagram_temporal_signals` is designed for this. Display UI does not exist yet but capture infrastructure will from day one.

**Signal expiry and TTL.** As temporal signals accumulate a scheduled expiry sweep job will be needed to set `is_expired` and keep the active signal pool clean.

**Source arbitration layer.** As the source set grows, individual features should not need to know where signals come from. A unified signal pool with source, recency, and confidence attached would make the interpretation layer source-agnostic. Instagram is the forcing function. Design toward this even if the refactor is deferred.

**Event detection and display.** Instagram posts about events are captured as temporal signals but not yet parsed for structured event data. A future extraction job could identify event type, date, and time and surface it as a dedicated display element.

**Merchant direct upload.** Instagram is a proxy for merchant-curated photos. Eventually merchants may upload directly. The photo pipeline should be designed so direct uploads slot into the same candidate pool without architectural changes.

**Instagram as identity signal.** For entities where Instagram is the primary or only merchant-authored presence, there may be a future case for Instagram signals contributing to identity line assembly. Not now.

## 12. Implementation Phases

### Phase 0 — Plumbing (DONE)
- ✅ `instagram_accounts`, `instagram_media`, `instagram_insight_snapshots` tables in schema
- ✅ `ingest-instagram.ts` script operational (Business Discovery, batch, /me modes)
- ✅ API credentials configured (never-expiring Page Access Token + IG User ID)
- ✅ `merchant_surfaces` has 90 instagram surface records across ~70 entities
- ✅ API route returns instagram handle; place page renders instagram link

### Phase 1 — Data Quality & First Real Ingest
- Backfill `entities.instagram` from `merchant_surfaces` (extract handles from ~90 URLs)
- Validate handles against Business Discovery API, flag unresolvable
- Fix known bad data (literal `"null"`, full URLs instead of handles)
- Run first real `--batch` ingest (populate `instagram_accounts` + `instagram_media`)
- Data review: caption length distribution, posting cadence, signal density across merchant types

### Phase 2 — Caption Signal Extraction
- Build caption extraction job (evergreen signals → `language_signals`)
- Wire extracted signals into Stage 5 (identity signal extraction) as supplemental input
- Define signal taxonomy: cuisine markers, producer mentions, philosophy language, dish names
- Handle bilingual content (significant Spanish-language caption presence in current data)

### Phase 3 — Temporal Signals
- Create `instagram_temporal_signals` table (new — only table not yet in schema)
- Build temporal extraction job (closures, events, hours changes, special menus)
- Build expiry sweep job (`is_expired` flag management)
- Capture-only — no display UI yet

### Phase 4 — Photo Candidate Pipeline
- Score `instagram_media` for display candidacy (`is_display_candidate`)
- Integrate into unified photo candidate pool alongside Google photos
- Source metadata preserved for TRACES rendering decisions

### Phase 5 — Interpretation Layer Wiring
- Audit hardcoded source assumptions in SceneSense, ABOUT synthesis, confidence scoring
- Wire Instagram signals into confidence model as corroborating source
- Caption register awareness for ABOUT synthesis (Instagram tone ≠ website tone)

### Phase 6 — Contextual Display
- Design temporal signal display UI
- Define minimum confidence thresholds for surfacing closures/events
- Product decision: Instagram vs. Google hours conflict resolution

## 13. Open Questions

### Data review (partially answered 2026-03-13)

- ✅ **What does the actual Instagram data look like?** — See Section 3. Three accounts resolved: Brothers Cousins (209 posts, 61K followers), Tacos El Toro (929 posts, 33K followers), Tacos Pasadita (30 posts, 2.9K followers). Small sample skewed toward taco trucks. Broader data review needed after Phase 1 handle backfill.
- ✅ **Is `merchant_surface` built and wired?** — Yes. 90 instagram surface records exist across ~70 entities. Surface types: homepage (115), about (89), instagram (90), contact (84), menu (74), reservation (10), drinks (4).
- ⏳ What percentage of merchants have active accounts vs dormant vs none? (Needs Phase 1 backfill first)
- ⏳ What is the average caption length and quality across the full set?
- ⏳ How many posts per week across the corpus?
- ⏳ What percentage of captions have extractable signals vs noise?

### Engineering discoveries

- ✅ **Is `merchant_surface` built and wired to entities?** — Yes. Resolved.
- Which interpretation features have hardcoded source assumptions that need refactoring before Instagram signals can flow in cleanly?
- How does the existing Google photo pipeline work and how cleanly can Instagram photos be added to it?
- What is the current confidence scoring model and where does source weighting live?

### Product decisions

- What is the fetch cadence for active vs inactive accounts?
- What is the TTL for temporal signals?
- When does contextual display activate — what is the minimum signal confidence to surface a closure or event on the place page?
- Does the References section need to acknowledge Instagram as a source?
- How do we handle cases where Instagram signals contradict existing entity data — who wins?

### Cost decisions

- What is the fetch cost across the full merchant set at various cadences?
- What does visual analysis cost per image and what is the break-even on display candidates only?
- What is the storage growth rate at current merchant set size and at projected scale?

### Identity resolution

- What happens to Instagram accounts that cannot be matched to an entity?
- Is there a review queue for unmatched accounts or do they sit in `source_status = unmatched` indefinitely?

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-13 | Initial implementation doc from planning session | Bobby / Claude |
| 0.2 | 2026-03-13 | Added current state (Section 3), implementation phases (Section 12), answered open questions from data review, renumbered sections | Bobby / Claude |
