/**
 * Test Script: Map Creation (Bulk Upload & Manual Methods)
 * 
 * This script tests:
 * 1. Manual map creation via API
 * 2. Bulk CSV upload and processing
 * 3. Manual location addition
 * 4. Verification of created maps and locations
 * 
 * Prerequisites:
 * - Node.js 18+ (for fetch API)
 * - Development server running on http://localhost:3001
 * - Optional: npm install form-data (for CSV upload test)
 * 
 * Run with: node test-map-creation.js
 */

const BASE_URL = 'http://localhost:3001';
const fs = require('fs');
const path = require('path');

// Test results tracker
const results = {
  passed: [],
  failed: [],
  warnings: [],
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  }[type] || 'ℹ️';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function recordResult(testName, passed, message = '') {
  if (passed) {
    results.passed.push({ test: testName, message });
    log(`${testName}: PASSED`, 'success');
  } else {
    results.failed.push({ test: testName, message });
    log(`${testName}: FAILED - ${message}`, 'error');
  }
}

// Helper: Make API request
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// Test 1: Manual Map Creation
async function testManualMapCreation() {
  log('Testing manual map creation...', 'info');
  
  const testMap = {
    title: `Test Map - ${Date.now()}`,
    template: 'postcard',
  };

  const response = await apiRequest('/api/maps', {
    method: 'POST',
    body: JSON.stringify(testMap),
  });

  if (!response.ok) {
    recordResult('Manual Map Creation', false, `API returned ${response.status}: ${JSON.stringify(response.data)}`);
    return null;
  }

  if (!response.data.success || !response.data.data) {
    recordResult('Manual Map Creation', false, 'Response missing success flag or data');
    return null;
  }

  const map = response.data.data;
  if (!map.id || !map.title || !map.slug) {
    recordResult('Manual Map Creation', false, 'Map missing required fields');
    return null;
  }

  recordResult('Manual Map Creation', true, `Created map: ${map.title} (ID: ${map.id})`);
  return map;
}

