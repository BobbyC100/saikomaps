/**
 * Backfill Website About — WO-FIELDS-WEBSITE-ABOUT-EXTRACTION-001
 *
 * Discovers and extracts "About / Our Story" page content from merchant websites
 * and stores it in golden_records.website_about_* staging fields.
 *
 * Usage:
 *   # Single slug (verify/dry-run default)
 *   npx tsx scripts/backfill-website-about.ts --slug=donna-s
 *
 *   # Single slug, apply writes
 *   npx tsx scripts/backfill-website-about.ts --slug=donna-s --apply
 *
 *   # Batch (up to 25 places)
 *   npx tsx scripts/backfill-website-about.ts --limit=25 --apply
 *
 *   # Verify mode — inspect current DB values for specific slugs
 *   npx tsx scripts/backfill-website-about.ts --verify --slugs=donna-s,seco
 *
 *   # Force overwrite existing values
 *   npx tsx scripts/backfill-website-about.ts --slug=donna-s --apply --force
 *
 * Flags:
 *   --apply        Persist DB writes (default: dry-run)
 *   --slug=X       Single-slug mode
 *   --limit=N      Batch mode: max places to process (default 10)
 *   --verify       Print current DB state for --slugs
 *   --slugs=a,b    Comma-separated slugs for --verify
 *   --force        Overwrite even if website_about_raw already set
 */

import { db } from '@/lib/db';
import { fetchWithLimits } from '@/lib/website-enrichment/fetch';
import {
  discoverAboutUrl,
  extractAboutText,
  checkAboutQuality,
  type AboutExtractionResult,
} from '@/lib/website-enrichment/about';

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
const IS_FORCE = hasFlag('force');
const SLUG_FLAG = getFlag('slug');
const LIMIT = parseInt(getFlag('limit') ?? '10', 10);
const VERIFY_SLUGS = (getFlag('slugs') ?? '').split(',').filter(Boolean);

// ---------------------------------------------------------------------------
// Core extraction pipeline (single place)
// ---------------------------------------------------------------------------

interface RunResult {
  slug: string;
  website: string;
  aboutUrl: string | null;
  charCount: number | null;
  preview: string | null;
  descriptionWritten: boolean;
  outcome: 'written' | 'dry_run' | 'skipped_existing' | 'quality_fail' | 'fetch_fail' | 'no_url' | 'no_website';
  note?: string;
}

