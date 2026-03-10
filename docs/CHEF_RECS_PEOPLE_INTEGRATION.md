# Chef Recs ↔ People System Integration Guide

**Status:** Infrastructure ready, integration pending

---

## 🎯 Current State

### What Works Now
✅ **62 Chef Recs** across 36 restaurants (from Resy & Timeout articles)  
✅ **People model** with full attribution system  
✅ **PersonPlace** associations track chef-restaurant relationships  
✅ Both systems fully operational independently

### What's Next
⚠️ **Link Chef Recs to People** - Optional `personId` foreign key on Chef Recs  
⚠️ **Normalize chef names** - Connect existing Chef Recs to Person records  
⚠️ **Batch import** - Create People from existing Chef Recs data

---

## 🔗 How They Connect

### Chef Recs (Current)
```json
{
  "type": "explicit-recommendation",
  "personName": "Chase Sinzer",
  "fromRestaurant": "Claud and Penny (NYC)",
  "publication": "Resy",
  "reference": {
    "type": "editorial",
    "description": "Named as favorite by Chase Sinzer...",
    "sourceURL": "https://blog.resy.com/...",
    "addedBy": "Saiko",
    "addedAt": "2026-02-07"
  },
  "confidence": "high"
}
```

### Future Enhancement: Add personId
```json
{
  "type": "explicit-recommendation",
  "personName": "Chase Sinzer",
  "personId": "cm...",  // ← NEW: links to Person record
  "fromRestaurant": "Claud and Penny (NYC)",
  ...
}
```

---

## 📊 Rich Queries (Once Linked)

### All recommendations by a specific person
```typescript
const chefRecs = await db.place.findMany({
  where: {
    chefRecs: {
      path: '$[*].personId',
      equals: personId
    }
  }
})
```

### Person with all their recommendations
```typescript
const person = await db.person.findUnique({
  where: { slug: 'chase-sinzer' },
  include: {
    personPlaces: {
      include: { place: true }
    }
  }
})

// Then filter places where chefRecs contains this personId
```

### Trust-weighted recommendations (future)
```typescript
// Weight recs by person visibility
// verified = 1.0x, internal = 0.5x
```

---

## 🚀 Migration Plan

### Phase 1: Add personId to Chef Recs Schema ✅ Can do now
```typescript
// Update lib/chef-recs.ts
export interface ChefRec {
  type: ChefRecType
  personName: string
  personId?: string  // ← NEW
  fromRestaurant?: string
  quote?: string
  // ... rest of fields
}
```

### Phase 2: Create People from existing Chef Recs
```bash
# New script: scripts/import-people-from-chef-recs.ts
# Reads all Chef Recs, extracts unique people, creates Person records
npx tsx scripts/import-people-from-chef-recs.ts
```

### Phase 3: Backfill personId in Chef Recs
```bash
# New script: scripts/link-chef-recs-to-people.ts
# For each place with chefRecs:
#   - Find Person by name match
#   - Add personId to chefRec
#   - Update place
npx tsx scripts/link-chef-recs-to-people.ts
```

### Phase 4: Use in UI (when ready)
```typescript
// Display chef rec with verified person info
if (chefRec.personId) {
  const person = await db.person.findUnique({
    where: { id: chefRec.personId }
  })
  
  if (person.visibility === 'VERIFIED') {
    // Show verified chef with bio, photo, etc.
  }
}
```

---

## 📈 Data We Have (Ready to Import)

### Unique People in Chef Recs (26+)
From the 62 recommendations:
- Chase Sinzer (8 recs) - Claud & Penny (NYC)
- Claudette Zepeda (6 recs) - Chispa Hospitality (San Diego)
- Christina Nguyen (5 recs) - Hai Hai (Minneapolis)
- Chris Shepherd (4 recs) - Southern Smoke Foundation
- Johnny Cirelle (4 recs) - The Benjamin
- Andrew Muñoz (3 recs) - Moo's Craft BBQ
- Michelle Muñoz (3 recs) - Moo's Craft BBQ
- Sarah Hymanson (3 recs) - Kismet
- Elijah Deleon (3 recs) - Rustic Canyon
- And 17+ more...

### Restaurant Groups (Identifiable)
- Claud & Penny (NYC)
- Rustic Canyon Group
- Kismet (Sara Kramer & Sarah Hymanson)
- Last Word Hospitality
- Chispa Hospitality (San Diego)

---

## 🎨 UI Display Strategy

### When personId is linked + verified
```
Chef Recommendation
Chase Sinzer, Claud & Penny (NYC)

"The second I get off the plane, I am calling 
a rideshare from the LAX-It lot to Gjusta"
```

### When personId is internal or missing
```
Chef Recommendation
Chase Sinzer, Claud & Penny (NYC)
```

No photos, no bios, just the signal. **Infrastructure stays infrastructure.**

---

## 🔒 Doctrine Reminder

**Chef Recs + People Integration Rules:**
1. People support Chef Recs, not replace them
2. Never promote people over places
3. Verified visibility required for rich display
4. Attribution always required for both systems
5. personId is optional, not required (Chef Recs work standalone)

---

## ✅ Implementation Checklist

- [x] Person model created with attribution
- [x] RestaurantGroup model created
- [x] PersonPlace join table for associations
- [x] PlaceStatus enum added (open/closed/permanently-closed)
- [x] CLI tools for all models
- [x] Migrations applied
- [x] Test person created (Nancy Silverton)
- [ ] Add personId field to ChefRec interface
- [ ] Create import-people-from-chef-recs.ts script
- [ ] Create link-chef-recs-to-people.ts script
- [ ] Update Chef Recs viewer to show linked people
- [ ] Build Tier 3 bento components

---

## 🎯 Benefits of Linking

### Data Quality
- Normalize chef names (avoid duplicates)
- Track chef lineage across restaurants
- Weight recommendations by chef credibility

### User Experience
- Show verified chef info with recs
- Display chef's full restaurant history
- Surface all recs by a trusted chef

### Editorial Workflow
- Identify prolific recommenders
- Discover insider opinion leaders
- Validate chef-restaurant associations

---

## 📝 Next Action Items

1. **Immediate:** Add `personId?: string` to ChefRec interface
2. **Week 1:** Build import script for people from Chef Recs
3. **Week 2:** Backfill personId in existing Chef Recs
4. **Week 3:** Update UI to use linked people data
5. **Ongoing:** Mark high-confidence people as verified

---

**The infrastructure is ready. The linking is optional but powerful.**
