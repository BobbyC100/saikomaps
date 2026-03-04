import { db } from '../lib/db';
import { EnrichmentStage } from '@prisma/client';

async function analyzeEnrichmentStatus() {
  console.log('🔍 Analyzing Entity Enrichment Status...\n');

  const entities = await db.entities.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      googlePlaceId: true,
      neighborhood: true,
      category: true,
      enrichment_stage: true,
      needs_human_review: true,
      last_enriched_at: true,
      status: true,
      map_places: {
        select: { id: true },
      },
    },
  });

  let hasGooglePlaceId = 0;
  let hasNeighborhood = 0;
  let hasCategory = 0;
  let merchantEnriched = 0;
  let needsHumanReview = 0;

  const enrichmentLevels: Record<string, typeof entities> = {
    'Merchant Enriched': [],
    'Google Coverage Complete': [],
    'Minimal (GPID only)': [],
    'None': [],
  };

  entities.forEach((entity) => {
    const hasGPID = !!entity.googlePlaceId;
    const hasNH = !!entity.neighborhood;
    const hasCat = !!entity.category;
    const isMerchantEnriched = entity.enrichment_stage === EnrichmentStage.MERCHANT_ENRICHED;
    const isGoogleComplete = entity.enrichment_stage === EnrichmentStage.GOOGLE_COVERAGE_COMPLETE;

    if (hasGPID) hasGooglePlaceId++;
    if (hasNH) hasNeighborhood++;
    if (hasCat) hasCategory++;
    if (isMerchantEnriched) merchantEnriched++;
    if (entity.needs_human_review) needsHumanReview++;

    if (isMerchantEnriched) {
      enrichmentLevels['Merchant Enriched'].push(entity);
    } else if (isGoogleComplete) {
      enrichmentLevels['Google Coverage Complete'].push(entity);
    } else if (hasGPID) {
      enrichmentLevels['Minimal (GPID only)'].push(entity);
    } else {
      enrichmentLevels['None'].push(entity);
    }
  });

  const total = entities.length;
  const pct = (n: number) => total > 0 ? Math.round(n * 100 / total) : 0;

  console.log('📊 Overall Enrichment Coverage:');
  console.log('─'.repeat(80));
  console.log(`Total Entities:                  ${total}`);
  console.log(`Google Place ID:                 ${hasGooglePlaceId} (${pct(hasGooglePlaceId)}%)`);
  console.log(`Neighborhood:                    ${hasNeighborhood} (${pct(hasNeighborhood)}%)`);
  console.log(`Category:                        ${hasCategory} (${pct(hasCategory)}%)`);
  console.log(`Merchant Enriched:               ${merchantEnriched} (${pct(merchantEnriched)}%)`);
  console.log(`Needs Human Review:              ${needsHumanReview} (${pct(needsHumanReview)}%)`);
  console.log('');

  console.log('\n📈 Enrichment Stage Breakdown:\n');
  Object.entries(enrichmentLevels).forEach(([level, rows]) => {
    const count = rows.length;
    console.log(`${level.padEnd(35)} ${count.toString().padStart(4)} entities (${pct(count)}%)`);
  });

  console.log('\n' + '─'.repeat(80));
  console.log('\n⚠️  Entities Needing Enrichment:\n');

  const needsGoogle = entities.filter((e) => !e.googlePlaceId);
  const needsWebsite = entities.filter(
    (e) => e.enrichment_stage === EnrichmentStage.GOOGLE_COVERAGE_COMPLETE && e.status === 'OPEN'
  ).filter((e) => e.map_places.length > 0);

  console.log(`📸 Missing Google Place ID:        ${needsGoogle.length} entities`);
  console.log(`🌐 Ready for website enrichment:   ${needsWebsite.length} entities (in maps, OPEN, stage=GOOGLE_COVERAGE_COMPLETE)`);

  if (needsWebsite.length > 0) {
    console.log(`\n   Top 10 entities ready for website enrichment:`);
    needsWebsite.slice(0, 10).forEach((e) => {
      console.log(`   • ${e.name} (${e.slug}) — in ${e.map_places.length} map(s)`);
    });
    if (needsWebsite.length > 10) {
      console.log(`   ... and ${needsWebsite.length - 10} more`);
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log('\n💡 Recommended Actions:\n');

  if (needsGoogle.length > 0) {
    console.log(`1. Backfill ${needsGoogle.length} entities missing Google data:`);
    console.log(`   npm run backfill:google`);
  }

  if (needsWebsite.length > 0) {
    console.log(`\n2. Run website enrichment (LA-only):`);
    console.log(`   npm run enrich:website -- --la-only --limit=50`);
  }

  console.log('\n3. Check enrichment status regularly:');
  console.log(`   npm run analyze:enrichment`);

  console.log('─'.repeat(80));
}

analyzeEnrichmentStatus()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
