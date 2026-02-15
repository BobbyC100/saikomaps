# Field List: Prisma Schema → API Response

## Complete Field Mapping

### ✅ IDENTITY & BASIC INFO

| Prisma Field | DB Column | API Field | Type | Notes |
|--------------|-----------|-----------|------|-------|
| `id` | `id` | `id` | string | ✅ Mapped |
| `slug` | `slug` | `slug` | string | ✅ Mapped |
| `name` | `name` | `name` | string | ✅ Mapped |
| `status` | `status` | `status` | enum | ✅ Mapped |
| `googlePlaceId` | `google_place_id` | — | — | ❌ Internal only, not exposed |
| `createdAt` | `created_at` | — | — | ❌ Internal only |
| `updatedAt` | `updated_at` | — | — | ❌ Internal only |
| `scope` | `scope` | — | — | ❌ Internal only |

---

### ✅ LOCATION & GEOGRAPHY

| Prisma Field | DB Column | API Field | Type | Notes |
|--------------|-----------|-----------|------|-------|
| `address` | `address` | `address` | string? | ✅ Mapped |
| `latitude` | `latitude` | `latitude` | number? | ✅ Mapped (Decimal → number) |
| `longitude` | `longitude` | `longitude` | number? | ✅ Mapped (Decimal → number) |
| `neighborhood` | `neighborhood` | `neighborhood` | string? | ✅ Mapped (with override logic) |
| `neighborhoodOverride` | `neighborhood_override` | `neighborhood` | string? | ✅ Takes priority if set |
| `neighborhoodId` | `neighborhood_id` | — | — | ❌ Internal FK |
| `city` | `city` | `city` | string? | ✅ Mapped |
| `cityId` | `city_id` | — | — | ❌ Internal FK (used for filtering) |
| `state` | `state` | — | — | ❌ Not customer-facing |
| `county` | `county` | — | — | ❌ Not customer-facing |
| `region` | `region` | — | — | ❌ Not customer-facing |
| `zip` | `zip` | — | — | ❌ Not customer-facing |
| `country` | `country` | — | — | ❌ Not customer-facing |

---

### ✅ TIER 0 ACTIONS (Primary CTAs)

| Prisma Field | DB Column | API Field | Type | Notes |
|--------------|-----------|-----------|------|-------|
| `menuUrl` | `menu_url` | `menuUrl` | string? | ✅ **NEW**: Canonical menu link |
| `winelistUrl` | `winelist_url` | `winelistUrl` | string? | ✅ **NEW**: Canonical wine list |
| `reservationUrl` | `reservation_url` | `reservationUrl` | string? | ✅ Mapped |
| `aboutUrl` | `about_url` | `aboutUrl` | string? | ✅ **NEW**: About/story page |

---

### ✅ CONTACT & SECONDARY ACTIONS

| Prisma Field | DB Column | API Field | Type | Notes |
|--------------|-----------|-----------|------|-------|
| `phone` | `phone` | `phone` | string? | ✅ Normalized US format |
| `instagram` | `instagram` | `instagram` | string? | ✅ Strip @ if present |
| `website` | `website` | `website` | string? | ✅ Fallback URL |

---

### ✅ HOURS & AVAILABILITY

| Prisma Field | DB Column | API Field | Type | Notes |
|--------------|-----------|-----------|------|-------|
| `hours` | `hours` | `hours` | JSON → Record<string, string>? | ✅ Parsed |
| `placesDataCachedAt` | `places_data_cached_at` | `hoursFreshness.cachedAt` | DateTime → ISO string | ✅ Mapped + staleness calculated |
| — | — | `hoursFreshness.isStale` | boolean | ✅ Derived (> 7 days = stale) |

---

### ✅ TRUST LAYER (Editorial Content)

#### Saiko Summary
| Prisma Field | DB Column | API Field | Type | Notes |
|--------------|-----------|-----------|------|-------|
| `saikoSummary` | `saiko_summary` | `saikoSummary.content` | string? | ✅ Mapped |
| `saikoSummaryGeneratedAt` | `saiko_summary_generated_at` | `saikoSummary.generatedAt` | DateTime → ISO string | ✅ Mapped |
| `saikoSummaryModelVersion` | `saiko_summary_model_version` | `saikoSummary.modelVersion` | string | ✅ Mapped |
| `saikoSummaryCoverageIds` | `saiko_summary_coverage_ids` | `saikoSummary.sourceCount` | number | ✅ Array length |

