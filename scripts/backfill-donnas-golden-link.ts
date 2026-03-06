/**
 * scripts/backfill-donnas-golden-link.ts
 *
 * WO-FIELDS-DONNAS-GOLDEN-LINK-001
 *
 * Finds or creates a golden_records row for Donna's GPID, then promotes
 * a minimal set of enrichment fields back to the entity row.
 *
 * Idempotent: safe to re-run. Skips creation if golden already exists.
 *
 * Usage:
 *   npx tsx scripts/backfill-donnas-golden-link.ts           # dry-run (default)
 *   npx tsx scripts/backfill-donnas-golden-link.ts --apply   # write to DB
 */

import { PrismaClient, Prisma, PromotionStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

const db = new PrismaClient();
const DRY_RUN = !process.argv.includes('--apply');

const DONNA = {
  slug: 'donna-s',
  entityId: 'a4773c4a-9922-4972-bb51-5c43299e7165',
  gpid: 'ChIJhyFWHlPHwoARElRKU5zEEsw',
};

// ---------------------------------------------------------------------------
// Known editorial facts about Donna's (sourced from website + hours + neighborhood knowledge)
// These are conservative and auditable — no LLM fabrication.
// ---------------------------------------------------------------------------
const GOLDEN_SEED = {
  name: "Donna's",
  slug: 'donna-s',                          // matches entity slug (checked for uniqueness below)
  google_place_id: DONNA.gpid,
  lat: new Prisma.Decimal('34.0762929'),
  lng: new Prisma.Decimal('-118.2566563'),
  address_street: '1538 Sunset Blvd',
  address_city: 'Los Angeles',
  address_state: 'CA',
  address_zip: '90026',
  neighborhood: 'Echo Park',
  county: 'Los Angeles',
  category: 'restaurant',
  cuisines: ['Italian'],
  website: 'https://www.donnasla.com/',
  business_status: 'operational',

  // Identity signal fields (conservative editorial assessment)
  cuisine_posture: 'produce-driven',       // Italian kitchen, seasonal focus
  service_model: 'a-la-carte',
  price_tier: '$$',                        // moderate Echo Park wine bar
  wine_program_intent: 'natural',          // known wine-forward natural program
  place_personality: 'neighborhood-joint', // Echo Park institution

  // Minimal identity_signals to unblock SceneSense pipeline
  identity_signals: {
    place_personality: 'neighborhood-joint',
    language_signals: [],                         // leave empty — let generation pipeline fill
    signature_dishes: [],
  } as Prisma.JsonValue,

  // Provenance
  source_attribution: {
    name:             'saiko_seed',
    slug:             'saiko_seed',
    lat:              'saiko_seed',
    lng:              'saiko_seed',
    address_street:   'saiko_seed',
    neighborhood:     'saiko_seed',
    website:          'merchant_website',
    cuisine_posture:  'saiko_editorial',
    service_model:    'saiko_editorial',
    price_tier:       'saiko_editorial',
    wine_program_intent: 'saiko_editorial',
    place_personality:   'saiko_editorial',
  } as Prisma.JsonValue,

  // Source count + confidence
  source_count: 1,
  confidence: 0.75,

  // Promotion: PROMOTED so route picks up enrichment immediately
  promotion_status: PromotionStatus.PUBLISHED,
};

// Fields to promote back into the entity row
const ENTITY_PROMOTION = {
  cuisineType: 'Italian',
  priceLevel: 2,                           // $$ on Google 1–4 scale
};

// ---------------------------------------------------------------------------
// Snapshot helper — prints the fields we care about
// ---------------------------------------------------------------------------
async function snapshot(label: string) {
  const entity = await db.entities.findUnique({
    where: { slug: DONNA.slug },
    select: {
      cuisineType: true,
      priceLevel: true,
      description: true,
      tagline: true,
      tips: true,
    },
  });
  const golden = await db.golden_records.findFirst({
    where: { google_place_id: DONNA.gpid },
    select: {
      canonical_id: true,
      promotion_status: true,
      cuisine_posture: true,
      service_model: true,
      price_tier: true,
      wine_program_intent: true,
      place_personality: true,
      identity_signals: true,
    },
  });

  console.log(`\n── ${label}`);
  console.log(`  goldenRecord:         ${golden ? `FOUND (${golden.canonical_id})` : 'NONE'}`);
  console.log(`  promotion_status:     ${golden?.promotion_status ?? '—'}`);
  console.log(`  entity.cuisineType:   ${entity?.cuisineType ?? '(null)'}`);
  console.log(`  entity.priceLevel:    ${entity?.priceLevel ?? '(null)'}`);
  console.log(`  entity.description:   ${entity?.description ? entity.description.slice(0, 60) + '…' : '(null)'}`);
  console.log(`  entity.tagline:       ${entity?.tagline ?? '(null)'}`);
  console.log(`  entity.tips:          ${entity?.tips?.length ?? 0} tip(s)`);
  console.log(`  golden.cuisinePosture:${golden?.cuisine_posture ?? '(null)'}`);
  console.log(`  golden.serviceModel:  ${golden?.service_model ?? '(null)'}`);
  console.log(`  golden.priceTier:     ${golden?.price_tier ?? '(null)'}`);
  console.log(`  golden.winePgmIntent: ${golden?.wine_program_intent ?? '(null)'}`);
  console.log(`  golden.personality:   ${golden?.place_personality ?? '(null)'}`);
  console.log(`  golden.identitySignals: ${golden?.identity_signals ? 'present' : '(null)'}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  WO-FIELDS-DONNAS-GOLDEN-LINK-001');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (--apply to write)' : 'LIVE'}`);
  console.log('═'.repeat(60));

  // Verify entity exists
  const entity = await db.entities.findUnique({
    where: { slug: DONNA.slug },
    select: { id: true, googlePlaceId: true, hours: true },
  });
  if (!entity) {
    console.error(`Entity not found: ${DONNA.slug}`);
    process.exit(1);
  }
  if (entity.googlePlaceId !== DONNA.gpid) {
    console.error(`GPID mismatch: entity has ${entity.googlePlaceId}, expected ${DONNA.gpid}`);
    process.exit(1);
  }

  // ── BEFORE snapshot
  await snapshot('BEFORE');

  // Step 1: Find or create golden record
  const existing = await db.golden_records.findFirst({
    where: { google_place_id: DONNA.gpid },
    select: { canonical_id: true, slug: true },
  });

  // Also check slug collision from a different place
  const slugCollision = !existing
    ? await db.golden_records.findUnique({ where: { slug: GOLDEN_SEED.slug }, select: { canonical_id: true } })
    : null;

  const goldenSlug = slugCollision && !existing ? `${GOLDEN_SEED.slug}-golden` : GOLDEN_SEED.slug;

  console.log('\n── Step 1: Golden record');
  if (existing) {
    console.log(`  Already exists: ${existing.canonical_id} (slug=${existing.slug})`);
    console.log('  → Skipping creation, will update enrichment fields.');
  } else {
    console.log(`  None found for GPID ${DONNA.gpid}`);
    if (slugCollision) {
      console.log(`  Slug collision on "${GOLDEN_SEED.slug}" → using "${goldenSlug}"`);
    }
    console.log('  → Will create with seed data.');
  }

  // Step 2: Promote entity fields
  console.log('\n── Step 2: Entity promotion');
  console.log(`  cuisineType  → ${ENTITY_PROMOTION.cuisineType}`);
  console.log(`  priceLevel   → ${ENTITY_PROMOTION.priceLevel}`);

  // Step 3: Copy hours from entity → golden (so golden.hours_json is populated)
  const entityHours = entity.hours;
  console.log('\n── Step 3: Hours sync entity → golden');
  console.log(`  entity.hours present: ${!!entityHours}`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No writes performed. Re-run with --apply to persist.\n');
    return;
  }

  // ── WRITES ──

  if (existing) {
    // Update enrichment fields on existing golden
    await db.golden_records.update({
      where: { canonical_id: existing.canonical_id },
      data: {
        cuisine_posture:      GOLDEN_SEED.cuisine_posture,
        service_model:        GOLDEN_SEED.service_model,
        price_tier:           GOLDEN_SEED.price_tier,
        wine_program_intent:  GOLDEN_SEED.wine_program_intent,
        place_personality:    GOLDEN_SEED.place_personality,
        identity_signals:     GOLDEN_SEED.identity_signals,
        promotion_status:     GOLDEN_SEED.promotion_status,
        ...(entityHours ? { hours_json: entityHours as Prisma.JsonValue } : {}),
      },
    });
    console.log(`\n✓ Updated existing golden ${existing.canonical_id}`);
  } else {
    const canonical_id = randomUUID();
    await db.golden_records.create({
      data: {
        canonical_id,
        ...GOLDEN_SEED,
        slug: goldenSlug,
        ...(entityHours ? { hours_json: entityHours as Prisma.JsonValue } : {}),
        tagline_candidates: [],
        vibe_tags: [],
        signature_dishes: [],
        pro_tips: [],
      },
    });
    console.log(`\n✓ Created golden record ${canonical_id} (slug=${goldenSlug})`);
  }

  // Promote fields to entity (raw SQL to avoid enrichment_stage coercion issue)
  await db.$executeRaw`
    UPDATE entities
    SET cuisine_type = ${ENTITY_PROMOTION.cuisineType},
        price_level  = ${ENTITY_PROMOTION.priceLevel}
    WHERE id = ${DONNA.entityId}
  `;
  console.log('✓ Entity promoted: cuisineType, priceLevel');

  // ── AFTER snapshot
  await snapshot('AFTER');

  console.log('\n── Verify');
  console.log(`  Run: npx tsx scripts/print-place-profile-foundation.ts donna-s`);
  console.log(`  Expect: goldenRecord FOUND, cuisinePosture/priceTier/etc non-null`);
  console.log(`  And: GET /api/places/donna-s → offeringSignals.cuisinePosture non-null\n`);
  console.log('═'.repeat(60) + '\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
