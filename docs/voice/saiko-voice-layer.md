# Saiko Voice Layer

## 1. Purpose

The Saiko voice layer translates structured signals into natural-language sentences displayed in the place page identity block. Instead of exposing raw taxonomy metadata to the user, the interface converts classification fields and live signals into concise editorial language.

**Example output (Seco):**

```
Culver City restaurant
Open now — lively room, strong date-night energy
```

The goal: the page reads like an informed field guide, not a database record.

---

## 2. Inputs (Signals)

The voice layer draws from four fields already present in the API response:

| Signal | Source field | Example value |
|---|---|---|
| Category | `primary_vertical` (via `VERTICAL_DISPLAY` mapping, lowercased) | `"restaurant"` |
| Neighborhood | `neighborhood` | `"Culver City"` |
| Open state | Derived from `hours` via `parseHours()` | `"Open now"` / `"Closed now"` |
| Energy / vibe | `vibeTags` | `["Lively", "Date Night", "Cozy"]` |

### Lookup table: `VIBE_PHRASES`

Maps raw vibe tags to natural-language fragments:

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

Tags not present in the lookup table are silently ignored — the voice layer never invents signals.

---

## 3. Transformation Layer

The identity block produces two lines below the place title:

### Line 1 — Place identity

```
{neighborhood} {primary_vertical (lowercased)}
```

Example: `Culver City restaurant`

Built by joining `neighborhood` and `category.toLowerCase()`, filtering out nulls. If both are missing, the line is omitted.

### Line 2 — Signals sentence

```
{open_state} — {energyPhrase}
```

Example: `Open now — lively room, strong date-night energy`

- **Open state** is derived from `parseHours()`. Rendered in `<em>` to typographically distinguish the live/dynamic signal from static descriptors.
- **Energy phrase** is built by mapping each `vibeTag` through `VIBE_PHRASES`, then joining matched fragments with commas.
- If only one part exists (open state only, or energy only), the dash separator is omitted.
- If neither part exists, the entire line is omitted.

---

## 4. Guardrails

- **Tags are the source of truth.** The voice layer interprets existing signals; it does not generate or infer new ones.
- **No invention.** Unrecognized vibe tags are skipped, not approximated.
- **Sentence length stays short.** The identity block is a glance-read zone — one line of context, one line of energy.
- **Dynamic signals are visually distinct.** `Open now` / `Closed now` are wrapped in `<em>` to separate live state from static descriptors.
- **Raw tags remain visible.** The right rail still displays the original `vibeTags` list so structured data and voice output can be compared side by side.

---

## 5. Current Implementation

All voice layer logic currently lives inline in the place page component:

```
app/(viewer)/place/[slug]/page.tsx
```

Specifically:
- `VIBE_PHRASES` lookup table (lines ~290–301)
- `identitySubline` construction (line ~287)
- `energyPhrase` assembly (lines ~302–305)
- `openStateLabel` derivation (lines ~307–309)
- JSX rendering with `<em>` wrap (identity block in the return)

No separate module exists yet. The logic is intentionally co-located with the presentation for the experimentation phase.

---

## 6. Future Direction

If the voice layer proves effective, the transformation logic should move into a dedicated module:

```
lib/voice/saiko.ts
```

Potential expansions:
- **Time-aware phrasing** — "Open tonight", "Opens at 5pm", "Closed Mondays"
- **Scene language** — derived from energy scores and SceneSense signals
- **Neighborhood context** — "Quiet corner of Silver Lake", "Heart of downtown"
- **Vertical-specific voice** — different sentence structures for coffee shops vs. hotels vs. nature spots
- **Voice tuning** — adjustable tone/formality per vertical or editorial context

The voice layer could eventually become a core Saiko primitive: **Signal → Language** — where structured data powers the experience, but the interface speaks in natural language.

---

## 7. Architectural Boundary (Fields vs TRACES)

The Saiko voice layer is **not** part of the Fields data layer.

Fields stores structured signals and authored content only:

- `primary_vertical`
- `neighborhood`
- `vibeTags`
- `hours`
- Provenance metadata
- Confidence values

These values are stored in the database and served by the API without modification.

The voice layer exists only in the **TRACES product layer**. Its responsibility is to convert structured signals into human-readable observations at render time.

```
Fields (signals)  →  TRACES voice renderer  →  UI sentences
```

### Renderer properties

- **Pure function** — signals in, text out
- **Stateless** — no side effects, no database writes
- **Deterministic** — same inputs always produce same outputs
- **Cacheable** — output can be cached without being stored as data

### Proposed interface (future extraction)

```typescript
renderIdentityBlock(signals) → {
  subline: string | null;
  sentence: string | null;
}
```

Supporting helpers:

- `renderLocation(signals)` — neighborhood + vertical
- `renderOpenState(hours)` — open/closed phrasing
- `renderVibe(vibeTags)` — energy phrase assembly

### Why rendering stays out of Fields

- **Different products need different rendering.** TRACES web, mobile, API clients, and voice assistants all want different phrasing from the same signals.
- **Rendering evolves faster than data.** Changing tone or phrasing should be a template update, not a data migration.
- **Fields must remain presentation-agnostic.** Third-party consumers should receive raw signals and render them however they want.

### The editorial content exception

Authored text (descriptions, curator notes) **does** belong in Fields — it is data with provenance, not a derived view. The voice layer generates text from signals; it does not store it.

| Layer | Stores | Does not store |
|---|---|---|
| Fields | Structured signals, authored content, provenance | Rendered text, presentation logic |
| TRACES | Rendering templates, phrase maps, cached output | Raw signal data |