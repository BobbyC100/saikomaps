#!/usr/bin/env node
/**
 * View Person
 * Display person details and associated places
 */

import { db } from '@/lib/db'
import { formatPersonRole, formatPersonPlaceRole } from '@/lib/people-groups'

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('\nUsage: npx tsx scripts/view-person.ts "<name-or-slug>"')
    console.error('\nExamples:')
    console.error('  npx tsx scripts/view-person.ts "Nancy Silverton"')
    console.error('  npx tsx scripts/view-person.ts nancy-silverton\n')
    process.exit(1)
  }

  const search = args[0]

  // Find person
  const person = await db.person.findFirst({
    where: {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: search.toLowerCase() }
      ]
    },
    include: {
      restaurantGroup: true,
      personPlaces: {
        include: {
          place: true
        },
        orderBy: {
          current: 'desc'
        }
      }
    }
  })

  if (!person) {
    console.log(`\n❌ Person not found: "${search}"\n`)
    process.exit(1)
  }

  console.log('\n👤 PERSON DETAILS\n')
  console.log('═'.repeat(80))
  console.log(`\nName: ${person.name}`)
  console.log(`Slug: ${person.slug}`)
  console.log(`Role: ${formatPersonRole(person.role.toLowerCase() as any)}`)
  console.log(`Visibility: ${person.visibility.toLowerCase()}`)
  
  if (person.bio) {
    console.log(`\nBio: ${person.bio}`)
  }

  if (person.imageUrl) {
    console.log(`Image: ${person.imageUrl}`)
  }

  if (person.restaurantGroup) {
    console.log(`\nRestaurant Group: ${person.restaurantGroup.name}`)
  }

  // Sources
  const sources = person.sources as any[]
  console.log(`\nSources (${sources.length}):`)
  sources.forEach((source, idx) => {
    console.log(`\n  ${idx + 1}. ${source.type}`)
    console.log(`     ${source.description}`)
    if (source.url) {
      console.log(`     ${source.url}`)
    }
    console.log(`     Added: ${new Date(source.addedAt).toLocaleDateString()}`)
  })

  // Associated places
  if (person.personPlaces.length > 0) {
    console.log(`\nAssociated Places (${person.personPlaces.length}):`)
    console.log()

    const currentPlaces = person.personPlaces.filter(pp => pp.current)
    const formerPlaces = person.personPlaces.filter(pp => !pp.current)

    if (currentPlaces.length > 0) {
      console.log('  Current:')
      currentPlaces.forEach(pp => {
        console.log(`\n    • ${pp.place.name}`)
        console.log(`      Role: ${formatPersonPlaceRole(pp.role.toLowerCase().replace(/_/g, '-') as any)}`)
        if (pp.startYear) {
          console.log(`      Since: ${pp.startYear}`)
        }
        console.log(`      Source: ${pp.source}`)
      })
    }

    if (formerPlaces.length > 0) {
      console.log('\n  Former:')
      formerPlaces.forEach(pp => {
        console.log(`\n    • ${pp.place.name}`)
        console.log(`      Role: ${formatPersonPlaceRole(pp.role.toLowerCase().replace(/_/g, '-') as any)}`)
        if (pp.startYear && pp.endYear) {
          console.log(`      Period: ${pp.startYear}-${pp.endYear}`)
        } else if (pp.startYear) {
          console.log(`      Started: ${pp.startYear}`)
        }
        console.log(`      Source: ${pp.source}`)
      })
    }
  } else {
    console.log('\n⚠️  No associated places yet')
    console.log(`   Link places: npx tsx scripts/link-person-place.ts "${person.name}" "<place-name>"`)
  }

  console.log('\n═'.repeat(80))
  console.log(`\nCreated: ${person.createdAt.toLocaleDateString()}`)
  console.log(`Updated: ${person.updatedAt.toLocaleDateString()}`)
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
