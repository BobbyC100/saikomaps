---
doc_id: COVERAGE-EVIDENCE-NORMALIZATION-V1
doc_type: architecture
status: draft
title: "Coverage Evidence Normalization — Phase 5 Wiring Spec"
owner: Bobby Ciccaglione
created: "2026-03-22"
last_updated: "2026-03-22"
project_id: SAIKO
systems:
  - fields-data-layer
  - enrichment
  - interpretation
  - traces
related_docs:
  - docs/architecture/coverage-source-enrichment-v1.md
  - docs/architecture/enrichment-evidence-model-v1.md
  - docs/architecture/enrichment-strategy-v1.md
  - docs/architecture/derived-signals-engine-v1.md
  - docs/architecture/entity-page-content-system-v0.md
summary: >
  Defines the normalization layer that sits between raw coverage_source_extractions
  and the five downstream interpretation pipelines. Establishes source precedence
  rules, the facts-vs-interpretations boundary, multi-source deduplication, and
  the canonical coverage evidence contract that all downstream consumers read from.
  This is the Phase 5 wiring spec referenced in COVERAGE-SOURCE-ENRICHMENT-V1.
---

# Coverage Evidence Normalization — Phase 5 Wiring Spec

**SAIKO FIELDS · INTERNAL**

March 2026 · Draft

## Problem Statement

Phases 1–4 of the Coverage Source Enrichment pipeline are complete. We have
200+ sources fetched and extracted into `coverage_source_extractions`. Each
extraction contains rich structured data: people, food evidence, beverage
evidence, service evidence, atmosphere signals, origin stories, accolades,
and pull quotes.

Five downstream interpretation pipelines need this data:

1. Identity signals (`extract-identity-signals.ts`)
2. Offering programs (`assemble-offering-programs.ts`)
3. Voice descriptors / descriptions (`generate-descriptions-v1.ts`)
4. Taglines (`generate-taglines-v2.ts`)
5. SceneSense / PRL (`prl-materialize.ts`)

The risk: if each pipeline reads raw `coverage_source_extractions` directly
and makes its own decisions about merging, deduplication, conflict resolution,
and trust weighting, we get five slightly different interpretations of the
same evidence. That creates drift fast.

## Core Principle

> *Raw extraction is evidence. Normalized coverage signals are the canonical
> representation of what editorial sources collectively say about an entity.
> Downstream interpretation pipelines consume the normalized layer, never raw
> extractions directly.*

```
coverage_source_extractions (per-article raw evidence)
        ↓ normalized by
coverage evidence materializer (one function, one interpretation)
        ↓ produces
normalized coverage evidence (per-entity canonical shape)
        ↓ consumed by
identity signals, offering programs, descriptions, taglines, SceneSense
        ↓ produce
derived_signals / interpretation_cache (Saiko's conclusions)
        ↓ consumed by
product surfaces (place page, cards, maps)
```

---

## 1. The Normalization Layer

### What it is

A single typed function — `materializeCoverageEvidence(entityId)` — that:

1. Queries all current extractions for an entity
2. Merges evidence across multiple articles
3. Deduplicates and resolves conflicts using source precedence rules
4. Separates facts from interpretations
5. Returns a canonical `CoverageEvidence` object

This is NOT a new table. It is a materialization function that runs as the
first step of any downstream pipeline that needs coverage data. The output
is an in-memory typed contract, not a persisted intermediate.

### Why not a table?

Tables imply their own staleness management, migration burden, and cache
invalidation logic. The normalization function re-materializes from current
extractions on every pipeline run. Since extractions are versioned
(`is_current = true`), the normalization output is always fresh.

If performance becomes an issue (many entities, many sources), we can add a
caching layer later. Start with the function.

### Where it lives

```
lib/coverage/normalize-evidence.ts
```

Single module. No dependencies on pipeline-specific logic. Consumed by all
five downstream pipelines through a standard import.

---

## 2. The CoverageEvidence Contract

The normalized output is split into two sections: **facts** and
**interpretations**. This separation matters because facts can be stored
with provenance and staleness, while interpretations should be recomputed
by downstream pipelines.

```typescript
interface CoverageEvidence {
  entityId: string;
  sourceCount: number;
  materializedAt: Date;

  facts: CoverageFacts;
  interpretations: CoverageInterpretations;
  provenance: CoverageProvenance;
}
```

### Facts

Facts are things external sources state that can be verified or attributed.
They have provenance (which source said it, when).

