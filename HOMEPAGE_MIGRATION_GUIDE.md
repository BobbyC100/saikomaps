# Homepage Migration & Rollback Guide

## 🔄 What Changed

### Files Replaced
- `/app/page.tsx` - Old homepage replaced with new watercolor design

### Files Added
- 21 new files (components, styles, docs, assets)

### Files Modified
- `/app/globals.css` - Added Inter Tight font + color palette (non-breaking)

---

## ⏮️ How to Rollback (if needed)

### Option 1: Restore Old Homepage Only

If you want to keep the components but restore the old homepage:

```bash
# The old homepage content:
# - Simple hero with "Share places worth finding"
# - Link to /maps/new
# - GlobalHeader and GlobalFooter
```

Create this file as `/app/page-old-backup.tsx`:
```typescript
'use client'

import Link from 'next/link'
import { GlobalHeader } from '@/components/layouts/GlobalHeader'
import { GlobalFooter } from '@/components/layouts/GlobalFooter'

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <GlobalHeader variant="default" />
      <main className="flex-1 max-w-6xl mx-auto px-8 pt-16 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h1 className="text-5xl lg:text-6xl font-bold text-[#1A1A1A] leading-tight mb-6">
              Share places<br />
              <span style={{ color: '#E07A5F' }}>worth finding.</span>
            </h1>
            <p className="text-xl text-[#6B6B6B] mb-10 max-w-md">
              Create cool, personal maps in minutes. Pick a vibe, drop your spots, share the link.
            </p>
            <Link 
              href="/maps/new" 
              className="inline-block px-8 py-4 bg-[#E07A5F] text-white font-bold text-lg hover:bg-[#D06A4F] transition-colors"
              style={{ borderRadius: '2px' }}
            >
              Start a Map
            </Link>
          </div>
        </div>
      </main>
      <GlobalFooter variant="standard" />
    </div>
  )
}
```

Then swap the files:
```bash
mv app/page.tsx app/page-watercolor.tsx
mv app/page-old-backup.tsx app/page.tsx
```

### Option 2: Complete Rollback

If you want to completely remove the homepage integration:

```bash
# 1. Restore old homepage
mv app/page-old-backup.tsx app/page.tsx

# 2. Remove new files
rm -rf components/homepage/
rm app/homepage.module.css
rm public/kurt-watercolor-map.png

# 3. Remove documentation
rm HOMEPAGE_*.md
rm docs/homepage-*.md

# 4. Remove test script
rm scripts/test-homepage-integration.sh

# 5. Revert globals.css changes (optional)
# Edit app/globals.css and remove:
# - Inter Tight font import line
# - Homepage color palette section
```

### Option 3: Keep Both (A/B Testing)

Keep both homepages and create a route group:

```bash
# 1. Rename current homepage
mv app/page.tsx app/(marketing)/watercolor/page.tsx

# 2. Restore old homepage
mv app/page-old-backup.tsx app/(marketing)/classic/page.tsx

# 3. Create a router in app/page.tsx
# Use redirect logic or random assignment
```

---

## 🔀 How to Switch Homepage Styles

### Switch Back to Old Design
```bash
git stash  # Save your changes
git checkout HEAD~1 app/page.tsx  # Get old homepage
```

### Switch to Watercolor Design
```bash
# Copy the new homepage back
# (it's already there!)
```

---

## 🛠️ How to Modify the New Homepage

### Change Hero Background
Replace `/public/kurt-watercolor-map.png` with your image:
```bash
cp your-image.png public/kurt-watercolor-map.png
```

### Change Brand Text
Edit `/components/homepage/Hero.tsx`:
```typescript
<div className={styles.brand}>Your Brand Name</div>
<div className={styles.location}>Your City</div>
```

### Change Sections
Edit `/app/page.tsx` - modify the arrays:
```typescript
const neighborhoods = [ /* your data */ ]
const categories = [ /* your data */ ]
```

### Change Footer
Edit `/components/homepage/HomepageFooter.tsx`

