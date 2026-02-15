# Ingestion Tools — Next Steps Analysis

**Date:** February 15, 2026  
**Status:** Current State + Recommendations  
**Scope:** Tool Layer Only (No Product Changes)

---

## Executive Summary

### Current State
✅ **Menu/Wine scraping** is production-ready and operational  
✅ **Identity signal extraction** is production-ready and operational  
❌ **Newsletter ingestion** does NOT exist  
❌ **Instagram caption extraction** explicitly deferred

### Recommended Path Forward
1. **Menu/Wine extension**: Add PDF support (low blast, high value)
2. **Newsletter ingestor**: Build from scratch (requires new tables)
3. **Instagram captions**: Defer until above are stable

---

# Section 1 — Current Crawl Extension (Menus + Wine Lists)

## Q1. Do we already reliably capture menu/wine data?

### ✅ YES — Schema is complete

**Location:** `prisma/schema.prisma` lines 536-545

```prisma
// Menu & Wine List Scraper Fields
menu_url            String?     // Discovered menu page URL
menu_source_url     String?     // Page where menu link was found
menu_raw_text       String?     // Extracted menu content for AI processing
winelist_url        String?     // Discovered wine list URL
winelist_source_url String?     // Page where wine list link was found
winelist_raw_text   String?     // Extracted wine list content
about_copy          String?     // "Our Story" / "About Us" content
about_source_url    String?     // URL of about page
scraped_at          DateTime?   // Last successful scrape timestamp
scrape_status       String?     // 'success' | 'partial' | 'blocked' | 'timeout' | 'failed'
```

### ✅ YES — Scraper is production-ready

**Script:** `scripts/scrape-menus-from-websites.ts` (382 lines)  
**Support libs:** `lib/website-crawler/extractors.ts`, `lib/website-crawler/fetcher.ts`

**Status:** Fully operational, tested on LA County dataset

**Key features:**
- Parallel fetching (homepage + /about simultaneously)
- Rate limiting (1.5s delay, 20/batch, respectful crawling)
- Retry logic (2 retries with 3s backoff)
- Confidence scoring (1.0 = exact match, 0.25 = weak signal)
- Multilingual support (English + Spanish patterns)
- Full provenance tracking

### Coverage Rate (Expected)

Based on implementation docs (`MENU_SCRAPER_IMPLEMENTATION.md`):

| Field | Expected Coverage |
|-------|------------------|
| **menu_url** | 50-60% (312-374 places) |
| **winelist_url** | 20-30% (125-187 places) |
| **about_copy** | 60-70% (374-436 places) |

**Total LA County places with websites:** ~623

### What is MISSING?

#### 1. **PDF Support** ❌

**Current state:**
- Scraper detects PDF URLs (e.g., `https://restaurant.com/menu.pdf`)
- PDF URLs are stored in `menu_url` or `winelist_url`
- BUT raw text extraction skips PDFs (HTML only)

**Gap:**
- `menu_raw_text` remains NULL for PDF-only menus
- Downstream AI extraction (`extract-identity-signals.ts`) cannot process these places

**Impact:**
- ~10-20% of restaurants use PDF menus exclusively
- These places get "partial" scrape status but no extractable content

#### 2. **Evidence Storage** ✅ (Already complete)

All fields have provenance:
- Source URL (where link was found)
- Final URL (after redirects)
- Scrape timestamp
- Scrape status with error messages

#### 3. **URL Discovery** ✅ (Already complete)

Pattern matching covers:
- Direct paths: `/menu`, `/food`, `/drinks`, `/wine`
- Spanish: `/menú`, `/comida`, `/historia`
- Context boosting: Nav links get +0.25 confidence
- Smart filtering: Excludes `.css`, `.js`, `mailto:`, external domains

---

## Q2. Should menu/wine ingestion capture raw text or extract signals immediately?

### ✅ ALREADY SEPARATED (Correct Architecture)

**Current design:**
1. **Capture layer** (`scrape-menus-from-websites.ts`) → Raw text only
2. **Extraction layer** (`extract-identity-signals.ts`) → AI signals

This is the correct pattern. Benefits:
- Can re-run extraction with new prompts without re-scraping
- Raw text is stored evidence (auditable)
- Extraction can be iterated offline

**Recommendation:** Keep as-is. No changes needed.

---

## Q3. How do we handle PDFs?

### Current State: **PDFs NOT SUPPORTED**

