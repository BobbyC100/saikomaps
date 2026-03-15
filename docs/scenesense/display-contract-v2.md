---
doc_id: SS-DISPLAY-CONTRACT-V2
doc_type: domain-spec
status: active
owner: Bobby Ciccaglione
created: '2026-03-14'
last_updated: '2026-03-14'
project_id: TRACES
systems:
  - scenesense
  - place-pages
  - voice-engine
supersedes:
  - SS-DISPLAY-CONTRACT-V1
summary: >-
  SceneSense Display Contract v2 — three-lens model (Atmosphere/Energy/Scene),
  Ambiance surface retired, signal redistribution defined, PRL gating preserved,
  and updated output shape aligned to the revised framework.
related_docs:
  - docs/scenesense/display-contract-v1.md
  - docs/voice/saiko-voice-layer.md
  - docs/ENERGY_SCORE_SPEC.md
  - docs/FORMALITY_SCORE_SPEC.md
category: product
tags: [scenesense, ui, signals]
source: repo
---
# SS-DISPLAY-CONTRACT-V2 — SceneSense Display Contract v2

**Document ID:** SS-DISPLAY-CONTRACT-V2
**Title:** SceneSense Display Contract v2
**System:** TRACES / SceneSense
**Layer:** Product Interpretation / UI Rendering
**Status:** Active — supersedes SS-DISPLAY-CONTRACT-V1
**Owner:** Saiko
**Purpose:** Define the three-lens output shape, retire the Ambiance surface, document signal redistribution, and update UI rendering obligations.

---

## 1. What Changed from v1

| Area | v1 | v2 |
|------|----|----|
| Surface count | 3 (Atmosphere, Ambiance, Scene) | 3 (Atmosphere, Energy, Scene) |
| Ambiance | Active surface | **Retired** — signals redistributed |
| Formality | Ambiance surface | Scene lens |
| Social register (relaxed/polished/unpretentious) | Ambiance surface | Scene lens |
| Service model | Ambiance surface | **Programs layer** (not SceneSense) |
| Activity/energy tokens | Atmosphere surface | Energy lens (dedicated) |
| Physical room signals | Atmosphere surface | Atmosphere lens (stays) |
| Price tier | Not in SceneSense | **Programs layer** (not SceneSense) |

**Migration note:** The `VoiceOutput` type changes from `{ atmosphere, ambiance, scene }` to `{ atmosphere, energy, scene }`. The `ambiance` key is removed.

---

## 2. Three-Lens Model

SceneSense interprets a place through three orthogonal lenses:

| Lens | Question it answers | Signal domain |
|------|-------------------|---------------|
| **Atmosphere** | What does it feel like physically? | Lighting, noise, density, seating, room character |
| **Energy** | How stimulating is the environment? | Activity level, temporal rhythm, crowd intensity, tempo |
| **Scene** | Who is it for and how do people behave? | Social roles, formality, social register, context |

Each lens produces an array of short label strings. The UI renders these as tags, pills, or inline copy.

**Not SceneSense (belongs to Programs layer):**
- Service model (full service, counter service, bar service)
- Price tier
- These may inform SceneSense interpretation but are not lens signals

---

## 3. System Boundary

| Layer | Responsibility | Does not own |
|---|---|---|
| Fields / derived_signals | Raw signal storage (identity_signals, energy_scores, offering_programs) | Rendered copy |
| SceneSense engine | Signal interpretation, lens routing, copy generation, lint pass | Data storage, PRL decisions |
| PRL engine | Gating — decides whether SceneSense runs and at what depth | Copy content |
| Programs layer | Service model, price tier, offering signals | SceneSense copy |
| UI | Rendering VoiceOutput surfaces as tags/pills/copy | Signal logic |

---

## 4. PRL Gate (Unchanged from v1)

| PRL | SceneSense runs | Mode | Max items per surface |
|---|---|---|---|
| 1 | No | — | — |
| 2 | No | — | — |
| 3 | Yes | `LITE` | 2 |
| 4 | Yes | `FULL` | 4 |

When `prl < 3`, the assembly returns `scenesense: null`. The UI must render nothing for SceneSense surfaces.

