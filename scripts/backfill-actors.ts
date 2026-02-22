#!/usr/bin/env node
/**
 * Backfill Actor and EntityActorRelationship from legacy fields.
 * Reads parent_organization, brand_affiliation from raw data.
 * Idempotent. Must not crash if legacy fields are empty.
 *
 * Usage: node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/backfill-actors.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CONFIDENCE = 0.6;
const SOURCE = 'migrated';

function extractLegacyActorNames(rawJson: unknown): string[] {
  if (!rawJson || typeof rawJson !== 'object') return [];
  const obj = rawJson as Record<string, unknown>;
  const names: string[] = [];

  const keys = [
    'parent_organization',
    'parentOrganization',
    'brand_affiliation',
    'brandAffiliation',
  ];

  for (const key of keys) {
    const val = obj[key];
    if (val == null) continue;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed) names.push(trimmed);
    } else if (Array.isArray(val)) {
      for (const v of val) {
        if (typeof v === 'string') {
          const trimmed = v.trim();
          if (trimmed) names.push(trimmed);
        }
      }
    }
  }

  return [...new Set(names)];
}

async function main() {
  let actorsCreated = 0;
  let relationshipsCreated = 0;
  let entitiesProcessed = 0;

  const entities = await prisma.golden_records.findMany({
    select: { canonical_id: true },
  });

  const existingActors = new Map<string, string>();
  for (const a of await prisma.actor.findMany({ select: { id: true, name: true } })) {
    existingActors.set(a.name.toLowerCase().trim(), a.id);
  }

  const existingRels = new Set<string>();
  for (const r of await prisma.entityActorRelationship.findMany({
    select: { entityId: true, actorId: true },
  })) {
    existingRels.add(`${r.entityId}:${r.actorId}`);
  }

  for (const entity of entities) {
    const links = await prisma.entity_links.findMany({
      where: { canonical_id: entity.canonical_id, is_active: true },
      include: { raw_record: { select: { raw_json: true } } },
    });

    const allNames: string[] = [];
    for (const link of links) {
      const names = extractLegacyActorNames(link.raw_record.raw_json);
      allNames.push(...names);
    }
    const uniqueNames = [...new Set(allNames)];
    if (uniqueNames.length === 0) continue;

    entitiesProcessed++;

    for (const name of uniqueNames) {
      const key = name.toLowerCase().trim();
      let actorId = existingActors.get(key);

      if (!actorId) {
        const actor = await prisma.actor.create({
          data: { name, kind: 'organization' },
        });
        actorId = actor.id;
        existingActors.set(key, actorId);
        actorsCreated++;
      }

      const relKey = `${entity.canonical_id}:${actorId}`;
      if (existingRels.has(relKey)) continue;

      await prisma.entityActorRelationship.create({
        data: {
          entityId: entity.canonical_id,
          actorId,
          role: 'parent',
          confidence: DEFAULT_CONFIDENCE,
          source: SOURCE,
        },
      });
      existingRels.add(relKey);
      relationshipsCreated++;
    }
  }

  console.log('actors created:', actorsCreated);
  console.log('relationships created:', relationshipsCreated);
  console.log('entities processed:', entitiesProcessed);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
