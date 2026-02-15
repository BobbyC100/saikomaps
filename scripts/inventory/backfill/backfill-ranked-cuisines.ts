// scripts/inventory/backfill/backfill-ranked-cuisines.ts
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { requireActiveCityId } from "@/lib/active-city";

const DEBUG = process.argv.includes("--debug");
const DEBUG_NAME = (() => {
  const i = process.argv.indexOf("--debug");
  if (i === -1) return null;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : null;
})();

import {
  CuisinePrimary,
  CuisineSecondary,
  TOKENS,
  BREWERY_SECONDARY_TOKENS,
  LEGACY_ALLOWED,
  LEGACY_JUNK,
} from "@/lib/taxonomy/cuisine";

type Override = {
  cuisinePrimary: CuisinePrimary;
  cuisineSecondary?: CuisineSecondary[];
};
type OverridesFile = Record<string, Override>;

type Confidence = "high" | "medium" | "low";

type Proposal = {
  place_id: string;
  name: string;
  slug: string | null;
  neighborhood: string | null;
  category: string | null;
  legacy_cuisine_type: string | null;
  ranking_score: number | null;

  proposed_primary: CuisinePrimary | null;
  proposed_secondary: CuisineSecondary[];
  rule_hit: string;
  confidence: Confidence;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2019']/g, "'")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(hay: string, needles: readonly string[]): boolean {
  return needles.some((n) => hay.includes(n));
}