---

## 5. Output Shape

```typescript
type VoiceOutput = {
  atmosphere: string[];   // physical room character
  energy:     string[];   // activity level + temporal rhythm
  scene:      string[];   // social roles + formality + context
};
```

Each array is pre-capped by the engine (2 items for LITE, 4 for FULL). The UI renders the array as-is.

**Breaking change from v1:** `ambiance` key removed, `energy` key added.

---

## 6. Surface Contracts

### 6.1 Atmosphere — Physical Room Character

Source: `identity_signals` physical dimensions.

| Dimension | Tokens → Labels |
|---|---|
| Lighting | `DIM` → Dim · `WARM` → Warm-lit · `BRIGHT` → Bright |
| Noise | `LOUD` → Loud · `CONVERSATIONAL` → Conversational · `QUIET` → Quiet |
| Density | `TIGHT` → Tight room · `AIRY` → Airy · `PACKED` → Packed |
| Seating (first only) | `BAR_FORWARD` → Bar-forward · `PATIO_FRIENDLY` → Patio-friendly |

**Confidence floor:** `confidence.atmosphere ≥ 0.45`.

**What moved out:** Energy tokens (BUZZY, CHILL, LIVELY, etc.) moved to the Energy lens.

---

### 6.2 Energy — Activity Level & Temporal Rhythm

Source: `identity_signals.language_signals` → energy tokens; popular-times data; tempo signals.

**Energy tokens (from language signals):**

| Engine token | Rendered label |
|---|---|
| `BUZZY` | Buzzy |
| `CHILL` | Chill |
| `LIVELY` | Lively |
| `LOW_KEY` | Low-key |
| `CALM` | Calm |
| `STEADY` | Steady |
| `ELECTRIC` | Electric _(FULL mode only)_ |

**Additional energy strings (engine-generated):**

| Condition | Example output |
|---|---|
| FULL + energy confidence ≥ 0.65 + early/late variants differ | `Lively early evening · Chill late` |
| Busy window present + FULL + confidence ≥ 0.75 + hours available | `Busiest: 7–9 PM` |
| Busy window present + LITE or confidence < 0.75 | `Typically busiest in the evening` |
| Tempo: `LINGER_FRIENDLY` | `Lingering-friendly` |
| Tempo: `QUICK_TURN` | `Quick-turn tables` |

**Confidence floor:** `confidence.energy ≥ 0.45`.

---

### 6.3 Scene — Social Patterns & Behavioral Register

Source: `identity_signals` → `roles`, `context`, `formality`, social register; `neighborhood` field.

**Roles (first only):**

| Token | Label |
|---|---|
| `DATE_FRIENDLY` | Date-friendly |
| `AFTER_WORK` | After-work |
| `GROUP_FRIENDLY` | Group-friendly |
| `SOLO_FRIENDLY` | Solo-friendly |

**Context (first only):**

| Token | Label |
|---|---|
| `NEIGHBORHOOD_STAPLE` | Neighborhood staple |
| `DESTINATION_LEANING` | Destination-leaning |

**Formality (moved from Ambiance):**

| Token | Label |
|---|---|
| `CASUAL` | Casual |
| `CASUAL_REFINED` | Casual-refined |
| `REFINED` | Refined |

**Social register (moved from Ambiance):**

| Token | Label |
|---|---|
| `RELAXED` | Relaxed |
| `POLISHED` | Polished |
| `UNPRETENTIOUS` | Unpretentious |

**Composite rule (FULL mode only, confidence ≥ 0.65):** If both formality and social register are present, they may merge as a single string — e.g. `Casual-refined · relaxed`. Only the composite is pushed.

**LITE fallback:** If fewer than 2 scene items, engine may append: `Easy repeat spot`.

**Confidence floor:** `confidence.scene ≥ 0.45`.

---

## 7. Signal Redistribution Reference

For agents and engineers migrating from v1 to v2:

| v1 Surface | Signal | v2 Destination | Rationale |
|---|---|---|---|
| Atmosphere | Energy tokens (BUZZY, CHILL, etc.) | **Energy** lens | Dedicated lens for activity/stimulation |
| Atmosphere | Physical room (lighting, noise, density) | **Atmosphere** lens | Stays — this is room character |
| Atmosphere | Tempo (LINGER_FRIENDLY, QUICK_TURN) | **Energy** lens | Tempo is about activity rhythm |
| Atmosphere | Busy windows | **Energy** lens | Crowd intensity is activity |
| Ambiance | Formality (CASUAL, REFINED, etc.) | **Scene** lens | Behavioral expectation |
| Ambiance | Social register (RELAXED, POLISHED, etc.) | **Scene** lens | Social behavioral constraint |
| Ambiance | Service model (FULL_SERVICE, etc.) | **Programs** (not SceneSense) | Operational attribute |
| Scene | Roles (DATE_FRIENDLY, etc.) | **Scene** lens | Stays |
| Scene | Context (NEIGHBORHOOD_STAPLE, etc.) | **Scene** lens | Stays |

---

## 8. Confidence Values (v2 defaults)

| Dimension | Has signals | Missing signals |
|---|---|---|
| `overall` | 0.6 | 0.6 |
| `atmosphere` | 0.7 (has physical signals) | 0.5 |
| `energy` | 0.8 (has language signals) | 0.6 |
| `scene` | 0.7 (has roles or formality) | 0.5 |

---

## 9. Lint Pass Guardrails (Unchanged from v1)

**Banned patterns:**

```
/locals/i  /tourist/i  /out-of-towner/i  /hipster/i  /influencer/i
/\bbest\b/i  /\bworst\b/i  /overrated/i  /\balways\b/i  /\bnever\b/i
```

**Exclusionary patterns (dropped):**

```
/(only for|not for|people like|not your crowd)/i
```

**Placement rules:**
- Busy window statements → Energy only
- Numeric time ranges → Energy only (FULL mode, confidence ≥ 0.75)
- Formality/register labels → Scene only

**Deduplication:** Exact matches across all surfaces are dropped.

---

## 10. UI Rendering Obligations

### Must render (contractual)

- [ ] `energy[0]` — primary energy/activity label (if present)
- [ ] `atmosphere[0]` — primary room character label (if present)
- [ ] `scene[0]` — primary role or formality label (if present)
- [ ] `scene` context — Neighborhood staple / Destination-leaning (if present)
- [ ] Empty state when `scenesense === null` (PRL < 3)
- [ ] Respect surface cap — never render more items than the array contains

### Must not do

- [ ] Do not read `identity_signals.language_signals` directly in the UI
- [ ] Do not render `ELECTRIC` label unless it arrives in the `energy` array
- [ ] Do not invent labels not returned by the engine
- [ ] Do not merge surfaces without explicit product sign-off
- [ ] Do not render service model or price tier as SceneSense (these belong to Programs)

### May defer (not blocking v2 launch)

- [ ] Time-aware energy variants (early evening / late)
- [ ] Busy window time ranges
- [ ] Full-mode composite scene string (formality + register)
- [ ] Tempo labels (Lingering-friendly, Quick-turn tables)

---

## 11. Migration Checklist

Code changes required to implement v2:

- [ ] Update `lib/scenesense/types.ts` — replace `ambiance` with `energy` in all type definitions
- [ ] Update `lib/scenesense/mappers.ts` — route energy tokens to `energy` (not `atmosphere`); route formality/register to `scene` (not `ambiance`)
- [ ] Update `lib/scenesense/voice-engine.ts` — generate `energy` surface instead of `ambiance`; move formality/register copy to `scene` surface
- [ ] Update `lib/scenesense/assembly.ts` — compute `energy` confidence separately from `atmosphere`
- [ ] Update `lib/scenesense/lint.ts` — update placement rules for new surface names
- [ ] Update `lib/contracts/place-page.ts` — change `PlacePageSceneSense` type
- [ ] Update `/api/places/[slug]/route.ts` — pass new shape
- [ ] Update `docs/scenesense/display-contract-v1.md` frontmatter — set `status: superseded`
- [ ] Run contract tests — verify drift detection catches the shape change
