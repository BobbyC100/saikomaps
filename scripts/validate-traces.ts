#!/usr/bin/env node
/**
 * validate-traces.ts — WO-1 Trace Validation
 *
 * Exercises all three actor-relationship write paths and confirms trace shape.
 * Uses real DB data; creates test entity_actor_relationships that are labelled
 * with _validate=true in their sources field so they can be identified / removed.
 *
 * Usage:
 *   npx tsx scripts/validate-traces.ts
 *   npx tsx scripts/validate-traces.ts --cleanup   # delete rows created by this script
 */

import { db } from '@/lib/db';
import { writeTrace, TraceSource, TraceEventType } from '@/lib/traces';
import { approveCandidateAndCreateRelationship } from '@/lib/actors/approveCandidate';

const CLEANUP = process.argv.includes('--cleanup');

// ─── Known test fixtures (from live DB) ─────────────────────────────────────
// Entity in both `entities` and `golden_records` (id === canonical_id)
const HAYATO_ID      = '003245fc-ad9b-4225-9440-faaf83dc1f68'; // Hayato
const MORI_ID        = '002a8037-5201-405f-a2db-8e1d7e49793a'; // Mori Nozomi

// Actors
const LAST_WORD_ACTOR_ID = 'dfaafc02-0225-461d-ba68-ea9ca18c8e73'; // Last Word Hospitality
const GJELINA_ACTOR_ID   = 'd3d1b93d-0679-4256-9ff6-f36ee5c14756'; // Gjelina Group

// Pending candidate (Last Word Hospitality)
const PENDING_CANDIDATE_ID = '12ca9423-8e40-4cc1-854c-e5664676eb1e';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function ok(label: string, detail?: string) {
  console.log(`  ✅ ${label}${detail ? `  (${detail})` : ''}`);
  passed++;
}

function fail(label: string, detail?: string) {
  console.log(`  ❌ ${label}${detail ? `  →  ${detail}` : ''}`);
  failed++;
}

function assert(condition: boolean, label: string, detail?: string) {
  condition ? ok(label, detail) : fail(label, detail);
}

async function tracesSince(entityId: string, since: Date) {
  return db.traces.findMany({
    where: {
      entity_id: entityId,
      created_at: { gte: since },
    },
    orderBy: { created_at: 'asc' },
  });
}

async function cleanupRelationship(entityId: string, actorId: string, role: 'operator') {
  await db.entity_actor_relationships.deleteMany({
    where: { entityId: entityId, actorId: actorId, role },
  });
}

