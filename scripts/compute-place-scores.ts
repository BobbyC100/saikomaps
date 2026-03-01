/**
 * Compute Energy + Formality scores for golden_records (backfill + distribution report).
 * Usage:
 *   npx tsx scripts/compute-place-scores.ts [--dry-run]
 *   npx tsx scripts/compute-place-scores.ts --place-slugs=dunsmoor,buvons,dan-tanas,covell [--dry-run]
 *   npx tsx scripts/compute-place-scores.ts --golden-slugs=slug1,slug2 [--dry-run]
 *
 * --place-slugs: resolve via places table (places.slug → google_place_id → golden_records).
 * --golden-slugs: filter golden_records by golden_records.slug directly.
 * Outputs: updates DB (unless --dry-run), report with requested/resolved/missing, validationDebug.
 */

import { db } from '@/lib/db';
import { computeEnergyScore, computeFormalityScore } from '@/lib/scoring';
import type { EnergyScoreInputs } from '@/lib/scoring';
import type { FormalityScoreInputs } from '@/lib/scoring';
import * as fs from 'fs';
import * as path from 'path';

const VALIDATION_SLUGS = ['dunsmoor', 'buvons', 'dan-tanas', 'covell'];
const REPORT_DIR = path.join(process.cwd(), 'tmp');

type GoldenRecordRow = {
  canonical_id: string;
  slug: string;
  name: string;
  description: string | null;
  about_copy: string | null;
  menu_raw_text: string | null;
  service_model: string | null;
  price_tier: string | null;
  category: string | null;
  google_places_attributes: unknown;
};

function parseAttrs(attrs: unknown): { liveMusic?: boolean; goodForGroups?: boolean; reservable?: boolean } {
  if (!attrs || typeof attrs !== 'object') return {};
  const o = attrs as Record<string, unknown>;
  return {
    liveMusic: o.liveMusic === true || o.live_music === true,
    goodForGroups: o.goodForGroups === true || o.good_for_groups === true,
    reservable: o.reservable === true,
  };
}

/** Bar-forward proxy: category/types suggest bar-first (wine bar, cocktail bar, bar). */
function isBarForward(gr: { category?: string | null; google_places_attributes?: unknown }): boolean {
  const cat = (gr.category ?? '').toLowerCase();
  if (/bar|wine bar|cocktail|pub/.test(cat)) return true;
  const attrs = gr.google_places_attributes as Record<string, unknown> | null;
  if (attrs && typeof attrs === 'object' && (attrs.types as string[] | undefined)?.some((t: string) => /bar|cafe|night_club/.test(t))) return true;
  return false;
}

