/**
 * Pizza Places Intake — reads pizza places from CSV and ingests as CANDIDATE entities
 *
 * Usage:
 *   npx tsx scripts/intake-pizza-places.ts <csv-path>
 *   npx tsx scripts/intake-pizza-places.ts data/intake/"Untitled 4.csv"
 *   npx tsx scripts/intake-pizza-places.ts data/intake/"Untitled 4.csv" --dry-run
 *   npx tsx scripts/intake-pizza-places.ts data/intake/"Untitled 4.csv" --verbose
 */

import { db } from '@/lib/db';
import { jaroWinklerSimilarity, normalizeName } from '@/lib/similarity';
import slugify from 'slugify';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

const AUTO_MATCH_THRESHOLD = 0.90;
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: npx tsx scripts/intake-pizza-places.ts <csv-path>');
  console.error('Example: npx tsx scripts/intake-pizza-places.ts data/intake/"Untitled 4.csv"');
  process.exit(1);
}

const fullPath = path.resolve(csvPath);
if (!fs.existsSync(fullPath)) {
  console.error(`File not found: ${fullPath}`);
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function generateUniqueSlug(name: string): Promise<string> {
  let base = slugify(name, { lower: true, strict: true });
  let slug = base;
  let counter = 2;
  while (true) {
    const existing = await db.entities.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`=== Pizza Places Intake${DRY_RUN ? ' (DRY RUN)' : ''} ===\n`);
  console.log(`Reading: ${fullPath}\n`);

  const raw = fs.readFileSync(fullPath, 'utf-8');
  const parsed = Papa.parse<{ Names: string }>(raw, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (parsed.errors.length > 0) {
    console.warn('CSV parse warnings:');
    parsed.errors.slice(0, 3).forEach(e => console.warn(`  ${e.message}`));
  }

  const rows = parsed.data.filter(r => r.Names && r.Names.trim());
  console.log(`Parsed: ${rows.length} place names\n`);

  // Step 1: Deduplicate input by name
  const seen = new Set<string>();
  const unique: typeof rows = [];
  for (const row of rows) {
    const key = row.Names.toLowerCase().trim();
    if (seen.has(key)) {
      if (VERBOSE) console.log(`  [dedup-input] Skipping duplicate input: "${row.Names}"`);
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  console.log(`Deduplicated: ${rows.length} raw → ${unique.length} unique inputs\n`);

  // Step 2: Load all existing entities for fuzzy matching
  const allEntities = await db.entities.findMany({
    select: { id: true, slug: true, name: true, status: true },
  });
  console.log(`Loaded ${allEntities.length} existing entities for matching\n`);

  const created: string[] = [];
  const skippedMatch: string[] = [];

  for (const row of unique) {
    const resolvedName = row.Names.trim();

    // Check slug exact match first
    const candidateSlug = slugify(resolvedName, { lower: true, strict: true });
    const bySlug = allEntities.find(e => e.slug === candidateSlug);
    if (bySlug) {
      console.log(`  [slug-match] "${resolvedName}" → existing "${bySlug.name}" (${bySlug.slug})`);
      skippedMatch.push(resolvedName);
      continue;
    }

    // Fuzzy name match
    const normalizedInput = normalizeName(resolvedName);
    let bestScore = 0;
    let bestMatch: (typeof allEntities)[0] | null = null;

    for (const entity of allEntities) {
      const score = jaroWinklerSimilarity(normalizedInput, normalizeName(entity.name));
      if (score >= AUTO_MATCH_THRESHOLD && score > bestScore) {
        bestScore = score;
        bestMatch = entity;
      }
    }

    if (bestMatch) {
      console.log(`  [fuzzy-match] "${resolvedName}" → existing "${bestMatch.name}" (score: ${bestScore.toFixed(3)})`);
      skippedMatch.push(resolvedName);
      continue;
    }

    // No match — create CANDIDATE
    const slug = await generateUniqueSlug(resolvedName);

    if (!DRY_RUN) {
      await db.entities.create({
        data: {
          id: randomUUID(),
          slug,
          name: resolvedName,
          category: 'pizzeria',
          primary_vertical: 'EAT',
          status: 'CANDIDATE',
          editorialSources: { sources: ['pizza-intake-2026-03-19'] },
        },
      });
    }

    // Add to in-memory list so subsequent rows can match against newly created entities
    allEntities.push({ id: '', slug, name: resolvedName, status: 'CANDIDATE' });

    console.log(`  [CREATED] "${resolvedName}" → ${slug}`);
    created.push(resolvedName);
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`  Input rows (raw):     ${rows.length}`);
  console.log(`  Unique (after dedup): ${unique.length}`);
  console.log(`  Created:              ${created.length}`);
  console.log(`  Skipped (matched):    ${skippedMatch.length}`);
  if (skippedMatch.length > 0 && skippedMatch.length <= 10) {
    console.log(`    Examples: ${skippedMatch.slice(0, 10).join(', ')}`);
  }
  if (DRY_RUN) console.log('\n  *** DRY RUN — no data written ***');
  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
