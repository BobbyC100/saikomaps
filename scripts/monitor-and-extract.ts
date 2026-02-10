#!/usr/bin/env tsx
/**
 * Saiko Maps — Pipeline Monitor & Auto-Starter
 * 
 * Monitors scraping progress and automatically starts extraction when ready.
 * 
 * Usage:
 *   npx tsx scripts/monitor-and-extract.ts
 */

import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';

const prisma = new PrismaClient();

const CHECK_INTERVAL_MS = 30000; // Check every 30 seconds

async function checkScrapingStatus() {
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

  return {
    totalWithWebsites,
    scraped,
    readyToExtract,
    scrapingComplete: scraped === totalWithWebsites,
    progress: Math.round((scraped / totalWithWebsites) * 100),
  };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}

async function startExtraction() {
  console.log('\n🚀 Starting Phase 2: Identity Signal Extraction...\n');
  
  const extractionProcess = spawn('npx', ['tsx', 'scripts/extract-identity-signals.ts'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  return new Promise<number>((resolve, reject) => {
    extractionProcess.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Extraction process exited with code ${code}`));
      }
    });

    extractionProcess.on('error', (error) => {
      reject(error);
    });
  });
}

async function monitor() {
  console.log('\n🔍 Saiko Maps — Pipeline Monitor');
  console.log('═'.repeat(60));
  console.log('Checking scraping progress every 30 seconds...');
  console.log('Press Ctrl+C to stop monitoring');
  console.log('═'.repeat(60));
  console.log('');

  let checkCount = 0;

  while (true) {
    checkCount++;
    const status = await checkScrapingStatus();
    const timestamp = formatTime(new Date());

    console.log(`[${timestamp}] Check #${checkCount}: ${status.scraped}/${status.totalWithWebsites} scraped (${status.progress}%) | ${status.readyToExtract} ready to extract`);

    if (status.scrapingComplete && status.readyToExtract > 0) {
      console.log('');
      console.log('═'.repeat(60));
      console.log('✅ Phase 1 Complete!');
      console.log(`   ${status.scraped} places scraped`);
      console.log(`   ${status.readyToExtract} places ready for extraction`);
      console.log('═'.repeat(60));
      console.log('');

      try {
        await startExtraction();
        console.log('');
        console.log('═'.repeat(60));
        console.log('✅ Phase 2 Complete!');
        console.log('═'.repeat(60));
        console.log('');
      } catch (error) {
        console.error('❌ Extraction failed:', error);
        process.exit(1);
      }

      break;
    }

    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
  }

  await prisma.$disconnect();
}

monitor().catch(async (error) => {
  console.error('Fatal error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
