/**
 * LA County Data Completeness Report
 * Analyzes field population across all places to identify Platinum Profile readiness
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeCompleteness() {
  // Get all LA County records
  const allRecords = await prisma.golden_records.findMany({
    where: { county: 'Los Angeles' }
  });

  console.log('\n📊 LA COUNTY PLACES — DATA COMPLETENESS REPORT');
  console.log('='.repeat(70));
  console.log(`Total LA County Places: ${allRecords.length}`);
  console.log('');

  // Field analysis by tier
  const fields = {
    // TIER 1 - Essential (Discovery & Contact)
    tier1: {
      name: 'name',
      lat: 'lat',
      lng: 'lng',
      address_street: 'address_street',
      neighborhood: 'neighborhood',
      category: 'category',
      website: 'website',
      phone: 'phone',
    },
    // TIER 2 - Important Identity Signals
    tier2: {
      price_tier: 'price_tier',
      cuisines: 'cuisines',
      instagram_handle: 'instagram_handle',
      place_personality: 'place_personality',
      cuisine_posture: 'cuisine_posture',
      signature_dishes: 'signature_dishes',
    },
    // TIER 3 - Value-Add Content
    tier3: {
      tagline: 'tagline',
      vibe_words: 'vibe_words',
      wine_program_intent: 'wine_program_intent',
      service_model: 'service_model',
      origin_story_type: 'origin_story_type',
      about_copy: 'about_copy',
      menu_raw_text: 'menu_raw_text',
    },
    // TIER 4 - Nice to Have
    tier4: {
      winelist_raw_text: 'winelist_raw_text',
      hours_structured: 'hours_structured',
      business_status: 'business_status',
      confidence_tier: 'confidence_tier',
    }
  };

  const analyze = (fieldName: string) => {
    let filled = 0;
    allRecords.forEach(record => {
      const value = (record as any)[fieldName];
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          if (value.length > 0) filled++;
        } else if (typeof value === 'string') {
          if (value.trim() !== '') filled++;
        } else {
          filled++;
        }
      }
    });
    return {
      filled,
      pct: ((filled / allRecords.length) * 100).toFixed(1)
    };
  };

  console.log('TIER 1 — Essential Data (Discovery & Contact):');
  console.log('-'.repeat(70));
  let tier1Total = 0;
  Object.entries(fields.tier1).forEach(([label, field]) => {
    const stats = analyze(field);
    tier1Total += parseFloat(stats.pct);
    console.log(`  ${label.padEnd(20)} ${stats.filled.toString().padStart(4)} / ${allRecords.length} (${stats.pct}%)`);
  });
  const tier1Avg = (tier1Total / Object.keys(fields.tier1).length).toFixed(1);
  console.log(`  ${'TIER 1 AVERAGE'.padEnd(20)} ${tier1Avg}%`);
  console.log('');

  console.log('TIER 2 — Important Identity Signals:');
  console.log('-'.repeat(70));
  let tier2Total = 0;
  Object.entries(fields.tier2).forEach(([label, field]) => {
    const stats = analyze(field);
    tier2Total += parseFloat(stats.pct);
    console.log(`  ${label.padEnd(20)} ${stats.filled.toString().padStart(4)} / ${allRecords.length} (${stats.pct}%)`);
  });
  const tier2Avg = (tier2Total / Object.keys(fields.tier2).length).toFixed(1);
  console.log(`  ${'TIER 2 AVERAGE'.padEnd(20)} ${tier2Avg}%`);
  console.log('');

  console.log('TIER 3 — Value-Add Content:');
  console.log('-'.repeat(70));
  let tier3Total = 0;
  Object.entries(fields.tier3).forEach(([label, field]) => {
    const stats = analyze(field);
    tier3Total += parseFloat(stats.pct);
    console.log(`  ${label.padEnd(20)} ${stats.filled.toString().padStart(4)} / ${allRecords.length} (${stats.pct}%)`);
  });
  const tier3Avg = (tier3Total / Object.keys(fields.tier3).length).toFixed(1);
  console.log(`  ${'TIER 3 AVERAGE'.padEnd(20)} ${tier3Avg}%`);
  console.log('');

  console.log('TIER 4 — Nice to Have:');
  console.log('-'.repeat(70));
  let tier4Total = 0;
  Object.entries(fields.tier4).forEach(([label, field]) => {
    const stats = analyze(field);
    tier4Total += parseFloat(stats.pct);
    console.log(`  ${label.padEnd(20)} ${stats.filled.toString().padStart(4)} / ${allRecords.length} (${stats.pct}%)`);
  });
  const tier4Avg = (tier4Total / Object.keys(fields.tier4).length).toFixed(1);
  console.log(`  ${'TIER 4 AVERAGE'.padEnd(20)} ${tier4Avg}%`);
  console.log('');

  // Platinum Profile analysis
  console.log('='.repeat(70));
  console.log('PLATINUM PROFILE ANALYSIS (90%+ of Tier 1+2+3):');
  console.log('-'.repeat(70));
  
  let platinumCount = 0;
  const allTierFields = {...fields.tier1, ...fields.tier2, ...fields.tier3};
  const totalFields = Object.keys(allTierFields).length;
  
  allRecords.forEach(record => {
    let filledCount = 0;
    Object.values(allTierFields).forEach(fieldName => {
      const value = (record as any)[fieldName];
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          if (value.length > 0) filledCount++;
        } else if (typeof value === 'string') {
          if (value.trim() !== '') filledCount++;
        } else {
          filledCount++;
        }
      }
    });
    const pct = (filledCount / totalFields) * 100;
    if (pct >= 90) platinumCount++;
  });
  
  console.log(`  Places with 90%+ completeness: ${platinumCount} / ${allRecords.length} (${((platinumCount / allRecords.length) * 100).toFixed(1)}%)`);
  console.log(`  Total fields evaluated: ${totalFields}`);
  console.log(`  Threshold: ${Math.ceil(totalFields * 0.9)} fields required (90%)`);
  console.log('');

  // Overall completeness
  const overallAvg = ((tier1Total + tier2Total + tier3Total) / (Object.keys(fields.tier1).length + Object.keys(fields.tier2).length + Object.keys(fields.tier3).length)).toFixed(1);
  console.log('='.repeat(70));
  console.log('OVERALL DATA COMPLETENESS:');
  console.log('-'.repeat(70));
  console.log(`  Tier 1 (Essential):       ${tier1Avg}%`);
  console.log(`  Tier 2 (Identity):        ${tier2Avg}%`);
  console.log(`  Tier 3 (Content):         ${tier3Avg}%`);
  console.log(`  Combined Average:         ${overallAvg}%`);
  console.log('='.repeat(70));
  console.log('');

  // Gap analysis
  console.log('🎯 PRIORITY GAPS TO CLOSE:');
  console.log('-'.repeat(70));
  
  const allFields = {...fields.tier1, ...fields.tier2, ...fields.tier3};
  const gaps: Array<{field: string, pct: number, missing: number}> = [];
  
  Object.entries(allFields).forEach(([label, field]) => {
    const stats = analyze(field);
    const pct = parseFloat(stats.pct);
    if (pct < 90) {
      gaps.push({
        field: label,
        pct,
        missing: allRecords.length - stats.filled
      });
    }
  });
  
  gaps.sort((a, b) => b.missing - a.missing);
  
  console.log('\nTop 10 Missing Fields (by count):');
  gaps.slice(0, 10).forEach((gap, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${gap.field.padEnd(20)} ${gap.missing.toString().padStart(4)} missing (${gap.pct}% filled)`);
  });
  console.log('');

  // Recommendations
  console.log('='.repeat(70));
  console.log('💡 RECOMMENDATIONS:');
  console.log('-'.repeat(70));
  console.log('');
  console.log('High Impact, Low Effort:');
  console.log('  • Instagram handles — manually scrapable, high UX value');
  console.log('  • Price tier — can be inferred from menu/website, critical for filtering');
  console.log('  • About copy — already scraped for many, needs extraction review');
  console.log('');
  console.log('Medium Impact, Medium Effort:');
  console.log('  • Vibe words — needs AI extraction from existing scraped content');
  console.log('  • Wine program intent — extractable from winelist_raw_text where present');
  console.log('  • Service model — extractable from menu structure (tasting menu patterns)');
  console.log('');
  console.log('High Impact, High Value (Already in Progress):');
  console.log('  • Signature dishes — Voice Engine uses this, continue extraction');
  console.log('  • Taglines — 297/328 complete for publish tier, excellent progress');
  console.log('  • Place personality — Core identity signal, critical for discovery');
  console.log('');
  console.log('='.repeat(70));
}

analyzeCompleteness()
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
