#!/usr/bin/env node
/**
 * Backfill coords, address, phone, hours, neighborhood, photos from Google Places Details.
 * Targets entities that have a GPID but are missing coords (the cheapest backfill).
 *
 * Usage:
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js scripts/backfill-details-from-gpid.js
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js scripts/backfill-details-from-gpid.js --limit=10
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js scripts/backfill-details-from-gpid.js --dry-run
 *
 * Cost: ~$0.017 per entity (Place Details API)
 * Estimated total for 312 entities: ~$5.30
 */
const { Client } = require('pg');

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_PLACES_API_KEY is not set. Add it to .env or .env.local');
  process.exit(1);
}

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
const dryRun = args.includes('--dry-run');

const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
const FIELDS = [
  'place_id', 'name', 'formatted_address', 'formatted_phone_number',
  'website', 'geometry', 'types', 'photos', 'opening_hours',
  'price_level', 'business_status', 'address_components', 'vicinity',
].join(',');

// ---------------------------------------------------------------------------
// Neighborhood extraction from address_components
// ---------------------------------------------------------------------------
function extractNeighborhood(components) {
  if (!components || !Array.isArray(components)) return null;
  const priority = ['neighborhood', 'sublocality_level_1', 'sublocality', 'locality'];
  for (const type of priority) {
    const comp = components.find(c => c.types && c.types.includes(type));
    if (comp) return comp.long_name;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fetch place details from Google
// ---------------------------------------------------------------------------
async function fetchDetails(gpid) {
  const url = `${DETAILS_URL}?place_id=${encodeURIComponent(gpid)}&fields=${FIELDS}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 'OK') return null;
  return json.result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Find entities with GPID but missing coords
  const limitClause = limit ? `LIMIT ${limit}` : '';
  const { rows: entities } = await client.query(`
    SELECT id, name, slug, google_place_id,
           latitude::float AS latitude, longitude::float AS longitude,
           address, phone, neighborhood, hours IS NOT NULL AS has_hours
    FROM entities
    WHERE status NOT IN ('PERMANENTLY_CLOSED', 'CANDIDATE')
      AND google_place_id IS NOT NULL
      AND (latitude IS NULL OR longitude IS NULL)
    ORDER BY name ASC
    ${limitClause}
  `);

  console.log(`\n🔍 Backfill Details from GPID`);
  console.log(`   Entities to process: ${entities.length}`);
  if (dryRun) console.log('   Mode: DRY RUN');
  console.log('');

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    const progress = `[${i + 1}/${entities.length}]`;

    try {
      const details = await fetchDetails(e.google_place_id);
      if (!details) {
        console.log(`${progress} ❌ ${e.name} → API returned no result`);
        failed++;
        continue;
      }

      const lat = details.geometry?.location?.lat;
      const lng = details.geometry?.location?.lng;
      const address = details.formatted_address || null;
      const phone = details.formatted_phone_number || null;
      const neighborhood = extractNeighborhood(details.address_components);
      const hours = details.opening_hours?.weekday_text || null;
      const priceLevel = details.price_level ?? null;
      const businessStatus = details.business_status || null;
      const photos = details.photos ? details.photos.map(p => ({
        photoReference: p.photo_reference,
        width: p.width,
        height: p.height,
      })) : null;

      if (!lat || !lng) {
        console.log(`${progress} ⚠️  ${e.name} → no coords in response`);
        skipped++;
        continue;
      }

      // Build update — only fill missing fields, never overwrite existing data
      const setClauses = [];
      const params = [];
      let paramIdx = 1;

      // Always set coords (that's our primary target)
      setClauses.push(`latitude = $${paramIdx++}`, `longitude = $${paramIdx++}`);
      params.push(lat, lng);

      if (!e.address && address) {
        setClauses.push(`address = $${paramIdx++}`);
        params.push(address);
      }
      if (!e.phone && phone) {
        setClauses.push(`phone = $${paramIdx++}`);
        params.push(phone);
      }
      if (!e.neighborhood && neighborhood) {
        setClauses.push(`neighborhood = $${paramIdx++}`);
        params.push(neighborhood);
      }
      if (!e.has_hours && hours) {
        setClauses.push(`hours = $${paramIdx++}`);
        params.push(JSON.stringify(hours));
      }
      if (priceLevel !== null) {
        setClauses.push(`price_level = $${paramIdx++}`);
        params.push(priceLevel);
      }
      if (businessStatus) {
        setClauses.push(`business_status = $${paramIdx++}`);
        params.push(businessStatus);
      }
      if (photos) {
        setClauses.push(`google_photos = $${paramIdx++}`);
        params.push(JSON.stringify(photos));
      }
      setClauses.push(`places_data_cached_at = NOW()`);

      // Add entity ID as final param
      params.push(e.id);

      const filled = [];
      if (lat) filled.push('coords');
      if (!e.address && address) filled.push('addr');
      if (!e.phone && phone) filled.push('phone');
      if (!e.neighborhood && neighborhood) filled.push('hood');
      if (!e.has_hours && hours) filled.push('hours');
      if (photos) filled.push(`${photos.length} photos`);

      if (!dryRun) {
        await client.query(
          `UPDATE entities SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
          params
        );
      }

      console.log(`${progress} ✅ ${e.name} → ${filled.join(', ')}`);
      updated++;
    } catch (err) {
      console.log(`${progress} ❌ ${e.name} → ${err.message}`);
      failed++;
    }

    // Small delay to respect rate limits (10 QPS for Places API)
    if (i < entities.length - 1) {
      await new Promise(r => setTimeout(r, 120));
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Done. Updated ${updated} | Skipped ${skipped} | Failed ${failed} of ${entities.length}`);
  console.log(`Estimated cost: ~$${(updated * 0.017).toFixed(2)}`);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