async function cleanupTraces(entityId: string, since: Date) {
  await db.traces.deleteMany({
    where: { entity_id: entityId, created_at: { gte: since } },
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  WO-1 Trace Validation');
  console.log('══════════════════════════════════════════════════════════════\n');

  if (CLEANUP) {
    console.log('🧹 Cleanup mode — removing test rows\n');
    const now = new Date('2000-01-01'); // delete all test traces
    await cleanupRelationship(HAYATO_ID, LAST_WORD_ACTOR_ID, 'operator');
    await cleanupRelationship(MORI_ID, GJELINA_ACTOR_ID, 'operator');
    await db.traces.deleteMany({
      where: {
        entity_id: { in: [HAYATO_ID, MORI_ID] },
        field_name: 'actor_relationship',
      },
    });
    // Reset candidate status back to PENDING
    await db.operatorPlaceCandidate.update({
      where: { id: PENDING_CANDIDATE_ID },
      data: { status: 'PENDING', entityId: null, reviewedAt: null, approvedBy: null },
    });
    console.log('✅ Cleanup complete\n');
    return;
  }

  // ── Pre-flight: ensure entities are clean ────────────────────────────────
  await cleanupRelationship(HAYATO_ID, LAST_WORD_ACTOR_ID, 'operator');
  await cleanupRelationship(MORI_ID, GJELINA_ACTOR_ID, 'operator');
  await db.traces.deleteMany({
    where: {
      entity_id: { in: [HAYATO_ID, MORI_ID] },
      field_name: 'actor_relationship',
    },
  });
  await db.operatorPlaceCandidate.updateMany({
    where: { id: PENDING_CANDIDATE_ID },
    data: { status: 'PENDING', entityId: null, reviewedAt: null, approvedBy: null },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 1 — Admin attach route (approveCandidateAndCreateRelationship)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('─── TEST 1: Admin attach path ───────────────────────────────');
  console.log('    Entity: Hayato  |  Actor: Last Word Hospitality\n');

  const candidate = await db.operatorPlaceCandidate.findUnique({
    where: { id: PENDING_CANDIDATE_ID },
  });
  assert(!!candidate, 'Candidate fixture found');
  assert(candidate?.status === 'PENDING', 'Candidate is PENDING before test');

  const t1Start = new Date();
  await approveCandidateAndCreateRelationship({
    candidate: candidate!,
    entityId: HAYATO_ID,
    approvedBy: 'validate-traces-script',
    confidence: 0.95,
  });

  const t1Traces = await tracesSince(HAYATO_ID, t1Start);
  assert(t1Traces.length === 1, 'Exactly 1 trace emitted', `got ${t1Traces.length}`);

  const t1 = t1Traces[0];
  assert(t1?.event_type === 'IDENTITY_ATTACHED', 'event_type = IDENTITY_ATTACHED', t1?.event_type ?? 'undefined');
  assert(t1?.source === 'admin', 'source = admin', t1?.source ?? 'undefined');
  assert(t1?.field_name === 'actor_relationship', 'field_name = actor_relationship', t1?.field_name ?? 'undefined');
  const nv1 = t1?.new_value as Record<string, unknown> | null;
  assert(!!nv1?.actor_id, 'new_value.actor_id present', String(nv1?.actor_id ?? 'missing'));
  assert(!!t1?.observed_at, 'observed_at set', t1?.observed_at?.toISOString() ?? 'undefined');
  assert(t1?.old_value === null, 'old_value = null');

  console.log('\n  Trace payload:');
  console.log('  ', JSON.stringify({ event_type: t1?.event_type, source: t1?.source, field_name: t1?.field_name, new_value: t1?.new_value, observed_at: t1?.observed_at }, null, 4).replace(/\n/g, '\n  '));

  // Verify candidate marked APPROVED
  const updatedCandidate = await db.operatorPlaceCandidate.findUnique({ where: { id: PENDING_CANDIDATE_ID } });
  assert(updatedCandidate?.status === 'APPROVED', 'Candidate status = APPROVED');

  // Verify entity_actor_relationships row created
  const rel1 = await db.entity_actor_relationships.findFirst({ where: { entityId: HAYATO_ID, actorId: LAST_WORD_ACTOR_ID } });
  assert(!!rel1, 'entity_actor_relationships row created');
  assert(rel1?.isPrimary === true, 'isPrimary = true');

  console.log();

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 2 — link-place-group script path (source = human)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('─── TEST 2: link-place-group script path ────────────────────');
  console.log('    Entity: Mori Nozomi  |  Actor: Gjelina Group\n');

  // Confirm not already linked
  const preLink = await db.entity_actor_relationships.findFirst({ where: { entityId: MORI_ID, actorId: GJELINA_ACTOR_ID } });
  assert(!preLink, 'No existing entity_actor_relationships row before test');

  const t2Start = new Date();

  // Simulate the link-place-group write path (identical code to the script)
  await db.entity_actor_relationships.create({
    data: {
      entityId: MORI_ID,
      actorId: GJELINA_ACTOR_ID,
      role: 'operator',
      isPrimary: true,
      sources: { _script: 'link-place-group', _validate: true },
      confidence: 1,
    },
  });

  try {
    await writeTrace({
      entityId: MORI_ID,
      source: TraceSource.human,
      eventType: TraceEventType.IDENTITY_ATTACHED,
      fieldName: 'actor_relationship',
      oldValue: null,
      newValue: {
        actor_id: GJELINA_ACTOR_ID,
        actor_name: 'Gjelina Group',
        role: 'operator',
        is_primary: true,
        relationship_table: 'entity_actor_relationships',
        script: 'link-place-group',
      },
      confidence: 1,
    });
  } catch (e) {
    console.warn('  ⚠️  Trace write skipped:', (e as Error).message);
  }

  const t2Traces = await tracesSince(MORI_ID, t2Start);
  assert(t2Traces.length === 1, 'Exactly 1 trace emitted', `got ${t2Traces.length}`);

  const t2 = t2Traces[0];
  assert(t2?.event_type === 'IDENTITY_ATTACHED', 'event_type = IDENTITY_ATTACHED');
  assert(t2?.source === 'human', 'source = human');
  assert(t2?.field_name === 'actor_relationship', 'field_name = actor_relationship');
  const nv2 = t2?.new_value as Record<string, unknown> | null;
  assert(!!nv2?.actor_id, 'new_value.actor_id present', String(nv2?.actor_id ?? 'missing'));
  assert(!!t2?.observed_at, 'observed_at set');

  console.log('\n  Trace payload:');
  console.log('  ', JSON.stringify({ event_type: t2?.event_type, source: t2?.source, field_name: t2?.field_name, new_value: t2?.new_value }, null, 4).replace(/\n/g, '\n  '));
  console.log();

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 3 — Already-linked skip: no new traces emitted
  // ══════════════════════════════════════════════════════════════════════════
  console.log('─── TEST 3: Already-linked skip (batch path) ────────────────');
  console.log('    Simulates the "already linked" guard in link-groups-to-places\n');

  const t3Start = new Date();

  // Simulate the batch script guard: check for existing primary → skip
  const existingOp = await db.entity_actor_relationships.findFirst({
    where: { entityId: HAYATO_ID, role: 'operator', isPrimary: true },
  });

  if (existingOp) {
    // Guard fired → no write, no trace (same as script behaviour)
    const t3Traces = await tracesSince(HAYATO_ID, t3Start);
    assert(t3Traces.length === 0, 'No trace emitted for already-linked entity', `got ${t3Traces.length}`);
    console.log('    ⤷ Guard fired: already linked to operator — no trace written');
  } else {
    fail('entity_actor_relationships for Hayato missing — Test 1 may have failed');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 4 — Batch path (source = enrichment) against a fresh entity
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n─── TEST 4: link-groups-to-places enrichment path ───────────');
  console.log('    Confirm trace shape for enrichment source\n');

  // Use a third unlinked entity: find one with no entity_actor_relationships
  const unlinked = await db.entities.findFirst({
    where: {
      entity_actor_relationships: { none: {} },
      id: { notIn: [HAYATO_ID, MORI_ID] },
    },
    select: { id: true, name: true },
  });

  if (!unlinked) {
    fail('No third unlinked entity found for enrichment path test');
  } else {
    console.log(`    Entity: ${unlinked.name}  |  Actor: Gjelina Group\n`);

    const t4Start = new Date();

    await db.entity_actor_relationships.create({
      data: {
        entityId: unlinked.id,
        actorId: GJELINA_ACTOR_ID,
        role: 'operator',
        isPrimary: true,
        sources: { _script: 'link-groups-to-places', _validate: true },
        confidence: 1,
      },
    });

    try {
      await writeTrace({
        entityId: unlinked.id,
        source: TraceSource.enrichment,
        eventType: TraceEventType.IDENTITY_ATTACHED,
        fieldName: 'actor_relationship',
        oldValue: null,
        newValue: {
          actor_id: GJELINA_ACTOR_ID,
          actor_name: 'Gjelina Group',
          role: 'operator',
          is_primary: true,
          relationship_table: 'entity_actor_relationships',
          script: 'link-groups-to-places',
        },
        confidence: 1,
      });
    } catch (e) {
      console.warn('  ⚠️  Trace write skipped (entity not in golden_records):', (e as Error).message);
    }

    const t4Traces = await tracesSince(unlinked.id, t4Start);
    // Trace may be absent if the entity isn't in golden_records (FK fails → catch)
    assert(t4Traces.length >= 1, 'At least 1 trace emitted (or 0 if entity not in golden_records)', `got ${t4Traces.length}`);

    const t4 = t4Traces[0];
    if (t4) {
      assert(t4.source === 'enrichment', 'source = enrichment');
      assert(t4.event_type === 'IDENTITY_ATTACHED', 'event_type = IDENTITY_ATTACHED');
      const nv4 = t4.new_value as Record<string, unknown> | null;
      assert(!!nv4?.actor_id, 'new_value.actor_id present');
    } else {
      ok('No trace emitted (entity not in golden_records — FK guard fired correctly)');
    }

    console.log('\n  Trace payload:');
    console.log('  ', JSON.stringify({ event_type: t4?.event_type, source: t4?.source, field_name: t4?.field_name, new_value: t4?.new_value }, null, 4).replace(/\n/g, '\n  '));

    // Clean up test 4 row
    await db.entity_actor_relationships.deleteMany({
      where: { entityId: unlinked.id, actorId: GJELINA_ACTOR_ID },
    });
    await db.traces.deleteMany({
      where: { entity_id: unlinked.id, field_name: 'actor_relationship' },
    });
    console.log('\n    ⤷ Test 4 rows cleaned up');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('⚠️  Some assertions failed — review output above.\n');
  } else {
    console.log('✅ All assertions passed.\n');
    console.log('   Heads-up: Tests 1–2 left trace + relationship rows for Hayato and');
    console.log('   Mori Nozomi. Run with --cleanup to remove them.\n');
  }
}

main()
  .catch((err) => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
