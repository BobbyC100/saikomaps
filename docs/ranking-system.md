# Saiko Maps Ranking System

**Last Updated:** February 14, 2026  
**Status:** Phase 1 Implemented

---

## Overview

Saiko Maps uses a **transparent, rule-based ranking system** for restaurant discovery. This is NOT an algorithmic recommendation engine — it's a human-authored scoring system with mathematical implementation.

**Core Principle:** Editorial inclusion + authority signals + transparent rules. No ML, no engagement optimization, no learned weights.

---

## Inclusion Rules (Editorial Filter)

A place appears on Saiko ONLY if it meets ONE of:

```
- Has ≥2 verified editorial sources (place_coverages with status=APPROVED)
- Has ≥1 chef recommendation (chefRecs JSON field)
- Has ≥1 Jonathan Gold mention (editorialSources legacy field)
```

**Result:** 108/434 LA places (25%) meet inclusion criteria

---

## Scoring Formula (Human-Authored Weights)

```typescript
function calculateRankingScore(place: Place): number {
  const coverageScore = place.coverageCount * 2;
  const chefRecScore = place.hasChefRec ? 3 : 0;
  const goldScore = place.hasGoldMention ? 2 : 0;
  
  return coverageScore + chefRecScore + goldScore;
}
```

### Weight Rationale