```typescript
interface CoverageFacts {
  // Named people affiliated with this entity
  people: NormalizedPerson[];

  // Specific dishes, items, or menu elements mentioned
  dishes: NormalizedMention[];

  // Specific producers, purveyors, or sourcing mentioned
  producers: NormalizedMention[];

  // Accolades, awards, list inclusions
  accolades: NormalizedAccolade[];

  // Pull quotes (verbatim editorial language)
  pullQuotes: NormalizedPullQuote[];

  // Origin story — factual anchors (founding year, founder names, lineage)
  originStoryFacts: NormalizedOriginStoryFacts | null;

  // Origin story — editorial framing (tone, mythos, narrative archetype)
  originStoryInterpretation: NormalizedOriginStoryInterpretation | null;

  // Event/service facts explicitly stated
  eventCapabilities: {
    privateDining: { mentioned: boolean; evidence: string[] };
    groupDining: { mentioned: boolean; evidence: string[] };
    catering: { mentioned: boolean; evidence: string[] };
  };
}

interface NormalizedPerson {
  name: string;
  role: string;               // from controlled vocabulary
  isPrimary: boolean;
  sourceCount: number;         // how many articles mention this person
  mostRecentSource: string;    // publication name
  mostRecentDate: Date | null; // most recent article date
  stalenessBand: 'current' | 'aging' | 'stale';
}

interface NormalizedMention {
  text: string;
  sourceCount: number;
  sources: string[];           // publication names
}

interface NormalizedAccolade {
  name: string;
  type: 'list' | 'award' | 'star' | 'nomination' | 'recognition';
  source: string | null;
  year: number | null;
  sourceCount: number;
}

interface NormalizedPullQuote {
  text: string;
  publication: string;
  articleTitle: string | null;
  publishedAt: Date | null;
  relevanceScore: number;
}

interface NormalizedOriginStoryFacts {
  foundingYear: string | null;      // only if explicitly stated
  founderNames: string[];           // only if explicitly stated
  geographicOrigin: string | null;  // only if explicitly stated
  lineage: string | null;           // inherited-from / inspired-by
  sourceCount: number;
}

interface NormalizedOriginStoryInterpretation {
  archetype: string | null;         // chef-journey, family-legacy, etc.
  tone: string | null;              // reverential, scrappy, mythic, matter-of-fact
  narrative: string | null;         // editorial framing summary
  labels: string[];                 // "legacy institution," "chef-driven," "humble neighborhood spot"
  sourceCount: number;
  consensus: 'unanimous' | 'majority' | 'conflicting';
}
```

### Interpretations

Interpretations are editorial characterizations that downstream pipelines
use as input signals, not as final values. They are aggregated across
sources and carry confidence based on source agreement.

```typescript
interface CoverageInterpretations {
  // Food signals aggregated across sources
  food: {
    cuisinePosture: string | null;
    cuisinePostureAgreement: number;  // 0-1: how many sources agree
    cookingApproaches: string[];      // union across sources
    menuFormats: string[];            // union across sources
    specialtySignals: {
      sushi: boolean;
      ramen: boolean;
      taco: boolean;
      pizza: boolean;
      dumpling: boolean;
    };
  };

  // Beverage signals aggregated
  beverage: {
    wine: { mentioned: boolean; naturalFocus: boolean; listDepth: string | null; sommelierMentioned: boolean };
    cocktail: { mentioned: boolean; programExists: boolean };
    beer: { mentioned: boolean; craftSelection: boolean };
    nonAlcoholic: { mentioned: boolean; zeroproof: boolean };
    coffeeTea: { mentioned: boolean; specialtyProgram: boolean };
  };

  // Service signals aggregated
  service: {
    serviceModel: string | null;
    reservationPosture: string | null;
    diningFormats: string[];
  };

  // Atmosphere aggregated
  atmosphere: {
    descriptors: string[];         // union, deduplicated
    energyLevel: string | null;    // majority vote across sources
    formality: string | null;      // majority vote across sources
  };

  // Editorial sentiment
  sentiment: {
    dominant: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
    distribution: Record<string, number>;  // count per sentiment
  };
}
```

### Provenance

Provenance tracks which sources contributed and their trust characteristics.
Downstream pipelines use this for confidence weighting.

```typescript
interface CoverageProvenance {
  // All contributing sources
  sources: {
    publicationName: string;
    url: string;
    articleType: string;
    publishedAt: Date | null;
    relevanceScore: number;
    trustTier: 1 | 2 | 3;           // from approved source registry
  }[];

  // Aggregate metrics
  totalSources: number;
  tier1Sources: number;
  tier2Sources: number;
  tier3Sources: number;
  oldestSource: Date | null;
  newestSource: Date | null;
  medianRelevance: number;
}
```

