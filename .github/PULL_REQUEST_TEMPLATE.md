# Merchant Page Implementation — PR Checklist

Before submitting this PR, verify against the **Implementation Sanity Checklist** (`merchant-page-implementation-checklist.md`).

---

## Quick Self-Review

### 1. Tier Order
- [ ] Verified render stack is exact (1-12)
- [ ] Instagram NOT inside PrimaryActionSet
- [ ] Collage appears ABOVE TrustBlock
- [ ] Attributes appear BELOW Facts
- [ ] House appears LAST (Tier 5)

### 2. Component Behavior
- [ ] HoursCard ALWAYS renders (even with missing data)
- [ ] Instagram is slim and single-line
- [ ] Hero photo excluded from collage
- [ ] Attributes render as chips (max ~6 visible)
- [ ] Map is small/reference-only (no Directions button)

### 3. Collapse Logic
- [ ] No empty containers with visible padding/borders
- [ ] All conditional components have guards
- [ ] TrustBlock fully collapses if empty
- [ ] PhotoCollage collapses if no non-hero photos

### 4. Testing
- [ ] Tested Scenario A (fully curated)
- [ ] Tested Scenario B (editorial lite — no curator note)
- [ ] Tested Scenario C (baseline — minimal data)
- [ ] Mobile responsive verified
- [ ] No scroll fatigue on first 1-2 screens

### 5. Promotion Drift Check
- [ ] Page feels editorial, not promotional
- [ ] Attributes NOT too big
- [ ] Map NOT dominant
- [ ] Instagram NOT primary button weight

---

## Description

<!-- Describe what this PR changes -->

---

## Visual Preview

<!-- Add screenshots or link to demo if applicable -->

---

## Related Issues

<!-- Link to related issues or tickets -->

---

## Reviewer Notes

<!-- Any specific areas to review or context for reviewers -->
