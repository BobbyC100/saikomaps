---
doc_id: SS-DISPLAY-CONTRACT-V1
doc_type: domain-spec
status: superseded
owner: Bobby Ciccaglione
created: '2026-03-10'
last_updated: '2026-03-10'
project_id: TRACES
systems:
  - scenesense
  - place-pages
  - voice-engine
summary: >-
  SceneSense display contract defining the output shape (atmosphere/ambiance/scene surfaces), PRL gating, signal routing from identity_signals to rendered labels, confidence floors, lint guardrails, and UI rendering obligations.
related_docs:
  - docs/voice/saiko-voice-layer.md
category: product
tags: [scenesense, ui, signals]
source: repo
---
# SKAI-DOC-SS-001 — SceneSense Display Contract v1

**Document ID:** SKAI-DOC-SS-001
**Title:** SceneSense Display Contract v1
**System:** TRACES / SceneSense
**Layer:** Product Interpretation / UI Rendering
**Status:** Active
**Owner:** Saiko
**Purpose:** Define the exact output shape SceneSense produces, how each surface is gated by PRL and mode, and what the UI is contractually required to render vs. what the engine may compute in future.

---

## 1. Overview

SceneSense is the interpretation layer between raw editorial signals and rendered UI copy. It does not store prose — it assembles short, deterministic label strings that the UI may render as tags, pills, or inline copy.

**Data flow:**

```
golden_records.identity_signals.language_signals
        ↓
  CanonicalSceneSense  (lib/scenesense/mappers.ts)
        ↓
  generateSceneSenseCopy  (lib/scenesense/voice-engine.ts)
        ↓
  lint pass  (lib/scenesense/lint.ts)
        ↓
  VoiceOutput  ←  this is what the UI receives
```

The UI receives a `VoiceOutput` object (or `null` for PRL < 3) and renders from that — it never reads raw signal fields directly.

---

## 2. System Boundary

| Layer | Responsibility | Does not own |
|---|---|---|
| Fields / golden_records | Raw signal storage (`identity_signals.language_signals`, `energy_scores`, `place_tag_scores`) | Rendered copy |
| SceneSense engine | Signal interpretation, lens routing, copy generation, lint pass | Data storage, PRL decisions |
| PRL engine | Gating — decides whether SceneSense runs and at what depth | Copy content |
| UI | Rendering VoiceOutput surfaces as tags/pills/copy | Signal logic |

---

## 3. PRL Gate

SceneSense output is gated by the **Place Readiness Level (PRL)** of each place.

| PRL | SceneSense runs | Mode | Max items per surface |
|---|---|---|---|
| 1 | No | — | — |
| 2 | No | — | — |
| 3 | Yes | `LITE` | 2 |
| 4 | Yes | `FULL` | 4 |

When `prl < 3`, the assembly returns `scenesense: null`. The UI must render nothing for SceneSense surfaces and must not fall back to raw signal fields.

---

## 4. Output Shape

```typescript
type VoiceOutput = {
  atmosphere: string[];   // energy character + physical room feel
  ambiance:   string[];   // formality + service register
  scene:      string[];   // roles + context
};
```

Each array is pre-capped by the engine (2 items for LITE, 4 for FULL). The UI renders the array as-is — it must not re-sort, filter, or cap further.

**Note:** There is no `vibe` surface. Energy character is part of `atmosphere`.

---

## 5. Surface Contract

### 5.1 Atmosphere

Source: `identity_signals.language_signals` → mapped to energy tokens → rendered as first atmosphere items. Physical signals from `identity_signals` (noise, lighting, density, seating) follow.

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

**Additional atmosphere strings (engine-generated):**

| Condition | Example output |
|---|---|
| FULL + atmosphere confidence ≥ 0.65 + early/late variants differ | `Lively early evening · Chill late` |
| Busy window present + FULL + confidence ≥ 0.75 + hours available | `Busiest: 7–9 PM` |
| Busy window present + LITE or confidence < 0.75 | `Typically busiest in the evening` |
| Tempo: `LINGER_FRIENDLY` | `Lingering-friendly` |
| Tempo: `QUICK_TURN` | `Quick-turn tables` |

**Physical room signals (identity_signals):**

| Dimension | Tokens → Labels |
|---|---|
| Lighting | `DIM` → Dim · `WARM` → Warm-lit · `BRIGHT` → Bright |
| Noise | `LOUD` → Loud · `CONVERSATIONAL` → Conversational · `QUIET` → Quiet |
| Density | `TIGHT` → Tight room · `AIRY` → Airy · `PACKED` → Packed |
| Seating (first only) | `BAR_FORWARD` → Bar-forward · `PATIO_FRIENDLY` → Patio-friendly |

**Confidence floor:** atmosphere items require `confidence.atmosphere ≥ 0.45`.

---

### 5.2 Ambiance

Source: `identity_signals` → `formality`, `service_model`, `comfort`.

| Dimension | Tokens → Labels |
|---|---|
| Formality | `CASUAL` → Casual · `CASUAL_REFINED` → Casual-refined · `REFINED` → Refined |
| Service | `FULL_SERVICE` → Full service · `COUNTER_SERVICE` → Counter service · `BAR_SERVICE` → Bar service |
| Comfort (first only) | `RELAXED` → Relaxed · `POLISHED` → Polished · `UNPRETENTIOUS` → Unpretentious |

