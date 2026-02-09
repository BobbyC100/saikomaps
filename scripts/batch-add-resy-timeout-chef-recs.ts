#!/usr/bin/env node
/**
 * Batch Add Chef Recs from Resy & Timeout LA Articles
 * Source 1: "What Chefs Love About L.A." — Resy, Sept. 19, 2024
 * Source 2: "The chefs behind six of L.A.'s hottest restaurants share their top picks for late-night eats" — Timeout LA, July 21, 2025
 */

import { db } from '@/lib/db'
import { createChefRec, validateChefRec } from '@/lib/chef-recs'

const RESY_URL = 'https://blog.resy.com/2024/09/what-chefs-love-about-la/'
const RESY_TITLE = 'What Chefs Love About L.A.'
const RESY_DATE = '2024-09-19'

const TIMEOUT_URL = 'https://www.timeout.com/los-angeles/news/the-chefs-behind-five-of-l-a-s-hottest-restaurants-share-their-top-picks-for-late-night-eats-072125'
const TIMEOUT_TITLE = 'The chefs behind six of L.A.\'s hottest restaurants share their top picks for late-night eats'
const TIMEOUT_DATE = '2025-07-21'

// Chef recommendations from both articles
const recommendations = [
  // ========== RESY ARTICLE ==========
  
  // Nico de Leon (Lasita)
  { place: "Yang's Kitchen", chef: 'Nico de Leon', from: 'Lasita', source: 'resy' },
  { place: 'Azizam', chef: 'Nico de Leon', from: 'Lasita', source: 'resy' },
  { place: 'Dunsmoor', chef: 'Nico de Leon', from: 'Lasita', source: 'resy' },
  { place: "Here's Looking At You", chef: 'Nico de Leon', from: 'Lasita', source: 'resy' },
  { place: 'Sapp Coffee Shop', chef: 'Nico de Leon', from: 'Lasita', source: 'resy' },
  
  // Chase Sinzer (Claud & Penny, NYC)
  { place: 'Gjusta', chef: 'Chase Sinzer', from: 'Claud and Penny (NYC)', source: 'resy', quote: 'The second I get off the plane, I am calling a rideshare from the LAX-It lot to Gjusta' },
  { place: 'Found Oyster', chef: 'Chase Sinzer', from: 'Claud and Penny (NYC)', source: 'resy' },
  { place: 'Holbox', chef: 'Chase Sinzer', from: 'Claud and Penny (NYC)', source: 'resy' },
  { place: 'Mariscos Jalisco', chef: 'Chase Sinzer', from: 'Claud and Penny (NYC)', source: 'resy' },
  { place: 'Dunsmoor', chef: 'Chase Sinzer', from: 'Claud and Penny (NYC)', source: 'resy' },
  { place: 'Quarter Sheets', chef: 'Chase Sinzer', from: 'Claud and Penny (NYC)', source: 'resy' },
  { place: 'Antico Nuovo', chef: 'Chase Sinzer', from: 'Claud and Penny (NYC)', source: 'resy' },
  { place: 'Baroo', chef: 'Chase Sinzer', from: 'Claud and Penny (NYC)', source: 'resy' },
  { place: 'Chi Spacca', chef: 'Chase Sinzer', from: 'Claud and Penny (NYC)', source: 'resy' },
  
  // Joshua Pinsky (Claud & Penny, NYC)
  { place: 'Dunsmoor', chef: 'Joshua Pinsky', from: 'Claud and Penny (NYC)', source: 'resy', quote: 'The pork stew with cheddar is fantastic' },
  { place: 'Queen St.', chef: 'Joshua Pinsky', from: 'Claud and Penny (NYC)', source: 'resy', quote: 'The raw bar was a great place to post up for a leisurely snack' },
  { place: 'Sunset Tower', chef: 'Joshua Pinsky', from: 'Claud and Penny (NYC)', source: 'resy', quote: 'My ideal L.A. evening probably starts with a martini at Sunset Tower' },
  { place: 'HMS Bounty', chef: 'Joshua Pinsky', from: 'Claud and Penny (NYC)', source: 'resy' },
  { place: 'The Prince', chef: 'Joshua Pinsky', from: 'Claud and Penny (NYC)', source: 'resy' },
  
  // Bryant Ng (Cassia)
  { place: 'Yunnan Restaurant', chef: 'Bryant Ng', from: 'Cassia', source: 'resy', quote: 'Their Chungking fried chicken cubes (a.k.a. La Zi Ji popcorn chicken) is the best version of this dish I\'ve ever had' },
  { place: 'PP Pop', chef: 'Bryant Ng', from: 'Cassia', source: 'resy', quote: 'We probably eat here once every two weeks' },
  { place: 'Menya Hanabi', chef: 'Bryant Ng', from: 'Cassia', source: 'resy', quote: 'This place reminds us most of some places we love in Tokyo' },
  { place: "Dolan's Uyghur Cuisine", chef: 'Bryant Ng', from: 'Cassia', source: 'resy', quote: "It's hard to find Uyghur cuisine in general and Dolan's is the best" },
  
  // Johanna Luat (Cassia)
  { place: 'Olympic Noodle', chef: 'Johanna Luat', from: 'Cassia', source: 'resy', quote: 'When my parents come to visit, we always end up at Olympic Noodle' },
  { place: 'Avenue 26 Tacos', chef: 'Johanna Luat', from: 'Cassia', source: 'resy' },
  
  // Christina Nguyen (Hai Hai and Hola Arepa, Minneapolis)
  { place: 'Jitlada', chef: 'Christina Nguyen', from: 'Hai Hai and Hola Arepa (Minneapolis)', source: 'resy' },
  { place: 'Night + Market', chef: 'Christina Nguyen', from: 'Hai Hai and Hola Arepa (Minneapolis)', source: 'resy' },
  { place: "Park's BBQ", chef: 'Christina Nguyen', from: 'Hai Hai and Hola Arepa (Minneapolis)', source: 'resy' },
  { place: "Birdie G's", chef: 'Christina Nguyen', from: 'Hai Hai and Hola Arepa (Minneapolis)', source: 'resy' },
  { place: 'Felix Trattoria', chef: 'Christina Nguyen', from: 'Hai Hai and Hola Arepa (Minneapolis)', source: 'resy' },
  { place: 'Brodard', chef: 'Christina Nguyen', from: 'Hai Hai and Hola Arepa (Minneapolis)', source: 'resy' },
  
  // Johnny Cirelle (The Benjamin)
  { place: 'Bestia', chef: 'Johnny Cirelle', from: 'The Benjamin', source: 'resy' },
  { place: 'Tsubaki', chef: 'Johnny Cirelle', from: 'The Benjamin', source: 'resy' },
  { place: 'Dunsmoor', chef: 'Johnny Cirelle', from: 'The Benjamin', source: 'resy' },
  { place: 'Hama Sushi', chef: 'Johnny Cirelle', from: 'The Benjamin', source: 'resy' },
  { place: 'Barra Santos', chef: 'Johnny Cirelle', from: 'The Benjamin', source: 'resy' },
  
  // Frankie Olivieri (Pat's King of Steaks, Philadelphia)
  { place: "Pink's Hot Dogs", chef: 'Frankie Olivieri', from: "Pat's King of Steaks (Philadelphia)", source: 'resy' },
  { place: 'Polo Lounge', chef: 'Frankie Olivieri', from: "Pat's King of Steaks (Philadelphia)", source: 'resy' },
  { place: 'Pizzeria Mozza', chef: 'Frankie Olivieri', from: "Pat's King of Steaks (Philadelphia)", source: 'resy' },
  { place: "Joan's on Third", chef: 'Frankie Olivieri', from: "Pat's King of Steaks (Philadelphia)", source: 'resy' },
  
  // Jeremy Fox (Rustic Canyon Group)
  { place: 'Otafuku', chef: 'Jeremy Fox', from: 'Rustic Canyon Group', source: 'resy' },
  { place: 'Musso & Frank', chef: 'Jeremy Fox', from: 'Rustic Canyon Group', source: 'resy' },
  { place: 'Dunsmoor', chef: 'Jeremy Fox', from: 'Rustic Canyon Group', source: 'resy' },
  { place: 'Tsujita Annex', chef: 'Jeremy Fox', from: 'Rustic Canyon Group', source: 'resy' },
  { place: 'Ronan', chef: 'Jeremy Fox', from: 'Rustic Canyon Group', source: 'resy' },
  { place: 'Sqirl', chef: 'Jeremy Fox', from: 'Rustic Canyon Group', source: 'resy' },
  
  // Elijah Deleon (Rustic Canyon)
  { place: 'Dan Sung Sa', chef: 'Elijah Deleon', from: 'Rustic Canyon', source: 'resy' },
  { place: 'Ototo', chef: 'Elijah Deleon', from: 'Rustic Canyon', source: 'resy' },
  { place: 'Destroyer', chef: 'Elijah Deleon', from: 'Rustic Canyon', source: 'resy' },
  { place: "Leo's Tacos", chef: 'Elijah Deleon', from: 'Rustic Canyon', source: 'resy' },
  
  // Claudette Zepeda (Chispa Hospitality, San Diego)
  { place: 'Night + Market', chef: 'Claudette Zepeda', from: 'Chispa Hospitality (San Diego)', source: 'resy' },
  { place: 'Dama', chef: 'Claudette Zepeda', from: 'Chispa Hospitality (San Diego)', source: 'resy' },
  { place: 'Gjelina', chef: 'Claudette Zepeda', from: 'Chispa Hospitality (San Diego)', source: 'resy' },
  { place: 'Gjusta', chef: 'Claudette Zepeda', from: 'Chispa Hospitality (San Diego)', source: 'resy' },
  { place: 'Pizzeria Bianco', chef: 'Claudette Zepeda', from: 'Chispa Hospitality (San Diego)', source: 'resy' },
  { place: 'Felix Trattoria', chef: 'Claudette Zepeda', from: 'Chispa Hospitality (San Diego)', source: 'resy' },
  { place: 'Sonoratown', chef: 'Claudette Zepeda', from: 'Chispa Hospitality (San Diego)', source: 'resy' },
  
  // Chris Shepherd (Southern Smoke Foundation, Houston)
  { place: 'Pizzeria Bianco', chef: 'Chris Shepherd', from: 'Southern Smoke Foundation (Houston)', source: 'resy' },
  { place: 'Bavel', chef: 'Chris Shepherd', from: 'Southern Smoke Foundation (Houston)', source: 'resy' },
  { place: 'Burritos La Palma', chef: 'Chris Shepherd', from: 'Southern Smoke Foundation (Houston)', source: 'resy' },
  { place: "Park's BBQ", chef: 'Chris Shepherd', from: 'Southern Smoke Foundation (Houston)', source: 'resy' },
  { place: 'Yangban', chef: 'Chris Shepherd', from: 'Southern Smoke Foundation (Houston)', source: 'resy', quote: 'I really want to eat at Yangban' },
  { place: 'Yeastie Boys Bagels', chef: 'Chris Shepherd', from: 'Southern Smoke Foundation (Houston)', source: 'resy' },
  
  // ========== TIMEOUT LA ARTICLE ==========
  
  // Alan Sanz (Daisy Margarita Bar / Mírate)
  { place: 'Normandie Club', chef: 'Alan Sanz', from: 'Daisy Margarita Bar / Mírate', source: 'timeout', quote: 'After the shift, I really like to go to the Normandie Club for a drink' },
  { place: "Johnny's Bar", chef: 'Alan Sanz', from: 'Daisy Margarita Bar / Mírate', source: 'timeout' },
  { place: 'Jones', chef: 'Alan Sanz', from: 'Daisy Margarita Bar / Mírate', source: 'timeout', quote: 'Sometimes we go to Jones for pizza and their martinis' },
  
  // Michael Leonard (Beethoven Market)
  { place: 'In-N-Out Burger', chef: 'Michael Leonard', from: 'Beethoven Market', source: 'timeout', quote: 'Probably, my go-to is In-N-Out. Extremely reliable, consistent and open until what, 2am?' },
  { place: 'Not No Bar', chef: 'Michael Leonard', from: 'Beethoven Market', source: 'timeout' },
  { place: 'Wurstküche', chef: 'Michael Leonard', from: 'Beethoven Market', source: 'timeout', quote: 'They have a great rattlesnake and rabbit brat' },
  
  // Miles Thompson (Baby Bistro)
  { place: 'Dan Sung Sa', chef: 'Miles Thompson', from: 'Baby Bistro', source: 'timeout', quote: 'The classic L.A. place to go is Dan Sung Sa' },
  { place: 'Ruen Pair', chef: 'Miles Thompson', from: 'Baby Bistro', source: 'timeout', quote: "I've lived in L.A. almost 15 years and I've been [to Ruen Pair] over 150 times" },
  { place: 'The Prince', chef: 'Miles Thompson', from: 'Baby Bistro', source: 'timeout' },
  { place: 'Bar Henry', chef: 'Miles Thompson', from: 'Baby Bistro', source: 'timeout' },
  
  // Adam Leonti (Alba LA)
  { place: 'Jones', chef: 'Adam Leonti', from: 'Alba LA', source: 'timeout', quote: 'I usually have a Manhattan and I\'ll get the New York strip. It\'s actually quite good' },
  { place: 'Canter\'s Deli', chef: 'Adam Leonti', from: 'Alba LA', source: 'timeout', quote: 'The Kibbitz Room at Canter\'s is pretty cool' },
  { place: 'Capri Club', chef: 'Adam Leonti', from: 'Alba LA', source: 'timeout' },
  { place: "Lala's Argentine Grill", chef: 'Adam Leonti', from: 'Alba LA', source: 'timeout', quote: 'I usually get a double order of sweetbreads, grilled, and drink half a bottle of Malbec' },
  
  // Adrian Forte (Lucia)
  { place: 'Chris N Eddy\'s', chef: 'Adrian Forte', from: 'Lucia', source: 'timeout', quote: 'I love Chris N Eddy\'s. Crispy edged patties, melted cheese' },
  { place: 'Tatsu Ramen', chef: 'Adrian Forte', from: 'Lucia', source: 'timeout', quote: 'The broth is flavorful. It\'s on the way home. Easy, convenient and always gonna be delicious' },
  
  // Giles Clark (Cafe 2001)
  { place: 'Capri Club', chef: 'Giles Clark', from: 'Cafe 2001', source: 'timeout' },
  { place: 'Walt\'s Bar', chef: 'Giles Clark', from: 'Cafe 2001', source: 'timeout', quote: 'Finish off the evening with a Hamm\'s beer and a hot dog' },
  { place: 'Byul Gobchang', chef: 'Giles Clark', from: 'Cafe 2001', source: 'timeout', quote: 'Koreatown... for intestine barbecue' },
  { place: 'The Prince', chef: 'Giles Clark', from: 'Cafe 2001', source: 'timeout' },
  { place: 'HMS Bounty', chef: 'Giles Clark', from: 'Cafe 2001', source: 'timeout' },
  { place: 'Jay Dee', chef: 'Giles Clark', from: 'Cafe 2001', source: 'timeout', quote: "There aren't many places in L.A. that feel like a neighborhood bar. It reminds me of nice old pubs in the UK" },
]

