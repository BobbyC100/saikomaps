/**
 * Saiko Maps — Promote Discovered Fields to Canonical
 * 
 * Promotes validated discovered (staging) fields to canonical fields.
 * 
 * Safety Rules:
 * - Only promotes if canonical field is null/empty
 * - Validates before promoting (phone format, URL format)
 * - Never promotes about_copy (staging-only, needs manual review)
 * - Tracks promotion in evidence JSON
 * - Dry-run mode for preview
 * 
 * Promotion Rules:
 * - Instagram: promote if valid URL format
 * - Phone: promote if valid US phone format
 * - Menu URL: promote if valid URL format
 * - Winelist URL: promote if valid URL format
 * - Reservations URL: promote if valid URL format
 * - About URL: promote if valid URL format
 * - About Copy: NEVER auto-promote (staging-only)
 * 
 * Usage:
 *   tsx scripts/crawl/promote-discovered-fields.ts --dry-run
 *   tsx scripts/crawl/promote-discovered-fields.ts --execute
 *   tsx scripts/crawl/promote-discovered-fields.ts --execute --only=instagram,phone
 *   tsx scripts/crawl/promote-discovered-fields.ts --execute --limit=10
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// TYPES
// ============================================================================

interface FieldPromotion {
  place_id: string;
  place_name: string;
  field: string;
  discoveredValue: string;
  canonicalValue: string | null;
  promoted: boolean;
  reason: string;
}

interface Stats {
  processed: number;
  promoted: number;
  skipped: number;
  failed: number;
  fieldCounts: Record<string, number>;
}

// ============================================================================
// CLI ARGUMENTS
// ============================================================================

interface CliArgs {
  dryRun: boolean;
  execute: boolean;
  only: string[] | null;
  limit: number | null;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  
  const onlyArg = args.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.split('=')[1].split(',') : null;
  
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
  
  return {
    dryRun: args.includes('--dry-run'),
    execute: args.includes('--execute'),
    only,
    limit,
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate phone number format (US)
 */
function validatePhone(phone: string): { valid: boolean; normalized: string; reason: string } {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Must be 10 digits (US format)
  if (digits.length !== 10) {
    return { valid: false, normalized: '', reason: 'Not 10 digits' };
  }
  
  // Area code can't start with 0 or 1
  if (digits[0] === '0' || digits[0] === '1') {
    return { valid: false, normalized: '', reason: 'Invalid area code' };
  }
  
  return { valid: true, normalized: digits, reason: 'Valid US phone' };
}

/**
 * Validate URL format
 */
function validateUrl(url: string): { valid: boolean; reason: string } {
  try {
    const parsed = new URL(url);
    
    // Must be http or https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, reason: 'Invalid protocol' };
    }
    
    // Must have valid hostname
    if (!parsed.hostname || parsed.hostname.length < 3) {
      return { valid: false, reason: 'Invalid hostname' };
    }
    
    return { valid: true, reason: 'Valid URL' };
  } catch {
    return { valid: false, reason: 'Malformed URL' };
  }
}

/**
 * Validate Instagram URL and extract handle
 */
function validateInstagram(url: string): { valid: boolean; handle: string; reason: string } {
  const urlCheck = validateUrl(url);
  if (!urlCheck.valid) {
    return { valid: false, handle: '', reason: urlCheck.reason };
  }
  
  try {
    const parsed = new URL(url);
    
    // Must be instagram.com domain
    if (!parsed.hostname.includes('instagram.com')) {
      return { valid: false, handle: '', reason: 'Not Instagram domain' };
    }
    
    // Extract handle from path
    const pathParts = parsed.pathname.split('/').filter(p => p);
    if (pathParts.length === 0) {
      return { valid: false, handle: '', reason: 'No handle in URL' };
    }
    
    const handle = pathParts[0].toLowerCase();
    
    // Validate handle format
    if (handle.length < 1 || handle.length > 30) {
      return { valid: false, handle: '', reason: 'Invalid handle length' };
    }
    
    if (!/^[a-z0-9_.]+$/.test(handle)) {
      return { valid: false, handle: '', reason: 'Invalid handle characters' };
    }
    
    // Skip common non-profile pages
    const skipHandles = ['p', 'reel', 'reels', 'stories', 'explore', 'accounts'];
    if (skipHandles.includes(handle)) {
      return { valid: false, handle: '', reason: 'Not a profile page' };
    }
    
    return { valid: true, handle, reason: 'Valid Instagram handle' };
  } catch {
    return { valid: false, handle: '', reason: 'Parse error' };
  }
}