---

## 3. Source Precedence Rules

When coverage evidence conflicts with other data sources, these rules
determine which source wins.

### Merchant-authored vs. editorial

| Data type | Merchant wins | Coverage wins | Notes |
|-----------|--------------|---------------|-------|
| Business name | ✓ | | Self-described identity |
| Address | ✓ | | Self-described location |
| Phone | ✓ | | Self-described contact |
| Hours | ✓ | | Operational fact |
| Menu items / dishes | ✓ (current) | ✓ (historical context) | Menu is authoritative for current state; coverage adds historical texture |
| Chef / operator name | ✓ (current staff) | ✓ (supporting evidence) | See people precedence rules below |
| Cuisine characterization | | ✓ | Editorial framing is coverage's strength |
| Atmosphere / vibe | | ✓ | Subjective but editorially grounded |
| Accolades / recognition | | ✓ | Definitionally external |
| Price tier | Tie | Tie | Both valid; coverage can supplement |
| Origin story (facts) | ✓ (founding year, founders) | ✓ (supplemental) | Merchant for self-stated facts; coverage adds lineage/context |
| Origin story (interpretation) | | ✓ | Editorial framing, mythos, archetype |
| Wine program characterization | ✓ (wine list) | ✓ (editorial framing) | Wine list is fact; "natural wine focus" is interpretation |

### Coverage vs. Google / platform data

| Data type | Google wins | Coverage wins | Notes |
|-----------|-----------|---------------|-------|
| GPID / coordinates | ✓ | | Structural identity |
| Business status | ✓ | | Operational fact |
| Photos | ✓ | | Google has photos; coverage has descriptions |
| Category | | ✓ | Google categories are generic; coverage is specific |
| Popularity signals | ✓ | | Google review count is direct signal |
| Quality / taste signals | | ✓ | Editorial judgment, not crowd rating |

### Coverage vs. existing derived signals

When coverage evidence updates a field that already has a derived signal
value:

- **Coverage supplements, does not silently overwrite.** The downstream
  pipeline receives both the existing signal and the coverage evidence
  and makes the merge decision.
- **Exception:** If existing signal was computed without coverage data
  (pre-Phase 5), and coverage evidence is high-confidence (relevance ≥ 0.6,
  Tier 1 source), the pipeline may treat coverage as an upgrade.
- **People data:** Coverage-sourced people are always candidates, never
  auto-promoted. The actor system has its own review gate.

### Multi-source conflict resolution

When multiple coverage articles disagree:

| Strategy | When to use | Example |
|----------|------------|---------|
| **Recency wins** | Factual claims that change over time | Chef name, hours, menu items |
| **Majority vote** | Characterizations with subjective range | Atmosphere (3 say "lively", 1 says "intimate" → "lively") |
| **Union** | Accumulative facts | Dishes mentioned, cooking approaches, accolades |
| **Highest-tier wins** | Conflicting qualitative claims | Tier 1 says "seafood-focused", Tier 3 says "Italian" → "seafood-focused" |
| **Flag as conflicting** | Irreconcilable disagreement | Origin story: one says family, another says chef-journey → mark `consensus: 'conflicting'` |

### Staleness rules for people data

People data ages badly. A 2022 article naming a chef is not reliable in 2026.

| Source age | Staleness band | Downstream behavior |
|-----------|----------------|---------------------|
| < 12 months | `current` | Full confidence; use in descriptions and identity |
| 12–24 months | `aging` | Use with caveat; do not feature prominently |
| > 24 months | `stale` | Candidate only; do not surface unless confirmed by another source |

### People precedence — conditional rules

People data (chef, sommelier, operator, owner) is the fastest-aging data
in Saiko. Simple "coverage wins" is insufficient. The precedence is
conditional:

1. **Merchant-authored source wins for currently-present staff** when
   available. If the entity's own website names a chef or sommelier, that
   is the strongest signal for current state.

2. **Coverage is valid supporting evidence** for people identity and role.
   It can confirm, enrich, or add context to merchant-sourced names.

3. **Older coverage must not silently overwrite fresher merchant-authored
   staff info.** A 2023 article naming a chef does not override the
   entity's 2025 website naming a different chef.

4. **When role/date confidence is weak, treat as attributed evidence,
   not canonical fact.** If the extraction cannot confidently date the
   article or the role is ambiguous, the person entry carries a confidence
   caveat and is not promoted to canonical status.

