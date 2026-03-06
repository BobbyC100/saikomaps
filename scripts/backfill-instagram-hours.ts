/**
 * Backfill Instagram Hours — WO-FIELDS-INSTAGRAM-HOURS-001
 *
 * Two modes:
 *
 * 1. HOOK MODE (--slug=X --hours-raw="...")
 *    Called programmatically from any Instagram profile fetch (current or future).
 *    Writes instagram_hours_raw and, if the parser succeeds + policy allows, hours_json.
 *    Also updates source_attribution.hours and provenance_v2.hours.
 *
 * 2. BACKFILL MODE (default)
 *    Scans golden_records for rows where instagram_hours_raw IS NOT NULL but
 *    hours_json IS NULL (or hours source is low-confidence), then attempts
 *    to parse and apply.
 *    When no stored IG hours exist yet, exits with a no-op count of 0.
 *
 * Usage:
 *   # Hook mode — write raw string for one place
 *   tsx scripts/backfill-instagram-hours.ts --slug=seco --hours-raw="Mon–Fri 11am–9pm\nSat–Sun 10am–10pm" [--apply]
 *
 *   # Backfill mode — re-parse all stored instagram_hours_raw
 *   tsx scripts/backfill-instagram-hours.ts [--apply] [--limit=50]
 *
 *   # Verify mode — check 3 specific places
 *   tsx scripts/backfill-instagram-hours.ts --verify --slugs=seco,ototo,bavel
 *
 * Flags:
 *   --apply          Persist DB writes (default: dry-run)
 *   --slug=X         Single-slug hook mode (requires --hours-raw)
 *   --hours-raw=X    Raw hours string to store (hook mode only)
 *   --limit=N        Backfill mode: max places to process (default 100)
 *   --verify         Print hours state for --slugs (verification only)
 *   --slugs=a,b,c    Comma-separated slugs for --verify
 */

