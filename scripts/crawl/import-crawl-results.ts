/**
 * Saiko Maps — Import Crawl Results to Database
 * 
 * Takes CSV output from website crawler and writes discovered fields
 * to staging columns in the database.
 * 
 * Safety:
 * - Writes to discovered_* staging fields only
 * - Never overwrites canonical fields (instagram, phone, website, etc.)
 * - Stores evidence + timestamp per field
 * - Skips if staging field already has data (unless --force)
 * 
 * Usage:
 *   tsx scripts/crawl/import-crawl-results.ts --dry-run
 *   tsx scripts/crawl/import-crawl-results.ts --execute
 *   tsx scripts/crawl/import-crawl-results.ts --execute --only=instagram,phone
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ============================================================================
// TYPES
// ============================================================================

interface CSVRow {
  place_id: string;
  place_name: string;
  website: string;
  final_url: string;
  status: string;
  instagram_url: string;
  phone: string;
  reservations_url: string;
  reservations_vendor: string;
  menu_url: string;
  menu_evidence: string;
  winelist_url: string;
  winelist_evidence: string;
  about_url: string;
  about_copy: string;
  about_evidence: string;
  from_cache: string;
  error: string;
}

interface FieldUpdate {
  field: string;
  value: string;
  evidence: string;
  sourceUrl: string;
}

interface Stats {
  processed: number;
  updated: number;
  skipped: number;
  failed: number;
  fieldCounts: Record<string, number>;
}

// ============================================================================
// CLI ARGUMENTS
// ============================================================================

interface CliArgs {
  csvPath: string;
  dryRun: boolean;
  execute: boolean;
  only: string[] | null;
  skipIfPresent: boolean;
  force: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  
  const csvPath = args.find(a => a.startsWith('--csv='))
    ? args.find(a => a.startsWith('--csv='))!.split('=')[1]
    : path.join(__dirname, 'out', 'place_site_fields.csv');
  
  const onlyArg = args.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.split('=')[1].split(',') : null;
  
  return {
    csvPath,
    dryRun: args.includes('--dry-run'),
    execute: args.includes('--execute'),
    only,
    skipIfPresent: !args.includes('--no-skip-if-present'),
    force: args.includes('--force'),
  };
}

// ============================================================================
// CSV PARSING
// ============================================================================

function parseCSV(csvPath: string): CSVRow[] {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  const header = lines[0].split(',').map(h => h.trim());
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle CSV with quoted fields
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          currentValue += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue);
    
    const row: any = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = values[j] || '';
    }
    
    rows.push(row as CSVRow);
  }
  
  return rows;
}

// ============================================================================
// FIELD EXTRACTION
// ============================================================================

/**
 * Extract field updates from CSV row
 */
function extractFieldUpdates(row: CSVRow, onlyFields: string[] | null): FieldUpdate[] {
  const updates: FieldUpdate[] = [];
  
  const fieldMap = {
    instagram: { value: row.instagram_url, evidence: row.instagram_url, field: 'discoveredInstagramHandle' },
    phone: { value: row.phone, evidence: row.phone, field: 'discoveredPhone' },
    menu: { value: row.menu_url, evidence: row.menu_evidence, field: 'discoveredMenuUrl' },
    winelist: { value: row.winelist_url, evidence: row.winelist_evidence, field: 'discoveredWinelistUrl' },
    reservations: { value: row.reservations_url, evidence: `${row.reservations_url} (${row.reservations_vendor})`, field: 'discoveredReservationsUrl' },
    about_url: { value: row.about_url, evidence: row.about_evidence, field: 'discoveredAboutUrl' },
    about_copy: { value: row.about_copy, evidence: row.about_evidence, field: 'discoveredAboutCopy' },
  };
  
  for (const [key, data] of Object.entries(fieldMap)) {
    // Skip if not in --only list
    if (onlyFields && !onlyFields.includes(key)) continue;
    
    // Skip if empty
    if (!data.value || data.value.trim() === '') continue;
    
    updates.push({
      field: data.field,
      value: data.value,
      evidence: data.evidence || data.value,
      sourceUrl: row.final_url,
    });
  }
  
  return updates;
}

// ============================================================================
// DATABASE UPDATES
// ============================================================================

/**
 * Check if place already has staging field populated
 */
async function checkExistingFields(placeId: string, fieldNames: string[]): Promise<Record<string, boolean>> {
  const place = await prisma.places.findUnique({
    where: { id: placeId },
    select: {
      discoveredInstagramHandle: true,
      discoveredPhone: true,
      discoveredMenuUrl: true,
      discoveredWinelistUrl: true,
      discoveredReservationsUrl: true,
      discoveredAboutUrl: true,
      discoveredAboutCopy: true,
    },
  });
  
  if (!place) {
    return {};
  }
  
  const existing: Record<string, boolean> = {};
  for (const fieldName of fieldNames) {
    existing[fieldName] = !!(place as any)[fieldName];
  }
  
  return existing;
}

/**
 * Update place with discovered fields
 */