function buildCoverageAboutText(gr: {
  description?: string | null;
  about_copy?: string | null;
  menu_raw_text?: string | null;
}): string {
  const parts = [gr.description, gr.about_copy].filter(Boolean) as string[];
  return parts.join('\n\n');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const placeSlugsArg = args.find((a) => a.startsWith('--place-slugs='));
  const goldenSlugsArg = args.find((a) => a.startsWith('--golden-slugs='));

  const placeSlugList = placeSlugsArg ? placeSlugsArg.split('=')[1]?.split(',').map((s) => s.trim()).filter(Boolean) : null;
  const goldenSlugList = goldenSlugsArg ? goldenSlugsArg.split('=')[1]?.split(',').map((s) => s.trim()).filter(Boolean) : null;

  console.log('Energy + Formality scoring — backfill');
  console.log(dryRun ? '(dry-run: no DB writes)\n' : '');

  let records: GoldenRecordRow[];
  let requestedSlugs: string[] = [];
  let missingSlugs: string[] = [];
  /** When using --place-slugs: canonical_id -> the place slug that resolved to this golden record (for validationDebug keying) */
  const canonicalIdToRequestedSlug = new Map<string, string>();

  if (placeSlugList?.length) {
    requestedSlugs = placeSlugList;
    const places = await db.entities.findMany({
      where: { slug: { in: placeSlugList } },
      select: { slug: true, googlePlaceId: true },
    });
    const googleIds = [...new Set(places.map((p) => p.googlePlaceId).filter((id): id is string => id != null))];
    if (googleIds.length === 0) {
      records = [];
      missingSlugs = placeSlugList;
    } else {
      const golden = await db.golden_records.findMany({
        where: { google_place_id: { in: googleIds } },
        select: {
          canonical_id: true,
          slug: true,
          name: true,
          description: true,
          about_copy: true,
          menu_raw_text: true,
          service_model: true,
          price_tier: true,
          category: true,
          google_places_attributes: true,
          google_place_id: true,
        },
      });
      const googleIdToPlaceSlug = new Map<string, string>();
      for (const p of places) {
        if (p.googlePlaceId) googleIdToPlaceSlug.set(p.googlePlaceId, p.slug);
      }
      for (const gr of golden) {
        const placeSlug = gr.google_place_id ? googleIdToPlaceSlug.get(gr.google_place_id) : undefined;
        if (placeSlug) canonicalIdToRequestedSlug.set(gr.canonical_id, placeSlug);
      }
      records = golden.map(({ google_place_id: _g, ...rest }) => rest);
      const resolvedPlaceSlugs = new Set(canonicalIdToRequestedSlug.values());
      missingSlugs = placeSlugList.filter((s) => !resolvedPlaceSlugs.has(s));
    }
    console.log(`Requested slugs (place): ${requestedSlugs.length}`);
    console.log(`Resolved to golden_records: ${records.length}`);
    if (missingSlugs.length > 0) {
      console.log(`Missing slugs: ${missingSlugs.join(', ')}`);
    }
    console.log('');
  } else if (goldenSlugList?.length) {
    requestedSlugs = goldenSlugList;
    records = await db.golden_records.findMany({
      where: { slug: { in: goldenSlugList } },
      select: {
        canonical_id: true,
        slug: true,
        name: true,
        description: true,
        about_copy: true,
        menu_raw_text: true,
        service_model: true,
        price_tier: true,
        category: true,
        google_places_attributes: true,
      },
    });
    missingSlugs = goldenSlugList.filter((s) => !records.some((r) => r.slug === s));
    console.log(`Requested slugs (golden): ${requestedSlugs.length}`);
    console.log(`Resolved to golden_records: ${records.length}`);
    if (missingSlugs.length > 0) {
      console.log(`Missing slugs: ${missingSlugs.join(', ')}`);
    }
    console.log('');
  } else {
    records = await db.golden_records.findMany({
      where: { lifecycle_status: 'ACTIVE' },
      select: {
        canonical_id: true,
        slug: true,
        name: true,
        description: true,
        about_copy: true,
        menu_raw_text: true,
        service_model: true,
        price_tier: true,
        category: true,
        google_places_attributes: true,
      },
    });
  }

  console.log(`Processing ${records.length} golden record(s).\n`);

  const now = new Date();
  const energyScores: number[] = [];
  const formalityScores: number[] = [];
  const energyConf: number[] = [];
  const formalityConf: number[] = [];
  let displayableEnergy = 0;
  let displayableFormality = 0;
  const validationDebug: Record<string, { energy: unknown; formality: unknown }> = {};
  const validationKey = (gr: GoldenRecordRow) => canonicalIdToRequestedSlug.get(gr.canonical_id) ?? gr.slug;
  const isValidationSet = (slug: string) => VALIDATION_SLUGS.includes(slug);

  for (const gr of records) {
    const coverageAboutText = buildCoverageAboutText(gr);
    const attrs = parseAttrs(gr.google_places_attributes);

    const energyInputs: EnergyScoreInputs = {
      popularityComponent: null,
      coverageAboutText: coverageAboutText || undefined,
      liveMusic: attrs.liveMusic,
      goodForGroups: attrs.goodForGroups,
      barForward: isBarForward(gr),
    };

    const formalityInputs: FormalityScoreInputs = {
      service_model: gr.service_model ?? undefined,
      price_tier: gr.price_tier ?? undefined,
      reservable: attrs.reservable,
      coverageAboutText: coverageAboutText || undefined,
    };

    const energyResult = computeEnergyScore(energyInputs);
    const formalityResult = computeFormalityScore(formalityInputs);

    energyScores.push(energyResult.score);
    formalityScores.push(formalityResult.score);
    energyConf.push(energyResult.confidence);
    formalityConf.push(formalityResult.confidence);
    if (energyResult.confidence >= 0.5) displayableEnergy += 1;
    if (formalityResult.confidence >= 0.5) displayableFormality += 1;

    const key = validationKey(gr);
    if (isValidationSet(key)) {
      validationDebug[key] = { energy: energyResult.debug, formality: formalityResult.debug };
    }

    if (!dryRun) {
      await db.golden_records.update({
        where: { canonical_id: gr.canonical_id },
        data: {
          energy_score: energyResult.score,
          energy_confidence: energyResult.confidence,
          energy_version: energyResult.version,
          energy_computed_at: now,
          formality_score: formalityResult.score,
          formality_confidence: formalityResult.confidence,
          formality_version: formalityResult.version,
          formality_computed_at: now,
        },
      });
    }
  }

  // Histogram helper (bins of 10)
  function histo(values: number[], min = 0, max = 100): Record<string, number> {
    const bins: Record<string, number> = {};
    for (let b = min; b < max; b += 10) {
      const key = `${b}-${b + 9}`;
      bins[key] = values.filter((v) => v >= b && v < b + 10).length;
    }
    bins[`${max}`] = values.filter((v) => v === max).length;
    return bins;
  }

  const energyHisto = histo(energyScores);
  const formalityHisto = histo(formalityScores);

  function pct(values: number[], p: number): number {
    const s = [...values].sort((a, b) => a - b);
    const i = Math.floor((p / 100) * (s.length - 1));
    return s[i] ?? 0;
  }

  const report = {
    generatedAt: now.toISOString(),
    dryRun,
    requestedSlugs: requestedSlugs.length ? requestedSlugs : undefined,
    resolvedToGoldenRecords: records.length,
    missingSlugs: missingSlugs.length ? missingSlugs : undefined,
    totalPlaces: records.length,
    energy: {
      histogram: energyHisto,
      confidenceHistogram: histo(energyConf.map((c) => Math.round(c * 100)), 0, 100),
      displayableCount: displayableEnergy,
      displayablePct: records.length ? Math.round((displayableEnergy / records.length) * 100) : 0,
      avg: energyScores.length ? Math.round(energyScores.reduce((a, b) => a + b, 0) / energyScores.length) : 0,
      median: pct(energyScores, 50),
      p10: pct(energyScores, 10),
      p90: pct(energyScores, 90),
    },
    formality: {
      histogram: formalityHisto,
      confidenceHistogram: histo(formalityConf.map((c) => Math.round(c * 100)), 0, 100),
      displayableCount: displayableFormality,
      displayablePct: records.length ? Math.round((displayableFormality / records.length) * 100) : 0,
      avg: formalityScores.length ? Math.round(formalityScores.reduce((a, b) => a + b, 0) / formalityScores.length) : 0,
      median: pct(formalityScores, 50),
      p10: pct(formalityScores, 10),
      p90: pct(formalityScores, 90),
    },
    validationDebug,
  };

  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  const reportPath = path.join(REPORT_DIR, `place_scores_report_${now.toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Report written: ${reportPath}\n`);

  console.log('Energy  — histogram:', energyHisto);
  console.log('Energy  — displayable (conf≥0.5):', displayableEnergy, `(${report.energy.displayablePct}%)`);
  console.log('Energy  — avg / median / p10–p90:', report.energy.avg, '/', report.energy.median, '/', report.energy.p10, '–', report.energy.p90);
  console.log('');
  console.log('Formality — histogram:', formalityHisto);
  console.log('Formality — displayable (conf≥0.5):', displayableFormality, `(${report.formality.displayablePct}%)`);
  console.log('Formality — avg / median / p10–p90:', report.formality.avg, '/', report.formality.median, '/', report.formality.p10, '–', report.formality.p90);
  console.log('');

  if (Object.keys(validationDebug).length > 0) {
    console.log('Validation set (4-place) debug:');
    console.log(JSON.stringify(validationDebug, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
