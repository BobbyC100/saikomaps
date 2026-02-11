# Saiko Maps — Platinum Profile Analysis
**LA County Data Completeness Report**  
Generated: February 10, 2026

---

## Executive Summary

**Current State:** 32.2% average completeness across Tier 1+2+3 fields  
**Platinum Goal:** 90% completeness = 19 out of 21 fields filled  
**Current Platinum Places:** 0 out of 1,412 (0%)

The data landscape shows strong infrastructure (100% on core identifiers) but significant gaps in identity signals and content. The pipeline for scraped data is working, but extraction/enrichment needs acceleration.

---

## Data Tiers (Platinum Profile Definition)

### Tier 1 — Essential (Discovery & Contact)
**Average: 62.9%**

Fields required for a place to be discoverable and contactable:
- ✅ `name` (100%)
- ✅ `lat` / `lng` (100%)
- ⚠️ `address_street` (0.1%) — **CRITICAL GAP**
- ⚠️ `neighborhood` (47.3%)
- ⚠️ `category` (47.5%)
- ⚠️ `website` (40.5%)
- ⚠️ `phone` (67.9%)

**Status:** Core identifiers are solid, but contact/classification fields lag behind.

---

### Tier 2 — Important Identity Signals
**Average: 14.9%**

Fields that power discovery, filtering, and trust calibration:
- ❌ `price_tier` (18.6%) — **HIGH PRIORITY**
- ❌ `cuisines` (0.1%) — **BROKEN**
- ⚠️ `instagram_handle` (34.1%)
- ❌ `place_personality` (20.0%) — **HIGH PRIORITY**
- ❌ `cuisine_posture` (16.6%)
- ❌ `signature_dishes` (0.0%) — **MISSING**

**Status:** This is the biggest gap. Identity signals are what differentiate Saiko from Google Maps. Only 15% filled on average.

---

### Tier 3 — Value-Add Content
**Average: 12.0%**

Fields that create unique value and voice:
- ⚠️ `tagline` (21.0%) — **STRONG PROGRESS** (297 done for publish tier)
- ❌ `vibe_words` (0.0%) — **ENGINE ONLY** (not user-facing)
- ❌ `wine_program_intent` (11.2%)
- ⚠️ `service_model` (17.5%)
- ❌ `origin_story_type` (0.0%) — **ENGINE ONLY**
- ⚠️ `about_copy` (18.2%)
- ⚠️ `menu_raw_text` (15.9%)

**Status:** Raw scraped content exists for ~16% of places. Extraction pipeline needs to convert this into structured signals.

---

### Tier 4 — Nice to Have
**Average: 25.8%**

Not counted toward Platinum, but useful for substitution or enhancement:
- ❌ `winelist_raw_text` (3.0%)
- ❌ `hours_structured` (0.0%)
- ✅ `business_status` (100%)
- ❌ `confidence_tier` (0.0%)

---

## Top 10 Data Gaps (by volume)

| Rank | Field | Missing | % Filled | Priority |
|------|-------|---------|----------|----------|
| 1 | `signature_dishes` | 1,412 | 0% | 🔥 **Tier 2** |
| 2 | `vibe_words` | 1,412 | 0% | ⚪ Engine only |
| 3 | `origin_story_type` | 1,412 | 0% | ⚪ Engine only |
| 4 | `address_street` | 1,410 | 0.1% | 🔥 **Tier 1** |
| 5 | `cuisines` | 1,410 | 0.1% | 🔥 **Tier 2** |
| 6 | `wine_program_intent` | 1,254 | 11.2% | 🟡 Tier 3 |
| 7 | `menu_raw_text` | 1,187 | 15.9% | 🟡 Tier 3 |
| 8 | `cuisine_posture` | 1,178 | 16.6% | 🟠 Tier 2 |
| 9 | `service_model` | 1,165 | 17.5% | 🟡 Tier 3 |
| 10 | `about_copy` | 1,155 | 18.2% | 🟡 Tier 3 |

---

## Strategic Recommendations

### Phase 1: Fix Broken Infrastructure (Weeks 1-2)

**1. Address Street (0.1% → 95%)**
- **Impact:** Tier 1 field, required for display on merchant pages and map pins.
- **Effort:** Low — already available from Google Places API.
- **Action:** Backfill from `raw_records` where `source_name = 'google_places'`.

**2. Cuisines (0.1% → 80%)**
- **Impact:** Tier 2 field, critical for filtering and search.
- **Effort:** Medium — needs AI extraction from `category`, `menu_raw_text`, and website content.
- **Action:** Run extraction pipeline using existing scraped data. Use Voice Engine pattern.

**3. Signature Dishes (0% → 50%)**
- **Impact:** Tier 2 field, core to Voice Engine taglines and "Known For" section.
- **Effort:** Medium — AI extraction from `menu_raw_text` (225 places) and website `about_copy` (257 places).
- **Action:** Prioritize places with `menu_raw_text` first, then website content.

---

### Phase 2: Identity Signal Enrichment (Weeks 3-4)

**4. Place Personality (20% → 60%)**
- **Impact:** Tier 2 field, powers collections, badging, and voice.
- **Effort:** Medium — AI classification based on scraped content, website tone, and menu structure.
- **Action:** Expand extraction to all places with `menu_raw_text` or `about_copy`.

