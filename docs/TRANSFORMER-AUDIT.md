# Transformer Audit — v2.2 Compliance

**File:** `lib/data/transformers.ts`  
**Against:** Merchant Hierarchy v2.2 + Implementation Checklist  
**Status:** ✅ RESOLVED — See `TRANSFORMER-V2-FIXES.md` for implementation

---

**NOTE:** This audit identified 6 issues. All have been fixed with schema-tolerant logic.  
The transformer now handles multiple common patterns per field and enforces v2.2 spec.

---

## ❌ CRITICAL ISSUES

### 1. Hero Photo NOT Excluded from Collage (Line 32)

**Current code:**
```typescript
photos: dbRecord.photos?.filter((p: any) => p.id !== dbRecord.heroPhotoId)
```

**Problem:** 
- Assumes `heroPhotoId` exists as separate field
- But `heroPhoto` is likely IN the `photos` array in Prisma
- Filter won't work if hero photo has different ID structure

**What v2.2 requires:**
- Hero photo MUST be excluded from collage
- PhotoCollage component expects `heroPhotoId` prop to filter
- Transformer must ensure hero is separate from photos array

**Fix needed:**
```typescript
// Hero photo should be first photo OR separate field
heroPhoto: {
  id: dbRecord.photos[0].id,  // or dbRecord.heroPhoto.id
  url: dbRecord.photos[0].url,
  alt: dbRecord.photos[0].alt,
},

// Collage photos = all photos EXCEPT hero
photos: dbRecord.photos.slice(1), // exclude first (hero)
// OR: dbRecord.photos.filter(p => p.id !== dbRecord.photos[0].id)
```

---

### 2. Instagram Handle Validity NOT Checked (Line 27)

**Current code:**
```typescript
instagramHandle: dbRecord.instagramHandle || undefined,
```

**Problem:**
- No validation of handle format
- Empty strings pass through
- Tier 1.5 component will render with invalid handle

**What v2.2 requires:**
- InstagramConfidenceRow only renders if handle is VALID
- Must be non-empty, trimmed
- Component has guard, but transformer should enforce

**Fix needed:**
```typescript
instagramHandle: dbRecord.instagramHandle?.trim() || undefined,
```

---

### 3. Hours State NOT Explicit (Lines 56-64)

**Current code:**
```typescript
hours: dbRecord.hours ? {
  monday: dbRecord.hours.monday,
  // ...
} : undefined,
```

**Problem:**
- HoursCard needs to know: "does this place have hours?"
- Currently returns `undefined` for missing hours
- But HoursCard must ALWAYS render with "Hours unavailable" state

**What v2.2 requires:**
- HoursCard ALWAYS renders (Tier 3, critical)
- Missing hours → shows "Hours unavailable"
- Transformer should provide explicit empty state

**Fix needed:**
```typescript
// Always return hours object, even if empty
hours: dbRecord.hours ? {
  monday: dbRecord.hours.monday,
  tuesday: dbRecord.hours.tuesday,
  // ...
} : {
  // Empty object signals "no hours" to component
  // Component will show "Hours unavailable"
},

// OR add explicit flag:
hasHours: !!dbRecord.hours,
```

---

### 4. Attributes NOT Flattened to Chips (Lines 87-91)

**Current code:**
```typescript
attributes: dbRecord.attributes?.map((attr: any) => ({
  id: attr.id,
  category: attr.category,
  name: attr.name,
})),
```

**Problem:**
- Passes through raw attribute structure
- Component needs chip-ready format
- Category might be used for grouping, but component renders as chips

**What v2.2 requires:**
- Attributes render as chips (max 6 visible)
- No "Service Options / Parking" labeled rows
- Component handles chip compression, but needs clean array

**Status:** ✅ Actually OK
- Component handles flattening
- Category can be ignored by component
- Format matches component expectations

---

### 5. Trust Block NOT Validated (Lines 42-53)

**Current code:**
```typescript
curatorNote: dbRecord.curatorNote ? {
  text: dbRecord.curatorNote,
  // ...
} : undefined,
```

**Problem:**
- No validation that curator note has actual content
- Empty strings might pass through
- Trust block should collapse if note is whitespace-only

