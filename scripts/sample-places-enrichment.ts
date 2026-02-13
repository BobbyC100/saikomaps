#!/usr/bin/env node
/**
 * Sample places needing enrichment
 * Only shows curated places (those with provenance).
 * Run: npm run enrich:samples [all|photos|hours|contact] [limit]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

async function showSamples() {
  const args = process.argv.slice(2);
  const mode = args[0] ?? 'all';
  const limit = parseInt(args[1] ?? '20', 10);

  console.log('\n=== SAMPLE PLACES NEEDING ENRICHMENT ===\n');
  console.log('(Curated places only)\n');
  console.log(`Mode: ${mode}`);
  console.log(`Showing: ${limit} places\n`);

  try {
    const curatedIds = new Set(
      (await prisma.provenance.findMany({ select: { place_id: true } })).map((p) => p.place_id)
    );

    const allWithGoogleId = await prisma.places.findMany({
      where: {
        googlePlaceId: { not: null },
        id: { in: Array.from(curatedIds) },
      },
      take: 500,
      select: {
        id: true,
        name: true,
        neighborhood: true,
        category: true,
        googlePlaceId: true,
        googlePhotos: true,
        hours: true,
        phone: true,
        website: true,
      },
    });

    const filtered = allWithGoogleId.filter((p) => {
      if (mode === 'photos') return !hasPhotos(p.googlePhotos);
      if (mode === 'hours') return !hasHours(p.hours);
      if (mode === 'contact') {
        const noPhone = !p.phone || String(p.phone).trim() === '';
        const noWebsite = !p.website || String(p.website).trim() === '';
        return noPhone || noWebsite;
      }
      if (mode === 'all') {
        return (
          !hasPhotos(p.googlePhotos) ||
          !hasHours(p.hours) ||
          !p.phone ||
          String(p.phone).trim() === '' ||
          !p.website ||
          String(p.website).trim() === ''
        );
      }
      return false;
    });

    const places = filtered.slice(0, limit);

    console.log(`Found ${filtered.length} curated places (showing first ${limit}):\n`);
    console.log('───────────────────────────────────────────────────');

    places.forEach((place, index) => {
      console.log(`\n${index + 1}. ${place.name}`);
      console.log(`   ${place.neighborhood ?? '—'} • ${place.category ?? '—'}`);
      console.log(`   Google Place ID: ${place.googlePlaceId ? '✓' : '✗'}`);
      console.log(`   Photos: ${hasPhotos(place.googlePhotos) ? '✓' : '✗ MISSING'}`);
      console.log(`   Hours: ${hasHours(place.hours) ? '✓' : '✗ MISSING'}`);
      console.log(`   Phone: ${place.phone ? '✓' : '✗ MISSING'}`);
      console.log(`   Website: ${place.website ? '✓' : '✗ MISSING'}`);
    });

    console.log('\n───────────────────────────────────────────────────\n');
  } catch (error) {
    console.error('Error fetching samples:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

showSamples();