- **Coverage count × 2:** Broad editorial consensus matters
- **Chef rec × 3:** High-signal authority (Saiko's differentiator)
- **Gold mention × 2:** Legacy authority bonus

### Score Distribution (Actual Data)

```
Score  Count
  20     1     (highest: Manuela - 10 sources)
  16     1
  15     1     (Quarter Sheets - 6 sources + chef rec)
  14     1
  13     2
  12     3
  10    13     (strong editorial backing)
   9     2
   8    16
   7     6
   6    19
   5    11
   4    32     (baseline: 2 sources)
```

**Range:** 4-20 points  
**Average:** 6.87 points  
**Median:** ~6 points

---

## Presentation Constraints

### Neighborhood Pages
- **Max 20 places** per neighborhood (anti-infinite scroll)
- **Diversity rule:** No more than 3 consecutive places of same cuisine type
- **No unvetted places:** If it doesn't pass inclusion rules, it doesn't appear

### Map Lists
- **Max 100 places** for initial view
- Ranked by score DESC
- Optional filters: cuisine type, neighborhoods

---

## Database Schema

### Fields Added to `places` Table

```prisma
model places {
  // ... existing fields ...
  
  // Ranking system
  rankingScore      Float?    @map("ranking_score") @default(0)
  lastScoreUpdate   DateTime? @map("last_score_update")
  
  // Index for efficient queries
  @@index([rankingScore(sort: Desc)])
}
```

---

## Implementation

### Scripts

**1. `scripts/compute-ranking-scores.ts`**
- Computes scores for all places in active city
- Applies inclusion rules (2+ sources / chef rec / Gold)
- Dry-run mode available
- Updates `rankingScore` and `lastScoreUpdate` fields

**Usage:**
```bash
npm run score:compute        # Dry run
npm run score:execute        # Execute
npm run score:verify         # Verify results
```

**2. `scripts/verify-ranking.ts`**
- Shows overall ranking statistics
- Lists top 20 ranked places
- Shows distribution by neighborhood
- Verifies scores saved correctly

---

### Query Functions

**File:** `lib/queries/ranked-places.ts`

```typescript
// Get ranked places for neighborhood page
getRankedPlacesForNeighborhood(neighborhoodId, {
  maxPlaces: 20,
  maxConsecutive: 3  // diversity filter
})

// Get ranked places for map list
getRankedPlacesForMapList({
  cityId,
  cuisineType?,
  neighborhoodIds?,
  maxPlaces: 100
})

// Get top-ranked places citywide
getTopRankedPlaces(cityId, limit)

// Get ranking statistics
getRankingStats(cityId)
```

---

### Diversity Filter

**File:** `lib/ranking.ts`

```typescript
applyDiversityFilter(places, maxConsecutive = 3)
```

**Purpose:** Prevent too many consecutive places of same cuisine type

**Behavior:**
- Tracks last N cuisine types in sliding window
- If cuisine appears too often, defer place to end
- Maintains relative order of deferred places
- Does NOT change ranking scores

---

## Current Results (LA)

### Overall Stats
- **Total places:** 434
- **Ranked places:** 108 (25%)
- **Unranked places:** 326 (75%)
- **Average score:** 6.87

### Top 3 Places
1. **Manuela** - 20.0 (10 sources, Downtown)
2. **El Tepeyac Cafe** - 16.0 (8 sources, Central LA)
3. **Quarter Sheets** - 15.0 (6 sources + chef rec, Echo Park)

### Neighborhoods with Most Ranked Places
1. Downtown: 20 places
2. Echo Park: 11 places
3. Silver Lake: 10 places
4. East Hollywood: 10 places

---

## Maintenance

### When to Recompute Scores

**Required:**
- After importing new places
- After adding new coverages
- After adding chef recommendations

**Recommended:**
- Weekly via cron job
- After bulk coverage imports

**Command:**
```bash
npm run score:execute
```

---

## Monitoring

### Key Metrics to Track

1. **Inclusion rate:** % of places meeting inclusion rules
   - Target: 25-30% (quality over quantity)
   
2. **Average score:** Mean ranking score
   - Current: 6.87
   - Healthy range: 5-10

3. **Score distribution:** Histogram of scores
   - Should be roughly normal with long tail

4. **Top source representation:** Which sources dominate top 20
   - Current: Michelin, Infatuation, Time Out balanced

---

## Anti-Gaming Features

### Why This System Resists Gaming

1. **Editorial sources required:** Can't game without verified coverage
2. **Broad consensus valued:** Need multiple sources for high scores
3. **No user signals:** Views/clicks/saves don't affect ranking
4. **Transparent weights:** No hidden ML parameters to reverse-engineer
5. **Chef recs vetted:** Requires verified chef identity

### What Doesn't Work to Game Ranking
- Creating fake review sites (sources must be approved)
- Gaming engagement metrics (not used)
- Paying for placement (not possible)
- SEO manipulation (doesn't affect editorial sources)

---

## Future: Phase 2 Enhancements (Post-Launch)

### Add Authority Weighting Per Source

```typescript
const SOURCE_AUTHORITY: Record<string, number> = {
  'Michelin Guide': 5,
  'Los Angeles Times': 5,
  'Eater LA': 4,
  'The Infatuation': 4,
  'Time Out LA': 3,
  'LA Magazine': 3,
  // ... etc
};
```

### Add Recency Signal

```typescript
function calculateRecencyBonus(sources: Coverage[]): number {
  const recentSources = sources.filter(s => {
    if (!s.publishedAt) return false;
    const monthsOld = dayjs().diff(dayjs(s.publishedAt), 'month');
    return monthsOld <= 6;
  });
  
  return recentSources.length > 0 ? 1 : 0;
}
```

### Add Neighborhood Normalization

Weight scores relative to neighborhood density:
- High-competition neighborhoods (DTLA, Silver Lake): No adjustment
- Low-competition neighborhoods: Small bonus to surface quality places

---

## Design Decisions

### Why Not Use Engagement Signals?

**Rejected:** Views, clicks, time-on-page, saves

**Reason:** Creates feedback loops and optimization games. We want editorial authority, not popularity contests.

### Why Not Use User Reviews?

**Rejected:** Star ratings, review counts

**Reason:** Yelp/Google already do this. Saiko's differentiator is vetted editorial consensus.

### Why Fixed Weights?

**Rejected:** Learned weights from ML

**Reason:** Transparent, auditable, doesn't drift over time. Editorial team can debate and adjust weights explicitly.

---

## Success Criteria

### Phase 1 (Current)
- ✅ Inclusion filtering works (326 places excluded)
- ✅ Scoring is consistent (deterministic)
- ✅ Performance acceptable (<100ms queries)
- ✅ Top places make editorial sense

### Phase 2 (Future)
- [ ] Authority weighting per source
- [ ] Recency bonus for recent coverage
- [ ] Neighborhood normalization
- [ ] Provenance display in UI

---

## API Usage Example

```typescript
// Neighborhood page
const places = await getRankedPlacesForNeighborhood('silver-lake-id', {
  maxPlaces: 20,
  maxConsecutive: 3
});

// Map list
const places = await getRankedPlacesForMapList({
  cityId: 'la-id',
  cuisineType: 'Italian',
  maxPlaces: 50
});

// Top citywide
const topPlaces = await getTopRankedPlaces('la-id', 20);
```

---

**Status:** Phase 1 complete. 108 places ranked using transparent editorial scoring.