### Change Colors
Edit `/app/globals.css` - modify the CSS variables:
```css
:root {
  --parchment: #F5F0E1;  /* Change these */
  --warm-white: #FFFDF7;
  --charcoal: #36454F;
  --khaki: #C3B091;
  --leather: #8B7355;
}
```

---

## 🔄 Migration to Dynamic Data

### Step 1: Create API Route
```typescript
// app/api/homepage/route.ts
export async function GET() {
  const neighborhoods = await db.neighborhood.findMany({
    where: { featured: true },
    include: { _count: { select: { places: true } } }
  })
  
  return Response.json({ neighborhoods })
}
```

### Step 2: Update Page to Fetch Data
```typescript
// app/page.tsx
async function getHomeData() {
  const res = await fetch('/api/homepage', { cache: 'no-store' })
  return res.json()
}

export default async function Home() {
  const data = await getHomeData()
  // Use data.neighborhoods instead of hardcoded array
}
```

### Step 3: Map Database Schema
```typescript
const neighborhoods = data.neighborhoods.map(n => ({
  name: n.name,
  count: n._count.places,
  imageUrl: n.imageUrl || defaultImage,
  href: `/explore?neighborhood=${n.slug}`
}))
```

---

## 📊 Integration Impact Analysis

### What's Safe to Change
✅ Content in `/app/page.tsx` (neighborhoods, categories)
✅ Styles in any `.module.css` file
✅ Component props and interfaces
✅ Colors in `/app/globals.css`
✅ Images in `/public/`

### What Affects Other Pages
⚠️ Changes to `/app/globals.css` (global scope)
⚠️ Changes to existing layout components
⚠️ Changes to shared color variables

### What's Completely Isolated
✅ Everything in `/components/homepage/`
✅ `/app/homepage.module.css`
✅ `/public/kurt-watercolor-map.png`
✅ All documentation files

---

## 🧪 Testing Changes

### Test Homepage Only
```bash
npm run dev
# Visit http://localhost:3000
```

### Test Other Routes Still Work
```bash
npm run dev
# Visit:
# - http://localhost:3000/explore
# - http://localhost:3000/map/[any-map]
# - http://localhost:3000/admin
```

### Test Build
```bash
npm run build
npm run start
```

---

## 📝 Customization Examples

### Example 1: Add More Neighborhoods
```typescript
// In app/page.tsx
const neighborhoods = [
  ...existing,
  {
    name: 'Silver Lake',
    count: 42,
    imageUrl: 'https://...',
    href: '/explore?neighborhood=silver-lake'
  }
]
```

### Example 2: Change Grid Layout
```css
/* In app/homepage.module.css */
.neighborhoodGrid {
  grid-template-columns: repeat(3, 1fr); /* Was 4 */
}
```

### Example 3: Add Loading State
```typescript
// In app/page.tsx
export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HomepageContent />
    </Suspense>
  )
}
```

---

## 🆘 Troubleshooting

### Homepage looks broken
1. Check `/public/kurt-watercolor-map.png` exists
2. Check `/app/globals.css` has Inter Tight font
3. Check all imports in `/app/page.tsx`
4. Run `./scripts/test-homepage-integration.sh`

### Fonts look wrong
1. Check Google Fonts are loading (Network tab)
2. Verify Inter Tight in globals.css
3. Verify Libre Baskerville in layout.tsx

### Colors are off
1. Check CSS variables in globals.css
2. Check component CSS modules
3. Clear browser cache

### Links don't work
1. Update href values in page.tsx
2. Ensure target routes exist
3. Check Next.js routing

---

## 📞 Support

**Documentation:**
- Component README: `/components/homepage/README.md`
- Architecture: `/docs/homepage-architecture.md`
- Overview: `/HOMEPAGE_INTEGRATION_OVERVIEW.md`

**Common Issues:**
See troubleshooting section above

**Need to Rollback:**
See rollback instructions at top of this file

---

**Remember:** All changes are in isolated components. Your existing app is safe! 🎉
