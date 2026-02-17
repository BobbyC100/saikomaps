# Place Page Layout - Lock Span Rules & Best Practices

## 🔒 CRITICAL: Span-1 = Quiet Only (NEVER VIOLATE)

### Hard Rule
**Span-1 cards MUST be Quiet cards only. No functional cards (Tips, Vibe, Curator, Menu, etc.) may ever render at span-1.**

### Why This Matters
- Span-1 is too narrow for any functional content to be readable
- Violating this creates "janky layouts" where text/content is crushed
- This is enforced at 3 layers (see below) but MUST remain a design constraint

### Enforcement Layers

#### Layer 1: Resolver (Design Time)
```typescript
const CONSTRAINTS = {
  SPAN_1_QUIET_ONLY: true,  // Structural rule, never violate
  // ... other constraints
};
```

The resolver never generates span-1 cards for functional types. It only uses span-1 for Quiet fills.

#### Layer 2: Validator (Runtime)
```typescript
function validateRow(row: RowConfig): boolean {
  // Rule 2: Span-1 = Quiet only
  const hasNonQuietSpan1 = row.cards.some(
    card => card.span === 1 && card.type !== 'quiet'
  );
  if (hasNonQuietSpan1) return false;
  
  return true;
}
```

Catches any violation during validation. In dev: throws error. In prod: uses fallback.

#### Layer 3: Renderer (Final Safety Net)
```typescript
const renderCard = (config: CardConfig, ...) => {
  // CRITICAL: Span-1 = Quiet ONLY (defensive rendering)
  if (config.span === 1 && config.type !== 'quiet') {
    console.error(`❌ Invalid card: ${config.type} with span-1`);
    return <QuietCard variant="grid" span={1} />;
  }
  // ... rest of rendering
}
```

Converts any illegal span-1 cards to Quiet before rendering.

### Adding New Card Types

When adding a new card type to the system:

1. **NEVER allow it at span-1** - Only Quiet cards use span-1
2. **Define minimum span** - What's the smallest readable width? (Usually 2 or 3)
3. **Add to CardType union** - Update the type definition
4. **Add to resolver** - Include in row resolution logic
5. **Add to renderer** - Add case to renderCard switch statement
6. **Test validation** - Verify validator catches span-1 violations

### Example: Adding a "Badges" Card

```typescript
// ❌ WRONG: Allowing span-1
function getBadgesVariant(count: number) {
  if (count === 1) return { variant: 'single', span: 1 }; // ILLEGAL!
  return { variant: 'standard', span: 2 };
}

// ✅ CORRECT: Minimum span-2
function getBadgesVariant(count: number) {
  if (count === 1) return { variant: 'compact', span: 2 }; // Minimum 2
  if (count <= 3) return { variant: 'standard', span: 2 };
  return { variant: 'wide', span: 3 };
}
```

---

## 🎴 Also On Card Spec (Stacked Image Layout)

### Layout Structure
```
┌────────────────────────┐
│   Image Block (Top)    │ ← Fixed ratio, full width
│   120px height         │
├────────────────────────┤
│   Details Block        │ ← Content below
│   - Type label         │
│   - Title (2 line max) │
│   - Description        │
│   - Attribution        │
└────────────────────────┘
```

### Image Fallback
If `coverImageUrl` is null or missing:
- ✅ Render Quiet grid pattern (not blank)
- ✅ Use same khaki grid as Quiet cards
- ✅ Maintains visual consistency

Current implementation (correct):
```tsx
{map.coverImageUrl ? (
  <div className={styles.heroImageBg} 
       style={{ backgroundImage: `url(${map.coverImageUrl})` }} />
) : (
  <div className={styles.heroImagePlaceholder}>
    <svg className={styles.gridPattern} viewBox="0 0 120 80">
      {/* Grid pattern SVG */}
    </svg>
  </div>
)}
```

### Title Clamping
```css
.title {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;  /* ← Max 2 lines */
  -webkit-box-orient: vertical;
}
```

**Why:** Prevents tall junk rows when titles are very long.

---

## 📊 Also On Data Validation

### Data Flow
```
appearsOn (raw from API)
  ↓ dedupe by slug
appearsOnDeduped (max 3)
  ↓ filter placeCount > 0
appearsOnRenderable (valid only)
  ↓ render
AlsoOnCard component
```

### Validation Steps

#### 1. Deduplication (by slug)
```typescript
const seenSlugs = new Set<string>();
const appearsOnDeduped = appearsOn
  .filter((item) => {
    if (seenSlugs.has(item.slug)) return false;
    seenSlugs.add(item.slug);
    return true;
  })
  .slice(0, 3); // Max 3
```

**Why:** Prevents duplicate maps from showing (same map added to multiple collections).

#### 2. Place Count Validation
```typescript
const appearsOnRenderable = appearsOnDeduped.filter(
  (m) => typeof m.placeCount === 'number' && m.placeCount > 0
);
```

