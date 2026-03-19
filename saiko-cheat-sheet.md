# Saiko / Traces — Call Cheat Sheet

## Call: Simon Frid (shiptight.app)

**Who:** Simon Frid. Cornell-trained engineer (BS Biological Engineering, MEng Biomedical). Infrastructure-minded founder-operator. Currently Engineering Manager at Gauntlet (DeFi/financial infrastructure at multi-billion dollar scale — owns their vault protocol "Aera"). Previously founded R2, an enterprise legal/compliance platform used by a major global bank. Runs Fridiculous Ventures (his own consulting practice). Earlier: Gigster (devops/cloud/architecture), RentPath (data insights). GitHub: fridiculous. Active in quantified self / wearable data.

**What he'll likely appreciate hearing about:** The systems architecture and data discipline — layer separation, confidence scoring, enrichment pipelines, provenance as a first-class concept. He builds infrastructure for a living, so lead with the engineering decisions, not just the product surface.

**Angles that could resonate:**
- You built a multi-source confidence system that tracks which source "wins" each field — similar to how financial systems reconcile conflicting data
- Enrichment pipelines are idempotent, retry-safe, stage-aware — infrastructure-grade patterns applied to cultural data
- Human-in-the-loop by design: AI proposes, human approves. Provenance is auditable and enforced, not decorative
- Fields v2 migration is basically building a canonical entity state system with sanction conflicts — he'd understand this from compliance/financial infra

**ShipTight (shiptight.app):** Currently in limited alpha. AI-powered QA tool. You give it a URL, it crawls the page, captures screenshots, collects console/network errors, then uses AI vision to analyze for visual bugs, layout issues, broken images. Findings get deduplicated and auto-filed into your project tracker (Linear, Jira, GitHub, Asana, Slack, Airtable). Three analysis tiers: Quick, Standard, Deep.

**In short:** It's automated visual QA — find bugs before your users do.

**Overlap / common ground with Saiko:**
- Both products use AI to crawl, analyze, and structure messy real-world inputs (he crawls websites for bugs, you crawl merchant sites for enrichment signals)
- Both care about confidence/severity — his bugs get severity ratings, your fields get confidence scores
- Both auto-file structured outputs from unstructured inputs (he files into Linear, you write signals into canonical state)
- Both have tiered analysis depth (his Quick/Standard/Deep, your SKAI short/standard/detailed)
- Both are solo-founder infrastructure plays using AI vision + crawling as core primitives

**Conversation starters:**
- "ShipTight looks sharp — how are you handling deduplication across crawls? That's a problem I deal with on the data side too." (natural bridge to your confidence/dedup systems)
- "Are you using vision models for the screenshot analysis? I've been using Claude for content extraction from merchant sites — curious what you're seeing on the vision side."
- "How'd you land on the three-tier analysis model? I built something similar for our knowledge system."
- "What's the path from alpha to GA look like for you?" (good founder-to-founder question)

---

## One-Liner

A curated cultural place-data platform that combines human editorial judgment with AI-powered enrichment to build a durable, high-trust system of record for places worth knowing about.

---

## The Two Layers

**Data Layer (includes Fields)** — The system of record and all the infrastructure that supports it. Canonical place identity, structured facts, confidence scores, provenance, signals. Fields lives here too — it's the part of the data layer that transforms raw data into stable, typed contracts any product surface can consume. Enrichment orchestration, data access patterns, platform APIs. Everything downstream reads from this layer.

**Traces** — The consumer product built on top. What people actually see and interact with. Place pages, maps, the magazine-style "Field Notes" experience. Reads from data layer contracts, never from raw tables.

---

## SKAI (Knowledge Chatbot)

An AI-powered internal knowledge system. Full-text search over chunked documentation (85+ docs covering architecture, schema, enrichment ops, product policy). Two modes: "answer" (direct, disciplined) and "learn" (teaching-focused). Three depth levels. Backed by Claude, with citation tracking showing which docs informed each answer. Useful for onboarding, quick lookups, and staying aligned on system decisions.

---

## Place Ingestion & Identity

**How places get in:** Bobby adds them. Always. AI researches and generates CSVs as suggestions, but a human approval step (`npm run ingest:csv`) is required. Provenance is tracked — every place has a record of who added it, from what source, and when.

**Identity anchors:** Google Place ID (GPID) is the primary key for matching to external data. Semi-automated matching queue with human approval for ambiguous cases. Slugs for URLs. Parent/child hierarchy for multi-location concepts.

**Deduplication:** Fuzzy string matching, duplicate scanning, merge tooling. Keeps the dataset clean without losing data.

---

## Confidence & Signals

**Field-level confidence scoring.** Each field (name, address, phone, website, hours, description) gets a 0–1 score based on source agreement. Multiple sources agree? Score goes up. Sources conflict? Score drops, conflicts are flagged. A "winner" source is determined per field.

**Source registry** with trust tiers — Google, editorial, chef recommendations, etc. Each source has a known reliability weight.

**Offering signals** — Structured boolean flags and derived attributes: serves wine, serves beer, vegetarian options, service model, price tier, wine program intent. Extracted from menus, websites, and Google data.

**Menu signals** — AI-analyzed menu structure: categories, signature items, price tier, cuisine indicators, seasonality.

**Wine list signals** — AI-analyzed wine programs: size, styles, regions, producers, price range.

