# Instagram Admin UI - Quick Guide

## URL
```
http://localhost:3000/admin/instagram
```

## What I Fixed

### Problem
- Saves weren't persisting to database
- Places reappeared after refresh

### Solution
1. **Added better error handling** - API now logs all saves to terminal
2. **Auto-removes saved places** - Once saved, place disappears from list
3. **Success toasts** - Green notification shows "✅ Saved @handle"
4. **Error toasts** - Red notification if save fails
5. **Database disconnect** - Proper cleanup after each operation

## How to Use

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Open Admin UI
```
http://localhost:3000/admin/instagram
```

### 3. Filter by Quality
- **Tier 1 Only** (433 places) - Founder picks, verified sources ⭐
- **Tier 2 Only** (410 places) - Editorial sources
- **All LA County** (1,176 places)

### 4. For Each Place

1. **Click website link** → Look for Instagram in footer/social links
2. **Click Google Maps** → Check business profile for Instagram
3. **Type Instagram handle** (@ is optional)
4. **Hit Save**
5. **Place auto-removes** from list ✅

## Debugging

### Check if saves are working

**Terminal running `npm run dev` will show:**
```
[Instagram API] Received request: { canonical_id: '...', instagram_handle: 'example' }
[Instagram API] Successfully updated: { name: 'Restaurant Name', instagram_handle: 'example' }
```

**Check database:**
```bash
node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().\$queryRaw\`SELECT name, instagram_handle, updated_at FROM golden_records WHERE instagram_handle IS NOT NULL ORDER BY updated_at DESC LIMIT 5\`.then(r=>console.table(r))"
```

### If saves still don't work

1. **Check browser console** - Look for error messages
2. **Check terminal** - Look for `[Instagram API]` logs
3. **Verify database connection** - Run health check:
   ```bash
   npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM golden_records;"
   ```

## Tips for Finding Handles

### 1. Website Footer
Most restaurants link Instagram in footer:
```
Look for: 🔗 Social media icons
Usually: @restaurantname or @restaurantla
```

### 2. Google Maps Business Profile
Click "Google Maps" link → Look for:
- Instagram icon in business profile
- "Follow us" section
- Posted photos (often tagged with @handle)

### 3. Common Patterns
Try these variations:
- `@restaurantname`
- `@restaurantla`
- `@restaurantlosangeles`
- `@restaurantdtla` (for downtown)
- `@restaurantofficiaI` (note: lowercase L or capital I)

### 4. Multi-location chains
- Check if they have location-specific handles
- Example: `@abbotspizza` (main) vs `@abbotspizzavenice` (location)

## Progress Tracking

### Current State
```bash
# Check Tier 1/2 missing Instagram
node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().\$queryRaw\`SELECT COUNT(*) as total FROM golden_records g JOIN provenance p ON g.canonical_id = p.place_id WHERE p.source_tier IN (1, 2) AND g.instagram_handle IS NULL AND g.county = 'Los Angeles'\`.then(r=>console.log('Tier 1/2 missing IG:', r[0].total))"
```

### See Recent Saves
```bash
npm run merge:instagram  # Run after manual saves to see what stuck
```

## Workflow

**Recommended:** 20-30 minutes per session
1. Filter to **Tier 1 Only**
2. Save 20-30 handles
3. Take a break ☕
4. Repeat

**Goal:** Get Tier 1 coverage to 50%+ (currently ~5%)

## Next Steps After Manual Review

Once you've added handles manually:
1. Run merge script if needed: `npm run merge:instagram`
2. Check coverage: See "Progress Tracking" above
3. Export updated data: `npm run sync:places` (syncs to public site)
