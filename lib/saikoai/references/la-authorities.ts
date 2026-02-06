/**
 * LA Food & Drink Who's Who — Structured reference for SaikoAI place enrichment.
 * Use when generating descriptors or editorial context for LA-area places.
 * See docs/LA_FOOD_WHOS_WHO.md for full reference.
 */

export const LA_AUTHORITIES = {
  /** Tier 1 = primary authority. A mention = strongest signal. */
  publications: {
    tier1: [
      { name: 'Michelin Guide', category: 'Fine dining, restaurants', why: 'Stars and Bib Gourmand — the global standard' },
      { name: 'LA Times 101 Best', category: 'Restaurants (all levels)', why: "Bill Addison's list is the LA canon" },
      { name: 'New York Times (Tejal Rao)', category: 'Restaurants', why: 'National spotlight, California-specific critic' },
      { name: 'L.A. Taco', category: 'Street food, tacos, neighborhood', why: 'JBF Award-winning newsroom' },
      { name: 'Sprudge', category: 'Coffee', why: 'Only editorial authority in specialty coffee' },
      { name: 'Punch', category: 'Wine bars, cocktails, spirits', why: 'The drinks publication' },
    ],
    tier2: [
      { name: 'Eater LA', category: 'Restaurants, openings' },
      { name: 'The Infatuation', category: 'Restaurants' },
      { name: 'Time Out LA', category: 'Restaurants, bars, coffee' },
      { name: 'Bon Appétit', category: 'Restaurants' },
    ],
    tier3: [
      { name: 'Food GPS', category: 'LA restaurants' },
      { name: 'Consuming LA', category: 'LA restaurants' },
    ],
  },

  /** People whose endorsement carries weight. Map to place categories. */
  people: {
    critics: [
      'Jonathan Gold (LA Times, LA Weekly — Pulitzer Prize, the godfather of LA food criticism)',
      'Bill Addison (LA Times — Gold\'s successor, writes 101 Best)',
      'Tejal Rao (NYT California critic)',
      'Javier Cabral (L.A. Taco editor — street food, tacos, neighborhood joints)',
      'Jenn Harris (LA Times food columnist)',
    ],
    chefs: [
      'Jon Yao (Kato — 2025 Best Chef CA)',
      'Lord Maynard Llera (Kuya Lord — 2024 Best Chef CA)',
      'Justin Pichetrungsi (Anajak Thai — 2023 Best Chef CA)',
      'Margarita Manzke (République, Bicyclette — 2023 Outstanding Pastry Chef)',
      'Greg Dulan (Dulan\'s Soul Food, Hotville Chicken)',
    ],
    coffee: [
      'Kyle Glanville & Charles Babinski (Go Get Em Tiger / G&B)',
      'Jack Benchakul (Endorffeine)',
      'Jacob Park & Joonmo Kim (Maru Coffee)',
      'Yeekai Lim (Cognoscenti Coffee)',
    ],
    wine: [
      'Helen Johannesen (Helen\'s Wines, Jon & Vinny\'s)',
      'Coly Den Haan (Vinovore)',
      'Matthew Kaner (Bar Covell, Augustine)',
    ],
    streetFood: [
      'Kevin Bludso (Bludso\'s BBQ)',
      'Wes Avila (Guerrilla Tacos, Angry Egret Dinette)',
      'Gilberto Cetina Jr. (Holbox)',
    ],
  },

  /** Notable places that define LA food — use for "similar to" or category context. */
  landmarkPlaces: [
    'Kato (Jon Yao)',
    'Kuya Lord (Lord Maynard Llera)',
    'Anajak Thai (Justin Pichetrungsi)',
    'République (Margarita Manzke)',
    'Go Get Em Tiger / G&B Coffee',
    'Endorffeine (Jack Benchakul)',
    'Maru Coffee',
    'Cognoscenti Coffee',
    'Dayglow',
    'Helen\'s Wines',
    'Vinovore',
    'Bar Covell',
    'Domaine LA',
    'Bludso\'s BBQ',
    'Holbox',
    'Gusto Bread',
    'OTOTO',
  ],
} as const;

/** Build a compact string for injection into AI prompts. */
export function getLAAuthoritiesPromptContext(): string {
  const lines: string[] = [
    'LA FOOD AUTHORITIES (use when enriching LA-area places):',
    '',
    'TIER 1 PUBLICATIONS (strongest signal): Michelin Guide, LA Times 101 Best (Bill Addison), NYT/Tejal Rao, L.A. Taco (Javier Cabral), Sprudge (coffee), Punch (wine/cocktails).',
    '',
    'KEY CRITICS: Jonathan Gold (LA Times — Pulitzer, godfather of LA food), Bill Addison (LA Times 101), Tejal Rao (NYT California), Javier Cabral (L.A. Taco — street food, tacos).',
    '',
    'WEIGHT ENDORSEMENTS: A mention by Bill Addison, Tejal Rao, or Javier Cabral = legitimate signal. "Featured in LA Times 101" or "Reviewed by Javier Cabral in L.A. Taco" carries credibility.',
    '',
    'EXCLUDED: Yelp (per Saiko policy).',
  ];
  return lines.join('\n');
}
