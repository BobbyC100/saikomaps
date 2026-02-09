# Saiko Maps — Merchant Page Grid System v1

**Locked · February 2026**

---

## Purpose

The merchant page exists for **decision support**, not discovery.

The user has already chosen to look at this place. The page answers:
1. What can I do? (actions)
2. What is this place? (visual context)
3. Why should I trust this? (editorial)
4. How do I act on it? (utilities)

Layout serves that hierarchy. Every row has a job.

---

## Grid

6 columns, shared with search results grid.

Same math, same mental model, same breakpoints.

---

## Card Sizes

| Card | Size | Tier |
|------|------|------|
| Primary Action Set | 6-col | Decision |
| Gallery | 6-col | Context |
| Hours | 3-col (expands to 6 when solo) | Facts |
| Curator's Note | 3-col (2-col with 3 cards) | Editorial |
| Coverage | 3-col (2-col with 3 cards) | Editorial |
| Instagram | 2-col | Editorial |
| Map | 2-col | Utility |
| Website | 2-col | Utility |
| Call | 2-col | Utility |

**Note:** Instagram appears in Editorial tier as social proof, not as a primary action.

---

## Tier Composition

| Tier | Contents | Size | Expansion |
|------|----------|------|-----------|
| **Decision** | Primary Action Set | 6-col | Always renders |
| **Context** | Gallery | 6-col | If photos exist |
| **Facts** | Hours | 3-col | Expands to 6 when solo |
| **Editorial** | Curator's Note + Coverage + Instagram | 3+3 / 2+2+2 | Expands per count |
| **Utility** | Map, Website, Call | 2-col | 2+2+2 / 3+3 / 6 per count |
| **Secondary** | Vibe, Tips, Best For, Also On | Flexible | Not part of grid math |

**Invariant:** Tiers must render in order. No tier may visually precede a higher-priority tier, even if higher tiers are missing.

**Note:** Utility tier is conceptual, not literal. It may render as multiple physical rows as needed.

---

## Expansion Rules

**Facts tier (Hours):**
- Solo → 6-col (expands to fill)
- With peer (future) → 3 + 3

**Editorial tier (Curator's Note + Coverage + Instagram):**
- Three cards exist → 2 + 2 + 2 (all equal)
- Two cards exist → 3 + 3 (equal split)
- One card exists → 6 (expands to fill)
- No cards exist → Tier doesn't render

**Utility tier (Map, Website, Call):**
- 3 cards → 2 + 2 + 2
- 2 cards → 3 + 3
- 1 card → 6
- 0 cards → Tier doesn't render

No gaps. No orphans. Cards expand to fill available space.

**Coverage card internal priority:**
1. Pull Quote (best case)
2. Excerpt (fallback)
3. Source list only (minimal case)

---

## Priority Orders

### Editorial Tier
Cards appear in this order (when present):
1. Curator's Note
2. Coverage
3. Instagram

### Utility Tier
Cards appear in this priority order:
1. Map (always if address exists)
2. Website (if not in Primary Action Set)
3. Call (if not in Primary Action Set)

---

## Secondary Content

Cards not part of the v1 grid system:
- Vibe Tags
- Tips
- Best For
- Also On

These render **after** all v1 tiers. They:
- Do not participate in expansion logic
- Do not affect layout guarantees
- May stack, scroll, or collapse freely
- Are not required for decision completion

Think of them as: "Post-decision enrichment, not decision support."

---

## Non-Goals

This page is **not**:
- A profile (no endless scrolling content)
- An article (editorial doesn't displace actions)
- A discovery surface (that's what search is for)

Editorial content has one reserved row. It does not expand beyond that, and never displaces decision or utility rows.

---

## Density Tiers

Padding controls visual weight. Different card tiers use different padding to match their semantic importance.

| Tier | Padding | Energy | Cards |
|------|---------|--------|-------|
| **Editorial** | 24px / 12px 16px | Mixed | Curator's Note (24px), Coverage (24px), Instagram (12px 16px) |
| **Facts** | 16px 20px | Compact reference | Hours |
| **Utility** | 12px 16px | Minimal, functional | Map, Website, Call |

**Visual Hierarchy:** Utilities should feel quieter than Editorial. Facts should feel denser than Editorial. All should feel calmer than Primary Action Set.

**Typography Scale:**
- Editorial: Standard sizes (15px italic, 12px attribution)
- Facts: Compact sizes (11-12px, tight spacing)
- Utility: Minimal sizes (8-12px labels/values)

**Layout Principle:** Facts and Utility cards use **reference energy, not poster energy**.
- No vertical centering (`justify-content: center`)
- Content flows naturally from top
- Scannable, not contemplative

---

## Vertical Layout Invariant

The merchant page grid controls **horizontal layout only**. Vertical height is content-driven.

Cards are content containers, not area-filling tiles:
- Grid defines width (column span)
- Content defines height (auto-size)
- Cards do not stretch to fill implicit row height

### CSS Implementation

```css
.bentoGrid {
  grid-auto-rows: auto;  /* Content-driven height */
  align-items: start;     /* Cards don't stretch vertically */
}
```

Cards should **not** use `height: 100%` or vertical `flex: 1` unless intentionally filling a defined space.

### Result

- Hours card: As tall as the schedule needs
- Map/Website/Call cards: As tall as their content needs
- No empty space inside cards
- Visual density increases
- Content remains readable

---

## Graceful Degradation

- Missing data → card doesn't render
- Missing row → row doesn't render
- Remaining cards expand per rules
- No empty containers, no placeholder states

---

## Implementation Details

### Coverage Card Component

The Coverage card is a single component with internal priority logic:

```typescript
// Priority 1: Show Pull Quote if it exists
if (pullQuote) {
  return <PullQuote />
}

// Priority 2: Show Excerpt from first source if available
if (firstSource.content || firstSource.excerpt) {
  return <Excerpt />
}

// Priority 3: Show source list as fallback
return <SourceList />
```

This ensures one unified surface, not multiple stacked cards.

### Expansion Implementation

```typescript
// Editorial tier expansion
const curatorSpan = !hasCoverage ? 'span6' : 'span3';
const coverageSpan = !hasCuratorNote ? 'span6' : 'span3';

// Utility tier expansion
const utilitySpan = 
  utilityCount === 1 ? 'span6' : 
  utilityCount === 2 ? 'span3' : 
  'span2';
```

### Mobile Responsive

On mobile (≤640px):
- All span classes collapse to `span6` (full width)
- Cards stack vertically in tier order
- Expansion logic becomes moot

---

## Reference

This spec should be referenced alongside:
- **Bento Grid v5** (search results layout system)
- **Decision Onset Zone** (merchant page action hierarchy)
- **Intent Profiles** (action set composition)

Together, these form the layout ontology for Saiko Maps.

---

## Change Log

**February 8, 2026** - v1 Locked
- Formalized tier structure (Decision > Context > Facts > Editorial > Utility > Secondary)
- Defined explicit expansion rules
- Unified Coverage card (Pull Quote > Excerpt > Source list)
- Removed Instagram from editorial section (Primary Action Set only)
- Hours moved to Facts tier (out of utility row)

---

**Status:** ✅ Implemented  
**Last Updated:** February 8, 2026  
**Maintainer:** Bobby Ciccaglione
