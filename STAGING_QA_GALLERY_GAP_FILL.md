# Staging QA Checklist — Gallery Gap Fill

**CTO Status**: 🟡 Approved for Staging (Conditional)  
**Blocker for Production**: Manual visual QA required  
**QA Owner**: [Assign]  
**Target Date**: [Set date]

---

## Pre-Production Requirements

### 1. Manual Visual QA (5-10 Real Pages)

Test the following scenarios on staging with real place data:

#### Scenario A: Gallery + No Companions (QuietCard Inserted)
- [ ] **Page 1**: Gallery + AlsoOn only (no Tier 4 cards)
  - [ ] QuietCard appears after Gallery (span-2)
  - [ ] QuietCard uses subtle grid pattern
  - [ ] No visual attention theft
  - [ ] Smooth grid flow (no gaps)
  
- [ ] **Page 2**: Gallery + Hours + Description only
  - [ ] QuietCard fills 2-col gap
  - [ ] Pattern remains subtle
  - [ ] No hierarchy introduced

**Expected Visual**:
```
[Hours-3] [Description-3]
[Gallery-4] [Quiet-2]  ← Subtle grid pattern, no interaction
[AlsoOn-6]
```

---

#### Scenario B: Gallery + Phone (Tier 4 Reorder)
- [ ] **Page 3**: Gallery with Phone present
  - [ ] Phone card reordered to follow Gallery
  - [ ] Original tier order preserved elsewhere
  - [ ] No cascade behavior
  - [ ] Phone span unchanged (span-2)

**Expected Visual**:
```
[Hours-3] [Description-3]
[Gallery-4] [Phone-2]  ← Phone pulled up from Tier 4
[AlsoOn-6]
```

---

#### Scenario C: Gallery + Links (Tier 4 Reorder)
- [ ] **Page 4**: Gallery with Instagram/Website links
  - [ ] Links card reordered to follow Gallery
  - [ ] Links span unchanged (span-2)
  - [ ] No displacement of higher-tier cards

**Expected Visual**:
```
[Vibe-2] [Description-3]
[Gallery-4] [Links-2]  ← Links pulled up from Tier 4
[AlsoOn-6]
```

---

#### Scenario D: Gallery + Menu/Wine (Tier 3 Natural Fill)
- [ ] **Page 5**: Gallery with Menu present (span-2)
  - [ ] Menu naturally fills 2-col gap
  - [ ] NO QuietCard inserted
  - [ ] NO reordering
  - [ ] Menu appears in natural tier order

- [ ] **Page 6**: Gallery with Wine present (span-2)
  - [ ] Wine naturally fills 2-col gap
  - [ ] NO intervention

**Expected Visual**:
```
[Gallery-4] [Menu-2]  ← Natural fit, no intervention
[Wine-2] [...]
```

---

#### Scenario E: No Gallery (No Intervention)
- [ ] **Page 7**: Hours + Description + Vibe (no Gallery)
  - [ ] NO QuietCard inserted
  - [ ] Natural tier flow
  - [ ] No gap fill logic triggered

- [ ] **Page 8**: Complex page without Gallery
  - [ ] All cards render in tier order
  - [ ] No unexpected gaps or fills

**Expected Visual**:
```
[Hours-3] [Description-3]
[Vibe-2] [Phone-2]  ← Natural grid flow
[AlsoOn-6]
```

---

### 2. Browser Testing Requirements

#### Desktop Testing
- [ ] **Chrome** (latest)
  - [ ] QuietCard pattern renders correctly
  - [ ] No overlap with adjacent cards
  - [ ] Grid gaps consistent (12px)
  
- [ ] **Safari** (latest)
  - [ ] Pattern visibility check
  - [ ] No webkit-specific issues
  
- [ ] **Firefox** (latest)
  - [ ] Grid rendering correct
  - [ ] No reflow issues

#### Mobile Breakpoints
- [ ] **Mobile Portrait** (375px width)
  - [ ] QuietCard responsive behavior
  - [ ] No horizontal overflow
  - [ ] Pattern scales appropriately
  
- [ ] **Mobile Landscape** (667px width)
  - [ ] Grid maintains integrity
  - [ ] QuietCard remains subtle
  
- [ ] **Tablet** (768px width)
  - [ ] Mid-breakpoint behavior
  - [ ] No unexpected wrapping

