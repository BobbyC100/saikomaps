/**
 * Saiko Voice Engine v1.1 - Ad Unit Assignment
 * Category-based mapping from Google Places primaryType to ad unit style
 */

import { AdUnitType, AdUnitAssignment } from './types';

/**
 * Category to Ad Unit mapping
 */
const CATEGORY_TO_AD_UNIT: Record<string, AdUnitType> = {
  // MATCHBOOK (B) — casual spots
  fast_food_restaurant: 'B',
  pizza_restaurant: 'B',
  hamburger_restaurant: 'B',
  sandwich_shop: 'B',
  bakery: 'B',
  cafe: 'B',
  coffee_shop: 'B',
  ice_cream_shop: 'B',
  meal_takeaway: 'B',
  meal_delivery: 'B',
  taco_restaurant: 'B',
  burrito_restaurant: 'B',
  
  // CLASSIC PRINT AD (A) — elevated dining
  fine_dining_restaurant: 'A',
  steak_house: 'A',
  seafood_restaurant: 'A',
  french_restaurant: 'A',
  wine_bar: 'A',
  cocktail_bar: 'A',
  sushi_restaurant: 'A',
  italian_restaurant: 'A',
  
  // ILLUSTRATED STAMP (D) — provenance/craft
  brewery: 'D',
  winery: 'D',
  distillery: 'D',
  bar: 'D',
  
  // HORIZONTAL BANNER (E) — default/everything else
  // (No explicit mapping, falls through to default)
};

/**
 * Assign ad unit type based on category
 * Returns 'E' (Horizontal Banner) as default if no specific mapping exists
 */
export function assignAdUnitType(primaryType: string): AdUnitAssignment {
  const adUnitType = CATEGORY_TO_AD_UNIT[primaryType] || 'E';
  
  let reason: string;
  switch (adUnitType) {
    case 'A':
      reason = 'Elevated dining / cocktail bar';
      break;
    case 'B':
      reason = 'Casual spot';
      break;
    case 'D':
      reason = 'Provenance / craft beverage';
      break;
    case 'E':
    default:
      reason = 'Default / general restaurant';
      break;
  }
  
  return {
    adUnitType,
    reason,
  };
}

/**
 * Batch assign ad unit types for multiple places
 */
export function batchAssignAdUnitTypes(
  places: Array<{ id: string; primaryType: string }>
): Array<{ id: string; adUnitType: AdUnitType; reason: string }> {
  return places.map((place) => {
    const assignment = assignAdUnitType(place.primaryType);
    return {
      id: place.id,
      adUnitType: assignment.adUnitType,
      reason: assignment.reason,
    };
  });
}