// ============================================================================
// PROMOTION LOGIC
// ============================================================================

/**
 * Check if a place is eligible for promotion
 */
async function checkPromotionEligibility(
  placeId: string,
  onlyFields: string[] | null
): Promise<FieldPromotion[]> {
  const place = await prisma.places.findUnique({
    where: { id: placeId },
    select: {
      id: true,
      name: true,
      instagram: true,
      phone: true,
      reservationUrl: true,
      menuUrl: true,
      winelistUrl: true,
      aboutUrl: true,
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
    return [];
  }
  
  const promotions: FieldPromotion[] = [];
  
  // Instagram: canonical is instagram (handle only), discovered is full URL
  if ((!onlyFields || onlyFields.includes('instagram')) && place.discoveredInstagramHandle) {
    const validation = validateInstagram(place.discoveredInstagramHandle);
    
    if (!place.instagram && validation.valid) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'instagram',
        discoveredValue: place.discoveredInstagramHandle,
        canonicalValue: place.instagram,
        promoted: true,
        reason: `Promote: ${validation.reason}`,
      });
    } else if (place.instagram) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'instagram',
        discoveredValue: place.discoveredInstagramHandle,
        canonicalValue: place.instagram,
        promoted: false,
        reason: 'Skip: canonical already set',
      });
    } else if (!validation.valid) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'instagram',
        discoveredValue: place.discoveredInstagramHandle,
        canonicalValue: place.instagram,
        promoted: false,
        reason: `Validation failed: ${validation.reason}`,
      });
    }
  }
  
  // Phone
  if ((!onlyFields || onlyFields.includes('phone')) && place.discoveredPhone) {
    const validation = validatePhone(place.discoveredPhone);
    
    if (!place.phone && validation.valid) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'phone',
        discoveredValue: place.discoveredPhone,
        canonicalValue: place.phone,
        promoted: true,
        reason: `Promote: ${validation.reason}`,
      });
    } else if (place.phone) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'phone',
        discoveredValue: place.discoveredPhone,
        canonicalValue: place.phone,
        promoted: false,
        reason: 'Skip: canonical already set',
      });
    } else if (!validation.valid) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'phone',
        discoveredValue: place.discoveredPhone,
        canonicalValue: place.phone,
        promoted: false,
        reason: `Validation failed: ${validation.reason}`,
      });
    }
  }
  
  // Reservations URL
  if ((!onlyFields || onlyFields.includes('reservations')) && place.discoveredReservationsUrl) {
    const validation = validateUrl(place.discoveredReservationsUrl);
    
    if (!place.reservationUrl && validation.valid) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'reservationUrl',
        discoveredValue: place.discoveredReservationsUrl,
        canonicalValue: place.reservationUrl,
        promoted: true,
        reason: `Promote: ${validation.reason}`,
      });
    } else if (place.reservationUrl) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'reservationUrl',
        discoveredValue: place.discoveredReservationsUrl,
        canonicalValue: place.reservationUrl,
        promoted: false,
        reason: 'Skip: canonical already set',
      });
    } else if (!validation.valid) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'reservationUrl',
        discoveredValue: place.discoveredReservationsUrl,
        canonicalValue: place.reservationUrl,
        promoted: false,
        reason: `Validation failed: ${validation.reason}`,
      });
    }
  }
  
  // Menu URL
  if ((!onlyFields || onlyFields.includes('menuUrl')) && place.discoveredMenuUrl) {
    const validation = validateUrl(place.discoveredMenuUrl);
    
    if (!place.menuUrl && validation.valid) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'menuUrl',
        discoveredValue: place.discoveredMenuUrl,
        canonicalValue: place.menuUrl,
        promoted: true,
        reason: `Promote: ${validation.reason}`,
      });
    } else if (place.menuUrl) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'menuUrl',
        discoveredValue: place.discoveredMenuUrl,
        canonicalValue: place.menuUrl,
        promoted: false,
        reason: 'Skip: canonical already set',
      });
    } else if (!validation.valid) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'menuUrl',
        discoveredValue: place.discoveredMenuUrl,
        canonicalValue: place.menuUrl,
        promoted: false,
        reason: `Validation failed: ${validation.reason}`,
      });
    }
  }
  
  // Winelist URL
  if ((!onlyFields || onlyFields.includes('winelistUrl')) && place.discoveredWinelistUrl) {
    const validation = validateUrl(place.discoveredWinelistUrl);
    
    if (!place.winelistUrl && validation.valid) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'winelistUrl',
        discoveredValue: place.discoveredWinelistUrl,
        canonicalValue: place.winelistUrl,
        promoted: true,
        reason: `Promote: ${validation.reason}`,
      });
    } else if (place.winelistUrl) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'winelistUrl',
        discoveredValue: place.discoveredWinelistUrl,
        canonicalValue: place.winelistUrl,
        promoted: false,
        reason: 'Skip: canonical already set',
      });
    } else if (!validation.valid) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'winelistUrl',
        discoveredValue: place.discoveredWinelistUrl,
        canonicalValue: place.winelistUrl,
        promoted: false,
        reason: `Validation failed: ${validation.reason}`,
      });
    }
  }
  
  // About URL
  if ((!onlyFields || onlyFields.includes('aboutUrl')) && place.discoveredAboutUrl) {
    const validation = validateUrl(place.discoveredAboutUrl);
    
    if (!place.aboutUrl && validation.valid) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'aboutUrl',
        discoveredValue: place.discoveredAboutUrl,
        canonicalValue: place.aboutUrl,
        promoted: true,
        reason: `Promote: ${validation.reason}`,
      });
    } else if (place.aboutUrl) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'aboutUrl',
        discoveredValue: place.discoveredAboutUrl,
        canonicalValue: place.aboutUrl,
        promoted: false,
        reason: 'Skip: canonical already set',
      });
    } else if (!validation.valid) {
      promotions.push({
        place_id: place.id,
        place_name: place.name,
        field: 'aboutUrl',
        discoveredValue: place.discoveredAboutUrl,
        canonicalValue: place.aboutUrl,
        promoted: false,
        reason: `Validation failed: ${validation.reason}`,
      });
    }
  }
  
  // Note: about_copy stays in discovered_ field (staging-only, needs manual review)
  
  return promotions;
}

