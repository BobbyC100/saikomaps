# Pruning Summary — What Got Cut

Per Bobby's directive: remove generic template scaffolding, lock in Prisma, focus on v2.2 compliance.

---

## ✂️ DELETED (9 files)

1. `lib/data/database.ts` — Multi-vendor abstraction (Supabase/Mongo/Firebase)
2. `DEPLOYMENT.md` — Generic deployment guide
3. `DATA-SOURCE-SETUP.md` — "Choose your database" tutorial
4. `QUICK-START.md` — Generic quick start
5. `DATA-AND-DEPLOYMENT-SUMMARY.md` — Meta-summary
6. `vercel.json` — Vercel config
7. `netlify.toml` — Netlify config
8. `Dockerfile` — Docker setup
9. `.dockerignore` — Docker ignore

**Why:** Noise. Confusion about "which path are we on?"

---

## ✅ KEPT (3 files)

1. `lib/data/merchant-service.ts` — Queries only
2. `lib/data/transformers.ts` — Spec enforcement (needs fixes)
3. `scripts/seed-database.ts` — Seeds scenario-a/b/c slugs

**Why:** These directly support merchant page hierarchy work.

---

## 🔧 CREATED (3 files)

1. `lib/db/prisma.ts` — Single Prisma client (no branching)
2. `docs/LOCAL_DEV.md` — Tiny doc: run, migrate, seed, env vars
3. `TRANSFORMER-AUDIT.md` — v2.2 compliance audit

**Why:** One DB path. Clear next steps.

---

## 📝 UPDATED (3 files)

1. `lib/data/merchant-service.ts` — Now uses Prisma, includes relations
2. `scripts/seed-database.ts` — Seeds scenario-a/b/c (not original slugs)
3. `README.md` — Removed generic guides, points to LOCAL_DEV.md

---

## 🎯 WHAT'S LEFT TO DO

### 1. Match Transformer to Prisma Schema

`TRANSFORMER-AUDIT.md` lists 6 issues:

**Priority 1 (blocks v2.2):**
- ❌ Hero photo exclusion logic broken
- ❌ Hours state not explicit (HoursCard needs hasHours or empty object)
- ❌ Curator note not validated (empty strings pass through)

**Priority 2:**
- ⚠️ Open status should be calculated, not stored
- ⚠️ Address fields might be flat (not nested object)
- ⚠️ Instagram handle needs trim validation

### 2. Update Transformer

`lib/data/transformers.ts` needs fixes based on audit.

Questions for Bobby:
- What does Prisma `place.photos` look like? Hero separate or first photo?
- Are address fields flat (`addressStreet`) or nested (`address.street`)?
- Do you calculate open status or store it?

### 3. Seed Database

```bash
npm run seed
```

Visit:
- `/place/scenario-a`
- `/place/scenario-b`
- `/place/scenario-c`

### 4. Run PR Checklist

Open `merchant-page-implementation-checklist.md` and verify all 11 sections against the 3 scenarios.

---

## 📊 FILE COUNT

**Before pruning:** 45 files  
**After pruning:** 39 files  

**Net change:** -6 files (cleaner, focused)

---

## 💬 MESSAGE FOR "WHOEVER PRODUCED THIS PACKAGE"

> Thanks — we're keeping merchant-service.ts, transformers.ts, and seed-database.ts. We're removing the "choose your database" abstraction and all multi-platform deployment scaffolding. Saiko will use Prisma as the single data path. Please update the transformer to explicitly enforce Merchant Hierarchy v2.2 outputs (Tier 1.5 IG, Hours always render with 'unavailable' state, hero excluded from collage, attributes chips).

---

## ✅ BLOCKERS RESOLVED

**Transformer is now schema-tolerant:**

All 6 issues from `TRANSFORMER-AUDIT.md` fixed with pattern-tolerant logic:
- ✅ Hero exclusion (handles explicit field OR first photo)
- ✅ Hours explicit state (returns available/unavailable)
- ✅ Curator validation (trim, non-empty check)
- ✅ Open status calculated (from hours + current time)
- ✅ Address support (nested OR flat OR formatted string)
- ✅ Instagram normalization (strip @, validate format)

See `TRANSFORMER-V2-FIXES.md` for implementation details.

**No blockers.** Ready to seed and test.

---

*Pruning complete. Saiko now has single Prisma path + schema-tolerant v2.2 transformer.*
