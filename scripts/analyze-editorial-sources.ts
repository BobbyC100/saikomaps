#!/usr/bin/env node
/**
 * Analyze editorial provenance of LA County places
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface EditorialSource {
  source?: string;
  url?: string;
  title?: string;
  author?: string;
  list_name?: string;
  publication?: string;
}

function categorizeSource(editorialSources: any): string {
  if (!editorialSources || (Array.isArray(editorialSources) && editorialSources.length === 0)) {
    return 'No editorial source';
  }

  const sources = Array.isArray(editorialSources) ? editorialSources : [editorialSources];
  
  if (sources.length >= 2) {
    return 'Multi-source (2+)';
  }

  const source = sources[0];
  const sourceStr = JSON.stringify(source).toLowerCase();
  
  if (sourceStr.includes('infatuation')) return 'Infatuation';
  if (sourceStr.includes('eater')) return 'Eater';
  if (sourceStr.includes('timeout') || sourceStr.includes('time out')) return 'Time Out';
  if (sourceStr.includes('latimes') || sourceStr.includes('la times') || sourceStr.includes('los angeles times')) return 'LA Times';
  if (sourceStr.includes('thrillist')) return 'Thrillist';
  if (sourceStr.includes('conde nast') || sourceStr.includes('bon appetit') || sourceStr.includes('bonappetit')) return 'Conde Nast';
  if (sourceStr.includes('zagat')) return 'Zagat';
  
  if (source.source || source.publication || source.url) {
    return 'Other editorial';
  }
  
  return 'No editorial source';
}

async function main() {
  console.log('\n📊 EDITORIAL SOURCE ANALYSIS\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Get launch-ready places (OPEN + valid coordinates)
  const places = await prisma.places.findMany({
    where: {
      status: 'OPEN',
      latitude: { not: null },
      longitude: { not: null },
      latitude: { not: 0 },
      longitude: { not: 0 },
    },
    select: {
      id: true,
      name: true,
      editorial_sources: true,
      neighborhood: true,
      category: true,
    },
  });

  console.log(`Total launch-ready places: ${places.length}\n`);

  // Categorize by source
  const sourceBreakdown = new Map<string, { count: number; examples: string[] }>();

  for (const place of places) {
    const category = categorizeSource(place.editorial_sources);
    
    if (!sourceBreakdown.has(category)) {
      sourceBreakdown.set(category, { count: 0, examples: [] });
    }
    
    const entry = sourceBreakdown.get(category)!;
    entry.count++;
    
    if (entry.examples.length < 5) {
      entry.examples.push(place.name);
    }
  }

  // Sort by count
  const sorted = Array.from(sourceBreakdown.entries())
    .sort((a, b) => b[1].count - a[1].count);

  console.log('BY EDITORIAL SOURCE:\n');
  console.log('─'.repeat(60));

  for (const [source, data] of sorted) {
    const percentage = ((data.count / places.length) * 100).toFixed(1);
    console.log(`\n${source}`);
    console.log(`  Total: ${data.count} (${percentage}%)`);
    console.log(`  Examples:`);
    for (const example of data.examples) {
      console.log(`    • ${example}`);
    }
  }

  console.log('\n\n════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('════════════════════════════════════════════════════════════\n');

  const withEditorial = sorted
    .filter(([source]) => source !== 'No editorial source')
    .reduce((sum, [, data]) => sum + data.count, 0);
  
  const noEditorial = sorted
    .find(([source]) => source === 'No editorial source')?.[1]?.count || 0;

  const editorialPercentage = ((withEditorial / places.length) * 100).toFixed(1);
  const noEditorialPercentage = ((noEditorial / places.length) * 100).toFixed(1);

  console.log(`✅ WITH EDITORIAL BACKING:  ${withEditorial} places (${editorialPercentage}%)`);
  console.log(`⚠️  NO EDITORIAL SOURCE:     ${noEditorial} places (${noEditorialPercentage}%)`);
  console.log(`\n   Total: ${places.length} launch-ready places`);

  console.log('\n\n════════════════════════════════════════════════════════════');
  console.log('EDITORIAL QUALITY BREAKDOWN');
  console.log('════════════════════════════════════════════════════════════\n');

  const multiSource = sorted.find(([source]) => source === 'Multi-source (2+)')?.[1]?.count || 0;
  const singleSource = withEditorial - multiSource;

  console.log(`🌟 Multi-source (highest confidence): ${multiSource} places`);
  console.log(`📝 Single editorial source:           ${singleSource} places`);
  console.log(`📍 Google Places only (no editorial): ${noEditorial} places`);

  // Show detailed breakdown of multi-source places
  if (multiSource > 0) {
    console.log('\n\n════════════════════════════════════════════════════════════');
    console.log('MULTI-SOURCE PLACES (Examples)');
    console.log('════════════════════════════════════════════════════════════\n');

    const multiSourcePlaces = places
      .filter(p => {
        const sources = Array.isArray(p.editorial_sources) ? p.editorial_sources : [];
        return sources.length >= 2;
      })
      .slice(0, 10);

    for (const place of multiSourcePlaces) {
      const sources = Array.isArray(place.editorial_sources) ? place.editorial_sources : [];
      console.log(`${place.name} (${place.neighborhood || 'N/A'})`);
      console.log(`  Sources: ${sources.length}`);
      for (const source of sources.slice(0, 3)) {
        const src = source as EditorialSource;
        const pub = src.publication || src.source || 'Unknown';
        console.log(`    • ${pub}`);
      }
      if (sources.length > 3) {
        console.log(`    ... and ${sources.length - 3} more`);
      }
      console.log('');
    }
  }
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
