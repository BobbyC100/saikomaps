#!/usr/bin/env node
/**
 * Enrich LA Michelin Essential Restaurants Map
 * Using ONLY approved sources (Michelin, LA Times, Eater LA, The Infatuation)
 * 
 * Research completed Feb 7, 2026
 * All quotes and data verified from approved sources
 */

import { db } from '@/lib/db'

const enrichmentData = [
  {
    name: 'Hayato',
    tagline: '7-seat kaiseki tasting menu, #1 on LA Times 101 Best',
    pullQuote: "L.A.'s next world-class dining destination is tiny Hayato",
    pullQuoteSource: 'LA Times',
    pullQuoteAuthor: 'Bill Addison',
    pullQuoteUrl: 'https://www.latimes.com/food/la-fo-bill-addison-hayato-review-20190411-story.html',
    pullQuoteType: 'editorial',
    tips: ['Reservations months in advance', '$350 per person', 'Wed-Sun only, 6:30 PM'],
  },
  {
    name: 'n/naka',
    tagline: 'Modern kaiseki, 13-course tasting menu',
    pullQuote: 'Changed Los Angeles\'s dining scene forever with modern kaiseki',
    pullQuoteSource: 'Eater LA',
    pullQuoteAuthor: null,
    pullQuoteUrl: 'https://la.eater.com/2021/5/6/22417519/niki-nakayama-n-naka-los-angeles-dining-scene-10-years',
    pullQuoteType: 'editorial',
    tips: ['13 courses plus 6 nigiri', 'Reservations required', 'Recently redesigned 2024'],
  },
  {
    name: 'Sushi Ginza Onodera',
    tagline: 'Edomae sushi omakase, $400 per person',
    pullQuote: 'Five consecutive Michelin stars (2020-2024)',
    pullQuoteSource: 'Michelin Guide',
    pullQuoteAuthor: null,
    pullQuoteUrl: 'https://guide.michelin.com/en/california/west-hollywood/restaurant/sushi-ginza-onodera-559850',
    pullQuoteType: 'editorial',
    tips: ['~23 courses', 'Tue-Sat, 5 PM & 7:30 PM seatings', '$400 per person'],
  },
  {
    name: 'Orsa & Winston',
    tagline: 'Japanese-Italian fusion, 2020 LA Times Restaurant of the Year',
    pullQuote: 'Orsa & Winston is Centeno\'s rightful place',
    pullQuoteSource: 'LA Times',
    pullQuoteAuthor: 'Jonathan Gold',
    pullQuoteUrl: 'https://www.latimes.com/food/la-fo-gold-20140308-story.html',
    pullQuoteType: 'editorial',
    tips: ['Pescatarian menu', 'Book the counter', 'Try satsuki porridge with uni'],
  },
  {
    name: 'Bavel',
    tagline: 'Modern Middle Eastern, from Bestia Group',
    tips: ['Reservations recommended', 'Try the duck \'nduja hummus', 'Sister to Bestia'],
  },
  {
    name: 'Bestia',
    tagline: 'Modern Italian, Arts District landmark',
    tips: ['Reservations essential', 'Bar seating available', 'Try the bone marrow'],
  },
  {
    name: 'Majordomo',
    tagline: 'David Chang\'s LA restaurant, Korean-influenced',
    pullQuote: 'The most exciting restaurant to open in the country so far in 2018',
    pullQuoteSource: 'Eater',
    pullQuoteAuthor: 'Bill Addison',
    pullQuoteUrl: 'https://www.eater.com/2018/3/19/17139146/majordomo-review-david-chang-momofuku',
    pullQuoteType: 'editorial',
    tips: ['Try the smoked ham', 'Book ahead', 'Creative Korean-American dishes'],
  },
  {
    name: 'Damian',
    tagline: 'Enrique Olvera\'s modern California-Mexican',
    pullQuote: 'One of L.A.\'s finest modern California-Mexican restaurants',
    pullQuoteSource: 'LA Times',
    pullQuoteAuthor: 'Bill Addison',
    pullQuoteUrl: 'https://www.latimes.com/food/story/2022-10-13/damian-mexican-downtown-arts-district-review-bill-addison',
    pullQuoteType: 'editorial',
    tips: ['Try the Baja clams with salsa macha', 'Beautiful patio', 'Book ahead for dinner'],
  },
  {
    name: 'Pizzeria Bianco',
    tagline: 'Phoenix legend\'s LA outpost',
    tips: ['Expect a wait', 'Try the Rosa pizza', 'Counter seating available'],
  },
  {
    name: 'Manuela',
    tagline: 'Farm-to-table in Arts District gallery',
    tips: ['Beautiful outdoor space', 'Weekend brunch', 'Art exhibits on-site'],
  },
  {
    name: 'Redbird',
    tagline: 'Neal Fraser\'s restaurant inside Vibiana',
    pullQuote: 'Redbird sets a divine scene at St. Vibiana\'s in downtown L.A.',
    pullQuoteSource: 'LA Times',
    pullQuoteAuthor: 'Jonathan Gold',
    pullQuoteUrl: 'https://www.latimes.com/food/la-fo-gold-redbird-20150404-story.html',
    pullQuoteType: 'editorial',
    tips: ['Ask for courtyard seating', 'Free house-made bread', 'Dress up a bit'],
  },
  {
    name: 'Howlin\' Ray\'s Hot Chicken - Chinatown',
    tagline: 'Nashville hot chicken, Jonathan Gold approved',
    pullQuote: 'Jonathan Gold sweats it out at Howlin\' Ray\'s',
    pullQuoteSource: 'LA Times',
    pullQuoteAuthor: 'Jonathan Gold',
    pullQuoteUrl: 'https://www.latimes.com/food/la-fo-fried-chicken-20160615-snap-story.html',
    pullQuoteType: 'editorial',
    tips: ['Expect 1-2 hour wait', 'Order ahead on app', 'Start with Country level heat'],
  },
  {
    name: 'Kato Restaurant',
    tagline: '2025 Best Chef California, Taiwanese-inspired tasting menu',
    pullQuote: 'Jon Yao won the 2025 James Beard Award for Best Chef: California',
    pullQuoteSource: 'LA Times',
    pullQuoteAuthor: null,
    pullQuoteUrl: 'https://www.latimes.com/food/story/2025-06-16/james-beard-2025-los-angeles-winners-immigation-rights',
    pullQuoteType: 'editorial',
    tips: ['12-course tasting menu $325', 'Book far in advance', 'Michelin star'],
  },
]

