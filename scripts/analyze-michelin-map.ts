#!/usr/bin/env node
/**
 * Analyze LA Michelin Map - Check what data is missing
 */

import { db } from '@/lib/db'

async function main() {
  const slug = 'la-michelin-essential-restaurants-1770427481342'
  
  const list = await db.lists.findFirst({
    where: { slug },
    include: {
      mapPlaces: {
        include: {
          place: {
            include: {
              restaurantGroup: true
            }
          }
        },
        orderBy: { orderIndex: 'asc' }
      }
    }
  })

  if (!list) {
    console.log('❌ Map not found')
    process.exit(1)
  }

  console.log(`\n📍 ${list.title}`)
  console.log(`   ${list.mapPlaces.length} places\n`)
  console.log('═'.repeat(80))

  list.mapPlaces.forEach((mp, idx) => {
    const p = mp.place
    const missing = []
    
    if (!p.tagline) missing.push('tagline')
    if (!p.pullQuote) missing.push('pullQuote')
    if (!p.vibeTags || p.vibeTags.length === 0) missing.push('vibeTags')
    if (!p.tips || p.tips.length === 0) missing.push('tips')
    if (!p.chefRecs) missing.push('chefRecs')
    if (!p.restaurantGroupId) missing.push('restaurantGroup')
    
    console.log(`\n${idx + 1}. ${p.name}`)
    console.log(`   ${p.neighborhood || 'No neighborhood'}`)
    
    if (p.restaurantGroup) {
      console.log(`   ✅ Group: ${p.restaurantGroup.name}`)
    }
    
    if (p.tagline) {
      console.log(`   ✅ Tagline: ${p.tagline}`)
    }
    
    if (p.pullQuote) {
      console.log(`   ✅ Pull Quote from ${p.pullQuoteSource}`)
    }
    
    if (p.vibeTags && p.vibeTags.length > 0) {
      console.log(`   ✅ Vibe Tags: ${p.vibeTags.join(', ')}`)
    }
    
    if (p.tips && p.tips.length > 0) {
      console.log(`   ✅ Tips: ${p.tips.length} tips`)
    }
    
    const chefRecs = (p.chefRecs as any[]) || []
    if (chefRecs.length > 0) {
      console.log(`   ✅ Chef Recs: ${chefRecs.length} recommendations`)
    }
    
    if (missing.length > 0) {
      console.log(`   ⚠️  Missing: ${missing.join(', ')}`)
    }
  })

  console.log('\n' + '═'.repeat(80))
  
  // Summary
  const stats = {
    total: list.mapPlaces.length,
    withTagline: 0,
    withPullQuote: 0,
    withVibeTags: 0,
    withTips: 0,
    withChefRecs: 0,
    withGroup: 0
  }
  
  list.mapPlaces.forEach(mp => {
    const p = mp.place
    if (p.tagline) stats.withTagline++
    if (p.pullQuote) stats.withPullQuote++
    if (p.vibeTags && p.vibeTags.length > 0) stats.withVibeTags++
    if (p.tips && p.tips.length > 0) stats.withTips++
    if (p.chefRecs && (p.chefRecs as any[]).length > 0) stats.withChefRecs++
    if (p.restaurantGroupId) stats.withGroup++
  })
  
  console.log('\n📊 COVERAGE SUMMARY\n')
  console.log(`Taglines:       ${stats.withTagline}/${stats.total} (${Math.round(stats.withTagline/stats.total*100)}%)`)
  console.log(`Pull Quotes:    ${stats.withPullQuote}/${stats.total} (${Math.round(stats.withPullQuote/stats.total*100)}%)`)
  console.log(`Vibe Tags:      ${stats.withVibeTags}/${stats.total} (${Math.round(stats.withVibeTags/stats.total*100)}%)`)
  console.log(`Tips:           ${stats.withTips}/${stats.total} (${Math.round(stats.withTips/stats.total*100)}%)`)
  console.log(`Chef Recs:      ${stats.withChefRecs}/${stats.total} (${Math.round(stats.withChefRecs/stats.total*100)}%)`)
  console.log(`Groups:         ${stats.withGroup}/${stats.total} (${Math.round(stats.withGroup/stats.total*100)}%)`)
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
