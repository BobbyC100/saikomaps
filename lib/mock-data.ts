/**
 * Mock data for testing Tier 3 Stability (Scenarios A, B, C)
 * See: merchant-page-implementation-checklist.md Section 9
 */

import { MerchantData } from './types/merchant';

/**
 * Scenario A — Fully curated
 * All tiers render; order intact
 */
export const scenarioA_FullyCurated: MerchantData = {
  id: '1',
  slug: 'la-taqueria',
  name: 'La Taqueria',
  tagline: 'Mission-style burritos, no shortcuts',
  heroPhoto: {
    id: 'hero-1',
    url: '/images/la-taqueria-hero.jpg',
    alt: 'La Taqueria storefront',
  },
  phone: '+14152850684',
  instagramHandle: 'lataqueriasf',
  coordinates: {
    lat: 37.7488,
    lng: -122.4185,
  },
  photos: [
    { id: 'photo-1', url: '/images/la-taqueria-1.jpg' },
    { id: 'photo-2', url: '/images/la-taqueria-2.jpg' },
    { id: 'photo-3', url: '/images/la-taqueria-3.jpg' },
  ],
  vibeTags: ['Mission District', 'Cash Only', 'No-Frills'],
  curatorNote: {
    text: "The carne asada is dry-grilled, not stewed. That's the difference. Order the dorado style if you want the tortilla pressed crispy on the plancha.",
    author: 'Saiko',
  },
  coverageSources: [
    {
      publication: 'Bon Appétit',
      quote: 'The gold standard for Mission-style burritos.',
      url: 'https://example.com',
      date: '2022',
    },
  ],
  hours: {
    monday: '11:00 AM - 9:00 PM',
    tuesday: '11:00 AM - 9:00 PM',
    wednesday: '11:00 AM - 9:00 PM',
    thursday: '11:00 AM - 9:00 PM',
    friday: '11:00 AM - 9:00 PM',
    saturday: '11:00 AM - 9:00 PM',
    sunday: '11:00 AM - 8:30 PM',
  },
  openStatus: {
    isOpen: true,
    todayWindow: '11:00 AM - 9:00 PM',
    nextChange: 'Closes at 9:00 PM',
  },
  address: {
    street: '2889 Mission St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94110',
  },
  attributes: [
    { id: 'a1', category: 'payment', name: 'Cash Only' },
    { id: 'a2', category: 'dining', name: 'Dine-In' },
    { id: 'a3', category: 'dining', name: 'Takeout' },
    { id: 'a4', category: 'accessibility', name: 'Wheelchair Accessible' },
  ],
  alsoOnLists: [
    {
      id: 'list-1',
      title: 'Mission District Essentials',
      slug: 'mission-essentials',
      coverImage: '/images/mission-cover.jpg',
    },
  ],
  house: {
    text: 'Some places try to reinvent the burrito. La Taqueria just makes it better than anyone else.',
  },
};

/**
 * Scenario B — Editorial lite (no curator note, coverage exists)
 * Trust renders as coverage-only; no empty curator shell
 */
export const scenarioB_EditorialLite: MerchantData = {
  id: '2',
  slug: 'tartine-bakery',
  name: 'Tartine Bakery',
  tagline: 'Morning bread ritual',
  heroPhoto: {
    id: 'hero-2',
    url: '/images/tartine-hero.jpg',
    alt: 'Tartine Bakery',
  },
  coordinates: {
    lat: 37.7609,
    lng: -122.4241,
  },
  // NO curator note
  coverageSources: [
    {
      publication: 'New York Times',
      url: 'https://example.com',
    },
    {
      publication: 'SF Chronicle',
      quote: 'The croissant that launched a thousand imitators.',
    },
  ],
  hours: {
    monday: 'Closed',
    tuesday: '8:00 AM - 5:00 PM',
    wednesday: '8:00 AM - 5:00 PM',
    thursday: '8:00 AM - 5:00 PM',
    friday: '8:00 AM - 5:00 PM',
    saturday: '8:00 AM - 5:00 PM',
    sunday: '8:00 AM - 5:00 PM',
  },
  openStatus: {
    isOpen: false,
    todayWindow: 'Closed',
  },
  address: {
    street: '600 Guerrero St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94110',
  },
};

/**
 * Scenario C — Baseline (no trust data, minimal fields)
 * Trust collapses; page still feels intentional
 */
export const scenarioC_Baseline: MerchantData = {
  id: '3',
  slug: 'golden-gate-bakery',
  name: 'Golden Gate Bakery',
  tagline: 'Egg tarts worth the wait',
  heroPhoto: {
    id: 'hero-3',
    url: '/images/golden-gate-hero.jpg',
    alt: 'Golden Gate Bakery',
  },
  // NO curator note
  // NO coverage
  // NO phone
  // NO Instagram
  // NO photos
  // Hours exist (because HoursCard ALWAYS renders)
  hours: {
    wednesday: '8:00 AM - 5:00 PM',
    thursday: '8:00 AM - 5:00 PM',
    friday: '8:00 AM - 5:00 PM',
    saturday: '8:00 AM - 5:00 PM',
    sunday: '8:00 AM - 5:00 PM',
  },
  openStatus: {
    isOpen: true,
    todayWindow: '8:00 AM - 5:00 PM',
  },
  address: {
    street: '1029 Grant Ave',
    city: 'San Francisco',
    state: 'CA',
    zip: '94133',
  },
  coordinates: {
    lat: 37.7958,
    lng: -122.4075,
  },
};
