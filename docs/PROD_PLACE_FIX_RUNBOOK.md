# Production Place Page Fix - Runbook

**Issue**: Place pages return 404 because production database has 0 places.

**Root Cause**: Production Neon database was never seeded after migrations.

---

## Part A: Fix Place Page 404 Handling ✅ DONE

**Changes Made**:
- Updated `app/(viewer)/place/[slug]/page.tsx` to handle API 404 and 500 errors
- Added proper error states:
  - **404**: Shows "Place Not Found" UI with link to browse maps
  - **500**: Shows "Something Went Wrong" with retry button
  - **Loading**: Shows spinner (existing)

**Files Changed**:
- `app/(viewer)/place/[slug]/page.tsx`

**Testing**:
```bash
# Test 404 handling (before seeding prod)
curl https://saikomaps.vercel.app/place/nonexistent-slug
# Should show "Place Not Found" UI in browser

# Test error UI in dev
npm run dev
# Visit http://localhost:3000/place/fake-slug
```

---

## Part B: Seed Production Database

### Option 1: Run Seed Script (Recommended)

**Prerequisites**:
- Production DATABASE_URL from Vercel

**Steps**:

1. **Get Production DATABASE_URL**:
   ```bash
   # Go to Vercel dashboard
   # https://vercel.com/bobbyai/saikomaps/settings/environment-variables
   # Copy the Production DATABASE_URL value
   ```

2. **Run seed script**:
   ```bash
   DATABASE_URL='<paste-prod-url-here>' \
   npx tsx scripts/seed-prod-places.ts
   ```

3. **Verify seeding**:
   ```bash
   # Should output:
   # ✓ Seeded: Seco → /place/seco
   # ✓ Seeded: Budonoki → /place/budonoki
   # ✓ Seeded: Tacos 1986 → /place/tacos-1986
   # ✓ Seeded: Redbird → /place/redbird-downtown-los-angeles
   # ✓ Seeded: Republique → /place/republique
   # ✅ Seed complete! Total places: 5
   ```

4. **Test production endpoints**:
   ```bash
   curl -i https://saikomaps.vercel.app/api/places/seco | head -40
   # Should return HTTP 200 with JSON payload
   
   curl -i https://saikomaps.vercel.app/api/places/budonoki | head -40
   # Should return HTTP 200
   
   curl -i https://saikomaps.vercel.app/api/places/republique | head -40
   # Should return HTTP 200
   ```

5. **Test in browser**:
   - https://saikomaps.vercel.app/place/seco (should load page)
   - https://saikomaps.vercel.app/place/budonoki (should load page)
   - https://saikomaps.vercel.app/place/nonexistent (should show 404 UI)

---

### Option 2: Import from Existing Database (If Available)

**If you have an existing database with real places data**:

1. **Export from source DB**:
   ```bash
   # Example: Export places table
   pg_dump <source-database-url> \
     --table=places \
     --data-only \
     --file=places-export.sql
   ```

2. **Import to production**:
   ```bash
   psql '<prod-database-url>' < places-export.sql
   ```

3. **Verify import**:
   ```bash
   DATABASE_URL='<prod-url>' \
   node -e "
   const {PrismaClient} = require('@prisma/client');
   const db = new PrismaClient();
   db.places.count().then(c => console.log('Places:', c)).finally(() => db.\$disconnect());
   "
   ```

---

## Verification Checklist

- [ ] Production database has places (count > 0)
- [ ] `/api/places/seco` returns 200
- [ ] `/api/places/budonoki` returns 200
- [ ] `/api/places/republique` returns 200
- [ ] `/place/seco` loads page (no infinite loader)
- [ ] `/place/nonexistent-slug` shows 404 UI
- [ ] Error handling works (try disabling network in devtools)

---

## Seed Script Details

**File**: `scripts/seed-prod-places.ts`

**What it does**:
- Upserts 5 curated LA places (seco, budonoki, tacos-1986, redbird, republique)
- Idempotent: safe to run multiple times
- Uses real coordinates and addresses

**Customization**:
- Edit `SEED_PLACES` array to add/modify places
- Replace with real data from your source database

---

## Troubleshooting

### Seed script fails with "DATABASE_URL not set"
- Make sure to prefix command with `DATABASE_URL='...'`
- Check that URL doesn't have quotes or newlines

### Seed script fails with connection error
- Verify DATABASE_URL is correct
- Check Neon database is running
- Ensure IP allowlist permits your connection (if applicable)

### API still returns 404 after seeding
- Verify places were created:
  ```bash
  DATABASE_URL='<prod-url>' \
  node -e "const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();db.places.findMany({select:{slug:true,name:true},take:10}).then(console.log).finally(()=>db.\$disconnect());"
  ```
- Check slug matches exactly (case-sensitive)
- Clear Vercel cache: redeploy or use `?nocache=1` query param

### Place page still shows infinite loader
- Check browser console for errors
- Verify error handling code was deployed
- Try hard refresh (Cmd+Shift+R)

---

## Next Steps (Future)

1. **Bulk import**: If you have a full places dataset, create import script
2. **Production seed job**: Consider automated seeding on first deploy
3. **Data sync**: Set up sync from authoritative source DB if applicable
4. **Monitoring**: Add logging/alerts for empty database state

---

**Status**: Ready to execute
**Estimated time**: 5-10 minutes
**Risk**: Low (seed script is idempotent and safe)
