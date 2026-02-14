# 🧪 Manual Testing Guide - Saiko Maps

This guide walks you through testing the **manual map creation** and **manual location addition** features in your browser.

## ✅ Prerequisites

1. **Development server running**: `http://localhost:3001`
2. **Browser**: Chrome, Firefox, Safari, or Edge
3. **Demo user created**: Already set up (`demo-user-id`)

---

## 🗺️ Test 1: Manual Map Creation

### Steps:

1. **Navigate to Create Page**
   - Open: `http://localhost:3001/create`
   - ✅ **Expected**: See "Create Your Map" page with:
     - Map name input field
     - 4 template options (Postcard, Field Notes, Monocle, Street)
     - Progress indicator showing step 1 of 3

2. **Fill in Map Details**
   - Enter a map name: `"Biarritz Travel Guide"`
   - Select a template: Click on **"Postcard"** (or any template)
   - ✅ **Expected**: Selected template shows:
     - Teal border highlight
     - Checkmark icon
     - Background color change

3. **Create the Map**
   - Click **"Continue to Add Locations →"** button
   - ✅ **Expected**: 
     - Button shows "Creating..." briefly
     - Redirects to `/create/[mapId]/locations`
     - Progress indicator shows step 2 of 3

4. **Verify Map Created**
   - ✅ **Expected**: On locations page, you should see:
     - Map title displayed at top
     - "Add Location" button (large dashed border)
     - Empty state (no locations yet)

---

## 📍 Test 2: Manual Location Addition - Method 1 (Search)

### Steps:

1. **Open Add Location Modal**
   - Click the **"Add Location"** button
   - ✅ **Expected**: Modal opens with:
     - "Paste Google Maps link" input field
     - "OR" divider
     - "Search for a place" input field

2. **Search for a Place**
   - Type in search box: `"Ocean Shape Biarritz"`
   - ✅ **Expected**: After ~300ms delay:
     - Autocomplete dropdown appears
     - Shows matching places with names and addresses
     - Loading indicator while searching

3. **Select a Place**
   - Click on a search result (e.g., "Ocean Shape")
   - ✅ **Expected**:
     - Search input fills with place name
     - Place preview card appears below:
       - Place name
       - Address
       - Category (if available)
       - Phone number (if available)
       - Rating (if available)
       - Open/Closed status

4. **Add Location**
   - Click **"Add to Guide"** button
   - ✅ **Expected**:
     - Button shows loading state
     - Success message appears: "✓ Location added!"
     - Modal closes automatically after ~1.5 seconds
     - Location appears in the list below

5. **Verify Location Added**
   - ✅ **Expected**: In the locations list:
     - Location card shows:
       - Number badge (1)
       - Place name
       - Address
       - Category badge (if available)

---

## 🔗 Test 3: Manual Location Addition - Method 2 (Google Maps URL)

### Steps:

1. **Open Add Location Modal Again**
   - Click **"Add Location"** button

2. **Paste Google Maps URL**
   - Copy this URL: `https://www.google.com/maps/place/N.30+Cantine+Urbaine/data=!4m2!3m1!1s0xd516b578540e48b:0x6fe83b842cf5f923`
   - Paste into the "Paste Google Maps link" field
   - ✅ **Expected**:
     - URL is accepted
     - Place preview card appears automatically
     - Shows place details (name, address, etc.)

3. **Add Location**
   - Click **"Add to Guide"** button
   - ✅ **Expected**: Same as Method 1 - location added successfully

4. **Test Invalid URL**
   - Try pasting: `https://example.com`
   - ✅ **Expected**: Error message: "Please enter a valid Google Maps URL"

---

## ✅ Test 4: Complete Flow Verification

### Steps:

1. **Add Multiple Locations**
   - Add 3-5 locations using both methods (search + URL)
   - ✅ **Expected**: All locations appear in order

2. **Check Location Order**
   - ✅ **Expected**: Locations numbered sequentially (1, 2, 3...)

3. **Continue to Preview**
   - Click **"Continue to Preview →"** button
   - ✅ **Expected**: 
     - Button enabled (if locations exist)
     - Redirects to preview page (if implemented)
     - OR shows success message

4. **Save Draft**
   - Click **"Save Draft"** button
   - ✅ **Expected**: Returns to dashboard

5. **Verify Map in Dashboard**
   - Navigate to: `http://localhost:3001/dashboard`
   - ✅ **Expected**: 
     - Map appears in list
     - Shows correct title
     - Shows location count

---

## 🐛 Common Issues & Solutions

### Issue: "Add Location" button doesn't open modal
**Solution**: Check browser console for JavaScript errors

### Issue: Search doesn't return results
**Solution**: 
- Verify `GOOGLE_PLACES_API_KEY` in `.env`
- Check API key has Places API enabled in Google Cloud Console

### Issue: URL paste doesn't work
**Solution**:
- Make sure URL is full Google Maps URL (not short link)
- Check URL contains place data (CID or place_id)

### Issue: Location added but doesn't appear
**Solution**:
- Check browser console for errors
- Verify database connection
- Check server logs for API errors

### Issue: Modal doesn't close after adding
**Solution**: 
- Check `onSuccess` callback is firing
- Verify `loadMap` function is called

---

## 📋 Test Checklist

### Map Creation
- [ ] Can navigate to `/create`
- [ ] Can enter map name
- [ ] Can select template
- [ ] Template selection shows visual feedback
- [ ] Can create map successfully
- [ ] Redirects to locations page

### Location Addition - Search
- [ ] Modal opens when clicking "Add Location"
- [ ] Search input accepts text
- [ ] Autocomplete appears after typing
- [ ] Can select from search results
- [ ] Place preview card shows details
- [ ] Can add location successfully
- [ ] Location appears in list
- [ ] Modal closes after adding

### Location Addition - URL
- [ ] Can paste Google Maps URL
- [ ] URL is validated
- [ ] Place details load from URL
- [ ] Preview card shows correctly
- [ ] Can add location from URL
- [ ] Invalid URLs show error

### Flow Verification
- [ ] Can add multiple locations
- [ ] Locations appear in correct order
- [ ] Can continue to preview
- [ ] Can save draft
- [ ] Map appears in dashboard

---

## 🎯 Success Criteria

✅ **All manual methods working if:**
- Map creation completes without errors
- Search returns results and allows selection
- URL paste loads place details
- Locations are added to map
- Map appears in dashboard with correct data

---

## 📝 Notes

- **Demo Mode**: The app uses `demo-user-id` in development mode
- **API Keys**: Google Places API key must be valid and enabled
- **Database**: Uses Supabase PostgreSQL (configured in `.env`)
- **Session**: No authentication required in dev mode

---

**Ready to test?** Start at `http://localhost:3001/create` 🚀