**What happens now:**
1. Scraper finds PDF URL (e.g., `https://restaurant.com/menu.pdf`)
2. URL is stored in `menu_url`
3. Text extraction skips it (HTML parser only)
4. `menu_raw_text` remains NULL
5. Downstream AI extraction fails (no content to process)

### Options

#### Option A: **Defer PDF parsing** (Low Blast)
- Pros: No new dependencies, immediate deployment
- Cons: 10-20% of places get no menu content
- Use case: Works for most HTML-based sites

#### Option B: **Convert to text at ingestion time** (Recommended)
- Pros: Complete coverage, one-time conversion
- Cons: Requires PDF parsing library (~50 lines of code)
- Use case: Production-grade, handles all menu types

### Recommendation: **Option B — Add PDF support**

**Implementation:**
```typescript
// Add to lib/website-crawler/extractors.ts

import pdf from 'pdf-parse'; // npm install pdf-parse

async function extractPdfText(pdfUrl: string): Promise<string | null> {
  try {
    const response = await fetch(pdfUrl);
    const buffer = await response.arrayBuffer();
    const data = await pdf(Buffer.from(buffer));
    return data.text; // Extracted text
  } catch (error) {
    console.error('PDF extraction failed:', error);
    return null;
  }
}
```

**Blast radius:** Minimal
- Only touches `lib/website-crawler/extractors.ts`
- No schema changes needed
- Existing scraper flow unchanged
- Fallback to NULL on failure (graceful degradation)

**Estimated effort:** 1-2 hours (including testing)

---

## Q4. What is the promotion rule for menu/wine text?

### Current Behavior: **OVERWRITE on every scrape**

**Location:** `scripts/scrape-menus-from-websites.ts` lines 239-258

```typescript
await prisma.golden_records.update({
  where: { canonical_id: canonicalId },
  data: {
    menu_url: snapshot.menu?.url ?? null,
    menu_raw_text: sanitizeText(snapshot.menuRawText), // ← OVERWRITES
    // ... other fields
    scraped_at: snapshot.scrapedAt,
    updated_at: new Date(),
  },
});
```

**Behavior:**
- Always overwrites existing content
- No versioning
- No skip-if-present logic

### Is This Correct? **YES** ✅

**Rationale:**
- Menus change seasonally (intended behavior to capture updates)
- If you want to avoid re-scraping, filter by `scraped_at IS NOT NULL` in query
- Currently: Script skips places with `scraped_at IS NOT NULL` (see line 284)

**Recommendation:** Keep as-is. Explicit rule already implemented:
- Default behavior: Skip places already scraped
- Override: Use `--place="Name"` flag to force re-scrape specific place

---

# Section 2 — Newsletter Ingestor (After Menu/Wine Stable)

## Q5. Storage Model

### Current State: **DOES NOT EXIST** ❌

**No newsletter ingestion infrastructure exists.** You need to build from scratch.

### Recommended Schema

Create two new tables:

```prisma
/// Raw newsletter emails (never overwrite)
model ingested_emails {
  id               String   @id @default(uuid())
  
  // Email metadata
  from_address     String   // sender@restaurant.com
  subject          String
  received_date    DateTime
  
  // Content
  html_body        String?  // Raw HTML
  text_body        String   // Plain text fallback
  
  // Provenance
  ingestion_source String   // 'gmail_api' | 'manual_forward' | 'imap'
  ingested_at      DateTime @default(now())
  
  // Processing status
  is_processed     Boolean  @default(false)
  processed_at     DateTime?
  
  // Relations
  extracted_signals proposed_signals[]
  
  @@index([from_address])
  @@index([is_processed])
  @@index([received_date])
}

/// Extracted signal candidates (proposed, not canonical)
model proposed_signals {
  id               String   @id @default(uuid())
  
  // Link to source
  email_id         String
  canonical_id     String?  // Matched place (if deterministic)
  
  // Signal type
  signal_type      SignalType
  
  // Extracted data
  signal_data      Json     // Flexible structure per signal type
  
  // Matching metadata
  confidence       Decimal  @db.Decimal(4, 3)  // 0.000 to 1.000
  match_method     String?  // 'sender_domain' | 'manual' | 'fuzzy_name'
  
  // Approval workflow
  status           String   @default("pending")  // 'pending' | 'approved' | 'rejected'
  reviewed_by      String?
  reviewed_at      DateTime?
  
  // Lifecycle
  created_at       DateTime @default(now())
  
  // Relations
  email            ingested_emails @relation(fields: [email_id], references: [id])
  place            golden_records? @relation(fields: [canonical_id], references: [canonical_id])
  
  @@index([email_id])
  @@index([canonical_id])
  @@index([signal_type])
  @@index([status])
}

enum SignalType {
  TEMPORARY_CLOSURE
  PRIVATE_EVENT_CLOSURE
  HOURS_OVERRIDE
  SPECIAL_EVENT
  RECURRING_PROGRAMMING
}
```