#### Pull Quote
| Prisma Field | DB Column | API Field | Type | Notes |
|--------------|-----------|-----------|------|-------|
| `pullQuote` | `pull_quote` | `pullQuote.quote` | string? | ✅ Mapped |
| `pullQuoteAuthor` | `pull_quote_author` | `pullQuote.author` | string? | ✅ Mapped |
| `pullQuoteSource` | `pull_quote_source` | `pullQuote.source` | string | ✅ Mapped |
| `pullQuoteUrl` | `pull_quote_url` | `pullQuote.url` | string? | ✅ Mapped |
| `pullQuoteType` | `pull_quote_type` | — | — | ❌ Internal classification |

#### Coverage & Sources
| Prisma Relation | API Field | Type | Notes |
|-----------------|-----------|------|-------|
| `coverages` (place_coverages) | `coverages[]` | Array | ✅ Relational data, APPROVED only |
| `editorialSources` | — | JSON? | ❌ Legacy field, replaced by coverages relation |

#### Curator Note
| Prisma Relation | API Field | Type | Notes |
|-----------------|-----------|------|-------|
| `map_places.descriptor` | `curatorNote.note` | string? | ✅ First non-empty descriptor from published maps |
| `map_places.lists.users` | `curatorNote.creatorName` | string | ✅ Map creator name |
| `map_places.lists` | `curatorNote.mapTitle`, `curatorNote.mapSlug` | string | ✅ Map context |

---

### ✅ IDENTITY SIGNALS (Chips/Attributes)

#### Cuisine
| Prisma Field | DB Column | API Field | Type | Notes |
|--------------|-----------|-----------|------|-------|
| `cuisinePrimary` | `cuisine_primary` | `cuisine.primary` | string? | ✅ Saiko editorial |
| `cuisineSecondary` | `cuisine_secondary` | `cuisine.secondary` | string[] | ✅ Saiko editorial |
| `cuisineType` | `cuisine_type` | — | — | ❌ Google-derived, replaced by cuisinePrimary |

#### Attributes & Chips
| Prisma Field | DB Column | API Field | Type | Notes |
|--------------|-----------|-----------|------|-------|
| `priceLevel` | `price_level` | `priceLevel` | number? (1-4) | ✅ $ - $$$$ |
| `intentProfile` | `intent_profile` | `intentProfile` | string? | ✅ Service model |
| `intentProfileOverride` | `intent_profile_override` | — | — | ❌ Internal flag |
| `vibeTags` | `vibe_tags` | `vibeTags` | string[] | ✅ Max 4 for display |
| `category` | `category` | — | — | ❌ Not used in API (replaced by cuisine) |
| `googleTypes` | `google_types` | — | — | ❌ Internal reference |

#### Google Attributes (Filtered)
| Prisma Field | DB Column | API Field | Type | Notes |
|--------------|-----------|-----------|------|-------|
| `googlePlacesAttributes` | `google_places_attributes` | `attributes.accessibility` | string[]? | ✅ Filtered |
| — | — | `attributes.parking` | string[]? | ✅ Filtered |
| — | — | `attributes.dining` | string[]? | ✅ Filtered |

---

### ✅ MEDIA

| Prisma Field | DB Column | API Field | Type | Notes |
|--------------|-----------|-----------|------|-------|
| `googlePhotos` | `google_photos` | `photos.hero` | string? | ✅ First photo, 800px |
| — | — | `photos.gallery` | string[] | ✅ Photos 2-10, 400px each |

---

### ✅ TIPS & RECOMMENDATIONS

| Prisma Field | DB Column | API Field | Type | Notes |
|--------------|-----------|-----------|------|-------|
| `tips` | `tips` | `tips` | string[] | ✅ Curator tips |
| `chefRecs` | `chef_recs` | `chefRecs` | JSON → { chef, items[] }? | ✅ Parsed |

---

### ✅ TAGLINE

| Prisma Field | DB Column | API Field | Type | Notes |
|--------------|-----------|-----------|------|-------|
| `tagline` | `tagline` | `tagline` | string? | ✅ Short descriptor |
| `taglineCandidates` | `tagline_candidates` | — | — | ❌ Internal alternatives |
| `taglineGenerated` | `tagline_generated` | — | — | ❌ Internal timestamp |
| `taglinePattern` | `tagline_pattern` | — | — | ❌ Internal template |
| `taglineSignals` | `tagline_signals` | — | — | ❌ Internal metadata |

---

### ✅ RESTAURANT GROUP

| Prisma Relation | API Field | Type | Notes |
|-----------------|-----------|------|-------|
| `restaurant_groups` | `restaurantGroup.name` | string | ✅ Group name |
| — | `restaurantGroup.slug` | string | ✅ Group slug |
| `restaurantGroupId` | — | FK | ❌ Internal FK |

---

### ✅ MAP APPEARANCES