---

## Enrichment Pipelines

**Automated (no human needed):**
- Google Places enrichment (address, coords, neighborhood, phone, hours, website)
- Neighborhood reverse lookup from lat/lng

**Semi-automated (system proposes, human confirms):**
- GPID matching queue
- Instagram handle discovery
- Photo fetch & tier evaluation

**Voice Engine v1.1** — AI-generated taglines. Four candidates per place using distinct patterns: food-forward, neighborhood-anchor, vibe-check, local-authority. Tone is cool, confident, deadpan — states quality as fact. Uses curated vocabulary with banned-word filtering.

**Website enrichment** — Crawls merchant sites to extract about copy, operator names, category signals, menu/wine list URLs. Idempotent, retry-safe, provenance-preserving.

**SceneSense** — AI-generated atmosphere descriptors (atmosphere, energy, scene tags). Includes Place Readiness Level (PRL, 1–10) indicating how enriched a place is.

---

## The Consumer Experience (Traces)

**Field Notes template** — Magazine-quality place presentation. Three views:

1. **Cover Map** — Custom-styled Google Map with hydrology-inspired aesthetic (cool gray-blue palette). Smart bounds using IQR outlier detection so the map zooms tight on the core cluster. Uniform pins, no labels, decorative compass rose.

2. **List View** — Vertical feed of place cards. Hero photos, AI-generated taglines, vibe tags, tips. Metadata: category, price, cuisine, neighborhood. Curator descriptors. Parchment/charcoal palette, Libre Baskerville typography.

3. **Expanded Map** — Full-screen interactive map with marker clustering, labeled pins, horizontal card carousel. Click a pin to scroll to its card, click a card to center the map.

---

## Smart Geography

**IQR outlier detection** — Calculates distance from centroid, uses interquartile range to identify geographic outliers, filters to core cluster for initial map bounds. Outliers still render, just outside the default viewport.

**Neighborhood aggregation** — Extracts and counts neighborhoods across places. Dynamic labeling.

**Marker clustering** — Groups nearby pins to prevent label soup. Custom styling matching the Field Notes aesthetic.

---

## Data Integrity & Provenance

**The rule:** AI cannot add places. AI processes places Bobby added.

Every place has provenance: who added it, source type (editorial, Google saves, chef rec, video, personal), source URL, date, notes. Auditable at any time. Fails if orphan places or AI-added places are detected.

---

## What's Next: Fields v2

Migration from current flat entity table to a canonical entity state architecture. Observed claims → canonical state → derived signals → product. Source registry + sanction conflicts for tracking which source wins each field. Phased rollout with safety snapshots at each step.

---

## Tech Stack (plain English)

**Next.js 16** — The framework the whole app runs on. It handles both the website people see and the backend logic (APIs, data fetching) in one codebase. "Next.js" is the industry-standard React framework — used by everyone from Netflix to Notion. Version 16 is current.

**React 19** — The UI library. It's what renders every page, every card, every map interaction. React is the dominant way to build web interfaces. Version 19 is the latest.

**TypeScript** — JavaScript but with strict type safety. Every piece of data flowing through the system has a defined shape — a place has a name (string), a confidence score (number), hours (structured object). Catches bugs before they happen. This matters because the whole confidence and contract system depends on data having predictable structure.

**PostgreSQL** — The database. Open-source, battle-tested, used by basically every serious startup. All place data, signals, confidence scores, provenance records, knowledge chunks — it all lives here.

**Prisma ORM** — The layer between the app code and the database. Instead of writing raw SQL queries, Prisma lets you interact with the database using TypeScript. It also manages schema migrations (when the database structure changes). Think of it as the translator between the app and PostgreSQL.

**Anthropic Claude API** — The AI. Powers SKAI (knowledge chatbot), Voice Engine (tagline generation), menu/wine list signal analysis, SceneSense (atmosphere tags), and website content extraction. We use Haiku (fast/cheap model) for high-volume enrichment and Sonnet/Opus for heavier reasoning tasks.

**Google Maps / Places APIs** — Two things: (1) the actual maps you see in the product (styled, interactive), and (2) the Places API which is how we pull structured data about a venue — address, hours, phone, photos, types, coordinates. GPID (Google Place ID) is the identity anchor that ties our records to Google's.

**Vercel** — Where the app is deployed and hosted. Built by the same team that makes Next.js, so the integration is seamless. Handles scaling, SSL, edge caching, preview deployments. Push code → it's live.

**Vitest** — The testing framework. Runs automated tests to verify things work correctly after changes.

**250+ scripts** — Operational tooling. Node.js scripts that run enrichment pipelines, data imports, audits, duplicate scanning, backfills. This is the "ops layer" — the machinery that keeps data quality high without manual work.

**If Simon asks "why this stack?"** — It's a modern, mainstream stack optimized for a single developer moving fast with high quality. Next.js + Vercel means zero infrastructure management. TypeScript + Prisma means strong contracts from database to UI. Claude API means AI enrichment without training models. The whole thing is designed so one person can operate a system that would normally require a team.

---

## Philosophy (if it comes up)

- Quality over coverage — intentional curation, not comprehensive world mapping
- Human editorial control with AI augmentation
- Strict layer discipline — no shortcuts across boundaries
- Reversibility — every change preserves a rollback path
- Provenance and confidence as first-class concepts, not afterthoughts
