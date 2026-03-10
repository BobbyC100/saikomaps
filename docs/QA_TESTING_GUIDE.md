# 🧪 QA Testing Guide — Where to Test

**Your Staging URL**: https://saikomaps.com

*(Note: Since you push directly to main, your production site IS your staging. Consider creating a `staging` branch for future deployments)*

---

## Quick Start QA

### Step 1: Open These Test Pages

Test the Gallery Gap Fill feature on these URLs:

#### 📸 Scenario A: Gallery + No Companions (QuietCard Test)
Find pages with:
- Multiple photos (Gallery card)
- No phone number
- No Instagram/website

**How to find**: Browse your maps, look for restaurant pages with photo galleries but minimal contact info.

**What to look for**:
- After the Gallery card (4 columns wide)
- You should see a **subtle grid pattern card** (2 columns)
- It should be barely noticeable (very quiet visual)
- Should not draw your eye

**Expected Visual**:
```
[Gallery────────────] [Quiet──]  ← Look for this
[AlsoOn────────────────────────]
```

---

#### 📞 Scenario B: Gallery + Phone (Reorder Test)
Find pages with:
- Multiple photos (Gallery card)
- Phone number present

**What to look for**:
- Phone card should appear **immediately after Gallery**
- Should be span-2 (2 columns)
- Should feel natural (not jarring)

**Expected Visual**:
```
[Gallery────────────] [Phone──]  ← Phone pulled up
[AlsoOn────────────────────────]
```

---

#### 📱 Scenario C: Gallery + Instagram (Reorder Test)
Find pages with:
- Multiple photos
- Instagram handle present

**What to look for**:
- Links/Instagram card after Gallery
- Natural positioning
- No gaps before AlsoOn

---

#### 🍽️ Scenario D: Gallery + Vibe/Menu (Natural Fill Test)
Find pages with:
- Multiple photos
- Vibe tags or menu items

**What to look for**:
- **NO** QuietCard should appear
- Vibe or Menu card naturally fills space
- Normal grid flow

---

#### 📝 Scenario E: No Gallery (No Intervention Test)
Find pages with:
- No photo gallery (just hero photo)
- Rich content (hours, description, etc.)

**What to look for**:
- **NO** QuietCard anywhere
- Normal card layout
- No unexpected gaps

---

## Step 2: Testing Checklist

For each page you test:

### Desktop Testing
- [ ] **Chrome**: Open page, check layout
- [ ] **Safari**: Check visual consistency
- [ ] **Firefox**: Verify grid rendering

### Mobile Testing
- [ ] **iPhone size** (375px): Resize browser to mobile
- [ ] **Landscape** (667px): Check horizontal layout
- [ ] **Tablet** (768px): Verify mid-size breakpoints

### QuietCard Verification (Only on Scenario A pages)
- [ ] Is the pattern **barely visible**?
- [ ] Does it blend with the background?
- [ ] Does it have **no hover effects**?
- [ ] Does it feel like "background texture" not a "card"?

### Console Check
On each page:
1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Look for: `✓ System B layout validation passed`
4. Should see **no errors**

---

## Step 3: Document Results

In the file `STAGING_QA_GALLERY_GAP_FILL.md`, check off boxes as you test:

```markdown
- [x] Page: [Restaurant Name] - Gallery + AlsoOn
  - [x] Desktop Chrome - QuietCard visible and subtle
  - [x] Mobile 375px - Layout correct
  - [x] Console clean
```

---

## Example Test Flow

1. **Go to**: https://saikomaps.com
2. **Click**: Any map
3. **Click**: A restaurant with photos
4. **Check**: Does it have a gallery? Phone? Instagram?
5. **Test**: Based on scenario (see above)
6. **Verify**: Layout looks correct
7. **Console**: Check for validation message
8. **Document**: Check box in QA doc

---

## What Good Looks Like

### ✅ PASS Examples

**QuietCard (Scenario A)**:
- Subtle grid pattern, barely visible
- Blends with parchment background
- Doesn't draw attention
- Fills 2-column gap smoothly

**Phone Reorder (Scenario B)**:
- Phone card appears right after Gallery
- Feels natural, not "jumped"
- No visual jank
- Grid flows smoothly

**Natural Fill (Scenario D)**:
- Vibe/Menu card fits perfectly
- NO QuietCard appears
- Clean layout

---

### ❌ FAIL Examples

**QuietCard Issues**:
- Too prominent (draws eye)
- Pattern too dark/visible
- Looks interactive
- Creates visual hierarchy

**Reorder Issues**:
- Card appears in wrong position
- Span changed (not 2 columns)
- Multiple cards reordered
- Visual jank/jumping

**Layout Issues**:
- Cards overlap
- Unexpected gaps
- Cards out of order
- Console errors

---

## Quick Command Reference

### Find Gallery-Heavy Pages
```sql
-- If you have database access:
SELECT name, slug 
FROM places 
WHERE jsonb_array_length(photo_urls) > 1
LIMIT 10;
```

### Check Console Validation
```javascript
// In browser console on any place page:
// You should see automatically:
"✓ System B layout validation passed"
```

---

## When You're Done

1. Fill out all checkboxes in `STAGING_QA_GALLERY_GAP_FILL.md`
2. Take screenshots of key scenarios
3. Note any issues or edge cases
4. Request CTO production sign-off

---

## Need Help?

**Can't find test pages?**
- Just browse your existing maps
- Look at 5-10 different restaurant pages
- Mix of photo-heavy and text-heavy pages

**Not sure what to look for?**
- Focus on: Does the layout look broken? (It shouldn't)
- QuietCard should be invisible unless you're looking for it
- Reordered cards should feel natural

**Console errors?**
- Take a screenshot
- Note which page
- Document in QA checklist

---

## Summary

**Where**: https://saikomaps.com (your live site)  
**What**: Browse 8-10 restaurant pages with varying content  
**Check**: Layout looks good, QuietCard is subtle, console is clean  
**Document**: Check boxes in STAGING_QA_GALLERY_GAP_FILL.md  
**When done**: Request CTO production sign-off

**Time needed**: 30-45 minutes for thorough testing

---

**Start here**: https://saikomaps.com → Pick a map → Test 5-10 places
