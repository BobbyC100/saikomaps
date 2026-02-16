# Future Polish-Layer PR Protocol

**CTO Directive**: Keep polish-layer PRs surgical.

---

## What Happened (Gallery Gap Fill)

**Acceptable**:
- Gap fill logic: 59 lines in resolver
- QuietCard integration: ~12 lines in page component
- **Total core footprint**: ~70 lines

**Bundled** (Not Ideal):
- System B resolver integration in `page.tsx` (~150 lines)
- Mixed into same diff as gap fill feature

**Why Accepted**:
- Clear separation documented (~12 lines gap fill vs ~150 lines System B)
- System B integration was pre-existing work
- Gap fill logic remained surgical

---

## Future PR Requirements

### Polish-Layer PR Checklist

When shipping polish features (visual optimizations, gap fills, spacing tweaks):

#### ✅ Do:
1. **Single-feature PRs**
   - One polish enhancement per PR
   - Clear feature boundary
   - Surgical code changes

2. **Minimal footprint**
   - Core logic < 100 lines
   - Changes localized to 1-2 files
   - Reuse existing components

3. **Clear documentation**
   - Feature name in PR title
   - Lines added/modified documented
   - Separation from other work explicit

4. **Isolated testing**
   - Test suite for feature only
   - No bundled test scenarios
   - Clear pass/fail criteria

#### ❌ Don't:
1. **Bundle unrelated work**
   - Don't mix UI integration with polish features
   - Don't include refactoring in polish PRs
   - Don't piggyback component updates

2. **Expand scope mid-PR**
   - Don't add "while I'm here" changes
   - Don't fix unrelated bugs in same PR
   - Don't update tangential logic

3. **Touch more than necessary**
   - Don't reformat files
   - Don't update unrelated imports
   - Don't reorganize code structure

---

## Examples

### ✅ Surgical Polish PR (Good)
```
PR: Add QuietCard gap fill for Gallery cards

Files changed: 2
- lib/utils/PlacePageLayoutResolver.systemB.ts (+70 lines)
  - applyGalleryGapFill() function
  - Documentation block
- app/(viewer)/place/[slug]/page.tsx (+12 lines)
  - QuietCard import
  - QuietCard render case

Total: 82 lines core feature
```

### ❌ Bundled PR (Avoid)
```
PR: Add QuietCard gap fill + System B integration + HoursCard refactor

Files changed: 5
- PlacePageLayoutResolver.systemB.ts (+200 lines)
  - Gap fill logic
  - Resolver integration
  - Validation updates
- page.tsx (+300 lines)
  - System B wiring
  - Gap fill rendering
  - Component reorganization
- HoursCard.tsx (+50 lines)
  - Unrelated refactor
  - Prop updates

Total: 550 lines mixed work
```

**Problem**: Can't isolate gap fill logic for review. Can't revert cleanly if one piece fails.

---

## Pre-PR Checklist for Polish Features

Before opening PR, confirm:

- [ ] **Single feature only** — Can describe in one sentence
- [ ] **Core logic < 100 lines** — If larger, consider splitting
- [ ] **Files touched < 3** — More means scope creep
- [ ] **No bundled refactors** — Save for separate PR
- [ ] **No "while I'm here" changes** — Stay focused
- [ ] **Clear diff boundary** — Can point to exact feature lines
- [ ] **Isolated tests** — Feature-specific test suite
- [ ] **Documentation updated** — Spec vs implemented clear

---

## Why This Matters

### Review Efficiency
- Small PRs review faster
- Clear scope = faster approval
- Surgical changes = lower risk

### Revert Safety
- Can revert polish without affecting integration
- No collateral damage
- Clean rollback path

### Architectural Clarity
- Each change has clear purpose
- No hidden mutations
- Transparent system evolution

### Debugging Speed
- Issues traced to specific PR
- Smaller diffs easier to bisect
- Clear cause/effect relationship

---

## When Bundling Is Acceptable

**Rare cases where bundling is OK**:

1. **Dependency chains**
   - Feature A requires Component B update
   - Document dependency explicitly
   - Still keep minimal

2. **Atomic deployment**
   - Breaking change requires simultaneous updates
   - Document why atomic
   - Keep changes synchronized

3. **Shared infrastructure**
   - Multiple polish features share new utility
   - Create utility first (separate PR)
   - Then polish features reference it

**Default stance**: If in doubt, split it.

---

## CTO Review Flag

If PR exceeds these guidelines, expect:

🟡 **"Scope Creep — Split PR"**

Required response:
1. Split PR into focused pieces
2. Document separation clearly
3. Order PRs by dependency
4. Resubmit with clear boundaries

---

## Summary

**Polish-Layer PR Protocol**:
- One feature per PR
- Core logic < 100 lines
- Files touched < 3
- No bundled work
- Surgical changes only
- Clear documentation
- Isolated testing

**Philosophy**: Precision over convenience. Clean PRs compound system quality.

---

**Status**: Active protocol  
**Applies to**: All polish-layer features going forward  
**Enforcement**: CTO review stage
