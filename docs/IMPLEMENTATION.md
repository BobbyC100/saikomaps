# Merchant Page Implementation Guide

This guide explains the Saiko Merchant Page implementation, component structure, and how to work with the locked tier hierarchy.

---

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Type check
npm run type-check

# Build for production
npm run build
```

---

## Project Structure

```
saikomaps/
├── app/
│   ├── place/[slug]/
│   │   └── page.tsx          # Merchant profile route
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   └── merchant/
│       ├── MerchantPage.tsx  # Main page assembly
│       ├── HeroHeader.tsx    # Tier 0
│       ├── PrimaryActionSet.tsx
│       ├── InstagramConfidenceRow.tsx  # Tier 1.5
│       ├── PhotoCollage.tsx  # Tier 1
│       ├── VibeTagsRow.tsx
│       ├── TrustBlock.tsx    # Tier 2
│       ├── HoursCard.tsx     # Tier 3 (ALWAYS RENDERS)
│       ├── AddressCard.tsx
│       ├── MapTile.tsx
│       ├── AttributesCard.tsx # Tier 4
│       ├── AlsoOnLists.tsx   # Tier 5
│       ├── HouseCard.tsx
│       └── index.ts          # Barrel export
├── lib/
│   ├── types/
│   │   └── merchant.ts       # Type definitions
│   └── mock-data.ts          # Test data (Scenarios A, B, C)
├── .cursor/
│   └── rules/
│       └── merchant-page-review.mdc  # Cursor PR review rule
├── merchant-page-implementation-checklist.md  # PR review checklist
├── saiko-merchant-data-hierarchy.md           # Data hierarchy spec
└── IMPLEMENTATION.md         # This file
```

---

## Component Architecture

### Tier Order (Locked)

The render order in `MerchantPage.tsx` is **non-negotiable**:

1. `HeroHeader`
2. `PrimaryActionSet`
3. `InstagramConfidenceRow` (conditional)
4. `PhotoCollage` (conditional)
5. `VibeTagsRow` (conditional)
6. `TrustBlock` (conditional)
7. `HoursCard` **(ALWAYS)**
8. `AddressCard` (conditional)
9. `MapTile` (conditional)
10. `AttributesCard` (conditional)
11. `AlsoOnLists` (conditional)
12. `HouseCard` (conditional)

### Component Patterns

#### 1. Conditional Components

Most components collapse when data is missing:

```tsx
{merchant.instagramHandle && (
  <InstagramConfidenceRow handle={merchant.instagramHandle} />
)}
```

#### 2. HoursCard (Exception)

HoursCard **always renders**, even with missing data:

```tsx
<HoursCard
  hours={merchant.hours}
  openStatus={merchant.openStatus}
/>
```

#### 3. Guard Clauses

Components have internal guards to prevent empty renders:

```tsx
export function PhotoCollage({ photos, heroPhotoId }: PhotoCollageProps) {
  const collagePhotos = photos.filter(photo => photo.id !== heroPhotoId);
  
  if (collagePhotos.length === 0) {
    return null;
  }
  
  // ... render logic
}
```

---

## Critical Implementation Rules

### 1. HoursCard Always Renders

```tsx
// ✅ CORRECT
<HoursCard hours={merchant.hours} openStatus={merchant.openStatus} />

// ❌ WRONG
{merchant.hours && <HoursCard hours={merchant.hours} />}
```

### 2. Hero Photo Excluded from Collage

```tsx
// ✅ CORRECT
const collagePhotos = photos.filter(photo => photo.id !== heroPhotoId);

// ❌ WRONG
const collagePhotos = photos;
```

### 3. Instagram Slim Treatment

```tsx
// ✅ CORRECT: Single-line, lightweight
<a href={url} className="instagram-row">
  <span>📸</span>
  <span>@{handle}</span>
  <span>→</span>
</a>

// ❌ WRONG: Heavy button styling
<Button variant="filled">
  Follow on Instagram
</Button>
```

### 4. Attributes as Chips

```tsx
// ✅ CORRECT: Compressed chips
<div className="attributes-chips">
  {attributes.slice(0, 6).map(attr => (
    <span className="attribute-chip">{attr.name}</span>
  ))}
  {hasMore && <button>+{remaining} more</button>}
