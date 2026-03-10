# New Bento Grid Cards Implementation Summary

**Date**: February 16, 2026  
**Status**: ✅ Components Created, Ready for Data Integration

---

## Components Implemented

### 1. TipsCard (Tier C)
**File**: `components/merchant/TipsCard.tsx` + `.module.css`

**Purpose**: Insider advice for visitors (booking, parking, ordering, timing)

**Props**:
```typescript
interface TipsCardProps {
  tips: string[];
  span?: number; // Default: 3
}
```

**Design**:
- Khaki bullets (•) using `::before` pseudo-element
- 12px font, 1.7 line-height for readability
- 8px gap between tips
- Warm white background (#FFFDF7)

**Data Source**: 
- Already available: `location.tips` from database
- Renders when `tips` array exists and has items

---

### 2. MenuCard (Tier C)
**File**: `components/merchant/MenuCard.tsx` + `.module.css`

**Purpose**: Menu highlights with prices

**Props**:
```typescript
interface MenuItem {
  name: string;
  price?: string;
  description?: string;
}

interface MenuCardProps {
  items: MenuItem[];
  span?: number; // Default: 3
}
```

**Design**:
- Name/price on same line (flexbox with space-between)
- Optional description below (10px, lighter)
- Shows first 6 items max
- Price in leather color (#8B7355)

**Data Source**: 
- **TODO**: Add `menuItems` field to database
- Future: Menu scraper pipeline

---

### 3. WineCard (Tier C)
**File**: `components/merchant/WineCard.tsx` + `.module.css`

**Purpose**: Wine program details

**Props**:
```typescript
interface WineCardProps {
  focus?: string;
  regions?: string[];
  priceRange?: string;
  sommelier?: string;
  description?: string;
  span?: number; // Default: 3
}
```

**Design**:
- Focus statement in Libre Baskerville italic
- Notable regions list
- Price range
- Optional sommelier credit

**Data Source**: 
- **TODO**: Add wine fields to database
- Future: Wine list scraper or manual entry

---

### 4. AlsoOnCard (Upgraded)
**File**: `components/merchant/AlsoOnCard.tsx` + `.module.css` (REPLACED)

**Purpose**: Rich map cards showing where this place appears

**Props**:
```typescript
interface MapItem {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  creatorName: string;
  description?: string | null;
  placeCount?: number;
  authorType?: 'saiko' | 'user';
}
```

**Design Changes**:
- **Before**: Simple list with 36×36px thumbnails
- **After**: Rich 2×1 horizontal cards with:
  - 140×80px hero image (left side)
  - "MAP · X PLACES" type label
  - Title (Libre Baskerville italic, 14px)
  - Description (optional, 2-line clamp)
  - Attribution ("Curator Pick" badge or "By @username")
  - 2px khaki border (vs 1px on place cards)
  - Hover state (lift + shadow)

**Data Updates**:
- Updated API (`/api/places/[slug]`) to include:
  - `placeCount` - Count of places in each map
  - `authorType` - 'saiko' or 'user' (based on email domain)
  - `description` - TODO: Add to lists table
- Updated interface in page component

---

## Layout Integration

### Current Page Structure (Updated)

```tsx
<HeroSection />
<ActionStrip />

<div className="bento-grid"> {/* 6-column grid */}
  {/* Tier A: Priority Zone */}
  <HoursCard span={2} />
  <DetailsCard span={4} />
  
  {/* Tier B: Editorial */}
  <CoverageCard span={3-5} /> {/* Dynamic sizing */}
  <GalleryCard span={3 or 6} />
  <CuratorCard span={3} />
  
  {/* Tier C: Details & Discovery (NEW) */}
  <TipsCard span={3} /> {/* NEW */}
  <MenuCard span={3} /> {/* NEW - TODO: Add data */}
  {/* OR */}
  <WineCard span={3} /> {/* NEW - TODO: Add data */}
  
  {/* Tier D: Context & Maps */}
  <VibeCard span={6} />
  <AlsoOnCard span={6} /> {/* UPGRADED */}
</div>
```

---

## API Changes

### Updated Endpoint: `/api/places/[slug]`

**File**: `app/api/places/[slug]/route.ts`

**Changes**:
```typescript
const appearsOn = await Promise.all(publishedMapPlaces.map(async (mp) => {
  const placeCount = await db.mapPlaces.count({
    where: { mapId: mp.lists!.id }
  });
  
  return {
    id: mp.lists!.id,
    title: mp.lists!.title,
    slug: mp.lists!.slug,
    coverImageUrl: mp.lists!.coverImageUrl,
    creatorName: mp.lists!.users?.name || ...,
    description: null, // TODO: Add to lists table
    placeCount,
    authorType: mp.lists!.users?.email?.includes('@saiko.com') ? 'saiko' : 'user',
  };
}));
```

**New Fields**:
- `placeCount` - Dynamically counted from `mapPlaces` table
- `authorType` - Determined by email domain
- `description` - Placeholder (needs database schema update)

---

## Data Pipeline TODOs

### 1. Menu Data
**Goal**: Populate MenuCard with real menu items

**Steps**:
1. Add `menuItems` JSON field to `places` table:
   ```sql
   ALTER TABLE places ADD COLUMN menu_items JSONB;
   ```

2. Create menu scraper (future):
   - Input: Website URL or menu PDF
   - Output: Array of `{ name, price, description }`
   - Manual entry tool for short-term

3. Update API to include `menuItems` in response

### 2. Wine Data
**Goal**: Populate WineCard with wine program details

**Steps**:
1. Add wine fields to `places` table:
   ```sql
   ALTER TABLE places 
     ADD COLUMN wine_focus TEXT,
     ADD COLUMN wine_regions TEXT[],
     ADD COLUMN wine_price_range TEXT,
     ADD COLUMN wine_sommelier TEXT,
     ADD COLUMN wine_description TEXT;
   ```

2. Manual entry or scrape from website

3. Update API to include wine fields

### 3. Map Descriptions
**Goal**: Add descriptions to maps for rich cards

**Steps**:
1. Add `description` field to `lists` table:
   ```sql
   ALTER TABLE lists ADD COLUMN description TEXT;
   ```

2. Backfill descriptions for existing maps (manual or AI-generated)

3. API already returns this field (currently null)

---

## Testing Checklist

### TipsCard
- [ ] Renders with 1 tip
- [ ] Renders with 5+ tips
- [ ] Bullets align properly
- [ ] Doesn't render when no tips
- [ ] Mobile responsive

### MenuCard
- [ ] Renders with prices
- [ ] Renders without prices
- [ ] Renders with descriptions
- [ ] Truncates at 6 items
- [ ] Name/price alignment
- [ ] Mobile responsive

### WineCard
- [ ] Renders with all fields
- [ ] Renders with partial fields
- [ ] Doesn't render when no data
- [ ] Italic focus statement renders
- [ ] Mobile responsive

### AlsoOnCard (Upgraded)
- [ ] Hero images load properly
- [ ] Placeholder grid pattern shows when no image
- [ ] "MAP · X PLACES" label displays correctly
- [ ] Curator Pick badge shows for Saiko maps
- [ ] User attribution shows for user maps
- [ ] Descriptions truncate at 2 lines
- [ ] Hover state works (lift + shadow)
- [ ] Mobile layout (narrower hero image)
- [ ] Links to `/map/[slug]` work
- [ ] Deduplicated to 3 maps max

---

## Design Tokens Used

All new cards follow the Field Notes palette:

```css
--warm-white: #FFFDF7;    /* Card backgrounds */
--charcoal: #36454F;      /* Primary text */
--khaki: #C3B091;         /* Labels, accents */
--leather: #8B7355;       /* Links, secondary text */
```

**Typography**:
- Labels: 9px uppercase, 1.5px letter-spacing
- Editorial (Vibe, Wine focus): Libre Baskerville italic
- Body text: System sans-serif
- Spacing: 12-16px padding, 12px border-radius

---

## Next Steps

1. **Test in browser**: Visit `/place/seco` or any place page
2. **Add menu data**: Choose a few places and manually add menu items
3. **Add wine data**: Choose wine-focused places and add wine info
4. **Add map descriptions**: Update a few maps with descriptions
5. **Verify API changes**: Check that `placeCount` and `authorType` appear correctly
6. **Mobile testing**: Test responsive layouts on mobile devices
7. **Create data entry tools**: Build admin UI for menu/wine entry

---

## Files Modified

**New Files**:
- `components/merchant/TipsCard.tsx`
- `components/merchant/TipsCard.module.css`
- `components/merchant/MenuCard.tsx`
- `components/merchant/MenuCard.module.css`
- `components/merchant/WineCard.tsx`
- `components/merchant/WineCard.module.css`

**Modified Files**:
- `components/merchant/AlsoOnCard.tsx` (upgraded)
- `components/merchant/AlsoOnCard.module.css` (upgraded)
- `app/api/places/[slug]/route.ts` (added placeCount, authorType)
- `app/(viewer)/place/[slug]/page.tsx` (added new cards, updated interface)

---

**Status**: ✅ Ready for testing and data integration
