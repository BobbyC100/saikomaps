#!/usr/bin/env npx tsx
// =============================================================================
// Saiko Maps — Editorial Skate Spot Import
//
// Imports curated street spots from CSV. Use data/input/skate-editorial.csv
// Template: name,lat,lng,region,spotType,tags,surface,description
//
// Usage: npm run import:skate-editorial
// =============================================================================

import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { db } from "../lib/db";
import { LayerType, SpotSource } from "@prisma/client";

const CSV_PATH = "data/input/skate-editorial.csv";

const REGION_KEYS = [
  "venice-westside",
  "hollywood",
  "downtown",
  "south-bay",
  "san-fernando-valley",
  "east-la",
  "south-la",
  "long-beach",
  "pasadena-sgv",
  "santa-clarita",
];

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

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = values[j] || "";
    });
    rows.push(row);
  }
  return rows;
}

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  Saiko Maps — Editorial Skate Import          ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  let raw: string;
  try {
    raw = await fs.readFile(CSV_PATH, "utf-8");
  } catch {
    // Create template if missing
    await fs.mkdir(path.dirname(CSV_PATH), { recursive: true });
    const template = `name,lat,lng,region,spotType,tags,surface,description
Venice Pavilion,33.9855,-118.4722,venice-westside,plaza,"ledge;stairs;manual pad",smooth,Historic Venice street spot
Santa Monica Courthouse,34.0195,-118.4912,venice-westside,plaza,"ledge;stairs;rail",smooth,Courthouse plaza
Hollywood High,34.1016,-118.3222,hollywood,school,"stairs;ledge;rail",mixed,Classic LA street spot`;
    await fs.writeFile(CSV_PATH, template, "utf-8");
    console.log(`  Created template at ${CSV_PATH}`);
    console.log("  Add your spots and run again.\n");
    return;
  }

  const rows = parseCSV(raw);
  console.log(`  Parsed ${rows.length} rows from ${CSV_PATH}\n`);

  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const name = row.name?.trim();
    const lat = parseFloat(row.lat);
    const lng = parseFloat(row.lng);
    if (!name || isNaN(lat) || isNaN(lng)) continue;

    const region = row.region?.trim() && REGION_KEYS.includes(row.region.trim()) ? row.region.trim() : null;
    const spotType = row.spottype?.trim() || "street";
    const tags = row.tags?.split(/[;|]+/).map((t) => t.trim()).filter(Boolean) || [];
    const surface = row.surface?.trim() || null;
    const description = row.description?.trim() || null;

    const slug = slugify(name);
    const sourceId = `editorial-${slug}`;

    const payload = {
      name,
      slug,
      latitude: lat,
      longitude: lng,
      layerType: LayerType.SKATE,
      city: "Los Angeles",
      region,
      country: "US",
      spotType,
      tags: tags.length ? tags : ["street"],
      surface,
      description,
      source: SpotSource.EDITORIAL,
      sourceId,
      verified: true,
      enabled: true,
    };

    const existing = await db.activitySpot.findFirst({
      where: { source: SpotSource.EDITORIAL, sourceId },
    });

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