// Test 2: Bulk CSV Upload
async function testBulkCSVUpload() {
  log('Testing bulk CSV upload...', 'info');

  // Try to use real CSV file if available, otherwise create test CSV
  const projectCsvPath = path.join(__dirname, 'test-biarritz.csv');
  const desktopCsvPath = '/Users/bobbyciccaglione/Desktop/Takeout/Saved/Biarritz.csv';
  let csvPath;
  
  if (fs.existsSync(projectCsvPath)) {
    log('Using CSV file from project: test-biarritz.csv', 'info');
    csvPath = projectCsvPath;
  } else if (fs.existsSync(desktopCsvPath)) {
    log('Copying CSV file from Desktop to project...', 'info');
    fs.copyFileSync(desktopCsvPath, projectCsvPath);
    csvPath = projectCsvPath;
  } else {
    // Create a test CSV file matching Google Takeout format
    const testCSV = `Title,Note,URL,Tags,Comment
Test Location 1,Great place,https://www.google.com/maps/place/Test+Location+1/data=!4m2!3m1!1s0xd516b23084ce94b:0xfba98573be2b6f12,,
Test Location 2,Amazing spot,https://www.google.com/maps/place/Test+Location+2/data=!4m2!3m1!1s0xd516b578540e48b:0x6fe83b842cf5f923,,
Test Location 3,Love this place,https://www.google.com/maps/place/Test+Location+3/data=!4m2!3m1!1s0xd516bc343986b07:0x91618f58f2ff3dda,,`;

    csvPath = path.join(__dirname, 'test-upload.csv');
    fs.writeFileSync(csvPath, testCSV);
  }

  // Upload CSV file using form-data package with http module (fetch doesn't work well with streams)
  let FormData, http;
  try {
    FormData = require('form-data');
    http = require('http');
  } catch (e) {
    recordResult('Bulk CSV Upload', false, 'form-data package not found. Install with: npm install form-data');
    // Clean up test file (only if we created it)
    if (csvPath && csvPath.includes('test-upload.csv') && fs.existsSync(csvPath)) {
      fs.unlinkSync(csvPath);
    }
    return null;
  }

  try {
    // Use http module instead of fetch for form-data streams
    const formData = new FormData();
    formData.append('file', fs.createReadStream(csvPath));

    const url = new URL(`${BASE_URL}/api/import/upload`);
    
    const uploadResult = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: url.hostname,
        port: url.port || 3001,
        path: url.pathname,
        method: 'POST',
        headers: formData.getHeaders(),
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode === 200) {
              resolve({ ok: true, data: parsed });
            } else {
              resolve({ ok: false, status: res.statusCode, data: parsed });
            }
          } catch (e) {
            resolve({ ok: false, status: res.statusCode, error: data });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      formData.pipe(req);
    });

    if (!uploadResult.ok) {
      const errorMsg = uploadResult.data?.error || `HTTP ${uploadResult.status}`;
      recordResult('Bulk CSV Upload', false, `Upload failed: ${errorMsg}`);
      console.error('Upload error details:', uploadResult);
      return null;
    }

    const data = uploadResult.data;

    if (!data.fileId) {
      recordResult('Bulk CSV Upload', false, 'Response missing fileId');
      return null;
    }

    recordResult('Bulk CSV Upload', true, `Uploaded CSV (fileId: ${data.fileId})`);

    // Test CSV Preview
    const previewResponse = await apiRequest('/api/import/preview', {
      method: 'POST',
      body: JSON.stringify({ fileId: data.fileId }),
    });

    if (!previewResponse.ok || !previewResponse.data.locations) {
      recordResult('CSV Preview', false, `Failed to preview CSV: ${JSON.stringify(previewResponse.data)}`);
      return { fileId: data.fileId, locations: [] };
    }

    const locationCount = previewResponse.data.locations.length;
    recordResult('CSV Preview', locationCount > 0, `Found ${locationCount} locations in CSV`);

    // Clean up test file (only if we created it)
    if (csvPath.includes('test-upload.csv') && fs.existsSync(csvPath)) {
      fs.unlinkSync(csvPath);
    }

    return {
      fileId: data.fileId,
      locations: previewResponse.data.locations,
    };
  } catch (error) {
    recordResult('Bulk CSV Upload', false, `Error: ${error.message}`);
    if (csvPath && csvPath.includes('test-upload.csv') && fs.existsSync(csvPath)) {
      fs.unlinkSync(csvPath);
    }
    return null;
  }
}

// Test 3: Manual Location Addition
async function testManualLocationAddition(mapId, mapSlug) {
  log('Testing manual location addition...', 'info');

  if (!mapId && !mapSlug) {
    recordResult('Manual Location Addition', false, 'No map ID or slug provided');
    return null;
  }

  // Use slug if available, otherwise use ID
  const identifier = mapSlug || mapId;

  // Test Google Places search
  const searchResponse = await apiRequest('/api/places/search?query=coffee+shop+new+york');
  
  if (!searchResponse.ok || !searchResponse.data.data || searchResponse.data.data.length === 0) {
    recordResult('Places Search', false, 'Failed to search for places');
    return null;
  }

  const place = searchResponse.data.data[0];
  recordResult('Places Search', true, `Found place: ${place.name}`);

  // Test place details fetch
  const detailsResponse = await apiRequest(`/api/places/details/${encodeURIComponent(place.placeId)}`);
  
  if (!detailsResponse.ok || !detailsResponse.data.data) {
    recordResult('Place Details Fetch', false, 'Failed to fetch place details');
    return null;
  }

  recordResult('Place Details Fetch', true, `Fetched details for: ${detailsResponse.data.data.name}`);

  // Test adding location to map (using slug or ID)
  const addLocationResponse = await apiRequest(`/api/lists/${identifier}/locations`, {
    method: 'POST',
    body: JSON.stringify({
      placeId: place.placeId,
    }),
  });

  if (!addLocationResponse.ok) {
    recordResult('Add Location to Map', false, `Failed to add location: ${JSON.stringify(addLocationResponse.data)}`);
    return null;
  }

  recordResult('Add Location to Map', true, `Added location to map: ${place.name}`);
  return place;
}