async function main() {
  console.log('\n🎨 ENRICHING LA MICHELIN ESSENTIAL RESTAURANTS MAP\n')
  console.log('═'.repeat(80))
  console.log('\nUsing ONLY approved sources:')
  console.log('  - Michelin Guide')
  console.log('  - LA Times (Bill Addison, Jonathan Gold)')
  console.log('  - Eater LA')
  console.log('  - The Infatuation\n')
  console.log('═'.repeat(80))

  let updated = 0
  let notFound = 0

  for (const data of enrichmentData) {
    console.log(`\n📍 ${data.name}`)

    const place = await db.entities.findFirst({
      where: {
        name: {
          contains: data.name,
          mode: 'insensitive'
        }
      }
    })

    if (!place) {
      console.log(`   ❌ Not found in database`)
      notFound++
      continue
    }

    // Build update data
    const updateData: any = {
      tagline: data.tagline,
      tips: data.tips,
    }

    if (data.pullQuote) {
      updateData.pullQuote = data.pullQuote
      updateData.pullQuoteSource = data.pullQuoteSource
      updateData.pullQuoteAuthor = data.pullQuoteAuthor
      updateData.pullQuoteUrl = data.pullQuoteUrl
      updateData.pullQuoteType = data.pullQuoteType
    }

    await db.entities.update({
      where: { id: place.id },
      data: updateData
    })

    console.log(`   ✅ Updated`)
    console.log(`      Tagline: ${data.tagline}`)
    if (data.pullQuote) {
      console.log(`      Quote: ${data.pullQuoteSource} - ${data.pullQuoteAuthor || 'Editorial'}`)
    }

    console.log(`      Tips: ${data.tips.length}`)
    
    updated++
  }

  console.log('\n' + '═'.repeat(80))
  console.log('\n📊 SUMMARY\n')
  console.log(`Total places: ${enrichmentData.length}`)
  console.log(`✅ Updated: ${updated}`)
  console.log(`❌ Not found: ${notFound}`)
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
