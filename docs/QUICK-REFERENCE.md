# Merchant Page — Quick Reference

One-page reference for developers working with the merchant page implementation.

---

## Tier Order (Memorize This)

```
1. HeroHeader
2. PrimaryActionSet
3. InstagramConfidenceRow (conditional)
4. PhotoCollage (conditional)
5. VibeTagsRow (conditional)
6. TrustBlock (conditional)
7. HoursCard (ALWAYS)
8. AddressCard (conditional)
9. MapTile (conditional)
10. AttributesCard (conditional)
11. AlsoOnLists (conditional)
12. HouseCard (conditional)
```

---

## Component Rules (Gotchas)

### ⚠️ HoursCard ALWAYS Renders
```tsx
// ✅ CORRECT
<HoursCard hours={merchant.hours} />

// ❌ WRONG
{merchant.hours && <HoursCard hours={merchant.hours} />}
```

### ⚠️ Hero Excluded from Collage
```tsx
// ✅ CORRECT
<PhotoCollage photos={merchant.photos} heroPhotoId={merchant.heroPhoto.id} />

// Inside PhotoCollage:
const collagePhotos = photos.filter(p => p.id !== heroPhotoId);
```

### ⚠️ Instagram Slim (Not Button)
```tsx
// ✅ CORRECT: Lightweight row
<a className="instagram-row">...</a>

// ❌ WRONG: Heavy button
<Button variant="filled">Follow</Button>
```

### ⚠️ Attributes as Chips (Not Spec Sheet)
```tsx
// ✅ CORRECT
<span className="attribute-chip">Outdoor Seating</span>

// ❌ WRONG
<div><strong>Seating:</strong> Outdoor</div>
```

### ⚠️ Map Has No Directions Button
```tsx
// ✅ CORRECT: Reference-only
<MapTile coordinates={coords} merchantName={name} />

// ❌ WRONG: Has CTA
<MapTile>
  <Button>Get Directions</Button>
</MapTile>
```

---

## Collapse Logic

Every conditional component needs a guard:

```tsx
// InstagramConfidenceRow
if (!handle || handle.trim().length === 0) return null;

// PhotoCollage
if (collagePhotos.length === 0) return null;

// TrustBlock
if (!hasCurator && !hasCoverage) return null;

// AttributesCard
if (!attributes || attributes.length === 0) return null;

// AddressCard
if (!address) return null;

// MapTile
if (!coordinates) return null;
```

---

## Test Scenarios

```tsx
import {
  scenarioA_FullyCurated,
  scenarioB_EditorialLite,
  scenarioC_Baseline,
} from '@/lib/mock-data';

// Scenario A: All tiers render
<MerchantPage merchant={scenarioA_FullyCurated} />

// Scenario B: No curator note, coverage exists
<MerchantPage merchant={scenarioB_EditorialLite} />

// Scenario C: Minimal data
<MerchantPage merchant={scenarioC_Baseline} />
```

---

## Visual Weight Hierarchy

```
Heavy (Tier 0):  Primary actions (.action-button)
Medium:          Cards, hours, attributes
Light (Tier 1.5): Instagram row (.instagram-row)
```

---

## Files to Know

| File | What It Does |
|------|--------------|
| `components/merchant/MerchantPage.tsx` | Main assembly (tier order) |
| `lib/types/merchant.ts` | Type definitions |
| `lib/mock-data.ts` | Test scenarios A, B, C |
| `app/demo/page.tsx` | Visual testing page |
| `merchant-page-implementation-checklist.md` | PR review checklist |
| `.cursor/rules/merchant-page-review.mdc` | Cursor enforcement rule |

---

## PR Checklist (Before Merge)

- [ ] Tier order is exact
- [ ] HoursCard always renders
- [ ] No empty containers
- [ ] Hero excluded from collage
- [ ] Instagram is slim
- [ ] Attributes are chips
- [ ] Map is small, no CTA
- [ ] All 3 scenarios tested
- [ ] Mobile responsive
- [ ] Feels editorial, not promotional

---

## Common Mistakes

1. **Wrapping HoursCard in conditional** → Always render it
2. **Including hero in collage** → Filter by ID
3. **Styling Instagram like primary button** → Use slim row treatment
4. **Rendering attributes as labeled rows** → Use chips
5. **Adding Directions to MapTile** → Belongs in PrimaryActionSet
6. **Reordering tiers** → Order is locked, never change

---

## Questions?

- Checklist: `merchant-page-implementation-checklist.md`
- Data spec: `saiko-merchant-data-hierarchy.md`
- Dev guide: `IMPLEMENTATION.md`
- PR review: `PR-REVIEW-REPORT.md` (example)

---

*Quick Reference · v1.0*
