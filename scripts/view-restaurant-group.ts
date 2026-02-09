#!/usr/bin/env node
/**
 * View Restaurant Group
 * Display group details and all linked places/people
 */

import { db } from '@/lib/db'
import { formatPersonRole } from '@/lib/people-groups'

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('\nUsage: npx tsx scripts/view-restaurant-group.ts "<name-or-slug>"')
    console.error('\nExamples:')
    console.error('  npx tsx scripts/view-restaurant-group.ts "Last Word Hospitality"')
    console.error('  npx tsx scripts/view-restaurant-group.ts last-word-hospitality\n')
    process.exit(1)
  }

  const search = args[0]

  // Find group
  const group = await db.restaurantGroup.findFirst({
    where: {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: search.toLowerCase() }
      ]
    },
    include: {
      places: {
        orderBy: {
          name: 'asc'
        }
      },
      people: {
        orderBy: {
          name: 'asc'
        }
      }
    }
  })

  if (!group) {
    console.log(`\n❌ Restaurant group not found: "${search}"\n`)
    process.exit(1)
  }

  console.log('\n🏢 RESTAURANT GROUP DETAILS\n')
  console.log('═'.repeat(80))
  console.log(`\nName: ${group.name}`)
  console.log(`Slug: ${group.slug}`)
  console.log(`Visibility: ${group.visibility.toLowerCase()}`)
  
  if (group.description) {
    console.log(`\nDescription: ${group.description}`)
  }

  if (group.anchorCity) {
    console.log(`Anchor City: ${group.anchorCity}`)
  }

  if (group.website) {
    console.log(`Website: ${group.website}`)
  }

  // Location count - separate by status
  const openPlaces = group.places.filter(p => p.status === 'OPEN')
  const closedPlaces = group.places.filter(p => p.status !== 'OPEN')
  const totalPlaces = group.places.length

  if (group.locationCountEstimate && totalPlaces === 0) {
    console.log(`\nLocation Count: ~${group.locationCountEstimate} (estimate, not yet linked)`)
  } else if (totalPlaces > 0) {
    if (closedPlaces.length > 0) {
      console.log(`\nLocation Count: ${openPlaces.length} open, ${closedPlaces.length} past (${totalPlaces} total)`)
    } else {
      console.log(`\nLocation Count: ${totalPlaces}`)
    }
  }

  // Sources
  const sources = group.sources as any[]
  console.log(`\nSources (${sources.length}):`)
  sources.forEach((source, idx) => {
    console.log(`\n  ${idx + 1}. ${source.type}`)
    console.log(`     ${source.description}`)
    if (source.url) {
      console.log(`     ${source.url}`)
    }
    console.log(`     Added: ${new Date(source.addedAt).toLocaleDateString()}`)
  })

  // Current (Open) Places
  if (openPlaces.length > 0) {
    console.log(`\nCurrent Places (${openPlaces.length}):`)
    console.log()
    openPlaces.forEach((place, idx) => {
      console.log(`  ${idx + 1}. ${place.name}`)
      if (place.neighborhood) {
        console.log(`     ${place.neighborhood}`)
      }
    })
  }

  // Past (Closed) Places
  if (closedPlaces.length > 0) {
    console.log(`\nPast Places (${closedPlaces.length}):`)
    console.log()
    closedPlaces.forEach((place, idx) => {
      const statusLabel = place.status === 'PERMANENTLY_CLOSED' ? 'permanently closed' : 'closed'
      console.log(`  ${idx + 1}. ${place.name} (${statusLabel})`)
      if (place.neighborhood) {
        console.log(`     ${place.neighborhood}`)
      }
    })
  }

  if (totalPlaces === 0) {
    console.log('\n⚠️  No places linked yet')
    console.log(`   Link places: npx tsx scripts/link-place-group.ts "<place-name>" "${group.name}"`)
  }

  // People
  if (group.people.length > 0) {
    console.log(`\nAffiliated People (${group.people.length}):`)
    console.log()
    group.people.forEach((person, idx) => {
      console.log(`  ${idx + 1}. ${person.name}`)
      console.log(`     ${formatPersonRole(person.role.toLowerCase() as any)}`)
    })
  }

  console.log('\n═'.repeat(80))
  console.log(`\nCreated: ${group.createdAt.toLocaleDateString()}`)
  console.log(`Updated: ${group.updatedAt.toLocaleDateString()}`)
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
