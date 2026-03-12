---
doc_id: SS-DISPLAY-CONTRACT-V2
doc_type: domain-spec
status: active
owner: Bobby Ciccaglione
created: '2026-03-12'
last_updated: '2026-03-12'
project_id: TRACES
systems:
  - scenesense
  - traces
summary: Display contract for the revised SceneSense three-lens model (Atmosphere / Energy / Scene). Supersedes SS-DISPLAY-CONTRACT-V1.
related_docs:
  - docs/scenesense/three-lenses-framework-v1.md
  - docs/scenesense/atmosphere-lens-v1.md
  - docs/scenesense/energy-lens-v1.md
  - docs/scenesense/scene-lens-v1.md
  - docs/scenesense/glossary-v1.md
  - docs/scenesense/display-contract-v1.md
---
# SceneSense Display Contract v2

**Supersedes:** SS-DISPLAY-CONTRACT-V1
**Framework:** SS-FW-001 (Three Universal Lenses)

---

## 1. Overview

SceneSense is the interpretation layer between raw signals and rendered UI copy. It assembles short, deterministic descriptor strings through three lenses: Atmosphere, Energy, and Scene.

**Data flow:**

```
identity_signals.language_signals
        ↓
  CanonicalSceneSense  (lib/scenesense/mappers.ts)
        ↓
  generateSceneSenseCopy  (lib/scenesense/voice-engine.ts)
        ↓
  lint pass  (lib/scenesense/lint.ts)
        ↓
  VoiceOutput  { atmosphere[], energy[], scene[] }
        ↓
  /api/places/[slug]  →  PlacePageSceneSense
        ↓
  SceneSenseCard / sidebar rendering
```

---

## 2. Output Shape

```typescript
type PlacePageSceneSense = {
  atmosphere: string[];
  energy: string[];
  scene: string[];
};
```

SceneSense is `null` when PRL < 3.

---

## 3. PRL Gate

| PRL | SceneSense | Mode | Max per surface |
|-----|-----------|------|-----------------|
| 1–2 | `null` | — | — |
| 3 | Active | LITE | 2 |
| 4 | Active | FULL | 4 |

---

## 4. Surface Contracts

### 4.1 Atmosphere

**Describes:** Physical and sensory environment of the space.

**Source signals:** `identity_signals.{noise, lighting, density, seating, tempo}`

| Token | Label |
|-------|-------|
| DIM | Dim |
| WARM | Warm-lit |
| BRIGHT | Bright |
| LOUD | Loud |
| CONVERSATIONAL | Conversational |
| QUIET | Quiet |
| TIGHT | Tight room |
| AIRY | Airy |
| PACKED | Packed |
| BAR_FORWARD | Bar-forward |
| PATIO_FRIENDLY | Patio-friendly |
| LINGER_FRIENDLY | Lingering-friendly |
| QUICK_TURN | Quick-turn tables |

**Confidence floor:** `confidence.atmosphere ≥ 0.45`

Atmosphere describes stable physical qualities. It does not include activity or social signals.

---

### 4.2 Energy

**Describes:** Activity level and temporal rhythm of the place.

**Source signals:** `identity_signals.language_signals` → energy character tokens; `energy.busy_windows`, `energy.time_variants`

| Token | Label |
|-------|-------|
| BUZZY | Buzzy |
| CHILL | Chill |
| LIVELY | Lively |
| LOW_KEY | Low-key |
| CALM | Calm |
| STEADY | Steady |
| ELECTRIC | Electric (FULL mode only) |

**Time variant output (FULL mode, `confidence.energy ≥ 0.65`):**
`{early} early evening · {late} late`

**Busy window output:**
- FULL mode + `confidence.energy ≥ 0.75` + numeric hours available → `Busiest: 7–9 PM`
- Otherwise → `Typically busiest in the evening`

**Confidence floor:** `confidence.energy ≥ 0.45`

**Confidence defaults:**
- With language signals: `0.8`
- Without: `0.6`

---

### 4.3 Scene

