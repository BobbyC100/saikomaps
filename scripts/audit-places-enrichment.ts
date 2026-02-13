#!/usr/bin/env node
/**
 * Place Data Audit for Enrichment
 * Counts places by photo, hours, phone, website coverage.
 *
 * Run: npm run enrich:audit                              # all places
 * Run: npm run enrich:audit -- --curated                 # only curated (places with provenance)
 * Run: npm run enrich:audit -- --scope active            # only active places
 * Run: npm run enrich:audit -- --region la_county        # only LA County places
 * Run: npm run enrich:audit -- --scope active --region la_county  # combined filters
 *
 * Curated = places with provenance (chain of custody proving Bobby added them).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CURATED_ONLY = process.argv.includes('--curated');
const SCOPE = process.argv.includes('--scope')
  ? process.argv[process.argv.indexOf('--scope') + 1]
  : null;
const REGION = process.argv.includes('--region')
  ? process.argv[process.argv.indexOf('--region') + 1]
  : null;

function hasPhotos(googlePhotos: unknown): boolean {
  if (!googlePhotos) return false;
  if (typeof googlePhotos === 'string') {
    const t = googlePhotos.trim();
    return t !== '' && t !== '[]' && t !== 'null';
  }
  if (Array.isArray(googlePhotos)) return googlePhotos.length > 0;
  if (typeof googlePhotos === 'object' && googlePhotos !== null) {
    const arr = (googlePhotos as { length?: number }).length;
    return typeof arr === 'number' && arr > 0;
  }
  return false;
}

function hasHours(hours: unknown): boolean {
  if (!hours) return false;
  if (typeof hours === 'string') {
    const t = hours.trim();
    return t !== '' && t !== '{}' && t !== 'null';
  }
  if (typeof hours === 'object' && hours !== null) {
    return Object.keys(hours as object).length > 0;
  }
  return false;
}

async function auditPlaceData() {
  console.log('\n=== SAIKO MAPS - PLACE DATA AUDIT ===\n');
  
  const filters: string[] = [];
  if (CURATED_ONLY) filters.push('Curated (with provenance)');
  if (SCOPE) filters.push(`Scope: ${SCOPE}`);
  if (REGION) filters.push(`Region: ${REGION}`);
  
  if (filters.length > 0) {
    console.log(`Filters: ${filters.join(', ')}\n`);
  }

  try {
    // Build where clause
    const where: any = {};
    if (SCOPE) where.scope = SCOPE as any;
    if (REGION) where.region = REGION;

    let allPlaces = await prisma.places.findMany({
      where,
      select: {
        id: true,
        googlePhotos: true,
        hours: true,
        phone: true,
        website: true,
        googlePlaceId: true,
      },
    });

    if (CURATED_ONLY) {
      const curatedIds = new Set(
        (await prisma.provenance.findMany({ select: { place_id: true } })).map((p) => p.place_id)
      );
      const before = allPlaces.length;
      allPlaces = allPlaces.filter((p) => curatedIds.has(p.id));
      console.log(`Filtered to curated: ${allPlaces.length} of ${before} total places\n`);
    }

    const totalPlaces = allPlaces.length;

    const photoCount = allPlaces.filter((p) => hasPhotos(p.googlePhotos)).length;
    const hoursCount = allPlaces.filter((p) => hasHours(p.hours)).length;
    const phoneCount = allPlaces.filter(
      (p) => p.phone != null && String(p.phone).trim() !== ''
    ).length;
    const websiteCount = allPlaces.filter(
      (p) => p.website != null && String(p.website).trim() !== ''
    ).length;
    const phoneAndWebsite = allPlaces.filter(
      (p) =>
        p.phone != null &&
        String(p.phone).trim() !== '' &&
        p.website != null &&
        String(p.website).trim() !== ''
    ).length;
    const googlePlaceIdCount = allPlaces.filter(
      (p) => p.googlePlaceId != null && String(p.googlePlaceId).trim() !== ''
    ).length;

    const photoPercent = totalPlaces ? Math.round((photoCount / totalPlaces) * 100) : 0;
    const hoursPercent = totalPlaces ? Math.round((hoursCount / totalPlaces) * 100) : 0;
    const phonePercent = totalPlaces ? Math.round((phoneCount / totalPlaces) * 100) : 0;
    const websitePercent = totalPlaces ? Math.round((websiteCount / totalPlaces) * 100) : 0;
    const contactPercent = totalPlaces ? Math.round((phoneAndWebsite / totalPlaces) * 100) : 0;
    const googleIdPercent = totalPlaces ? Math.round((googlePlaceIdCount / totalPlaces) * 100) : 0;

    console.log(`Total Places: ${totalPlaces.toLocaleString()}\n`);
    console.log('Field Coverage:');
    console.log('───────────────────────────────────────────────────');
    console.log(`Photos (googlePhotos):    ${String(photoCount).padStart(5)} / ${photoPercent}%`);
    console.log(`Hours:                    ${String(hoursCount).padStart(5)} / ${hoursPercent}%`);
    console.log(`Phone:                    ${String(phoneCount).padStart(5)} / ${phonePercent}%`);
    console.log(`Website:                  ${String(websiteCount).padStart(5)} / ${websitePercent}%`);
    console.log(`Phone AND Website:        ${String(phoneAndWebsite).padStart(5)} / ${contactPercent}%`);
    console.log(`Google Place ID:          ${String(googlePlaceIdCount).padStart(5)} / ${googleIdPercent}%`);
    console.log('───────────────────────────────────────────────────\n');

    const photoGap = totalPlaces - photoCount;
    const hoursGap = totalPlaces - hoursCount;
    const phoneGap = totalPlaces - phoneCount;
    const websiteGap = totalPlaces - websiteCount;

    console.log('Remaining Gaps:');
    console.log('───────────────────────────────────────────────────');
    console.log(`Missing Photos:           ${photoGap.toLocaleString()}`);
    console.log(`Missing Hours:            ${hoursGap.toLocaleString()}`);
    console.log(`Missing Phone:            ${phoneGap.toLocaleString()}`);
    console.log(`Missing Website:         ${websiteGap.toLocaleString()}`);
    console.log('───────────────────────────────────────────────────\n');

    console.log('Recommendations:');
    if (photoGap > 0) {
      console.log(`  • Run "npm run enrich:photos" to fill ${photoGap} missing photos`);
    }
    if (hoursGap > 0) {
      console.log(`  • Run "npm run enrich:hours" to fill ${hoursGap} missing hours`);
    }
    if (phoneGap > 0 || websiteGap > 0) {
      console.log(`  • Run "npm run enrich:contact" to fill contact gaps`);
    }
    if (photoGap === 0 && hoursGap === 0 && phoneGap === 0 && websiteGap === 0) {
      console.log('  ✅ All place data is complete!');
    }
    console.log('\n');
  } catch (error) {
    console.error('Error running audit:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

auditPlaceData();
