/**
 * Saiko Maps — Dead Website Detector
 * 
 * Checks all websites in golden_records and flags:
 * - 404 Not Found
 * - Domain expired / DNS failure  
 * - Connection refused
 * 
 * These are strong signals the business may be closed.
 * 
 * Flagging Logic:
 * - 404 / DNS failure → FLAG_FOR_REVIEW (requires manual verification)
 * - Timeout / Connection refused → Log only (could be temporary)
 * 
 * Exports CSV of flagged records for manual review.
 * 
 * Usage:
 *   npx tsx scripts/check-dead-websites.ts --dry-run
 *   npx tsx scripts/check-dead-websites.ts --limit=100
 *   npx tsx scripts/check-dead-websites.ts --county="Los Angeles"
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

// ============================================================================
// CONFIG
// ============================================================================

const CONFIG = {
  REQUEST_TIMEOUT_MS: 8000,
  REQUEST_DELAY_MS: 1000,
  BATCH_SIZE: 25,
  BATCH_DELAY_MS: 5000,
  
  USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// ============================================================================
// TYPES
// ============================================================================

interface DeadWebsiteResult {
  canonical_id: string;
  name: string;
  neighborhood: string | null;
  website: string;
  status: 'active' | 'not_found_404' | 'dns_failure' | 'timeout' | 'connection_refused' | 'ssl_error' | 'other_error';
  httpStatus?: number;
  errorMessage?: string;
  shouldFlag: boolean; // Should this be flagged for review?
}

interface Stats {
  total: number;
  active: number;
  notFound404: number;
  dnsFailure: number;
  timeout: number;
  connectionRefused: number;
  sslError: number;
  otherError: number;
  flaggedForReview: number;
  updated: number;
}

// ============================================================================
// WEBSITE CHECKER
// ============================================================================

async function checkWebsite(url: string): Promise<{
  status: DeadWebsiteResult['status'];
  httpStatus?: number;
  errorMessage?: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD to avoid downloading full page
      headers: {
        'User-Agent': CONFIG.USER_AGENT,
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (response.status === 404) {
      return { status: 'not_found_404', httpStatus: 404 };
    }

    // Consider other 4xx/5xx errors as potential issues
    if (response.status >= 400) {
      return { 
        status: 'other_error', 
        httpStatus: response.status,
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return { status: 'active', httpStatus: response.status };

  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();

      // Timeout
      if (error.name === 'AbortError') {
        return { status: 'timeout', errorMessage: 'Request timed out' };
      }

      // DNS failure (domain doesn't exist or expired)
      if (errorMsg.includes('enotfound') || 
          errorMsg.includes('dns') || 
          errorMsg.includes('getaddrinfo')) {
        return { status: 'dns_failure', errorMessage: 'DNS lookup failed - domain may be expired' };
      }

      // Connection refused (server down)
      if (errorMsg.includes('econnrefused') || errorMsg.includes('connection refused')) {
        return { status: 'connection_refused', errorMessage: 'Connection refused' };
      }

      // SSL/TLS errors
      if (errorMsg.includes('ssl') || 
          errorMsg.includes('tls') || 
          errorMsg.includes('certificate')) {
        return { status: 'ssl_error', errorMessage: 'SSL/TLS error' };
      }

      return { status: 'other_error', errorMessage: error.message };
    }

    return { status: 'other_error', errorMessage: String(error) };
  }
}

function normalizeUrl(url: string): string | null {
  try {
    let normalized = url.trim();
    
    // Add protocol if missing
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    
    const parsed = new URL(normalized);
    return parsed.href;
  } catch {
    return null;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function parseArgs(): { 
  dryRun: boolean; 
  limit: number | null; 
  county: string;
} {
  const args = process.argv.slice(2);
  
  return {
    dryRun: args.includes('--dry-run'),
    limit: args.find(a => a.startsWith('--limit='))
      ? parseInt(args.find(a => a.startsWith('--limit='))!.split('=')[1])
      : null,
    county: args.find(a => a.startsWith('--county='))
      ? args.find(a => a.startsWith('--county='))!.split('=')[1].replace(/"/g, '')
      : 'Los Angeles',
  };
}

function exportFlaggedToCSV(results: DeadWebsiteResult[], timestamp: string): string {
  const flagged = results.filter(r => r.shouldFlag);
  
  if (flagged.length === 0) {
    return '';
  }

  const csvPath = join(process.cwd(), 'data', `flagged-websites-${timestamp}.csv`);
  
  const headers = ['name', 'neighborhood', 'website', 'status', 'error_message', 'action_needed'];
  const rows = flagged.map(r => [
    r.name,
    r.neighborhood || '',
    r.website,
    r.status,
    r.errorMessage || '',
    'Manually verify if business is closed',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  writeFileSync(csvPath, csv);
  return csvPath;
}

// ============================================================================
// MAIN CHECKER
// ============================================================================

async function checkDeadWebsites() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().split('T')[0];
  const { dryRun, limit, county } = parseArgs();

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       SAIKO MAPS — DEAD WEBSITE DETECTOR                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE — No database updates will be made\n');
  }

  // Fetch records with websites
  console.log(`📊 Fetching records with websites in ${county} County...`);
  
  const whereClause = {
    website: { not: null },
    county: county,
    lifecycle_status: 'ACTIVE', // Only check currently active places
  };

  const records = await prisma.golden_records.findMany({
    where: whereClause,
    select: {
      canonical_id: true,
      name: true,
      website: true,
      neighborhood: true,
    },
    orderBy: { updated_at: 'asc' }, // Check oldest first
    take: limit || undefined,
  });

  console.log(`   Found ${records.length} records to check\n`);

  if (records.length === 0) {
    console.log('✅ No websites to check!');
    await prisma.$disconnect();
    return;
  }

  // Process in batches
  const stats: Stats = {
    total: records.length,
    active: 0,
    notFound404: 0,
    dnsFailure: 0,
    timeout: 0,
    connectionRefused: 0,
    sslError: 0,
    otherError: 0,
    flaggedForReview: 0,
    updated: 0,
  };

  const results: DeadWebsiteResult[] = [];
  const batches = Math.ceil(records.length / CONFIG.BATCH_SIZE);

  console.log(`⚙️  Processing ${batches} batches of ${CONFIG.BATCH_SIZE} records\n`);
  console.log('─'.repeat(60));

  for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
    const batchStart = batchIndex * CONFIG.BATCH_SIZE;
    const batchRecords = records.slice(batchStart, batchStart + CONFIG.BATCH_SIZE);
    
    console.log(`\n📦 Batch ${batchIndex + 1}/${batches}`);

    for (let i = 0; i < batchRecords.length; i++) {
      const record = batchRecords[i];
      const overallIndex = batchStart + i + 1;
      
      // Progress indicator
      const progress = Math.round((overallIndex / records.length) * 100);
      process.stdout.write(`\r   [${progress.toString().padStart(3)}%] ${record.name.substring(0, 35).padEnd(35)} `);

      // Normalize URL
      const url = normalizeUrl(record.website!);
      if (!url) {
        console.log('⚠️  Invalid URL');
        continue;
      }

      // Check website
      const check = await checkWebsite(url);
      
      // Determine if should be flagged for review
      const shouldFlag = check.status === 'not_found_404' || check.status === 'dns_failure';
      
      const result: DeadWebsiteResult = {
        canonical_id: record.canonical_id,
        name: record.name,
        neighborhood: record.neighborhood,
        website: url,
        status: check.status,
        httpStatus: check.httpStatus,
        errorMessage: check.errorMessage,
        shouldFlag,
      };
      
      results.push(result);

      // Update stats
      switch (check.status) {
        case 'active':
          stats.active++;
          console.log('✅ Active');
          break;
        case 'not_found_404':
          stats.notFound404++;
          console.log('🚨 404 Not Found');
          break;
        case 'dns_failure':
          stats.dnsFailure++;
          console.log('💀 DNS Failure');
          break;
        case 'timeout':
          stats.timeout++;
          console.log('⏱️  Timeout');
          break;
        case 'connection_refused':
          stats.connectionRefused++;
          console.log('🔌 Connection Refused');
          break;
        case 'ssl_error':
          stats.sslError++;
          console.log('🔒 SSL Error');
          break;
        case 'other_error':
          stats.otherError++;
          console.log(`⚠️  ${check.errorMessage?.substring(0, 30)}`);
          break;
      }

      // Flag for review in database
      if (shouldFlag && !dryRun) {
        await prisma.golden_records.update({
          where: { canonical_id: record.canonical_id },
          data: {
            lifecycle_status: 'FLAG_FOR_REVIEW',
            updated_at: new Date(),
          },
        });
        stats.flaggedForReview++;
        stats.updated++;
      } else if (shouldFlag) {
        stats.flaggedForReview++;
      }

      // Rate limit delay
      if (i < batchRecords.length - 1) {
        await sleep(CONFIG.REQUEST_DELAY_MS);
      }
    }

    // Batch delay
    if (batchIndex < batches - 1) {
      console.log(`\n   ⏳ Waiting ${CONFIG.BATCH_DELAY_MS / 1000}s before next batch...`);
      await sleep(CONFIG.BATCH_DELAY_MS);
    }
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================

  const duration = Date.now() - startTime;

  console.log('\n\n' + '═'.repeat(60));
  console.log('                         SUMMARY');
  console.log('═'.repeat(60));
  console.log(`
   Total checked:      ${stats.total}
   ✅ Active:          ${stats.active} (${Math.round((stats.active / stats.total) * 100)}%)
   
   ISSUES FOUND:
   🚨 404 Not Found:   ${stats.notFound404}
   💀 DNS Failure:     ${stats.dnsFailure}
   ⏱️  Timeout:         ${stats.timeout} (logged only)
   🔌 Conn Refused:    ${stats.connectionRefused} (logged only)
   🔒 SSL Error:       ${stats.sslError}
   ⚠️  Other Errors:   ${stats.otherError}
   
   🚩 FLAGGED FOR REVIEW: ${stats.flaggedForReview}
   ${dryRun ? '🔍 Dry run' : `💾 Updated:`}            ${stats.updated}
   
   ⏱️  Duration:        ${formatDuration(duration)}
   📈 Rate:            ${(stats.total / (duration / 1000 / 60)).toFixed(1)} records/min
  `);

  // Export flagged records to CSV
  if (stats.flaggedForReview > 0) {
    const csvPath = exportFlaggedToCSV(results, timestamp);
    if (csvPath) {
      console.log('─'.repeat(60));
      console.log('📄 FLAGGED RECORDS EXPORTED');
      console.log('─'.repeat(60));
      console.log(`   File: ${csvPath}`);
      console.log(`   Records: ${stats.flaggedForReview}`);
      console.log('\n   Next Steps:');
      console.log('   1. Review the CSV to verify these businesses are actually closed');
      console.log('   2. Use the admin tool to mark confirmed closures as CLOSED_PERMANENTLY');
      console.log('   3. Update archive_reason = "CLOSED" for permanent closures');
    }

    // Show first 10 flagged
    console.log('\n' + '─'.repeat(60));
    console.log('   FLAGGED RECORDS (first 10)');
    console.log('─'.repeat(60));
    
    const flagged = results.filter(r => r.shouldFlag);
    for (const result of flagged.slice(0, 10)) {
      console.log(`   ${result.name.substring(0, 30).padEnd(30)} [${result.status}]`);
      console.log(`      ${result.website}`);
      console.log(`      ${result.errorMessage || 'N/A'}`);
    }
    if (flagged.length > 10) {
      console.log(`   ... and ${flagged.length - 10} more (see CSV)`);
    }
  }

  console.log('\n' + '═'.repeat(60) + '\n');

  await prisma.$disconnect();
}

// ============================================================================
// RUN
// ============================================================================

checkDeadWebsites().catch(async (error) => {
  console.error('\n❌ Fatal error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
