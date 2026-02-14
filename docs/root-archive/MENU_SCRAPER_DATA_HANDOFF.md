# Menu & Wine List Scraper — Data Handoff

**Date:** February 10, 2026  
**Purpose:** Three key data points for building the menu/wine list scraper

---

## 1. Current `golden_records` Schema

### Existing Fields (Relevant to Scraper)

```prisma
model golden_records {
  canonical_id    String   @id @default(uuid())
  
  // Identifiers
  slug            String   @unique
  google_place_id String?
  
  // Core fields
  name            String
  
  // Contact (EXISTING - we already have these)
  phone           String?
  website         String?              // ← We'll scrape from this
  instagram_handle String?
  
  // Editorial enrichment (EXISTING)
  description     String?
  vibe_tags       String[]
  signature_dishes String[]
  pro_tips        String[]
  
  // Metadata
  updated_at      DateTime @updatedAt
  enriched_at     DateTime? // Last attempted enrichment
  
  // Geographic scope
  county          String?   // 'Los Angeles', etc.
  
  // ... other fields
}
```

### Fields to ADD (New Migration Needed)

```prisma
model golden_records {
  // ... existing fields ...
  
  // Menu & Wine List Data (NEW)
  menu_url           String?    // Link to menu page or PDF
  menu_raw_text      String?    // Extracted menu content for AI processing
  winelist_url       String?    // Link to wine list page or PDF
  winelist_raw_text  String?    // Extracted wine list content
  about_copy         String?    // "Our Story" / "About Us" content
  scraped_at         DateTime?  // Last successful scrape timestamp
}
```

---

## 2. Instagram Scraper Pattern Reference

### Config Pattern

```typescript
const CONFIG = {
  // Rate limiting
  REQUEST_DELAY_MS: 1500,      // Delay between requests (ms)
  BATCH_SIZE: 20,              // Process in batches
  BATCH_DELAY_MS: 5000,        // Delay between batches
  REQUEST_TIMEOUT_MS: 10000,   // Timeout per request

  // Retry logic
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 3000,

  // User agent rotation
  USER_AGENTS: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
    // ... more user agents
  ],
};
```

### Fetch Pattern with Retry

```typescript
async function fetchWithRetry(url: string, retries = CONFIG.MAX_RETRIES): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    clearTimeout(timeout);
    
    if (retries > 0 && !(error instanceof Error && error.name === 'AbortError')) {
      await sleep(CONFIG.RETRY_DELAY_MS);
      return fetchWithRetry(url, retries - 1);
    }
    
    throw error;
  }
}
```

### Database Query Pattern

```typescript
const records = await prisma.golden_records.findMany({
  where: {
    website: { not: null },
    instagram_handle: null,  // ← For menu scraper, remove this filter
    county: 'Los Angeles',
  },
  select: {
    canonical_id: true,
    name: true,
    website: true,
    neighborhood: true,
  },
  orderBy: { data_completeness: 'desc' },
  take: limit || undefined,
});
```

### Update Pattern

```typescript
if (!dryRun) {
  await prisma.golden_records.update({
    where: { canonical_id: record.canonical_id },
    data: {
      menu_url: menuUrl,
      menu_raw_text: menuText,
      // ... other fields
      updated_at: new Date(),
    },
  });
}
```

---

## 3. Test Dataset (20 Places with Websites)

**Exported to:**
- `data/test-websites.json` (full structured data)
- `data/test-websites.csv` (spreadsheet view)

### Sample Records

| Name | Website | Category | Neighborhood |
|------|---------|----------|--------------|
| 85°C Bakery Cafe | http://www.85cbakerycafe.com/ | coffee | Alhambra |
| A&J seafood shack | http://ajseafoodshack.com/ | eat | Eastside |
| Adams Wine Shop | https://adamswineshop.com/ | wine | Los Angeles |
| Agnes Restaurant | https://www.agnesla.com/ | eat | South Arroyo |
| Alta Adams | http://altaadams.com/ | eat | Los Angeles |
| Anajak Thai Cuisine | http://www.anajakthai.com/ | drinks | Sherman Oaks |
| Angelini Osteria | http://www.angelinibeverly.com/ | eat | Fairfax |
| Antico Nuovo | https://www.anticonuovo-la.com/ | eat | Larchmont |
| Augustine Wine Bar | http://www.augustinewinebar.com/ | Wine Bar | Sherman Oaks |
| ... 11 more records |

**Note:** Donna's (https://www.donnasla.com/) was tested manually and is NOT in the current database. You may want to add it as a golden record first.

---

## Test Extraction Results (From Manual Testing)

### Donna's — https://www.donnasla.com/

✅ **Menu URL:** https://www.donnasla.com/menu  
- 2,418 chars extracted
- Content: "Stuffed peppers, arancini, stracciatella, chopped salad..."

❌ **Wine List:** Not found in nav (might be embedded in menu)

✅ **About Copy:** https://www.donnasla.com/our-story  
- 383 chars extracted
- **Identity signal:** "East coast, red sauce joint... Italian-American classics done really well with California ingredients... loud and lively, with warm and familiar service"

### Augustine Wine Bar — http://www.augustinewinebar.com/

✅ **Menu URL:** https://augustinewinebar.com/menu  
✅ **About Copy:** https://augustinewinebar.com/about  
- 1,681 chars extracted
- Rich owner bio: "Dustin Lancaster... Los Feliz... eclectic, artsy and affluent vibe..."

### Alta Adams — http://altaadams.com/

✅ **Menu URL:** https://altaadams.com/menu-alt/  
- Wine list appears embedded in menu page (sections: "DinneR BRUNCH WINE LIST Dessert")

---

## Extraction Pattern Learnings

### What Works ✅

1. **Menu links:** `/menu`, `/food-menu`, `/dinner-menu` paths
2. **About links:** `/our-story`, `/about`, `/philosophy` paths
3. **Text extraction:** Strip nav/footer/scripts, decode entities, collapse whitespace

### What Needs Filtering ❌

1. **False positives:** `.css`, `.js`, external CSS files
2. **Mailto links:** `mailto:info@...` extracted as "wine list"
3. **External domains:** Adams Wine Shop URL appearing on Alta Adams site
4. **Embedded content:** Wine lists often in menu page, not separate

### Recommended Filters

```typescript
// Skip these URL patterns
const skipPatterns = [
  /\.css$/i,
  /\.js$/i,
  /^mailto:/i,
  /instagram\.com/i,
  /facebook\.com/i,
];

// Only accept URLs from same domain
const baseHost = new URL(baseUrl).hostname;
const linkHost = new URL(foundUrl).hostname;
if (linkHost !== baseHost && !linkHost.includes(baseHost.replace('www.', ''))) {
  skip();
}
```

---

## Next Steps

1. Create Prisma migration for new fields
2. Build `scripts/scrape-menus-from-websites.ts` following Instagram pattern
3. Test on 10-20 records with `--dry-run --limit=20`
4. Review results and adjust extraction patterns
5. Run on full 623 LA County places

---

## Files Created

- `scripts/export-test-websites.ts` — Export script for test data
- `scripts/test-menu-extraction.ts` — Manual extraction tester (working prototype)
- `data/test-websites.json` — 19 test records (full data)
- `data/test-websites.csv` — 19 test records (spreadsheet view)
