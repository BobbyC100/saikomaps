/**
 * Phase 3 — Human Review Queue Audit
 * Analyzes flagged records and categorizes issues.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // 1. Entities with needs_human_review = true
  const flagged: any[] = await db.$queryRaw`
    SELECT e.id, e.slug, e.name, e.category,
           e.website IS NOT NULL AND e.website != '' as has_website,
           e.description IS NOT NULL AND e.description != '' as has_description,
           e.last_enriched_at,
           e.enrichment_stage,
           e.description_confidence,
           e.description_source,
           EXISTS (SELECT 1 FROM merchant_surfaces ms WHERE ms.entity_id = e.id) as has_surfaces,
           EXISTS (SELECT 1 FROM merchant_surfaces ms WHERE ms.entity_id = e.id AND ms.fetch_status = 'fetch_failed') as has_fetch_failure,
           EXISTS (SELECT 1 FROM derived_signals ds WHERE ds.entity_id = e.id AND ds.signal_key = 'identity_signals') as has_identity_signals,
           EXISTS (SELECT 1 FROM interpretation_cache ic WHERE ic.entity_id = e.id AND ic.output_type = 'TAGLINE' AND ic.is_current = true) as has_tagline
    FROM entities e
    WHERE e.needs_human_review = true
    ORDER BY e.name
  `;

  console.log('=== FLAGGED ENTITIES (needs_human_review=true): ' + flagged.length + ' ===\n');

  // Categorize by reason
  const noWebsite = flagged.filter(r => r.has_website === false);
  const noSurfaces = flagged.filter(r => r.has_surfaces === false && r.has_website === true);
  const fetchFailure = flagged.filter(r => r.has_fetch_failure === true);
  const hasSurfacesNoSignals = flagged.filter(r => r.has_surfaces === true && r.has_identity_signals === false);
  const hasSignalsNoTagline = flagged.filter(r => r.has_identity_signals === true && r.has_tagline === false);
  const fullyEnriched = flagged.filter(r => r.has_tagline === true);

  console.log('By issue type:');
  console.log('  No website (cannot start surface pipeline):    ' + noWebsite.length);
  console.log('  Has website but no surfaces discovered:        ' + noSurfaces.length);
  console.log('  Has fetch failures:                            ' + fetchFailure.length);
  console.log('  Has surfaces, no identity signals:             ' + hasSurfacesNoSignals.length);
  console.log('  Has identity signals, no tagline:              ' + hasSignalsNoTagline.length);
  console.log('  Fully enriched (still flagged):                ' + fullyEnriched.length);

  console.log('\n=== NO WEBSITE ENTITIES (' + noWebsite.length + ') ===');
  noWebsite.forEach(r => console.log('  ' + r.slug + ' | ' + r.name + ' | cat=' + r.category));

  console.log('\n=== HAS WEBSITE BUT NO SURFACES (' + noSurfaces.length + ') ===');
  noSurfaces.slice(0, 20).forEach(r => console.log('  ' + r.slug + ' | ' + r.name));
  if (noSurfaces.length > 20) console.log('  ... +' + (noSurfaces.length - 20) + ' more');

  console.log('\n=== FETCH FAILURES (' + fetchFailure.length + ') ===');
  fetchFailure.forEach(r => console.log('  ' + r.slug + ' | ' + r.name));

  console.log('\n=== HAS SURFACES, NO SIGNALS (' + hasSurfacesNoSignals.length + ') ===');
  hasSurfacesNoSignals.slice(0, 15).forEach(r => console.log('  ' + r.slug + ' | ' + r.name));
  if (hasSurfacesNoSignals.length > 15) console.log('  ... +' + (hasSurfacesNoSignals.length - 15) + ' more');

  console.log('\n=== FULLY ENRICHED BUT STILL FLAGGED (' + fullyEnriched.length + ') ===');
  fullyEnriched.forEach(r => console.log('  ' + r.slug + ' | ' + r.name + ' | desc_conf=' + r.description_confidence));

  // Check the fetch failure details
  const failedSurfaces: any[] = await db.$queryRaw`
    SELECT ms.entity_id, e.slug, ms.surface_type, ms.source_url, ms.metadata_json
    FROM merchant_surfaces ms
    JOIN entities e ON e.id = ms.entity_id
    WHERE ms.fetch_status = 'fetch_failed'
  `;
  if (failedSurfaces.length > 0) {
    console.log('\n=== FETCH FAILURE DETAILS ===');
    failedSurfaces.forEach(r => {
      const meta = r.metadata_json as any;
      console.log('  ' + r.slug + ' | ' + r.surface_type + ' | ' + r.source_url);
      if (meta) console.log('    status=' + (meta.http_status ?? 'n/a') + ' error=' + (meta.error || 'none'));
    });
  }

  // Cross-reference: entities NOT flagged but missing signals
  const unflaggedNoSignals: any[] = await db.$queryRaw`
    SELECT COUNT(*)::int as count FROM entities e
    WHERE e.needs_human_review = false
      AND NOT EXISTS (SELECT 1 FROM derived_signals ds WHERE ds.entity_id = e.id)
      AND NOT EXISTS (SELECT 1 FROM interpretation_cache ic WHERE ic.entity_id = e.id)
  `;
  console.log('\n=== UNFLAGGED BUT NO SIGNALS ===');
  console.log('  Count:', unflaggedNoSignals[0].count);

  // Summary: programmatically fixable vs manual
  const programFixable = noSurfaces.length + hasSurfacesNoSignals.length;
  const manualRequired = noWebsite.length + fullyEnriched.length + fetchFailure.length;

  console.log(`
PHASE 3 CHECKPOINT
══════════════════
Total flagged records: ${flagged.length}
Programmatically fixable: ${programFixable}
  → Run surface discovery for ${noSurfaces.length} (have website, no surfaces)
  → Run identity extraction for ${hasSurfacesNoSignals.length} (have surfaces, no signals)
Requires manual review: ${manualRequired}
  → ${noWebsite.length} entities missing website (need manual URL or IG-only approach)
  → ${fetchFailure.length} entities with surface fetch failures (check URLs)
  → ${fullyEnriched.length} entities fully enriched but still flagged (clear flag?)

Most common flag reasons:
  1. Incomplete enrichment (no identity signals) — ${hasSurfacesNoSignals.length} records
  2. Pipeline not started (no surfaces discovered) — ${noSurfaces.length} records
  3. No website available — ${noWebsite.length} records
  4. Enriched but flag not cleared — ${fullyEnriched.length} records
  5. Surface fetch failures — ${fetchFailure.length} records

Pipeline improvement recommendations:
  * Auto-clear needs_human_review after successful tagline generation
  * Batch-run surface discovery for all entities with websites but no surfaces
  * Implement Instagram-only enrichment path for websiteless entities
  * Add enrichment_stage tracking (currently null for all 143 entities)
`);
}

main().catch(console.error).finally(() => db.$disconnect());
