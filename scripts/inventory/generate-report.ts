/**
 * Inventory Report Generator V1.0
 * 
 * Generates comprehensive CSV snapshot of all LA places with:
 * - Coverage depth metrics
 * - Editorial source flags (Michelin, Eater, Gold, Chef Recs)
 * - Data completeness indicators
 * - Ranking scores
 * 
 * Output: scripts/inventory/out/inventory_report.csv
 * 
 * Usage:
 *   ACTIVE_CITY_ID="cmln5lxe70004kf1yl8wdd4gl" npx tsx scripts/inventory/generate-report.ts
 */

import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { requireActiveCityId } from "@/lib/active-city";

type Row = {
  place_id: string;
  name: string;
  slug: string | null;
  neighborhood: string | null;
  cuisine_type: string | null;
  ranking_score: number | null;
  coverage_count: number;
  has_michelin: boolean;
  has_eater: boolean;
  has_gold: boolean;
  has_chef_rec: boolean;
  missing_fields: string;
};

function esc(v: any) {
  const s = (v ?? "").toString().replace(/\r?\n/g, " ").trim();
  if (s.includes(",") || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSV(rows: Row[]) {
  const header = [
    "place_id",
    "name",
    "slug",
    "neighborhood",
    "cuisine_type",
    "ranking_score",
    "coverage_count",
    "has_michelin",
    "has_eater",
    "has_gold",
    "has_chef_rec",
    "missing_fields",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.place_id,
        r.name,
        r.slug,
        r.neighborhood,
        r.cuisine_type,
        r.ranking_score,
        r.coverage_count,
        r.has_michelin,
        r.has_eater,
        r.has_gold,
        r.has_chef_rec,
        r.missing_fields,
      ].map(esc).join(",")
    );
  }
  return lines.join("\n");
}

// Configuration based on actual schema
const CFG = {
  // Table names (confirmed from schema)
  PLACES_TABLE: "places",
  COVERAGES_TABLE: "place_coverages",
  SOURCES_TABLE: "sources",
  
  // Source name matching
  MICHELIN_NAME: "Michelin Guide",
  EATER_NAME: "Eater LA",
  GOLD_NAME: "Jonathan Gold",
};

async function main() {
  console.log("🔍 Generating inventory report for LA...\n");

  // Get LA city ID
  const cityId = await requireActiveCityId();

  // Core query
  // Notes:
  // - chef_recs is a JSON field on places (not separate table)
  // - Gold mentions checked in both sources.name and editorialSources JSON
  // - Only counts APPROVED coverages
  const rows = await db.$queryRawUnsafe<Row[]>(
    `
    with base as (
      select
        p.id as place_id,
        p.name,
        p.slug,
        p.neighborhood,
        p.cuisine_type,
        p.ranking_score,
        -- Check if chef_recs JSON field is populated
        case 
          when p.chef_recs is not null 
           and p.chef_recs::text != '{}'
           and p.chef_recs::text != '[]'
           and p.chef_recs::text != 'null'
          then true 
          else false 
        end as has_chef_rec,
        -- Check editorialSources JSON for Jonathan Gold
        case
          when p.editorial_sources is not null
           and p.editorial_sources::text ilike '%jonathan gold%'
          then true
          else false
        end as has_gold_in_json
      from ${CFG.PLACES_TABLE} p
      where p.city_id = $1
    ),
    cov as (
      select
        pc.place_id,
        count(*)::int as coverage_count,
        bool_or(s.name ilike '%michelin%') as has_michelin,
        bool_or(s.name ilike '%eater%') as has_eater,
        bool_or(s.name ilike '%jonathan gold%') as has_gold_in_source
      from ${CFG.COVERAGES_TABLE} pc
      left join ${CFG.SOURCES_TABLE} s on s.id = pc.source_id
      where pc.status = 'APPROVED'
      group by pc.place_id
    )
    select
      b.place_id,
      b.name,
      b.slug,
      b.neighborhood,
      b.cuisine_type,
      b.ranking_score,
      coalesce(c.coverage_count, 0) as coverage_count,
      coalesce(c.has_michelin, false) as has_michelin,
      coalesce(c.has_eater, false) as has_eater,
      -- Gold flag: true if in sources OR editorialSources
      (coalesce(c.has_gold_in_source, false) or b.has_gold_in_json) as has_gold,
      b.has_chef_rec,
      trim(both ',' from
        concat(
          case when b.cuisine_type is null then 'cuisine_type,' else '' end,
          case when b.neighborhood is null then 'neighborhood,' else '' end,
          case when b.slug is null then 'slug,' else '' end
        )
      ) as missing_fields
    from base b
    left join cov c on c.place_id = b.place_id
    order by coalesce(b.ranking_score, 0) desc, coalesce(c.coverage_count, 0) desc, b.name asc
    `,
    cityId
  );

  // Write CSV
  const outDir = path.join(process.cwd(), "scripts", "inventory", "out");
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, "inventory_report.csv");
  fs.writeFileSync(outPath, toCSV(rows), "utf8");

  // Console summary
  const total = rows.length;
  const ranked = rows.filter(r => (r.ranking_score ?? 0) > 0).length;
  const zeroCoverage = rows.filter(r => r.coverage_count === 0).length;
  const cuisineNull = rows.filter(r => !r.cuisine_type).length;
  const neighborhoodNull = rows.filter(r => !r.neighborhood).length;
  const slugNull = rows.filter(r => !r.slug).length;

  console.log("✅ Inventory report written:", outPath);
  console.log("");
  console.log("📊 Summary Statistics:");
  console.log("─────────────────────────────────");
  console.log(`Total LA places:        ${total}`);
  console.log(`Ranked (score > 0):     ${ranked} (${Math.round(ranked/total*100)}%)`);
  console.log(`Unranked:               ${total - ranked} (${Math.round((total-ranked)/total*100)}%)`);
  console.log("");
  console.log("📝 Coverage Metrics:");
  console.log("─────────────────────────────────");
  console.log(`Places with 0 coverage: ${zeroCoverage} (${Math.round(zeroCoverage/total*100)}%)`);
  console.log(`Michelin flagged:       ${rows.filter(r => r.has_michelin).length}`);
  console.log(`Eater flagged:          ${rows.filter(r => r.has_eater).length}`);
  console.log(`Jonathan Gold flagged:  ${rows.filter(r => r.has_gold).length}`);
  console.log(`Chef rec flagged:       ${rows.filter(r => r.has_chef_rec).length}`);
  console.log("");
  console.log("🔍 Data Completeness:");
  console.log("─────────────────────────────────");
  console.log(`cuisine_type NULL:      ${cuisineNull} (${Math.round(cuisineNull/total*100)}%)`);
  console.log(`neighborhood NULL:      ${neighborhoodNull} (${Math.round(neighborhoodNull/total*100)}%)`);
  console.log(`slug NULL:              ${slugNull} (${Math.round(slugNull/total*100)}%)`);
  console.log("");
  console.log("✨ Next steps:");
  console.log("   - Review CSV for gaps: " + outPath);
  console.log("   - Run analyze-gaps.ts for neighborhood/cuisine breakdown");
  console.log("   - Run build-backlog.ts for coverage expansion targets");
}

main()
  .catch((e) => {
    console.error("❌ Error generating inventory report:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