### Normalizer conflict resolution behavior

Even in v1, the normalizer must define what happens when sources disagree.
The two default strategies are:

**For facts: best-source-first with provenance retained.**
The highest-confidence source (based on trust tier, relevance score, and
recency) determines the canonical value. Alternative claims from other
sources are preserved in provenance so downstream pipelines can inspect
the full picture. This means a Tier 1 source from 2025 beats a Tier 3
source from 2024 for factual claims, but the Tier 3 claim is not
discarded — it is retained as an alternate.

**For interpretations: union-with-confidence.**
Atmosphere, editorial framing, and sentiment benefit from plurality. All
normalized interpretive evidence is included with source attribution and
confidence scoring. Downstream pipelines apply their own filters (e.g.,
majority vote for atmosphere energy level, union for descriptors). This
preserves the richness of editorial perspective without forcing premature
collapse.

---

## 4. How Downstream Pipelines Consume

Each pipeline imports `materializeCoverageEvidence` and receives the same
typed contract. What they do with it differs.

### Identity Signals

**Currently reads:** menu text, wine list text, about copy from website
scrapes.

**Adds from coverage:**
- `facts.people` → informs `place_personality` (chef-driven vs neighborhood)
- `facts.originStoryFacts` → founding year, founders, lineage anchor identity
- `facts.originStoryInterpretation` → archetype maps to `origin_story_type`
- `interpretations.food.cuisinePosture` → cross-validates website-derived posture
- `interpretations.food.specialtySignals` → supplements menu-derived signals
- `provenance.tier1Sources > 0` → confidence boost

**Integration pattern:** The extraction prompt receives an optional
`coverageContext` section appended to the existing menu/wine/about inputs.
Coverage signals are labeled as editorial evidence, not authoritative fact.

### Offering Programs

**Currently reads:** menu_identity, menu_structure, identity_signals (all
derived_signals).

**Adds from coverage:**
- `interpretations.food.specialtySignals` → direct evidence for specialty
  programs (taco_program, pizza_program, etc.)
- `interpretations.beverage.*` → evidence for wine/cocktail/beer/NA/coffee programs
- `facts.eventCapabilities.*` → evidence for private_dining, group_dining,
  catering programs
- `facts.people` (sommelier/beverage_director presence) → wine_program
  confidence boost

**Integration pattern:** `assembleOfferingPrograms` receives
`CoverageEvidence` as an optional fourth signal source alongside
menu_identity, menu_structure, and identity_signals. When menu data is
absent (common for newer entities), coverage evidence becomes the primary
signal for program maturity assessment.

### Voice Descriptor / Description (Tier 3)

**Currently reads:** merchant surface artifacts + identity signals. The
Tier 3 prompt already accepts an optional `coverageSources` parameter.

**Adds from coverage:**
- `facts.pullQuotes` → factual grounding with attribution
- `facts.originStoryFacts` → factual anchors (founding year, founders)
- `facts.originStoryInterpretation` → narrative texture for origin-based descriptions
- `facts.accolades` → credibility signals ("Michelin-noted", "Eater 38")
- `facts.people` (current band only) → name the chef/owner when appropriate

**Integration pattern:** The existing `buildAboutComposeUserPrompt`
function's `coverageSources` parameter is replaced with the richer
`CoverageEvidence.facts` object. The prompt is updated to use pull quotes
and origin stories as grounding material.

### Tagline Generation

**Currently reads:** identity signals (personality, cuisine posture,
signature dishes, origin story type).

**Adds from coverage:**
- `facts.people` (current band, primary role) → authority taglines that name people
- `facts.accolades` → LOCAL_AUTHORITY pattern selection signal
- `facts.originStoryInterpretation.archetype` → confirm origin_story_type from identity signals

**Integration pattern:** Lightest touch. Tagline input builder receives
an optional `coverageHighlights` object with at most 3 fields. Coverage
does not change the tagline generation logic — it enriches the input
signals that the existing patterns already use.

### SceneSense / PRL

**Currently reads:** photo eval, energy scores, tag scores, coverage
source count.

**Adds from coverage:**
- `interpretations.atmosphere.descriptors` → direct scene/vibe signals
- `interpretations.atmosphere.energyLevel` → energy classification
- `interpretations.atmosphere.formality` → formality signal
- `interpretations.sentiment.dominant` → editorial trust weighting
- `provenance.totalSources` → replaces simple count with richer metric

