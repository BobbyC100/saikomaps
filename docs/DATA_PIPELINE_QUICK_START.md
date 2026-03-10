# Data Pipeline Quick Reference

Copy this into your new chat: **"Session Starter: Data Pipeline for Saiko Maps - Review @DATA_PIPELINE_SESSION_STARTER.md"**

---

## Current State

✅ **Merchant Page v2** - Complete with bento grid, graceful degradation  
✅ **Data audit scripts** - Can check any field for completeness  
✅ **Manual update scripts** - Instagram & phone bulk updaters ready  

🔴 **Critical gaps:** Instagram (99.7% missing), Pull Quotes (98% missing)  
🟡 **Important gaps:** Vibe Tags (98% missing), Phone (10% missing)

---

## What We Built Today

1. **ActionStrip.tsx** - Nav/Call/Insta buttons (text style, not woodcut)
2. **audit-data.js** - Check completeness of any field
3. **update-instagram.js** - Bulk Instagram handle updates
4. **update-phone.js** - Bulk phone number updates

---

## Files to Review

- `DATA_PIPELINE_SESSION_STARTER.md` - Full context
- `CRITICAL_DATA_UPDATES.md` - Manual workflow guide
- `prisma/schema.prisma` - Database schema
- `scripts/audit-data.js` - Audit tool
- `scripts/update-instagram.js` - Instagram updater
- `scripts/update-phone.js` - Phone updater
- `lib/extractQuote.ts` - Quote extraction logic (could be background job)

---

## Pipeline Goals

1. **Automated backfill** - Instagram, phone, website from Google/web scraping
2. **AI content generation** - Pull quotes (from sources), vibe tags (from reviews)
3. **Refresh scheduling** - Hours daily, photos weekly, reviews monthly
4. **Quality control** - Validation, approval queue, rollback

---

## Quick Commands

```bash
# See full data audit
node scripts/audit-data.js --summary

# List missing Instagram (671)
node scripts/update-instagram.js --list

# List missing phone (68)
node scripts/update-phone.js --list

# Check editorial coverage
node scripts/audit-data.js --field sources
```

---

## Test URLs

```
http://localhost:3000/place/seco           # Has coverage + curator
http://localhost:3000/place/stir-crazy     # Has coverage, no curator
http://localhost:3000/place/great-white-central-la  # Just added IG
```

---

**Ready for next session!** 🚀