// Test 4: Verify Map with Locations
async function testMapVerification(mapId) {
  log('Verifying map and locations...', 'info');

  if (!mapId) {
    recordResult('Map Verification', false, 'No map ID provided');
    return;
  }

  const response = await apiRequest(`/api/maps/${mapId}`);

  if (!response.ok || !response.data.success) {
    recordResult('Map Verification', false, 'Failed to fetch map');
    return;
  }

  const map = response.data.data;
  const locationCount = map.locations ? map.locations.length : 0;

  recordResult('Map Verification', true, `Map has ${locationCount} location(s)`);

  if (locationCount > 0) {
    log(`  Locations:`, 'info');
    map.locations.forEach((loc, index) => {
      log(`    ${index + 1}. ${loc.name} - ${loc.address || 'No address'}`, 'info');
    });
  } else {
    results.warnings.push({
      test: 'Map Verification',
      message: 'Map created but has no locations',
    });
  }
}

// Test 5: List All Maps
async function testListMaps() {
  log('Testing map listing...', 'info');

  const response = await apiRequest('/api/maps');

  if (!response.ok || !response.data.success) {
    recordResult('List Maps', false, 'Failed to list maps');
    return;
  }

  const maps = response.data.data || [];
  recordResult('List Maps', true, `Found ${maps.length} map(s)`);

  return maps;
}

// Main test runner
async function runTests() {
  log('🚀 Starting Saiko Maps Creation Tests...', 'info');
  log(`Testing against: ${BASE_URL}`, 'info');
  log('', 'info');

  try {
    // Test 1: Manual Map Creation
    const testMap = await testManualMapCreation();
    log('', 'info');

    // Test 2: Bulk CSV Upload
    const csvResult = await testBulkCSVUpload();
    log('', 'info');

    // Test 3: Manual Location Addition (if map was created)
    let addedLocation = null;
    if (testMap) {
      addedLocation = await testManualLocationAddition(testMap.id, testMap.slug);
      log('', 'info');
    }

    // Test 4: Verify Map
    if (testMap) {
      await testMapVerification(testMap.id);
      log('', 'info');
    }

    // Test 5: List All Maps
    await testListMaps();
    log('', 'info');

  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
  }

  // Print summary
  log('', 'info');
  log('═══════════════════════════════════════', 'info');
  log('📊 TEST SUMMARY', 'info');
  log('═══════════════════════════════════════', 'info');
  log(`✅ Passed: ${results.passed.length}`, 'success');
  log(`❌ Failed: ${results.failed.length}`, results.failed.length > 0 ? 'error' : 'info');
  log(`⚠️  Warnings: ${results.warnings.length}`, results.warnings.length > 0 ? 'warning' : 'info');
  log('', 'info');

  if (results.failed.length > 0) {
    log('Failed Tests:', 'error');
    results.failed.forEach(({ test, message }) => {
      log(`  - ${test}: ${message}`, 'error');
    });
    log('', 'info');
  }

  if (results.warnings.length > 0) {
    log('Warnings:', 'warning');
    results.warnings.forEach(({ test, message }) => {
      log(`  - ${test}: ${message}`, 'warning');
    });
    log('', 'info');
  }

  // Exit code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  log('⚠️  Node.js 18+ required for fetch API. Installing node-fetch...', 'warning');
  log('   Please run: npm install node-fetch', 'warning');
  log('   Or upgrade to Node.js 18+', 'warning');
  process.exit(1);
}

// Run tests
runTests();