**5. Price Tier (18.6% → 70%)**
- **Impact:** Tier 2 field, critical for filtering and expectations.
- **Effort:** Low-Medium — can be inferred from menu prices, category, neighborhood.
- **Action:** Extract from `menu_raw_text` (look for price patterns), use ML fallback for missing.

**6. Instagram Handles (34.1% → 75%)**
- **Impact:** Tier 1 field, high UX value (direct social connection).
- **Effort:** Low — manual scraping or Instagram API.
- **Action:** Scrape from website footers, or use a service like Pipl/Hunter.

---

### Phase 3: Content & Voice (Weeks 5-6)

**7. Taglines (21% → 80%)**
- **Impact:** Tier 3 field, unique to Saiko, powers share cards and merchant pages.
- **Effort:** Low — Voice Engine v2.0 already working.
- **Action:** Run `generate-taglines-v2.ts` on all places with identity signals (currently 328 eligible).
- **Status:** ✅ 297 already done for publish tier.

**8. About Copy (18.2% → 60%)**
- **Impact:** Tier 3 field, provides context and origin story.
- **Effort:** Medium — already scraped for 257 places, needs cleaning/extraction.
- **Action:** Review scraped `about_copy`, extract key sentences, use for Voice Engine input.

**9. Service Model (17.5% → 50%)**
- **Impact:** Tier 3 field, useful for filtering (tasting menus, counter service, etc.).
- **Effort:** Medium — AI classification based on menu structure and website language.
- **Action:** Extract from `menu_raw_text` (look for "omakase", "tasting menu", "prix fixe" patterns).

---

### Phase 4: Polish & Substitution (Ongoing)

**10. Wine Program Intent (11.2% → 40%)**
- **Impact:** Tier 3 field, differentiates natural wine bars and serious programs.
- **Effort:** Low-Medium — extractable from `winelist_raw_text` (43 places) and website content.
- **Action:** Run AI extraction on places with `winelist_raw_text`, look for keywords ("natural", "biodynamic", "low-intervention").

**11. Cuisine Posture (16.6% → 50%)**
- **Impact:** Tier 2 field, subtle identity signal (e.g., "carb-forward", "protein-centric").
- **Effort:** Medium — AI classification from menu items.
- **Action:** Extract from `menu_raw_text`, look for patterns in dish descriptions.

---

## Path to Platinum (90% Goal)

To hit **90% completeness** (19 out of 21 fields), we need to close these gaps:

### Required Fields (must fill to reach 90%)
1. ✅ `name`, `lat`, `lng` (already 100%)
2. 🔥 `address_street` (Tier 1)
3. 🔥 `neighborhood` (Tier 1)
4. 🔥 `category` (Tier 1)
5. 🔥 `website` (Tier 1)
6. 🔥 `phone` (Tier 1)
7. 🔥 `price_tier` (Tier 2)
8. 🔥 `instagram_handle` (Tier 2)
9. 🔥 `place_personality` (Tier 2)
10. 🔥 `cuisine_posture` (Tier 2)
11. 🔥 `signature_dishes` (Tier 2)
12. 🟡 `tagline` (Tier 3)
13. 🟡 `service_model` (Tier 3)
14. 🟡 `about_copy` (Tier 3)
15. 🟡 `menu_raw_text` (Tier 3)

**Allowed misses:** 2 fields (cuisines, vibe_words, wine_program_intent, origin_story_type)

### Fastest Path to First 50 Platinum Places

Focus on the **328 places with `signals_generated_at IS NOT NULL`** (already scraped):

1. ✅ Taglines already done (297/328)
2. Run extraction for `signature_dishes` (AI from menu text)
3. Backfill `address_street` from Google Places API
4. Infer `price_tier` from menu prices
5. Add `instagram_handle` (manual or API scrape)
6. Validate `place_personality`, `cuisine_posture`, `service_model` (already extracted for most)

**Result:** 50-100 Platinum places in 2 weeks.

---

## Tier 4 Substitution Strategy

If a place is missing Tier 3 data, Tier 4 fields can substitute:

| Missing Tier 3 | Substitute with Tier 4 |
|----------------|-------------------------|
| `about_copy` | `winelist_raw_text` (if wine-focused) |
| `wine_program_intent` | `hours_structured` (shows operational rigor) |
| `menu_raw_text` | `business_status` (confirms operational) |

This allows flexibility: a place can be Platinum without perfect Tier 3 coverage if it has strong Tier 4 alternatives.

---

## Metrics to Track

| Metric | Current | Target (30 days) | Target (90 days) |
|--------|---------|------------------|------------------|
| **Platinum Places** | 0 (0%) | 50 (3.5%) | 300 (21%) |
| **Tier 1 Avg** | 62.9% | 85% | 95% |
| **Tier 2 Avg** | 14.9% | 50% | 75% |
| **Tier 3 Avg** | 12.0% | 40% | 65% |
| **Combined Avg** | 32.2% | 60% | 80% |

---

## One-Liner Summary

**Current state:** Infrastructure is strong (name, lat/lng, status), but identity signals (personality, dishes, price) and content (taglines, about copy, menus) need systematic extraction from scraped data. No places hit Platinum yet, but 328 are close with focused backfill work.

**Path forward:** Fix broken fields (address, cuisines, dishes) in Weeks 1-2, enrich identity signals (personality, price) in Weeks 3-4, and polish content (taglines, about copy) in Weeks 5-6. First 50 Platinum places achievable in 2 weeks by focusing on the 328 already-scraped records.
