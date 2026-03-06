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
Open now — lively room
```

The system performs signal → language translation, not data generation.

---

## 2. System Boundary

The Voice Layer belongs to the TRACES product layer, not the Fields data layer.

**Architecture:**

```
Fields (structured signals)
      ↓
SceneSense (Atmosphere / Ambiance / Scene)
      ↓
TRACES Voice Layer
      ↓
UI Sentences
```

Fields stores the raw language signals.
SceneSense interprets and routes them to the correct lens.
TRACES renders those signals into editorial language.

---

## 3. Inputs (Signals)

The Voice Layer consumes signals already returned by the API — it never reads raw `identity_signals` directly.

| Signal | Field | Example |
|---|---|---|
| Category | `primary_vertical` | `restaurant` |
| Neighborhood | `neighborhood` | `Culver City` |
| Open State | derived from `hours` | `Open now` |
| Energy Phrase | `scenesense.atmosphere[0]` | `Lively` |

The energy phrase comes from `scenesense.atmosphere` — the first item in the atmosphere surface, which may be an energy label (Lively, Chill, etc.) or a physical room label (Warm-lit, Quiet, etc.).

---

## 4. Phrase Mapping

SceneSense atmosphere labels are converted into editorial fragments through a lookup table.

**ATMOSPHERE_PHRASES**

| SceneSense label | Phrase |
|---|---|
| Lively | lively room |
| Buzzy | buzzy room |
| Chill | laid-back feel |
| Low-key | low-key feel |
| Calm | calm atmosphere |
| Steady | steady energy |
| Electric | electric energy |
| Warm-lit | warm-lit room |
| Conversational | conversational room |
| Quiet | quiet room |

Labels not in the table are rendered lowercased. The system never invents signals.

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

Example: `Open now — lively room`

**Construction**
- `open_state` derived from hours parsing (`openNowExplicit` must be true)
- `energy_phrase` sourced from `scenesense.atmosphere[0]`, mapped through ATMOSPHERE_PHRASES
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
| No raw signal reads | Voice Layer never reads `identity_signals` directly |

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
renderEnergy(atmosphere: string[]): string | null   // consumes scenesense.atmosphere
```

**Input type:**

```typescript
interface VoiceSignals {
  neighborhood: string | null | undefined;
  category: string | null | undefined;
  // atmosphere sourced from scenesense.atmosphere (SceneSense output)
  atmosphere?: string[] | null | undefined;
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
| SceneSense | Interpretation logic, lens routing | Raw signal data, rendered text |
| TRACES | Phrase maps, render logic, cached output | Raw signal data |

Fields never stores rendered text.
SceneSense never stores signals — it interprets them.
TRACES never stores signal data.

---

## 10. Future Capabilities

| Expansion | Description |
|---|---|
| Time-aware phrasing | "Open tonight", "Opens at 5pm", "Closed Mondays" |
| Multi-lens rendering | Voice layer may pull from ambiance or scene for richer sentences |
| Neighborhood context | "Heart of Silver Lake", "Quiet corner of Culver City" |
| Vertical-specific voice | Coffee shops, hotels, parks, restaurants |
| Voice tuning | Editorial tone variations per context |
