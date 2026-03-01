/**
 * Import places from a Supabase (or any) CSV into Neon public.places.
 * GPID-first: resolve GPID (row / Nearby 200m / Text "${name} Los Angeles") → upsert by GPID.
 * Never create without GPID; skip row with SKIP_NO_GPID when not MATCH.
 *
 * Usage:
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/import-places-csv-to-neon.ts --file /path/to/file.csv [--apply] [--force]
 *
 * Dry run by default. Pass --apply to write. Pass --force to allow non-Neon target.
 */

const IMPORT_SCRIPT_VERSION = "2026-02-26-gpid-first";

import { readFileSync } from "fs";
import { parse } from "papaparse";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { resolveGpid } from "@/lib/gpid-resolve";

type CsvRow = Record<string, string>;

function parseArgs(): { file: string; apply: boolean; force: boolean } {
  const args = process.argv.slice(2);
  let file = "";
  let apply = false;
  let force = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) {
      file = args[++i];
    } else if (args[i] === "--apply") {
      apply = true;
    } else if (args[i] === "--force") {
      force = true;
    }
  }
  if (!file) {
    console.error(
      'Usage: import-places-csv-to-neon.ts --file "/path/to/file.csv" [--apply] [--force]'
    );
    process.exit(1);
  }
  return { file, apply, force };
}

function parseUrl(url: string): { host: string; database: string } {
  const match = url.match(/@([^/]+)\/([^?]+)/);
  const host = match ? match[1].split(":")[0] : "?";
  const database = match ? match[2] : "?";
  return { host, database };
}

