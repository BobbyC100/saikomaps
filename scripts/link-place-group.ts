#!/usr/bin/env node
/**
 * Link Place to Operator (Actor)
 * Creates PlaceActorRelationship. Uses restaurant_groups as lookup source for Actor.
 * DEPRECATED writes to restaurantGroupId — uses PlaceActorRelationship only.
 */

import { db } from '@/lib/db'

function mergeSources(existing: unknown, extra: Record<string, unknown>): Record<string, unknown> {
  const base = typeof existing === 'object' && existing !== null ? { ...(existing as Record<string, unknown>) } : {}
  return { ...base, ...extra }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2 || args[0].startsWith('--') || args[1].startsWith('--')) {
    console.error('\nUsage: npx tsx scripts/link-place-group.ts "<place-name>" "<group-name>"')
    console.error('\nExample:')
    console.error('  npx tsx scripts/link-place-group.ts "Found Oyster" "Last Word Hospitality"\n')
    process.exit(1)
  }

  const placeName = args[0]
  const groupName = args[1]

  console.log('\n🔗 LINK PLACE TO RESTAURANT GROUP\n')
  console.log('═'.repeat(80))

  // Find place
  const place = await db.entities.findFirst({
    where: {
      OR: [
        { name: { contains: placeName, mode: 'insensitive' } },
        { slug: placeName.toLowerCase() }
      ]
    },
    include: {
      place_actor_relationships: {
        where: { role: 'operator', isPrimary: true },
        include: { actor: true }
      }
    }
  })

  if (!place) {
    console.log(`\n❌ Place not found: "${placeName}"\n`)
    process.exit(1)
  }

  console.log(`\nPlace: ${place.name}`)
  if (place.neighborhood) {
    console.log(`Neighborhood: ${place.neighborhood}`)
  }

  const primaryOp = place.place_actor_relationships?.[0]
  if (primaryOp) {
    console.log(`\n⚠️  Already linked to operator: ${primaryOp.actor.name}`)
    console.log('\nUnlink first if you want to change the operator association\n')
    process.exit(1)
  }

  // Find group (used to look up Actor by slug)
  const group = await db.restaurant_groups.findFirst({
    where: {
      OR: [
        { name: { contains: groupName, mode: 'insensitive' } },
        { slug: groupName.toLowerCase() }
      ]
    }
  })

  if (!group) {
    console.log(`\n❌ Restaurant group not found: "${groupName}"`)
    console.log('   Add group first: npx tsx scripts/add-restaurant-group.ts "<name>"\n')
    process.exit(1)
  }

  // Find or create Actor (backfill creates from restaurant_groups; script creates if needed)
  let actor = await db.actor.findUnique({ where: { slug: group.slug } })
  if (!actor) {
    actor = await db.actor.create({
      data: {
        name: group.name,
        kind: 'operator',
        slug: group.slug,
        website: group.website ?? undefined,
        description: group.description ?? undefined,
        visibility: group.visibility,
        sources: mergeSources(group.sources, { _migration_source: 'restaurant_groups', restaurant_group_id: group.id })
      }
    })
  }

  // Create PlaceActorRelationship (no write to restaurantGroupId)
  await db.placeActorRelationship.create({
    data: {
      entityId: place.id,
      actorId: actor.id,
      role: 'operator',
      isPrimary: true,
      sources: { _script: 'link-place-group', restaurant_group_id: group.id },
      confidence: 1
    }
  })

  console.log(`\n✅ Place linked to operator: ${actor.name}`)
  
  console.log('\n═'.repeat(80))
  console.log('\nNext steps:')
  console.log(`1. View group: npx tsx scripts/view-restaurant-group.ts "${group.name}" (or /actor/${actor.slug})`)
  console.log(`2. Link more places: npx tsx scripts/link-place-group.ts "<another-place>" "${actor.name}"`)
  console.log()
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  })
  .finally(() => {
    db.$disconnect()
  })