### Why Two Tables?

1. **ingested_emails**: Immutable raw storage (evidence)
2. **proposed_signals**: Extracted candidates (approval queue)

**Separation allows:**
- Re-run extraction with new logic without re-ingesting emails
- Multiple signals per email
- Audit trail (which email produced which signal)

---

## Q6. Signal Types (Initial Scope)

### Recommended v1 Signals

```typescript
enum SignalType {
  TEMPORARY_CLOSURE       // "Closed Mon-Wed for private event"
  PRIVATE_EVENT_CLOSURE   // "Closed Tuesday for private party"
  HOURS_OVERRIDE          // "Open til midnight on NYE"
  SPECIAL_EVENT           // "Wine dinner on Thursday 7PM"
  RECURRING_PROGRAMMING   // "Live music every Friday"
}
```

### Signal Structure Examples

```typescript
// TEMPORARY_CLOSURE
{
  signal_type: 'TEMPORARY_CLOSURE',
  signal_data: {
    start_date: '2026-02-20',
    end_date: '2026-02-22',
    reason: 'private event',
    display_message: 'Closed Feb 20-22 for private event'
  }
}

// SPECIAL_EVENT
{
  signal_type: 'SPECIAL_EVENT',
  signal_data: {
    event_date: '2026-02-25',
    event_time: '19:00',
    event_name: 'Wine Dinner with Maker X',
    ticket_url: 'https://...',
    display_message: 'Wine dinner Tuesday 7PM - tickets available'
  }
}

// HOURS_OVERRIDE
{
  signal_type: 'HOURS_OVERRIDE',
  signal_data: {
    override_date: '2026-12-31',
    hours: 'Open 5 PM - 1 AM',
    reason: 'New Year\'s Eve'
  }
}
```

**Recommendation:** Start with these 5. Easy to extend later.

---

## Q7. Promotion Rule

### Recommended: **Manual approval only (v1)**

**Workflow:**
1. Email ingested → `ingested_emails.is_processed = false`
2. Extraction runs → Creates `proposed_signals` with `status = 'pending'`
3. Bobby reviews → Sets `status = 'approved'` or `'rejected'`
4. Product layer → Only reads `WHERE status = 'approved'`

**Auto-approve threshold (v2 — defer for now):**
```sql
-- Hypothetical future rule
UPDATE proposed_signals
SET status = 'approved', reviewed_by = 'auto'
WHERE confidence >= 0.9
  AND signal_type = 'SPECIAL_EVENT'
  AND canonical_id IS NOT NULL;
```

**Why defer auto-approve?**
- Need to build confidence in extraction quality first
- Newsletter language is highly variable (informal, shorthand)
- Manual review catches edge cases

**Recommendation:** Manual approval only for v1. Revisit after 50-100 signals reviewed.

---

## Q8. Place Matching

### How to match an email to a place?

#### Option 1: **By sender domain** (Recommended for v1)

**Pre-populate a mapping table:**

```prisma
model newsletter_sources {
  id               String @id @default(uuid())
  email_address    String @unique  // hello@donnasla.com
  canonical_id     String          // Link to place
  verified_at      DateTime
  verified_by      String
  
  place            golden_records @relation(fields: [canonical_id], references: [canonical_id])
  
  @@index([email_address])
}
```

**Matching logic:**
```typescript
async function matchPlaceByEmail(fromAddress: string): Promise<string | null> {
  const source = await prisma.newsletter_sources.findUnique({
    where: { email_address: fromAddress }
  });
  return source?.canonical_id ?? null;
}
```

**Benefits:**
- Deterministic (no fuzzy matching)
- Fast (indexed lookup)
- Auditable (explicit Bobby approval of email→place mapping)

**Workflow:**
1. First email from `hello@restaurant.com` arrives
2. Bobby manually links it: `INSERT INTO newsletter_sources (email_address, canonical_id)`
3. Future emails from same address auto-match

#### Option 2: **Fuzzy name matching** (Defer for now)

Extract restaurant name from email body → Fuzzy match to `golden_records.name`