**Integration pattern:** `materializePRL` receives `CoverageEvidence`
alongside existing inputs. Atmosphere descriptors feed directly into scene
tag computation. Sentiment and source count influence PRL tier confidence.

---

## 5. Implementation Sequence

Each step is additive and independently verifiable. No step depends on
later steps to be useful.

### Step 1: Build normalization function

- Create `lib/coverage/normalize-evidence.ts`
- Implement `materializeCoverageEvidence(entityId): CoverageEvidence`
- Implement multi-source merging, deduplication, conflict resolution
- Implement staleness bands for people
- Write unit tests against known extraction data

### Step 1.5: Validate normalizer output on known entities

Before wiring into any downstream pipeline, validate the normalizer
against a small curated set of 10–20 entities covering different data
shapes:

- Heavy coverage (5+ sources)
- Sparse coverage (1 source)
- Conflicting sources (chef name disagreement, origin story conflict)
- No menu data
- No merchant website
- Strong atmosphere signals
- Named chef/sommelier cases
- Stale-only coverage (all sources > 24 months)

For each entity, manually verify that the `CoverageEvidence` output
matches expected behavior: correct staleness bands, correct conflict
resolution, correct facts-vs-interpretations split, correct origin
story separation. This is a clean checkpoint before any pipeline
receives coverage data.

### Step 2: Wire into identity signals

- Update `extract-identity-signals.ts` to call `materializeCoverageEvidence`
- Add `coverageContext` section to extraction prompt
- Label coverage inputs as editorial evidence in prompt
- Re-run identity signal extraction across all entities
- Verify: identity signals should be richer for entities with coverage

### Step 3: Wire into offering programs

- Update `assemble-offering-programs.ts` to accept `CoverageEvidence`
- Add coverage-derived program evidence as fourth signal source
- Re-run offering program assembly
- Verify: programs should show non-unknown maturity for covered entities

### Step 4: Wire into descriptions

- Update `buildAboutComposeUserPrompt` to accept `CoverageEvidence.facts`
- Replace thin `coverageSources` parameter with richer facts object
- Re-run description generation for Tier 3 entities
- Verify: descriptions should include editorial grounding

### Step 5: Wire into taglines

- Update tagline input builder to accept `coverageHighlights`
- Re-run tagline generation
- Verify: taglines may reference people or accolades where appropriate

### Step 6: Wire into SceneSense

- Update `materializePRL` to accept `CoverageEvidence`
- Feed atmosphere descriptors into scene computation
- Re-run PRL materialization
- Verify: SceneSense should populate for entities with coverage

### Step 7: Update page data contract

- Define which new fields the place page API will serve
- Classify every page-facing field as one of:
  - **public-safe** — can be rendered directly to users
  - **provenance-backed** — rendered with attribution (e.g., "per Eater LA")
  - **optional/fallback** — displayed only when primary data is absent
  - **internal-only** — used for confidence/scoring but not rendered
- Specific fields requiring classification:
  - recognitions / accolades
  - map appearances
  - named people (chef, sommelier, owner)
  - editorial pull quotes
  - event URLs / capabilities
  - origin story elements
- Update API route to serve richer coverage data
- Update page component to render new data
- Ship to production

---

## 6. What This Does NOT Do

- Does not create new tables or migrations
- Does not change the extraction prompt or re-extract sources
- Does not auto-promote coverage-derived people to the actor system
- Does not change how coverage sources are discovered, fetched, or extracted
- Does not introduce any new AI calls in the normalization layer (pure logic)
- Does not change the place page layout or design system

---

## 7. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Five pipelines diverge in how they interpret coverage | Single normalization function; all read same contract |
| Coverage overwrites merchant truth | Source precedence rules; coverage supplements, does not overwrite |
| Stale people data surfaces on page | Staleness bands; stale people are candidates only |
| Multi-source conflicts produce noise | Conflict resolution strategies per data type |
| Performance (many sources per entity) | Materialization is lightweight; cache later if needed |
| Extraction quality varies by source | Relevance score and trust tier weighting in provenance |

---

## 8. Success Criteria

After Phase 5 is complete:

- Every entity with coverage sources has richer identity signals
- Offering programs show non-unknown maturity for covered entities
- Tier 3 descriptions include editorial grounding
- SceneSense populates for entities with atmosphere evidence
- The place page renders coverage-derived data (accolades, people, origin)
- No downstream pipeline reads raw `coverage_source_extractions` directly
- All coverage evidence flows through the normalization contract
