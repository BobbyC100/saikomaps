#!/usr/bin/env node
/**
 * Find Potential Duplicates Before Backfill
 *
 * Identifies places that would likely resolve to the same Google Place ID
 * when running backfill:google — causing "Unique constraint failed on google_place_id" errors.
 *
 * Groups by:
 * 1. Normalized name similarity (same or very similar names)
 * 2. Address similarity (same location)
 * 3. Name + address combo (what backfill uses for search)
 *
 * Run: npm run find:backfill-duplicates [--curated] [--export]
 *
 * --curated: Only places with provenance (default)
 * --all: Include all places, not just curated
 * --export: Write groups to data/backfill-duplicate-groups.json
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CURATED_ONLY = !process.argv.includes('--all');
const EXPORT = process.argv.includes('--export');

function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(the|a|an)\b/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAddress(addr: string | null | undefined): string {
  if (!addr) return '';
  return addr
    .toLowerCase()
    .replace(/[,#.\s]+/g, ' ')
    .replace(/\b(ave|avenue|blvd|street|st|rd|dr|way|ln|pl|ct)\b/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeForSearch(name: string, address: string | null, neighborhood: string | null): string {
  const parts = [name];
  if (address) parts.push(address);
  if (neighborhood) parts.push(neighborhood);
  return parts.join(' ').toLowerCase().replace(/\s+/g, ' ').trim();
}

function tokenSort(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

function levenshtein(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let last = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let nc = costs[j - 1];
        if (s1[i - 1] !== s2[j - 1]) nc = Math.min(nc, last, costs[j]) + 1;
        costs[j - 1] = last;
        last = nc;
      }
    }
    if (i > 0) costs[s2.length] = last;
  }
  return costs[s2.length];
}

function similarityPercent(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 100;
  const t1 = tokenSort(str1);
  const t2 = tokenSort(str2);
  const maxLen = Math.max(t1.length, t2.length);
  if (maxLen === 0) return 100;
  const dist = levenshtein(t1, t2);
  return Math.round((1 - dist / maxLen) * 100);
}

async function main() {
  console.log('\n🔍 Finding potential backfill duplicates...\n');
  console.log('(Places that would likely get the same Google Place ID when backfill runs)\n');

  const curatedIds = new Set(
    (await prisma.provenance.findMany({ select: { place_id: true } })).map((p) => p.place_id)
  );

  const places = await prisma.places.findMany({
    where: {
      placesDataCachedAt: null,
      ...(CURATED_ONLY && curatedIds.size > 0 ? { id: { in: Array.from(curatedIds) } } : {}),
    },
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      neighborhood: true,
      googlePlaceId: true,
    },
  });

  console.log(`Analyzing ${places.length} places (placesDataCachedAt: null)\n`);

  type PlaceRow = (typeof places)[0];
  const groups: PlaceRow[][] = [];
  const used = new Set<string>();

  for (let i = 0; i < places.length; i++) {
    if (used.has(places[i].id)) continue;

    const p1 = places[i];
    const searchKey1 = normalizeForSearch(p1.name, p1.address, p1.neighborhood);
    const group: PlaceRow[] = [p1];
    used.add(p1.id);

    for (let j = i + 1; j < places.length; j++) {
      if (used.has(places[j].id)) continue;

      const p2 = places[j];
      const searchKey2 = normalizeForSearch(p2.name, p2.address, p2.neighborhood);

      // Token sort ratio: good for "123 Main St" vs "Main St 123"
      const searchSimilarity = similarityPercent(searchKey1, searchKey2);

      // Name similarity
      const nameSim = similarityPercent(normalizeName(p1.name), normalizeName(p2.name));

      // Address similarity (if both have address)
      let addrSim = 100;
      if (p1.address && p2.address) {
        addrSim = similarityPercent(normalizeAddress(p1.address), normalizeAddress(p2.address));
      } else if (p1.address || p2.address) {
        addrSim = 0; // One has address, one doesn't — treat as different
      }

      // Likely same Place ID if: search query would be very similar
      // Threshold: 85% — backfill uses name + address for search
      if (searchSimilarity >= 85 || (nameSim >= 90 && addrSim >= 80)) {
        group.push(p2);
        used.add(p2.id);
      }
    }

    if (group.length > 1) {
      groups.push(group);
    }
  }

  // Report
  console.log('═'.repeat(80));
  console.log(`\n📊 Found ${groups.length} potential duplicate groups`);
  console.log(`   (${groups.reduce((s, g) => s + g.length - 1, 0)} places would conflict)\n`);

  if (groups.length === 0) {
    console.log('✅ No potential duplicates found. Safe to run backfill.\n');
    return;
  }

  groups.forEach((group, idx) => {
    console.log(`\n${idx + 1}. Group (${group.length} places — will collide on same Place ID):`);
    group.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name}`);
      console.log(`      slug: ${p.slug}`);
      console.log(`      address: ${p.address || '—'}`);
      console.log(`      neighborhood: ${p.neighborhood || '—'}`);
    });
    console.log('');
  });

  console.log('═'.repeat(80));
  console.log('\n💡 Next steps:');
  console.log('   1. Review groups above — decide which place to keep per group');
  console.log('   2. Delete or merge duplicates before running backfill');
  console.log('   3. Or: modify backfill to skip when Place ID already exists');
  console.log('');

  if (EXPORT) {
    const fs = await import('fs');
    const path = await import('path');
    const outPath = path.join(process.cwd(), 'data', 'backfill-duplicate-groups.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        groups.map((g) =>
          g.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            address: p.address,
            neighborhood: p.neighborhood,
          }))
        ),
        null,
        2
      )
    );
    console.log(`   Exported to ${outPath}\n`);
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
