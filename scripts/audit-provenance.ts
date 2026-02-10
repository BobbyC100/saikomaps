/**
 * Saiko Maps - Provenance Audit
 * 
 * Finds places that lack proper chain of custody.
 * Run regularly to catch any places that snuck in without Bobby's approval.
 * 
 * Usage: npx ts-node scripts/audit-provenance.ts
 * 
 * Exit codes:
 *   0 = All clear
 *   1 = Issues found (places without provenance or AI-added places)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// These values in addedBy are FORBIDDEN
const FORBIDDEN_ACTORS = [
  'claude',
  'cursor', 
  'ai',
  'auto',
  'automated',
  'system',
  'bot',
  'script', // Unless it's a Bobby-approved script
];

interface AuditResult {
  passed: boolean;
  orphanPlaces: Array<{ id: string; name: string; neighborhood: string | null; createdAt: Date }>;
  aiAddedPlaces: Array<{ id: string; name: string; addedBy: string; createdAt: Date }>;
  unknownProvenance: Array<{ id: string; name: string; sourceType: string | null }>;
  stats: {
    totalPlaces: number;
    withProvenance: number;
    withoutProvenance: number;
    byAddedBy: Record<string, number>;
    bySourceType: Record<string, number>;
    byImportBatch: Record<string, number>;
  };
}

async function runAudit(): Promise<AuditResult> {
  console.log('🔍 SAIKO MAPS PROVENANCE AUDIT');
  console.log('═'.repeat(60));
  console.log('');
  
  // Get all golden records
  const places = await prisma.golden_records.findMany({
    select: {
      canonical_id: true,
      name: true,
      neighborhood: true,
      created_at: true,
    }
  });
  
  // Get all provenance records
  const provenanceRecords = await prisma.provenance.findMany({
    include: {
      golden_record: {
        select: { name: true }
      }
    }
  });
  
  // Build lookup
  const provenanceByPlaceId = new Map<string, typeof provenanceRecords[0][]>();
  provenanceRecords.forEach(p => {
    const existing = provenanceByPlaceId.get(p.place_id) || [];
    existing.push(p);
    provenanceByPlaceId.set(p.place_id, existing);
  });
  
  // AUDIT 1: Find orphan places (no provenance record)
  const orphanPlaces = places
    .filter(p => !provenanceByPlaceId.has(p.canonical_id))
    .map(p => ({
      id: p.canonical_id,
      name: p.name,
      neighborhood: p.neighborhood,
      createdAt: p.created_at,
    }));
  
  // AUDIT 2: Find AI-added places (forbidden actors)
  const aiAddedPlaces: AuditResult['aiAddedPlaces'] = [];
  provenanceRecords.forEach(p => {
    const addedByLower = p.added_by.toLowerCase();
    if (FORBIDDEN_ACTORS.some(actor => addedByLower.includes(actor))) {
      aiAddedPlaces.push({
        id: p.place_id,
        name: p.golden_record.name,
        addedBy: p.added_by,
        createdAt: p.created_at,
      });
    }
  });
  
  // AUDIT 3: Find places with unknown/suspicious provenance
  const unknownProvenance = provenanceRecords
    .filter(p => p.source_type === 'unknown' || !p.source_type)
    .map(p => ({
      id: p.place_id,
      name: p.golden_record.name,
      sourceType: p.source_type,
    }));
  
  // Calculate stats
  const byAddedBy: Record<string, number> = {};
  const bySourceType: Record<string, number> = {};
  const byImportBatch: Record<string, number> = {};
  
  provenanceRecords.forEach(p => {
    byAddedBy[p.added_by] = (byAddedBy[p.added_by] || 0) + 1;
    bySourceType[p.source_type || 'null'] = (bySourceType[p.source_type || 'null'] || 0) + 1;
    byImportBatch[p.import_batch || 'null'] = (byImportBatch[p.import_batch || 'null'] || 0) + 1;
  });
  
  const result: AuditResult = {
    passed: orphanPlaces.length === 0 && aiAddedPlaces.length === 0,
    orphanPlaces,
    aiAddedPlaces,
    unknownProvenance,
    stats: {
      totalPlaces: places.length,
      withProvenance: places.length - orphanPlaces.length,
      withoutProvenance: orphanPlaces.length,
      byAddedBy,
      bySourceType,
      byImportBatch,
    }
  };
  
  // Print results
  printAuditResults(result);
  
  return result;
}

function printAuditResults(result: AuditResult) {
  const { stats, orphanPlaces, aiAddedPlaces, unknownProvenance } = result;
  
  // Summary
  console.log('📊 SUMMARY');
  console.log('─'.repeat(40));
  console.log(`  Total places:        ${stats.totalPlaces}`);
  console.log(`  With provenance:     ${stats.withProvenance}`);
  console.log(`  Without provenance:  ${stats.withoutProvenance}`);
  console.log('');
  
  // Chain of custody breakdown
  console.log('👤 ADDED BY (Chain of Custody)');
  console.log('─'.repeat(40));
  Object.entries(stats.byAddedBy)
    .sort((a, b) => b[1] - a[1])
    .forEach(([actor, count]) => {
      const isForbidden = FORBIDDEN_ACTORS.some(f => actor.toLowerCase().includes(f));
      const marker = isForbidden ? '🚨' : '✓';
      console.log(`  ${marker} ${actor}: ${count}`);
    });
  console.log('');
  
  // Source types
  console.log('📚 SOURCE TYPES');
  console.log('─'.repeat(40));
  Object.entries(stats.bySourceType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const marker = type === 'unknown' || type === 'null' ? '⚠️' : '✓';
      console.log(`  ${marker} ${type}: ${count}`);
    });
  console.log('');
  
  // Import batches
  console.log('📦 IMPORT BATCHES');
  console.log('─'.repeat(40));
  Object.entries(stats.byImportBatch)
    .sort((a, b) => b[1] - a[1])
    .forEach(([batch, count]) => {
      console.log(`  • ${batch}: ${count}`);
    });
  console.log('');
  
  // CRITICAL: Orphan places
  if (orphanPlaces.length > 0) {
    console.log('🚨 ORPHAN PLACES (NO PROVENANCE)');
    console.log('─'.repeat(40));
    console.log('These places have NO chain of custody record:');
    orphanPlaces.slice(0, 20).forEach(p => {
      console.log(`  ❌ ${p.name} (${p.neighborhood || 'no neighborhood'})`);
      console.log(`     ID: ${p.id}`);
      console.log(`     Created: ${p.createdAt.toISOString()}`);
    });
    if (orphanPlaces.length > 20) {
      console.log(`  ... and ${orphanPlaces.length - 20} more`);
    }
    console.log('');
  }
  
  // CRITICAL: AI-added places
  if (aiAddedPlaces.length > 0) {
    console.log('🚨 AI-ADDED PLACES (FORBIDDEN)');
    console.log('─'.repeat(40));
    console.log('These places were added by AI without Bobby approval:');
    aiAddedPlaces.forEach(p => {
      console.log(`  ❌ ${p.name}`);
      console.log(`     Added by: ${p.addedBy}`);
      console.log(`     ID: ${p.id}`);
    });
    console.log('');
  }
  
  // Warning: Unknown provenance
  if (unknownProvenance.length > 0) {
    console.log('⚠️  UNKNOWN PROVENANCE (Needs Review)');
    console.log('─'.repeat(40));
    console.log(`${unknownProvenance.length} places have unknown or missing source type.`);
    console.log('These are likely legitimate but should be reviewed.');
    console.log('');
  }
  
  // Final verdict
  console.log('═'.repeat(60));
  if (result.passed) {
    console.log('✅ AUDIT PASSED');
    console.log('All places have provenance records with human approval.');
  } else {
    console.log('❌ AUDIT FAILED');
    if (orphanPlaces.length > 0) {
      console.log(`   • ${orphanPlaces.length} places without provenance`);
    }
    if (aiAddedPlaces.length > 0) {
      console.log(`   • ${aiAddedPlaces.length} places added by AI (forbidden)`);
    }
  }
  console.log('═'.repeat(60));
}

async function main() {
  try {
    const result = await runAudit();
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error('Error during audit:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