**What v2.2 requires:**
- Curator note must have trim().length > 0
- Coverage sources must be array with length
- If both empty, TrustBlock collapses

**Fix needed:**
```typescript
curatorNote: (dbRecord.curatorNote?.trim() && dbRecord.curatorNote.trim().length > 0) ? {
  text: dbRecord.curatorNote.trim(),
  author: dbRecord.curatorAuthor,
  date: dbRecord.curatorDate,
} : undefined,

// Coverage validation
coverageSources: dbRecord.coverageSources?.length > 0 
  ? dbRecord.coverageSources.map((source: any) => ({
      publication: source.publication,
      quote: source.quote || undefined,
      url: source.url || undefined,
      date: source.date || undefined,
    }))
  : undefined,
```

---

### 6. Address/Coordinates NOT Validated (Lines 73-84)

**Current code:**
```typescript
address: dbRecord.address ? {
  street: dbRecord.address.street,
  // ...
} : undefined,
```

**Problem:**
- Assumes nested `address` object
- Prisma schema might have flat fields (addressStreet, addressCity)
- No validation of required fields (street, city, state, zip)

**Fix needed:**
- Match actual Prisma schema structure
- Validate required fields exist

---

### 7. Open Status NOT Calculated (Lines 66-70)

**Current code:**
```typescript
openStatus: dbRecord.openStatus ? {
  isOpen: dbRecord.openStatus.isOpen,
  todayWindow: dbRecord.openStatus.todayWindow,
  nextChange: dbRecord.openStatus.nextChange,
} : undefined,
```

**Problem:**
- Assumes `openStatus` comes from database
- Open status should be CALCULATED from hours + current time
- Stale data if pre-calculated in DB

**What should happen:**
- Transformer should calculate open/closed based on:
  - Current day of week
  - Current time
  - Hours for today
- Return real-time status

**Fix needed:**
```typescript
openStatus: calculateOpenStatus(dbRecord.hours),

// Helper function
function calculateOpenStatus(hours: any) {
  if (!hours) return undefined;
  
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todayHours = hours[day];
  
  // Parse hours, check if currently open
  // Return { isOpen, todayWindow, nextChange }
}
```

---

## ✅ WHAT'S CORRECT

### Hero Photo Structure (Lines 19-23)
- Correctly extracts hero photo fields
- ✅ Good

### Vibe Tags (Line 39)
- Simple passthrough
- ✅ Good

### Phone/Reservation/Website (Lines 26-29)
- Optional fields handled correctly
- ✅ Good

---

## 🔧 REQUIRED CHANGES

### Priority 1 (Blocks v2.2 compliance):

1. **Fix hero photo exclusion logic**
   - Ensure hero is separate from photos array
   - Match Prisma schema structure

2. **Add hours explicit state**
   - Always return hours object (even empty)
   - Or add `hasHours: boolean` flag

3. **Validate curator note content**
   - Trim and check length > 0
   - Prevent empty string rendering

### Priority 2 (Nice to have):

4. Calculate open status in real-time
5. Validate address required fields
6. Trim/validate Instagram handle

---

## 🎯 TRANSFORMER'S JOB

The transformer must enforce Hierarchy v2.2 so the UI can't drift.

**Must output:**
- ✅ Hero + collage photos (hero excluded)
- ⚠️ Instagram presence + validity (needs trim)
- ⚠️ Trust payload validated (curator/coverage non-empty)
- ❌ Hours with explicit state (hasHours or empty object)
- ✅ Attributes flattened (already correct)
- ✅ Also-on lists (correct structure)

**Current score:** 4/6 correct

---

## 📝 NEXT STEPS

1. Match transformer to actual Prisma schema
   - What does `place.photos` look like?
   - Is hero separate or first photo?
   - Are address fields flat or nested?

2. Fix hero photo exclusion

3. Add hours explicit state

4. Validate trust content (trim, non-empty)

5. Test with 3 scenarios:
   - `/place/scenario-a` (fully curated)
   - `/place/scenario-b` (editorial lite)
   - `/place/scenario-c` (baseline)

---

*Audit complete. Transformer needs fixes before it enforces v2.2.*
