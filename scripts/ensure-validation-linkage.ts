/**
 * Ensure the 4 validation slugs (dunsmoor, buvons, dan-tanas, covell) resolve:
 * places.slug → places.googlePlaceId → golden_records.google_place_id
 *
 * For each slug: find a golden_record by slug or name; ensure place exists with that slug and googlePlaceId.
 * If no golden exists but a place does (with googlePlaceId), create a minimal golden_record so the graph is complete.
 * Does not touch scoring. Run score-linkage-doctor.ts before/after to verify.
 *
 * Usage: npx tsx scripts/ensure-validation-linkage.ts [--dry-run]
 */

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const VALIDATION_SLUGS = ['dunsmoor', 'buvons', 'dan-tanas', 'covell'] as const;

/** Name variants to find golden_record when slug doesn't match (e.g. bar-covell → covell) */
const SLUG_TO_NAMES: Record<string, string[]> = {
  dunsmoor: ['Dunsmoor'],
  buvons: ['Buvons', 'Buvons Natural Wine Bar', 'Buvons Natural Wine Bar + Shop'],
  'dan-tanas': ['Dan Tana\'s', 'Dan Tanas'],
  covell: ['Bar Covell', 'Covell'],
};

const DEFAULT_DISPLAY_NAMES: Record<string, string> = {
  dunsmoor: 'Dunsmoor',
  buvons: 'Buvons',
  'dan-tanas': 'Dan Tana\'s',
  covell: 'Bar Covell',
};

