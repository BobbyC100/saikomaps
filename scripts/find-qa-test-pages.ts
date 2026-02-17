#!/usr/bin/env tsx
/**
 * Find Test Pages for Gallery Gap Fill QA
 * 
 * Queries database to identify real pages matching QA test scenarios.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findTestPages() {
  console.log('\n🔍 Finding Test Pages for Gallery Gap Fill QA\n');
  console.log('=' .repeat(70));
  
  try {
    // Scenario A: Gallery + No Tier 4 (should show QuietCard)
    console.log('\n📸 Scenario A: Gallery + AlsoOn only (QuietCard expected)');
    console.log('-'.repeat(70));
    
    const galleryOnly = await prisma.place.findMany({
      where: {
        photoUrls: { not: null },
        phone: null,
        instagram: null,
        website: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        photoUrls: true,
        neighborhood: true,
      },
      take: 3,
    });
    
    for (const place of galleryOnly) {
      const photoCount = Array.isArray(place.photoUrls) ? place.photoUrls.length : 0;
      if (photoCount > 1) { // More than hero photo
        console.log(`✓ ${place.name}`);
        console.log(`  URL: https://saikomaps.com/place/${place.slug}`);
        console.log(`  Gallery: ${photoCount} photos`);
        console.log(`  Expected: QuietCard after Gallery (span-2)\n`);
      }
    }
    
    // Scenario B: Gallery + Phone (should reorder Phone)
    console.log('\n📞 Scenario B: Gallery + Phone (Phone reorder expected)');
    console.log('-'.repeat(70));
    
    const galleryWithPhone = await prisma.place.findMany({
      where: {
        photoUrls: { not: null },
        phone: { not: null },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        photoUrls: true,
        phone: true,
        neighborhood: true,
      },
      take: 2,
    });
    
    for (const place of galleryWithPhone) {
      const photoCount = Array.isArray(place.photoUrls) ? place.photoUrls.length : 0;
      if (photoCount > 1) {
        console.log(`✓ ${place.name}`);
        console.log(`  URL: https://saikomaps.com/place/${place.slug}`);
        console.log(`  Gallery: ${photoCount} photos`);
        console.log(`  Phone: ${place.phone}`);
        console.log(`  Expected: Phone card after Gallery (span-2)\n`);
      }
    }
    
    // Scenario C: Gallery + Instagram (should reorder Links)
    console.log('\n📱 Scenario C: Gallery + Instagram (Links reorder expected)');
    console.log('-'.repeat(70));
    
    const galleryWithInstagram = await prisma.place.findMany({
      where: {
        photoUrls: { not: null },
        instagram: { not: null },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        photoUrls: true,
        instagram: true,
        neighborhood: true,
      },
      take: 2,
    });
    
    for (const place of galleryWithInstagram) {
      const photoCount = Array.isArray(place.photoUrls) ? place.photoUrls.length : 0;
      if (photoCount > 1) {
        console.log(`✓ ${place.name}`);
        console.log(`  URL: https://saikomaps.com/place/${place.slug}`);
        console.log(`  Gallery: ${photoCount} photos`);
        console.log(`  Instagram: @${place.instagram}`);
        console.log(`  Expected: Links card after Gallery (span-2)\n`);
      }
    }
    
    // Scenario D: Gallery + Rich content (natural fill, no intervention)
    console.log('\n🍽️ Scenario D: Gallery + Rich content (Natural fill expected)');
    console.log('-'.repeat(70));
    
    const galleryRich = await prisma.place.findMany({
      where: {
        photoUrls: { not: null },
        vibeTags: { not: null },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        photoUrls: true,
        vibeTags: true,
        neighborhood: true,
      },
      take: 2,
    });
    
    for (const place of galleryRich) {
      const photoCount = Array.isArray(place.photoUrls) ? place.photoUrls.length : 0;
      const vibeCount = Array.isArray(place.vibeTags) ? place.vibeTags.length : 0;
      if (photoCount > 1 && vibeCount > 0) {
        console.log(`✓ ${place.name}`);
        console.log(`  URL: https://saikomaps.com/place/${place.slug}`);
        console.log(`  Gallery: ${photoCount} photos`);
        console.log(`  Vibe tags: ${vibeCount}`);
        console.log(`  Expected: Natural grid flow (no gap fill)\n`);
      }
    }
    
    // Scenario E: No Gallery (no intervention)
    console.log('\n📝 Scenario E: No Gallery (No intervention expected)');
    console.log('-'.repeat(70));
    
    const noGallery = await prisma.place.findMany({
      where: {
        OR: [
          { photoUrls: null },
          { photoUrls: { equals: [] } },
        ],
        curatorNote: { not: null },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        curatorNote: true,
        neighborhood: true,
      },
      take: 2,
    });
    
    for (const place of noGallery) {
      console.log(`✓ ${place.name}`);
      console.log(`  URL: https://saikomaps.com/place/${place.slug}`);
      console.log(`  Gallery: None`);
      console.log(`  Expected: Natural tier order (no gap fill logic)\n`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Test pages identified above');
    console.log('\n📋 Copy URLs and test in browser:');
    console.log('   1. Desktop: Chrome, Safari, Firefox');
    console.log('   2. Mobile: 375px, 667px, 768px breakpoints');
    console.log('   3. Verify QuietCard is subtle (no attention theft)');
    console.log('   4. Check console for validation output\n');
    console.log('📝 Document results in: STAGING_QA_GALLERY_GAP_FILL.md\n');
    
  } catch (error) {
    console.error('Error finding test pages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findTestPages();