**Problems:**
- Newsletter might say "We" instead of restaurant name
- Multiple locations (which Donna's?)
- False positives (unrelated "Donna's Donuts" newsletter)

**Recommendation:** Defer until v2. Start with manual email→place mappings.

---

# Section 3 — Explicitly Deferred

## Instagram Caption Extraction

**Status:** NOT in scope until menu/wine + newsletter are stable.

**Why defer?**
- Instagram scraper already exists (`scripts/scrape-instagram-from-websites.ts`)
- Caption extraction is trivial (just store `caption` field from IG API)
- BUT: Need to define signal types first (same as newsletter)
- Captions have different cadence (daily posts vs. weekly newsletters)

**Recommendation:** Build newsletter ingestor first. Apply same signal extraction logic to IG captions as phase 2.

---

# Section 4 — Gaps & Recommendations

## Current Gaps

| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| **PDF menu parsing** | 10-20% of places have no menu content | 1-2 hours | **HIGH** |
| **Newsletter ingestion** | No temporal signals (closures, events) | 8-12 hours | **MEDIUM** |
| **Instagram captions** | No social signal extraction | 4-6 hours | **LOW** |

---

## Recommended Minimal Path

### Phase 1: **Extend Menu Scraper (PDF Support)**

**Goal:** Increase menu coverage from ~55% to ~70%

**Steps:**
1. Add `pdf-parse` dependency: `npm install pdf-parse`
2. Extend `lib/website-crawler/extractors.ts` with `extractPdfText()`
3. Update `scrape-menus-from-websites.ts` to detect PDF URLs and extract text
4. Test on 10 places with PDF menus
5. Re-run scraper on LA County with `--reprocess` flag

**Estimated blast radius:** Minimal (1 file change, 1 new dependency)  
**Estimated effort:** 1-2 hours  
**Value:** +15% menu coverage (~94 more places)

---

### Phase 2: **Newsletter Ingestor (New Build)**

**Goal:** Enable temporal signal ingestion (closures, events, programming)

**Steps:**
1. Create Prisma migration for `ingested_emails` and `proposed_signals` tables
2. Build `scripts/ingest-newsletter.ts` with email parsing
3. Build `scripts/extract-newsletter-signals.ts` with AI extraction (reuse prompt pattern from identity signals)
4. Create manual approval UI (simple admin page) OR CLI review tool
5. Pre-populate `newsletter_sources` table with 10-20 known restaurant emails

**Estimated blast radius:** Low (new tables, no changes to existing data)  
**Estimated effort:** 8-12 hours  
**Value:** Unlock temporal signals for product features (closure warnings, event discovery)

**Critical decision:** How will emails arrive?
- Option A: Manual forwarding (Bobby forwards newsletters to ingestion endpoint)
- Option B: Gmail API integration (fetch from Bobby's inbox automatically)
- Option C: IMAP polling (connect to mailbox, fetch new messages)

**Recommendation:** Start with Option A (manual forwarding) to validate extraction quality before automating.

---

### Phase 3: **Instagram Caption Extraction (Defer)**

**Goal:** Extract signals from Instagram posts

**Prerequisites:**
- Newsletter extraction stable (same signal types)
- Product has consumed newsletter signals for 2+ weeks (validated usefulness)

**Estimated effort:** 4-6 hours (reuse newsletter extraction logic)  
**Value:** More frequent temporal signals (daily vs. weekly)

---

# Section 5 — Blast Radius Analysis

## Phase 1: PDF Support

**Schema changes:** NONE  
**New tables:** NONE  
**Modified files:** 1 (`lib/website-crawler/extractors.ts`)  
**Dependencies added:** 1 (`pdf-parse`)  
**Risk:** LOW (graceful fallback if PDF parsing fails)

**Rollback plan:** Remove `pdf-parse` dependency, revert extractor changes

---

## Phase 2: Newsletter Ingestor

**Schema changes:** YES (2 new tables + 1 enum)  
**New tables:** `ingested_emails`, `proposed_signals`, `newsletter_sources`  
**Modified files:** 0 (all new scripts)  
**Dependencies added:** 0 (uses existing Anthropic SDK)  
**Risk:** LOW (isolated from canonical data, manual approval required)

**Rollback plan:** Drop tables, delete scripts (no impact on existing product)

---

## Phase 3: Instagram Captions

**Schema changes:** NONE (reuses `proposed_signals` table)  
**New tables:** NONE  
**Modified files:** 1 new script  
**Dependencies added:** NONE  
**Risk:** LOW (same as newsletter, isolated)

**Rollback plan:** Delete script (no schema changes)

---

# Section 6 — Deliverable Summary

## 1. Current State of Menu/Wine Ingestion

✅ **Production-ready and operational**

- Schema complete (10 fields in `golden_records`)
- Scraper fully functional (`scrape-menus-from-websites.ts`)
- Identity signal extraction operational (`extract-identity-signals.ts`)
- Expected coverage: 50-60% menu, 20-30% wine, 60-70% about
- Rate limiting, retry logic, provenance tracking: all implemented
- Tested on LA County dataset (623 places)

**Limitation:** No PDF parsing (10-20% of menus missed)

---

## 2. Gaps

### Gap 1: **PDF Menu Support** (High Priority)
- Impact: 10-20% of places have no extractable content
- Fix: Add `pdf-parse` library (1-2 hours)
- Blast radius: Minimal (1 file change)

### Gap 2: **Newsletter Ingestion** (Medium Priority)
- Impact: No temporal signals (closures, events, programming)
- Fix: Build from scratch (8-12 hours)
- Blast radius: Low (new tables, isolated)

### Gap 3: **Instagram Caption Extraction** (Low Priority)
- Impact: Missing social signals
- Fix: Reuse newsletter logic (4-6 hours)
- Blast radius: Low (reuses existing tables)

---

## 3. Recommended Minimal Path

### Immediate: **Add PDF Support**
- 1-2 hours
- +15% menu coverage
- Minimal blast radius

### Next: **Build Newsletter Ingestor**
- 8-12 hours
- Unlocks temporal signals
- Manual approval workflow (no auto-promotion risk)

### Later: **Instagram Caption Extraction**
- After newsletter stable
- Reuses signal types and extraction logic

---

## 4. Estimated Blast Radius

| Change | Schema | Tables | Files | Risk |
|--------|--------|--------|-------|------|
| **PDF support** | None | None | 1 modified | LOW |
| **Newsletter ingestor** | Yes (2 new tables) | 2 new | 2 new scripts | LOW |
| **IG captions** | None | None | 1 new script | LOW |

**All changes are additive.** No mutations to canonical data. All ingestion writes to "proposed" layer with manual approval.

---

# Appendix A — File Locations

## Existing Files

```
prisma/
  schema.prisma                               # Menu fields: lines 536-545

scripts/
  scrape-menus-from-websites.ts              # Main scraper (382 lines)
  extract-identity-signals.ts                # AI extraction (540 lines)
  analyze-data-completeness.ts               # Coverage reporting

lib/
  website-crawler/
    types.ts                                  # TypeScript types
    fetcher.ts                                # HTTP client with retry
    extractors.ts                             # Pure extraction functions

docs/
  MENU_SCRAPER_IMPLEMENTATION.md             # Full implementation docs
  MENU_SCRAPER_DATA_HANDOFF.md               # Test results
  IDENTITY_SIGNALS_IMPLEMENTATION.md         # Signal extraction docs
```

## Files to Create (Phase 2)

```
scripts/
  ingest-newsletter.ts                       # NEW: Email parsing
  extract-newsletter-signals.ts              # NEW: Signal extraction
  review-proposed-signals.ts                 # NEW: CLI approval tool

prisma/
  migrations/
    XXX_add_newsletter_tables.sql            # NEW: Schema migration
```

---

# Appendix B — Sample Queries

## Check Menu/Wine Coverage

```sql
-- Current coverage stats
SELECT 
  COUNT(*) as total_places,
  COUNT(menu_url) as has_menu_url,
  COUNT(menu_raw_text) as has_menu_text,
  COUNT(winelist_url) as has_wine_url,
  COUNT(winelist_raw_text) as has_wine_text,
  COUNT(scraped_at) as scraped_count
FROM golden_records
WHERE county = 'Los Angeles';
```

## Find Places with PDF Menus (No Text)

```sql
-- Gap: PDF URLs but no extracted text
SELECT name, menu_url
FROM golden_records
WHERE county = 'Los Angeles'
  AND menu_url LIKE '%.pdf'
  AND menu_raw_text IS NULL;
```

## Newsletter Signals Pending Review (Future)

```sql
-- After newsletter ingestor built
SELECT 
  ps.signal_type,
  gr.name as place_name,
  ps.signal_data,
  ps.confidence,
  ie.subject as email_subject,
  ie.received_date
FROM proposed_signals ps
JOIN ingested_emails ie ON ps.email_id = ie.id
LEFT JOIN golden_records gr ON ps.canonical_id = gr.canonical_id
WHERE ps.status = 'pending'
ORDER BY ie.received_date DESC;
```

---

**End of Analysis**