async function runForPlace(
  canonicalId: string,
  slug: string,
  website: string,
  existingAboutRaw: string | null,
  existingDescription: string | null,
  apply: boolean,
  force: boolean,
): Promise<RunResult> {
  const base: RunResult = {
    slug,
    website,
    aboutUrl: null,
    charCount: null,
    preview: null,
    descriptionWritten: false,
    outcome: 'no_website',
  };

  // Guard: skip if already extracted (unless --force)
  if (existingAboutRaw && !force) {
    return {
      ...base,
      outcome: 'skipped_existing',
      note: `website_about_raw already set (${existingAboutRaw.length} chars). Use --force to overwrite.`,
    };
  }

  // Step 1: Fetch homepage
  const homepageFetch = await fetchWithLimits(website);
  if (!homepageFetch.html) {
    return {
      ...base,
      outcome: 'fetch_fail',
      note: `Homepage fetch failed: HTTP ${homepageFetch.status}`,
    };
  }

  // Step 2: Discover about URL
  const aboutUrl = discoverAboutUrl(website, homepageFetch.html);
  if (!aboutUrl) {
    return { ...base, outcome: 'no_url', note: 'No about URL discovered from homepage.' };
  }

  // Step 3: Fetch about page (the +1 request)
  const aboutFetch = await fetchWithLimits(aboutUrl);
  if (!aboutFetch.html) {
    return {
      ...base,
      aboutUrl,
      outcome: 'fetch_fail',
      note: `About page fetch failed: HTTP ${aboutFetch.status} at ${aboutUrl}`,
    };
  }

  // Step 4: Extract text
  const extracted = extractAboutText(aboutFetch.html);
  if (!extracted) {
    return {
      ...base,
      aboutUrl,
      outcome: 'quality_fail',
      note: 'extractAboutText returned null (no usable paragraphs).',
    };
  }

  // Step 5: Quality gate
  if (!checkAboutQuality(extracted)) {
    return {
      ...base,
      aboutUrl,
      charCount: extracted.length,
      preview: extracted.slice(0, 200),
      outcome: 'quality_fail',
      note: 'Quality gate failed (boilerplate / too short / legal / link-spam).',
    };
  }

  const result: AboutExtractionResult = {
    aboutUrl,
    aboutRaw: extracted,
    charCount: extracted.length,
    preview: extracted.slice(0, 200),
  };

  // Whether we'll promote to the canonical description field
  // Guard: never overwrite an existing human-authored description unless --force.
  const willWriteDescription = existingDescription === null || force;

  // Step 6: Write (or dry-run)
  if (apply) {
    const now = new Date();
    const provenanceEntry = {
      source: 'website',
      url: aboutUrl,
      observed_at: now.toISOString(),
      raw: extracted.slice(0, 500),
      confidence: 0.75,
    };

    // Read current provenance_v2 + source_attribution to merge
    const current = await db.golden_records.findUnique({
      where: { canonical_id: canonicalId },
      select: { provenance_v2: true, source_attribution: true },
    });
    const existingProv = (current?.provenance_v2 as Record<string, unknown> | null) ?? {};
    const existingAttr = (current?.source_attribution as Record<string, unknown> | null) ?? {};

    const newProv: Record<string, unknown> = {
      ...existingProv,
      website_about: provenanceEntry,
    };
    const newAttr: Record<string, unknown> = { ...existingAttr };

    const updateData: Record<string, unknown> = {
      website_about_url: aboutUrl,
      website_about_raw: extracted,
      website_about_extracted_at: now,
      provenance_v2: newProv,
    };

    if (willWriteDescription) {
      updateData.description = extracted;
      newProv.description = provenanceEntry;
      newAttr.description = 'website';
      updateData.source_attribution = newAttr;
    }

    await db.golden_records.update({
      where: { canonical_id: canonicalId },
      data: updateData as Parameters<typeof db.golden_records.update>[0]['data'],
    });
  }

  return {
    ...base,
    aboutUrl,
    charCount: result.charCount,
    preview: result.preview,
    descriptionWritten: apply ? willWriteDescription : false,
    outcome: apply ? 'written' : 'dry_run',
    note: !willWriteDescription && apply
      ? 'Staged to website_about_raw only — description already set. Use --force to overwrite.'
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Print helpers
// ---------------------------------------------------------------------------

function printResult(r: RunResult): void {
  const outcomeIcon: Record<RunResult['outcome'], string> = {
    written: '✓',
    dry_run: '○',
    skipped_existing: '–',
    quality_fail: '✗',
    fetch_fail: '✗',
    no_url: '✗',
    no_website: '✗',
  };

  const icon = outcomeIcon[r.outcome] ?? '?';
  console.log(`\n${icon}  ${r.slug}`);
  console.log(`   website:          ${r.website}`);
  console.log(`   aboutUrl:         ${r.aboutUrl ?? '—'}`);
  console.log(`   charCount:        ${r.charCount ?? '—'}`);
  console.log(`   descriptionWrite: ${r.descriptionWritten ? 'yes' : 'no'}`);
  console.log(`   outcome:          ${r.outcome}${r.note ? ` — ${r.note}` : ''}`);
  if (r.preview) {
    console.log(`   preview:          "${r.preview.slice(0, 200)}..."`);
  }
}

// ---------------------------------------------------------------------------
// Verify mode
// ---------------------------------------------------------------------------

async function runVerify(slugs: string[]): Promise<void> {
  if (slugs.length === 0) {
    console.log('No slugs provided. Use --slugs=slug1,slug2');
    return;
  }
  console.log(`\n── Verification: ${slugs.join(', ')} ──\n`);

  const rows = await db.golden_records.findMany({
    where: { slug: { in: slugs } },
    select: {
      slug: true,
      website: true,
      description: true,
      website_about_url: true,
      website_about_raw: true,
      website_about_extracted_at: true,
      provenance_v2: true,
      source_attribution: true,
    },
  });

  for (const row of rows) {
    const prov = (row.provenance_v2 as Record<string, unknown> | null) ?? null;
    const attr = (row.source_attribution as Record<string, unknown> | null) ?? null;
    const aboutProv = prov?.website_about ?? null;
    const descProv = prov?.description ?? null;
    console.log(`${row.slug}`);
    console.log(`  website:                     ${row.website ?? '—'}`);
    console.log(`  description:                 ${row.description ? `"${row.description.slice(0, 120)}..."` : '—'}`);
    console.log(`  source_attribution.desc:     ${attr?.description ?? '—'}`);
    console.log(`  website_about_url:           ${row.website_about_url ?? '—'}`);
    console.log(`  website_about_raw:           ${row.website_about_raw ? `"${row.website_about_raw.slice(0, 120)}..."` : '—'}`);
    console.log(`  website_about_extracted_at:  ${row.website_about_extracted_at?.toISOString() ?? '—'}`);
    console.log(`  provenance_v2.website_about: ${aboutProv ? JSON.stringify(aboutProv).slice(0, 120) : '—'}`);
    console.log(`  provenance_v2.description:   ${descProv ? JSON.stringify(descProv).slice(0, 120) : '—'}`);
    console.log();
  }

  const missing = slugs.filter((s) => !rows.find((r) => r.slug === s));
  if (missing.length > 0) console.log(`Not found in golden_records: ${missing.join(', ')}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (IS_VERIFY) {
    await runVerify(VERIFY_SLUGS);
    return;
  }

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  Backfill Website About — ${IS_APPLY ? 'APPLY MODE' : 'DRY-RUN'}`);
  console.log(`  force=${IS_FORCE}  slug=${SLUG_FLAG ?? '—'}  limit=${LIMIT}`);
  console.log(`═══════════════════════════════════════════════\n`);

  const ROW_SELECT = {
    canonical_id: true,
    slug: true,
    website: true,
    website_about_raw: true,
    description: true,
  } as const;

  let rows: Array<{
    canonical_id: string;
    slug: string;
    website: string | null;
    website_about_raw: string | null;
    description: string | null;
  }>;

  if (SLUG_FLAG) {
    const row = await db.golden_records.findUnique({
      where: { slug: SLUG_FLAG },
      select: ROW_SELECT,
    });
    if (!row) {
      console.error(`Slug not found: ${SLUG_FLAG}`);
      process.exit(1);
    }
    rows = [row];
  } else {
    // Batch mode: places with a website that haven't been extracted yet (or force)
    const query = IS_FORCE
      ? { website: { not: null } }
      : { website: { not: null }, website_about_raw: null };

    rows = await db.golden_records.findMany({
      where: query,
      select: ROW_SELECT,
      take: LIMIT,
      orderBy: { updated_at: 'desc' },
    });
  }

  console.log(`Processing ${rows.length} place(s)…\n`);

  const summary = { written: 0, dry_run: 0, skipped: 0, failed: 0 };

  for (const row of rows) {
    if (!row.website) {
      console.log(`  – ${row.slug}: no website, skipping`);
      summary.skipped++;
      continue;
    }

    const result = await runForPlace(
      row.canonical_id,
      row.slug,
      row.website,
      row.website_about_raw,
      row.description,
      IS_APPLY,
      IS_FORCE,
    );

    printResult(result);

    if (result.outcome === 'written') summary.written++;
    else if (result.outcome === 'dry_run') summary.dry_run++;
    else if (result.outcome === 'skipped_existing') summary.skipped++;
    else summary.failed++;
  }

  console.log(`\n── Summary ──`);
  console.log(`  written:  ${summary.written}`);
  console.log(`  dry_run:  ${summary.dry_run}`);
  console.log(`  skipped:  ${summary.skipped}`);
  console.log(`  failed:   ${summary.failed}`);

  if (!IS_APPLY) {
    console.log('\n  (dry-run: no writes made — add --apply to persist)');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