import { db } from '@/lib/db';
import { parseHoursText, shouldWriteHours } from '@/lib/utils/parse-hours-text';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getFlag(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

const IS_APPLY = hasFlag('apply');
const IS_VERIFY = hasFlag('verify');
const SLUG_FLAG = getFlag('slug');
const HOURS_RAW_FLAG = getFlag('hours-raw');
const LIMIT = parseInt(getFlag('limit') ?? '100', 10);
const VERIFY_SLUGS = (getFlag('slugs') ?? '').split(',').filter(Boolean);

// ---------------------------------------------------------------------------
// Shared write helper
// ---------------------------------------------------------------------------

type WriteResult = {
  slug: string;
  googlePlaceId: string | null;
  hoursRawWritten: boolean;
  hoursJsonWritten: boolean;
  hoursJsonSource: string;
  parseOutcome: string;
  writeDecision: string;
  dry: boolean;
};

async function writeInstagramHours(args: {
  canonicalId: string;
  slug: string;
  googlePlaceId: string | null;
  instagramHoursRaw: string;
  existingHoursJson: unknown;
  existingSourceAttribution: Record<string, unknown>;
  existingProvenanceV2: Record<string, unknown> | null;
  apply: boolean;
}): Promise<WriteResult> {
  const {
    canonicalId,
    slug,
    googlePlaceId,
    instagramHoursRaw,
    existingHoursJson,
    existingSourceAttribution,
    existingProvenanceV2,
    apply,
  } = args;

  const parseResult = parseHoursText(instagramHoursRaw);
  const existingSource = (existingSourceAttribution.hours as string | null | undefined) ?? null;

  const writeDecision = shouldWriteHours({
    parsedOk: parseResult.ok,
    existingHoursJson,
    existingSource,
  });

  const result: WriteResult = {
    slug,
    googlePlaceId,
    hoursRawWritten: false,
    hoursJsonWritten: false,
    hoursJsonSource: existingSource ?? 'none',
    parseOutcome: parseResult.ok
      ? `ok — ${parseResult.daysFound} day assignments`
      : `skip — ${parseResult.reason}`,
    writeDecision: writeDecision.reason,
    dry: !apply,
  };

  if (apply) {
    const newSourceAttribution = { ...existingSourceAttribution };
    const newProvenanceV2 = { ...(existingProvenanceV2 ?? {}) };

    // Always store the raw string
    const updatePayload: Record<string, unknown> = {
      instagram_hours_raw: instagramHoursRaw,
    };
    result.hoursRawWritten = true;

    if (writeDecision.write && parseResult.ok) {
      updatePayload.hours_json = parseResult.weeklyScheduleJson;
      result.hoursJsonWritten = true;
      result.hoursJsonSource = 'instagram';

      newSourceAttribution.hours = 'instagram';
      newProvenanceV2.hours = {
        source: 'instagram',
        confidence: 0.6, // conservative — text parsing is less reliable than structured API data
        observed_at: new Date().toISOString(),
        raw: instagramHoursRaw,
      };

      updatePayload.source_attribution = newSourceAttribution;
      updatePayload.provenance_v2 = newProvenanceV2;
    }

    await db.golden_records.update({
      where: { canonical_id: canonicalId },
      data: updatePayload as Parameters<typeof db.golden_records.update>[0]['data'],
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Verify mode
// ---------------------------------------------------------------------------

async function runVerify(slugs: string[]): Promise<void> {
  if (slugs.length === 0) {
    console.log('No slugs provided. Use --slugs=slug1,slug2,slug3');
    return;
  }

  console.log(`\n── Verification: ${slugs.join(', ')} ──\n`);

  const rows = await db.golden_records.findMany({
    where: { slug: { in: slugs } },
    select: {
      slug: true,
      instagram_handle: true,
      instagram_hours_raw: true,
      hours_json: true,
      source_attribution: true,
      provenance_v2: true,
    },
  });

  for (const row of rows) {
    const attr = (row.source_attribution as Record<string, unknown>) ?? {};
    const prov = (row.provenance_v2 as Record<string, unknown> | null) ?? null;
    const hoursSource = attr.hours ?? 'not set';
    const hoursProvenance = prov?.hours ?? null;

    console.log(`${row.slug}`);
    console.log(`  instagram_handle:    ${row.instagram_handle ?? '—'}`);
    console.log(`  instagram_hours_raw: ${row.instagram_hours_raw ? `"${row.instagram_hours_raw.slice(0, 80)}..."` : '—'}`);
    console.log(`  hours_json:          ${row.hours_json ? JSON.stringify(row.hours_json).slice(0, 80) + '...' : '—'}`);
    console.log(`  hours source:        ${hoursSource}`);
    console.log(`  hours provenance_v2: ${hoursProvenance ? JSON.stringify(hoursProvenance) : '—'}`);
    console.log();
  }

  const missing = slugs.filter((s) => !rows.find((r) => r.slug === s));
  if (missing.length > 0) {
    console.log(`Not found in golden_records: ${missing.join(', ')}`);
  }
}

// ---------------------------------------------------------------------------
// Hook mode — single slug
// ---------------------------------------------------------------------------

async function runHookMode(): Promise<void> {
  if (!SLUG_FLAG || !HOURS_RAW_FLAG) {
    console.error('Hook mode requires --slug=X and --hours-raw=Y');
    process.exit(1);
  }

  const slug = SLUG_FLAG;
  const rawHours = HOURS_RAW_FLAG.replace(/\\n/g, '\n'); // allow \n in shell arg

  const record = await db.golden_records.findUnique({
    where: { slug },
    select: {
      canonical_id: true,
      slug: true,
      google_place_id: true,
      hours_json: true,
      source_attribution: true,
      provenance_v2: true,
    },
  });

  if (!record) {
    console.error(`golden_records: slug "${slug}" not found`);
    process.exit(1);
  }

  const result = await writeInstagramHours({
    canonicalId: record.canonical_id,
    slug: record.slug,
    googlePlaceId: record.google_place_id,
    instagramHoursRaw: rawHours,
    existingHoursJson: record.hours_json,
    existingSourceAttribution: (record.source_attribution as Record<string, unknown>) ?? {},
    existingProvenanceV2: record.provenance_v2 as Record<string, unknown> | null,
    apply: IS_APPLY,
  });

  console.log(`\n── Hook mode: ${slug} ──`);
  console.log(`  parse:         ${result.parseOutcome}`);
  console.log(`  write policy:  ${result.writeDecision}`);
  console.log(`  hoursRaw:      ${result.hoursRawWritten ? (IS_APPLY ? 'written' : 'would write') : 'skipped'}`);
  console.log(`  hoursJson:     ${result.hoursJsonWritten ? (IS_APPLY ? 'written' : 'would write') : 'skipped'}`);
  console.log(`  mode:          ${IS_APPLY ? 'APPLY' : 'DRY RUN'}`);
}

// ---------------------------------------------------------------------------
// Backfill mode — all stored IG hours
// ---------------------------------------------------------------------------

async function runBackfillMode(): Promise<void> {
  console.log(`\n── Backfill mode (limit ${LIMIT}) ${IS_APPLY ? '[APPLY]' : '[DRY run]'} ──\n`);

  // Only process records that have instagram_hours_raw stored
  const rows = await db.golden_records.findMany({
    where: {
      instagram_hours_raw: { not: null },
    },
    select: {
      canonical_id: true,
      slug: true,
      google_place_id: true,
      instagram_hours_raw: true,
      hours_json: true,
      source_attribution: true,
      provenance_v2: true,
    },
    take: LIMIT,
    orderBy: { updated_at: 'asc' },
  });

  if (rows.length === 0) {
    console.log('No rows with instagram_hours_raw found — nothing to backfill.');
    console.log('(Run hook mode to populate: --slug=X --hours-raw="...")\n');
    return;
  }

  const results: WriteResult[] = [];

  for (const row of rows) {
    if (!row.instagram_hours_raw) continue;

    const result = await writeInstagramHours({
      canonicalId: row.canonical_id,
      slug: row.slug,
      googlePlaceId: row.google_place_id,
      instagramHoursRaw: row.instagram_hours_raw,
      existingHoursJson: row.hours_json,
      existingSourceAttribution: (row.source_attribution as Record<string, unknown>) ?? {},
      existingProvenanceV2: row.provenance_v2 as Record<string, unknown> | null,
      apply: IS_APPLY,
    });

    results.push(result);

    const tag = result.hoursJsonWritten
      ? (IS_APPLY ? '✓ hours written' : '○ would write hours')
      : `  skipped (${result.parseOutcome.slice(0, 50)})`;
    console.log(`  ${row.slug.padEnd(40)} ${tag}`);
  }

  const written = results.filter((r) => r.hoursJsonWritten).length;
  const rawStored = results.filter((r) => r.hoursRawWritten).length;
  const skipped = results.length - written;

  console.log(`\n── Summary ──`);
  console.log(`  Total processed:       ${results.length}`);
  console.log(`  hours_json written:    ${written} ${IS_APPLY ? '' : '(dry)'}`);
  console.log(`  instagram_hours_raw:   ${rawStored} ${IS_APPLY ? 'updated' : '(dry)'}`);
  console.log(`  Skipped (parse/policy):${skipped}`);
  console.log(`  Mode:                  ${IS_APPLY ? 'APPLY' : 'DRY RUN'}`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  try {
    if (IS_VERIFY) {
      await runVerify(VERIFY_SLUGS);
    } else if (SLUG_FLAG) {
      await runHookMode();
    } else {
      await runBackfillMode();
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
