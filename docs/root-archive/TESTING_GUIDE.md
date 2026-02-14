# 🧪 Saiko Maps Testing Guide

This guide explains how to test the map creation functionality (bulk upload and manual methods) in Saiko Maps.

## Prerequisites

1. **Development server running**: Make sure Saiko Maps is running on `http://localhost:3001`
   ```bash
   cd /Users/bobbyciccaglione/saiko-maps
   npm run dev
   ```

2. **Node.js 18+**: Required for the `fetch` API
   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

3. **Dependencies installed**:
   ```bash
   npm install
   ```

4. **Optional - For CSV upload test**:
   ```bash
   npm install form-data
   ```
   (The test script will skip CSV upload if form-data is not installed)

## Running the Test Script

### Option 1: Automated Test Script

Run the comprehensive test script:

```bash
node test-map-creation.js
```

This script tests:
- ✅ Manual map creation via API
- ✅ Bulk CSV upload
- ✅ CSV preview/parsing
- ✅ Manual location addition via search
- ✅ Place details fetching
- ✅ Map verification

### Option 2: Manual Browser Testing

#### Test 1: Manual Map Creation

1. Navigate to: `http://localhost:3001/create`
2. Enter a map name (e.g., "My Test Map")
3. Select a template (Postcard, Field Notes, Monocle, or Street)
4. Click "Continue to Add Locations →"
5. ✅ **Expected**: Redirected to `/create/[mapId]/locations`

#### Test 2: Manual Location Addition

1. On the locations page (`/create/[mapId]/locations`)
2. Click "Add Location" button
3. **Option A - Paste Google Maps Link**:
   - Paste a Google Maps URL (e.g., `https://maps.google.com/?cid=123456789`)
   - ✅ **Expected**: Place details load automatically
   - Click "Add to Guide"
   
4. **Option B - Search**:
   - Type in search box (e.g., "coffee shop New York")
   - ✅ **Expected**: Autocomplete results appear
   - Click a result
   - ✅ **Expected**: Place preview card shows
   - Click "Add to Guide"

5. ✅ **Expected**: Location appears in the list below

#### Test 3: Bulk CSV Upload

1. Create a test CSV file (`test.csv`):
   ```csv
   Title,URL,Note,Address
   Test Location 1,https://maps.google.com/?cid=123456789,Great place,123 Main St, New York, NY
   Test Location 2,https://maps.google.com/?cid=987654321,Amazing spot,456 Oak Ave, Los Angeles, CA
   ```

2. Navigate to: `http://localhost:3001/import` (if available)
   OR use the API directly:
   ```bash
   curl -X POST http://localhost:3001/api/import/upload \
     -F "file=@test.csv"
   ```

3. ✅ **Expected**: File uploads successfully, returns `fileId`

4. Preview the CSV:
   ```bash
   curl -X POST http://localhost:3001/api/import/preview \
     -H "Content-Type: application/json" \
     -d '{"fileId": "YOUR_FILE_ID"}'
   ```

5. ✅ **Expected**: Returns parsed locations array

## API Endpoints Reference

### Create Map
```bash
POST /api/maps
Content-Type: application/json

{
  "title": "My Test Map",
  "template": "postcard"
}
```

### Upload CSV
```bash
POST /api/import/upload
Content-Type: multipart/form-data

file: [CSV file]
```

### Preview CSV
```bash
POST /api/import/preview
Content-Type: application/json

{
  "fileId": "uuid-here"
}
```

### Search Places
```bash
GET /api/places/search?query=coffee+shop+new+york
```

### Get Place Details
```bash
GET /api/places/details/[placeId]
```

### Add Location to Map
```bash
POST /api/lists/[mapId]/locations
Content-Type: application/json

{
  "placeId": "ChIJ..."
}
```

### Get Map Details
```bash
GET /api/maps/[mapId]
```

## Expected Test Results

### ✅ Success Indicators

- Map creation returns `{ success: true, data: { id, title, slug } }`
- CSV upload returns `{ fileId: "uuid" }`
- CSV preview returns `{ locations: [...] }`
- Place search returns `{ success: true, data: [...] }`
- Location addition returns `{ success: true, data: {...} }`
- Map details include locations array

### ❌ Common Issues

1. **"Unauthorized" errors**: 
   - Check if authentication is required (may be disabled in dev mode)
   - Verify session/auth setup

2. **"Map not found"**:
   - Verify map ID/slug is correct
   - Check database connection

3. **"Place not found"**:
   - Verify Google Places API key is set in `.env`
   - Check API key has Places API enabled

4. **CSV parsing errors**:
   - Verify CSV format matches Google Takeout format
   - Check file encoding (should be UTF-8)

## Troubleshooting

### Test Script Fails

1. **Check server is running**:
   ```bash
   curl http://localhost:3001/api/maps
   ```

2. **Check Node.js version**:
   ```bash
   node --version  # Need 18+
   ```

3. **Install missing dependencies**:
   ```bash
   npm install form-data
   ```

### Browser Testing Issues

1. **Open browser console** (F12) to see errors
2. **Check Network tab** for failed API requests
3. **Verify environment variables** in `.env`:
   - `DATABASE_URL`
   - `GOOGLE_PLACES_API_KEY`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`

## Next Steps

After successful testing:

1. ✅ Verify maps appear in dashboard
2. ✅ Test map viewing/publishing
3. ✅ Test location editing
4. ✅ Test map deletion
5. ✅ Test with real Google Takeout CSV files

---

**Questions?** Check the main README.md or API documentation.