function loadValidationPlaceIds(): Record<string, string | null> {
  const p = path.join(process.cwd(), 'data', 'validation-place-ids.json');
  if (!fs.existsSync(p)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return {
      dunsmoor: data.dunsmoor ?? null,
      buvons: data.buvons ?? null,
      'dan-tanas': data['dan-tanas'] ?? null,
      covell: data.covell ?? null,
    };
  } catch {
    return {};
  }
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const seedIds = loadValidationPlaceIds();
  console.log('Ensure validation linkage (place slug → googlePlaceId → golden_records)');
  if (dryRun) console.log('DRY RUN — no writes\n');

  const missing = VALIDATION_SLUGS.filter((slug) => !seedIds[slug] || !String(seedIds[slug]).trim());
  if (!dryRun && missing.length > 0) {
    console.error('Validation place IDs missing. Fill data/validation-place-ids.json (Places API place_id) and re-run.');
    console.error('Missing slugs:', missing.join(', '));
    process.exit(1);
  }

  const now = new Date();

  for (const slug of VALIDATION_SLUGS) {
    const names = SLUG_TO_NAMES[slug] ?? [slug];
    const displayName = DEFAULT_DISPLAY_NAMES[slug] ?? slug;
    const seedGoogleId = seedIds[slug] ?? null;

    let place = await db.places.findUnique({
      where: { slug },
      select: { id: true, name: true, googlePlaceId: true, latitude: true, longitude: true },
    });

    if (!place && !dryRun) {
      await db.places.create({
        data: {
          id: randomUUID(),
          slug,
          name: displayName,
          googlePlaceId: seedGoogleId,
          primary_vertical: 'EAT',
          createdAt: now,
          updatedAt: now,
        },
      });
      console.log(`[${slug}] Created place (slug=${slug}, name=${displayName}${seedGoogleId ? ', googlePlaceId from seed' : ''}).`);
      place = await db.places.findUnique({
        where: { slug },
        select: { id: true, name: true, googlePlaceId: true, latitude: true, longitude: true },
      })!;
    } else if (!place) {
      console.log(`[${slug}] Would create place (dry-run). Skip.`);
      continue;
    }

    if (seedGoogleId && place && !place.googlePlaceId && !dryRun) {
      await db.places.update({
        where: { slug },
        data: { googlePlaceId: seedGoogleId, updatedAt: now },
      });
      place = { ...place, googlePlaceId: seedGoogleId };
      console.log(`[${slug}] Set place.googlePlaceId from data/validation-place-ids.json.`);
    }

    let golden = await db.golden_records.findUnique({
      where: { slug },
      select: { canonical_id: true, slug: true, name: true, google_place_id: true },
    });

    if (!golden) {
      const allGolden = await db.golden_records.findMany({
        where: { lifecycle_status: 'ACTIVE' },
        select: { canonical_id: true, slug: true, name: true, google_place_id: true },
      });
      golden = allGolden.find((g) => names.some((n) => normalizeName(g.name).includes(normalizeName(n)))) ?? null;
    }

    if (!golden) {
      const googlePlaceId = place.googlePlaceId ?? seedGoogleId;
      if (googlePlaceId && !dryRun) {
        const lat = place.latitude != null ? Number(place.latitude) : 0;
        const lng = place.longitude != null ? Number(place.longitude) : 0;
        await db.golden_records.create({
          data: {
            canonical_id: randomUUID(),
            slug,
            name: place.name,
            google_place_id: googlePlaceId,
            lat: new Prisma.Decimal(lat),
            lng: new Prisma.Decimal(lng),
            source_attribution: {},
            cuisines: [],
            vibe_tags: [],
            signature_dishes: [],
            pro_tips: [],
          },
        });
        console.log(`[${slug}] Created minimal golden_record (from place + seed).`);
        golden = await db.golden_records.findUnique({
          where: { slug },
          select: { canonical_id: true, slug: true, name: true, google_place_id: true },
        })!;
      } else {
        console.log(`[${slug}] No golden_record; add googlePlaceId to place or data/validation-place-ids.json and re-run.`);
        continue;
      }
    }

    let googlePlaceId = golden.google_place_id ?? place?.googlePlaceId ?? null;

    if (!googlePlaceId) {
      const placeByName = await db.places.findFirst({
        where: { name: { in: names }, googlePlaceId: { not: null } },
        select: { googlePlaceId: true },
      });
      if (placeByName?.googlePlaceId) googlePlaceId = placeByName.googlePlaceId;
    }

    if (googlePlaceId && !golden.google_place_id && !dryRun) {
      await db.golden_records.update({
        where: { canonical_id: golden.canonical_id },
        data: { google_place_id: googlePlaceId },
      });
      console.log(`[${slug}] Set golden_record.google_place_id.`);
    }

    if (!googlePlaceId) {
      console.log(`[${slug}] No googlePlaceId (add to data/validation-place-ids.json or backfill).`);
      continue;
    }

    if (place && place.googlePlaceId !== googlePlaceId) {
      if (!place.googlePlaceId && !dryRun) {
        await db.places.update({
          where: { slug },
          data: { googlePlaceId, updatedAt: now },
        });
        console.log(`[${slug}] Set place.googlePlaceId.`);
      } else if (place.googlePlaceId && place.googlePlaceId !== googlePlaceId) {
        console.log(`[${slug}] Place has different googlePlaceId; not overwriting.`);
      }
    } else if (place?.googlePlaceId === googlePlaceId) {
      console.log(`[${slug}] Link complete. OK.`);
    }

    if (seedGoogleId && !dryRun) {
      const resolved = await db.golden_records.findFirst({
        where: { google_place_id: seedGoogleId },
        select: { canonical_id: true },
      });
      if (!resolved) {
        console.warn(`Warning: Provided place_id for ${slug} did not resolve to a golden_record. Check that this is the Places API place_id (ChIJ...), not a CID.`);
      }
    }
  }

  console.log("");
  console.log("Done. Run: npx tsx scripts/score-linkage-doctor.ts");
  console.log("Then: npx tsx scripts/compute-place-scores.ts --place-slugs=dunsmoor,buvons,dan-tanas,covell");
}

main().catch(function (e: unknown) {
  console.error(e);
  process.exit(1);
});
