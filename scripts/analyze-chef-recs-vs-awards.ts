#!/usr/bin/env node
/**
 * Analyze Chef Recs vs Awards Coverage
 * Show divergence between practitioner recommendations and critic awards
 */

import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import type { ChefRec } from '@/lib/chef-recs'

async function main() {
  console.log('\n🔍 CHEF RECS vs AWARDS ANALYSIS\n')
  console.log('═'.repeat(80))

  const placesWithChefRecs = await db.places.findMany({
    where: {
      chefRecs: {
        not: Prisma.DbNull
      }
    },
    select: {
      name: true,
      neighborhood: true,
      category: true,
      editorialSources: true,
      chefRecs: true,
    },
    orderBy: {
      name: 'asc'
    }
  })

  console.log(`\nAnalyzing ${placesWithChefRecs.length} places with Chef Recs...\n`)

  const withAwards: any[] = []
  const withoutAwards: any[] = []

  for (const place of placesWithChefRecs) {
    const sources = (place.editorialSources as any[]) || []
    const chefRecs = (place.chefRecs as unknown as ChefRec[]) || []
    
    // Check for award sources
    const hasMichelin = sources.some(s => s.name?.includes('Michelin'))
    const hasEater = sources.some(s => s.name?.includes('Eater'))
    const hasInfatuation = sources.some(s => s.name?.includes('Infatuation'))
    const hasAwards = hasMichelin || hasEater || hasInfatuation
    
    const data = {
      place,
      chefRecCount: chefRecs.length,
      hasMichelin,
      hasEater,
      hasInfatuation,
      chefs: chefRecs.map(r => `${r.personName}${r.fromRestaurant ? ` (${r.fromRestaurant})` : ''}`),
    }
    
    if (hasAwards) {
      withAwards.push(data)
    } else {
      withoutAwards.push(data)
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('PLACES WITH BOTH CHEF RECS + AWARDS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log(`Found ${withAwards.length} places\n`)

  withAwards.forEach(data => {
    console.log(`${data.place.name}`)
    console.log(`  ${data.place.neighborhood || 'Location unknown'}`)
    console.log(`  ${data.chefRecCount} Chef Rec${data.chefRecCount > 1 ? 's' : ''} | ${[
      data.hasMichelin && 'Michelin',
      data.hasEater && 'Eater',
      data.hasInfatuation && 'Infatuation'
    ].filter(Boolean).join(', ')}`)
    console.log(`  Chefs: ${data.chefs.join(', ')}`)
    console.log('')
  })

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('⭐ PLACES WITH CHEF RECS BUT NO AWARDS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log(`Found ${withoutAwards.length} places`)
  console.log('(These are "insider picks" - respected by practitioners but not critics)\n')

  withoutAwards.forEach(data => {
    console.log(`${data.place.name}`)
    console.log(`  ${data.place.neighborhood || 'Location unknown'}`)
    console.log(`  ${data.chefRecCount} Chef Rec${data.chefRecCount > 1 ? 's' : ''}`)
    console.log(`  Chefs: ${data.chefs.join(', ')}`)
    console.log('')
  })

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('KEY INSIGHTS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const pctWithAwards = Math.round((withAwards.length / placesWithChefRecs.length) * 100)
  const pctWithoutAwards = Math.round((withoutAwards.length / placesWithChefRecs.length) * 100)

  console.log(`${pctWithAwards}% of chef-recommended places also have award coverage`)
  console.log(`${pctWithoutAwards}% of chef-recommended places have NO award coverage\n`)
  
  console.log('This divergence shows:')
  console.log('  • Chefs eat at different places than critics award')
  console.log('  • Practitioner knowledge captures hidden gems')
  console.log('  • Awards don\'t fully represent culinary community respect')
  console.log('  • Chef Recs surface "insider" spots\n')

  console.log('═'.repeat(80))
}

main()
  .catch((error) => {
    console.error('❌ Error:', error.message)
    process.exit(1)
  })
  .finally(() => {
    db.$disconnect()
  })