function parseOptionalJson<T>(s: string | undefined): T | null {
  if (s == null || String(s).trim() === "") return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function parseOptionalNum(s: string | undefined): number | null {
  if (s == null || String(s).trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalDate(s: string | undefined): Date | null {
  if (s == null || String(s).trim() === "") return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseGoogleTypes(s: string | undefined): string[] {
  if (s == null || String(s).trim() === "") return [];
  const parsed = parseOptionalJson<string[]>(s);
  if (Array.isArray(parsed)) return parsed;
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

function rowToPayload(row: CsvRow): Record<string, unknown> {
  const get = (k: string) => {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.replace(/_/g, "")];
    return v != null ? String(v).trim() : undefined;
  };
  const slug = get("slug");
  const name = get("name");
  if (!slug || !name) return {} as Record<string, unknown>;

  const hours = parseOptionalJson<unknown>(get("hours"));
  const googlePhotos = parseOptionalJson<unknown>(get("google_photos"));
  const lat = parseOptionalNum(get("latitude"));
  const lng = parseOptionalNum(get("longitude"));
  const priceLevel = parseOptionalNum(get("price_level"));
  const placesDataCachedAt = parseOptionalDate(get("places_data_cached_at"));
  const createdAt = parseOptionalDate(get("created_at"));
  const updatedAt = parseOptionalDate(get("updated_at"));

  const payload: Record<string, unknown> = {
    slug,
    name,
    googlePlaceId: get("google_place_id") || undefined,
    address: get("address") || undefined,
    latitude: lat != null ? lat : undefined,
    longitude: lng != null ? lng : undefined,
    phone: get("phone") || undefined,
    website: get("website") || undefined,
    instagram: get("instagram") || undefined,
    hours: hours ?? undefined,
    description: get("description") || undefined,
    googlePhotos: googlePhotos ?? undefined,
    googleTypes: parseGoogleTypes(get("google_types")),
    priceLevel: priceLevel != null ? Math.round(priceLevel) : undefined,
    neighborhood: get("neighborhood") || undefined,
    category: get("category") || undefined,
    placesDataCachedAt: placesDataCachedAt ?? undefined,
    updatedAt: updatedAt ?? new Date(),
  };
  const idVal = get("id");
  if (idVal) payload.id = idVal;
  if (createdAt) payload.createdAt = createdAt;
  return payload;
}

const RATE_LIMIT_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Remove id, created_at, slug from payload — used for updates. Never include googlePlaceId in update (do not overwrite). */
function stripImmutable(payload: Record<string, unknown>): Record<string, unknown> {
  const out = { ...payload };
  delete out.id;
  delete out.created_at;
  delete out.createdAt;
  delete out.slug;
  delete out.primary_vertical;
  delete out.googlePlaceId;
  delete out.google_place_id;
  return out;
}

/** Returns a real string GPID or null. Treats null/undefined, empty/whitespace, literal "null"/"NULL", "undefined"/"UNDEFINED" as null. */
function normalizeGpid(raw: unknown): string | null {
  if (raw == null) return null;
  const s = (typeof raw === "string" ? raw : String(raw)).trim();
  if (s.length === 0) return null;
  const lower = s.toLowerCase();
  if (lower === "null" || lower === "undefined") return null;
  return s;
}

/** Ensure payload never passes the string "null"/"undefined" to Prisma — write SQL NULL instead. */
function clearInvalidGpidFromPayload(payload: Record<string, unknown>): void {
  const gpid = normalizeGpid(payload.googlePlaceId ?? payload.google_place_id);
  if (gpid === null) {
    payload.googlePlaceId = undefined;
    delete payload.google_place_id;
  }
}

const BATCH_SIZE = 500;

async function main() {
  const { file, apply, force } = parseArgs();

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("FATAL: DATABASE_URL not set. Run with node -r ./scripts/load-env.js ...");
    process.exit(1);
  }

  const { host, database } = parseUrl(url);
  const isNeon = host.includes("neon.tech");
  if (!isNeon && !force) {
    console.error(
      `FATAL: Target host "${host}" does not contain "neon.tech". Refusing to run. Use --force to override.`
    );
    process.exit(1);
  }

  const placesCount = await db.entities.count();
  console.log(`IMPORT SCRIPT VERSION: ${IMPORT_SCRIPT_VERSION}`);
  console.log(`TARGET DB: ${host}/${database} places_count=${placesCount}`);

  const csvContent = readFileSync(file, "utf-8");
  const parsed = parse<CsvRow>(csvContent, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    console.error("CSV parse errors:", parsed.errors);
    process.exit(1);
  }

  const rows = parsed.data;
  if (rows.length === 0) {
    console.log("CSV has no data rows. Exiting.");
    return;
  }

  let processed = 0;
  let matchedGpid = 0;
  let upserted = 0;
  let skippedNoGpid = 0;
  let ambiguous = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const payload = rowToPayload(row);
    if (!payload.slug || !payload.name) continue;

    processed++;
    const name = payload.name as string;
    const gpidRaw = normalizeGpid(payload.googlePlaceId ?? payload.google_place_id);
    const lat = typeof payload.latitude === "number" ? payload.latitude : null;
    const lng = typeof payload.longitude === "number" ? payload.longitude : null;

    const result = await resolveGpid({ name, gpid: gpidRaw ?? undefined, lat, lng });
    await sleep(RATE_LIMIT_MS);

    if (result.status !== "MATCH") {
      if (result.status === "AMBIGUOUS") ambiguous++;
      else if (result.status === "ERROR") errors++;
      else skippedNoGpid++;
      if (skippedNoGpid + ambiguous + errors <= 15) {
        console.log(`  SKIP_NO_GPID slug=${payload.slug} reason=${result.reason}`);
      }
      continue;
    }

    matchedGpid++;
    const resolvedGpid = result.gpid!;
    clearInvalidGpidFromPayload(payload);
    payload.googlePlaceId = resolvedGpid;

    if (!apply) {
      upserted++;
      continue;
    }

    const existing = await db.entities.findFirst({
      where: { googlePlaceId: resolvedGpid },
      select: { id: true },
    });

    try {
      if (existing) {
        const updateData = stripImmutable(payload) as Parameters<typeof db.entities.update>[0]["data"];
        await db.entities.update({ where: { id: existing.id }, data: updateData });
        upserted++;
      } else {
        if (!resolvedGpid) {
          throw new Error("Cannot create place without google_place_id (GPID-first). Skip row or resolve GPID first.");
        }
        if (!payload.id) payload.id = randomUUID();
        if (!payload.createdAt) payload.createdAt = new Date();
        if (!payload.primary_vertical) payload.primary_vertical = "EAT";
        const createData = payload as Parameters<typeof db.entities.create>[0]["data"];
        await db.entities.create({ data: createData });
        upserted++;
      }
    } catch (err: unknown) {
      errors++;
      console.error(`Failed slug=${payload.slug}:`, err);
    }

    if ((i + 1) % 100 === 0) {
      console.log(`Progress: ${i + 1}/${rows.length}`);
    }
  }

  console.log("\n--- Summary ---");
  console.log(`  processed:       ${processed}`);
  console.log(`  matched_gpid:    ${matchedGpid}`);
  console.log(`  upserted:       ${upserted}`);
  console.log(`  skipped_no_gpid: ${skippedNoGpid}`);
  console.log(`  ambiguous:      ${ambiguous}`);
  console.log(`  errors:         ${errors}`);
  if (!apply) {
    console.log("  (Dry run — use --apply to write to Neon.)");
  }

  if (apply) {
    try {
      const nullCount = await db.$queryRawUnsafe<
        { count: bigint }[]
      >("SELECT count(*)::bigint AS count FROM public.places WHERE google_place_id IS NULL");
      const dupes = await db.$queryRawUnsafe<
        { google_place_id: string | null; count: bigint }[]
      >(
        "SELECT google_place_id, count(*)::bigint AS count FROM public.places WHERE google_place_id IS NOT NULL AND btrim(google_place_id) <> '' GROUP BY google_place_id HAVING count(*) > 1 LIMIT 20"
      );
      console.log(`\nSanity: places with NULL google_place_id: ${nullCount[0]?.count ?? 0}`);
      console.log(
        `Sanity: duplicate google_place_id rows (expect 0): ${dupes.length}${dupes.length > 0 ? " " + JSON.stringify(dupes) : ""}`
      );
    } catch (sanityErr) {
      console.error("Sanity queries failed (non-fatal):", sanityErr);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
