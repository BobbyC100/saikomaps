# Final Staging QA — Gallery Gap Fill

**CTO Status**: Approved for Production (pending QA completion)  
**Date**: Feb 16, 2026

---

## Test URL

**Local**: http://localhost:3000/place/seco

---

## QA Scenarios (5 checks)

### 1. QuietCard Visibility — Main Monitor
- [ ] Can you see the QuietCard **without DevTools highlight**?
- [ ] Is it to the **right of the Gallery**?
- [ ] Does it have a **faint textured pattern**?
- [ ] Is it approximately the **same height** as the Gallery?
- [ ] Does it feel **quiet** (not competing for attention)?

### 2. QuietCard Visibility — Different Brightness
Test on at least one of:
- [ ] Laptop screen (different brightness)
- [ ] Incognito/private browsing mode
- [ ] Different monitor
- [ ] Reduced screen brightness

**Check**: Can you still see it without straining?

### 3. Layout Integrity
- [ ] Gallery is **4 columns wide**
- [ ] QuietCard is **2 columns wide**
- [ ] They sit **side-by-side** on same row
- [ ] No overlap or weird spacing
- [ ] AlsoOn appears **below** on next row

### 4. Console Validation
- [ ] Open Console (Cmd+Option+I)
- [ ] See: `✓ System B layout validation passed`
- [ ] **No errors** (red text)

### 5. Visual Hierarchy Check
- [ ] QuietCard does NOT draw attention before:
  - [ ] Hours card
  - [ ] Description card
  - [ ] Vibe tags
  - [ ] Press/Coverage card
  - [ ] Gallery itself
- [ ] QuietCard feels like "background texture" not "content"

---

## Desktop Browser Testing

### Chrome
- [ ] QuietCard visible
- [ ] Height matches Gallery
- [ ] Pattern renders correctly
- [ ] No console errors

### Safari
- [ ] QuietCard visible
- [ ] Same visual quality as Chrome
- [ ] Pattern consistent

### Firefox
- [ ] QuietCard visible
- [ ] Layout consistent

---

## Mobile Breakpoint Testing

Resize browser window to test:

### 375px (iPhone)
- [ ] QuietCard responsive
- [ ] No horizontal overflow
- [ ] Pattern still visible

### 667px (Landscape)
- [ ] Layout maintains integrity
- [ ] QuietCard present

### 768px (Tablet)
- [ ] Mid-size behavior correct
- [ ] No unexpected wrapping

---

## Additional Test Pages (Optional)

Try a few more places to ensure no regressions:

- [ ] http://localhost:3000/place/budonoki
- [ ] http://localhost:3000/place/tacos-1986
- [ ] http://localhost:3000/place/redbird-downtown-los-angeles

Check:
- [ ] Pages without Gallery: No QuietCard appears
- [ ] Layout looks clean across different content
- [ ] No unexpected gaps or overlaps

---

## Pass Criteria

QuietCard implementation passes if:
- ✅ Visible without DevTools on multiple brightness levels
- ✅ Same height as Gallery (side-by-side on same row)
- ✅ Subtle (doesn't compete with content cards)
- ✅ No layout regressions
- ✅ Console validation passing

---

## Result

Once all checks pass, respond with:

**QA COMPLETE: PASS** or **QA COMPLETE: ISSUES FOUND**

If issues found, document:
- What scenario failed
- Screenshot if helpful
- Specific issue description

---

## After QA Passes

CTO will issue:
**CTO SIGN-OFF: Approved for Production**

Then:
1. Deploy to production
2. Monitor for 24-48 hours
3. Collect UX feedback
4. Consider pattern/tone refinements with Clement

---

**Status**: Ready for your QA testing  
**Estimated time**: 10-15 minutes  
**Next**: Refresh seco page and complete checklist above
