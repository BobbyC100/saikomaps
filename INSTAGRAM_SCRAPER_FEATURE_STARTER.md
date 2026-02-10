# 🕷️ Instagram Website Scraper - Feature Build Session

**Copy this into your next Claude chat:**

---

## 🎯 Mission: Build Website Instagram Scraper

**Goal:** Automatically extract Instagram handles from restaurant websites  
**Why:** Automate discovery for the 1,149 places missing handles  
**Expected Impact:** Find 200-400 additional Instagram handles  
**Estimated Time:** 3-4 hours

---

## 📊 Current State

### Instagram Coverage (LA County)
- **Total active places:** 1,423
- **With Instagram:** 273 (19%)
- **Missing Instagram:** 1,149 (81%)
- **Marked as "No Instagram":** TBD (new feature from last session)

### What We Have
- **Manual tool:** `http://localhost:3000/admin/instagram` ✅
- **AI search:** Finds ~40 handles with obvious patterns ✅
- **Database:** 1,149 places have `website` field populated

### The Gap
Many restaurants **have Instagram** but:
- AI can't find them (non-obvious handle names)
- Manual review is slow (1,149 places = 20+ hours)
- **But their website has Instagram links!** (usually in footer)

---

## 🛠️ Feature Requirements

### Core Functionality
1. **Fetch restaurant websites** from `golden_records.website`
2. **Parse HTML** to find Instagram links
3. **Extract handles** from various formats:
   - `https://instagram.com/username`
   - `https://www.instagram.com/username/`
   - `<a href="...">@username</a>`
   - Social media icon links
4. **Save to database** with confidence scoring
5. **Skip already processed** websites (idempotent)

### Non-Functional Requirements
- **Rate limiting** - Respect robots.txt, 1-2 requests/second
- **Error handling** - Skip dead links, timeouts
- **Logging** - Track success/failure rates
- **Dry-run mode** - Preview before saving
- **Progress tracking** - Show X of Y processed

---

## 🏗️ Technical Design

### Option A: Cheerio (Recommended for Most Sites)
**Pros:**
- Fast, lightweight
- Works for static HTML
- No browser overhead

**Cons:**
- Doesn't execute JavaScript
- Won't work for React/Next.js sites

**Dependencies:**
```bash
npm install cheerio
npm install --save-dev @types/cheerio
```

### Option B: Puppeteer (For JavaScript Sites)
**Pros:**
- Full browser, executes JavaScript
- Works for React/Next.js sites
- Can screenshot for debugging

**Cons:**
- Slower (30-60s per site)
- More memory intensive
- More complex error handling

**Dependencies:**
```bash
npm install puppeteer
npm install --save-dev @types/puppeteer
```

### My Recommendation: **Start with Cheerio, add Puppeteer for failures**

---

## 📝 Implementation Plan

### Phase 1: Basic Scraper (1-2 hours)
```typescript
// scripts/scrape-website-instagram.ts

1. Fetch golden_records with:
   - website IS NOT NULL
   - instagram_handle IS NULL
   - lifecycle_status = 'ACTIVE'
   - county = 'Los Angeles'

2. For each website:
   - Fetch HTML (timeout: 10s)
   - Parse for Instagram links
   - Extract handle
   - Score confidence (high/medium/low)

3. Save results to CSV:
   - Name, Website, FoundInstagram, Confidence, GooglePlaceID
```

### Phase 2: Database Integration (30 min)
```bash
# Ingest scraped handles
npm run ingest:csv -- data/instagram-scraped.csv saiko_website_scrape

# Auto-link via Google Place ID
npm run resolver:run

# Merge to golden_records
npm run merge:instagram
```

### Phase 3: Error Handling (30 min)
- Track failed fetches
- Retry with Puppeteer if Cheerio fails
- Log dead links for manual review

### Phase 4: Rate Limiting & Polish (30 min)
- Add delays between requests
- Progress bar
- Stats reporting

---

## 🎯 Success Metrics

**Great Success:** Find 200+ handles  
**Good Success:** Find 100+ handles  
**Acceptable:** Find 50+ handles  

**Coverage Target:** 19% → 30%+ Instagram coverage

---

## 📋 Pre-Flight Checklist

