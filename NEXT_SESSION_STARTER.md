# 🚀 Saiko Maps - Next Session Starter

**Copy this entire message into your next chat with Claude:**

---

## Current State of Saiko Maps

### 📊 Database Stats (As of Feb 9, 2026)
- **Total places:** 1,456
- **LA County active:** 1,423
- **With Instagram:** 273 (19%)
- **Need Instagram backfill:** 1,149 (81%)
  - **Tier 1 (highest priority):** ~433 places
  - **Tier 2 (editorial):** ~410 places
- **Review queue:** 0 pending ✅ (all cleared!)
- **Archived (junk):** 28 places

### 🛠️ Tools & Systems Ready

#### 1. Instagram Backfill Tool ✅
**URL:** `http://localhost:3000/admin/instagram`

**Features:**
- Filter by Tier 1/2/All
- Paste full Instagram URLs (auto-extracts handle)
- **"No Instagram" button** - Mark places without IG (won't reappear)
- **"Mark as Closed" button** - Archive defunct restaurants
- Auto-saves, auto-removes, toast notifications
- Pagination (20 per page)

**How to use:**
```bash
npm run dev
open http://localhost:3000/admin/instagram
```

#### 2. Review Queue ✅
**URL:** `http://localhost:3000/admin/review`
- Keyboard shortcuts (M=merge, D=different, S=skip)
- Currently empty (all resolved)

#### 3. Entity Resolver ✅
- Auto-deduplication via Google Place ID matching
- Handles CSV ingestion → resolution pipeline
- Creates review queue items for ambiguous matches (70-89%)

#### 4. Data Quality Scripts ✅
```bash
npm run clean:addresses        # Archive address-named junk
npm run tag:la-county          # Tag places as LA County
npm run export:instagram:tier12 # Export Tier 1/2 missing IG
npm run find:instagram:tier12   # AI search for handles
npm run merge:instagram         # Merge handles to DB
npm run sync:places            # Sync golden → places table
```

---

## 🎯 Pending Work

### High Priority
1. **Instagram backfill** - 1,149 places missing handles (focus on Tier 1 first)
2. **Google Places enrichment** - Needs API key, would enrich 1,112 places (~$19)
3. **LA region expansion** - 2 regions left (Harbor, Southeast LA)

### Medium Priority
4. **Website Instagram scraper** - Automate handle discovery from restaurant websites
5. **Public site integration** - Show Instagram handles on merchant pages
6. **Data quality dashboard** - Admin insights and metrics

### Low Priority
7. **Pattern improvements** - Better address detection
8. **Multi-location chains** - Handle franchises better
9. **Historical tracking** - Report on closed businesses

---

## 🔑 Key Files to Know

### Documentation
- `SESSION_SUMMARY_2026-02-09.md` - Yesterday's full work log
- `TOMORROW_MORNING_STARTER.md` - Project options for today
- `QUICK_COMMANDS.md` - Copy/paste command reference
- `INSTAGRAM_ADMIN_GUIDE.md` - Instagram tool usage
- `ENRICHMENT_WORKFLOW.md` - Google Places API setup

### Database Schema
- `prisma/schema.prisma` - Full database structure
- Key tables: `golden_records`, `raw_records`, `entity_links`, `review_queue`, `provenance`

### Admin Tools (Next.js)
- `app/admin/instagram/page.tsx` - Instagram backfill UI
- `app/admin/review/page.tsx` - Review queue UI
- `app/api/admin/*` - API routes for admin operations

### Scripts (Node.js)
- `scripts/find-instagram-handles.ts` - AI + pattern search
- `scripts/export-instagram-*.ts` - Export missing IG
- `scripts/clean-address-names.ts` - Archive junk places
- `scripts/enrich-google-places.ts` - Google Places enrichment
- `scripts/resolver-pipeline.ts` - Entity resolution engine

---

## ⚡ Quick Start Commands

```bash
# Boot up (5 seconds)
cd ~/saiko-maps && npm run dev

# Check stats
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const t=await p.golden_records.count({where:{county:'Los Angeles',lifecycle_status:'ACTIVE'}});const w=await p.golden_records.count({where:{county:'Los Angeles',lifecycle_status:'ACTIVE',instagram_handle:{not:null},NOT:{instagram_handle:'NONE'}}});console.log('LA:',t,'active,',w,'with IG (',Math.round(w/t*100)+'%)');await p.\$disconnect()})().catch(console.error)"

# Open admin tools
open http://localhost:3000/admin/instagram
open http://localhost:3000/admin/review
```

---

## 🎯 Recommended Next Steps

**If continuing Instagram backfill:**
1. Open `http://localhost:3000/admin/instagram`
2. Filter to **Tier 1 only**
3. Work through places:
   - Has Instagram? → Add handle
   - No Instagram? → Click "No Instagram"
   - Closed? → Click "Mark as Closed"
4. Goal: Process 50-100 places per session

**If starting a new project:**
- See `TOMORROW_MORNING_STARTER.md` for 6 project options
- Choose based on your goals and available time
- All tools and scripts are ready to use

---

## 🐛 Known Issues

### Google Places Enrichment
- **Status:** Ready to use but needs valid API key
- **Cost:** ~$19 for 1,112 places
- **Docs:** See `ENRICHMENT_WORKFLOW.md`

### Address-Named Places
- **Status:** 28 archived, but pattern may not catch all
- **Solution:** Manual review or improve pattern detection

### Instagram Coverage
- **Status:** 19% for LA County (273/1,423)
- **Challenge:** Many places don't have Instagram or use non-obvious handles
- **Solution:** Manual review is most reliable

---

## 💾 System Architecture

**Master Data Management (MDM) System:**
- **Multi-source ingestion** → `raw_records`
- **Entity resolution** → `entity_links` (deduplication)
- **Golden records** → `golden_records` (single source of truth)
- **Human review** → `review_queue` (ambiguous matches)
- **Provenance tracking** → `provenance` (data lineage)
- **Public site** → `places` (synced from golden_records)

**Key Concepts:**
- **Tier 1-4 sources** - Quality ranking (1=best)
- **Lifecycle status** - ACTIVE/ARCHIVED/CLOSED_PERMANENTLY
- **Survivorship rules** - Prefer non-null, high-tier sources
- **H3 spatial indexing** - Efficient geographic blocking

---

## 📞 Environment

- **Database:** PostgreSQL via Prisma
- **Framework:** Next.js 16 (App Router)
- **APIs:** Anthropic (Claude), Google Places (needs key)
- **Dev Server:** http://localhost:3000

---

## ✅ What's Working

- ✅ Instagram admin tool (saves persist, URL parsing works)
- ✅ Review queue (saves persist, keyboard shortcuts)
- ✅ Entity resolver (auto-dedup via Google Place ID)
- ✅ CSV ingestion pipeline
- ✅ Address cleanup script
- ✅ Provenance system
- ✅ All database operations

---

## 🎯 Your Mission Today

**Pick ONE:**

1. **Instagram backfill** - Add 50-100 handles manually (Tier 1 priority)
2. **Google enrichment** - Add API key, enrich 1,112 places ($19)
3. **LA expansion** - Add Harbor/Southeast LA regions
4. **New feature** - Website scraper, dashboard, or public integration

**Recommendation:** Start with #1 (Instagram) - immediate impact, tools ready!

---

**Start command:**
```bash
cd ~/saiko-maps && npm run dev && open http://localhost:3000/admin/instagram
```

**Need help?** Reference `QUICK_COMMANDS.md` or `INSTAGRAM_ADMIN_GUIDE.md`

---

**🚀 Ready to ship! Good luck!**