async function main() {
  console.log('\n🎯 BATCH ADD CHEF RECS: Resy & Timeout LA Articles\n')
  console.log('═'.repeat(80))
  console.log(`\nSource 1: ${RESY_TITLE}`)
  console.log(`URL: ${RESY_URL}`)
  console.log(`Date: ${RESY_DATE}`)
  console.log(`\nSource 2: ${TIMEOUT_TITLE}`)
  console.log(`URL: ${TIMEOUT_URL}`)
  console.log(`Date: ${TIMEOUT_DATE}\n`)
  console.log(`Total recommendations: ${recommendations.length}\n`)

  let added = 0
  let skipped = 0
  let errors = 0
  let newPlaces: string[] = []

  for (const rec of recommendations) {
    console.log(`\n[${added + skipped + errors + 1}/${recommendations.length}] ${rec.place} ← ${rec.chef}`)

    // Find place
    const place = await db.place.findFirst({
      where: {
        name: {
          contains: rec.place,
          mode: 'insensitive'
        }
      }
    })

    if (!place) {
      console.log(`   ⚠️  Place not found: "${rec.place}" (needs to be added first)`)
      newPlaces.push(rec.place)
      skipped++
      continue
    }

    // Determine source metadata
    const sourceURL = rec.source === 'resy' ? RESY_URL : TIMEOUT_URL
    const articleTitle = rec.source === 'resy' ? RESY_TITLE : TIMEOUT_TITLE
    const publication = rec.source === 'resy' ? 'Resy' : 'Timeout LA'

    // Check if this chef already has a rec for this place from this source
    const existingRecs = (place.chefRecs as any[]) || []
    const alreadyExists = existingRecs.some(existing => 
      existing.personName === rec.chef && 
      existing.reference.sourceURL === sourceURL
    )

    if (alreadyExists) {
      console.log(`   ⤷ Already has Chef Rec from ${rec.chef} (${publication})`)
      skipped++
      continue
    }

    // Create reference description
    let refDescription = `Named as favorite restaurant by ${rec.chef}`
    if (rec.from) {
      refDescription += ` (${rec.from})`
    }
    refDescription += ` in ${publication} article: "${articleTitle}"`

    // Create Chef Rec
    const chefRec = createChefRec({
      type: 'explicit-recommendation',
      personName: rec.chef,
      fromRestaurant: rec.from,
      quote: rec.quote,
      publication: publication,
      referenceType: 'editorial',
      referenceDescription: refDescription,
      sourceURL: sourceURL,
      confidence: 'high',
    })

    // Validate
    const validation = validateChefRec(chefRec)
    if (!validation.valid) {
      console.log(`   ❌ Validation failed:`)
      validation.errors.forEach(err => console.log(`      ${err}`))
      errors++
      continue
    }

    // Add to place
    const updatedRecs = [...existingRecs, chefRec]
    await db.place.update({
      where: { id: place.id },
      data: { chefRecs: updatedRecs }
    })

    console.log(`   ✅ Added Chef Rec from ${rec.chef}${rec.from ? ` (${rec.from})` : ''} - ${publication}`)
    added++
  }

  console.log('\n═'.repeat(80))
  console.log('\n📊 SUMMARY\n')
  console.log(`Total recommendations in articles: ${recommendations.length}`)
  console.log(`✅ Added: ${added}`)
  console.log(`⤷ Skipped (already exists): ${skipped - newPlaces.length}`)
  console.log(`⚠️  Places not in database: ${newPlaces.length}`)
  console.log(`❌ Errors: ${errors}`)

  if (newPlaces.length > 0) {
    console.log('\n⚠️  PLACES TO ADD FIRST:\n')
    const uniquePlaces = [...new Set(newPlaces)].sort()
    uniquePlaces.forEach(p => console.log(`   • ${p}`))
    console.log('\nAdd these places to your database first, then re-run this script.\n')
  }

  console.log('═'.repeat(80))
  console.log('\nNext steps:')
  console.log('1. Run: npx tsx scripts/view-chef-recs.ts --stats')
  console.log('2. Run: npx tsx scripts/analyze-chef-recs-vs-awards.ts')
  console.log('3. See the new insider picks!\n')
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  })
  .finally(() => {
    db.$disconnect()
  })
