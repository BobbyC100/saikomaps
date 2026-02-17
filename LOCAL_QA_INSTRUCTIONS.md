# 🧪 Local QA Testing Instructions

Since Vercel deployment is having issues, let's test locally.

## Quick Setup (2 minutes)

### 1. Start Dev Server
```bash
cd /Users/bobbyciccaglione/code/saiko-maps
npm run dev
```

Wait for: `✓ Ready in 3.2s`

### 2. Open Your Browser

Go to: **http://localhost:3000**

### 3. Test These LA County Place Pages

Open these URLs in your browser:

1. **SUGARFISH by sushi nozawa**  
   http://localhost:3000/place/unknown-40f392c7

2. **Okayama Kobo Bakery**  
   http://localhost:3000/place/okayama-kobo-bakery-cafe-dtla

3. **Redbird**  
   http://localhost:3000/place/redbird-downtown-los-angeles

4. **Budonoki** (East Hollywood)  
   http://localhost:3000/place/budonoki

5. **Tacos 1986**  
   http://localhost:3000/place/tacos-1986

---

## What to Check on Each Page

### Visual Check
1. Scroll to photo gallery section
2. Look at what comes **immediately after** the Gallery card (4 columns wide)
3. Should see: **Phone card** (2 columns) right next to it
4. Layout should look clean, no weird gaps

### Console Check
1. Press **F12** (or Cmd+Option+I on Mac)
2. Click **Console** tab
3. Look for: `✓ System B layout validation passed`
4. Should see **no errors** (red text)

### QuietCard Check (if you find a page with no phone/instagram)
- Should see a **very subtle grid pattern** card (2 columns)
- Should be barely noticeable
- Should NOT draw your eye

---

## Quick Test (30 seconds per page)

For each URL above:
- [ ] Page loads?
- [ ] Gallery visible?
- [ ] Phone card after Gallery?
- [ ] Layout looks good?
- [ ] Console clean (no errors)?

---

## If Dev Server Won't Start

Try these commands:
```bash
# Kill any existing dev server
pkill -f "next dev"

# Start fresh
npm run dev
```

---

## Expected Result

**Gallery card** (4 columns wide) → **Phone card** (2 columns) → rest of page

Should look like:
```
┌────────────────────────────────┬──────────────┐
│ Gallery (photos)               │ Phone        │
│ 4 columns                      │ 2 columns    │
└────────────────────────────────┴──────────────┘
```

---

Once you test 3-4 pages and everything looks good, let me know!

**Estimated time**: 5 minutes total
