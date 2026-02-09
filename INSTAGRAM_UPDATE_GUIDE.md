# Instagram Handle Update Guide

**671 places** are currently missing Instagram handles.

---

## Quick Start

### 1. List places missing Instagram
```bash
node scripts/update-instagram.js --list
```

### 2. Add a single Instagram handle
```bash
node scripts/update-instagram.js --add "place-slug" "instagram-handle"
```

Example:
```bash
node scripts/update-instagram.js --add "seco" "seco.silverlake"
```

### 3. Bulk update from JSON file
```bash
node scripts/update-instagram.js --update instagram-updates.json
```

---

## JSON File Format

Create a file (e.g., `instagram-updates.json`) with this format:

```json
[
  { "slug": "place-slug", "instagram": "handle" },
  { "slug": "another-place", "instagram": "handle" }
]
```

**Example:**
```json
[
  { "slug": "seco", "instagram": "seco.silverlake" },
  { "slug": "pizzeria-mozza-melrose", "instagram": "pizzeriamozza" },
  { "slug": "great-white-central-la", "instagram": "greatwhite" }
]
```

---

## Workflow Suggestion

1. **Export the missing list to a file:**
   ```bash
   node scripts/update-instagram.js --list > missing-instagram.txt
   ```

2. **Research Instagram handles** for 10-20 places at a time

3. **Create a JSON file** with those handles (use `instagram-updates-template.json` as a starting point)

4. **Run the bulk update:**
   ```bash
   node scripts/update-instagram.js --update my-batch-1.json
   ```

5. **Repeat** in batches until you've covered the important places

---

## Tips

- **Start with high-priority places** (places with editorial coverage, popular spots)
- **Format:** Instagram handles should be WITHOUT the `@` symbol
  - ✅ Good: `"instagram": "seco.silverlake"`
  - ❌ Bad: `"instagram": "@seco.silverlake"`
  
- **Verify handles** exist before updating (the script doesn't validate Instagram URLs)

- **Work in batches** - it's easier to manage 20-50 updates at a time

---

## Finding Instagram Handles

Quick methods:
1. Google: `"place name" + "los angeles" + instagram`
2. Check the place's website (usually in footer or contact page)
3. Search Instagram directly: `@placename` or similar variations
4. Check other review sites (Yelp, Google Maps) - they often link to social media

---

## Example Workflow

```bash
# 1. See what's missing
node scripts/update-instagram.js --list

# 2. Add one quickly
node scripts/update-instagram.js --add "stir-crazy" "stircrazyrestaurant"

# 3. Or prepare a batch
# Edit instagram-updates-template.json with 10-20 places

# 4. Run the batch
node scripts/update-instagram.js --update instagram-updates-template.json

# 5. Check results
# The script will show success/error for each update
```

---

## Current Status

- **Total places:** ~800+
- **Missing Instagram:** 671 (84%)
- **Have Instagram:** ~130 (16%)

This is expected for a newly launched database. Focus on:
1. Places with editorial coverage (Coverage card)
2. Places on curated maps (Also On card)
3. Popular/high-traffic restaurants

---

## Need Help?

The script has built-in help:
```bash
node scripts/update-instagram.js --help
```
