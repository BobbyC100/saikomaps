#!/usr/bin/env npx tsx
// =============================================================================
// Saiko Maps — OSM Skate Park Import
//
// Fetches leisure=skate_park from LA County via Overpass API,
// normalizes to ActivitySpot shape, deduplicates, writes to DB.
//
// Usage: npm run import:skate-osm
// =============================================================================

import "dotenv/config";
import { db } from "../lib/db";
import { LayerType, SpotSource } from "@prisma/client";

// Kumi mirror — main overpass-api.de rate-limits aggressively.
// Fallback: https://overpass-api.de/api/interpreter (wait ~60s if rate-limited)
const OVERPASS_URL = "https://overpass.kumi.systems/api/interpreter";

// Bounding box for LA County (avoids OSM area naming issues)
// sw_lat, sw_lng, ne_lat, ne_lng
//
// OSM tagging: leisure=skate_park has ~5 elements globally. Use sport=skateboard + leisure=pitch
// instead (~28k globally, 100+ in LA) — these are skate parks. Excludes skate shops.
const LA_COUNTY_QUERY = `[out:json][timeout:90];nwr["sport"="skateboard"]["leisure"="pitch"](33.7,-118.7,34.5,-117.6);out center body;`;

// LA region mapping (approximate by lat/lng zones)
const REGION_MAP: Array<{ key: string; sw: [number, number]; ne: [number, number] }> = [
  { key: "venice-westside", sw: [33.98, -118.48], ne: [34.05, -118.38] },
  { key: "hollywood", sw: [34.05, -118.35], ne: [34.15, -118.25] },
  { key: "downtown", sw: [34.0, -118.28], ne: [34.08, -118.2] },
  { key: "south-bay", sw: [33.8, -118.42], ne: [33.92, -118.3] },
  { key: "san-fernando-valley", sw: [34.15, -118.55], ne: [34.28, -118.35] },
  { key: "east-la", sw: [33.95, -118.2], ne: [34.1, -118.0] },
  { key: "south-la", sw: [33.9, -118.35], ne: [34.0, -118.2] },
  { key: "long-beach", sw: [33.72, -118.25], ne: [33.85, -118.1] },
  { key: "pasadena-sgv", sw: [34.1, -118.2], ne: [34.2, -117.95] },
  { key: "santa-clarita", sw: [34.35, -118.6], ne: [34.45, -118.45] },
];

function getRegion(lat: number, lng: number): string | null {
  for (const r of REGION_MAP) {
    if (lat >= r.sw[0] && lat <= r.ne[0] && lng >= r.sw[1] && lng <= r.ne[1]) {
      return r.key;
    }
  }
  return null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface OSMElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function fetchOverpass(): Promise<{ elements: OSMElement[] }> {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    body: `data=${encodeURIComponent(LA_COUNTY_QUERY)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
  return res.json();
}

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  Saiko Maps — OSM Skate Park Import          ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  console.log("  Fetching from Overpass API...");
  const data = await fetchOverpass();
  const elements = data.elements || [];
  console.log(`  Found ${elements.length} OSM elements\n`);

  const spots: Array<{
    name: string;
    slug: string;
    latitude: number;
    longitude: number;
    region: string | null;
    spotType: string;
    tags: string[];
    surface: string | null;
    sourceId: string;
    sourceUrl: string;
  }> = [];

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const tags = el.tags || {};
    const name = tags.name || `Skate Park ${el.type}-${el.id}`;
    const surface = tags.surface || null;
    const spotType = "park";

    const tagsArr: string[] = [];
    if (tags.bowl === "yes") tagsArr.push("bowl");
    if (tags.rail === "yes") tagsArr.push("rail");
    if (tags.ledge === "yes") tagsArr.push("ledge");
    if (tags.stairs === "yes") tagsArr.push("stairs");
    if (tags.quarter_pipe === "yes") tagsArr.push("quarter-pipe");
    if (tags.half_pipe === "yes") tagsArr.push("half-pipe");
    if (tags.mini_ramp === "yes") tagsArr.push("mini-ramp");
    if (tagsArr.length === 0) tagsArr.push("general");

    const baseSlug = slugify(name);
    let slug = baseSlug;
    let suffix = 0;
    while (spots.some((s) => s.slug === slug)) {
      slug = `${baseSlug}-${++suffix}`;
    }

    spots.push({
      name,
      slug,
      latitude: lat,
      longitude: lon,
      region: getRegion(lat, lon),
      spotType,
      tags: tagsArr,
      surface,
      sourceId: `${el.type[0]}${el.id}`,
      sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    });
  }

  // Deduplicate by proximity (~50m)
  const DEDUP_METERS = 50;
  const kept: typeof spots = [];
  for (const s of spots) {
    const tooClose = kept.some(
      (k) => distance(s.latitude, s.longitude, k.latitude, k.longitude) < DEDUP_METERS
    );
    if (!tooClose) kept.push(s);
  }
  console.log(`  After dedup (${DEDUP_METERS}m): ${kept.length} spots\n`);

  let inserted = 0;
  let updated = 0;

  for (const s of kept) {
    const existing = await db.activitySpot.findFirst({
      where: { source: SpotSource.OSM, sourceId: s.sourceId },
    });

    const payload = {
      name: s.name,
      slug: s.slug,
      latitude: s.latitude,
      longitude: s.longitude,
      layerType: LayerType.SKATE,
      city: "Los Angeles",
      region: s.region,
      country: "US",
      spotType: s.spotType,
      tags: s.tags,
      surface: s.surface,
      source: SpotSource.OSM,
      sourceId: s.sourceId,
      sourceUrl: s.sourceUrl,
      enabled: true,
    };

    if (existing) {
      await db.activitySpot.update({ where: { id: existing.id }, data: payload });
      updated++;
    } else {
      await db.activitySpot.create({ data: payload });
      inserted++;
    }
  }

  console.log("  ✅ Import complete");
  console.log(`     Inserted: ${inserted}`);
  console.log(`     Updated:  ${updated}`);
  console.log("");
}

main().catch((err) => {
  console.error("💥", err);
  process.exit(1);
});
