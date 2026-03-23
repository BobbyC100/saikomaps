/**
 * Bulk Intake Script — one-time ingest of ~84 entities (pupuserias, Korean fried chicken, dumplings)
 * Deduplicates input by name, checks DB for existing matches via Jaro-Winkler,
 * creates CANDIDATE entities for new places.
 *
 * Usage: npx tsx scripts/bulk-intake.ts
 */

import { db } from '@/lib/db';
import { jaroWinklerSimilarity, normalizeName } from '@/lib/similarity';
import slugify from 'slugify';
import { randomUUID } from 'crypto';

const AUTO_MATCH_THRESHOLD = 0.90;

// ─── Raw Data ────────────────────────────────────────────────────────────────

const RAW_DATA: Array<{ name: string; sourceUrl: string; category: string; primaryVertical: string }> = [
  // ── Music Venues (25) ─────────────────────────────────────────────────────
  { name: "Hollywood Bowl", sourceUrl: "https://www.discoverlosangeles.com/things-to-do/hollywood-bowl", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "Greek Theatre", sourceUrl: "https://www.discoverlosangeles.com/things-to-do/greek-theatre", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "Walt Disney Concert Hall", sourceUrl: "https://www.laphil.com", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "The Troubadour", sourceUrl: "https://www.latimes.com/entertainment-arts/music/story/2019-08-28/troubadour-west-hollywood-history", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "Whisky a Go Go", sourceUrl: "https://www.sunsetstrip.com/whisky-a-go-go", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "The Roxy Theatre", sourceUrl: "https://www.sunsetstrip.com/the-roxy-theatre", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "El Rey Theatre", sourceUrl: "https://www.goldenvoice.com/venues/el-rey-theatre", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "The Wiltern", sourceUrl: "https://www.livenation.com/venue/KovZpZA6ta1A/the-wiltern-events", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "The Kia Forum", sourceUrl: "https://thekiaforum.com", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "Hollywood Palladium", sourceUrl: "https://www.livenation.com/venue/KovZpZA6taIA/hollywood-palladium-events", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "The Fonda Theatre", sourceUrl: "https://www.fondatheatre.com", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "The Echo", sourceUrl: "https://www.theecho.com", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "Echoplex", sourceUrl: "https://www.theecho.com", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "The Regent Theater", sourceUrl: "https://www.regentdtla.com", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "The Belasco", sourceUrl: "https://www.thebelasco.com", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "The Mayan", sourceUrl: "https://www.themayan.com", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "The Novo", sourceUrl: "https://www.thenovodtla.com", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "The Smell", sourceUrl: "https://www.thesmell.org", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "Zebulon", sourceUrl: "https://zebulon.la", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "Largo at the Coronet", sourceUrl: "https://largo-la.com", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "The Moroccan Lounge", sourceUrl: "https://moroccanlounge.com", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "The Mint", sourceUrl: "https://www.themintla.com", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "Hotel Café", sourceUrl: "https://hotelcafe.com", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "Teragram Ballroom", sourceUrl: "https://teragramballroom.com", category: "music-venue", primaryVertical: "CULTURE" },
  { name: "Shrine Auditorium", sourceUrl: "https://www.shrineauditorium.com", category: "music-venue", primaryVertical: "CULTURE" },
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
  console.log('=== Bulk Intake Script ===\n');

  // Step 1: Deduplicate input by name (keep first occurrence)
  const seen = new Set<string>();
  const unique: typeof RAW_DATA = [];
  for (const row of RAW_DATA) {
    const key = row.name.toLowerCase().trim();
    if (seen.has(key)) {
      console.log(`  [dedup-input] Skipping duplicate input: "${row.name}"`);
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  console.log(`\nDeduplicated: ${RAW_DATA.length} raw → ${unique.length} unique inputs\n`);

  // Step 2: Load all existing entities for fuzzy matching
  const allEntities = await db.entities.findMany({
    select: { id: true, slug: true, name: true, status: true },
  });
  console.log(`Loaded ${allEntities.length} existing entities for matching\n`);

  const created: string[] = [];
  const skippedMatch: string[] = [];
  const skippedAmbiguous: string[] = [];

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
    await db.entities.create({
      data: {
        id: randomUUID(),
        slug,
        name: resolvedName,
        category: row.category,
        primaryVertical: row.primaryVertical,
        status: 'CANDIDATE',
        editorialSources: { sources: [row.sourceUrl] },
      },
    });

    // Add to in-memory list so subsequent rows can match against newly created entities
    allEntities.push({ id: '', slug, name: resolvedName, status: 'CANDIDATE' });

    console.log(`  [CREATED] "${resolvedName}" → ${slug}`);
    created.push(resolvedName);
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`  Input rows (raw):     ${RAW_DATA.length}`);
  console.log(`  Unique (after dedup): ${unique.length}`);
  console.log(`  Created:              ${created.length}`);
  console.log(`  Skipped (matched):    ${skippedMatch.length}`);
  if (skippedMatch.length > 0) {
    console.log(`    Matched names: ${skippedMatch.join(', ')}`);
  }
  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