**Describes:** Social patterns of use, formality, and social register.

**Source signals:** `identity_signals.{roles, context, formality, register}`

| Signal | Tokens → Labels |
|--------|----------------|
| Roles | `DATE_FRIENDLY` → Date-friendly, `AFTER_WORK` → After-work, `GROUP_FRIENDLY` → Group-friendly, `SOLO_FRIENDLY` → Solo-friendly |
| Context | `NEIGHBORHOOD_STAPLE` → Neighborhood staple, `DESTINATION_LEANING` → Destination-leaning |
| Formality | `CASUAL` → Casual, `CASUAL_REFINED` → Casual-refined, `REFINED` → Refined |
| Register | `RELAXED` → Relaxed, `POLISHED` → Polished, `UNPRETENTIOUS` → Unpretentious |

**LITE fallback:** If < 2 items, append `Easy repeat spot`.

**Confidence floor:** `confidence.scene ≥ 0.45`

**Confidence defaults:**
- With signature dishes: `0.7`
- Without: `0.5`

---

## 5. Signal Ownership

Service model (`FULL_SERVICE`, `COUNTER_SERVICE`, `BAR_SERVICE`) belongs to **Programs**, not SceneSense. It is not rendered in any SceneSense surface.

Price tier (`$`, `$$`, `$$$`, `$$$$`) belongs to **Programs**. It may inform SceneSense interpretation (e.g., `$$$$` increases probability of `Refined`) but the descriptor belongs to Scene.

---

## 6. Lint Rules

| Code | Description |
|------|-------------|
| A1_PRL_LT_3 | SceneSense dropped — PRL < 3 |
| A1_PRL3_NOT_LITE | PRL 3 must use LITE mode |
| A2_CAP_EXCEEDED | Surface capped to maxPerSurface |
| A4_TAG_CLOUD_COMMAS | Comma-heavy string triggers REGENERATE |
| B1_BANNED_WORD | Banned vocabulary (locals, tourist, best, worst, always, never, ...) |
| B2_POPULAR_TIMES | "popular times" phrase removed |
| B3_EXCLUSIONARY | Exclusionary language removed |
| C1_NUMERIC_TIME_NOT_ALLOWED | Numeric time in energy without FULL + high confidence |
| C1_NUMERIC_TIME_NON_ENERGY | Numeric time in atmosphere or scene |
| C2_BUSY_NON_ATMOSPHERE | Busy/peak language in energy or scene |
| D2_LITE_TOO_STRONG | LITE mode: buzziest/peak/settles after removed from energy |
| E1_DUP_EXACT | Exact duplicate across surfaces |

---

## 7. Confidence Defaults

| Surface | Default | With strong signal |
|---------|---------|-------------------|
| `atmosphere` | 0.6 | 0.6 (physical signals not yet flowing) |
| `energy` | 0.6 | 0.8 (when language_signals present) |
| `scene` | 0.5 | 0.7 (when signature_dishes present) |

---

## 8. UI Rendering Obligations

The UI must:
- Render only surfaces with at least one statement (empty arrays = no render)
- Maintain surface order: Atmosphere → Energy → Scene
- Render label strings as: `ATMOSPHERE`, `ENERGY`, `SCENE`
- Null-guard: if `scenesense === null`, render nothing
- Not fall back to raw `identity_signals`

---

## 9. Changes from v1

| Item | v1 | v2 |
|------|----|----|
| Three surfaces | Atmosphere / Ambiance / Scene | Atmosphere / Energy / Scene |
| Energy tokens | Rendered in Atmosphere | Rendered in Energy |
| Formality | Rendered in Ambiance | Rendered in Scene |
| Social register (Relaxed/Polished/Unpretentious) | Rendered in Ambiance | Rendered in Scene |
| Service model | Rendered in Ambiance | Dropped (Programs, not SceneSense) |
| Atmosphere confidence boost | 0.8 when language_signals present | 0.6 flat (energy tokens moved out) |
| Energy confidence | 0.6 flat | 0.8 when language_signals present |
