/**
 * Ramen Places Intake — ingests 15 LA ramen places from validation mapping
 *
 * Usage:
 *   npx tsx scripts/intake-ramen-places.ts
 *   npx tsx scripts/intake-ramen-places.ts --dry-run
 *   npx tsx scripts/intake-ramen-places.ts --verbose
 */

import { db } from '@/lib/db';
import { jaroWinklerSimilarity, normalizeName } from '@/lib/similarity';
import slugify from 'slugify';
import { randomUUID } from 'crypto';

const AUTO_MATCH_THRESHOLD = 0.90;
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// ─── Data: 15 LA Ramen Places (from validation mapping v1) ──────────────────

const RAMEN_PLACES: Array<{ name: string; category: string; primaryVertical: string; notes: string }> = [
  // Specialty / High-Integrity Ramen Shops (Core)
  { name: "Tsujita LA", category: "ramen-shop", primaryVertical: "EAT", notes: "Tonkotsu tsukemen specialist, Sawtelle" },
  { name: "Tsujita Annex", category: "ramen-shop", primaryVertical: "EAT", notes: "Spicy tonkotsu variant" },
  { name: "Ichiran", category: "ramen-shop", primaryVertical: "EAT", notes: "Single-style tonkotsu specialist" },
  { name: "Afuri Ramen", category: "ramen-shop", primaryVertical: "EAT", notes: "Shio yuzu-forward specialist" },
  { name: "Tonchin LA", category: "ramen-shop", primaryVertical: "EAT", notes: "Tonkotsu-shoyu hybrid, Tokyo-style" },

  // Multi-Style Ramen Shops (High Coverage)
  { name: "Daikokuya", category: "ramen-shop", primaryVertical: "EAT", notes: "Tonkotsu dominant, Little Tokyo legacy anchor" },
  { name: "Shin-Sen-Gumi", category: "ramen-shop", primaryVertical: "EAT", notes: "Multi-style Hakata tonkotsu" },
  { name: "HiroNori Craft Ramen", category: "ramen-shop", primaryVertical: "EAT", notes: "Tonkotsu + vegan options" },
  { name: "Tatsu Ramen", category: "ramen-shop", primaryVertical: "EAT", notes: "Bold tonkotsu, modern casual" },
  { name: "Ramen Nagi", category: "ramen-shop", primaryVertical: "EAT", notes: "Customization-heavy, flavor variation" },

  // Modern / New Wave
  { name: "Men Oh Tokushima Ramen", category: "ramen-shop", primaryVertical: "EAT", notes: "Tokushima regional specialty, sweet soy" },

  // Legacy / Foundational
  { name: "Kouraku", category: "ramen-shop", primaryVertical: "EAT", notes: "Little Tokyo, 1976 (America's first ramen restaurant)" },

  // Edge / Considered Cases
  { name: "Silverlake Ramen", category: "ramen-shop", primaryVertical: "EAT", notes: "Multi-style, broad menu" },
  { name: "Jinya Ramen Bar", category: "ramen-shop", primaryVertical: "EAT", notes: "Chain, multiple broths" },
  { name: "Izakaya Ramen", category: "izakaya", primaryVertical: "EAT", notes: "Ramen as secondary offering" },
];

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
  console.log(`=== Ramen Places Intake${DRY_RUN ? ' (DRY RUN)' : ''} ===\n`);

  const rows = RAMEN_PLACES;
  console.log(`Input: ${rows.length} ramen places\n`);

  // Step 1: Deduplicate input by name
  const seen = new Set<string>();
  const unique: typeof rows = [];
  for (const row of rows) {
    const key = row.name.toLowerCase().trim();
    if (seen.has(key)) {
      if (VERBOSE) console.log(`  [dedup-input] Skipping duplicate input: "${row.name}"`);
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
    const resolvedName = row.name.trim();

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
          category: row.category,
          primaryVertical: row.primaryVertical,
          status: 'CANDIDATE',
          enrichmentStatus: 'INGESTED',
          publicationStatus: 'UNPUBLISHED',
          editorialSources: { sources: [`ramen-intake-2026-03-19: ${row.notes}`] },
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
  console.log(`  Input rows:           ${rows.length}`);
  console.log(`  Unique (after dedup): ${unique.length}`);
  console.log(`  Created:              ${created.length}`);
  console.log(`  Skipped (matched):    ${skippedMatch.length}`);
  if (skippedMatch.length > 0 && skippedMatch.length <= 15) {
    console.log(`    Matched: ${skippedMatch.join(', ')}`);
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