#### Visual Quietness Verification
- [ ] QuietCard does NOT:
  - [ ] Draw eye before primary content cards
  - [ ] Have hover effects that attract attention
  - [ ] Create visual hierarchy
  - [ ] Appear interactive
  
- [ ] QuietCard DOES:
  - [ ] Blend with page background
  - [ ] Use subtle pattern (barely visible)
  - [ ] Fill space without announcement
  - [ ] Maintain `aria-hidden="true"`

---

### 3. Regression Testing

#### Layout Integrity
- [ ] No unexpected gaps introduced
- [ ] No card overlaps
- [ ] Tier order preserved (except Tier 4 single reorder)
- [ ] AlsoOn always full-width at bottom
- [ ] Grid column math correct (adds to 6)

#### Performance Check
- [ ] Page load time unchanged
- [ ] No additional reflows
- [ ] Console clean (no errors)
- [ ] Layout validation passing in dev mode

#### Edge Cases
- [ ] Gallery + Both Links + Phone → Only first reordered
- [ ] Multiple galleries on page → Only first gets gap fill
- [ ] Empty gallery data → No gap fill triggered
- [ ] Gallery at page end (no AlsoOn) → QuietCard inserted if needed

---

### 4. Validation Console Checks

Run on staging and verify:

```javascript
// In browser console on each test page:
console.log('Layout validation:', validateLayout(tiles));
```

- [ ] All test pages pass validation
- [ ] No "Multiple quiet cards" errors
- [ ] No "Quiet without gallery" errors
- [ ] Max 1 quiet card per page enforced

---

## Sample Test Pages (Staging)

Identify 8-10 real pages from database with these characteristics:

| Page Type | Criteria | Count |
|-----------|----------|-------|
| Gallery-heavy, sparse | Gallery + AlsoOn, no Tier 4 | 2 |
| Gallery + Phone | Gallery + Phone number present | 1-2 |
| Gallery + Instagram | Gallery + Links (Instagram) | 1-2 |
| Gallery + Menu/Wine | Gallery + Tier 3 data surfaces | 1-2 |
| No Gallery | Rich pages without Gallery | 1-2 |
| Edge cases | Multiple scenarios combined | 1 |

**Example candidates** (adjust based on actual data):
- [ ] [Page name] - Gallery + AlsoOn only
- [ ] [Page name] - Gallery + Phone
- [ ] [Page name] - Gallery + Instagram
- [ ] [Page name] - Gallery + Menu
- [ ] [Page name] - No Gallery, rich content
- [ ] [Page name] - Gallery + Links + Phone (both present)
- [ ] [Page name] - Gallery + Wine
- [ ] [Page name] - Minimal page (Hours + Description)

---

## Sign-Off Criteria

### QA Must Confirm:
- ✅ All 8-10 test pages render correctly
- ✅ QuietCard is genuinely quiet (no attention theft)
- ✅ No reflow / overlap issues
- ✅ Mobile breakpoints clean
- ✅ Console validation passing
- ✅ No regressions detected

### Documentation Must Include:
- ✅ Screenshots of key scenarios
- ✅ Mobile testing results
- ✅ Any edge cases discovered
- ✅ Performance notes (if any)

---

## Post-QA Actions

### If Issues Found:
1. Document issue with screenshots
2. Create fix PR (surgical, gap fill only)
3. Re-test affected scenarios
4. Update this checklist

### If QA Passes:
1. Update this doc: "QA COMPLETE ✅"
2. Attach screenshots to docs/
3. Request CTO production sign-off
4. Merge to main

---

## Notes for QA Engineer

**Key Things to Watch**:
1. QuietCard should be **barely noticeable** — if it draws your eye, that's a fail
2. Tier 4 reordering should feel **natural** — if you notice Phone "jumped up", that's a pass
3. No gaps should appear **jarring** — small gaps at row ends are OK, 2-col next to Gallery is not
4. Console should be **clean** — no errors, warnings, or validation failures

**How to Test**:
1. Deploy this branch to staging
2. Identify 8-10 real pages matching criteria above
3. Test each page in all listed browsers
4. Fill out checkboxes as you test
5. Take screenshots of any issues
6. Document results in this file

---

**Status**: 🟡 **PENDING QA**  
**Blocker**: Manual visual verification required  
**Next Step**: Assign QA owner and set target date

---

## CTO Final Sign-Off

Once QA complete, CTO will review and issue:

**CTO SIGN-OFF: Approved for Production**

Current status: Awaiting QA completion.