Before starting, make sure:
- ✅ Dev server running: `npm run dev`
- ✅ Database accessible
- ✅ Current stats checked (run command below)
- ✅ Review yesterday's work: `cat SESSION_SUMMARY_2026-02-09.md`

**Check current state:**
```bash
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const withWebsite=await p.golden_records.count({where:{county:'Los Angeles',lifecycle_status:'ACTIVE',website:{not:null},instagram_handle:null}});console.log('Places with website but no IG:',withWebsite);await p.\$disconnect()})().catch(console.error)"
```

---

## 🔧 Starter Code Snippet

```typescript
#!/usr/bin/env node
/**
 * Website Instagram Scraper
 * 
 * Extracts Instagram handles from restaurant websites
 * 
 * Usage: npm run scrape:instagram
 */

import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

interface ScrapeResult {
  name: string;
  website: string;
  instagram_handle: string | null;
  confidence: 'high' | 'medium' | 'low';
  method: 'link' | 'text' | 'icon';
  google_place_id: string;
}

async function scrapeWebsite(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SaikoMaps/1.0)',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Strategy 1: Find Instagram links
    const instagramLinks = $('a[href*="instagram.com"]');
    if (instagramLinks.length > 0) {
      const href = instagramLinks.first().attr('href');
      const match = href?.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      if (match) return match[1];
    }
    
    // Strategy 2: Find @username mentions
    const text = $('body').text();
    const atMatch = text.match(/@([a-zA-Z0-9._]{3,30})\b/);
    if (atMatch) return atMatch[1];
    
    return null;
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

async function main() {
  console.log('🕷️  Website Instagram Scraper\n');
  
  // Get places with websites but no Instagram
  const places = await prisma.golden_records.findMany({
    where: {
      county: 'Los Angeles',
      lifecycle_status: 'ACTIVE',
      website: { not: null },
      instagram_handle: null, // Don't re-process
    },
    select: {
      canonical_id: true,
      name: true,
      website: true,
      google_place_id: true,
    },
    take: 100, // Start with 100 for testing
  });
  
  console.log(`Found ${places.length} places to scrape\n`);
  
  const results: ScrapeResult[] = [];
  let found = 0;
  
  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    console.log(`[${i+1}/${places.length}] ${place.name}...`);
    
    if (!place.website) continue;
    
    const handle = await scrapeWebsite(place.website);
    
    if (handle) {
      console.log(`  ✓ Found: @${handle}`);
      found++;
      results.push({
        name: place.name,
        website: place.website,
        instagram_handle: handle,
        confidence: 'high',
        method: 'link',
        google_place_id: place.google_place_id!,
      });
    } else {
      console.log(`  ⊘ No Instagram found`);
    }
    
    // Rate limiting - wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n✅ Scraping complete!`);
  console.log(`   Found: ${found}/${places.length} (${Math.round(found/places.length*100)}%)`);
  
  // Export to CSV
  if (results.length > 0) {
    const headers = 'Name,Instagram,Confidence,Method,GooglePlaceID,Website';
    const rows = results.map(r => 
      `"${r.name}","${r.instagram_handle}","${r.confidence}","${r.method}","${r.google_place_id}","${r.website}"`
    );
    const csv = [headers, ...rows].join('\n');
    writeFileSync('data/instagram-scraped.csv', csv);
    console.log(`\n📝 Exported to: data/instagram-scraped.csv`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 🧪 Testing Strategy

### Step 1: Test with 5 places (10 min)
```bash
# Modify script to take: 5
npm run scrape:instagram

# Check results
cat data/instagram-scraped.csv
```

### Step 2: Test with 50 places (30 min)
```bash
# If successful, increase to: 50
npm run scrape:instagram

# Ingest found handles
npm run ingest:csv -- data/instagram-scraped.csv saiko_website_scrape
npm run resolver:run
npm run merge:instagram
```

### Step 3: Full run (1-2 hours)
```bash
# Process all ~800 places with websites
npm run scrape:instagram

# Check success rate
# If >10% success rate = worth it!
```

---

## 🚨 Common Challenges & Solutions

### Challenge 1: Website Doesn't Load
**Solution:**
- Timeout after 10s
- Log failed URLs
- Try Puppeteer as fallback

### Challenge 2: Can't Find Instagram Link
**Solution:**
- Check footer/header specifically
- Look for social media icons
- Search for @username in text
- Try multiple selectors

### Challenge 3: Rate Limiting / Blocked
**Solution:**
- Add User-Agent header
- Slow down (2-3s between requests)
- Respect robots.txt
- Use rotating proxies (advanced)

### Challenge 4: False Positives
**Solution:**
- Validate handle format
- Check if handle matches restaurant name
- Score confidence (high/medium/low)
- Manual review for low confidence

---

## 📊 Expected Results

**Based on typical restaurant websites:**
- **30-40% success rate** (300-400 handles found)
- **Most handles in footer** social media section
- **Some in header** nav or contact page
- **False positives:** 5-10% (influencer mentions, food bloggers)

**Best case:** 400+ handles (35% success)  
**Realistic:** 200+ handles (20% success)  
**Worst case:** 100+ handles (10% success)

Even worst case = **worth building!**

---

## 🔄 Integration with Existing System

### After scraping:
```bash
# 1. Ingest scraped data
npm run ingest:csv -- data/instagram-scraped.csv saiko_website_scrape

# 2. Auto-link via Google Place ID (100% confidence)
npm run resolver:run

# 3. Merge handles to golden_records
npm run merge:instagram

# 4. Check coverage improvement
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const t=await p.golden_records.count({where:{county:'Los Angeles',lifecycle_status:'ACTIVE'}});const w=await p.golden_records.count({where:{county:'Los Angeles',lifecycle_status:'ACTIVE',instagram_handle:{not:null},NOT:{instagram_handle:'NONE'}}});console.log('LA:',t,'active,',w,'with IG (',Math.round(w/t*100)+'%)');await p.\$disconnect()})().catch(console.error)"
```

---

## 📁 Files You'll Create

### New Files
- `scripts/scrape-website-instagram.ts` - Main scraper
- `data/instagram-scraped.csv` - Output file
- `SCRAPER_RESULTS.md` - Performance report

### Files You'll Modify
- `package.json` - Add `scrape:instagram` script

### Files to Reference
- `scripts/find-instagram-handles.ts` - See AI search approach
- `scripts/export-instagram-tier12.ts` - See export query
- `scripts/merge-instagram-to-golden.ts` - See merge logic

---

## 🔍 Key Parsing Strategies

### Strategy 1: Find Instagram Links (Most Reliable)
```typescript
const instagramLinks = $('a[href*="instagram.com"]');
const href = instagramLinks.first().attr('href');
const match = href?.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
```

### Strategy 2: Social Media Icons
```typescript
const socialLinks = $('a[class*="social"], a[aria-label*="Instagram"]');
// Look for common class names: .social-instagram, .fa-instagram
```

### Strategy 3: Footer Links
```typescript
const footer = $('footer');
const instagramLink = footer.find('a[href*="instagram.com"]').first();
```

### Strategy 4: @Mentions in Text
```typescript
const bodyText = $('body').text();
const atMatch = bodyText.match(/@([a-zA-Z0-9._]{3,30})\b/);
```

### Strategy 5: Meta Tags
```typescript
const ogInstagram = $('meta[property="instagram:account"]').attr('content');
```

---

## 🎮 NPM Scripts to Add

```json
{
  "scripts": {
    "scrape:instagram": "node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/scrape-website-instagram.ts",
    "scrape:instagram:dry": "node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/scrape-website-instagram.ts --dry-run",
    "scrape:instagram:test": "node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/scrape-website-instagram.ts --limit=10"
  }
}
```

---

## 🧪 Testing Plan

### Test 1: Single Website (5 min)
Pick a known restaurant with Instagram:
```bash
node -e "console.log('Testing: Bestia')" 
# Manually test fetch/parse for bestia.com
```

### Test 2: 10 Websites (15 min)
```bash
npm run scrape:instagram:test
# Should find 2-4 handles (20-40% success)
```

### Test 3: 100 Websites (1 hour)
```bash
npm run scrape:instagram -- --limit=100
# Evaluate success rate, adjust strategy
```

### Test 4: Full Run (2-3 hours)
```bash
npm run scrape:instagram
# Process all ~800 places with websites
```

---

## 📊 Performance Benchmarks

**Expected timing:**
- Cheerio: ~2-3 seconds per website
- Puppeteer: ~30-60 seconds per website

**For 800 websites:**
- Cheerio: ~40 minutes
- Puppeteer: ~8-16 hours (use selectively!)

**Recommendation:** Use Cheerio first, Puppeteer for failed attempts

---

## 🐛 Common Issues & Solutions

### Issue 1: CORS / Blocked Requests
**Solution:** Add realistic User-Agent, respect robots.txt

### Issue 2: JavaScript-Heavy Sites
**Solution:** Fallback to Puppeteer for specific domains

### Issue 3: Rate Limiting
**Solution:** Add 1-2s delays, run overnight if needed

### Issue 4: False Positives
**Solution:** Validate handle, check if it matches restaurant name

### Issue 5: Dead Links / 404s
**Solution:** Skip and log, mark website as invalid

---

## 🎯 Deliverables

By end of session, you should have:

1. ✅ Working scraper script
2. ✅ CSV export with found handles
3. ✅ Integration with existing pipeline
4. ✅ Performance report (success rate, timing)
5. ✅ Documentation for future runs

---

## 🔗 Existing System Integration

### How It Fits:
```
1. Scraper finds handles → data/instagram-scraped.csv
2. Ingest CSV → raw_records (with Google Place IDs)
3. Resolver auto-links → entity_links (100% confidence)
4. Merge script → golden_records.instagram_handle
5. Sync to public → places.instagram
```

**No new infrastructure needed!** Uses existing pipeline.

---

## 📚 Files to Reference During Build

### For scraping logic:
- `scripts/find-instagram-handles.ts` - See pattern matching
- `node_modules/cheerio/...` - Cheerio docs

### For database operations:
- `scripts/export-instagram-tier12.ts` - See query patterns
- `scripts/merge-instagram-to-golden.ts` - See update logic

### For CSV generation:
- `scripts/ingest-editorial-csv.ts` - See CSV parsing
- `data/instagram-backfill-auto.csv` - See format

---

## 💡 Pro Tips

1. **Start small** - Test with 10 sites first
2. **Log everything** - Track success/failure reasons
3. **Validate handles** - Compare to restaurant name
4. **Use dry-run** - Preview before committing
5. **Rate limit** - Be respectful to websites
6. **Error recovery** - Don't crash on one bad site
7. **Progress tracking** - Show X/Y completed

---

## 🎁 Bonus Features (If Time Permits)

- **Confidence scoring** - High (footer link) vs Low (@mention in blog)
- **Domain whitelist** - Known restaurant website builders (Squarespace, Wix)
- **Icon detection** - Find Instagram icon even without text
- **Parallel processing** - Scrape 5-10 at once (with rate limiting)
- **Puppeteer fallback** - Auto-retry with browser for JS sites

---

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies
npm install cheerio
npm install --save-dev @types/cheerio

# 2. Check how many places have websites
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const c=await p.golden_records.count({where:{county:'Los Angeles',lifecycle_status:'ACTIVE',website:{not:null},instagram_handle:null}});console.log('Can scrape:',c,'websites');await p.\$disconnect()})().catch(console.error)"

# 3. Create script
# scripts/scrape-website-instagram.ts

# 4. Add npm script
# "scrape:instagram": "..."

# 5. Run test
npm run scrape:instagram:test

# 6. Run full scrape
npm run scrape:instagram
```

---

## 📈 Success Definition

**This feature is worth it if:**
- Success rate >15% (120+ handles)
- Takes <2 hours to run
- Integrates cleanly with existing pipeline
- Can be re-run monthly for new places

**This feature is NOT worth it if:**
- Success rate <5% (40 handles)
- Takes >8 hours to run
- Requires constant maintenance
- Causes issues with existing system

---

## 🎯 Post-Build Next Steps

After scraper is working:

1. **Schedule regular runs** (monthly)
2. **Document findings** (which sites have IG in footer)
3. **Improve patterns** (learn from failures)
4. **Consider Puppeteer** for top-tier places
5. **Manual tool remains primary** - Scraper is supplementary

---

**Ready to build? Start with:**
```bash
npm install cheerio @types/cheerio
```

**Then tell Claude:**
"Let's build the Instagram website scraper. Start with scripts/scrape-website-instagram.ts using Cheerio. Test with 10 sites first."

---

**🚀 Good luck! This feature could find 200-400 handles automatically!**
