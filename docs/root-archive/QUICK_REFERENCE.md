# Quick Reference: Chef Recs + People/Groups

**All systems operational. Copy/paste these commands.**

---

## 📊 Current Stats (Feb 7, 2026)

```
Places:        673 total
Chef Recs:     62 across 36 restaurants (up from 23!)
People:        1 (ready to expand)
Groups:        0 (ready to add)
Divergence:    39% (14 insider picks with no awards)
```

---

## 🚀 Most Common Commands

### View Chef Recs Stats
```bash
cd ~/saiko-maps
npx tsx scripts/view-chef-recs.ts --stats
```

### Analyze Chef Recs vs Awards
```bash
npx tsx scripts/analyze-chef-recs-vs-awards.ts
```

### Add a Chef/Owner
```bash
npx tsx scripts/add-person.ts "Chef Name" \
  --role chef \
  --visibility internal \
  --source-desc "Where you found this info" \
  --source-type editorial \
  --source-url "https://..."
```

### View Chef Details
```bash
npx tsx scripts/view-person.ts "Chef Name"
```

### Link Chef to Restaurant
```bash
npx tsx scripts/link-person-place.ts "Chef Name" "Restaurant" \
  --role executive-chef \
  --current true \
  --source "Restaurant website"
```

### Add Restaurant Group
```bash
npx tsx scripts/add-restaurant-group.ts "Group Name" \
  --anchor-city "Los Angeles, CA" \
  --visibility internal \
  --source-desc "Official website" \
  --source-type restaurant-website \
  --source-url "https://..."
```

### View Group Details
```bash
npx tsx scripts/view-restaurant-group.ts "Group Name"
```

### Link Place to Group
```bash
npx tsx scripts/link-place-group.ts "Restaurant" "Group Name"
```

---

## 📝 Quick Add: Person from Chef Rec

If you see a chef in the Chef Recs stats:

```bash
# 1. Get their details from the rec
npx tsx scripts/view-chef-recs.ts | grep "Chef Name"

# 2. Add them as a person
npx tsx scripts/add-person.ts "Chef Name" \
  --role chef \
  --visibility internal \
  --source-desc "Resy article Sept 2024" \
  --source-type editorial \
  --source-url "https://blog.resy.com/2024/09/what-chefs-love-about-la/"

# 3. Link to their restaurant
npx tsx scripts/link-person-place.ts "Chef Name" "Their Restaurant" \
  --role executive-chef \
  --current true \
  --source "Restaurant website"
```

---

## 🎯 Top Chefs to Add (From Current Chef Recs)

1. **Chase Sinzer** (8 recs) - Claud & Penny (NYC)
2. **Claudette Zepeda** (6 recs) - Chispa Hospitality (San Diego)
3. **Christina Nguyen** (5 recs) - Hai Hai (Minneapolis)
4. **Chris Shepherd** (4 recs) - Southern Smoke Foundation (Houston)
5. **Johnny Cirelle** (4 recs) - The Benjamin

---

## 🏢 Restaurant Groups to Add

- Last Word Hospitality (Found Oyster, Rasarumah, Copper Room)
- Rustic Canyon Family (Rustic Canyon, Cassia, Milo & Olive)
- Kismet (Sara Kramer & Sarah Hymanson)
- Mozza Group (Pizzeria Mozza, Osteria Mozza, Chi Spacca)

---

## 📋 46 Places to Import (From Articles)

Run this to see the list:
```bash
npx tsx scripts/batch-add-resy-timeout-chef-recs.ts
```

Scroll to bottom for full list. Add these places, then re-run to capture the remaining 46 Chef Recs!

---

## 🔍 Data Checks

### See all people
```bash
npx tsx -e "import { db } from './lib/db'; const p = await db.person.findMany(); console.log(p); await db.\$disconnect()"
```

### Count places by status
```bash
npx tsx -e "import { db } from './lib/db'; const counts = await db.place.groupBy({ by: ['status'], _count: true }); console.log(counts); await db.\$disconnect()"
```

---

## 📚 Documentation

- **PEOPLE_GROUPS_IMPLEMENTATION.md** - Full schema & CLI guide
- **CHEF_RECS_PEOPLE_INTEGRATION.md** - How to link systems
- **SESSION_COMPLETE.md** - Complete session summary
- **SESSION_HANDOFF.md** - Original Chef Recs overview

---

## 🔒 Remember: Doctrine

- People support places, never replace them
- Always require attribution (sources)
- Default visibility: internal (safe)
- Verified visibility: requires high confidence
- No people-first discovery ever

---

**Everything is ready. Start adding people and groups!**
