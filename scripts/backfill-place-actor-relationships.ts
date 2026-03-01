/**
 * Backfill PlaceActorRelationship from restaurant_groups.
 *
 * Step 1: Create Actor(kind=organization) for each restaurant_group.
 *         Migrate: name, slug, website, description, visibility, sources.
 *         Store migration source flag in sources.
 *
 * Step 2: For every place with restaurantGroupId, create PlaceActorRelationship
 *         role=operator, isPrimary=true.
 *
 * Idempotent. Use --dry-run (default) or --apply.
 *
 * Usage:
 *   npx tsx -r ./scripts/load-env.js scripts/backfill-place-actor-relationships.ts [--apply]
 */

import * as path from 'path';
import { db } from '@/lib/db';

const AUDIT_PATH = path.join(process.cwd(), 'data/logs/backfill_place_actor_relationships.csv');

function parseArgs(): { apply: boolean } {
  const argv = process.argv.slice(2);
  return { apply: argv.includes('--apply') };
}

interface AuditRow {
  step: 'actor' | 'relationship';
  action: 'created' | 'skipped';
  id: string;
  slug?: string;
  name?: string;
  reason?: string;
}

async function main() {
  const { apply } = parseArgs();
  const auditRows: AuditRow[] = [];

  console.log('Backfill PlaceActorRelationship from restaurant_groups\n');
  if (!apply) console.log('DRY RUN (no writes). Use --apply to persist.\n');

  // Step 1: Create Actor for each restaurant_group
  const groups = await db.restaurant_groups.findMany({ orderBy: { slug: 'asc' } });
  console.log(`Step 1: Found ${groups.length} restaurant_groups\n`);

  const slugToActorId = new Map<string, string>();

  for (const g of groups) {
    const existing = await db.actor.findUnique({ where: { slug: g.slug } });
    if (existing) {
      slugToActorId.set(g.slug, existing.id);
      auditRows.push({ step: 'actor', action: 'skipped', id: existing.id, slug: g.slug, name: g.name, reason: 'already exists' });
      continue;
    }

    if (apply) {
      const actor = await db.actor.create({
        data: {
          name: g.name,
          kind: 'operator',
          slug: g.slug,
          website: g.website ?? undefined,
          description: g.description ?? undefined,
          visibility: g.visibility,
          sources: mergeSources(g.sources, { _migration_source: 'restaurant_groups', restaurant_group_id: g.id }),
        },
      });
      slugToActorId.set(g.slug, actor.id);
      auditRows.push({ step: 'actor', action: 'created', id: actor.id, slug: g.slug, name: g.name });
    } else {
      auditRows.push({ step: 'actor', action: 'created', id: '(dry-run)', slug: g.slug, name: g.name });
    }
  }

  // Step 2: Create PlaceActorRelationship for every place with restaurantGroupId
  const placesWithGroup = await db.entities.findMany({
    where: { restaurantGroupId: { not: null } },
    select: { id: true, restaurantGroupId: true, name: true },
  });
  console.log(`Step 2: Found ${placesWithGroup.length} places with restaurantGroupId\n`);

  let relationshipsCreated = 0;
  let relationshipsSkipped = 0;

  for (const p of placesWithGroup) {
    const groupId = p.restaurantGroupId!;
    const group = await db.restaurant_groups.findUnique({ where: { id: groupId } });
    if (!group) {
      auditRows.push({ step: 'relationship', action: 'skipped', id: p.id, name: p.name, reason: 'group not found' });
      relationshipsSkipped++;
      continue;
    }

    const actorId = slugToActorId.get(group.slug);
    if (!actorId) {
      auditRows.push({ step: 'relationship', action: 'skipped', id: p.id, name: p.name, reason: 'actor not created' });
      relationshipsSkipped++;
      continue;
    }

    const existing = await db.placeActorRelationship.findFirst({
      where: { entityId: p.id, actorId, role: 'operator' },
    });
    if (existing) {
      auditRows.push({ step: 'relationship', action: 'skipped', id: p.id, name: p.name, reason: 'relationship exists' });
      relationshipsSkipped++;
      continue;
    }

    if (apply) {
      await db.placeActorRelationship.create({
        data: {
          entityId: p.id,
          actorId,
          role: 'operator',
          isPrimary: true,
          sources: { _migration_source: 'restaurant_groups', restaurant_group_id: groupId },
          confidence: 1,
        },
      });
      auditRows.push({ step: 'relationship', action: 'created', id: p.id, name: p.name });
      relationshipsCreated++;
    } else {
      auditRows.push({ step: 'relationship', action: 'created', id: p.id, name: p.name });
    }
  }

  // Summary
  const actorsCreated = auditRows.filter((r) => r.step === 'actor' && r.action === 'created').length;
  const actorsSkipped = auditRows.filter((r) => r.step === 'actor' && r.action === 'skipped').length;
  const relsCreated = auditRows.filter((r) => r.step === 'relationship' && r.action === 'created').length;
  const relsSkipped = auditRows.filter((r) => r.step === 'relationship' && r.action === 'skipped').length;

  console.log('Summary:');
  console.log(`  Actors: ${actorsCreated} created, ${actorsSkipped} skipped`);
  console.log(`  PlaceActorRelationships: ${relsCreated} created, ${relsSkipped} skipped`);

  // Audit output
  const { writeFileSync, mkdirSync } = await import('fs');
  const dir = path.dirname(AUDIT_PATH);
  mkdirSync(dir, { recursive: true });
  const header = 'step,action,id,slug,name,reason\n';
  const csv = header + auditRows.map((r) => [r.step, r.action, r.id, r.slug ?? '', r.name ?? '', r.reason ?? ''].join(',')).join('\n');
  writeFileSync(AUDIT_PATH, csv);
  console.log(`\nAudit written to ${AUDIT_PATH}`);
}

function mergeSources(
  existing: unknown,
  extra: Record<string, unknown>
): Record<string, unknown> {
  const base = typeof existing === 'object' && existing !== null ? { ...(existing as Record<string, unknown>) } : {};
  return { ...base, ...extra };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
