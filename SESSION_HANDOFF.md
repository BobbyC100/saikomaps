# Chef Recs & Coverage Session Handoff
**Date:** Feb 6, 2026  
**Status:** ✅ Ready for next session

---

## 🎯 What We Built

### **Chef Recs System** (Reference-Backed Practitioner Signal)
✅ Schema field `chefRecs` on Place model with migration  
✅ TypeScript types with validation (enforces reference requirement)  
✅ CLI tools for quick entry during editorial mining  
✅ Batch import capability for article scanning  
✅ Analysis tools showing divergence from critic awards  

### **Coverage Expansion**
✅ Dedupe-aware import scripts for all LA County regions  
✅ Comprehensive coverage reports with regional breakdowns  
✅ Fixed Santa Monica neighborhood aggregation  
✅ Imported 8 new places from LA Times "Where Chefs Eat" article  

---

## 📊 Current Stats (As of Feb 6, 2026)

### Database
- **673 total places** (up from 665)
- **420 places with editorial sources** (63%)
- **552 LA County places**

### Chef Recs Signal
- **23 Chef Recs** across 13 restaurants
- **69% divergence** from major awards (Michelin/Eater/Infatuation)
- **9 "insider picks"** with chef recs but no awards

### Coverage by Region (LA County)
- Central LA: 203 places (37%)
- South LA & South Bay: 114 places (21%)
- Westside: 104 places (19%)
- Eastside: 67 places (12%)
- San Gabriel Valley: 61 places (11%)
- San Fernando Valley: 8 places (1%)

### Editorial Sources
1. The Infatuation: 117 citations
2. Michelin Guide: 90 citations
3. Eater LA: 70 citations
4. LA Times: 23 citations (new!)

---

## 🛠️ Available Tools

### Quick Add Chef Rec (During Coverage Mining)
```bash
cd ~/saiko-maps
tsx scripts/add-chef-rec.ts "<place-name>" \
  --person "Chef Name" \
  --from "Their Restaurant" \
  --desc "Reference description" \
  --url "https://..." \
  --type explicit-recommendation \
  --confidence high
```

### View Chef Recs
```bash
tsx scripts/view-chef-recs.ts              # All places
tsx scripts/view-chef-recs.ts "<place>"    # Specific place
tsx scripts/view-chef-recs.ts --stats      # Statistics
```

### Analyze Divergence
```bash
tsx scripts/analyze-chef-recs-vs-awards.ts
```

### Coverage Reports
```bash
tsx scripts/coverage-report.ts           # Full database
tsx scripts/la-county-coverage.ts        # LA County focus
```

### Import Tools
```bash
tsx scripts/import-master-with-dedupe.ts           # Master Michelin + Eater list
tsx scripts/import-latimes-missing-places.ts       # Missing places from article
tsx scripts/batch-add-latimes-chef-recs.ts         # Batch Chef Recs from article
```

---

## 🔑 Key Files

### Chef Recs System
- `lib/chef-recs.ts` - Types, validation, creation helpers
- `scripts/add-chef-rec.ts` - Quick CLI for manual entry
- `scripts/view-chef-recs.ts` - Viewer with stats
- `scripts/analyze-chef-recs-vs-awards.ts` - Divergence analysis
- `scripts/batch-add-latimes-chef-recs.ts` - Batch import template
- `scripts/mine-chef-recommendations.ts` - Auto-detection (nice-to-have)

### Coverage & Import
- `scripts/coverage-report.ts` - Full database report
- `scripts/la-county-coverage.ts` - Regional breakdown with updated neighborhoods
- `scripts/import-master-with-dedupe.ts` - Smart dedupe imports
- `scripts/check-santa-monica.ts` - Diagnostic tool

### Schema
- `prisma/schema.prisma` - Updated with `chefRecs Json?` field
- `prisma/migrations/20260207030420_add_chef_recs/` - Migration applied

---

## 🎯 Top Chef-Recommended Places (No Awards)

These are **"insider picks"** - respected by practitioners but not critics:

1. **Tsubaki** (Echo Park) - 2 Chef Recs (Kismet chefs)
2. **OTOTO** (Echo Park) - 2 Chef Recs (Kismet chefs)
3. **Bridgetown Roti** (East Hollywood) - 2 Chef Recs
4. **Jar** (Beverly Grove) - Nancy Silverton approved
5. **Night + Market** (WeHo) - Owen Han's weekly spot
6. **Baja Subs Market & Deli** (Northridge) - Sri Lankan gem
7. **Great White** (Larchmont) - Cal-Aussie brunch
8. **Burritos La Palma** (El Monte) - Since the '80s
9. **Oc & Lau** (Garden Grove) - Vietnamese seafood

---

## 🚀 Ready for Next Session

### You Said:
> "I have additional chef recs for you"

### What You Can Do:
1. **Give me an article URL** - I'll scan for chef recommendations
2. **Paste CSV data** - I'll import places and add Chef Recs
3. **Manual entry** - Use `add-chef-rec.ts` for quick logging
4. **Batch import** - I can adapt the LA Times script for any source

### Workflow:
1. You provide source (URL, CSV, or manual)
2. I extract chef mentions and place details
3. Import missing places first (if needed)
4. Batch add Chef Recs with references
5. Run divergence analysis to see new insights

---

## 💡 Key Insights to Remember

**Chef Recs ≠ Awards**
- Critics look for: Innovation, story, presentation
- Chefs look for: Execution, consistency, real cooking
- 69% divergence = unique practitioner knowledge

**Multi-Axis Quality**
- Critics → Michelin (90 citations)
- Editors → Infatuation (117 citations)
- Practitioners → Chef Recs (23 and growing)

**No single axis dominates. All inform.**

---

## 📝 Git Status

✅ Committed (ready to push):
- Chef Recs system (schema, types, tools)
- 29 import and coverage scripts
- LA County coverage with fixed neighborhoods
- 6,614 lines of new code

⚠️ Need to push manually:
```bash
cd ~/saiko-maps
git push origin main
```

---

## 🎬 Start Your Next Session With:

**"I have [source] with chef recommendations"**

Or:

**"Run coverage report to see current stats"**

All tools are ready. Database is synced. Let's expand that Chef Recs signal! 🚀
