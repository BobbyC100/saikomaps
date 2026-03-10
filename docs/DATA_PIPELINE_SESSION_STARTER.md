# Session Starter: Saiko Maps Data Pipeline

**Date:** February 9, 2026  
**Next Focus:** Build automated data ingestion and update pipeline

---

## 🎯 Mission

Build an efficient data pipeline to:
1. **Ingest new places** from Google Places API
2. **Enrich with editorial content** (sources, quotes, coverage)
3. **Backfill missing data** (Instagram, phone, website)
4. **Keep data fresh** (hours, photos, reviews)
5. **Generate AI content** (pull quotes, vibe tags, curator notes)

---

## 📊 Current Data State

### Database: PostgreSQL with Prisma
- **Total places:** 673
- **Schema:** `/prisma/schema.prisma`
- **API route:** `/app/api/places/[slug]/route.ts`

### Data Completeness Audit (Just Completed)

| Field | Complete | Missing | Priority |
|-------|----------|---------|----------|
| **Instagram** | 0.3% (2) | 🔴 671 | HIGH |
| **Phone** | 89.9% (605) | 🟡 68 | HIGH |
| **Website** | 83.8% (564) | 🟡 109 | MEDIUM |
| **Editorial Sources** | 63.6% (428) | 🟡 245 | MEDIUM |
| **Pull Quote** | 1.9% (13) | 🔴 660 | MEDIUM |
| **Price Level** | 67.9% (457) | 🟡 216 | LOW |
| **Vibe Tags** | 1.9% (13) | 🔴 660 | LOW |
| **Curator Note** | 0.1% (1) | 🔴 672 | LOW |
| **Restaurant Group** | 3.6% (24) | 🔴 649 | LOW |

**Key Issue:** Instagram is the biggest gap (99.7% missing), followed by editorial content (pull quotes, vibe tags).

---

## 🏗️ Current Data Infrastructure

### Existing Tools (Just Built)
1. **`scripts/audit-data.js`** - Check data completeness for any field
2. **`scripts/update-instagram.js`** - Bulk update Instagram handles
3. **`scripts/update-phone.js`** - Bulk update phone numbers

### Current Data Sources
1. **Google Places API** - Used for initial place data, hours, photos, coordinates
2. **Manual entry** - Most Instagram handles, curator notes
3. **Editorial sources** - Stored in `sources` JSON field (428 places have this)

### Database Schema (Key Fields)
```prisma
model Place {
  // Google Places Data
  googlePlaceId      String?
  name               String
  address            String?
  latitude           Decimal?
  longitude          Decimal?
  phone              String?        // 89.9% complete
  website            String?        // 83.8% complete
  instagram          String?        // 0.3% complete 🔴
  hours              Json?
  googlePhotos       Json?
  priceLevel         Int?           // 67.9% complete
  
  // Editorial/AI Content
  sources            Json?          // 63.6% complete
  pullQuote          String?        // 1.9% complete 🔴
  pullQuoteSource    String?
  pullQuoteUrl       String?
  vibeTags           String[]       // 1.9% complete 🔴
  
  // Curator Content
  restaurantGroupId  String?        // 3.6% complete
  
  // Relations
  mapPlaces          MapPlace[]     // Contains curator notes in descriptor field
  restaurantGroup    RestaurantGroup?
}
```

**Note:** Curator notes stored in `mapPlaces.descriptor`, not directly on Place.

---

## 🚀 Pipeline Goals

### Phase 1: Automated Backfill
1. **Instagram scraper** - Extract handles from websites, Google Maps, social links
2. **Phone/Website scraper** - Fill gaps from Google Places API
3. **Photo enrichment** - Increase photo limits (currently 10, could be 20-30)
4. **Price level** - Backfill from Google Places for 216 missing

### Phase 2: Editorial AI Pipeline
1. **Quote extraction** - Parse `sources[].content` to generate `pullQuote` (660 missing)
2. **Vibe tag generation** - AI analysis of reviews → 2-3 vibe tags (660 missing)
3. **Restaurant group detection** - Identify multi-location brands (649 missing)

### Phase 3: Refresh Pipeline
1. **Hours updates** - Daily/weekly refresh from Google Places
2. **Photo updates** - New photos from Google every week
3. **Review monitoring** - Track new editorial coverage

---

## 🎨 Merchant Page Context

### What Data Powers
The merchant page uses this data structure:

**Hero Section:**
- Name, category, neighborhood, price level ✅
- Hero photo from `googlePhotos[0]` ✅
- Hours for status ("Open · Closes 11 PM") ✅

**Action Strip:**
- Nav (latitude/longitude) ✅ 100%
- Call (phone) ✅ 90%
- Insta (instagram) 🔴 0.3%

**Bento Cards:**
- Hours Card ✅ Always shows
- Coverage Card - Needs `pullQuote` OR `sources[].content` 🟡 64%
- Gallery Card ✅ googlePhotos work well
- Curator Card - Needs `mapPlaces.descriptor` 🔴 0.1%
- Vibe Card - Needs `vibeTags` 🔴 1.9%
- Also On Card ✅ Works via map relations

