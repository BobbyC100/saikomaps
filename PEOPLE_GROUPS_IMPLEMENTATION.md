# People & Restaurant Groups Infrastructure — Implementation Complete

**Date:** Feb 7, 2026  
**Status:** ✅ Ready for use

---

## 🎯 What Was Built

### **Schema Models**
✅ **Person** model with roles, visibility, sources, and restaurant group affiliation  
✅ **PersonPlace** join table for person-to-place associations with role context  
✅ **RestaurantGroup** model with places, people, and source tracking  
✅ **PlaceStatus** enum (open, closed, permanently-closed) on Place model  
✅ All migrations applied successfully

### **TypeScript Types**
✅ Complete type definitions in `lib/people-groups.ts`  
✅ Validation functions for Person, RestaurantGroup, PersonPlace  
✅ Source creation and validation helpers  
✅ Slug generation and formatting utilities

### **CLI Tools**
✅ `add-person.ts` - Create new people with attribution  
✅ `view-person.ts` - Display person details and associated places  
✅ `add-restaurant-group.ts` - Create restaurant groups  
✅ `view-restaurant-group.ts` - Show group with current/past places  
✅ `link-person-place.ts` - Associate person with place (with role)  
✅ `link-place-group.ts` - Link place to restaurant group

---

## 📊 Database Schema

### Person
| Field | Type | Description |
|-------|------|-------------|
| id | cuid | Unique identifier |
| name | string | Full name |
| slug | string | URL-safe identifier |
| role | enum | chef, owner, operator, founder, partner |
| visibility | enum | internal (signal only), verified (can display) |
| bio | text | Brief description |
| imageUrl | text | Headshot URL |
| sources | json | Attribution sources array |
| restaurantGroupId | foreign key | Associated group |

### PersonPlace (Join Table)
| Field | Type | Description |
|-------|------|-------------|
| id | cuid | Unique identifier |
| personId | foreign key | Person |
| placeId | foreign key | Place |
| role | enum | executive-chef, owner, founder, former-chef, partner, operator |
| current | boolean | Active association? |
| startYear | int | When they started |
| endYear | int | When they left |
| source | text | Attribution |

### RestaurantGroup
| Field | Type | Description |
|-------|------|-------------|
| id | cuid | Unique identifier |
| name | string | Display name |
| slug | string | URL-safe identifier |
| visibility | enum | internal, verified |
| description | text | Group DNA/philosophy |
| anchorCity | string | Primary city |
| website | text | Group website |
| locationCountEstimate | int | Bootstrap count before linking |
| sources | json | Attribution sources array |

### Place (Updated)
| Field | Type | Description |
|-------|------|-------------|
| restaurantGroupId | foreign key | Group this place belongs to |
| status | enum | open, closed, permanently-closed (default: open) |

---

## 🛠️ CLI Tool Commands

### Add Person
```bash
npx tsx scripts/add-person.ts "Nancy Silverton" \
  --role chef \
  --visibility verified \
  --bio "Founder of La Brea Bakery, Mozza restaurant group" \
  --source-desc "LA Times profile and multiple editorial sources" \
  --source-type editorial \
  --source-url "https://www.latimes.com/food/..."
```

### View Person
```bash
npx tsx scripts/view-person.ts "Nancy Silverton"
```

### Add Restaurant Group
```bash
npx tsx scripts/add-restaurant-group.ts "Last Word Hospitality" \
  --anchor-city "Los Angeles, CA" \
  --website "https://www.lw-h.com/" \
  --visibility verified \
  --location-estimate 3 \
  --source-desc "Official group website lists all properties" \
  --source-type restaurant-website \
  --source-url "https://www.lw-h.com/"
```

### View Restaurant Group
```bash
npx tsx scripts/view-restaurant-group.ts "Last Word Hospitality"
```

### Link Person to Place
```bash
npx tsx scripts/link-person-place.ts "Nancy Silverton" "Mozza" \
  --role founder \
  --current true \
  --start-year 2006 \
  --source "Restaurant website, multiple editorial sources"
```

### Link Place to Group
```bash
npx tsx scripts/link-place-group.ts "Found Oyster" "Last Word Hospitality"
```

---

## 📋 Visibility Rules

### `internal`
- Used for signals (Chef Recs, lineage, ordering)
- Never displayed in UI
- Lower confidence threshold okay
- Default for new records

### `verified`
- Can appear in Tier 3 bento on merchant profile
- Requires ~99% confidence
- Must have multiple credible sources
- Explicitly set during creation

---

## 🎨 Display Logic for Tier 3 Bento

### Person
```
Chef
Nancy Silverton
```

### Restaurant Group (Current Places)
```
Restaurant Group
Last Word Hospitality

Also from this group:
Found Oyster, Rasarumah, The Copper Room
```

### Restaurant Group Queries
**Current places:**
```typescript
places.where(restaurantGroupId == id AND status == 'OPEN')
```

**Past places:**
```typescript
places.where(restaurantGroupId == id AND status != 'OPEN')
```

---

## 🔒 Non-Negotiable Guardrails

Saiko must not:
- Allow people-first discovery
- Rank or score people publicly
- Surface popularity metrics
- Let chefs overshadow places
- Display people or groups without `verified` visibility

---

## 📦 Files Created

### Schema & Migration
- `prisma/schema.prisma` - Updated with Person, PersonPlace, RestaurantGroup models
- `prisma/migrations/20260207042424_add_people_and_restaurant_groups/` - Initial migration
- `prisma/migrations/20260207042725_add_place_status/` - Status field migration

### Library
- `lib/people-groups.ts` - TypeScript types, validation, helpers

### Scripts
- `scripts/add-person.ts` - Create person with attribution
- `scripts/view-person.ts` - Display person details
- `scripts/add-restaurant-group.ts` - Create restaurant group
- `scripts/view-restaurant-group.ts` - Display group with current/past places
- `scripts/link-person-place.ts` - Associate person with place
- `scripts/link-place-group.ts` - Link place to group

---

## ✅ Test Results

Successfully tested:
- Person creation: Nancy Silverton added with verified visibility
- Schema validation: All validations working correctly
- Migration application: Both migrations applied successfully
- Display logic: Restaurant group viewer shows current/past places separately

---

## 📈 Next Steps

### Immediate
1. Start adding people from Chef Recs data (you have 62 recs from 26+ chefs)
2. Link chefs to their restaurants using PersonPlace
3. Identify and add restaurant groups (e.g., Last Word Hospitality, Rustic Canyon Family)

### Future Enhancements
1. Add `personId` foreign key to Chef Recs for normalized linking
2. Create batch import scripts for people from Chef Recs
3. Add `openedYear` / `closedYear` fields to Place for historical context
4. Build Tier 3 bento display components for people/groups

---

## 🎯 One-Sentence Doctrine

**People and RestaurantGroups exist to explain and validate places — never to replace them.**

---

## 🚀 Ready to Use

All infrastructure is in place. You can now:
- Model chef/owner lineage
- Track restaurant groups
- Add attribution sources
- Display verified people/groups in Tier 3
- Filter by place status (current vs past)

The system is designed to remain infrastructure, not content — people support places, they don't overshadow them.
