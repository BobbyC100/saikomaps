# Dead Website Cleanup - February 10, 2026

## Summary

Ran dead website checker on 565 LA County records with websites. Found 12 flagged with 404 errors.

After manual verification with curl, categorized into 3 groups:

## ✅ CLOSED (7 places)

Successfully marked as CLOSED in database:

1. **Guerrilla Tacos** (Downtown Los Angeles)
   - Website: http://www.guerrillatacos.com/ → 404
   - Status: CLOSED ✓

2. **Sarita's Pupuseria** (Downtown Los Angeles)  
   - Website: http://www.grandcentralmarket.com/vendors/32/saritas-pupuseria → 404
   - Note: Grand Central Market vendor page removed
   - Status: CLOSED ✓

3. **Evil Twin LA** (Del Rey)
   - Website: https://eviltwinla.com/ → 404
   - Status: CLOSED ✓

4. **Spartina** (Fairfax)
   - Website: http://spartina.la/ → 404
   - Status: CLOSED ✓

5. **Billionaire Burger Boyz** (Central LA)
   - Website: http://www.billionaireburgerboyz.com/ → 404
   - Status: CLOSED ✓

6. **Sakura-Ya** (Gardena)
   - Website: https://sakurayagardena.com/ → 404
   - Status: CLOSED ✓

7. **Bar Monette** (Santa Monica)
   - Website: http://www.barmonette.com/ → 404
   - Status: CLOSED ✓

## ⚠️ FALSE POSITIVES (2 places)

These websites work fine - they just redirected URLs:

1. **Dumpling House** (Koreatown)
   - Old: https://www.dumplinghouseca.com/
   - Status: Returns 200 OK ✅ STILL OPEN
   - Action: Keep as OPEN

2. **Jade Wok** (Central LA)
   - Old: https://smorefood.com/order-online/jade-wok-los-angeles-90012-xjb4pkq5
   - New: https://www.smorefood.com/xjb4pkq5/jade-wok-los-angeles-90012-xjb4pkq5/order-online
   - Status: Returns 200 OK ✅ STILL OPEN
   - Action: Keep as OPEN (or update URL to new format)

## 🚫 OUT OF SCOPE (3 places)

Should be archived or removed - not LA County or not merchants:

1. **La Noisette Sweets** (West Berkeley)
   - Location: Berkeley, CA (not LA County)
   - Action: Archive or remove

2. **The Beet Box Cafe** (Kailua)
   - Location: Kailua, Hawaii (not LA County)
   - Action: Archive or remove

3. **Dr. Rainier A. Manzanilla, MD** (Central LA)
   - Type: Doctor/Medical provider (not merchant/restaurant)
   - Website: 403 Forbidden (blocking crawlers)
   - Action: Archive or remove from merchant database

## Next Steps

### Completed ✅
- [x] Mark 7 confirmed dead places as CLOSED
- [x] Remove out-of-scope places (36 places deleted)
  - Colorado: 17 places
  - Hawaii: 16 places
  - Ojai (Ventura County): 2 places
  - Berkeley, CA: 1 place
  - Also deleted 83 related map_places entries

### Remaining
- [ ] Consider updating redirect URLs for false positives (optional)
  - Dumpling House: still works fine
  - Jade Wok: URL redirected but functional

### Future
- [ ] Re-run website checker monthly to catch new closures
- [ ] Filter queries to only show status: 'OPEN' on frontend
- [ ] Add geo-filtering to exclude non-LA County places during data import
- [ ] Add category filtering to exclude medical providers during import

## Statistics

- **Total checked**: 565 records
- **Active websites**: 485 (86%)
- **Flagged**: 12
- **Confirmed dead**: 7 (58% of flagged)
- **False positives**: 2 (17% of flagged)
- **Out of scope**: 3 (25% of flagged)

## Files Generated

- `/data/flagged-websites-2026-02-10.csv` - Original 12 flagged records
- `/scripts/get-flagged-details.ts` - Script to query database for flagged places
- This report