async function updatePlace(
  placeId: string,
  updates: FieldUpdate[],
  skipIfPresent: boolean,
  dryRun: boolean
): Promise<{ updated: string[]; skipped: string[] }> {
  const fieldNames = updates.map(u => u.field);
  const existing = await checkExistingFields(placeId, fieldNames);
  
  const toUpdate: FieldUpdate[] = [];
  const skipped: string[] = [];
  
  for (const update of updates) {
    if (skipIfPresent && existing[update.field]) {
      skipped.push(update.field);
    } else {
      toUpdate.push(update);
    }
  }
  
  if (toUpdate.length === 0) {
    return { updated: [], skipped };
  }
  
  if (dryRun) {
    return { updated: toUpdate.map(u => u.field), skipped };
  }
  
  // Build update data
  const updateData: any = {
    discoveredFieldsFetchedAt: new Date(),
  };
  
  // Build evidence JSON (merge with existing)
  const existingPlace = await prisma.places.findUnique({
    where: { id: placeId },
    select: { discoveredFieldsEvidence: true },
  });
  
  const evidence: any = (existingPlace?.discoveredFieldsEvidence as any) || {};
  
  for (const update of toUpdate) {
    // Set field value
    updateData[update.field] = update.value;
    
    // Add evidence
    const evidenceKey = update.field.replace('discovered', '').replace(/([A-Z])/g, '_$1').toLowerCase().substring(1);
    evidence[evidenceKey] = {
      evidence: update.evidence.substring(0, 160),
      sourceUrl: update.sourceUrl,
      fetchedAt: new Date().toISOString(),
    };
  }
  
  updateData.discoveredFieldsEvidence = evidence;
  
  // Update place
  await prisma.places.update({
    where: { id: placeId },
    data: updateData,
  });
  
  return { updated: toUpdate.map(u => u.field), skipped };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const args = parseArgs();
  
  console.log('\n📥 Saiko Maps — Import Crawl Results');
  console.log('═══════════════════════════════════════════════════════════');
  if (args.dryRun) console.log('🔍 DRY RUN MODE — No database writes');
  if (args.execute) console.log('✅ EXECUTE MODE — Will write to database');
  console.log(`📄 CSV: ${args.csvPath}`);
  if (args.only) console.log(`🎯 Only fields: ${args.only.join(', ')}`);
  console.log(`⏭️  Skip if present: ${args.skipIfPresent ? 'yes' : 'no'}`);
  console.log('');
  
  // Validate mode
  if (!args.dryRun && !args.execute) {
    console.error('❌ Error: Must specify --dry-run or --execute');
    process.exit(1);
  }
  
  // Check CSV exists
  if (!fs.existsSync(args.csvPath)) {
    console.error(`❌ Error: CSV file not found: ${args.csvPath}`);
    process.exit(1);
  }
  
  // Parse CSV
  console.log('📊 Parsing CSV...');
  const rows = parseCSV(args.csvPath);
  console.log(`   Found ${rows.length} rows\n`);
  
  // Filter to successful crawls only
  const successRows = rows.filter(r => r.status === 'success');
  console.log(`📋 Processing ${successRows.length} successful crawls\n`);
  
  // Initialize stats
  const stats: Stats = {
    processed: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    fieldCounts: {},
  };
  
  // Process each row
  for (const row of successRows) {
    stats.processed++;
    
    try {
      // Extract field updates
      const updates = extractFieldUpdates(row, args.only);
      
      if (updates.length === 0) {
        console.log(`[${stats.processed}/${successRows.length}] ⏭️  ${row.place_name} - no fields to update`);
        continue;
      }
      
      // Update place
      const result = await updatePlace(row.place_id, updates, args.skipIfPresent, args.dryRun);
      
      if (result.updated.length > 0) {
        stats.updated++;
        for (const field of result.updated) {
          stats.fieldCounts[field] = (stats.fieldCounts[field] || 0) + 1;
        }
        
        const fieldStr = result.updated.map(f => f.replace('discovered', '')).join(', ');
        console.log(`[${stats.processed}/${successRows.length}] ✅ ${row.place_name} - updated: ${fieldStr}`);
      } else {
        stats.skipped++;
        console.log(`[${stats.processed}/${successRows.length}] ⏭️  ${row.place_name} - all fields already present`);
      }
      
      if (result.skipped.length > 0) {
        stats.skipped += result.skipped.length;
      }
      
    } catch (error) {
      stats.failed++;
      console.error(`[${stats.processed}/${successRows.length}] ❌ ${row.place_name} - error: ${error}`);
    }
  }
  
  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 IMPORT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total rows:        ${rows.length}`);
  console.log(`Successful crawls: ${successRows.length}`);
  console.log(`Processed:         ${stats.processed}`);
  console.log(`Places updated:    ${stats.updated}`);
  console.log(`Fields skipped:    ${stats.skipped}`);
  console.log(`Failed:            ${stats.failed}`);
  console.log('');
  console.log('📋 Field Update Counts:');
  for (const [field, count] of Object.entries(stats.fieldCounts)) {
    const shortName = field.replace('discovered', '').replace(/([A-Z])/g, ' $1').trim();
    console.log(`   ${shortName}: ${count}`);
  }
  console.log('═══════════════════════════════════════════════════════════\n');
  
  if (args.dryRun) {
    console.log('🔍 DRY RUN — No changes written to database');
    console.log('💡 Run with --execute to apply changes\n');
  } else {
    console.log('✅ Changes written to database\n');
  }
}

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