**Composite rule (FULL mode only, `confidence.ambiance ≥ 0.65`):** If both formality and service are present, they are merged as a single string — e.g. `Casual-refined · counter service`. In this case only the composite string is pushed (not separate items).

**Confidence floor:** `confidence.ambiance ≥ 0.45`.

---

### 5.3 Scene

Source: `identity_signals` → `roles`, `context`; `neighborhood` field.

| Dimension | Tokens → Labels |
|---|---|
| Roles (first only) | `DATE_FRIENDLY` → Date-friendly · `AFTER_WORK` → After-work · `GROUP_FRIENDLY` → Group-friendly · `SOLO_FRIENDLY` → Solo-friendly |
| Context (first only) | `NEIGHBORHOOD_STAPLE` → Neighborhood staple · `DESTINATION_LEANING` → Destination-leaning |
| LITE fallback | If fewer than 2 scene items, engine may append: `Easy repeat spot` |

**Confidence floor:** `confidence.scene ≥ 0.45`.

---

## 6. Signal Routing — Language Signals

Raw phrases from `identity_signals.language_signals` are routed to the correct lens:

| Signal type | Example | Lens |
|---|---|---|
| Sensory energy | `cozy`, `lively` | Atmosphere |
| Energy character | `buzzy`, `electric` | Atmosphere |
| Intended mood | `date-night` | Ambiance |
| Cultural role | `industry hang`, `neighborhood spot` | Scene |

The raw signal is preserved in `identity_signals.language_signals`. SceneSense decides how each signal is rendered and on which surface.

---

## 7. Confidence Values (v1 defaults)

These are the baseline values computed at assembly time. Future versions may derive them per-signal from source quality.

| Dimension | Has signals | Missing signals |
|---|---|---|
| `overall` | 0.6 | 0.6 |
| `atmosphere` | 0.8 (has language signals) | 0.6 |
| `ambiance` | 0.6 | 0.6 |
| `scene` | 0.7 (has dishes) | 0.5 |

---

## 8. Lint Pass Guardrails

The lint pass runs after copy generation and before the result is returned. It may:

- Drop individual strings that match the **banned pattern list** (see below)
- Set status `FAIL` + action `DROP_ALL_SCENESENSE` → assembly returns `scenesense: null`

**Banned patterns (applied to every string):**

```
/locals/i  /tourist/i  /out-of-towner/i  /hipster/i  /influencer/i
/\bbest\b/i  /\bworst\b/i  /overrated/i  /\balways\b/i  /\bnever\b/i
```

The UI must never hard-code workarounds for these. If the engine returns `null`, the surface is empty.

---

## 9. What the UI Must Render

The following are **required display obligations** when `VoiceOutput` is non-null:

| Surface | Obligation |
|---|---|
| `atmosphere[0]` | Must render the primary energy/room label if present |
| `scene` roles | Must render if present — they are the primary "who is this for" signal |
| `scene` context | Must render if present — Neighborhood staple / Destination-leaning governs card positioning |
| Null guard | If `scenesense === null`, render nothing — do not fall back to raw `identity_signals` or `language_signals` directly |
| Array as-is | Render surfaces in the order returned — do not re-sort by "relevance" |

---

## 10. What the Engine May Compute Later (Not Yet Required)

These capabilities exist in the type system but are not guaranteed to be populated in v1. The UI must handle empty arrays gracefully.

| Capability | Status | Notes |
|---|---|---|
| `atmosphere.energy_time_variants` (early/late) | Engine-computed when available | Only emitted in FULL mode with confidence ≥ 0.65 |
| `atmosphere.busy_windows` (hour ranges) | Engine-computed when available | Requires popular-times data; not available in v1 |
| `atmosphere.tempo` | Engine-computed when available | `LINGER_FRIENDLY` / `QUICK_TURN` from density + service signals |
| `atmosphere.density` | Signal-dependent | Only populated when `identity_signals.density` is set |
| Composite ambiance string | FULL mode only | LITE mode renders formality and service separately |
| `ELECTRIC` energy | FULL mode only | Suppressed in LITE even if token is present |
| Per-surface confidence overrides | Future | v1 uses static defaults; v2 may derive from source quality |

---

## 11. UI Rendering Checklist

### Must render (contractual)

- [ ] `atmosphere[0]` — primary energy/room label (if present)
- [ ] `scene[0]` — primary role label (if present)
- [ ] `scene[1]` — context label (if present; Neighborhood staple / Destination-leaning)
- [ ] Empty state when `scenesense === null` (PRL < 3)
- [ ] Respect surface cap — never render more items than the array contains

### Must not do

- [ ] Do not read `identity_signals.language_signals` directly in the UI — always consume via `VoiceOutput`
- [ ] Do not render `ELECTRIC` label unless it arrives in the `atmosphere` array (engine handles suppression)
- [ ] Do not invent labels not returned by the engine
- [ ] Do not merge surfaces (e.g. concatenating `atmosphere` + `ambiance` into one pill row) without explicit product sign-off

### May defer (not blocking v1)

- [ ] Time-aware atmosphere variants (early evening / late)
- [ ] Busy window time ranges
- [ ] Full-mode composite ambiance string rendering
- [ ] Tempo labels (Lingering-friendly, Quick-turn tables)
