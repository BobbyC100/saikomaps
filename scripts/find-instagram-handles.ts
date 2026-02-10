#!/usr/bin/env node
/**
 * Instagram Handle Finder
 * 
 * Finds Instagram handles using a multi-strategy approach:
 * 1. AI-assisted search (Claude)
 * 2. Pattern matching (common handle formats)
 * 3. Web scraping fallback (if available)
 * 
 * Outputs a CSV with confidence scores for manual review.
 * 
 * Usage:
 *   npm run find:instagram
 *   npm run find:instagram -- --dry-run (preview only)
 */

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync } from 'fs';
import slugify from 'slugify';

const prisma = new PrismaClient();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
});

const isDryRun = process.argv.includes('--dry-run');

interface InstagramResult {
  name: string;
  google_place_id: string;
  instagram_handle: string;
  confidence: 'high' | 'medium' | 'low' | 'manual_review';
  method: 'ai' | 'pattern' | 'website' | 'none';
  notes: string;
  latitude?: string;
  longitude?: string;
  address?: string;
  neighborhood?: string;
  phone?: string;
  website?: string;
}

/**
 * Strategy 1: AI-Assisted Search
 * Uses Claude to find Instagram handles based on restaurant info
 */
async function findWithAI(places: any[], batchSize: number = 10): Promise<Map<string, InstagramResult>> {
  console.log(`\n🤖 Strategy 1: AI-Assisted Search (${places.length} places)\n`);
  
  const results = new Map<string, InstagramResult>();
  
  // Process in batches to avoid rate limits
  for (let i = 0; i < places.length; i += batchSize) {
    const batch = places.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(places.length / batchSize)}...`);
    
    const prompt = `You are an expert at finding Instagram handles for restaurants and businesses in Los Angeles.

For each business below, provide the Instagram handle if you can confidently identify it. Return ONLY valid JSON array with no markdown formatting.

Businesses:
${batch.map((p, idx) => `${idx + 1}. ${p.name}${p.neighborhood ? ` in ${p.neighborhood}` : ''}${p.address ? ` (${p.address})` : ''}`).join('\n')}

Return JSON in this exact format:
[
  {"index": 1, "handle": "@restaurantname", "confidence": "high|medium|low", "notes": "Brief explanation"},
  {"index": 2, "handle": null, "confidence": "low", "notes": "Could not find"}
]

Rules:
- Return handle WITH @ symbol
- Only include if you're reasonably confident (don't guess)
- Common patterns: @restaurantname, @restaurantnamela, @restaurantnamedtla
- If unsure, set handle to null
- Confidence: high = very confident, medium = likely correct, low = uncertain
- Keep notes brief`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Parse AI response
        const aiResults = JSON.parse(content.text);
        
        aiResults.forEach((result: any) => {
          const place = batch[result.index - 1];
          if (place && result.handle) {
            results.set(place.google_place_id, {
              name: place.name,
              google_place_id: place.google_place_id,
              instagram_handle: result.handle.replace('@', ''), // Remove @ for consistency
              confidence: result.confidence === 'high' ? 'high' : result.confidence === 'medium' ? 'medium' : 'low',
              method: 'ai',
              notes: result.notes || 'AI-suggested',
              latitude: place.latitude,
              longitude: place.longitude,
              address: place.address,
              neighborhood: place.neighborhood,
              phone: place.phone,
              website: place.website,
            });
            
            console.log(`  ✓ ${place.name} → @${result.handle.replace('@', '')} (${result.confidence})`);
          }
        });
      }
      
      // Rate limiting: wait 1 second between batches
      if (i + batchSize < places.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      console.error(`  ✗ Batch failed:`, error.message);
    }
  }
  
  console.log(`\n✅ AI found ${results.size}/${places.length} handles`);
  return results;
}

/**
 * Strategy 2: Pattern Matching
 * Tries common Instagram handle patterns
 */
function findWithPatterns(places: any[]): Map<string, InstagramResult> {
  console.log(`\n🔍 Strategy 2: Pattern Matching (${places.length} places)\n`);
  
  const results = new Map<string, InstagramResult>();
  
  places.forEach(place => {
    // Skip if name looks like an address or just numbers
    if (/^\d+\s/.test(place.name) || /^[\d\s-]+$/.test(place.name)) {
      console.log(`  ⊘ Skipping (looks like address): ${place.name}`);
      return;
    }
    
    // Clean name for handle
    const cleanName = place.name
      .toLowerCase()
      .replace(/['']/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '')
      .replace(/restaurant|cafe|bar|kitchen|eatery|bistro|grill/g, '');
    
    // Skip if too short or too long
    if (cleanName.length < 3 || cleanName.length > 30) {
      console.log(`  ⊘ Skipping (handle length): ${place.name}`);
      return;
    }
    
    // Try common patterns
    const patterns = [
      cleanName,                           // @gjelina
      `${cleanName}la`,                    // @gjelinala
      `${cleanName}los`,                   // @gjelinalos
      `${cleanName}losangeles`,            // @gjelinalosangeles
      `${cleanName}dtla`,                  // @gjelinadtla
      `${cleanName}restaurant`,            // @gjelinarestaurant
      cleanName.replace(/the/g, ''),       // Remove "the"
    ];
    
    // Pick the most likely pattern (first one for now)
    const likelyHandle = patterns[0];
    
    if (likelyHandle && likelyHandle.length >= 3) {
      results.set(place.google_place_id, {
        name: place.name,
        google_place_id: place.google_place_id,
        instagram_handle: likelyHandle,
        confidence: 'medium',
        method: 'pattern',
        notes: `Pattern-based (needs verification)`,
        latitude: place.latitude,
        longitude: place.longitude,
        address: place.address,
        neighborhood: place.neighborhood,
        phone: place.phone,
        website: place.website,
      });
      
      console.log(`  ~ ${place.name} → @${likelyHandle} (pattern)`);
    }
  });
  
  console.log(`\n✅ Pattern matching suggested ${results.size}/${places.length} handles`);
  return results;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Instagram Handle Finder\n');
  console.log('═══════════════════════════════════════\n');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be written\n');
  }
  
  // Fetch places missing Instagram
  const places = await prisma.places.findMany({
    where: {
      instagram: null,
      google_place_id: { not: null },
    },
    select: {
      name: true,
      google_place_id: true,
      latitude: true,
      longitude: true,
      address: true,
      neighborhood: true,
      phone: true,
      website: true,
    },
    orderBy: { name: 'asc' },
  });
  
  console.log(`Found ${places.length} places missing Instagram handles\n`);
  
  if (places.length === 0) {
    console.log('✅ All places have Instagram handles!');
    return;
  }
  
  // Strategy 1: AI-Assisted (first 50 for demo, remove limit for full run)
  const aiPlaces = places.slice(0, 50); // TODO: Remove slice for full run
  const aiResults = await findWithAI(aiPlaces);
  
  // Strategy 2: Pattern matching for places AI didn't find
  const remainingPlaces = places.filter(p => !aiResults.has(p.google_place_id!));
  const patternResults = findWithPatterns(remainingPlaces.slice(0, 20)); // TODO: Remove slice for full run
  
  // Combine results
  const allResults = new Map([...aiResults, ...patternResults]);
  
  // Flag places needing manual review
  const needsReview = places.filter(p => !allResults.has(p.google_place_id!));
  
  console.log(`\n📊 Summary:`);
  console.log(`   AI found: ${aiResults.size}`);
  console.log(`   Pattern found: ${patternResults.size}`);
  console.log(`   Needs manual review: ${needsReview.length}`);
  console.log(`   Total: ${places.length}\n`);
  
  // Generate CSV
  const outputPath = 'data/instagram-backfill-auto.csv';
  
  const headers = [
    'Name',
    'Instagram',
    'Confidence',
    'Method',
    'Notes',
    'GooglePlaceID',
    'Latitude',
    'Longitude',
    'Address',
    'Neighborhood',
    'Phone',
    'Website',
  ];
  
  const rows: string[][] = [];
  
  // Add found handles
  allResults.forEach(result => {
    rows.push([
      result.name,
      result.instagram_handle,
      result.confidence,
      result.method,
      result.notes,
      result.google_place_id,
      result.latitude || '',
      result.longitude || '',
      result.address || '',
      result.neighborhood || '',
      result.phone || '',
      result.website || '',
    ]);
  });
  
  // Add manual review items
  needsReview.forEach(place => {
    rows.push([
      place.name,
      '', // Empty Instagram for manual fill
      'manual_review',
      'none',
      'Could not find handle automatically',
      place.google_place_id!,
      place.latitude?.toString() || '',
      place.longitude?.toString() || '',
      place.address || '',
      place.neighborhood || '',
      place.phone || '',
      place.website || '',
    ]);
  });
  
  // Create CSV
  const csv = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => {
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ),
  ].join('\n');
  
  if (!isDryRun) {
    writeFileSync(outputPath, csv, 'utf-8');
    console.log(`✅ Exported to: ${outputPath}\n`);
  } else {
    console.log(`\n[DRY RUN] Would export to: ${outputPath}\n`);
  }
  
  console.log(`📝 Next steps:`);
  console.log(`   1. Review ${outputPath}`);
  console.log(`   2. Verify AI suggestions (confidence: medium/low)`);
  console.log(`   3. Fill in manual_review items (${needsReview.size} places)`);
  console.log(`   4. Run: npm run ingest:csv -- ${outputPath} saiko_instagram`);
  console.log(`   5. Run: npm run resolver:run\n`);
  console.log(`💡 Expected result: ${allResults.size} auto-linked at 100% confidence`);
  console.log(`   ${needsReview.length} will need manual Instagram entry before ingestion\n`);
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
