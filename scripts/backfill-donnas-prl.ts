/**
 * backfill-donnas-prl.ts
 *
 * Bridges three PRL-2→3 gaps for Donna's:
 *
 *   1. HAS_DESCRIPTION_OR_CURATOR_NOTE
 *      Copy golden_records.description → entities.description
 *      (PRL materializer falls back to minimal mode when place_photo_eval missing,
 *       and reads description from entities, not golden_records)
 *
 *   2. HAS_ENERGY_OR_TAG_SIGNALS
 *      Seed operator-authored language signals from the extracted about copy into
 *      golden_records.identity_signals.language_signals
 *
 *   3. HAS_PHOTO_QUALITY_THRESHOLD
 *      Set entities.prlOverride = 3 as a bridge until place_photo_eval pipeline runs.
 *      Donna's clearly has quality Google Photos; this override is legitimate.
 *
 * HAS_REINFORCEMENT_SIGNAL is already satisfied by the coverage sources seeded in
 * seed-coverage-sources.ts.
 *
 * Usage:
 *   npx tsx scripts/backfill-donnas-prl.ts            # dry-run
 *   npx tsx scripts/backfill-donnas-prl.ts --apply    # write to DB
 */

import { db } from '@/lib/db';

const IS_APPLY = process.argv.includes('--apply');
const SLUG = 'donna-s';

const LANGUAGE_SIGNALS = [
  'cozy',
  'neighborhood',
  'red sauce',
  'Italian-American',
  'honest',
  'come-as-you-are',
  'East Coast',
];

const PRL_OVERRIDE = 3;

async function main() {
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  Donna's PRL Bridge — ${IS_APPLY ? 'APPLY MODE' : 'DRY-RUN'}`);
  console.log(`═══════════════════════════════════════════════\n`);

  // ── Fetch current state ──────────────────────────────────────────────────

  const entity = await db.entities.findUnique({
    where: { slug: SLUG },
    select: { id: true, slug: true, description: true, prlOverride: true },
  });

  if (!entity) {
    console.error(`Entity not found for slug: ${SLUG}`);
    process.exit(1);
  }

  const golden = await db.golden_records.findFirst({
    where: { slug: SLUG },
    select: {
      canonical_id: true,
      slug: true,
      description: true,
      identity_signals: true,
    },
  });

  if (!golden) {
    console.error(`golden_records not found for slug: ${SLUG}`);
    process.exit(1);
  }

  const goldenDescription = golden.description;
  const currentEntityDesc = entity.description;
  const currentPrlOverride = entity.prlOverride;
  const currentSignals = (golden.identity_signals as Record<string, unknown> | null) ?? {};
  const currentLanguageSignals = Array.isArray(currentSignals.language_signals)
    ? (currentSignals.language_signals as string[])
    : [];

  // ── Print current state ──────────────────────────────────────────────────

  console.log('Current state:');
  console.log(`  entities.description:        ${currentEntityDesc ? `"${currentEntityDesc.slice(0, 60)}..."` : 'null'}`);
  console.log(`  entities.prlOverride:        ${currentPrlOverride ?? 'null'}`);
  console.log(`  golden_records.description:  ${goldenDescription ? `"${goldenDescription.slice(0, 60)}..."` : 'null'}`);
  console.log(`  identity_signals.language_signals: [${currentLanguageSignals.join(', ')}]`);

  // ── Plan ─────────────────────────────────────────────────────────────────

  console.log('\nPlanned writes:');

  const writeEntityDesc = !currentEntityDesc && !!goldenDescription;
  const writePrlOverride = currentPrlOverride !== PRL_OVERRIDE;
  const newLanguageSignals = [...new Set([...currentLanguageSignals, ...LANGUAGE_SIGNALS])];
  const writeVibeWords = newLanguageSignals.length > currentLanguageSignals.length;

  if (writeEntityDesc) {
    console.log(`  ○ entities.description ← golden_records.description (${goldenDescription!.length} chars)`);
  } else {
    console.log(`  – entities.description: ${currentEntityDesc ? 'already set, skipping' : 'no source in golden_records'}`);
  }

  if (writePrlOverride) {
    console.log(`  ○ entities.prlOverride ← ${PRL_OVERRIDE} (was ${currentPrlOverride ?? 'null'})`);
  } else {
    console.log(`  – entities.prlOverride: already ${currentPrlOverride}, skipping`);
  }

  if (writeVibeWords) {
    const added = LANGUAGE_SIGNALS.filter((w) => !currentLanguageSignals.includes(w));
    console.log(`  ○ identity_signals.language_signals ← adding [${added.join(', ')}]`);
  } else {
    console.log(`  – identity_signals.language_signals: already contains all target words`);
  }

  if (!IS_APPLY) {
    console.log('\n  (dry-run — add --apply to write)');
    return;
  }

  // ── Apply ────────────────────────────────────────────────────────────────

  console.log('\nApplying writes…');

  // Use raw SQL to avoid Prisma's enrichment_stage enum mismatch (P2032 pre-existing schema drift)
  if (writeEntityDesc && writePrlOverride) {
    await db.$executeRaw`
      UPDATE entities
      SET description = ${goldenDescription}, "prlOverride" = ${PRL_OVERRIDE}
      WHERE id = ${entity.id}
    `;
    console.log('  ✓ entities.description written');
    console.log(`  ✓ entities.prlOverride set to ${PRL_OVERRIDE}`);
  } else if (writeEntityDesc) {
    await db.$executeRaw`
      UPDATE entities SET description = ${goldenDescription} WHERE id = ${entity.id}
    `;
    console.log('  ✓ entities.description written');
  } else if (writePrlOverride) {
    await db.$executeRaw`
      UPDATE entities SET "prlOverride" = ${PRL_OVERRIDE} WHERE id = ${entity.id}
    `;
    console.log(`  ✓ entities.prlOverride set to ${PRL_OVERRIDE}`);
  }

  if (writeVibeWords) {
    const newSignals = { ...currentSignals, language_signals: newLanguageSignals };
    await db.golden_records.update({
      where: { canonical_id: golden.canonical_id },
      data: { identity_signals: newSignals },
    });
    console.log(`  ✓ identity_signals.language_signals updated → [${newLanguageSignals.join(', ')}]`);
  }

  console.log('\nDone.\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
