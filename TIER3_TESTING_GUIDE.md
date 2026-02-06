# Tier 3 Bento Row — Testing Guide

## 🎯 Quick Start

The implementation is complete and ready to test! Your Next.js dev server is already running.

## 📍 Where to Test

Navigate to any merchant/place page with the pattern:
```
http://localhost:3000/place/[slug]
```

Example URLs (if these places exist in your database):
- `http://localhost:3000/place/la-mariana-sailing-club`
- Any other place slug from your database

## ✅ What to Test

### 1. **Full Layout (All Three Cards)**
Look for a merchant that has:
- ✅ Hours data (opens a two-column layout)
- ✅ Address (shows map tile)
- ✅ Phone number (shows call card)

**Expected Result:**
- Three cards in a row: Hours (wider), Map (medium), Call (narrower)
- All cards same height
- 12px gap between cards

### 2. **Hours Card**
Check that:
- [ ] Label says "HOURS" in small khaki uppercase text
- [ ] Days are split: M/T/W/Th on left, F/S/Su on right
- [ ] Today's day is bold and darker
- [ ] Status footer shows at bottom with green dot if open
- [ ] Text says "Open · Closes 11 PM" (or actual close time)
- [ ] If closed, dot and text are muted gray
- [ ] Text says "Closed · Opens 5 PM" (or actual open time)

### 3. **Map Card**
Check that:
- [ ] Label says "MAP" in small khaki uppercase text
- [ ] Map tile shows styled placeholder with:
  - Grid background pattern
  - 2 horizontal and 2 vertical road lines
  - Red pin dot in center (14px circle with white border)
- [ ] Street address shows below tile in bold serif
- [ ] City/state shows below in lighter serif
- [ ] No "View on map" link visible
- [ ] Clicking card opens Google Maps in new tab

### 4. **Call Card**
Check that:
- [ ] Label says "CALL" in small khaki uppercase text
- [ ] Phone icon (40px) shows centered
- [ ] Phone number shows below icon in serif font
- [ ] Clicking card triggers phone call (check URL changes to `tel:...`)

### 5. **Graceful Degradation**

**Test: No Hours Data**
- Find or temporarily comment out hours data
- Expected: Only Map + Call cards show (no Hours card)
- Cards should be wider: Map (1fr), Call (0.8fr)

**Test: No Phone Number**
- Find or temporarily comment out phone data
- Expected: Only Hours + Map cards show (no Call card)
- Cards should be wider: Hours (1.2fr), Map (1fr)

**Test: No Hours AND No Phone**
- Comment out both hours and phone
- Expected: Only Map card shows, full width

### 6. **Mobile Layout (< 640px)**
Open browser DevTools and set viewport to mobile (e.g., 375px width):

- [ ] Three cards stack vertically
- [ ] Hours card still shows two columns internally
- [ ] Map tile is taller (min 120px)
- [ ] Call card becomes horizontal: icon on left, number on right

## 🎨 Visual Quality Checklist

### Colors
- [ ] Card backgrounds: Cream (#FFFDF7)
- [ ] Page background: Light tan (#F5F0E1)
- [ ] Labels: Khaki (#C3B091)
- [ ] Body text: Charcoal (#36454F)
- [ ] Open status: Sage green (#4A7C59)
- [ ] Pin: Coral red (#D64541)

### Typography
- [ ] Labels: 9px uppercase with 2.5px letter-spacing
- [ ] Hours: Libre Baskerville serif, 12px
- [ ] Address: Libre Baskerville serif, 13px (street) / 11px (city)
- [ ] Phone: Libre Baskerville serif, 16px

### Spacing
- [ ] Cards have 24px padding
- [ ] 12px gap between cards
- [ ] Status footer has 10px padding-top with border

## 🐛 Common Issues to Watch For

1. **Hours not showing in two columns**
   - Check CSS `grid-auto-flow: column` is applied
   - Verify 7 days of data exist

2. **Status footer shows wrong time**
   - Check parseHours() extracts close/open times correctly
   - Verify hours data format (Google Places format expected)

3. **Map card doesn't open directions**
   - Check latitude/longitude exist in place data
   - Verify directionsUrl is constructed properly

4. **Call card not triggering phone**
   - Check phone number format
   - Verify href starts with `tel:`

5. **Cards not same height**
   - Check `.tier3Row` has `align-items: stretch`
   - Verify all cards are direct children of `.tier3Row`

## 📊 Test Data Requirements

For full testing, ensure your place data includes:
```json
{
  "hours": {
    "openNow": true,
    "weekday_text": [
      "Monday: 9:00 AM – 9:00 PM",
      "Tuesday: 9:00 AM – 9:00 PM",
      // ... etc
    ]
  },
  "address": "123 Main St, Los Angeles, CA 90001",
  "latitude": 34.0522,
  "longitude": -118.2437,
  "phone": "(123) 456-7890"
}
```

## 🔄 Next Steps After Testing

1. If everything looks good:
   - ✅ Mark implementation complete
   - 🚀 Ready to deploy

2. If issues found:
   - 📝 Document specific bugs
   - 🔧 Fix and retest
   - ✅ Verify fix doesn't break other features

## 💡 Pro Tips

- Use Chrome DevTools to inspect CSS Grid layout
- Check Console for any JavaScript errors
- Test with real merchant data for accurate results
- Compare against the reference HTML mockup: `saiko-bento-card-variants.html` (Option B section)
