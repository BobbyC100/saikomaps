# Bento Card Popup: Before → After

## 🎯 The Problem

Your React implementation didn't match the locked design specifications from `saiko-design-decisions.md`.

---

## ❌ BEFORE (Incorrect)

### Layout
```
┌────────────────────────────┐
│                            │
│     Photo (full width)     │ ← Wrong: Full width photo
│     with name overlaid     │ ← Wrong: Name on photo
│                            │
├────────────────────────────┤
│  Wine Bar · Silver Lake    │ ← Meta only
│  [Directions]  [Share]     │
├────────────────────────────┤
│  "View place" →            │ ← Wrong text
└────────────────────────────┘
```

### Issues:
- ❌ Single column layout (should be 2-column grid)
- ❌ Photo full width (should be 115px on LEFT)
- ❌ Name overlaid on photo (should be in info section)
- ❌ No status indicator (Open/Closed missing)
- ❌ Wrong merchant link text ("View place" instead of "View full profile")
- ❌ Wrong vertical proportions

---

## ✅ AFTER (Correct — Matches Locked Design)

### Layout
```
┌─────────────┬──────────────────┐
│             │  Seco            │ ← Name in info
│             │  Wine Bar · ...  │ ← Meta
│   Photo     │  ● Open          │ ← Status (NEW!)
│  (115px)    ├──────────────────┤
│             │ [Directions]     │
│             │ [Share]          │
├─────────────┴──────────────────┤
│  "View full profile" →         │ ← Correct text
└────────────────────────────────┘
        ◇
```

### Fixed:
- ✅ 2-column CSS grid (`grid-template-columns: 115px 1fr`)
- ✅ Photo on LEFT (115px wide, spans both rows)
- ✅ Name in INFO section (Libre Baskerville 16px italic)
- ✅ Status indicator VISIBLE (6px dot + "OPEN"/"CLOSED")
- ✅ Correct merchant link text ("View full profile")
- ✅ Compact, magazine-style proportions

---

## 📊 Side-by-Side Comparison

| Aspect | Before (Wrong) | After (Correct) |
|--------|----------------|-----------------|
| **Layout** | Single column | 2-column grid |
| **Photo Width** | Full width (~310px) | 115px (left column) |
| **Photo Position** | Top | Left side |
| **Name Position** | Overlaid on photo | Info section (right) |
| **Name Color** | White with shadow | Charcoal/Parchment (themed) |
| **Status Indicator** | ❌ Hidden | ✅ Visible with dot |
| **Merchant Link** | "View place" | "View full profile" |
| **Grid Template** | None | `115px 1fr` |
| **Visual Style** | Traditional card | Compact bento box |

---

## 🎨 Design Source

All changes implement the **locked design** from:

### `saiko-design-decisions.md` (Lines 97-131)

> **Pin popup:** Bento Card (photo left, info right, merchant link footer)
> 
> **Grid:** `grid-template-columns: 115px 1fr`
> 
> **Photo min-height:** 130px
> 
> **Content structure:**
> ```
> ┌─────────────┬──────────────────────┐
> │             │ Name (16px italic)   │
> │   Photo     │ Meta (9px uppercase) │
> │  (115px)    │ Status dot + label   │
> │             ├──────────────────────┤
> │             │ [Directions] [Share] │
> ├─────────────┴──────────────────────┤
> │   "View full profile"  →          │
> └────────────────────────────────────┘
> ```

---

## 🎯 Status Indicator (NEW!)

The most important addition:

### Light Mode
```
● Open    ← Green dot (#4A7C59)
○ Closed  ← Gray dot (40% opacity)
```

### Dark Mode
```
● Open    ← Bright green (#6BBF8A)
○ Closed  ← Muted ocean blue (30% opacity)
```

Styling:
- Dot: 6px circle
- Label: 9px uppercase, 0.5px letter-spacing, weight 600
- Gap: 4px between dot and text

---

## 📸 What You'll See

### When you click a pin now:

1. **Photo appears on the LEFT** (115px wide, not full width)
2. **Name appears on the RIGHT** (not overlaid on photo)
3. **Status appears BELOW meta** (● Open or ○ Closed)
4. **Buttons below status** (Directions, Share)
5. **Footer says "View full profile"** (not "View place")

The popup looks more **compact** and **magazine-like** — exactly matching the HTML concept and the locked design specifications.

---

## 🧪 Test It!

### Quick Test:
1. Open any Field Notes map: `/map/[slug]`
2. Click any pin
3. **Look for:**
   - Photo on LEFT (narrow column)
   - Name on RIGHT
   - Green/gray dot + "OPEN"/"CLOSED"
   - "View full profile" footer

### Toggle Dark Mode:
- Popup should have glassmorphism blur
- Status dot should be bright green when open
- All text should use ocean blue accents

---

## ✅ Implementation Complete

**File:** `/app/map/[slug]/components/field-notes/BentoCardPopup.tsx`  
**Status:** ✅ Matches locked design specifications  
**Linter:** ✅ No errors  
**Testing:** 🧪 Ready for manual testing

---

## 🎉 Result

Your Field Notes popup now has the correct **Bento Card** layout that matches:
- ✅ The HTML concept (`field-notes-final-concept.html`)
- ✅ The locked design decisions (`saiko-design-decisions.md`)
- ✅ The brand aesthetic (compact, editorial, magazine-style)

Ready to test! 🚀