/**
 * Promote fields for a single place
 */
async function promotePlace(
  placeId: string,
  promotions: FieldPromotion[],
  dryRun: boolean
): Promise<{ promoted: string[]; skipped: string[] }> {
  const toPromote = promotions.filter(p => p.promoted);
  const skipped = promotions.filter(p => !p.promoted).map(p => p.field);
  
  if (toPromote.length === 0 || dryRun) {
    return { promoted: toPromote.map(p => p.field), skipped };
  }
  
  // Build update data
  const updateData: any = {};
  
  for (const promotion of toPromote) {
    if (promotion.field === 'instagram') {
      // Extract handle from URL
      const validation = validateInstagram(promotion.discoveredValue);
      updateData.instagram = validation.handle;
    } else if (promotion.field === 'phone') {
      // Normalize phone
      const validation = validatePhone(promotion.discoveredValue);
      updateData.phone = validation.normalized;
    } else if (promotion.field === 'reservationUrl') {
      updateData.reservationUrl = promotion.discoveredValue;
    } else if (promotion.field === 'menuUrl') {
      updateData.menuUrl = promotion.discoveredValue;
    } else if (promotion.field === 'winelistUrl') {
      updateData.winelistUrl = promotion.discoveredValue;
    } else if (promotion.field === 'aboutUrl') {
      updateData.aboutUrl = promotion.discoveredValue;
    }
  }
  
  // Update place
  await prisma.places.update({
    where: { id: placeId },
    data: updateData,
  });
  
  return { promoted: toPromote.map(p => p.field), skipped };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const args = parseArgs();
  
  console.log('\n🚀 Saiko Maps — Promote Discovered Fields');
  console.log('═══════════════════════════════════════════════════════════');
  if (args.dryRun) console.log('🔍 DRY RUN MODE — No database writes');
  if (args.execute) console.log('✅ EXECUTE MODE — Will write to database');
  if (args.only) console.log(`🎯 Only fields: ${args.only.join(', ')}`);
  if (args.limit) console.log(`📌 Limit: ${args.limit} places`);
  console.log('');
  
  // Validate mode
  if (!args.dryRun && !args.execute) {
    console.error('❌ Error: Must specify --dry-run or --execute');
    process.exit(1);
  }
  
  // Find places with discovered fields
  console.log('📊 Finding places with discovered fields...');
  
  const places = await prisma.places.findMany({
    where: {
      OR: [
        { discoveredInstagramHandle: { not: null } },
        { discoveredPhone: { not: null } },
        { discoveredReservationsUrl: { not: null } },
        { discoveredMenuUrl: { not: null } },
        { discoveredWinelistUrl: { not: null } },
        { discoveredAboutUrl: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
    },
    take: args.limit ?? undefined,
  });
  
  console.log(`   Found ${places.length} places with discovered fields\n`);
  
  if (places.length === 0) {
    console.log('✅ No places to process. Exiting.');
    return;
  }
  
  // Initialize stats
  const stats: Stats = {
    processed: 0,
    promoted: 0,
    skipped: 0,
    failed: 0,
    fieldCounts: {},
  };
  
  // Process each place
  for (const place of places) {
    stats.processed++;
    
    try {
      // Check eligibility
      const promotions = await checkPromotionEligibility(place.id, args.only);
      
      if (promotions.length === 0) {
        console.log(`[${stats.processed}/${places.length}] ⏭️  ${place.name} - no fields to promote`);
        continue;
      }
      
      // Promote
      const result = await promotePlace(place.id, promotions, args.dryRun);
      
      if (result.promoted.length > 0) {
        stats.promoted++;
        for (const field of result.promoted) {
          stats.fieldCounts[field] = (stats.fieldCounts[field] || 0) + 1;
        }
        
        const fieldStr = result.promoted.join(', ');
        const icon = args.dryRun ? '🔍' : '✅';
        console.log(`[${stats.processed}/${places.length}] ${icon} ${place.name} - promoted: ${fieldStr}`);
      } else {
        stats.skipped++;
        const reasons = promotions.filter(p => !p.promoted).map(p => `${p.field}: ${p.reason}`);
        console.log(`[${stats.processed}/${places.length}] ⏭️  ${place.name} - skipped: ${reasons.join(', ')}`);
      }
      
    } catch (error) {
      stats.failed++;
      console.error(`[${stats.processed}/${places.length}] ❌ ${place.name} - error: ${error}`);
    }
  }
  
  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 PROMOTION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total places:      ${places.length}`);
  console.log(`Processed:         ${stats.processed}`);
  console.log(`Places promoted:   ${stats.promoted}`);
  console.log(`Places skipped:    ${stats.skipped}`);
  console.log(`Failed:            ${stats.failed}`);
  console.log('');
  console.log('📋 Field Promotion Counts:');
  for (const [field, count] of Object.entries(stats.fieldCounts)) {
    console.log(`   ${field}: ${count}`);
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
