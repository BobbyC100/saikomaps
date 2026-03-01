/**
 * Schema.org ld+json extraction and mapping to Saiko category/signals.
 */

import { SCHEMA_TYPE_TO_SAIKO } from "./constants";

const ACCEPTED_TYPES = new Set([
  "Restaurant",
  "CafeOrCoffeeShop",
  "Bakery",
  "BarOrPub",
  "Winery",
  "Brewery",
  "FoodEstablishment",
  "Hotel",
  "LodgingBusiness",
  "Resort",
  "Motel",
]);

interface SchemaOrgThing {
  "@type"?: string | string[];
  name?: string;
  servesCuisine?: string | string[];
  menu?: string;
  acceptsReservations?: boolean;
  telephone?: string;
  address?: unknown;
  [k: string]: unknown;
}

function getType(block: SchemaOrgThing): string | null {
  const t = block["@type"];
  if (!t) return null;
  const arr = Array.isArray(t) ? t : [t];
  for (const type of arr) {
    const name = typeof type === "string" ? type : (type as { name?: string })?.name;
    if (name && ACCEPTED_TYPES.has(name)) return name;
  }
  return null;
}

function extractCuisines(block: SchemaOrgThing): string[] {
  const raw = block.servesCuisine;
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .filter((c): c is string => typeof c === "string")
    .map((c) => c.trim())
    .filter(Boolean);
}

export interface SchemaExtraction {
  schemaTypes: string[];
  saikoCategory: string | null;
  cuisine: string[];
  menuUrl: string | null;
  acceptsReservations: boolean | null;
  telephone: string | null;
}

export function extractFromSchemaBlocks(blocks: unknown[]): SchemaExtraction {
  const schemaTypes: string[] = [];
  let saikoCategory: string | null = null;
  const cuisineSet = new Set<string>();
  let menuUrl: string | null = null;
  let acceptsReservations: boolean | null = null;
  let telephone: string | null = null;

  for (const block of blocks) {
    const obj = block as SchemaOrgThing;
    const type = getType(obj);
    if (type) {
      schemaTypes.push(type);
      const mapped = SCHEMA_TYPE_TO_SAIKO[type];
      if (mapped && mapped !== "FoodEstablishment") {
        if (!saikoCategory) saikoCategory = mapped;
      } else if (type === "FoodEstablishment") {
        // keyword layer decides; don't set saikoCategory from schema
      }
      extractCuisines(obj).forEach((c) => cuisineSet.add(c));
      if (typeof obj.menu === "string" && obj.menu.trim()) {
        menuUrl = obj.menu.trim();
      }
      if (typeof obj.acceptsReservations === "boolean") {
        acceptsReservations = obj.acceptsReservations;
      }
      if (typeof obj.telephone === "string" && obj.telephone.trim()) {
        telephone = obj.telephone.trim();
      }
    }
  }

  return {
    schemaTypes: [...new Set(schemaTypes)],
    saikoCategory,
    cuisine: [...cuisineSet],
    menuUrl: menuUrl || null,
    acceptsReservations,
    telephone,
  };
}
