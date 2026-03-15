---
doc_id: SAIKO-PIPELINE-COMMANDS
doc_type: reference
status: active
owner: Bobby Ciccaglione
created: '2026-03-10'
last_updated: '2026-03-10'
project_id: SAIKO
systems:
  - data-pipeline
  - enrichment-pipeline
summary: 'Quick reference for scraping/extraction pipeline commands — progress checks, log monitoring, manual phase triggers, and expected timelines for the two-phase (scrape + AI extract) workflow.'
related_docs:
  - docs/DATA_PIPELINE_QUICK_START.md
  - docs/RESOLVER_AND_PLACES_DATA_FLOW.md
category: engineering
tags: [pipeline, ingestion, era]
source: repo
---
# Saiko Maps — Pipeline Commands

Quick reference for monitoring and managing the scraping/extraction pipeline.

---

## 🔍 Check Progress (Quick Status)

```bash
npx tsx scripts/check-pipeline-progress.ts
```

Shows:
- Scraping progress (X/572 complete)
- Content found (menus, wine lists, about pages)
- Extraction progress
- Estimated time remaining

**Run this anytime to see current status.**

---

## 📊 Monitor Logs

### Scraper Log
```bash
tail -f scrape-output.log
```

### Monitor Log
```bash
tail -f monitor-output.log
```

---

## 🎯 Current Status

**What's Running:**
- ✅ Phase 1: Website scraper (background, PID in scrape-output.log)
- ✅ Auto-monitor: Watching for completion, will auto-start Phase 2

**Expected Timeline:**
- Phase 1: ~1.9 hours (scraping 572 websites)
- Phase 2: ~60-90 minutes (AI extraction, auto-starts when Phase 1 done)
- **Total: ~3-3.5 hours**

---

## 📈 Manual Phase 2 (if needed)

If you want to manually start extraction:

```bash
# Extract all ready places
npx tsx scripts/extract-identity-signals.ts

# Or test on subset first
npx tsx scripts/extract-identity-signals.ts --limit=50 --verbose
```

---

## 🛑 Stop Everything

```bash
# Find running processes
ps aux | grep "scrape-menus\|monitor-and-extract"

# Kill specific process
kill <PID>
```

---

## 📁 Output Files

- `scrape-output.log` - Scraping progress and results
- `monitor-output.log` - Auto-monitor status checks
- Database: `golden_records` table (Prisma)

---

## 🔮 What Happens Next

1. **Phase 1** runs for ~1.9 hours
2. **Monitor** checks every 30 seconds for completion
3. When Phase 1 done, **Phase 2 auto-starts**
4. Phase 2 extracts identity signals (~60-90 min, ~$6)
5. **Done!** You'll have 300-400 places with full identity signals

---

## 💡 Tips

- Check progress anytime with `npx tsx scripts/check-pipeline-progress.ts`
- Monitor logs show real-time updates every 30 seconds
- No need to watch - it runs fully automated
- Safe to close terminal, processes run in background
- Cost: $0 for scraping, ~$6 for AI extraction

---

**Last updated:** Feb 10, 2026
