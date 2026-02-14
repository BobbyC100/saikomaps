# Google Places Enrichment Workflow

## ✅ Changes Made

### 1. Schema Updates
Added to `golden_records`:
- `enriched_at` - Timestamp of last enrichment attempt (prevents re-processing)
- `county` - Geographic filter (e.g., 'Los Angeles')

### 2. Script Updates
Updated `enrich-google-places.ts` to:
- Only process places where `enriched_at IS NULL`
- Only process LA County places (or exclude known non-LA areas)
- Always set `enriched_at` after each attempt (success or failure)

---

## 🚀 Run The Workflow

### Step 1: Push Schema Changes
```bash
npx prisma db push
npx prisma generate
```

### Step 2: Tag LA County Places
```bash
npm run tag:la-county
```

This sets `county = 'Los Angeles'` for all places in LA County neighborhoods.

### Step 3: Run Enrichment
```bash
# Test with 5 places first
npm run enrich:google -- --limit=5

# If successful, run in batches
npm run enrich:google -- --limit=100
npm run enrich:google -- --limit=100
npm run enrich:google -- --limit=100
# ... repeat until complete
```

### Step 4: Sync to Public Site
```bash
npm run sync:places
```

### Step 5: Check Improvement
```bash
npm run audit:golden-profile
```

---

## 🛡️ Safeguards

### Won't Re-Process Same Places
Once a place is enriched (success or failure), it gets `enriched_at` set and won't be processed again.

### Won't Enrich Non-LA Places
The script filters by:
1. **County tag** (if set): Only `county = 'Los Angeles'`
2. **Exclusion list** (if county not set): Excludes Honolulu, Palm Beach, Waikiki, etc.

### Rate Limiting
- 20 requests per second (well under Google's 50/sec limit)
- 50ms delay between requests

---

## 💰 Cost Estimates

### Current State
```
Places with Google IDs: 1,112
Places already enriched: 0
Places needing enrichment: ~1,112
```

### Cost Breakdown
```
Places API (Place Details): $0.017 per request
1,112 places × $0.017 = $18.90
```

### Expected Results
After enrichment:
- Phone coverage: 42% → 85%+
- Hours coverage: 40% → 80%+
- Golden Profile: 46% → 75%+

---

## 🔧 Troubleshooting

### API Returns REQUEST_DENIED
1. Enable Places API: https://console.cloud.google.com/apis/library/places-backend.googleapis.com
2. Check API key restrictions (remove HTTP referrer/IP limits)
3. Ensure billing is enabled

### "Found 0 places needing enrichment"
Already complete! Check:
```bash
npm run audit:golden-profile
```

### Want to Re-Enrich
Clear `enriched_at`:
```sql
UPDATE golden_records SET enriched_at = NULL WHERE county = 'Los Angeles';
```

Then re-run enrichment.

---

## 📊 Monitoring Progress

### Check how many left
```bash
node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().\$queryRaw\`SELECT COUNT(*) as c FROM golden_records WHERE google_place_id IS NOT NULL AND enriched_at IS NULL\`.then(r=>console.log('Remaining:',Number(r[0].c)))"
```

### Check Golden Profile improvement
```bash
npm run audit:golden-profile
```

---

## ✅ Ready to Run!

Once you fix the Google Places API key issue, the workflow is:

```bash
npx prisma db push
npx prisma generate
npm run tag:la-county
npm run enrich:google -- --limit=100
# Repeat until complete
npm run sync:places
npm run audit:golden-profile
```

**Total time: ~20 minutes (for 1,112 places)**  
**Total cost: ~$19**  
**Expected result: Golden Profile jumps from 46% to 75%+** 🎉
