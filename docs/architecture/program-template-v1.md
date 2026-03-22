---
doc_id: SKAI-DOC-PROGRAM-TEMPLATE-V1
doc_type: architecture
status: active
title: "Offering Program Template — How to Add a New Program"
owner: Bobby Ciccaglione
created: "2026-03-19"
last_updated: "2026-03-19"
project_id: SAIKO
summary: "Step-by-step template for adding a new offering program. Covers signal definition, assembly logic, contract, API, and dashboard wiring."
systems:
  - enrichment
  - coverage
related_docs:
  - docs/architecture/enrichment-model-v1.md
  - docs/architecture/enrichment-strategy-v1.md
---

# Offering Program Template V1

## When to Use This

Use this template when adding a new offering program (e.g., `taco_program`, `pizza_program`, `sake_program`). Every program follows the same 5-file pattern.

## Program Anatomy

Every program has:

| Field | Type | Purpose |
|---|---|---|
| `program_class` | `food` / `beverage` / `events` / `service` | Family grouping for dashboard + queries |
| `maturity` | `dedicated` / `considered` / `incidental` / `none` / `unknown` | How serious this place is about this program |
| `signals` | `string[]` | Specific sub-signals detected (e.g., `xlb`, `natural_wine`) |
| `confidence` | `number` (0-1) | Trust in the assessment |
| `evidence` | `string[]` | Source text fragments that led to the assessment |

## Maturity Scale

| Level | Meaning | Example (dumpling) |
|---|---|---|
| `dedicated` | This is a core identity of the place | Dumpling specialist, 3+ dumpling types |
| `considered` | Meaningful presence, not the core | Has dumplings on menu, some variety |
| `incidental` | Present but not a focus | One dumpling appetizer on a large menu |
| `none` | Explicitly does not have this | Confirmed no dumplings |
| `unknown` | Haven't assessed yet | No signals detected |

## Steps to Add a New Program

### Step 1: Define signals

In `scripts/assemble-offering-programs.ts`, add a signal set near the existing ones:

```typescript
const [NAME]_SIGNALS = new Set([
  "[name]_program",        // generic program signal
  "[name]_specialist",     // specialist signal → triggers dedicated
  // Type-level signals (the sub-family):
  "[type_1]",
  "[type_2]",
  "[type_3]",
]);
```

**Naming rules:**
- Signal set: `SCREAMING_SNAKE` (e.g., `DUMPLING_SIGNALS`)
- Signal names: `snake_case` (e.g., `xlb`, `natural_wine_presence`)
- Specialist signal: `[name]_specialist` — always implies `dedicated`

### Step 2: Add assembly logic

In `scripts/assemble-offering-programs.ts`, add assembly block before the return:

```typescript
// ── [name]_program ──────────────────────────────────────────────────────

const [name]SignalNames = msSignalNames.filter((s) => [NAME]_SIGNALS.has(s));
const has[Name]Specialist = [name]SignalNames.includes("[name]_specialist");

let [name]Maturity: ProgramMaturity = "unknown";
if (has[Name]Specialist || [name]SignalNames.length >= 3) {
  [name]Maturity = "dedicated";
} else if ([name]SignalNames.length > 0) {
  [name]Maturity = "considered";
}

const [name]Program: ProgramEntry = {
  program_class: "[food|beverage|events|service]",
  maturity:   [name]Maturity,
  signals:    [name]SignalNames,
  confidence: [name]Maturity === "unknown" ? 0 : ms ? round2(ms.confidence) : 0.5,
  evidence:   evidenceFor([NAME]_SIGNALS),
};
```

**Maturity rules (default):**
- `dedicated` = specialist signal OR 3+ type signals
- `considered` = any signals present
- `unknown` = no signals

Customize thresholds per program if needed.

### Step 3: Add to OfferingPrograms interface + return

In the same file:

1. Add `[name]_program: ProgramEntry;` to the `OfferingPrograms` interface
2. Add `[name]_program: [name]Program,` to the return object

### Step 4: Update contract

In `lib/contracts/place-page.ts`:

Add `[name]_program: PlacePageProgramEntry;` to `PlacePageOfferingPrograms`.

### Step 5: Update API route

In `app/api/places/[slug]/route.ts`:

Add `'[name]_program'` to the `PROGRAM_KEYS` array.

## Files Changed (Checklist)

| # | File | What to Add |
|---|---|---|
| 1 | `scripts/assemble-offering-programs.ts` | Signal set + assembly logic + interface + return |
| 2 | `lib/contracts/place-page.ts` | Add to `PlacePageOfferingPrograms` |
| 3 | `app/api/places/[slug]/route.ts` | Add to `PROGRAM_KEYS` |

## Verification

- [ ] `npx tsc --noEmit` passes
- [ ] `assemble-offering-programs` runs without error
- [ ] New program appears in API response for entities with matching signals
- [ ] New program defaults to `unknown` for entities without signals

## Reference Implementation

See `dumpling_program` — added 2026-03-19. Follows this template exactly.

## Current Programs

| Program | Class | Added |
|---|---|---|
| `food_program` | food | v1 |
| `wine_program` | beverage | v1 |
| `beer_program` | beverage | v1 |
| `cocktail_program` | beverage | v1 |
| `non_alcoholic_program` | beverage | v1 |
| `coffee_tea_program` | beverage | v1 |
| `service_program` | service | v1 |
| `private_dining_program` | events | 2026-03-18 |
| `group_dining_program` | events | 2026-03-18 |
| `catering_program` | events | 2026-03-18 |
| `dumpling_program` | food | 2026-03-19 |
