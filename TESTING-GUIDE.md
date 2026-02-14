# Testing Guide — Hierarchy Feel Test

You're not just testing that it renders.  
You're testing that the hierarchy feels inevitable.

---

## Step A: Seed Sanity (Binary)

```bash
npm run seed
```

**Pass criteria:** Seeds without errors.

**If seed fails:**
- Fix ONLY seed field names to match Prisma schema
- Do NOT touch transformer logic
- Do NOT patch UI as workaround

This is isolated. Fix the seed, nothing else.

---

## Step B: 60-Second Page Smell Test

Visit each page. First screen only. Gut check.

### Question for every page:

**Does the first screen feel like a decision page or a data page?**

- Decision page = editorial, curated, intentional
- Data page = spec sheet, promotional, exhaustive

You want decision page.

---

## Scenario A: `/place/scenario-a` (Fully Curated)

**Visual checklist:**
- [ ] Hero photo renders
- [ ] Instagram row: slim, single-line, lighter than Tier 0
- [ ] Photo collage: hero NOT duplicated
- [ ] Trust block: curator note + coverage
- [ ] HoursCard: compact, shows schedule
- [ ] Attributes: chips (max 6 visible)

**Feel test (more important than checklist):**

Does Instagram feel **light but useful**?  
Does the collage sit in the **right emotional position**?  
Does Trust feel like **editorial, not metadata**?  
Does Hours feel **calm and compact**?

**Fail signal:**  
If anything feels louder than Tier 0 actions → that's drift.

**Report back:**
- [ ] Feels editorial (not promotional)
- [ ] Tier 0 actions are loudest
- [ ] Instagram doesn't compete with primary actions
- [ ] Trust reads like curation, not specs

---

## Scenario B: `/place/scenario-b` (Editorial Lite)

**Visual checklist:**
- [ ] Trust shows coverage only (no empty curator shell)
- [ ] HoursCard renders
- [ ] No Instagram row (handle missing)
- [ ] No collage (photos missing)

**Feel test (psychological):**

Does the page feel **"less rich"** or **"intentionally lean"**?

- Intentionally lean = good (clean, composed)
- Less rich = fail (something missing, broken feel)

**Fail signal:**  
If it feels like something is missing → empty container rendering somewhere.

**Most v2.2 implementations fail here subtly.**

**Report back:**
- [ ] Feels intentionally lean (not broken)
- [ ] Trust renders coverage-only cleanly
- [ ] No visible empty containers with padding

---

## Scenario C: `/place/scenario-c` (Minimal Data)

**This is the real test.**

**Visual checklist:**
- [ ] Tier 0 (identity + actions if available)
- [ ] Tier 1 (maybe only hero, no collage)
- [ ] Tier 3 (HoursCard — shows "Hours unavailable")
- [ ] Tier 4 (maybe attributes)
- [ ] Tier 5 (House if present)

**Feel test (critical):**

Does the page still feel **composed**?

**Fail signal:**  
If Scenario C looks like a broken scaffold → transformer or collapse logic is wrong.

**Report back:**
- [ ] Feels composed (not broken)
- [ ] HoursCard shows "Hours unavailable" with neutral tone
- [ ] No gaps or empty containers
- [ ] Minimal but intentional

---

## High-Risk Areas (Manual Inspection)

### 1. Open Status

**Conservative rule:**  
Better to underclaim than be wrong.

**Check:**
- [ ] If hours exist: shows "Today · 5–11 PM" (no Open/Closed if parsing uncertain)
- [ ] If hours missing: no status shown
- [ ] Never confidently wrong

**Saiko should never be confidently wrong.**

---

### 2. Address

**No over-engineering.**

**Check:**
- [ ] If `formattedAddress` exists → show raw
- [ ] If not → compose from parts
- [ ] If that fails → show whatever flat string exists
- [ ] Never attempt clever reconstruction with missing fields

---

### 3. Hero Dedupe (Most Common Subtle Bug)

**You're deduping by URL. Good.**

**Visual confirmation:**
- [ ] Hero is NOT in collage
- [ ] Collage doesn't look artificially small from over-filtering
- [ ] No identical images appear twice

**Test:** Count photos.
- Hero = 1 photo
- Collage = N photos
- Total visible = 1 + N (no overlap)

---

## After Smoke Test — Report the Feel

**Don't just say "pass."**

Answer these:

### Scenario A:
Does it feel **editorial**?

### Scenario B:
Does it feel **intentional**?

### Scenario C:
Does it feel **composed**?

---

## If All Three Feel Right

Then:
1. Run full PR checklist (`merchant-page-implementation-checklist.md`)
2. All 11 sections must pass
3. Merge

**You're at the stage where polish drift matters more than feature count.**

---

## Report Template

```
Scenario A (Fully Curated):
- Visual: [pass/fail + notes]
- Feel: [editorial/promotional/unclear]
- Drift check: [anything louder than Tier 0?]

Scenario B (Editorial Lite):
- Visual: [pass/fail + notes]
- Feel: [intentionally lean/less rich/broken]
- Empty containers: [none/spotted where?]

Scenario C (Minimal Data):
- Visual: [pass/fail + notes]
- Feel: [composed/scaffold/broken]
- HoursCard: [shows unavailable/missing/error]

High-Risk Areas:
- Open status: [conservative/overconfident]
- Address: [displays correctly/over-engineered/broken]
- Hero dedupe: [no duplicates/hero in collage/identical images]

Overall:
- Hierarchy feels: [inevitable/forced/broken]
- Ready to merge: [yes/no]
```

---

*Run seed. Test the three pages. Report the feel back.*