</div>

// ❌ WRONG: Labeled spec sheet
<div>
  <strong>Service Options:</strong> Delivery, Takeout
  <strong>Parking:</strong> Street, Garage
</div>
```

### 5. Map Tile Constraint

```tsx
// ✅ CORRECT: Small, reference-only
<MapTile coordinates={coords} merchantName={name} />

// ❌ WRONG: Hero-sized with CTA
<MapTile size="large">
  <Button>Get Directions</Button>
</MapTile>
```

---

## Testing with Mock Data

Three scenarios are provided in `lib/mock-data.ts`:

### Scenario A — Fully Curated
```tsx
import { scenarioA_FullyCurated } from '@/lib/mock-data';

<MerchantPage merchant={scenarioA_FullyCurated} />
```

### Scenario B — Editorial Lite
```tsx
import { scenarioB_EditorialLite } from '@/lib/mock-data';

<MerchantPage merchant={scenarioB_EditorialLite} />
```

### Scenario C — Baseline
```tsx
import { scenarioC_Baseline } from '@/lib/mock-data';

<MerchantPage merchant={scenarioC_Baseline} />
```

---

## PR Review Process

### Before Opening PR

1. **Run the checklist:**
   - See `merchant-page-implementation-checklist.md`
   - Verify all 11 sections pass

2. **Test all 3 scenarios:**
   - A: Fully curated (all tiers)
   - B: Editorial lite (no curator note)
   - C: Baseline (minimal data)

3. **Mobile pass:**
   - Actions wrap cleanly
   - Instagram stays single-line
   - No scroll fatigue on first 1-2 screens

4. **Promotion drift check:**
   - Does it feel editorial or promotional?
   - If it feels like Google Maps, reject

### Using the Cursor Rule

The `.cursor/rules/merchant-page-review.mdc` file automatically applies when working with merchant components.

Open any file in `components/merchant/` and the rule activates, providing:
- Tier order enforcement
- Critical component rules
- PR approval checklist
- Code examples (✅ correct vs ❌ wrong)

---

## Common Pitfalls

### 1. Empty Containers

**Problem:** Component renders with padding/borders but no content

**Solution:** Add hard guards in component

```tsx
// Before
<div className="trust-block">
  {curatorNote && <p>{curatorNote.text}</p>}
</div>

// After
if (!curatorNote && !coverageSources?.length) {
  return null;
}
```

### 2. Tier Inversion

**Problem:** Components render out of order

**Solution:** Follow exact order in `MerchantPage.tsx`, never reorder

### 3. HoursCard Collapses

**Problem:** HoursCard doesn't render when hours are missing

**Solution:** Remove conditional wrapper, handle empty state inside component

### 4. Hero in Collage

**Problem:** Hero photo appears in collage grid

**Solution:** Filter hero by ID: `photos.filter(p => p.id !== heroPhoto.id)`

---

## Type Safety

All components use strict TypeScript types from `lib/types/merchant.ts`.

Key types:
- `MerchantData` — Complete merchant object
- `Hours` — Week schedule
- `OpenStatus` — Current open/closed state
- `CuratorNote` — Editorial voice
- `CoverageSource` — Press/media mentions
- `Attribute` — Service/amenity tags

---

## Styling Approach

- **Global styles:** `app/globals.css`
- **Component classes:** Semantic class names (`.hero-header`, `.trust-block`)
- **Tailwind utilities:** Used sparingly for layout/spacing
- **Brand colors:** `--saiko-red` (#D64541), `--saiko-blue` (#89B4C4)

---

## Deployment Checklist

Before deploying:

- [ ] Type check passes (`npm run type-check`)
- [ ] All 3 scenarios tested visually
- [ ] Mobile responsive verified
- [ ] PR checklist completed
- [ ] No linter errors introduced
- [ ] Tier order verified
- [ ] HoursCard always renders

---

## Questions?

See:
- `merchant-page-implementation-checklist.md` — PR review guide
- `saiko-merchant-data-hierarchy.md` — Data hierarchy spec
- `.cursor/rules/merchant-page-review.mdc` — Cursor rule for enforcement

---

*Saiko Maps · Implementation Guide · v1.0*
