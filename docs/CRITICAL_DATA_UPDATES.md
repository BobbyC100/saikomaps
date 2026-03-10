# Critical Data Updates

**Priority:** HIGH - These fields directly impact Action Strip functionality

---

## 🚨 Status Overview

| Field | Missing | % Complete | Impact |
|-------|---------|------------|--------|
| **Phone** | 68 | 89.9% ✅ | Call button won't show |
| **Instagram** | 671 | 0.3% 🔴 | Insta button won't show |

---

## 📞 Phone Numbers (68 missing)

### Why It Matters
- **Call button disappears** if no phone number
- **Action Strip looks incomplete** with only Nav + Insta
- Users expect to contact restaurants directly

### Quick Update Commands

**List missing:**
```bash
node scripts/update-phone.js --list
```

**Add one:**
```bash
node scripts/update-phone.js --add "dunsmoor" "(213) 555-1234"
```

**Bulk update:**
```bash
node scripts/update-phone.js --update phone-updates.json
```

### JSON Template
```json
[
  { "slug": "dunsmoor", "phone": "(213) 555-1234" },
  { "slug": "animal-restaurant", "phone": "(323) 555-5678" }
]
```

### Missing Phone Numbers (Top 20)
```
animal-restaurant
dunsmoor
au-fauna
bar-bandini
bar-leather-apron
betsy
billionaire-burger-boyz-central-la
bodega-los-alamos
bomb-azz-tacos
broad-street-oyster-company
brothers-cousins-tacos-westdale
buvette
del-re-wine-bar
elite-restaurant-monterey-park
empress-harbor-seafood-restaurant-monterey-park
eta
evil-twin-la
gr (Grá)
holcomb
holy-basil-market
```

---

## 📸 Instagram Handles (671 missing)

### Why It Matters
- **Insta button disappears** if no Instagram handle
- **Only 2 places have Instagram** - major visibility gap
- Most restaurants actively use Instagram

### Quick Update Commands

**List missing:**
```bash
node scripts/update-instagram.js --list
```

**Add one:**
```bash
node scripts/update-instagram.js --add "dunsmoor" "dunsmoor_la"
```

**Bulk update:**
```bash
node scripts/update-instagram.js --update instagram-updates.json
```

### JSON Template
```json
[
  { "slug": "dunsmoor", "instagram": "dunsmoor_la" },
  { "slug": "animal-restaurant", "instagram": "animalrestaurant" }
]
```

### Strategy for Instagram
Since 99% of places are missing Instagram:

1. **Start with places that have editorial coverage** (Pull Quote or Sources)
   ```bash
   node scripts/audit-data.js --field pullQuote
   node scripts/audit-data.js --field sources
   ```

2. **Focus on popular/high-traffic restaurants**
   - Places on multiple maps (Also On card)
   - Places with rich data (Coverage, Curator, Gallery)

3. **Work in batches of 20-50** places at a time
   - Research handles (Google, website, Instagram search)
   - Create JSON file
   - Run bulk update

4. **Finding Instagram handles:**
   - Google: `"restaurant name" + "los angeles" + instagram`
   - Check website footer
   - Search Instagram directly
   - Check Yelp/Google Maps (often link to social)

---

## 🎯 Recommended Workflow

### Phase 1: Phone Numbers (Quick Win)
- Only 68 missing
- Many might be wine bars, shops, or popup locations without phones
- Can research and update in 1-2 sessions

### Phase 2: Instagram Handles (Ongoing)
- 671 missing - this is a marathon
- Prioritize:
  1. Places with editorial coverage (13 places)
  2. Places on curated maps
  3. Popular restaurants you know

### Example Session
```bash
# 1. Export missing lists
node scripts/update-phone.js --list > missing-phones.txt
node scripts/update-instagram.js --list > missing-instagram.txt

# 2. Research 10-20 places
# Look up their websites, Google them, check Instagram

# 3. Create JSON file with findings
# Use phone-updates-template.json or instagram-updates-template.json

# 4. Run bulk update
node scripts/update-phone.js --update my-batch.json
node scripts/update-instagram.js --update my-batch.json

# 5. Verify on site
# Visit http://localhost:3000/place/slug and check Action Strip
```

---

## 📊 Impact on Action Strip

### Current State (Example: Dunsmoor)
```
Has: Address ✓
Missing: Phone ✗, Instagram ✗
Action Strip shows: [Nav] only
```

### After Phone Update
```
Has: Address ✓, Phone ✓
Missing: Instagram ✗
Action Strip shows: [Nav] [Call]
```

### After Instagram Update
```
Has: Address ✓, Phone ✓, Instagram ✓
Action Strip shows: [Nav] [Call] [Insta]
```

---

## 💡 Tips

- **Phone format is flexible** - `(555) 123-4567`, `+1-555-123-4567`, or `555.123.4567` all work
- **Instagram handles WITHOUT @** - Use `dunsmoor_la` not `@dunsmoor_la`
- **Verify before updating** - Wrong handles create broken links
- **Work in small batches** - 20-50 updates at a time is manageable
- **Test locally** - Check `http://localhost:3000/place/slug` after updates

---

## 🆘 Need Help?

**Phone script:**
```bash
node scripts/update-phone.js --help
```

**Instagram script:**
```bash
node scripts/update-instagram.js --help
```

**Data audit:**
```bash
node scripts/audit-data.js --help
```
