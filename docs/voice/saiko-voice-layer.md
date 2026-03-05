# SAI-DOC-VOICE-001 — Saiko Voice Layer

**Document ID:** SAI-DOC-VOICE-001
**Title:** Saiko Voice Layer
**System:** TRACES
**Layer:** Product Interpretation / Rendering
**Status:** Active
**Owner:** Saiko
**Purpose:** Translate structured signals into editorial natural language.

---

## 1. Overview

The Saiko Voice Layer converts structured data signals from Fields into short editorial sentences used in the TRACES interface.

It allows the interface to read like a field guide, not a database.

Instead of exposing taxonomy fields directly to users, the system renders concise phrases that describe the place's identity and current energy.

**Example output:**

```
Culver City restaurant
Open now — lively room, strong date-night energy
```

The system performs signal → language translation, not data generation.

---

## 2. System Boundary

The Voice Layer belongs to the TRACES product layer, not the Fields data layer.

**Architecture:**

```
Fields (structured signals)
      ↓
TRACES Voice Layer
      ↓
UI Sentences
```

Fields stores the raw signals.
TRACES renders those signals into editorial language.

---

## 3. Inputs (Signals)

The Voice Layer consumes signals already returned by the API.

| Signal | Field | Example |
|---|---|---|
| Category | `primary_vertical` | `restaurant` |
| Neighborhood | `neighborhood` | `Culver City` |
| Open State | derived from `hours` | `Open now` |
| Energy Signals | `identity_signals.vibe_words` (via SceneSense) | `["lively", "date-night"]` |

These signals remain unchanged from their stored values.

---

## 4. Phrase Mapping

Raw tags are converted into editorial fragments through a lookup table.

**VIBE_PHRASES**

| Tag | Phrase |
|---|---|
| Lively | lively room |
| Cozy | cozy room |
| Intimate | intimate room |
| Chill | laid-back feel |
| Energetic | high-energy room |
| Romantic | romantic atmosphere |
| Date Night | strong date-night energy |
| Late Night | late-night energy |
| Casual | casual energy |
| Upscale | refined atmosphere |

Unrecognized tags are ignored. The system never invents signals.

---

## 5. Rendering Logic

The identity block contains two lines.

### Line 1 — Identity

```
{neighborhood} {category}
```

Example: `Culver City restaurant`

**Rules**
- Lowercase category
- Join with space
- Omit line if both values are missing

### Line 2 — Signals Sentence

```
{open_state} — {energy_phrase}
```

Example: `Open now — lively room, strong date-night energy`

**Construction**
- `open_state` derived from hours parsing (`openNowExplicit` must be true)
- `energy_phrase` assembled from `vibe_words` (via SceneSense interpretation of `identity_signals`), fragments joined by commas
- Separator rules:

| open_state | energy_phrase | Result |
|---|---|---|
| present | present | `Open now — lively room` |
| absent | present | `lively room` |
| present | absent | `Open now` |
| absent | absent | line omitted |

---

## 6. Guardrails

| Constraint | Rule |
|---|---|
| No signal invention | Only signals already present may be rendered |
| Deterministic output | Same signals always produce the same sentence |
| Short sentences | Identity block must remain glance-readable |
| Dynamic signals distinct | Open/Closed indicators use `<em>` styling |
| Raw signals accessible | Original structured tags remain visible in the UI rail |

---

## 7. Implementation

Voice logic lives in a dedicated module:

```
lib/voice/saiko.ts
```

**Primary export:**

```typescript
renderIdentityBlock(signals: VoiceSignals): {
  subline: string | null;
  sentence: string | null;
}
```

**Helper functions:**

```typescript
renderLocation(signals: VoiceSignals): string | null
renderOpenState(hours: unknown): string | null
renderEnergy(vibeWords: string[]): string | null   // consumes SceneSense output
```

**Input type:**

```typescript
interface VoiceSignals {
  neighborhood: string | null | undefined;
  category: string | null | undefined;
  hours: unknown;
  // vibe_words sourced from identity_signals via SceneSense interpretation
  vibeWords: string[] | null | undefined;
}
```

---

## 8. Architectural Principles

| Principle | Meaning |
|---|---|
| Pure | signals → language, no side effects |
| Stateless | no database writes |
| Deterministic | same input always produces same output |
| Cacheable | rendered text can be cached but never stored as canonical data |

---

## 9. Layer Responsibilities

| Layer | Stores | Does not store |
|---|---|---|
| Fields | Structured signals, authored content, provenance | Rendered text, presentation logic |
| TRACES | Phrase maps, render logic, cached output | Raw signal data |

Fields never stores rendered text.
TRACES never stores signal data.

---

## 10. Future Capabilities

| Expansion | Description |
|---|---|
| Time-aware phrasing | "Open tonight", "Opens at 5pm", "Closed Mondays" |
| SceneSense integration | Voice layer consumes SceneSense output; `identity_signals.vibe_words` drives energy phrase assembly |
| Neighborhood context | "Heart of Silver Lake", "Quiet corner of Culver City" |
| Vertical-specific voice | Coffee shops, hotels, parks, restaurants |
| Voice tuning | Editorial tone variations per context |
