# 🌅 Saiko Maps - Tomorrow Morning Quick Start

**Last Updated:** Feb 9, 2026  
**Your Mission:** Choose your next Saiko Maps project!

---

## 🚀 Quick Boot-Up (5 minutes)

### 1. Start Development Server
```bash
cd ~/saiko-maps
npm run dev
```
Wait for: `✓ Ready in 2.6s` then visit http://localhost:3000

### 2. Check System Health
```bash
# Quick database check
node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().golden_records.count().then(c=>console.log('Places:',c))"

# Instagram coverage
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const t=await p.golden_records.count({where:{county:'Los Angeles'}});const w=await p.golden_records.count({where:{county:'Los Angeles',instagram_handle:{not:null}}});console.log('LA:',t,'places,',w,'with IG (',Math.round(w/t*100)+'%)');})().catch(console.error)"
```

### 3. Review Yesterday's Progress
```bash
# See what you accomplished
cat SESSION_SUMMARY_2026-02-09.md | grep "##"
```

---

## 🎯 Project Options for Today

### **Option A: Instagram Backfill Sprint** (2-4 hours)
**Goal:** Add 100-200 Instagram handles manually  
**Why:** High-value Tier 1 places need handles  
**Impact:** Boost coverage from 19% → 30%+

**How to start:**
```bash
# 1. Open the admin tool
open http://localhost:3000/admin/instagram

# 2. Filter to Tier 1 only (highest quality)
# 3. Work in batches of 20-30
# 4. Use Google Maps to find Instagram handles
```

**Tips:**
- Google Maps business profiles usually have Instagram
- Restaurant websites (footer/social links)
- Paste full URLs: `https://instagram.com/username` works!
- Use "Mark as Closed" for defunct restaurants

**Success Metrics:**
- Add 100+ handles = ⭐⭐⭐ Great day!
- Add 50+ handles = ⭐⭐ Good progress
- Add 20+ handles = ⭐ Solid start

---

### **Option B: Google Places Enrichment** (1-2 hours + API costs)
**Goal:** Enrich 1,112 places with phone, hours, photos  
**Why:** Fill data gaps automatically  
**Cost:** ~$19 for Google Places API calls  
**Impact:** Boost Golden Profile from 46% → 75%+

**How to start:**
```bash
# 1. Add Google Maps API key to .env
# (You'll need to create one in Google Cloud Console)

# 2. Enable Places API in console
# 3. Enable billing (required for API)

# 4. Run enrichment
npm run tag:la-county        # Tag places first
npm run enrich:google        # Enrich with API

# 5. Sync to public site
npm run sync:places
```

**Requires:**
- Google Cloud account
- Valid credit card for billing
- Places API enabled

**Documentation:** See `ENRICHMENT_WORKFLOW.md`

---

### **Option C: LA Region Expansion** (2-3 hours)
**Goal:** Add remaining LA regions (Harbor, Southeast LA)  
**Why:** Complete LA County coverage  
**Impact:** Add 100-200 new places

**How to start:**
```bash
# 1. Check existing region data
ls -la data/

# 2. Review your draft
cat data/southeast-la-draft.csv

# 3. Generate new region list with AI
# (Ask Claude: "Generate 50 restaurants for [region]")

# 4. Ingest via CSV
npm run ingest:csv -- data/harbor-places.csv harbor_expansion

# 5. Auto-resolve duplicates
npm run resolver:run
```

**Regions Left:**
- ⬜ Harbor (San Pedro, Wilmington)
- ⬜ Southeast LA (Downey, Norwalk, Bellflower)

---

### **Option D: Website Instagram Scraper** (3-4 hours)
**Goal:** Extract Instagram from restaurant websites  
**Why:** Automate handle discovery  
**Impact:** Find 200-300 more handles

**How to build:**
```bash
# 1. Create scraper script
# scripts/scrape-website-instagram.ts

# 2. For each place with a website:
#    - Fetch website HTML
#    - Parse for Instagram links
#    - Extract handle
#    - Save to database

# 3. Run on places with websites
npm run scrape:instagram
```

