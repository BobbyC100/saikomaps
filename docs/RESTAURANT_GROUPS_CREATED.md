# Restaurant Groups Created — Feb 7, 2026

## ✅ Successfully Created

### **Last Word Hospitality**
- **Status:** Verified
- **Visibility:** Public-ready (verified)
- **Anchor City:** Los Angeles, CA
- **Website:** https://www.lw-h.com/
- **Description:** Operator-driven hospitality group with curated LA concepts

**Current Places (2):**
1. **Found Oyster** - East Hollywood
2. **Rasarumah** - Westlake

**Missing:** The Copper Room (Yucca Valley) - link failed, needs retry

**Source:** Official group website

---

### **Rustic Canyon Family**
- **Status:** Verified
- **Visibility:** Public-ready (verified)
- **Anchor City:** Los Angeles, CA
- **Website:** https://www.rusticcanyonfamily.com/
- **Description:** Chef-driven restaurant group focused on seasonal California cuisine and neighborhood dining

**Current Places (3):**
1. **Cassia** - Downtown
2. **Milo & Olive** - Northeast
3. **Rustic Canyon** - Wilshire Montana

**Source:** Multiple editorial sources and restaurant websites

---

## 🎯 What This Enables

### Tier 3 Bento Display (When Verified)
On a place's merchant page, you can now show:

```
Restaurant Group
Last Word Hospitality

Also from this group:
Found Oyster, Rasarumah
```

### Query Capabilities
```typescript
// Get all places in a group
const lwPlaces = await db.place.findMany({
  where: { restaurantGroupId: lastWordHospitalityId }
})

// Get group with all places
const group = await db.restaurantGroup.findUnique({
  where: { slug: 'last-word-hospitality' },
  include: { places: true }
})

// Filter by status (current vs past)
const currentPlaces = await db.place.findMany({
  where: {
    restaurantGroupId: groupId,
    status: 'OPEN'
  }
})
```

---

## 📊 Groups with Chef Recs Overlap

### Last Word Hospitality
- **Found Oyster** has 1 Chef Rec (Chase Sinzer - Claud & Penny NYC)

### Rustic Canyon Family
- **Rustic Canyon** has Chef Recs
- **Cassia** has Chef Recs (Bryant Ng, Johanna Luat)

These groups are already validated by practitioner signal!

---

## 🚀 Next Steps

### Fix Missing Link
```bash
npx tsx scripts/link-place-group.ts "The Copper Room" "Last Word Hospitality"
```

### Add More LA Groups
Consider adding:
- **Mozza Group** (Pizzeria Mozza, Osteria Mozza, Chi Spacca)
- **Kismet/Kismet Rotisserie** (Sara Kramer & Sarah Hymanson)
- **Gjusta Group** (Gjusta, Gjelina) - Travis Lett

### Link Key People
```bash
# Jeremy Fox to Rustic Canyon
npx tsx scripts/add-person.ts "Jeremy Fox" --role chef --visibility verified
npx tsx scripts/link-person-place.ts "Jeremy Fox" "Rustic Canyon" --role executive-chef

# Bryant Ng to Cassia
npx tsx scripts/add-person.ts "Bryant Ng" --role chef --visibility verified
npx tsx scripts/link-person-place.ts "Bryant Ng" "Cassia" --role executive-chef
```

---

## 🎨 Display Strategy

### Internal Use (Now)
- Track ownership lineage
- Validate multi-location quality
- Support editorial curation

### Public Display (When Ready)
- Show on Tier 3 bento (verified only)
- List sibling locations
- Neutral presentation: "Restaurant Group" label, no hype
- Current places only by default
- Show past places separately if exists

---

## ✅ Summary

**Groups Created:** 2  
**Places Linked:** 5 (2 + 3)  
**Visibility:** Both verified (public-ready)  
**Documentation:** Complete attribution sources  
**Status:** Operational and ready for UI integration

---

**Commands to verify:**
```bash
npx tsx scripts/view-restaurant-group.ts "Last Word Hospitality"
npx tsx scripts/view-restaurant-group.ts "Rustic Canyon Family"
```
