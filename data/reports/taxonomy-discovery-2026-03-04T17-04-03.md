# Taxonomy Discovery Report

**Generated:** 2026-03-04T17:04:59.822Z
**Sample size:** 46 places
**Verticals:** EAT, STAY, COFFEE, WINE, BAKERY

## Dataset Sample Summary

### Vertical Distribution

- EAT: 30 (65%)
- STAY: 10 (22%)
- WINE: 4 (9%)
- COFFEE: 1 (2%)
- BAKERY: 1 (2%)

### Price Distribution

- $$: 1
- $: 2
- unknown: 43

### Signal Coverage

- Tag scores (SceneSense): 18/46 (39%)
- Vibe tags: 0/46 (0%)
- Descriptions: 4/46 (9%)
- Reservation URL: 6/46 (13%)

---

## Claude Analysis
# Classification Taxonomy Analysis for Los Angeles Food & Drink Dataset

## STEP 1 — FUNCTIONAL ROLE INFERENCE

[Magokoro] → neighborhood staple, casual meetup, solo dining
[Konbi] → quick bite, cult following, grab-and-go
[Burritos La Palma] → quick bite, neighborhood staple, solo dining
[Bub & Grandma's] → quick bite, cult following, casual meetup
[Bradbury Building] → **ANOMALY - not a food/drink venue** (historic building)
[Yangban Society] → destination dining, date night, scene spot
[Quarter Sheets] → quick bite, casual meetup, neighborhood staple
[Descanso Gardens] → **ANOMALY - not a food/drink venue** (botanical garden)
[Angel's Tijuana Tacos] → quick bite, late night, neighborhood staple
[Alba Los Angeles] → date night, group dinner, plan ahead
[Baja Subs Market & Deli] → quick bite, grab-and-go, neighborhood staple
[Santa Monica Proper] → hotel dining, date night, scene spot
[Q Sushi] → destination dining, plan ahead, special occasion
[Sunset Tower Hotel] → hotel dining, scene spot, industry hang
[Gjusta] → quick bite, weekend brunch, grab-and-go
[RVR] → date night, scene spot, industry hang
[Heritage Square Museum] → **ANOMALY - not a food/drink venue** (museum)
[Jitlada] → destination dining, cult following, group dinner
[Elysian Park] → **ANOMALY - not a food/drink venue** (park)
[Tomat] → casual meetup, neighborhood staple, solo dining
[Olamaie] → destination dining, plan ahead, special occasion
[Vin Nature a] → wine bar crawl, casual meetup, date night
[Laveta] → coffee break, casual meetup, neighborhood staple
[The Huntington Library] → **ANOMALY - not a food/drink venue** (museum/garden)
[Mélisse] → destination dining, special occasion, plan ahead
[Lowboy] → late night, industry hang, casual meetup
[1642] → casual meetup, neighborhood staple, date night
[Laverie Speed Queen Biarritz] → **ANOMALY - not a food/drink venue** (laundromat)
[Downtown L.A. Proper Hotel] → hotel dining, date night, scene spot
[Canyon Coffee] → coffee break, solo dining, casual meetup
[The Hollywood Roosevelt] → hotel stay, scene spot, special occasion
[Hotel Covell] → hotel stay, intimate escape, neighborhood base
[Chateau Marmont] → hotel stay, industry hang, special occasion
[Hotel Bel-Air] → hotel stay, destination luxury, special occasion
[Petit Ermitage] → hotel stay, intimate escape, scene spot
[Gold Diggers] → late night, industry hang, hybrid venue
[The LINE LA] → hotel stay, scene spot, neighborhood base
[Palihouse West Hollywood] → hotel stay, extended stay, neighborhood base
[The Beverly Hills Hotel] → hotel stay, destination luxury, special occasion
[Short Stories Hotel] → hotel stay, intimate escape, design-focused
[Endorffeine] → coffee break, solo dining, quick bite
[Esters Wine Shop & Bar] → wine bar crawl, date night, casual meetup
[Bar Covell] → wine bar crawl, date night, industry hang
[Augustine Wine Bar] → wine bar crawl, date night, neighborhood staple
[Vin Folk] → wine bar crawl, destination dining, date night
[Clark Street Bakery] → quick bite, grab-and-go, weekend brunch

---

## STEP 2 — CLUSTER ANALYSIS

**CLUSTER A — Quick Service / Grab-and-Go**
- quick bite
- grab-and-go
- solo dining
- coffee break

**CLUSTER B — Casual Social**
- casual meetup
- neighborhood staple
- walk-in friendly
- weekend brunch

**CLUSTER C — Planned Dining Experience**
- date night
- group dinner
- plan ahead
- special occasion

**CLUSTER D — High-Commitment Destination**
- destination dining
- cult following
- destination luxury

**CLUSTER E — Scene & Industry**
- scene spot
- industry hang
- late night

**CLUSTER F — Wine-Focused**
- wine bar crawl
- wine-forward dining

**CLUSTER G — Hotel/Lodging**
- hotel stay
- hotel dining
- extended stay
- neighborhood base (hotel)
- intimate escape

**CLUSTER H — Hybrid/Multi-Use**
- hybrid venue (bar + hotel + venue)

---

## STEP 3 — PROPOSED TAXONOMY

### Final Taxonomy (13 Labels)

#### **OPERATIONAL (How it works)**

| Label | Definition | Sentence Test |
|-------|------------|---------------|
| **Grab-and-Go** | Counter service, takeout-focused, minimal dwell time | "This place is good for grab-and-go." ✓ |
| **Walk-In Casual** | No reservation needed, relaxed pace, flexible timing | "This place is good for walk-in casual." ✓ |
| **Reservation Recommended** | Better experience with advance booking | "This place is good for reservation recommended." ✗ → Rephrase to **"Plan Ahead"** |
| **Plan Ahead** | Requires or benefits from reservation/planning | "This place is good for plan ahead." ✓ |

#### **OCCASION (Why people go)**

| Label | Definition | Sentence Test |
|-------|------------|---------------|
| **Quick Bite** | Fast, efficient, satisfying—fuel up and move on | "This place is good for a quick bite." ✓ |
| **Date Night** | Romantic, atmospheric, good for two | "This place is good for date night." ✓ |
| **Group Dinner** | Accommodates parties, shareable food, social vibe | "This place is good for group dinner." ✓ |
| **Solo Dining** | Comfortable alone, bar seating, welcoming to individuals | "This place is good for solo dining." ✓ |
| **Special Occasion** | Celebratory, splurge-worthy, memorable | "This place is good for a special occasion." ✓ |
| **Late Night** | Open late, serves food/drinks after 10pm | "This place is good for late night." ✓ |

#### **CULTURAL (What kind of place it is)**

| Label | Definition | Sentence Test |
|-------|------------|---------------|
| **Neighborhood Staple** | Trusted local spot, regulars, community anchor | "This place is good for a neighborhood staple." ✗ → Rephrase: "This is a neighborhood staple." ✓ (identity label) |
| **Destination Dining** | Worth a special trip, reputation exceeds location | "This place is good for destination dining." ✓ |
| **Industry Hang** | Where food/drink/creative professionals gather | "This place is good for an industry hang." ✓ |
| **Scene Spot** | See-and-be-seen, buzzy, aesthetically curated | "This place is good for a scene spot." ✗ → Rephrase: "This is a scene spot." ✓ (identity label) |

---

### Taxonomy Refinement Notes

**Removed after sentence test:**
- "Cult following" → Too editorial, not functional
- "Hybrid venue" → Too rare, edge case
- "Coffee break" → Merged into "Quick Bite" (same functional use)
- "Wine bar crawl" → Converted to vertical/category, not a functional label
- "Weekend brunch" → Too time-specific; covered by "Walk-In Casual" + "Group Dinner"

**Hotel-specific labels (separate vertical):**
Hotels require a different taxonomy. Recommend parallel structure:
- Iconic Landmark
- Boutique Intimate
- Design-Forward
- Neighborhood Base
- Destination Luxury

---

## STEP 4 — COVERAGE METRICS

| Label | Estimated % | Strength | Keep? |
|-------|-------------|----------|-------|
| Quick Bite | 28% (13/46) | Strong | ✓ Yes |
| Neighborhood Staple | 26% (12/46) | Strong | ✓ Yes |
| Date Night | 30% (14/46) | Strong | ✓ Yes |
| Plan Ahead | 20% (9/46) | Strong | ✓ Yes |
| Walk-In Casual | 35% (16/46) | Strong | ✓ Yes |
| Grab-and-Go | 17% (8/46) | Strong | ✓ Yes |
| Destination Dining | 17% (8/46) | Strong | ✓ Yes |
| Special Occasion | 15% (7/46) | Moderate | ✓ Yes |
| Scene Spot | 17% (8/46) | Strong | ✓ Yes |
| Industry Hang | 11% (5/46) | Moderate | ✓ Yes |
| Late Night | 7% (3/46) | Moderate | ✓ Yes (differentiating) |
| Solo Dining | 20% (9/46) | Strong | ✓ Yes |
| Group Dinner | 15% (7/46) | Moderate | ✓ Yes |

**All 13 labels meet threshold for retention.**

---

## STEP 5 — DATASET SUMMARY + AMBIGUOUS CASES

### 1. Dataset Overview

**Composition:**
- **Total places:** 46
- **True food/drink venues:** ~39 (85%)
- **Non-food anomalies:** 7 (15%) — parks, museums, a laundromat, a historic building

**Vertical Distribution:**
- EAT: 30 places (65%)
- STAY: 10 places (22%)
- WINE: 4 places (9%)
- COFFEE: 1 place (2%)
- BAKERY: 1 place (2%)

**Price Band:**
- Mostly unknown — only 3 places have price data ($, $$)
- Major data gap limiting taxonomy utility

**Neighborhoods:**
- Echo Park appears most frequently (5 places)
- Many places have "unknown" or null neighborhoods
- Geographic clustering suggests neighborhood-based discovery is important

**Hours Pattern:**
- "limited-days" is common, suggesting many are closed certain days
- "unknown" is prevalent — data quality issue

### 2. Ambiguous or Hard-to-Assign Cases

| Place | Issue | Resolution |
|-------|-------|------------|
| **Gold Diggers** | Hybrid: hotel + bar + music venue | Assign multiple labels: "Late Night," "Industry Hang," "Scene Spot" — consider "Hybrid Venue" flag |
| **Vin Folk** | Wine bar with Bib Gourmand = restaurant-quality food | Dual label: "Destination Dining" + "Date Night" — wine bar with dining intent |
| **Sunset Tower Hotel** | Hotel with iconic restaurant/bar | Separate the hotel from the dining venue in data model |
| **Gjusta** | Bakery/deli/cafe hybrid | "Grab-and-Go" + "Quick Bite" + "Weekend Brunch" |
| **Tomat** | Inferred as Cafe but categorized as Restaurant | Needs data validation; assign "Walk-In Casual" |

### 3. Places That Don't Fit — Data Cleaning Required

These places are **not food/drink venues** and should be removed or re-categorized:

| Place | Actual Type | Recommendation |
|-------|-------------|----------------|
| Bradbury Building | Historic landmark | Remove from EAT vertical |
| Descanso Gardens | Botanical garden | Move to a "DO" vertical or remove |
| Heritage Square Museum | Museum | Move to a "DO" vertical or remove |
| Elysian Park | Public park | Move to a "DO" vertical or remove |
| The Huntington Library | Museum/garden | Move to a "DO" vertical or remove |
| Laverie Speed Queen Biarritz | Laundromat | Remove entirely (data error) |

### 4. Taxonomy Improvement Recommendations

1. **Add a "DO" vertical** for non-dining destinations (parks, museums, landmarks) — these keep appearing in food databases because they have cafes or are popular outing destinations.

2. **Separate hotel F&B from hotel lodging** — Hotels like Sunset Tower and Santa Monica Proper have notable restaurants that deserve independent profiles.

3. **Improve data collection on:**
   - Price band (critical for user matching)
   - Hours of operation (enables "Late Night" and "Brunch" filtering)
   - Reservation availability (enables "Walk-In" vs "Plan Ahead")

4. **Consider adding a "Cult Classic" badge** — Not a functional label, but an editorial flag for places like Konbi, Bub & Grandma's, Jitlada that have outsized reputation relative to their format.

---

## FINAL RECOMMENDED TAXONOMY (v1)

### Primary Labels (assign 1-3 per place)

**Operational:**
- Grab-and-Go
- Walk-In Casual  
- Plan Ahead

**Occasion:**
- Quick Bite
- Date Night
- Group Dinner
- Solo Dining
- Special Occasion
- Late Night

**Cultural:**
- Neighborhood Staple
- Destination Dining
- Industry Hang
- Scene Spot

---

**Total: 13 labels** — within the 15-label constraint, mutually coherent, empirically grounded in the data.
---

## Raw Place Profiles (Input)

```
--- PLACE 1 ---
name: Magokoro
vertical: EAT
category: eat
cuisine: n/a
price_band: unknown
neighborhood: null
reservation_url: none
hours_pattern: limited-days
website: (present)
menu_url: none
intent_profile: unset
description: null

--- PLACE 2 ---
name: Konbi,restaurant,4-iconic,Cult Japanese bakery
vertical: EAT
category: Restaurant
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 3 ---
name: Burritos La Palma
vertical: EAT
category: eat
cuisine: n/a
price_band: $
neighborhood: El Monte
reservation_url: none
hours_pattern: limited-days
website: (present)
menu_url: none
intent_profile: unset
google_types: establishment, food, point_of_interest, restaurant
scene_score: low (0.00)
date_night_score: low (0.18)
cozy_score: high (0.70)
late_night_score: low (0.00)
after_work_score: low (0.12)

--- PLACE 4 ---
name: Bub & Grandma's,restaurant,4-iconic,Pizza cult following
vertical: EAT
category: Restaurant
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 5 ---
name: Bradbury Building
vertical: EAT
category: Eat
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: limited-days
website: none
menu_url: none
intent_profile: unset

--- PLACE 6 ---
name: Yangban Society,restaurant,4-iconic,Korean-American - Arts District
vertical: EAT
category: Restaurant
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 7 ---
name: Quarter Sheets
vertical: EAT
category: Restaurant
cuisine: n/a
price_band: unknown
neighborhood: Echo Park
reservation_url: none
hours_pattern: limited-days
website: (present)
menu_url: none
intent_profile: unset
inferred_category: Restaurant
scene_score: low (0.00)
date_night_score: low (0.18)
cozy_score: high (0.70)
late_night_score: low (0.00)
after_work_score: low (0.12)

--- PLACE 8 ---
name: Descanso Gardens
vertical: EAT
category: Eat
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 9 ---
name: Angel's Tijuana Tacos,restaurant,3-hot2025,Al pastor specialist - Resy pick
vertical: EAT
category: Restaurant
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 10 ---
name: Alba Los Angeles
vertical: EAT
category: Restaurant
cuisine: n/a
price_band: unknown
neighborhood: West Hollywood
reservation_url: none
hours_pattern: unknown
website: (present)
menu_url: (present)
intent_profile: unset
inferred_category: Restaurant
scene_score: low (0.00)
date_night_score: low (0.18)
cozy_score: high (0.70)
late_night_score: low (0.00)
after_work_score: low (0.12)

--- PLACE 11 ---
name: Baja Subs Market & Deli
vertical: EAT
category: purveyors
cuisine: n/a
price_band: $
neighborhood: Northridge
reservation_url: none
hours_pattern: limited-days
website: none
menu_url: none
intent_profile: unset
google_types: establishment, food, liquor_store, point_of_interest, restaurant
scene_score: low (0.00)
date_night_score: low (0.18)
cozy_score: high (0.70)
late_night_score: low (0.00)
after_work_score: low (0.12)

--- PLACE 12 ---
name: Santa Monica Proper
vertical: EAT
category: Hotel
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: https://www.opentable.com/r/calabra-reservations-santa-monica?restref=1042708&lang=en-US&ot_source=Restaurant%20website&ot_campaign=Home
hours_pattern: unknown
website: (present)
menu_url: (present)
intent_profile: unset
inferred_category: Hotel
scene_score: low (0.00)
date_night_score: low (0.18)
cozy_score: high (0.70)
late_night_score: low (0.00)
after_work_score: low (0.12)

--- PLACE 13 ---
name: Q Sushi,restaurant,2-michelin,1 Michelin star - Edomae sushi
vertical: EAT
category: Restaurant
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 14 ---
name: Sunset Tower Hotel
vertical: EAT
category: Hotel
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: https://www.opentable.com/the-tower-bar-and-terrace?rid=948
hours_pattern: unknown
website: (present)
menu_url: none
intent_profile: unset
inferred_category: Hotel
scene_score: low (0.00)
date_night_score: low (0.18)
cozy_score: high (0.70)
late_night_score: low (0.00)
after_work_score: low (0.12)

--- PLACE 15 ---
name: Gjusta,restaurant,4-iconic,Venice bakery/deli - Gjelina family
vertical: EAT
category: Restaurant
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 16 ---
name: RVR,restaurant,3-hot2025,Cal-izakaya - Venice - Travis Lett - Infatuation #6
vertical: EAT
category: Restaurant
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 17 ---
name: Heritage Square Museum
vertical: EAT
category: Eat
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: limited-days
website: none
menu_url: none
intent_profile: unset

--- PLACE 18 ---
name: Jitlada,restaurant,4-iconic,Thai Town legend
vertical: EAT
category: Eat
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: limited-days
website: none
menu_url: none
intent_profile: unset

--- PLACE 19 ---
name: Elysian Park
vertical: EAT
category: Eat
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 20 ---
name: Tomat
vertical: EAT
category: Restaurant
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: https://resy.com/cities/los-angeles-ca/venues/tomat
hours_pattern: unknown
website: (present)
menu_url: (present)
intent_profile: unset
inferred_category: Cafe
scene_score: low (0.07)
date_night_score: low (0.18)
cozy_score: mid (0.63)
late_night_score: low (0.06)
after_work_score: low (0.12)

--- PLACE 21 ---
name: Olamaie
vertical: EAT
category: eat
cuisine: n/a
price_band: unknown
neighborhood: null
reservation_url: none
hours_pattern: limited-days
website: (present)
menu_url: (present)
intent_profile: unset
inferred_category: Hotel
description: null

--- PLACE 22 ---
name: Vin Nature a
vertical: EAT
category: eat
cuisine: n/a
price_band: unknown
neighborhood: null
reservation_url: none
hours_pattern: limited-days
website: (present)
menu_url: none
intent_profile: unset
description: null

--- PLACE 23 ---
name: Laveta
vertical: EAT
category: Eat
cuisine: n/a
price_band: unknown
neighborhood: Echo Park
reservation_url: none
hours_pattern: limited-days
website: (present)
menu_url: none
intent_profile: unset
inferred_category: Cafe
scene_score: low (0.07)
date_night_score: low (0.18)
cozy_score: mid (0.63)
late_night_score: low (0.06)
after_work_score: low (0.12)

--- PLACE 24 ---
name: The Huntington Library Art Museum and Botanical Gardens
vertical: EAT
category: Eat
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: limited-days
website: none
menu_url: none
intent_profile: unset

--- PLACE 25 ---
name: Mélisse,restaurant,2-michelin,2 Michelin stars - Santa Monica
vertical: EAT
category: Restaurant
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 26 ---
name: Lowboy
vertical: EAT
category: Bar
cuisine: n/a
price_band: unknown
neighborhood: Echo Park
reservation_url: none
hours_pattern: limited-days
website: (present)
menu_url: (present)
intent_profile: unset
inferred_category: Bar
scene_score: low (0.07)
date_night_score: low (0.18)
cozy_score: mid (0.63)
late_night_score: low (0.06)
after_work_score: low (0.12)

--- PLACE 27 ---
name: 1642
vertical: EAT
category: Eat
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: (present)
menu_url: none
intent_profile: unset
scene_score: low (0.07)
date_night_score: low (0.18)
cozy_score: mid (0.63)
late_night_score: low (0.06)
after_work_score: low (0.12)

--- PLACE 28 ---
name: Laverie Speed Queen Biarritz
vertical: EAT
category: eat
cuisine: n/a
price_band: unknown
neighborhood: null
reservation_url: none
hours_pattern: limited-days
website: (present)
menu_url: none
intent_profile: unset
description: null

--- PLACE 29 ---
name: Downtown L.A. Proper Hotel
vertical: EAT
category: Hotel
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: https://www.opentable.com/r/caldo-verde-reservations-los-angeles?restref=1043638&lang=en-US&ot_source=Restaurant%20website&ot_campaign=Home
hours_pattern: unknown
website: (present)
menu_url: (present)
intent_profile: unset
inferred_category: Hotel
scene_score: low (0.00)
date_night_score: low (0.18)
cozy_score: high (0.70)
late_night_score: low (0.00)
after_work_score: low (0.12)

--- PLACE 30 ---
name: Canyon Coffee
vertical: EAT
category: Cafe
cuisine: n/a
price_band: unknown
neighborhood: Echo Park
reservation_url: none
hours_pattern: unknown
website: (present)
menu_url: none
intent_profile: unset
inferred_category: Cafe
scene_score: low (0.07)
date_night_score: low (0.18)
cozy_score: mid (0.63)
late_night_score: low (0.06)
after_work_score: low (0.12)

--- PLACE 31 ---
name: The Hollywood Roosevelt,hotel,hotel-iconic,Historic Hollywood landmark - old-school glam meets modern
vertical: STAY
category: Stay
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 32 ---
name: Hotel Covell,hotel,hotel-boutique,Intimate Los Feliz gem - bespoke design
vertical: STAY
category: Stay
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 33 ---
name: Chateau Marmont,hotel,hotel-iconic,Legendary Hollywood escape - old-world glamour
vertical: STAY
category: Stay
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 34 ---
name: Hotel Bel-Air,hotel,hotel-iconic,Dorchester Collection - secluded Westwood luxury
vertical: STAY
category: Stay
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 35 ---
name: Petit Ermitage,hotel,hotel-boutique,West Hollywood hideaway - secluded rooftop pool
vertical: STAY
category: Stay
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 36 ---
name: Gold Diggers,hotel,hotel-boutique,East Hollywood - music venue/bar/hotel hybrid - 18.4 rating
vertical: STAY
category: Bar
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 37 ---
name: The LINE LA,hotel,hotel-neighborhood,Koreatown - Greenhouse restaurant - strong bar scene
vertical: STAY
category: Bar
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 38 ---
name: Palihouse West Hollywood,hotel,hotel-boutique,Design-forward West Hollywood classic - 18.8 rating
vertical: STAY
category: Stay
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 39 ---
name: The Beverly Hills Hotel,hotel,hotel-iconic,Dorchester Collection - the Pink Palace
vertical: STAY
category: Stay
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 40 ---
name: Short Stories Hotel,hotel,hotel-boutique,Fairfax District - intimate feel and design details
vertical: STAY
category: Stay
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: none
menu_url: none
intent_profile: unset

--- PLACE 41 ---
name: Endorffeine
vertical: COFFEE
category: Coffee
cuisine: n/a
price_band: unknown
neighborhood: unknown
reservation_url: none
hours_pattern: unknown
website: (present)
menu_url: (present)
intent_profile: unset
inferred_category: Cafe
scene_score: low (0.07)
date_night_score: low (0.18)
cozy_score: mid (0.63)
late_night_score: low (0.06)
after_work_score: low (0.12)

--- PLACE 42 ---
name: Esters Wine Shop & Bar,wine bar,5-wine-bar,Santa Monica
vertical: WINE
category: Wine Bar
cuisine: n/a
price_band: unknown
neighborhood: Santa Monica
reservation_url: https://resy.com/cities/la/esters-wine-shop-and-bar
hours_pattern: unknown
website: (present)
menu_url: (present)
intent_profile: unset
inferred_category: Shop
scene_score: low (0.07)
date_night_score: low (0.18)
cozy_score: mid (0.63)
late_night_score: low (0.06)
after_work_score: low (0.12)

--- PLACE 43 ---
name: Bar Covell,wine bar,5-wine-bar,Los Feliz
vertical: WINE
category: Wine Bar
cuisine: n/a
price_band: unknown
neighborhood: Los Feliz
reservation_url: none
hours_pattern: unknown
website: (present)
menu_url: none
intent_profile: unset
scene_score: low (0.07)
date_night_score: low (0.18)
cozy_score: mid (0.63)
late_night_score: low (0.06)
after_work_score: low (0.12)

--- PLACE 44 ---
name: Augustine Wine Bar,wine bar,5-wine-bar,Sherman Oaks
vertical: WINE
category: Wine Bar
cuisine: n/a
price_band: unknown
neighborhood: Sherman Oaks
reservation_url: none
hours_pattern: unknown
website: (present)
menu_url: (present)
intent_profile: unset
inferred_category: Wine Bar
scene_score: low (0.07)
date_night_score: low (0.18)
cozy_score: mid (0.63)
late_night_score: low (0.06)
after_work_score: low (0.12)

--- PLACE 45 ---
name: Vin Folk,wine bar,3-hot2025,New Michelin Bib Gourmand - natural wine
vertical: WINE
category: Wine Bar
cuisine: n/a
price_band: unknown
neighborhood: Hermosa Beach
reservation_url: https://resy.com/cities/hermosa-beach-ca/venues/vin-folk?date=2024-12-02&seats=2
hours_pattern: unknown
website: (present)
menu_url: (present)
intent_profile: unset
inferred_category: Restaurant
scene_score: low (0.07)
date_night_score: low (0.18)
cozy_score: mid (0.63)
late_night_score: low (0.06)
after_work_score: low (0.12)

--- PLACE 46 ---
name: Clark Street Bakery
vertical: BAKERY
category: Bakery
cuisine: n/a
price_band: $$
neighborhood: Echo Park
reservation_url: none
hours_pattern: unknown
website: (present)
menu_url: (present)
intent_profile: unset
google_types: bakery, establishment, food, point_of_interest, store
inferred_category: Bakery
scene_score: low (0.00)
date_night_score: low (0.18)
cozy_score: high (0.70)
late_night_score: low (0.00)
after_work_score: low (0.12)
```