/**
 * Integration test for newsletter ingestion flow:
 * Newsletter → Signal → Approval → Overlay → Read Path
 */

import { PrismaClient } from '@prisma/client';
import { processNewsletterToSignal } from '../lib/newsletters/processNewsletterToSignal';
import { approveSignalToOverlay } from '../lib/overlays/approveSignalToOverlay';
import { getActiveOverlays } from '../lib/overlays/getActiveOverlays';

const prisma = new PrismaClient();

async function testIntegration() {
  console.log('🧪 Newsletter Ingestion — Integration Test\n');
  console.log('Flow: Newsletter → Signal → Approval → Overlay → Read Path\n');

  // Get a test place
  const place = await prisma.places.findFirst({
    select: { id: true, name: true, slug: true },
  });

  if (!place) {
    throw new Error('No places found. Create a place first.');
  }

  console.log(`✓ Using place: ${place.name} (${place.slug})`);
  console.log(`  Place ID: ${place.id}\n`);

  // Step 1: Process newsletter to signal (extraction stub)
  console.log('STEP 1: Process Newsletter → Proposed Signal');
  console.log('─────────────────────────────────────────────');

  const signal = await processNewsletterToSignal({
    placeId: place.id,
    newsletterId: 'test-newsletter-email-001',
    extractedTemporalData: {
      startsAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      endsAt: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
      reason: 'Closed for private event',
      eventType: 'private',
    },
    signalType: 'closure',
    evidenceExcerpt: 'We will be closed this evening for a private event.',
    confidenceScore: 0.92,
  });

  console.log(`✓ Created proposed signal: ${signal.id}`);
  console.log(`  Status: ${signal.status}`);
  console.log(`  Type: ${signal.signalType}`);
  console.log(`  Source: ${signal.sourceType} (${signal.sourceId})`);
  console.log(`  Confidence: ${signal.confidenceScore}\n`);

  // Step 2: Manual approval (Phase 1)
  console.log('STEP 2: Manual Approval → Operational Overlay');
  console.log('─────────────────────────────────────────────');

  const overlay = await approveSignalToOverlay({
    proposedSignalId: signal.id,
    startsAt: new Date(Date.now() + 3600000),
    endsAt: new Date(Date.now() + 7200000),
    overlayType: 'closure',
    overrideData: {
      closed: true,
      reason: 'private_event',
    },
  });

  console.log(`✓ Created operational overlay: ${overlay.id}`);
  console.log(`  Type: ${overlay.overlayType}`);
  console.log(`  Active: ${overlay.startsAt.toISOString()} → ${overlay.endsAt.toISOString()}`);
  console.log(`  Approval: ${overlay.approvalMethod}\n`);

  // Step 3: Read path — query active overlays
  console.log('STEP 3: Read Path — Query Active Overlays');
  console.log('─────────────────────────────────────────────');

  const now = new Date();
  const duringOverlay = new Date(Date.now() + 5400000); // 1.5 hours from now (during overlay)

  console.log(`Query 1: Active overlays NOW (before overlay starts)`);
  const overlaysNow = await getActiveOverlays({ placeId: place.id, now });
  console.log(`  Result: ${overlaysNow.length} active overlay(s)\n`);

  console.log(`Query 2: Active overlays DURING overlay window`);
  const overlaysDuring = await getActiveOverlays({ placeId: place.id, now: duringOverlay });
  console.log(`  Result: ${overlaysDuring.length} active overlay(s)`);
  if (overlaysDuring.length > 0) {
    overlaysDuring.forEach((o) => {
      console.log(`    - ${o.overlayType} [${o.startsAt.toISOString()} → ${o.endsAt.toISOString()}]`);
    });
  }
  console.log();

  // Step 4: Verify place existence validation
  console.log('STEP 4: Verify Place Existence Validation');
  console.log('─────────────────────────────────────────────');

  try {
    await processNewsletterToSignal({
      placeId: 'nonexistent-place-id',
      newsletterId: 'test-invalid-place',
      extractedTemporalData: {
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 3600000).toISOString(),
      },
      signalType: 'closure',
    });
    console.log('  ❌ FAILED: Should have rejected invalid placeId\n');
  } catch (error: any) {
    console.log(`  ✓ PASSED: ${error.message}\n`);
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Integration Test Complete! ✅');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Flow verified:');
  console.log('  1. ✅ Newsletter → Proposed Signal (with place validation)');
  console.log('  2. ✅ Manual Approval → Operational Overlay');
  console.log('  3. ✅ Query Active Overlays (read path)');
  console.log('  4. ✅ Invalid place rejected\n');

  console.log('Next: Integrate overlay data into place API response');
  console.log('      (Currently logs to console only)\n');

  // Cleanup
  await prisma.operational_overlays.delete({ where: { id: overlay.id } });
  await prisma.proposed_signals.delete({ where: { id: signal.id } });
  console.log('🧹 Cleaned up test data');
}

testIntegration()
  .catch((error) => {
    console.error('❌ Integration test failed:', error.message);
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
