# Design Doc Update: Hours Card Status Footer

**Date**: February 7, 2026  
**Update**: Hours card status footer clarification

---

## Change Made

Updated design decisions to clarify Hours card status footer behavior.

### Before (Ambiguous):
> "No status pill in card. Open/Closed already in hero meta row."

This was interpreted as: "Remove all status indicators from Hours card"

### After (Clear):
> **Hours status**: Status footer with "Open · Closes 11 PM" or "Closed · Opens 7 AM"  
> **Rationale**: Hero shows binary status; footer shows actionable timing

---

## Rationale

The status footer serves a **different purpose** than the hero status:

| Location | Shows | Purpose |
|----------|-------|---------|
| **Hero meta row** | Binary state ("Open" or "Closed") | Quick glance status |
| **Hours card footer** | Actionable timing ("Closes 11 PM" or "Opens 7 AM") | Planning context |

### Example:
```
Hero: "● Open"
Hours footer: "Open · Closes 11 PM"
```

User gets:
1. Quick status (hero) ✓
2. When to arrive by (footer) ✓

---

## Implementation Status

✅ **Current implementation is correct** - keep status footer as-is.

No code changes needed for this aspect.

---

## Files Updated

1. `docs/DESIGN_DECISIONS_ALIGNMENT.md` - Updated Hours status section
2. `docs/MERCHANT_PAGE_BENTO_GRID.md` - Added rationale for status footer
3. This file - Documents the clarification

---

**Impact**: Low (implementation already correct, just clarifying intent)
