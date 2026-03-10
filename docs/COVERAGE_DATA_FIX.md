# Coverage Data Display Fix

## Issue Summary

Places with 'coverage' data (editorial sources) were not displaying in the bento UI due to mismatched data formats.

## Root Cause

The database contains two different source data formats:

### New Format (104 places)
```json
{
  "source_id": "src_theinfatuation_2025",
  "publication": "The Infatuation",
  "title": "88 Club - Review - Beverly Hills - Los Angeles",
  "url": "https://...",
  "published_at": "2025-05-22",
  "trust_level": "editorial",
  "content": "..."
}
```

### Legacy Format (321 places)
```json
{
  "name": "Time Out",
  "excerpt": "No-frills; cheapest quality dim sum in SGV | Time Out",
  "url": "https://..."
}
```

The page component was only checking for the new format fields (`publication` and `title`), causing **321 places (75%)** to not display their coverage data.

## Solution

Updated `/app/(viewer)/place/[slug]/page.tsx` to:

1. **Updated interface** to include legacy fields:
   - Added `name?: string` (maps to `publication`)
   - Added `excerpt?: string` (maps to `title`)

2. **Updated display logic** to check for both formats:
   ```typescript
   const hasSources = (location.sources?.length ?? 0) > 0 && 
     location.sources?.some(s => (s.publication && s.title) || (s.name && s.excerpt));
   ```

3. **Updated rendering** to use fallback fields:
   ```typescript
   <span className={styles.coverageSource}>{src.publication || src.name}</span>
   <span className={styles.coverageTitle}>{src.title || src.excerpt}</span>
   ```

4. **Updated excerpt function** to handle both content formats

## Impact

- **321 places** will now display their coverage data in the bento UI
- **3 places** with mixed formats continue to work
- **104 places** with new format unchanged
- **0 regressions** - all existing functionality preserved

## Examples of Fixed Places

- Ocean Bo Dim Sum Cafe (Time Out)
- UOVO | Pasadena (Eater LA)
- Pizzeria Mozza (Michelin Guide)
- Dunsmoor
- Chengdu Taste
- And 316 more...

## Testing

Run the verification scripts:
```bash
npx tsx scripts/verify-fix.ts
npx tsx scripts/count-impact.ts
npx tsx scripts/check-sources-display.ts
```

## Date
February 7, 2026
