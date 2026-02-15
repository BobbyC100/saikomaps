// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ═══════════════════════════════════════════════════════════════════════
  // COUNTRIES
  // ═══════════════════════════════════════════════════════════════════════

  const us = await db.countries.upsert({
    where: { code: "US" },
    update: { name: "United States" },
    create: { code: "US", name: "United States" }
  });
  console.log("✅ Country: United States");

  const fr = await db.countries.upsert({
    where: { code: "FR" },
    update: { name: "France" },
    create: { code: "FR", name: "France" }
  });
  console.log("✅ Country: France");

  const jp = await db.countries.upsert({
    where: { code: "JP" },
    update: { name: "Japan" },
    create: { code: "JP", name: "Japan" }
  });
  console.log("✅ Country: Japan");

  // ═══════════════════════════════════════════════════════════════════════
  // CITIES
  // ═══════════════════════════════════════════════════════════════════════

  const la = await db.cities.upsert({
    where: { slug: "los-angeles" },
    update: { name: "Los Angeles", countryId: us.id, locale: "en" },
    create: { slug: "los-angeles", name: "Los Angeles", countryId: us.id, locale: "en" }
  });
  console.log("✅ City: Los Angeles");

  await db.cities.upsert({
    where: { slug: "new-york" },
    update: { name: "New York", countryId: us.id, locale: "en" },
    create: { slug: "new-york", name: "New York", countryId: us.id, locale: "en" }
  });
  console.log("✅ City: New York");

  await db.cities.upsert({
    where: { slug: "paris" },
    update: { name: "Paris", countryId: fr.id, locale: "fr" },
    create: { slug: "paris", name: "Paris", countryId: fr.id, locale: "fr" }
  });
  console.log("✅ City: Paris");

  await db.cities.upsert({
    where: { slug: "tokyo" },
    update: { name: "Tokyo", countryId: jp.id, locale: "ja" },
    create: { slug: "tokyo", name: "Tokyo", countryId: jp.id, locale: "ja" }
  });
  console.log("✅ City: Tokyo\n");

  // ═══════════════════════════════════════════════════════════════════════
  // LA NEIGHBORHOODS (Expanded Canonical List)
  // ═══════════════════════════════════════════════════════════════════════

  console.log("📍 Seeding LA Neighborhoods...\n");

  const neighborhoods = [
    // Original 9 (from Checkpoint 3)
    { slug: "silver-lake", name: "Silver Lake" },
    { slug: "echo-park", name: "Echo Park" },
    { slug: "downtown", name: "Downtown" },
    { slug: "koreatown", name: "Koreatown" },
    { slug: "west-hollywood", name: "West Hollywood" },
    { slug: "venice", name: "Venice" },
    { slug: "santa-monica", name: "Santa Monica" },
    { slug: "highland-park", name: "Highland Park" },
    { slug: "arts-district", name: "Arts District" },
    
    // New 8 (Checkpoint 4E expansion)
    { slug: "east-hollywood", name: "East Hollywood" },
    { slug: "hollywood", name: "Hollywood" },
    { slug: "los-feliz", name: "Los Feliz" },
    { slug: "atwater-village", name: "Atwater Village" },
    { slug: "westlake", name: "Westlake" },
    { slug: "mid-city", name: "Mid-City" },
    { slug: "fairfax", name: "Fairfax" },
    { slug: "culver-city", name: "Culver City" }
  ];

  for (const n of neighborhoods) {
    await db.neighborhoods.upsert({
      where: { cityId_slug: { cityId: la.id, slug: n.slug } },
      update: { name: n.name },
      create: { cityId: la.id, slug: n.slug, name: n.name }
    });
    console.log(`   ✅ ${n.name}`);
  }

  console.log(`\n🎉 Seed complete! ${neighborhoods.length} LA neighborhoods created.\n`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await db.$disconnect();
    process.exit(1);
  });