**Technical Stack:**
- Node.js + Cheerio (HTML parsing)
- Or use Puppeteer for JavaScript sites
- Rate limiting (respect robots.txt)

---

### **Option E: Public Site Integration** (2-3 hours)
**Goal:** Show Instagram handles on merchant pages  
**Why:** Make the data useful for visitors  
**Impact:** User-facing feature

**How to build:**
```bash
# 1. Update merchant page component
# app/place/[slug]/page.tsx

# 2. Add Instagram icon/link
# Show handle if available
# Link to Instagram profile

# 3. Style with Tailwind
# Match existing bento grid design

# 4. Test with a few places
open http://localhost:3000/place/bestia
```

**Design Considerations:**
- Where to show? (Header, sidebar, or footer?)
- Icon only or "@handle" text?
- Click → open Instagram app or web?

---

### **Option F: Data Quality Dashboard** (3-4 hours)
**Goal:** Build admin dashboard for data insights  
**Why:** Track progress and find gaps  
**Impact:** Better decision-making

**How to build:**
```bash
# 1. Create dashboard page
# app/admin/dashboard/page.tsx

# 2. Show key metrics:
#    - Total places by region
#    - Instagram coverage %
#    - Data completeness scores
#    - Recently added/updated
#    - Source tier distribution

# 3. Charts with Recharts or Chart.js

# 4. Open dashboard
open http://localhost:3000/admin/dashboard
```

---

## 🎲 Quick Decision Matrix

**Choose based on your mood:**

| If you want to... | Choose | Time | Impact |
|-------------------|--------|------|--------|
| **See immediate results** | Instagram Backfill (A) | 2-4h | High |
| **Automate everything** | Google Enrichment (B) | 1-2h | High |
| **Expand coverage** | LA Regions (C) | 2-3h | Medium |
| **Build something new** | Website Scraper (D) | 3-4h | High |
| **User-facing feature** | Public Integration (E) | 2-3h | Medium |
| **Analyze & strategize** | Dashboard (F) | 3-4h | Low |

**My Recommendation:** Start with **Option A** (Instagram Backfill)
- Immediate, tangible results
- Low barrier to entry
- UI is already built and working
- Most valuable for Tier 1 places

---

## 📋 Pre-Flight Checklist

Before you start, make sure:

- ✅ Dev server is running (`npm run dev`)
- ✅ Database is accessible (run health check)
- ✅ Admin tools work (visit URLs)
- ✅ No pending errors in terminal
- ✅ Coffee ☕ ready

---

## 🆘 Quick Troubleshooting

### Dev Server Won't Start
```bash
# Kill existing processes
lsof -ti:3000 | xargs kill -9
rm -rf .next/cache/lock .next/dev/lock
npm run dev
```

### Database Connection Issues
```bash
# Check if Postgres is running
npx prisma db execute --stdin <<< "SELECT 1"

# Regenerate Prisma client
npx prisma generate
```

### Admin Tools Not Saving
- Check browser console (F12) for errors
- Check terminal for `[API]` logs
- Try hard refresh (Cmd+Shift+R)

---

## 📞 Need Help?

**Documentation:**
- `SESSION_SUMMARY_2026-02-09.md` - What we did yesterday
- `INSTAGRAM_ADMIN_GUIDE.md` - Instagram tool usage
- `ENRICHMENT_WORKFLOW.md` - Google Places setup

**Quick Commands:**
```bash
# Show all available scripts
npm run | grep "run"

# Database stats
npm run audit

# Re-export Instagram list
npm run export:instagram:tier12
```

---

## 🎯 Today's Goal

**Pick ONE project and ship it.** Don't try to do everything!

**Success = Making meaningful progress on your chosen path.**

---

**Ready? Let's build! 🚀**

*Copy this command to start your session:*
```bash
cd ~/saiko-maps && npm run dev && open http://localhost:3000/admin/instagram
```