**Current graceful degradation:**
- Hours expands to 6 col if no Coverage
- Gallery expands to 6 col if no Curator
- Cards hide completely if no data

---

## 💡 Quick Win: Quote Extraction

We already have `sources[].content` for 428 places (full article text). We built `/lib/extractQuote.ts` that:
1. Reads `sources[0].content` (full article)
2. Extracts 1-2 compelling sentences (100-180 chars)
3. Returns as displayable quote

**This runs at runtime** in CoverageCard. But we should:
1. **Run it as a background job** to pre-generate quotes
2. **Write to `pullQuote` field** (faster, cleaner)
3. **Dramatically improve Coverage Card presence** (64% → 98%)

---

## 🔧 Technical Stack

- **Framework:** Next.js 16.0.0 (Turbopack)
- **Database:** PostgreSQL with Prisma ORM
- **Current API:** `/app/api/places/[slug]/route.ts`
- **Runtime:** Node.js with dotenv for secrets

### External APIs Available
- Google Places API (we use this)
- Instagram Graph API (could scrape public data)
- OpenAI/Claude (for AI content generation)

---

## 📁 Key Files to Review

### Data Scripts
- `/scripts/audit-data.js` - Audit all fields
- `/scripts/update-instagram.js` - Bulk Instagram updates
- `/scripts/update-phone.js` - Bulk phone updates

### Schema & API
- `/prisma/schema.prisma` - Database schema
- `/app/api/places/[slug]/route.ts` - Place data API

### AI/Extraction Logic
- `/lib/extractQuote.ts` - Quote extraction from article content
- Runs at runtime in `CoverageCard.tsx`

### Documentation
- `CRITICAL_DATA_UPDATES.md` - Manual update workflow
- `INSTAGRAM_UPDATE_GUIDE.md` - Instagram backfill guide
- `MERCHANT_DATA_AUDIT_RESULTS.md` - Previous audit results

---

## 🎯 Pipeline Design Questions

### 1. **Data Sources**
What should we tap into?
- Google Places API (already using)
- Instagram public pages (scrape handles)
- Review aggregators (Yelp, Infatuation, Michelin)
- OpenAI/Claude (generate vibe tags, curator notes)

### 2. **Automation Level**
What should be automated vs. manual?
- **Auto:** Google Places data, photo refreshes, hours updates
- **AI-assisted:** Quote extraction, vibe tags
- **Manual review:** Curator notes, restaurant groups

### 3. **Update Frequency**
How often should data refresh?
- Hours: Daily
- Photos: Weekly
- Editorial: When new sources detected
- Reviews: Monthly

### 4. **Quality Control**
How do we ensure data quality?
- AI confidence scores
- Manual approval queue
- Rollback mechanism
- Data validation rules

---

## 🚧 Known Gaps to Address

### Critical
1. **Instagram handles** - 671 missing (99.7%)
   - Can we scrape from websites?
   - Can we use Google Places "social media" field?
   - Manual research required?

2. **Phone numbers** - 68 missing (10%)
   - Most have addresses - can we query Google Places again?

### Important
3. **Pull quotes** - 660 missing (98%)
   - We have `sources[].content` for 428 places
   - Can extract quotes with existing logic
   - Need background job to pre-generate

4. **Vibe tags** - 660 missing (98%)
   - Could use AI to analyze reviews
   - Generate 2-3 tags per place ("Date night", "Low-key", "Natural wine")

### Nice to Have
5. **Curator notes** - 672 missing (99.9%)
   - Probably stays manual/editorial
   - Could use AI to draft, then human review

6. **Restaurant groups** - 649 missing (96.4%)
   - Need to identify multi-location brands
   - Could scrape from websites or use pattern matching

---

## 📝 Success Metrics

After building the pipeline, we should see:
- **Instagram:** 0.3% → 70%+ (automated scraping + manual fill)
- **Phone:** 89.9% → 95%+ (Google Places backfill)
- **Pull Quote:** 1.9% → 65%+ (extract from existing sources)
- **Vibe Tags:** 1.9% → 50%+ (AI generation)

---

## 🔗 Related Work

### Just Completed (Feb 9, 2026)
- ✅ Merchant Page v2 with bento grid
- ✅ Graceful degradation for missing data
- ✅ Coverage Card with dynamic quote extraction
- ✅ Action Strip with Nav/Call/Insta buttons
- ✅ Data audit scripts
- ✅ Manual update scripts (Instagram, Phone)

### Up Next
- 🔨 Automated data pipeline
- 🔨 Instagram scraper/backfill
- 🔨 Quote generation background job
- 🔨 Vibe tag AI generation
- 🔨 Data refresh scheduling

---

## 💾 Current Environment

- **Dev server:** `http://localhost:3000`
- **Database:** PostgreSQL via Prisma
- **Workspace:** `/Users/bobbyciccaglione/saiko-maps`
- **Branch:** `main`

---

## 🚀 Ready to Start!

Copy this into your new chat to give Cursor full context for building the data pipeline.

**Key questions to answer:**
1. What data sources should we integrate?
2. What should be automated vs. AI-assisted vs. manual?
3. How do we handle data quality and validation?
4. What's the update cadence for different data types?
5. Should we build a background job system or use cron jobs?
