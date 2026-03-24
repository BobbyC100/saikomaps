#!/usr/bin/env tsx
/**
 * Saiko Maps — Pipeline Progress Checker
 * 
 * Quick status check for scraping and extraction pipeline.
 * 
 * Usage:
 *   npx tsx scripts/check-pipeline-progress.ts
 *   
 * Or make executable and run directly:
 *   chmod +x scripts/check-pipeline-progress.ts
 *   ./scripts/check-pipeline-progress.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProgress() {
  console.log('\n🔍 Saiko Maps — Pipeline Progress');
  console.log('═'.repeat(50));
  console.log('');

  // Phase 1: Scraping stats
  const totalWithWebsites = await prisma.golden_records.count({
    where: {
      website: { not: null },
      county: 'Los Angeles',
    },
  });

  const scraped = await prisma.golden_records.count({
    where: {
      scraped_at: { not: null },
      county: 'Los Angeles',
    },
  });

  const scrapedSuccess = await prisma.golden_records.count({
    where: {
      scrape_status: 'success',
      county: 'Los Angeles',
    },
  });

  const scrapedPartial = await prisma.golden_records.count({
    where: {
      scrape_status: 'partial',
      county: 'Los Angeles',
    },
  });

  const withMenu = await prisma.golden_records.count({
    where: {
      menu_url: { not: null },
      county: 'Los Angeles',
    },
  });

  const withWineList = await prisma.golden_records.count({
    where: {
      winelist_url: { not: null },
      county: 'Los Angeles',
    },
  });

  const withAbout = await prisma.golden_records.count({
    where: {
      about_copy: { not: null },
      county: 'Los Angeles',
    },
  });

  console.log('📊 PHASE 1: WEBSITE SCRAPING');
  console.log('─'.repeat(50));
  console.log(`Total places with websites: ${totalWithWebsites}`);
  console.log(`Scraped: ${scraped}/${totalWithWebsites} (${Math.round((scraped / totalWithWebsites) * 100)}%)`);
  console.log(`  ├─ Success: ${scrapedSuccess}`);
  console.log(`  └─ Partial: ${scrapedPartial}`);
  console.log('');
  console.log('Content found:');
  console.log(`  ├─ Menu URLs: ${withMenu} (${Math.round((withMenu / totalWithWebsites) * 100)}%)`);
  console.log(`  ├─ Wine lists: ${withWineList} (${Math.round((withWineList / totalWithWebsites) * 100)}%)`);
  console.log(`  └─ About copy: ${withAbout} (${Math.round((withAbout / totalWithWebsites) * 100)}%)`);
  console.log('');

  // Phase 2: Extraction stats
  const withScrapedContent = await prisma.golden_records.count({
    where: {
      county: 'Los Angeles',
      OR: [
        { menu_raw_text: { not: null } },
        { about_copy: { not: null } },
      ],
    },
  });

  const withSignals = await prisma.golden_records.count({
    where: {
      signals_generated_at: { not: null },
      county: 'Los Angeles',
    },
  });

  const readyToExtract = await prisma.golden_records.count({
    where: {
      county: 'Los Angeles',
      OR: [
        { menu_raw_text: { not: null } },
        { about_copy: { not: null } },
      ],
      signals_generated_at: null,
    },
  });

  const publishTier = await prisma.golden_records.count({
    where: {
      county: 'Los Angeles',
      identity_signals: {
        path: ['confidence_tier'],
        equals: 'publish',
      },
    },
  });

  const reviewTier = await prisma.golden_records.count({
    where: {
      county: 'Los Angeles',
      identity_signals: {
        path: ['confidence_tier'],
        equals: 'review',
      },
    },
  });

  console.log('🔮 PHASE 2: IDENTITY SIGNAL EXTRACTION');
  console.log('─'.repeat(50));
  console.log(`Places with scraped content: ${withScrapedContent}`);
  console.log(`Signals extracted: ${withSignals}/${withScrapedContent} (${withScrapedContent > 0 ? Math.round((withSignals / withScrapedContent) * 100) : 0}%)`);
  console.log(`Ready to extract: ${readyToExtract}`);
  console.log('');
  
  if (withSignals > 0) {
    console.log('Quality breakdown:');
    console.log(`  ├─ Publish tier (≥0.7): ${publishTier}`);
    console.log(`  └─ Review tier (0.4-0.7): ${reviewTier}`);
    console.log('');
  }

  // Overall status
  const scrapingComplete = scraped === totalWithWebsites;
  const extractionComplete = readyToExtract === 0 && withSignals > 0;

  console.log('📈 OVERALL STATUS');
  console.log('─'.repeat(50));
  
  if (scrapingComplete && extractionComplete) {
    console.log('✅ Pipeline complete!');
  } else if (scrapingComplete) {
    console.log(`✅ Scraping complete`);
    console.log(`⏳ Extraction in progress (${readyToExtract} remaining)`);
  } else {
    console.log(`⏳ Scraping in progress (${totalWithWebsites - scraped} remaining)`);
    const estimatedMinutes = Math.ceil((totalWithWebsites - scraped) * 11 / 60); // ~11s per place
    console.log(`   Estimated time: ~${estimatedMinutes} minutes`);
  }
  
  console.log('');
  console.log('═'.repeat(50));
  console.log('');

  await prisma.$disconnect();
}

checkProgress().catch(async (error) => {
  console.error('Error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
