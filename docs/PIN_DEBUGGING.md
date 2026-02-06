# Field Notes Pin Debugging Guide

## Issue: Not Seeing Pins

### Understanding The Two Views

Field Notes has **two completely different map experiences**:

#### 1. LIST VIEW (Default)
```
┌─────────────────────────────────┐
│ Cover Map (decorative SVG)     │ ← Static, not interactive
│ • Small red dots                │
│ • No labels                     │
│ • No popups                     │
├─────────────────────────────────┤
│ Place Cards (bento grid)        │
│ Photo / Name / Category         │
│ ...                             │
└─────────────────────────────────┘
```

The cover map shows small decorative pins but **they don't click**.

#### 2. EXPANDED MAP VIEW (Interactive)
```
┌─────────────────────────────────┐
│                                 │
│   Google Maps                   │
│   🔴 Pin with label             │ ← Clickable!
│   🔴 Pin with label             │
│                                 │
├─────────────────────────────────┤
│ [Card] [Card] [Card] carousel  │
└─────────────────────────────────┘
```

This view has **interactive pins with popups**.

---

## How To See Interactive Pins

### Step 1: Navigate to Your Map
```
http://localhost:3000/map/[your-slug]
```

### Step 2: Open Expanded View
**Option A:** Click the decorative cover map at the top

**Option B:** Scroll to bottom and click the circular "Map" button

### Step 3: You Should See:
✅ Full-screen Google Maps  
✅ Red circular pins with labels below  
✅ Pins that scale on hover  
✅ Click pin → Bento Card popup appears  

---

## Troubleshooting

### Problem: I'm in expanded view but don't see pins

**Check 1: Browser Console (F12)**
Look for errors like:
- `projection is undefined`
- `map is not ready`
- `places is empty`

**Check 2: Do you have valid coordinates?**
Open browser console and run:
```javascript
// Check if places have coordinates
const places = document.querySelector('[data-places]');
console.log('Places:', places);
```

**Check 3: Is the map loaded?**
Do you see:
- Google Maps tiles loading?
- Zoom controls?
- Compass?

If NO → Check `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`

**Check 4: Inspect the DOM**
1. Open Dev Tools → Elements
2. Search for `data-pin-dot`
3. If found → Pins are rendering but might be positioned off-screen
4. Check the `left` and `top` values

---

## Common Issues

### Issue 1: "No pins at all"
**Cause:** Places don't have `latitude` and `longitude`

**Fix:** Check your data:
```sql
SELECT id, name, latitude, longitude FROM Place;
```

All places need valid coordinates.

---

### Issue 2: "Pins are off-screen"
**Cause:** Map projection not ready when pins calculate position

**Fix:** Already handled by checking `projection` in code. If this happens, it's a timing issue.

**Debug:**
```javascript
// In FieldNotesMapPins.tsx, add logging:
console.log('Pin positions:', pinPositions);
```

---

### Issue 3: "Pins don't show popup on click"
**Cause:** Popup component has an error

**Check:** Browser console for React errors

**Debug:** Look for:
- `place.status` is undefined?
- `place.photoUrl` is malformed?
- `place.name` is missing?

---

### Issue 4: "I only see the cover map pins"
**Cause:** You're in LIST VIEW, not EXPANDED MAP VIEW

**Fix:** Click the cover map or the Map toggle button to expand

---

## Quick Test

### Test 1: Open Expanded View
1. Go to map page
2. Click cover map at top
3. Do you see full-screen Google Maps? (YES/NO)

### Test 2: Check Places Data
1. Open browser console (F12)
2. Look for `[MAP] Loaded map data:` log
3. Do places have `latitude` and `longitude`? (YES/NO)

### Test 3: Check Pin Rendering
1. In expanded view
2. Right-click → Inspect
3. Search DOM for `data-pin-dot`
4. Found? (YES/NO)

### Test 4: Check Popup
1. If you see pins
2. Click a pin
3. Does popup appear? (YES/NO)

---

## Expected Behavior

### In List View:
- Small static red dots on cover map
- No labels, no hover, no click
- Click map → opens expanded view

### In Expanded View:
- Interactive Google Maps
- Red pins (14-18px) with labels centered below
- Hover → pin scales 1.15x
- Click → Bento Card popup with photo, info, status, buttons
- Click background → popup dismisses

---

## Code Locations

### Pin Rendering:
`/app/map/[slug]/components/field-notes/FieldNotesMapPins.tsx`
- Lines 108-216: Pin rendering loop
- Lines 62-83: Position calculation

### Popup Component:
`/app/map/[slug]/components/field-notes/BentoCardPopup.tsx`
- Lines 54-236: Bento Card layout (2-column grid)

### Expanded Map View:
`/app/map/[slug]/components/field-notes/ExpandedMapView.tsx`
- Lines 169-180: FieldNotesMapPins integration

---

## Still Not Working?

### Share This Info:
1. Which view are you in? (List / Expanded)
2. Do you see Google Maps tiles? (YES/NO)
3. Any console errors? (copy/paste)
4. Do places have coordinates? (check database)
5. What's in the DOM? (search for `data-pin-dot`)

### Quick Fix to Try:
1. Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
2. Clear browser cache
3. Restart dev server
4. Check `.env.local` has `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