**Why:** 
- Filters out maps with missing or invalid place counts
- Ensures only maps with actual places render
- `placeCount: 0` is intentional (empty map) - these are filtered out
- `placeCount: undefined` is a data error - these are filtered out

#### 3. Component-Level Safety
```typescript
export function AlsoOnCard({ maps }: AlsoOnCardProps) {
  if (!maps || maps.length === 0) return null;

  // Additional safety: filter out any maps without valid placeCount
  const validMaps = maps.filter(
    (map) => typeof map.placeCount === 'number' && map.placeCount > 0
  );

  if (validMaps.length === 0) return null;
  
  // ... render
}
```

**Defense in depth:** Component validates again in case resolver passes bad data.

### Place Count Display
```tsx
<div className={styles.typeLabel}>
  MAP · {map.placeCount} {map.placeCount === 1 ? 'PLACE' : 'PLACES'}
</div>
```

**Grammar:** Singular "PLACE" when count is 1, plural "PLACES" otherwise.

---

## 🚫 Google Fonts Anti-Pattern

### ❌ WRONG: Font Link in Page Component
```tsx
// app/(viewer)/place/[slug]/page.tsx
export default function PlacePage() {
  return (
    <div>
      <link href="https://fonts.googleapis.com/..." rel="stylesheet" />
      {/* page content */}
    </div>
  );
}
```

**Problems:**
- Causes hydration quirks
- Duplicates font loading on every navigation
- Breaks font preloading optimizations
- Not how Next.js expects fonts to be loaded

### ✅ CORRECT: Font in Layout
```tsx
// app/layout.tsx
import { Libre_Baskerville } from "next/font/google";

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-libre",
});

export default function RootLayout({ children }) {
  return (
    <html className={libreBaskerville.variable}>
      <body>{children}</body>
    </html>
  );
}
```

**Benefits:**
- Single font load for entire app
- Proper preloading
- No hydration issues
- CSS variables available everywhere

### Using the Font
```css
.myText {
  font-family: var(--font-libre);
  /* OR */
  font-family: 'Libre Baskerville', Georgia, serif;
}
```

---

## ⚙️ Dev Command Fix (npm run dev)

### Current Problem
```bash
npm run dev
# Error: /usr/local/bin/node: --r= is not allowed in NODE_OPTIONS
```

**Root cause:** `scripts/load-env.js` is trying to use `-r` flag in NODE_OPTIONS, which is not allowed in newer Node versions.

### Fix Options

#### Option 1: Remove NODE_OPTIONS from load-env.js
```javascript
// scripts/load-env.js
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

// Don't try to set NODE_OPTIONS here
// Just load env vars and let Next.js handle the rest
```

#### Option 2: Update package.json dev script
```json
{
  "scripts": {
    "dev": "next dev",  // Remove the node -r wrapper
    "dev:old": "node -r ./scripts/load-env.js next dev"
  }
}
```

Next.js already loads `.env` and `.env.local` automatically, so the custom script may not be needed.

#### Option 3: Use dotenv-cli
```bash
npm install -D dotenv-cli

# package.json
{
  "scripts": {
    "dev": "dotenv -e .env -e .env.local -- next dev"
  }
}
```

### Recommended: Just Use Next.js Built-in
Next.js 9.4+ loads env files automatically in this order:
1. `.env.local`
2. `.env.development` (if NODE_ENV=development)
3. `.env`

No custom script needed unless you have special requirements.

---

## 📋 Checklist for Future Changes

### Before Modifying Layout System

- [ ] Review span-1 = Quiet only rule
- [ ] Check if new card type has minimum span defined
- [ ] Verify validation catches violations
- [ ] Test renderer defensive behavior
- [ ] Update type definitions
- [ ] Add to row resolver logic
- [ ] Document in this file

### Before Modifying Also On

- [ ] Ensure image fallback renders Quiet pattern
- [ ] Verify title clamping (max 2 lines)
- [ ] Check placeCount validation
- [ ] Test deduplication logic
- [ ] Verify empty state handling

### Before Adding Fonts

- [ ] Add to app/layout.tsx (NOT page components)
- [ ] Use Next.js font loader
- [ ] Define CSS variable
- [ ] Document font usage

### Before Changing Dev Setup

- [ ] Test npm run dev works
- [ ] Verify env vars load correctly
- [ ] Check for Node version compatibility
- [ ] Document any custom setup

---

## 🎯 Summary: Non-Negotiable Rules

1. **Span-1 = Quiet ONLY** - Never violate, enforced at 3 layers
2. **Also On images must have fallback** - Quiet pattern, not blank
3. **Title clamping required** - Max 2 lines to prevent tall rows
4. **Place count must be validated** - Filter out 0 and undefined
5. **Fonts go in layout** - Never in page components
6. **Dev command must work** - npm run dev should be clean

These rules prevent "million janky layouts later" scenarios.

---

**Last Updated:** 2026-02-16  
**Status:** Production Rules - Do Not Regress
