# Next Steps — Ready to Test

Pruning done. Transformer fixed. No blockers.

**Testing lens:** You're not testing that it renders. You're testing that the hierarchy feels inevitable.

See `TESTING-GUIDE.md` for the complete feel test framework.

---

## 1. Update Seed Script to Match Prisma Schema

File: `scripts/seed-database.ts`

**What to do:**
- Check your actual Prisma field names
- Adjust seed script to match (e.g., `heroPhotoUrl` vs `photos[0]`)
- Ensure relations are created correctly

**Quick check:**
```bash
# Open Prisma schema
cat prisma/schema.prisma

# Or query one place to see field structure
npx prisma studio
```

---

## 2. Seed Database

```bash
npm run seed
```

**Expected output:**
```
✓ Seeded: La Taqueria → /place/scenario-a
✓ Seeded: Tartine Bakery → /place/scenario-b
✓ Seeded: Golden Gate Bakery → /place/scenario-c
```

---

## 3. Test the 3 Scenarios

```bash
npm run dev
```

**Use `TESTING-GUIDE.md` for complete testing framework.**

Quick version:

### Scenario A: Does it feel **editorial**?
- Instagram light but useful?
- Collage in right emotional position?
- Trust feels like curation, not metadata?
- Hours calm and compact?
- **Fail:** Anything louder than Tier 0 actions

### Scenario B: Does it feel **intentionally lean**?
- Or does it feel "less rich" (broken)?
- Trust coverage-only (no empty curator shell)?
- No visible empty containers?
- **Fail:** Feels like something is missing

### Scenario C: Does it feel **composed**?
- HoursCard shows "Hours unavailable"?
- Minimal but not broken?
- No gaps or empty containers?
- **Fail:** Looks like broken scaffold

---

## 4. Run PR Checklist

Open: `merchant-page-implementation-checklist.md`

Check all 11 sections against the 3 scenarios:
1. Tier Order Integrity
2. Collapse Logic
3. HoursCard Behavior
4. Instagram Slim Treatment
5. Photo Collage Protection
6. Trust Tier Rendering
7. Attributes Compression
8. Map Tile Constraint
9. Tier 3 Stability Test (scenarios A/B/C)
10. Mobile Pass
11. Promotion Drift Check

---

## 5. Tighten Transformer (Optional)

Once you confirm which pattern your Prisma schema uses:

**Example: Hero is first photo**
```typescript
// Remove "explicit hero field" branch from pickHeroUrl()
function pickHeroUrl(dbRecord: any) {
  const first = dbRecord.photos[0];
  return { id: first.id, url: first.url, alt: first.alt };
}
```

**Example: Address is flat**
```typescript
// Remove nested object branch from buildAddressDisplay()
function buildAddressDisplay(dbRecord: any) {
  return {
    street: dbRecord.addressStreet,
    city: dbRecord.addressCity,
    state: dbRecord.addressState,
    zip: dbRecord.addressZip,
  };
}
```

But transformer works as-is with tolerance built in.

---

## Troubleshooting

### Seed fails with "field not found"
- Check Prisma schema field names
- Adjust seed script to match
- Console.log the raw place object to see structure

### Hero duplicates in collage
- Transformer filters by URL, so this shouldn't happen
- If it does: check that hero.url !== collagePhoto.url
- Could be URL mismatch (trailing slash, http vs https)

### HoursCard doesn't show "Hours unavailable"
- Check: transformer returns `hours: undefined` for missing hours
- Component has guard: `if (!hasSchedule) return <div>Hours unavailable</div>`
- If not rendering: verify component logic in `HoursCard.tsx`

### Instagram row not rendering
- Check: `normalizeInstagramHandle()` returned valid string
- Component has guard: `if (!handle) return null`
- Could be whitespace or invalid characters

---

## Success Criteria

Before considering this done:

- [ ] All 3 scenarios seed successfully
- [ ] All 3 pages render without errors
- [ ] PR checklist passes (11/11 sections)
- [ ] Hero NOT in collage (all scenarios)
- [ ] HoursCard always renders (even Scenario C)
- [ ] No empty containers with visible padding

---

## Files You Might Need to Adjust

1. `scripts/seed-database.ts` — Match Prisma field names
2. `lib/data/merchant-service.ts` — Verify includes match relations
3. `lib/data/transformers.ts` — Tighten once schema confirmed

Everything else is done.

---

*Ready to seed, test, and ship.*
