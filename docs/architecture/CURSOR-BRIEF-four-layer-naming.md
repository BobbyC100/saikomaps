# Cursor Briefing: Four-Layer Enrichment Naming Convention

**Date:** 2026-03-26
**Context:** You're about to implement `docs/architecture/lane-first-enrichment-v1.md`. Before you start, read this — it covers a naming change that was made after the spec was first drafted and affects how you implement it.

---

## What Changed

We renamed what the codebase called "tagline generation" (Stage 7) to the **Interpretation layer**. This isn't cosmetic — it reflects that Stage 7 is doing something much more important than generating a tagline. It's the stage where Saiko proves it understands an entity well enough to express a point of view on it. "Tagline" is just one output artifact of that layer, the same way "phone" is one output of the Access layer.

The enrichment model is now explicitly **four layers**, not three buckets plus an unnamed thing:

| Layer | Concern | Profile Field | Example Artifacts |
|---|---|---|---|
| **Identity** | Does this place exist? Can we anchor it? | (scored via identity anchors) | name, coords, GPID, vertical |
| **Access** | Can a person reach or visit this place? | `access_expected` | website, phone, hours, Instagram, reservation URL |
| **Offering** | What is this place about? What does it do? | `offering_expected` | menu URL, programs, SceneSense, events, editorial |
| **Interpretation** | Can Saiko express a point of view on this place? | `interpretation_expected` | tagline, (future: summary, vibe) |

---

## What This Means for Your Implementation

### 1. The profile field is `interpretation_expected`, not `interpretation_required`

The lane-first spec has been updated. When you add the new field to `EnrichmentProfile` in `lib/coverage/enrichment-profiles.ts`, use:

```typescript
export interface EnrichmentProfile {
  verticals: string[];
  access_expected: AccessFieldKey[];
  offering_expected: OfferingFieldKey[];
  interpretation_expected: InterpretationKey[];  // NEW — fourth layer
}

type InterpretationKey = 'TAGLINE';  // extensible later
```

The naming pattern is `*_expected` — consistent with `access_expected` and `offering_expected`. NOT `interpretation_required`.

### 2. The `EnrichmentAssessment` interface uses `met` for Interpretation

The assessment return shape for the Interpretation layer matches Identity (uses `met`), not Access/Offering (which use `complete`). This is because Identity and Interpretation are either met or not — they don't have partial satisfaction in the same way:

```typescript
interface EnrichmentAssessment {
  done: boolean;
  identity: {
    met: boolean;
    score: number;
    threshold: number;
    missing: string[];
  };
  access: {
    complete: boolean;
    satisfied: number;
    expected: number;
    missing: string[];
  };
  offering: {
    complete: boolean;
    satisfied: number;
    expected: number;
    missing: string[];
  };
  interpretation: {
    met: boolean;
    required: boolean;
    satisfied: number;
    expected: number;
    missing: string[];  // e.g., ['TAGLINE']
  };
}
```

### 3. Comments and log messages should use "Interpretation," not "tagline"

When writing log lines, comments, or issue metadata, use the layer name:

```typescript
// Good
console.log('  ✓ Interpretation layer satisfied');
console.log('  ⊘ Interpretation layer not required for this vertical');

// Avoid
console.log('  ✓ tagline generated');  // too specific — layer might have more outputs later
```

For skip reasons in stage logic, "tagline" is fine since you're referring to the specific artifact:

```typescript
// Fine — referring to the specific artifact
if (existing) return { skip: true, reason: 'TAGLINE already in interpretation_cache' };
```

### 4. Stage 7 label in pipeline output

If you touch any stage labels (enrich-place.ts stage definitions, log headers), update Stage 7 from "Tagline generation" to "Interpretation (tagline generation)" or just "Interpretation":

```typescript
// Current
{ n: 7, label: 'Tagline generation (AI)' }

// New
{ n: 7, label: 'Interpretation (AI)' }
```

### 5. Issue scanner: `enrichment_stalled` metadata

When building the missing-requirements list for the `enrichment_stalled` issue type, use the interpretation assessment — don't hard-code "TAGLINE":

```typescript
// The assessment.interpretation.missing array already contains the right values
// e.g., ['TAGLINE'] if tagline is expected but absent, [] if not required
...assessment.interpretation.missing,
```

---

## Files Already Updated (don't revert these)

These files have already been updated with the four-layer naming:

- **`docs/architecture/lane-first-enrichment-v1.md`** — The spec you're implementing. Four-layer table added in Section 3. `interpretation_expected` naming throughout. Updated `EnrichmentAssessment` interface.
- **`docs/ENRICHMENT_PIPELINE.md`** — Stage 7 renamed to "Interpretation." Four-layer reference table added. Completion marker section updated.
- **`lib/coverage/enrichment-profiles.ts`** — Header comments updated from "three buckets" to "four enrichment layers." Note added about `interpretation_expected` being added when you implement the spec.
- **`docs/PIPELINE_COMMANDS.md`** — Stage 7 label updated.

---

## Files You'll Touch (apply four-layer naming here)

Per the lane-first spec, implementation is phased A through F. Apply the naming convention in all of these:

| Phase | Files | What to Watch |
|---|---|---|
| A | `enrichment-profiles.ts`, `enrichment-profiles.test.ts` | Use `interpretation_expected` field name. Test names should reference "Interpretation layer." |
| B | `enrich-place.ts` | Stage 7 label. Log messages. Batch selection comments. |
| C | `smart-enrich.ts` | Comments about what smart enrich does/doesn't cover ("does not run Interpretation layer"). |
| D | `enrich-place.ts` | Stage 6 skip logic comments. |
| E | `issue-scanner.ts` | `enrichment_stalled` metadata uses `assessment.interpretation.missing`. |
| F | `enrich-place.ts`, `enrich/[slug]/route.ts` | Completion gate log messages use "Interpretation layer." |

---

## The Rule

**"Interpretation" is the layer. "Tagline" is an artifact.**

Use "Interpretation" when talking about the enrichment concern. Use "TAGLINE" when talking about the specific `interpretation_cache` output type. Same pattern as: "Access" is the layer, "phone" is a field.

---

*Written 2026-03-26 to align Cursor with the four-layer naming convention before lane-first enrichment implementation begins.*
