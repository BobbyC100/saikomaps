#!/usr/bin/env node
/**
 * Link Person to Place
 * Creates association between person and place with role context
 */

import { db } from '@/lib/db'
import { validatePersonPlace, type PersonPlaceRole } from '@/lib/people-groups'

interface Args {
  personName: string
  placeName: string
  role?: PersonPlaceRole
  current?: boolean
  startYear?: number
  endYear?: number
  source?: string
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  
  if (args.length < 2 || args[0].startsWith('--') || args[1].startsWith('--')) {
    console.error('\nUsage: npx tsx scripts/link-person-place.ts "<person-name>" "<place-name>" [options]')
    console.error('\nOptions:')
    console.error('  --role <role>         executive-chef | owner | founder | former-chef | partner | operator')
    console.error('                        (default: executive-chef)')
    console.error('  --current <bool>      true | false (default: true)')
    console.error('  --start-year <year>   Year they started')
    console.error('  --end-year <year>     Year they left (only if not current)')
    console.error('  --source "<text>"     Attribution source (required)')
    console.error('\nExample:')
    console.error('  npx tsx scripts/link-person-place.ts "Nancy Silverton" "Mozza" \\')
    console.error('    --role founder \\')
    console.error('    --current true \\')
    console.error('    --start-year 2006 \\')
    console.error('    --source "Restaurant website"\n')
    process.exit(1)
  }

  const result: Args = {
    personName: args[0],
    placeName: args[1],
    role: 'executive-chef',
    current: true,
  }

  for (let i = 2; i < args.length; i++) {
    const arg = args[i]
    const value = args[i + 1]

    switch (arg) {
      case '--role':
        result.role = value as PersonPlaceRole
        i++
        break
      case '--current':
        result.current = value === 'true'
        i++
        break
      case '--start-year':
        result.startYear = parseInt(value)
        i++
        break
      case '--end-year':
        result.endYear = parseInt(value)
        i++
        break
      case '--source':
        result.source = value
        i++
        break
    }
  }

  return result
}

async function main() {
  const args = parseArgs()

  console.log('\n🔗 LINK PERSON TO PLACE\n')
  console.log('═'.repeat(80))

  // Find person
  const person = await db.person.findFirst({
    where: {
      OR: [
        { name: { contains: args.personName, mode: 'insensitive' } },
        { slug: args.personName.toLowerCase() }
      ]
    }
  })

  if (!person) {
    console.log(`\n❌ Person not found: "${args.personName}"`)
    console.log('   Add person first: npx tsx scripts/add-person.ts "<name>"\n')
    process.exit(1)
  }

  console.log(`\nPerson: ${person.name}`)

  // Find place
  const place = await db.places.findFirst({
    where: {
      OR: [
        { name: { contains: args.placeName, mode: 'insensitive' } },
        { slug: args.placeName.toLowerCase() }
      ]
    }
  })

  if (!place) {
    console.log(`\n❌ Place not found: "${args.placeName}"\n`)
    process.exit(1)
  }

  console.log(`Place: ${place.name}`)

  // Check if association already exists
  const existing = await db.personPlace.findUnique({
    where: {
      personId_placeId_role: {
        personId: person.id,
        placeId: place.id,
        role: args.role!.toUpperCase().replace(/-/g, '_') as any
      }
    }
  })

  if (existing) {
    console.log('\n❌ This association already exists')
    console.log(`   Person: ${person.name}`)
    console.log(`   Place: ${place.name}`)
    console.log(`   Role: ${args.role}`)
    console.log('\nUse view-person.ts to see all associations\n')
    process.exit(1)
  }

  // Validate source
  if (!args.source) {
    console.log('\n❌ Error: --source is required')
    process.exit(1)
  }

  console.log(`Role: ${args.role}`)
  console.log(`Current: ${args.current}`)
  if (args.startYear) console.log(`Start Year: ${args.startYear}`)
  if (args.endYear) console.log(`End Year: ${args.endYear}`)
  console.log(`Source: ${args.source}`)

  // Build association
  const association = {
    personId: person.id,
    placeId: place.id,
    role: args.role!.toUpperCase().replace(/-/g, '_') as any,
    current: args.current!,
    startYear: args.startYear,
    endYear: args.endYear,
    source: args.source,
  }

  // Validate
  const validation = validatePersonPlace(association as any)
  if (!validation.valid) {
    console.log('\n❌ Validation failed:')
    validation.errors.forEach(err => console.log(`   ${err}`))
    console.log()
    process.exit(1)
  }

  // Create association
  const created = await db.personPlace.create({
    data: association
  })

  console.log('\n✅ Association created successfully!')
  console.log(`\n   ID: ${created.id}`)
  console.log(`   Person: ${person.name}`)
  console.log(`   Place: ${place.name}`)
  console.log(`   Role: ${created.role}`)
  
  console.log('\n═'.repeat(80))
  console.log('\nNext steps:')
  console.log(`1. View person: npx tsx scripts/view-person.ts "${person.name}"`)
  console.log(`2. Add more associations: npx tsx scripts/link-person-place.ts "${person.name}" "<another-place>"`)
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
