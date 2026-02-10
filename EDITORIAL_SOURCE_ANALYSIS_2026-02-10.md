# Editorial Source Analysis - LA County Launch Data
**Date:** February 10, 2026  
**Dataset:** 1,066 launch-ready places (OPEN + valid coordinates)

---

## Executive Summary

**Critical Finding:** Only **37.5%** of your launch-ready places have editorial backing. The majority (62.5%) are Google Places data without any editorial recommendation.

```
✅ WITH EDITORIAL BACKING:  400 places (37.5%)
⚠️  NO EDITORIAL SOURCE:     666 places (62.5%)
```

---

## Editorial Quality Tiers

### 🌟 Tier 1: Multi-Source (Highest Confidence)
**109 places (10.2%)**

These places appear in 2+ editorial sources, indicating strong consensus about quality.

**Examples:**
- Bar Chelou (Playhouse Village) - 4 sources
- The Lonely Oyster (Echo Park) - 4 sources  
- El Chucho (Mar Vista) - 4 sources
- Holcomb Street (Beverlywood) - 3 sources
- Spina (Northeast LA) - 3 sources

### 📝 Tier 2: Single Editorial Source
**291 places (27.3%)**

Featured in one reputable publication, good confidence level.

**Breakdown by publication:**
- **Infatuation:** 118 places (11.1%)
- **Other editorial:** 93 places (8.7%)
- **Eater:** 59 places (5.5%)
- **Time Out:** 13 places (1.2%)
- **LA Times:** 8 places (0.8%)

### 📍 Tier 3: Google Places Only
**666 places (62.5%)**

No editorial backing - purely Google Places data (ratings, reviews, but no editorial curation).

**Examples:**
- Golden Burger Teriyaki
- Cheaper by the Dozen House
- Olivia Restaurant
- Riot Games Inc.
- Annette Street

---

## Detailed Source Breakdown

| Source Type | Count | % of Total | Quality Level |
|------------|-------|-----------|---------------|
| **No editorial source** | 666 | 62.5% | Google data only |
| **Infatuation** | 118 | 11.1% | Single source |
| **Multi-source (2+)** | 109 | 10.2% | **Highest confidence** |
| **Other editorial** | 93 | 8.7% | Single source |
| **Eater** | 59 | 5.5% | Single source |
| **Time Out** | 13 | 1.2% | Single source |
| **LA Times** | 8 | 0.8% | Single source |
| **TOTAL** | **1,066** | **100%** | - |

---

## What This Means for Launch

### Strengths ✅
1. **400 editorially-vetted places** provide a solid curated foundation
2. **109 multi-source places** offer high-confidence recommendations
3. **Top publications represented:** Infatuation (118), Eater (59), Time Out (13)
4. Mix of quality tiers allows for different discovery experiences

### Concerns ⚠️
1. **62.5% lack editorial backing** - these are essentially "unvetted" Google Places
2. **Quality consistency risk** - 666 places have no editorial validation
3. **User expectation mismatch** - if positioned as "curated," this could be problematic
4. **Discovery experience** - unvetted places may dilute the curated experience

---

## Recommendations

### Option 1: Curated-First Launch (Conservative)
**Launch with 400 editorially-backed places only**

**Pros:**
- Every place has editorial validation
- Clear value proposition: "Expert-curated LA dining"
- Quality consistency
- Room to add unvetted places later as "experimental" or "community picks"

**Cons:**
- Smaller initial dataset (400 vs 1,066)
- Some neighborhoods may be underrepresented

### Option 2: Tiered Launch (Balanced)
**Launch with all 1,066 but clearly distinguish tiers**

**Pros:**
- Maximum coverage (1,066 places)
- Users can filter by editorial backing
- Opportunity to surface hidden gems in Tier 3

**Cons:**
- Need UI to communicate tiers
- Risk of diluting "curated" brand
- More QA needed for Tier 3 places

**UI suggestions:**
- Badge system: 🌟 "Multi-source pick" / 📝 "Editor's choice" / 📍 "Community favorite"
- Filters: "Show only editorial picks" (default: ON)
- Search ranking: Prioritize Tier 1 & 2 in results

### Option 3: Hybrid Soft Launch
**Launch with all 1,066, but feature only Tier 1 & 2**

**Pros:**
- Tier 1 & 2 featured prominently in UI
- Tier 3 discoverable but not highlighted
- Allows data collection on Tier 3 performance
- Can promote successful Tier 3 places to "Featured"

**Cons:**
- More complex UI/UX
- Requires careful content strategy

---

## Quality Audit Recommendations

Before launching all 1,066 places, consider spot-checking Tier 3:

1. **Sample 50 random Tier 3 places** - verify they're actually good
2. **Check for noise** - Are there non-restaurants? Closed places?
3. **Review categories** - What types of places lack editorial sources?
4. **Spot-check high outliers** - Any Tier 3 places with exceptional Google ratings?

### Quick Spot Check Query
```typescript
// Get 50 random Tier 3 places for manual review
const tier3Sample = await prisma.places.findMany({
  where: {
    status: 'OPEN',
    latitude: { not: 0 },
    editorial_sources: null, // or empty array
  },
  take: 50,
  orderBy: { name: 'asc' },
  select: { name: true, address: true, category: true, website: true },
});
```

---

## Next Steps

### Immediate Decisions Needed:
1. **Launch strategy:** Which option above? (Curated-First, Tiered, or Hybrid)
2. **UI treatment:** How to communicate editorial backing to users?
3. **Quality threshold:** Are you comfortable with 62.5% unvetted places?

### Data Quality Actions:
1. **Audit Tier 3 sample** - Verify 50 random places are legit
2. **Category analysis** - What types of places lack editorial sources?
3. **Hidden gems** - Check if any Tier 3 places should be promoted
4. **Backfill sources** - Can you match Tier 3 places to editorial lists?

### Post-Launch:
1. **Track engagement by tier** - Do users prefer Tier 1/2 or discover Tier 3 gems?
2. **Editorial expansion** - Systematically add sources to strong Tier 3 places
3. **Community validation** - Let user engagement promote Tier 3 → Tier 2

---

## Files Created

- `scripts/analyze-editorial-sources.ts` - Source analysis script
- This report

**Run again anytime with:**
```bash
npx tsx scripts/analyze-editorial-sources.ts
```
