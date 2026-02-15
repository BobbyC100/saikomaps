import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const SOURCES_DIR = "data/input/sources";

async function importSources() {
  const files = fs.readdirSync(SOURCES_DIR).filter((f) => f.endsWith(".json"));

  console.log(`Found ${files.length} source files to import`);

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const file of files) {
    const slug = file.replace(".json", "");

    try {
      const filePath = path.join(SOURCES_DIR, file);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      // Update the place with sources
      const result = await prisma.places.updateMany({
        where: { slug: data.place_slug || slug },
        data: { sources: data.sources },
      });

      if (result.count > 0) {
        updated++;
        console.log(`✅ ${slug}: imported ${data.sources?.length || 0} sources`);
      } else {
        notFound++;
        console.log(`⚠️  ${slug}: place not found in database`);
      }
    } catch (err) {
      errors++;
      console.error(`❌ ${slug}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n--- Import Complete ---`);
  console.log(`Updated: ${updated}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Errors: ${errors}`);
}

importSources()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
