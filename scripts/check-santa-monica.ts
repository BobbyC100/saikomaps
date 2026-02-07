/**
 * Diagnostic: Check Santa Monica Coverage
 */

import { db } from '@/lib/db'

async function main() {
  console.log('🔍 SANTA MONICA DIAGNOSTIC\n')
  console.log('═'.repeat(80))

  // Check Santa Monica map
  const santaMonicaMap = await db.list.findFirst({
    where: {
      title: {
        contains: 'Santa Monica',
        mode: 'insensitive'
      }
    },
    include: {
      mapPlaces: {
        include: {
          place: true
        }
      }
    }
  })

  if (santaMonicaMap) {
    console.log(`\n📍 Found map: "${santaMonicaMap.title}"`)
    console.log(`   Places on map: ${santaMonicaMap.mapPlaces.length}\n`)
    
    console.log('Places and their neighborhoods:')
    santaMonicaMap.mapPlaces.forEach(mp => {
      console.log(`  • ${mp.place.name}`)
      console.log(`    Neighborhood: ${mp.place.neighborhood || 'NULL'}`)
      console.log(`    Address: ${mp.place.address}\n`)
    })
  }

  // Search for places with Santa Monica in address
  const placesWithSM = await db.place.findMany({
    where: {
      address: {
        contains: 'Santa Monica',
        mode: 'insensitive'
      }
    },
    select: {
      name: true,
      address: true,
      neighborhood: true,
    }
  })

  console.log(`\n📍 Places with "Santa Monica" in address: ${placesWithSM.length}\n`)
  
  placesWithSM.forEach(p => {
    console.log(`  • ${p.name}`)
    console.log(`    Neighborhood field: "${p.neighborhood}"`)
    console.log(`    Address: ${p.address}\n`)
  })

  // Check all unique neighborhoods
  const allPlaces = await db.place.findMany({
    select: {
      neighborhood: true,
    }
  })

  const neighborhoods = new Map<string, number>()
  allPlaces.forEach(p => {
    const n = p.neighborhood || 'NULL'
    neighborhoods.set(n, (neighborhoods.get(n) || 0) + 1)
  })

  const sorted = Array.from(neighborhoods.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)

  console.log('\n📊 Top 50 Neighborhoods:\n')
  sorted.forEach(([name, count], i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${name.padEnd(35)} ${count} places`)
  })
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
