/**
 * Import places from a Supabase (or any) CSV into Neon public.places.
 * Uses slug as the stable key; id/created_at are not overwritten for existing rows.
 *
 * Usage:
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/import-places-csv-to-neon.ts --file /path/to/file.csv [--apply] [--force]
 *
 * Dry run by default. Pass --apply to write. Pass --force to allow non-Neon target.
 */

const IMPORT_SCRIPT_VERSION = "2026-02-24-gpid-normalize-v2";

import { readFileSync } from "fs";
import { parse } from "papaparse";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";

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

/** Remove id, created_at, slug from payload — used for collision updates only. */
function stripImmutable(payload: Record<string, unknown>): Record<string, unknown> {
  const out = { ...payload };
  delete out.id;
  delete out.created_at;
  delete out.createdAt;
  delete out.slug;
  delete out.primary_vertical;
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

  const placesCount = await db.places.count();
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

  const existingSlugs = new Set(
    (await db.places.findMany({ select: { slug: true } })).map((p) => p.slug)
  );

  let wouldInsert = 0;
  let wouldUpdate = 0;
  const payloads: { slug: string; payload: Record<string, unknown>; isNew: boolean }[] = [];

  for (const row of rows) {
    const payload = rowToPayload(row);
    if (!payload.slug || !payload.name) continue;
    const slug = payload.slug as string;
    const isNew = !existingSlugs.has(slug);
    if (isNew) {
      wouldInsert++;
      if (!payload.id) payload.id = randomUUID();
      if (!payload.createdAt) payload.createdAt = new Date();
      if (!payload.primary_vertical) payload.primary_vertical = "EAT";
    } else {
      wouldUpdate++;
      delete payload.id;
      delete payload.createdAt;
      delete payload.primary_vertical;
    }
    payloads.push({ slug, payload, isNew });
  }

  console.log(`CSV rows: ${rows.length} → would insert: ${wouldInsert}, would update: ${wouldUpdate}`);

  if (!apply) {
    console.log("Dry run. Re-run with --apply to write to Neon.");
    return;
  }

  let inserted = 0;
  let updated = 0;
  let invalidGpidRows = 0;

  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const batch = payloads.slice(i, i + BATCH_SIZE);
    for (const { slug, payload, isNew } of batch) {
      const gpid = normalizeGpid(payload.googlePlaceId ?? payload.google_place_id);
      if (gpid === null) invalidGpidRows++;
      clearInvalidGpidFromPayload(payload);

      try {
        if (isNew) {
          if (gpid !== null) {
            const existing = await db.places.findFirst({
              where: { googlePlaceId: gpid },
              select: { id: true, slug: true },
            });
            if (existing) {
              const updateData = stripImmutable(payload) as Parameters<
                typeof db.places.update
              >[0]["data"];
              await db.places.update({ where: { id: existing.id }, data: updateData });
              console.log(
                `GOOGLE_PLACE_ID COLLISION: csvSlug=${slug} existingSlug=${existing.slug} google_place_id=${JSON.stringify(gpid)} → updated existing row`
              );
              updated++;
              continue;
            }
          }
          const createData = payload as Parameters<typeof db.places.create>[0]["data"];
          await db.places.create({ data: createData });
          inserted++;
        } else {
          await db.places.update({
            where: { slug },
            data: payload as Parameters<typeof db.places.update>[0]["data"],
          });
          updated++;
        }
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        const meta = (err as { meta?: { target?: string[] } })?.meta;
        const isGpidP2002 =
          code === "P2002" &&
          Array.isArray(meta?.target) &&
          meta.target.includes("google_place_id");
        if (isGpidP2002 && gpid !== null) {
          const existing = await db.places.findFirst({
            where: { googlePlaceId: gpid },
            select: { id: true, slug: true },
          });
          if (existing) {
            const updateData = stripImmutable(payload) as Parameters<
              typeof db.places.update
            >[0]["data"];
            await db.places.update({ where: { id: existing.id }, data: updateData });
            console.log(
              `GOOGLE_PLACE_ID COLLISION (P2002 fallback): csvSlug=${slug} existingSlug=${existing.slug} google_place_id=${JSON.stringify(gpid)} → updated existing row`
            );
            updated++;
          } else {
            console.error(`Failed slug=${slug}:`, err);
          }
        } else {
          console.error(`Failed slug=${slug}:`, err);
        }
      }
    }
    if (i + BATCH_SIZE < payloads.length) {
      console.log(`Progress: ${Math.min(i + BATCH_SIZE, payloads.length)}/${payloads.length}`);
    }
  }

  console.log(`Done. inserted=${inserted} updated=${updated}`);
  console.log(`CSV rows with INVALID google_place_id: ${invalidGpidRows}`);

  if (apply) {
    try {
      const nullCount = await db.$queryRawUnsafe<
        { count: bigint }[]
      >("SELECT count(*)::bigint AS count FROM public.places WHERE google_place_id IS NULL");
      const dupes = await db.$queryRawUnsafe<
        { google_place_id: string | null; count: bigint }[]
      >(
        "SELECT google_place_id, count(*)::bigint AS count FROM public.places WHERE google_place_id IS NOT NULL GROUP BY google_place_id HAVING count(*) > 1 LIMIT 20"
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
