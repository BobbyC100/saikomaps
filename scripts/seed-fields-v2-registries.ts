/**
 * Fields v2: Seed source_registry and attribute_registry
 *
 * Run ONCE before populate-canonical-state.ts.
 * Safe to re-run — all upserts are idempotent.
 *
 * Usage:
 *   npx ts-node scripts/seed-fields-v2-registries.ts
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// ---------------------------------------------------------------------------
// Source Registry
// ---------------------------------------------------------------------------

const SOURCES = [
  // Google Places — highest trust for identity-critical fields (name, lat/lng, hours)
  {
    id: 'google_places',
    display_name: 'Google Places API',
    source_type: 'GOOGLE_PLACES' as const,
    trust_tier: 1,
    requires_human_approval: false,
    base_domain: 'maps.googleapis.com',
  },
  // Tier-1 editorial publications
  {
    id: 'eater_la',
    display_name: 'Eater LA',
    source_type: 'EDITORIAL' as const,
    trust_tier: 1,
    requires_human_approval: false,
    base_domain: 'la.eater.com',
  },
  {
    id: 'la_times',
    display_name: 'Los Angeles Times',
    source_type: 'EDITORIAL' as const,
    trust_tier: 1,
    requires_human_approval: false,
    base_domain: 'latimes.com',
  },
  {
    id: 'michelin',
    display_name: 'Michelin Guide',
    source_type: 'EDITORIAL' as const,
    trust_tier: 1,
    requires_human_approval: false,
    base_domain: 'guide.michelin.com',
  },
  {
    id: 'infatuation',
    display_name: 'The Infatuation',
    source_type: 'EDITORIAL' as const,
    trust_tier: 1,
    requires_human_approval: false,
    base_domain: 'theinfatuation.com',
  },
  {
    id: 'bon_appetit',
    display_name: 'Bon Appétit',
    source_type: 'EDITORIAL' as const,
    trust_tier: 1,
    requires_human_approval: false,
    base_domain: 'bonappetit.com',
  },
  {
    id: 'resy',
    display_name: 'Resy',
    source_type: 'EDITORIAL' as const,
    trust_tier: 2,
    requires_human_approval: false,
    base_domain: 'resy.com',
  },
  // Operator-owned sources — authoritative for operational facts
  {
    id: 'operator_website',
    display_name: 'Operator Website',
    source_type: 'OPERATOR_WEBSITE' as const,
    trust_tier: 2,
    requires_human_approval: false,
    base_domain: null,
  },
  // Social — lower trust, needs validation
  {
    id: 'instagram',
    display_name: 'Instagram',
    source_type: 'SOCIAL' as const,
    trust_tier: 3,
    requires_human_approval: false,
    base_domain: 'instagram.com',
  },
  // Newsletter signals — require human approval before sanctioning
  {
    id: 'newsletter',
    display_name: 'Newsletter',
    source_type: 'NEWSLETTER' as const,
    trust_tier: 3,
    requires_human_approval: true,
    base_domain: null,
  },
  // Human review — highest trust for content decisions
  {
    id: 'human_review',
    display_name: 'Human Review (Bobby)',
    source_type: 'HUMAN_REVIEW' as const,
    trust_tier: 1,
    requires_human_approval: false,
    base_domain: null,
  },
  // System import — CSV/batch import (treated as tier-2 editorial import)
  {
    id: 'system_import',
    display_name: 'System Import (CSV/Batch)',
    source_type: 'SYSTEM_IMPORT' as const,
    trust_tier: 2,
    requires_human_approval: false,
    base_domain: null,
  },
] as const;

// ---------------------------------------------------------------------------
// Attribute Registry
// ---------------------------------------------------------------------------

const ATTRIBUTES = [
  // --- CANONICAL: identity-critical (threshold 0.95, no decay) ---
  { attribute_key: 'name', display_name: 'Name', attribute_class: 'CANONICAL', identity_critical: true, sanction_threshold: 0.95, decay_policy: 'NONE' },
  { attribute_key: 'google_place_id', display_name: 'Google Place ID', attribute_class: 'CANONICAL', identity_critical: true, sanction_threshold: 0.95, decay_policy: 'NONE' },
  { attribute_key: 'latitude', display_name: 'Latitude', attribute_class: 'CANONICAL', identity_critical: true, sanction_threshold: 0.95, decay_policy: 'NONE' },
  { attribute_key: 'longitude', display_name: 'Longitude', attribute_class: 'CANONICAL', identity_critical: true, sanction_threshold: 0.95, decay_policy: 'NONE' },
  { attribute_key: 'business_status', display_name: 'Business Status', attribute_class: 'CANONICAL', identity_critical: true, sanction_threshold: 0.95, decay_policy: 'NONE' },

  // --- CANONICAL: operational (threshold 0.80) ---
  { attribute_key: 'address', display_name: 'Address', attribute_class: 'CANONICAL', identity_critical: false, sanction_threshold: 0.80, decay_policy: 'SOURCE_UPDATED' },
  { attribute_key: 'neighborhood', display_name: 'Neighborhood', attribute_class: 'CANONICAL', identity_critical: false, sanction_threshold: 0.80, decay_policy: 'NONE' },
  { attribute_key: 'phone', display_name: 'Phone', attribute_class: 'CANONICAL', identity_critical: false, sanction_threshold: 0.80, decay_policy: 'SOURCE_UPDATED' },
  { attribute_key: 'website', display_name: 'Website', attribute_class: 'CANONICAL', identity_critical: false, sanction_threshold: 0.80, decay_policy: 'SOURCE_UPDATED' },
  { attribute_key: 'instagram', display_name: 'Instagram Handle', attribute_class: 'CANONICAL', identity_critical: false, sanction_threshold: 0.80, decay_policy: 'SOURCE_UPDATED' },
  { attribute_key: 'hours', display_name: 'Hours', attribute_class: 'CANONICAL', identity_critical: false, sanction_threshold: 0.80, decay_policy: 'TIME_BASED' },

  // --- CANONICAL: content (threshold 0.70) ---
  { attribute_key: 'price_level', display_name: 'Price Level', attribute_class: 'CANONICAL', identity_critical: false, sanction_threshold: 0.70, decay_policy: 'NONE' },
  { attribute_key: 'reservation_url', display_name: 'Reservation URL', attribute_class: 'CANONICAL', identity_critical: false, sanction_threshold: 0.70, decay_policy: 'SOURCE_UPDATED' },
  { attribute_key: 'menu_url', display_name: 'Menu URL', attribute_class: 'CANONICAL', identity_critical: false, sanction_threshold: 0.70, decay_policy: 'SOURCE_UPDATED' },
  { attribute_key: 'winelist_url', display_name: 'Wine List URL', attribute_class: 'CANONICAL', identity_critical: false, sanction_threshold: 0.70, decay_policy: 'SOURCE_UPDATED' },
  { attribute_key: 'description', display_name: 'Description', attribute_class: 'CANONICAL', identity_critical: false, sanction_threshold: 0.70, decay_policy: 'NONE' },
  { attribute_key: 'cuisine_type', display_name: 'Cuisine Type', attribute_class: 'CANONICAL', identity_critical: false, sanction_threshold: 0.70, decay_policy: 'NONE' },
  { attribute_key: 'category', display_name: 'Category', attribute_class: 'CANONICAL', identity_critical: false, sanction_threshold: 0.70, decay_policy: 'NONE' },
  { attribute_key: 'tips', display_name: 'Tips', attribute_class: 'CANONICAL', identity_critical: false, sanction_threshold: 0.70, decay_policy: 'NONE' },
  { attribute_key: 'google_photos', display_name: 'Google Photos', attribute_class: 'CANONICAL', identity_critical: false, sanction_threshold: 0.70, decay_policy: 'SOURCE_UPDATED' },
  { attribute_key: 'google_places_attributes', display_name: 'Google Places Attributes', attribute_class: 'CANONICAL', identity_critical: false, sanction_threshold: 0.70, decay_policy: 'SOURCE_UPDATED' },

  // --- DERIVED: AI/computed signals (no threshold — computed, not sanctioned) ---
  { attribute_key: 'cuisine_posture', display_name: 'Cuisine Posture', attribute_class: 'DERIVED', identity_critical: false, sanction_threshold: 0.00, decay_policy: 'SOURCE_UPDATED' },
  { attribute_key: 'service_model', display_name: 'Service Model', attribute_class: 'DERIVED', identity_critical: false, sanction_threshold: 0.00, decay_policy: 'SOURCE_UPDATED' },
  { attribute_key: 'price_tier', display_name: 'Price Tier (Derived)', attribute_class: 'DERIVED', identity_critical: false, sanction_threshold: 0.00, decay_policy: 'SOURCE_UPDATED' },
  { attribute_key: 'wine_program_intent', display_name: 'Wine Program Intent', attribute_class: 'DERIVED', identity_critical: false, sanction_threshold: 0.00, decay_policy: 'SOURCE_UPDATED' },
  { attribute_key: 'place_personality', display_name: 'Place Personality', attribute_class: 'DERIVED', identity_critical: false, sanction_threshold: 0.00, decay_policy: 'SOURCE_UPDATED' },
  { attribute_key: 'identity_signals', display_name: 'Identity Signals (extended)', attribute_class: 'DERIVED', identity_critical: false, sanction_threshold: 0.00, decay_policy: 'SOURCE_UPDATED' },
  { attribute_key: 'scenesense_prl', display_name: 'SceneSense PRL Score', attribute_class: 'DERIVED', identity_critical: false, sanction_threshold: 0.00, decay_policy: 'SOURCE_UPDATED' },
  { attribute_key: 'energy_score', display_name: 'Energy Score', attribute_class: 'DERIVED', identity_critical: false, sanction_threshold: 0.00, decay_policy: 'SOURCE_UPDATED' },

  // --- INTERPRETATION: narrative outputs (never canonical) ---
  { attribute_key: 'tagline', display_name: 'Tagline', attribute_class: 'INTERPRETATION', identity_critical: false, sanction_threshold: 0.00, decay_policy: 'SOURCE_UPDATED' },
  { attribute_key: 'pull_quote', display_name: 'Pull Quote', attribute_class: 'INTERPRETATION', identity_critical: false, sanction_threshold: 0.00, decay_policy: 'NONE' },
  { attribute_key: 'voice_descriptor', display_name: 'Voice Descriptor', attribute_class: 'INTERPRETATION', identity_critical: false, sanction_threshold: 0.00, decay_policy: 'SOURCE_UPDATED' },
] as const;

async function main() {
  console.log('[Fields v2] Seeding source_registry...');

  for (const source of SOURCES) {
    await db.source_registry.upsert({
      where: { id: source.id },
      create: {
        id: source.id,
        display_name: source.display_name,
        source_type: source.source_type,
        trust_tier: source.trust_tier,
        requires_human_approval: source.requires_human_approval,
        base_domain: source.base_domain ?? null,
        is_active: true,
      },
      update: {
        display_name: source.display_name,
        trust_tier: source.trust_tier,
        requires_human_approval: source.requires_human_approval,
      },
    });
  }

  console.log(`[Fields v2] Seeded ${SOURCES.length} sources.`);

  console.log('[Fields v2] Seeding attribute_registry...');

  for (const attr of ATTRIBUTES) {
    await db.attribute_registry.upsert({
      where: { attribute_key: attr.attribute_key },
      create: {
        attribute_key: attr.attribute_key,
        display_name: attr.display_name,
        attribute_class: attr.attribute_class,
        identity_critical: attr.identity_critical,
        sanction_threshold: attr.sanction_threshold,
        decay_policy: attr.decay_policy,
      },
      update: {
        display_name: attr.display_name,
        attribute_class: attr.attribute_class,
        identity_critical: attr.identity_critical,
        sanction_threshold: attr.sanction_threshold,
        decay_policy: attr.decay_policy,
      },
    });
  }

  console.log(`[Fields v2] Seeded ${ATTRIBUTES.length} attributes.`);
  console.log('[Fields v2] Registry seed complete.');
}

main()
  .catch((err) => {
    console.error('[Fields v2] Seed failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