function readOverrides(): OverridesFile {
  const p = path.join(process.cwd(), "scripts/inventory/backfill/overrides.json");
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function capTwo<T>(arr: T[]): T[] {
  return arr.slice(0, 2);
}

function detectPrimaryByCategory(nameN: string, category: string | null): { primary: CuisinePrimary | null; rule: string } {
  if (category === "wine") return { primary: "Wine Bar", rule: "category=wine" };

  if (category === "drinks") {
    if (includesAny(nameN, TOKENS.breweryPrimary)) return { primary: "Brewery", rule: "category=drinks + breweryToken" };
    return { primary: "Cocktail Bar", rule: "category=drinks" };
  }

  if (category === "coffee") return { primary: "Coffee", rule: "category=coffee" };
  if (category === "bakery") return { primary: "Bakery", rule: "category=bakery" };

  return { primary: null, rule: "noCategoryRule" };
}

function detectPrimaryByName(nameN: string): { primary: CuisinePrimary | null; rule: string } {
  // Sushi / Japanese / Ramen
  if (includesAny(nameN, TOKENS.sushiPrimary)) return { primary: "Sushi", rule: "nameToken=sushi" };
  if (includesAny(nameN, TOKENS.ramenPrimary)) return { primary: "Ramen", rule: "nameToken=ramen" };
  if (includesAny(nameN, TOKENS.japanesePrimary)) return { primary: "Japanese", rule: "nameToken=japanese" };

  // Pizza / Italian
  if (includesAny(nameN, TOKENS.pizzaPrimary)) return { primary: "Pizza", rule: "nameToken=pizza" };
  if (includesAny(nameN, TOKENS.italianPrimary)) return { primary: "Italian", rule: "nameToken=italian" };

  // Mexican
  if (includesAny(nameN, TOKENS.mexicanPrimary)) return { primary: "Mexican", rule: "nameToken=mexican" };

  // Korean
  if (includesAny(nameN, TOKENS.koreanPrimary)) return { primary: "Korean", rule: "nameToken=korean" };

  // Thai / Vietnamese / Indian
  if (includesAny(nameN, TOKENS.thaiPrimary)) return { primary: "Thai", rule: "nameToken=thai" };
  if (includesAny(nameN, TOKENS.vietnamesePrimary)) return { primary: "Vietnamese", rule: "nameToken=vietnamese" };
  if (includesAny(nameN, TOKENS.indianPrimary)) return { primary: "Indian", rule: "nameToken=indian" };

  // American subcategories (Checkpoint 5.11D: High-yield coverage boost)
  if (includesAny(nameN, TOKENS.burgersPrimary)) return { primary: "Burgers", rule: "nameToken=burgers" };
  if (includesAny(nameN, TOKENS.bbqPrimary)) return { primary: "BBQ", rule: "nameToken=bbq" };

  // Chinese (primary) is trickier: only set as Chinese if explicit tokens show sub-style
  if (includesAny(nameN, TOKENS.chineseSichuanSecondary) || includesAny(nameN, TOKENS.chineseCantoneseSecondary)) {
    return { primary: "Chinese", rule: "nameToken=chineseSubstyle" };
  }

  return { primary: null, rule: "noNameRule" };
}

function detectSecondary(primary: CuisinePrimary | null, nameN: string, legacyCuisine: string | null): { secondary: CuisineSecondary[]; rule: string } {
  const sec: CuisineSecondary[] = [];
  const hits: string[] = [];

  if (primary === "Sushi") {
    if (nameN.includes("omakase")) { sec.push("Omakase"); hits.push("sushi:omakase"); }
    if (nameN.includes("edomae")) { sec.push("Edomae"); hits.push("sushi:edomae"); }
    if (nameN.includes("hand roll") || nameN.includes("handroll") || nameN.includes("temaki")) { sec.push("Hand Roll Bar"); hits.push("sushi:handroll"); }
    if (nameN.includes("chirashi")) { sec.push("Chirashi"); hits.push("sushi:chirashi"); }
  }

  if (primary === "Korean") {
    if (includesAny(nameN, TOKENS.kbbqSecondary)) { sec.push("Korean BBQ"); hits.push("korean:kbbq"); }
  }

  // Chinese explicit-only secondaries
  if (primary === "Chinese") {
    if (includesAny(nameN, TOKENS.chineseSichuanSecondary)) { 
      sec.push("Sichuan"); 
      hits.push("chinese:sichuan"); 
    }
    if (includesAny(nameN, TOKENS.chineseCantoneseSecondary)) { 
      sec.push("Cantonese"); 
      hits.push("chinese:cantonese"); 
    }
  }

  if (primary === "Brewery") {
    // Brewery secondaries (locked rules from checkpoint)
    for (const [label, tokens] of Object.entries(BREWERY_SECONDARY_TOKENS)) {
      if (includesAny(nameN, tokens)) {
        sec.push(label as CuisineSecondary);
        hits.push(`brewery:${label}`);
      }
    }
  }

  return { secondary: capTwo(sec), rule: hits.length > 0 ? hits.join("|") : "noSecondary" };
}

function detectLegacyFallback(legacyCuisine: string | null): { primary: CuisinePrimary | null; rule: string } {
  if (!legacyCuisine || LEGACY_JUNK.has(legacyCuisine)) {
    return { primary: null, rule: "legacyJunk" };
  }
  
  if (LEGACY_ALLOWED.has(legacyCuisine)) {
    // Map legacy values to our canonical CuisinePrimary
    let mapped: CuisinePrimary;
    if (legacyCuisine === "Barbecue") {
      mapped = "BBQ";
    } else {
      mapped = legacyCuisine as CuisinePrimary;
    }
    return { primary: mapped, rule: `legacy=${legacyCuisine}` };
  }
  
  return { primary: null, rule: "legacyNotAllowed" };
}

function inferCuisine(
  name: string,
  category: string | null,
  legacyCuisine: string | null
): { primary: CuisinePrimary | null; secondary: CuisineSecondary[]; rule: string; confidence: Confidence } {
  const nameN = normalize(name);

  // PRECEDENCE ORDER (deterministic, fixed):
  
  // 1. Legacy trusted cuisine (highest confidence - already editorially vetted)
  const legacyResult = detectLegacyFallback(legacyCuisine);
  if (legacyResult.primary) {
    const secResult = detectSecondary(legacyResult.primary, nameN, legacyCuisine);
    return {
      primary: legacyResult.primary,
      secondary: secResult.secondary,
      rule: `${legacyResult.rule} → ${secResult.rule}`,
      confidence: "high", // Legacy trusted data is HIGH confidence
    };
  }

  // 2. Category-based formats (Wine Bar, Cocktail Bar, Brewery, Coffee, Bakery)
  const catResult = detectPrimaryByCategory(nameN, category);
  if (catResult.primary) {
    const secResult = detectSecondary(catResult.primary, nameN, legacyCuisine);
    return {
      primary: catResult.primary,
      secondary: secResult.secondary,
      rule: `${catResult.rule} → ${secResult.rule}`,
      confidence: "high",
    };
  }

  // 3. Name-based token inference
  const nameResult = detectPrimaryByName(nameN);
  if (nameResult.primary) {
    const secResult = detectSecondary(nameResult.primary, nameN, legacyCuisine);
    return {
      primary: nameResult.primary,
      secondary: secResult.secondary,
      rule: `${nameResult.rule} → ${secResult.rule}`,
      confidence: "medium",
    };
  }

  // 4. No inference
  return {
    primary: null,
    secondary: [],
    rule: "noInference",
    confidence: "low",
  };
}

async function main() {
  const execute = process.argv.includes("--execute");
  
  console.log("🍽️  Backfilling ranked cuisines (token-based system)...");
  console.log(`Mode: ${execute ? "EXECUTE" : "DRY RUN"}\n`);

  const cityId = await requireActiveCityId();
  const overrides = readOverrides();

  // Fetch ranked places
  const places = await db.places.findMany({
    where: {
      cityId,
      rankingScore: { gt: 0 },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      neighborhood: true,
      category: true,
      cuisineType: true,
      cuisinePrimary: true,
      rankingScore: true,
    },
    orderBy: {
      rankingScore: "desc",
    },
  });

  console.log(`Total ranked places: ${places.length}\n`);

  const proposals: Proposal[] = [];
  let overrideCount = 0;
  let alreadySetCount = 0;

  for (const place of places) {
    // PRECEDENCE 1: Skip if cuisinePrimary already exists (do not propose changes)
    if (place.cuisinePrimary && !overrides[place.id]) {
      if (DEBUG) {
        console.log(`⏭️  ${place.name}: Already set (${place.cuisinePrimary})`);
      }
      alreadySetCount++;
      continue;
    }

    let proposal: Proposal;

    // Check for override
    if (overrides[place.id]) {
      const override = overrides[place.id];
      proposal = {
        place_id: place.id,
        name: place.name,
        slug: place.slug,
        neighborhood: place.neighborhood,
        category: place.category,
        legacy_cuisine_type: place.cuisineType,
        ranking_score: place.rankingScore,
        proposed_primary: override.cuisinePrimary,
        proposed_secondary: override.cuisineSecondary || [],
        rule_hit: "OVERRIDE",
        confidence: "high",
      };
      overrideCount++;
    } else {
      // Infer
      const inference = inferCuisine(place.name, place.category, place.cuisineType);
      proposal = {
        place_id: place.id,
        name: place.name,
        slug: place.slug,
        neighborhood: place.neighborhood,
        category: place.category,
        legacy_cuisine_type: place.cuisineType,
        ranking_score: place.rankingScore,
        proposed_primary: inference.primary,
        proposed_secondary: inference.secondary,
        rule_hit: inference.rule,
        confidence: inference.confidence,
      };
    }

    // Debug mode: show specific place
    if (DEBUG_NAME && place.name.toLowerCase().includes(DEBUG_NAME.toLowerCase())) {
      console.log('\n🔍 DEBUG MODE - Found:', place.name);
      console.log('─────────────────────────────────────');
      console.log('Input:');
      console.log(`  name: "${place.name}"`);
      console.log(`  category: "${place.category}"`);
      console.log(`  cuisineType (legacy): "${place.cuisineType}"`);
      console.log(`  cuisinePrimary (existing): "${place.cuisinePrimary}"`);
      console.log('\nProposal:');
      console.log(`  proposed_primary: "${proposal.proposed_primary}"`);
      console.log(`  proposed_secondary: [${proposal.proposed_secondary.join(', ')}]`);
      console.log(`  rule_hit: "${proposal.rule_hit}"`);
      console.log(`  confidence: "${proposal.confidence}"`);
      console.log('─────────────────────────────────────\n');
    }

    proposals.push(proposal);
  }

  // Stats
  const withPrimary = proposals.filter((p) => p.proposed_primary !== null);
  const withSecondary = proposals.filter((p) => p.proposed_secondary.length > 0);
  const noPrimary = proposals.filter((p) => p.proposed_primary === null);

  console.log("=== Proposal Summary ===");
  console.log(`Total: ${places.length}`);
  console.log(`Already set: ${alreadySetCount}`);
  console.log(`To process: ${proposals.length}`);
  console.log(`With primary: ${withPrimary.length} (${Math.round((withPrimary.length / proposals.length) * 100)}%)`);
  console.log(`With secondary: ${withSecondary.length} (${Math.round((withSecondary.length / proposals.length) * 100)}%)`);
  console.log(`No primary: ${noPrimary.length} (${Math.round((noPrimary.length / proposals.length) * 100)}%)`);
  console.log(`Overrides: ${overrideCount}\n`);

  // Distribution
  const primaryDist = new Map<CuisinePrimary, number>();
  withPrimary.forEach((p) => {
    if (p.proposed_primary) {
      primaryDist.set(p.proposed_primary, (primaryDist.get(p.proposed_primary) || 0) + 1);
    }
  });

  console.log("=== Primary Distribution ===");
  Array.from(primaryDist.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([cuisine, count]) => {
      const bar = "█".repeat(Math.min(count, 50));
      console.log(`${cuisine.padEnd(20)}: ${bar} (${count})`);
    });

  // Show sample
  console.log("\n=== Sample (first 10 with primary) ===");
  withPrimary.slice(0, 10).forEach((p) => {
    const sec = p.proposed_secondary.length > 0 ? ` + [${p.proposed_secondary.join(", ")}]` : "";
    console.log(`${p.name.padEnd(35)} → ${p.proposed_primary}${sec}`);
  });

  console.log("\n=== Sample (no primary) ===");
  noPrimary.slice(0, 10).forEach((p) => {
    console.log(`⚠️  ${p.name} (${p.rule_hit})`);
  });

  // Execute if requested
  if (execute) {
    console.log("\n🔄 Executing database updates...");
    let updated = 0;
    
    for (const p of proposals) {
      if (p.proposed_primary) {
        await db.places.update({
          where: { id: p.place_id },
          data: {
            cuisinePrimary: p.proposed_primary,
            cuisineSecondary: p.proposed_secondary,
          },
        });
        updated++;
      }
    }
    
    console.log(`✅ Updated ${updated} places`);
  } else {
    console.log("\n⚠️  DRY RUN - Use --execute to save changes");
  }

  console.log("\n📋 Next Steps:");
  console.log("   1. Review proposals above");
  console.log("   2. Add overrides to overrides.json if needed");
  console.log("   3. Run with --execute to apply");
  console.log("   4. Wire cuisinePrimary into search");
}

main()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
