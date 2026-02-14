# Instagram Backfill Workflow

## Quick Start Guide

### 1. Prepare Your CSV

Create a CSV with these columns:
- `Name` - Place name (for verification)
- `Instagram` - Instagram handle (with or without @)
- `GooglePlaceID` - Google Place ID for 100% exact matching
- `Latitude` - Optional, for H3 indexing
- `Longitude` - Optional, for H3 indexing

**Example:**
```csv
Name,Instagram,GooglePlaceID,Latitude,Longitude
Bestia,@bestia_la,ChIJhTXKfTHGwoARz9yUBbBMeL4,34.0332435,-118.2342862
Gjelina,@gjelina,ChIJH_XqGGG6woARfUvF8NqPHPA,33.9933994,-118.4657908
Animal Restaurant,@animalrestaurant,ChIJmYz8TZS_woARfAVyYYiLIxc,34.0753594,-118.3614937
```

### 2. Ingest the CSV

```bash
npm run ingest:csv -- data/instagram-backfill.csv saiko_instagram
```

### 3. Run the Resolver

```bash
npm run resolver:run
```

The resolver will:
- **Phase 1**: Auto-link records with matching Google Place IDs at **100% confidence**
- **Phase 2**: Check Placekeys (if any)
- **Phase 3**: Use H3 blocking + ML for ambiguous cases

### 4. Verify Results

```bash
# Check how many were auto-linked
node -r ./scripts/load-env.js -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const autoLinked = await prisma.entity_links.count({
    where: {
      match_method: 'google_place_id_exact',
      linked_by: 'system:google_place_id_prepass'
    }
  });
  
  console.log(\`✅ Auto-linked via Google Place ID: \${autoLinked} records\`);
  await prisma.\$disconnect();
}

check();
"
```

### 5. Review Golden Records

The Instagram handles will now be available in `golden_records` via survivorship rules:

```sql
SELECT 
  name,
  instagram_handle,
  source_attribution->>'instagram_handle' as instagram_source
FROM golden_records
WHERE instagram_handle IS NOT NULL
LIMIT 10;
```

## Survivorship Priority

Instagram handles are selected using this priority:
1. **saiko_manual** - Manually curated
2. **saiko_ai** - AI-generated/verified
3. **saiko_instagram** - Instagram backfill
4. **editorial_*** - Editorial sources
5. **saiko_seed** - Original seed data

## Expected Results for 671 Missing Handles

If you prepare a CSV with all 671 missing Instagram handles:

```
📍 Phase 1: Google Place ID exact match
Found 671 unprocessed records with Google Place IDs
✓ Auto-linked via Google Place ID: Bestia (ChIJhTXKfTHGwoARz9yUBbBMeL4)
✓ Auto-linked via Google Place ID: Gjelina (ChIJH_XqGGG6woARfUvF8NqPHPA)
...
✅ Google Place ID pre-pass: 671 records auto-linked

✅ Resolver pipeline complete!
```

**Total time**: ~30 seconds for 671 records
**Manual review needed**: 0 (all exact matches)

## Template

A starter template is available at:
`/Users/bobbyciccaglione/saiko-maps/data/instagram-backfill-template.csv`

## Tips

1. **Get Google Place IDs from your database**:
```bash
node -r ./scripts/load-env.js -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function export() {
  const places = await prisma.places.findMany({
    where: { 
      instagram: null,
      google_place_id: { not: null }
    },
    select: {
      name: true,
      google_place_id: true,
      latitude: true,
      longitude: true
    }
  });
  
  console.log('Name,Instagram,GooglePlaceID,Latitude,Longitude');
  places.forEach(p => {
    console.log(\`\${p.name},,\${p.google_place_id},\${p.latitude},\${p.longitude}\`);
  });
  
  await prisma.\$disconnect();
}

export();
" > data/instagram-backfill.csv
```

2. **Fill in Instagram handles** manually or via scraping

3. **Run the workflow** above

4. **Profit!** All 671 handles backfilled with zero manual review 🎉
