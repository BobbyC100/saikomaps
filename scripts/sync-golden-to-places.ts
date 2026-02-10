#!/usr/bin/env node
/**
 * Sync Golden Records to Places Table
 * 
 * Copies all golden_records to the places table so the public site
 * can display all 1,456 places (not just the original 673).
 * 
 * This is a bridge solution until merchant pages migrate to golden_records.
 * 
 * Usage: npm run sync:places
 */

import { PrismaClient, Prisma } from '@prisma/client';
import slugify from 'slugify';

const prisma = new PrismaClient();

async function syncGoldenToPlaces() {
  console.log('🔄 Syncing golden_records → places\n');
  
  // Get all golden records
  const goldenRecords = await prisma.golden_records.findMany({
    where: {
      lifecycle_status: 'ACTIVE'
    }
  });
  
  console.log(`Found ${goldenRecords.length} active golden records\n`);
  
  // Check existing places
  const existingPlaces = await prisma.places.findMany({
    select: { id: true, slug: true }
  });
  
  const existingSlugs = new Set(existingPlaces.map(p => p.slug));
  console.log(`Existing places: ${existingPlaces.length}\n`);
  
  let created = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const golden of goldenRecords) {
    try {
      // Check if place already exists by slug
      const existingPlace = existingPlaces.find(p => p.slug === golden.slug);
      
      if (existingPlace) {
        // Update existing place
        await prisma.places.update({
          where: { id: existingPlace.id },
          data: {
            name: golden.name,
            address: golden.address_street,
            latitude: golden.lat,
            longitude: golden.lng,
            neighborhood: golden.neighborhood,
            category: golden.category,
            phone: golden.phone,
            website: golden.website,
            instagram: golden.instagram_handle,
            hours: golden.hours_json as Prisma.JsonValue,
            description: golden.description,
            google_place_id: golden.google_place_id,
            vibe_tags: golden.vibe_tags,
            updated_at: new Date(),
          }
        });
        updated++;
      } else {
        // Create new place
        await prisma.places.create({
          data: {
            id: golden.canonical_id, // Use same ID for easy linking
            slug: golden.slug,
            name: golden.name,
            address: golden.address_street,
            latitude: golden.lat,
            longitude: golden.lng,
            neighborhood: golden.neighborhood,
            category: golden.category,
            phone: golden.phone,
            website: golden.website,
            instagram: golden.instagram_handle,
            hours: golden.hours_json as Prisma.JsonValue,
            description: golden.description,
            google_place_id: golden.google_place_id,
            vibe_tags: golden.vibe_tags,
            created_at: golden.created_at,
            updated_at: new Date(),
          }
        });
        created++;
      }
      
      if ((created + updated) % 100 === 0) {
        console.log(`Progress: ${created + updated}/${goldenRecords.length}...`);
      }
    } catch (error: any) {
      console.error(`✗ Failed to sync ${golden.name}:`, error.message);
      skipped++;
    }
  }
  
  console.log(`\n✅ Sync complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total in places: ${created + existingPlaces.length}`);
}

async function main() {
  try {
    await syncGoldenToPlaces();
  } catch (error) {
    console.error('Error during sync:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
