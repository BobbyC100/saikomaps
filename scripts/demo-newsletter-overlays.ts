/**
 * Demo script for Newsletter Ingestion — Approval Framework v1
 * 
 * This script demonstrates the Phase 1 manual approval workflow:
 * 1. Create a proposed signal from a newsletter extraction
 * 2. Approve it to create an operational overlay
 * 3. Query active overlays
 * 
 * Usage:
 *   PLACE_ID=<your-place-id> npx tsx scripts/demo-newsletter-overlays.ts
 * 
 * Or set PLACE_ID in .env.local and run:
 *   npx tsx scripts/demo-newsletter-overlays.ts
 */

import { PrismaClient } from '@prisma/client';
import { createProposedSignal } from '../lib/signals/createProposedSignal';
import { approveSignalToOverlay } from '../lib/overlays/approveSignalToOverlay';
import { getActiveOverlays } from '../lib/overlays/getActiveOverlays';

const prisma = new PrismaClient();

async function main() {
  // Get PLACE_ID from env or use first available place
  let placeId = process.env.PLACE_ID;

  if (!placeId) {
    console.log('⚠️  No PLACE_ID provided, fetching first available place...');
    const firstPlace = await prisma.places.findFirst({
      select: { id: true, name: true, slug: true },
    });

    if (!firstPlace) {
      throw new Error('No places found in database. Please create a place first.');
    }

    placeId = firstPlace.id;
    console.log(`✓ Using place: ${firstPlace.name} (${firstPlace.slug})`);
    console.log(`  Place ID: ${placeId}\n`);
  }

  // Verify the place exists
  const place = await prisma.places.findUnique({
    where: { id: placeId },
    select: { id: true, name: true, slug: true },
  });

  if (!place) {
    throw new Error(`Place with ID ${placeId} not found`);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('Newsletter Ingestion Demo — Phase 1: Manual Approval');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`📍 Target Place: ${place.name} (${place.slug})`);
  console.log(`   Place ID: ${place.id}\n`);

  // Step 1: Create a proposed signal
  console.log('STEP 1: Create Proposed Signal');
  console.log('───────────────────────────────────────────────────────────');

  const now = new Date();
  const startsAt = new Date(now.getTime() + 1000 * 60 * 5); // 5 minutes from now
  const endsAt = new Date(now.getTime() + 1000 * 60 * 60 * 2); // 2 hours from now

  const proposedSignal = await createProposedSignal({
    placeId: place.id,
    sourceId: 'demo-newsletter-email-001',
    signalType: 'hours_override',
    extractedData: {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      reason: 'Private event',
      originalText: 'We will be closed for a private event from 6pm-8pm tonight.',
    },
    evidenceExcerpt: 'We will be closed for a private event from 6pm-8pm tonight.',
    confidenceScore: 0.95,
  });

  console.log('✓ Created proposed signal:');
  console.log(`  ID: ${proposedSignal.id}`);
  console.log(`  Status: ${proposedSignal.status}`);
  console.log(`  Signal Type: ${proposedSignal.signalType}`);
  console.log(`  Source: ${proposedSignal.sourceType} (${proposedSignal.sourceId})`);
  console.log(`  Confidence: ${proposedSignal.confidenceScore}\n`);

  // Step 2: Approve the signal to create an overlay
  console.log('STEP 2: Approve Signal → Create Overlay');
  console.log('───────────────────────────────────────────────────────────');

  const overlay = await approveSignalToOverlay({
    proposedSignalId: proposedSignal.id,
    startsAt,
    endsAt,
    overlayType: 'hours_override',
    overrideData: {
      closedForEvent: true,
      eventType: 'private',
    },
  });

  console.log('✓ Created operational overlay:');
  console.log(`  ID: ${overlay.id}`);
  console.log(`  Type: ${overlay.overlayType}`);
  console.log(`  Approval Method: ${overlay.approvalMethod}`);
  console.log(`  Active Period: ${overlay.startsAt.toISOString()} → ${overlay.endsAt.toISOString()}`);
  console.log(`  Duration: ${Math.round((overlay.endsAt.getTime() - overlay.startsAt.getTime()) / 1000 / 60)} minutes\n`);

  // Step 3: Query active overlays
  console.log('STEP 3: Query Active Overlays');
  console.log('───────────────────────────────────────────────────────────');

  // Query at different time points
  const testTimes = [
    { label: 'Now (before overlay starts)', time: now },
    { label: 'During overlay window', time: new Date(startsAt.getTime() + 1000 * 60 * 30) }, // 30 min into overlay
    { label: 'After overlay ends', time: new Date(endsAt.getTime() + 1000 * 60 * 10) }, // 10 min after
  ];

  for (const { label, time } of testTimes) {
    const activeOverlays = await getActiveOverlays({
      placeId: place.id,
      now: time,
    });

    console.log(`\n${label} (${time.toISOString()}):`);
    if (activeOverlays.length === 0) {
      console.log('  ✗ No active overlays');
    } else {
      console.log(`  ✓ ${activeOverlays.length} active overlay(s):`);
      activeOverlays.forEach((o) => {
        console.log(`    - ${o.overlayType} (${o.startsAt.toISOString()} → ${o.endsAt.toISOString()})`);
      });
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Demo Complete!');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📊 Summary:');
  console.log(`   • Created proposed signal: ${proposedSignal.id}`);
  console.log(`   • Created operational overlay: ${overlay.id}`);
  console.log(`   • Overlay active from ${startsAt.toISOString()}`);
  console.log(`   • Overlay expires at ${endsAt.toISOString()}\n`);

  console.log('🧹 Cleanup (optional):');
  console.log(`   npx prisma studio`);
  console.log(`   # Navigate to operational_overlays and proposed_signals to inspect/delete\n`);
}

main()
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
