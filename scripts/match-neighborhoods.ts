// scripts/match-neighborhoods.ts
// Enhanced with synonym/alias support for better matching

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════
// SYNONYM MAPPING (Aliases → Canonical Names)
// ═══════════════════════════════════════════════════════════════════════════

const SYNONYMS: Record<string, string> = {
  // Downtown variants
  "dtla": "downtown",
  "downtown la": "downtown",
  "downtown los angeles": "downtown",
  
  // West Hollywood variants
  "weho": "west hollywood",
  
  // Koreatown variants
  "k-town": "koreatown",
  "ktown": "koreatown",
  "korea town": "koreatown",
  
  // Fairfax variants
  "fairfax district": "fairfax",
  "fairfax village": "fairfax",
  
  // Mid-City variants
  "mid city": "mid-city",
  "midcity": "mid-city",
  
  // Venice variants
  "venice beach": "venice",
  
  // Santa Monica variants
  "santa monica beach": "santa monica",
  
  // Arts District variants
  "arts district dtla": "arts district",
  "downtown arts district": "arts district"
};

// ═══════════════════════════════════════════════════════════════════════════
// NORMALIZATION + SYNONYM RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════

function normalize(str: string | null): string {
  if (!str) return "";
  
  let normalized = str
    .toLowerCase()
    .trim()
    .replace(/^the\s+/i, "") // Remove leading "the"
    .replace(/[^\w\s-]/g, "") // Remove special chars except hyphens
    .replace(/\s+/g, " "); // Normalize whitespace
  
  // Apply synonym mapping
  return SYNONYMS[normalized] || normalized;
}

// ═══════════════════════════════════════════════════════════════════════════
// STRING SIMILARITY (for fuzzy matching)
// ═══════════════════════════════════════════════════════════════════════════

function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN MATCHING LOGIC
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("🔍 Starting neighborhood matching (with synonym support)...\n");

  // 1. Load LA city and canonical neighborhoods
  const la = await db.cities.findUnique({
    where: { slug: "los-angeles" },
    include: { neighborhoods: true }
  });

  if (!la) {
    throw new Error("Los Angeles city not found");
  }

  console.log(`📍 City: ${la.name}`);
  console.log(`📊 Canonical neighborhoods: ${la.neighborhoods.length}\n`);

  // Create lookup map: normalized name → neighborhood
  const neighborhoodMap = new Map<string, typeof la.neighborhoods[0]>();
  for (const n of la.neighborhoods) {
    neighborhoodMap.set(normalize(n.name), n);
  }

  // 2. Load places that need neighborhood assignment
  const places = await db.places.findMany({
    where: {
      cityId: la.id,
      neighborhoodId: null,
      neighborhoodOverride: null, // NEVER touch places with manual overrides
      neighborhood: { not: null } // Skip places with no inferred data
    },
    select: {
      id: true,
      name: true,
      slug: true,
      neighborhood: true
    }
  });

  console.log(`🏪 Places to process: ${places.length}\n`);

  // Results tracking
  const results = {
    exactMatches: [] as Array<{ place: string; neighborhood: string; viaAlias?: string }>,
    closeMatches: [] as Array<{ place: string; inferred: string; suggested: string; similarity: number }>,
    noMatches: [] as Array<{ place: string; inferred: string }>
  };

  // 3. Process each place
  for (const place of places) {
    const original = place.neighborhood!;
    const normalized = normalize(original);
    
    // Check if synonym was applied
    const wasAliased = SYNONYMS[original.toLowerCase()];
    
    // Try exact match (after synonym resolution)
    const exactMatch = neighborhoodMap.get(normalized);
    if (exactMatch) {
      // Auto-assign exact matches
      await db.places.update({
        where: { id: place.id },
        data: { neighborhoodId: exactMatch.id }
      });
      
      results.exactMatches.push({
        place: place.name,
        neighborhood: exactMatch.name,
        viaAlias: wasAliased ? original : undefined
      });
      continue;
    }

    // Try fuzzy matching for close matches
    let bestMatch: { neighborhood: typeof la.neighborhoods[0]; score: number } | null = null;
    
    for (const [normName, neighborhood] of neighborhoodMap.entries()) {
      const score = similarity(normalized, normName);
      if (score >= 0.85 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { neighborhood, score };
      }
    }

    if (bestMatch) {
      results.closeMatches.push({
        place: place.name,
        inferred: original,
        suggested: bestMatch.neighborhood.name,
        similarity: Math.round(bestMatch.score * 100)
      });
    } else {
      results.noMatches.push({
        place: place.name,
        inferred: original
      });
    }
  }

  // 4. Report results
  console.log("═══════════════════════════════════════════════════");
  console.log("📊 MATCHING RESULTS");
  console.log("═══════════════════════════════════════════════════\n");

  console.log(`✅ Exact Matches (auto-assigned): ${results.exactMatches.length}`);
  
  // Group by neighborhood
  const byNeighborhood = new Map<string, number>();
  const aliasMatches: typeof results.exactMatches = [];
  
  for (const match of results.exactMatches) {
    const count = byNeighborhood.get(match.neighborhood) || 0;
    byNeighborhood.set(match.neighborhood, count + 1);
    
    if (match.viaAlias) {
      aliasMatches.push(match);
    }
  }
  
  // Show summary by neighborhood
  for (const [hood, count] of Array.from(byNeighborhood.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`   • ${hood}: ${count} places`);
  }
  
  // Show alias conversions
  if (aliasMatches.length > 0) {
    console.log(`\n   💡 Via aliases: ${aliasMatches.length} matches`);
    aliasMatches.slice(0, 10).forEach(m => {
      console.log(`      "${m.viaAlias}" → ${m.neighborhood}`);
    });
    if (aliasMatches.length > 10) {
      console.log(`      ...and ${aliasMatches.length - 10} more`);
    }
  }

  console.log(`\n🔶 Close Matches (needs review): ${results.closeMatches.length}`);
  if (results.closeMatches.length > 0) {
    results.closeMatches.slice(0, 15).forEach(m => {
      console.log(`   • "${m.inferred}" → "${m.suggested}" (${m.similarity}% match)`);
    });
    if (results.closeMatches.length > 15) {
      console.log(`   ...and ${results.closeMatches.length - 15} more`);
    }
  }

  console.log(`\n❌ No Matches (manual assignment needed): ${results.noMatches.length}`);
  
  // Show unique unmatched neighborhoods
  const uniqueUnmatched = new Map<string, number>();
  for (const m of results.noMatches) {
    const count = uniqueUnmatched.get(m.inferred) || 0;
    uniqueUnmatched.set(m.inferred, count + 1);
  }
  
  const sortedUnmatched = Array.from(uniqueUnmatched.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  
  for (const [hood, count] of sortedUnmatched) {
    console.log(`   • "${hood}": ${count} places`);
  }
  if (uniqueUnmatched.size > 20) {
    console.log(`   ...and ${uniqueUnmatched.size - 20} more unique neighborhoods`);
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("✨ SUMMARY");
  console.log("═══════════════════════════════════════════════════");
  console.log(`Total LA places: ${places.length}`);
  console.log(`Auto-assigned: ${results.exactMatches.length} (${Math.round(results.exactMatches.length / places.length * 100)}%)`);
  console.log(`Needs review: ${results.closeMatches.length + results.noMatches.length}`);
  console.log("═══════════════════════════════════════════════════\n");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error("❌ Script failed:", e);
    await db.$disconnect();
    process.exit(1);
  });
