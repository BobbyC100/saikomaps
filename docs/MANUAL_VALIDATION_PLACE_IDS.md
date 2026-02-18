# Manual method: get the four place_id values (no API key in env)

Use these **Find Place from Text** URLs. Replace `YOUR_KEY` with your Google Places API key, then open each URL in a browser. From the JSON response, copy the `place_id` value (starts with `ChIJ...`).

---

## Sanity-checked URLs

**Endpoint:** `findplacefromtext/json` (correct).  
**Params:** `input`, `inputtype=textquery`, `fields=place_id` (correct).  
**Queries:** Exact name+address to avoid wrong matches.

### 1. dunsmoor

```
https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Dunsmoor%20Los%20Angeles%203509%20Eagle%20Rock%20Blvd&inputtype=textquery&fields=place_id&key=YOUR_KEY
```

### 2. buvons

```
https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Buvons%20Los%20Angeles&inputtype=textquery&fields=place_id&key=YOUR_KEY
```

### 3. dan-tanas

```
https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Dan%20Tana%27s%20West%20Hollywood%209071%20Santa%20Monica%20Blvd&inputtype=textquery&fields=place_id&key=YOUR_KEY
```

### 4. covell

```
https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Covell%20Los%20Angeles%204628%20Hollywood%20Blvd&inputtype=textquery&fields=place_id&key=YOUR_KEY
```

---

## What to copy from each response

- In the JSON you get: `"candidates"` → first element → `"place_id"` → value like `"ChIJ..."`.
- Optional: check `formatted_address` in the response if you request more fields (this doc uses `fields=place_id` only for simplicity).

**Important:**

- Value must start with **ChIJ** (Places API place_id, not a CID).
- It must be the **place_id** field from the response.
- If the address looks wrong, try tightening the query or use a different source for the ID.

---

## Where to paste

**File:** `data/validation-place-ids.json`

**Shape:**

```json
{
  "dunsmoor": "ChIJ...",
  "buvons": "ChIJ...",
  "dan-tanas": "ChIJ...",
  "covell": "ChIJ..."
}
```

Double quotes only, no trailing commas. Then re-run the linkage sequence.

---

## If you don’t have the key handy

- Search repo: `grep -R "GOOGLE" .` or `grep -R "PLACES" .` — often in `.env`, `.env.local`, or Vercel env.
- Or run: `npx tsx scripts/fetch-validation-place-ids.ts` — it prints these same URLs when no key is set.

You’re 4 copy-pastes away from freeze.