| Prisma Relation | API Field | Type | Notes |
|-----------------|-----------|------|-------|
| `map_places.lists` | `appearsOn[].id` | string | ✅ Map ID |
| — | `appearsOn[].title` | string | ✅ Map title |
| — | `appearsOn[].slug` | string | ✅ Map slug |
| — | `appearsOn[].coverImageUrl` | string? | ✅ Map cover |
| — | `appearsOn[].creatorName` | string | ✅ Map creator |
| — | `appearsOn[].placeCount` | number | ✅ Total places in map |

---

### ❌ STAGING FIELDS (Admin Only, Not Exposed)

| Prisma Field | DB Column | Notes |
|--------------|-----------|-------|
| `discoveredInstagramHandle` | `discovered_instagram_handle` | ❌ Staging for crawler |
| `discoveredPhone` | `discovered_phone` | ❌ Staging for crawler |
| `discoveredMenuUrl` | `discovered_menu_url` | ❌ Staging for crawler |
| `discoveredWinelistUrl` | `discovered_winelist_url` | ❌ Staging for crawler |
| `discoveredReservationsUrl` | `discovered_reservations_url` | ❌ Staging for crawler |
| `discoveredAboutUrl` | `discovered_about_url` | ❌ Staging for crawler |
| `discoveredAboutCopy` | `discovered_about_copy` | ❌ Staging for crawler (review required) |
| `discoveredFieldsEvidence` | `discovered_fields_evidence` | ❌ Audit trail |
| `discoveredFieldsFetchedAt` | `discovered_fields_fetched_at` | ❌ Freshness tracking |

---

### ❌ RANKING & INTERNAL METADATA (Not Exposed)

| Prisma Field | DB Column | Notes |
|--------------|-----------|-------|
| `rankingScore` | `ranking_score` | ❌ Used for sort order, not customer-facing |
| `lastScoreUpdate` | `last_score_update` | ❌ Internal timestamp |
| `description` | `description` | ❌ Google-generic, replaced by saikoSummary |
| `adUnitOverride` | `ad_unit_override` | ❌ Ad configuration |
| `adUnitType` | `ad_unit_type` | ❌ Ad configuration |

---

## Summary Stats

| Category | Total Fields | Mapped to API | Internal Only | Notes |
|----------|--------------|---------------|---------------|-------|
| **Identity & Basic** | 8 | 4 | 4 | Status, name, slug, id exposed |
| **Location** | 12 | 5 | 7 | Address, lat/lng, neighborhood, city exposed |
| **Actions (URLs)** | 4 | 4 | 0 | **All 3 new crawler URLs exposed** ✅ |
| **Contact** | 3 | 3 | 0 | Phone, instagram, website exposed |
| **Hours** | 2 | 3 | 0 | Hours + derived freshness |
| **Trust Layer** | 13 | 13 | 0 | **All editorial content exposed** ✅ |
| **Identity Signals** | 10 | 7 | 3 | Cuisine, price, intent, vibes, attributes |
| **Media** | 1 | 2 | 0 | Hero + gallery from googlePhotos |
| **Tips & Recs** | 2 | 2 | 0 | Tips + chefRecs exposed |
| **Tagline** | 5 | 1 | 4 | Only final tagline exposed |
| **Relations** | 3 | 3 | 0 | Restaurant group + map appearances |
| **Staging (Crawler)** | 9 | 0 | 9 | **Never exposed to customers** ❌ |
| **Ranking/Internal** | 7 | 0 | 7 | Not customer-facing |
| **TOTAL** | **79** | **47** | **34** | **59% customer-facing** |

---

## Key Takeaways

### ✅ What's Exposed:
1. **All canonical URL fields** (menu, winelist, about) from crawler
2. **All trust/editorial content** (Saiko summary, coverage, curator notes)
3. **Clean identity signals** (Saiko cuisine, not Google cruft)
4. **Filtered Google attributes** (accessibility, parking, dining only)
5. **Hours freshness tracking** (7-day staleness threshold)

### ❌ What's Hidden:
1. **All `discovered_*` staging fields** (admin only)
2. **Internal IDs and FKs** (cityId, neighborhoodId, restaurantGroupId)
3. **Ranking/scoring metadata** (rankingScore, lastScoreUpdate)
4. **Google raw data** (googlePlaceId, googleTypes, cuisineType)
5. **Ad configuration** (adUnitOverride, adUnitType)

### 🔄 What's Transformed:
1. **Neighborhood**: `neighborhoodOverride` → `neighborhood` (override wins)
2. **Hours**: JSON → `Record<string, string>` + staleness boolean
3. **Photos**: JSON array → structured `{ hero, gallery }`
4. **Pull Quote**: 4 separate fields → structured object
5. **Saiko Summary**: 4 fields → structured object with provenance
6. **Cuisine**: 2 fields → structured `{ primary, secondary }`
7. **Google Attributes**: Raw JSON → filtered `{ accessibility, parking, dining }`
