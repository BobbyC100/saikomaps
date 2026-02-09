#!/usr/bin/env node
/**
 * Find places for restaurant groups
 */

import { db } from '@/lib/db'

async function main() {
  // Last Word Hospitality places
  console.log('\n🔍 LAST WORD HOSPITALITY PLACES:\n')
  
  const lwPlaces = await db.place.findMany({
    where: {
      OR: [
        { name: { contains: 'Found Oyster', mode: 'insensitive' } },
        { name: { contains: 'Rasarumah', mode: 'insensitive' } },
        { name: { contains: 'Copper Room', mode: 'insensitive' } }
      ]
    },
    select: { id: true, name: true, neighborhood: true }
  })
  
  if (lwPlaces.length > 0) {
    lwPlaces.forEach(p => console.log(`  ✓ ${p.name} (${p.neighborhood || 'no neighborhood'})`))
  } else {
    console.log('  ⚠️  No places found')
  }
  
  // Rustic Canyon Family places
  console.log('\n🔍 RUSTIC CANYON FAMILY PLACES:\n')
  
  const rcPlaces = await db.place.findMany({
    where: {
      OR: [
        { name: { contains: 'Rustic Canyon', mode: 'insensitive' } },
        { name: { contains: 'Cassia', mode: 'insensitive' } },
        { name: { contains: 'Esters', mode: 'insensitive' } },
        { name: { contains: 'Milo', mode: 'insensitive' } },
        { name: { contains: 'Tallula', mode: 'insensitive' } }
      ]
    },
    select: { id: true, name: true, neighborhood: true }
  })
  
  if (rcPlaces.length > 0) {
    rcPlaces.forEach(p => console.log(`  ✓ ${p.name} (${p.neighborhood || 'no neighborhood'})`))
  } else {
    console.log('  ⚠️  No places found')
  }
  
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
