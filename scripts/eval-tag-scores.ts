/**
 * Evaluation Harness for Tag Scores — CTO Spec §6
 * Offline evaluation against curated gold sets.
 *
 * Usage:
 *   npx tsx scripts/eval-tag-scores.ts --gold=data/gold-tag-scores.json --tag-version=tags_v1
 *   npx tsx scripts/eval-tag-scores.ts --gold=data/gold-tag-scores.json --threshold=0.5
 *
 * Gold Set Format (JSON):
 * [
 *   { "place_id": "uuid", "place_slug": "optional", "tag": "cozy", "label": 1, "bucket": "strong_yes", "notes": "optional" },
 *   { "place_id": "uuid", "tag": "date_night", "label": 0, "bucket": "strong_no" }
 * ]
 *
 * Or CSV: place_id,tag,label,bucket,notes
 * label: 1 = positive, 0 = negative
 * bucket: strong_yes | strong_no | ambiguous | edge
 *
 * Outputs: precision, recall, F1, coverage, confidence distribution, stability (if previous version available)
 */

import { db } from '@/lib/db';
import { getLaSlugs } from '@/lib/la-scope';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

type TagName = 'cozy' | 'date_night' | 'late_night' | 'after_work' | 'scene';
type Bucket = 'strong_yes' | 'strong_no' | 'ambiguous' | 'edge';

interface GoldRow {
  place_id: string;
  place_slug?: string;
  tag: TagName;
  label: 0 | 1;
  bucket: Bucket;
  notes?: string;
}

interface TagMetrics {
  tag: TagName;
  precision: number;
  recall: number;
  f1: number;
  coverage: number;
  support: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  confidenceDistribution: { p50: number; p90: number };
  /** Operational: % places with place_tag_scores row */
  pipeline_coverage_pct: number;
  /** % places with required linkage (googlePlaceId + matching golden_record) */
  linkage_coverage_pct: number;
  /** % places with required inputs (linkage + coverageAboutText non-empty) */
  input_coverage_pct: number;
  high_confidence_pct: number;
  /** Eligibility: input_coverage_pct >= 60 AND high_confidence_pct >= 60 (among those with input) */
  eligible: boolean;
  stabilityPctShift20: number | null;
  stabilityPctShift25: number | null;
  stabilityPctShift30: number | null;
}

const TAG_COLUMNS: Record<TagName, string> = {
  cozy: 'cozy_score',
  date_night: 'date_night_score',
  late_night: 'late_night_score',
  after_work: 'after_work_score',
  scene: 'scene_score',
};

function loadGoldSet(filePath: string): GoldRow[] {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(abs)) throw new Error(`File not found: ${abs}`);
  const raw = fs.readFileSync(abs, 'utf-8');
  const ext = path.extname(abs).toLowerCase();

  if (ext === '.json') {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : data.rows ?? [];
  }
  if (ext === '.csv') {
    const lines = raw.split('\n').filter((l) => l.trim());
    const header = (lines[0] ?? '').split(',').map((h) => h.trim().toLowerCase());
    const idx = (k: string) => header.indexOf(k);
    const pidIdx = idx('place_id');
    const slugIdx = idx('place_slug');
    const tagIdx = idx('tag');
    const labelIdx = idx('label');
    const bucketIdx = idx('bucket');
    const notesIdx = idx('notes');
    if (tagIdx < 0 || labelIdx < 0 || bucketIdx < 0) {
      throw new Error('CSV must have columns: tag, label, bucket (and place_id or place_slug)');
    }
    return lines.slice(1).map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      const get = (i: number) => (i >= 0 && i < parts.length ? parts[i] ?? '' : '');
      const placeId = pidIdx >= 0 ? get(pidIdx) : '';
      const placeSlug = slugIdx >= 0 ? get(slugIdx) : undefined;
      return {
        place_id: placeId,
        place_slug: placeSlug || undefined,
        tag: (get(tagIdx) || 'cozy') as TagName,
        label: parseInt(get(labelIdx) || '0', 10) === 1 ? 1 : 0,
        bucket: (get(bucketIdx) || 'ambiguous') as Bucket,
        notes: notesIdx >= 0 ? get(notesIdx) || undefined : undefined,
      };
    });
  }
  throw new Error(`Unsupported gold set format: ${ext}`);
}

async function resolvePlaceIds(rows: GoldRow[]): Promise<Map<string, string>> {
  const slugs = [...new Set(rows.map((r) => r.place_slug ?? r.place_id).filter(Boolean))] as string[];
  const ids = [...new Set(rows.map((r) => r.place_id).filter((id) => /^[0-9a-f-]{36}$/i.test(id)))];

  const bySlug = new Map<string, string>();
  const byId = new Map<string, string>();

  if (slugs.length > 0) {
    const placesBySlug = await db.entities.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true },
    });
    for (const p of placesBySlug) {
      bySlug.set(p.slug, p.id);
    }
  }
  if (ids.length > 0) {
    const placesById = await db.entities.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    for (const p of placesById) {
      byId.set(p.id, p.id);
    }
  }

  const out = new Map<string, string>();
  for (const r of rows) {
    const ident = r.place_slug ?? r.place_id;
    const placeId = r.place_slug
      ? bySlug.get(r.place_slug)
      : /^[0-9a-f-]{36}$/i.test(r.place_id)
        ? byId.get(r.place_id)
        : bySlug.get(r.place_id);
    if (placeId && ident) out.set(`${ident}:${r.tag}`, placeId);
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const goldArg = args.find((a) => a.startsWith('--gold='));
  const tagVersionArg = args.find((a) => a.startsWith('--tag-version='));
  const thresholdArg = args.find((a) => a.startsWith('--threshold='));
  const laOnly = args.includes('--la-only');
  const limitIdx = args.indexOf('--limit');
  const limitArg = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null;

  if (laOnly && process.env.SAIKO_DB_FROM_WRAPPER !== '1') {
    console.error('--la-only requires SAIKO_DB_FROM_WRAPPER=1. Use db-neon.sh or db-local.sh.');
    process.exit(1);
  }

  const DEFAULT_GOLD = 'data/gold_sets/vibe_tags_v1.csv';
  const goldPath = goldArg?.split('=')[1] ?? DEFAULT_GOLD;
  const tagVersion = tagVersionArg?.split('=')[1] ?? 'tags_v1';
  const threshold = parseFloat(thresholdArg?.split('=')[1] ?? '0.5');

  const absPath = path.isAbsolute(goldPath) ? goldPath : path.join(process.cwd(), goldPath);
  if (!fs.existsSync(absPath)) {
    console.error(`Gold set file not found: ${absPath}`);
    console.error('Usage: npx tsx scripts/eval-tag-scores.ts [--gold=data/gold_sets/vibe_tags_v1.csv] [--tag-version=tags_v1] [--threshold=0.5]');
    console.error('Canonical path: data/gold_sets/vibe_tags_v1.csv (CSV). See data/gold_sets/vibe_tags_v1.example.csv');
    process.exit(1);
  }

  let gold: GoldRow[];
  try {
    gold = loadGoldSet(absPath);
  } catch (err) {
    console.error('Gold set load error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
  if (gold.length === 0) {
    console.error('Gold set is empty.');
    process.exit(1);
  }

  const byTagAndLabel = new Map<string, { label0: number; label1: number }>();
  for (const r of gold) {
    const key = r.tag;
    const t = byTagAndLabel.get(key) ?? { label0: 0, label1: 0 };
    if (r.label === 1) t.label1++;
    else t.label0++;
    byTagAndLabel.set(key, t);
  }
  const goldSetSanity: Record<string, { label0: number; label1: number; insufficient: boolean }> = {};
  for (const [tag, counts] of byTagAndLabel.entries()) {
    goldSetSanity[tag] = {
      label0: counts.label0,
      label1: counts.label1,
      insufficient: counts.label0 < 15 || counts.label1 < 15,
    };
  }

  let goldForEval: GoldRow[];
  let scopeCount: number;

  if (laOnly) {
    const laSlugs = await getLaSlugs();
    const laSlugSet = new Set(laSlugs.map((s) => s.trim().toLowerCase()));
    goldForEval = gold.filter((r) => {
      const slug = (r.place_slug ?? r.place_id ?? '').trim();
      return slug && laSlugSet.has(slug.toLowerCase());
    });
    scopeCount = laSlugs.length;
    console.log(`[SCOPE] laOnly=${laOnly} ids=${scopeCount} limit=${limitArg ?? 'none'}`);
    if (goldForEval.length < 1) {
      console.error(
        'No gold rows in LA scope (by place_slug). Run: npm run gold:la:neon -- --gold=<path> --out=<path>'
      );
      console.error(`LA slugs (v_places_la_bbox_golden): ${laSlugs.join(', ')}`);
      process.exit(1);
    }
  } else {
    goldForEval = gold;
    scopeCount = 0;
    console.log(`[SCOPE] laOnly=${laOnly} ids=${scopeCount} limit=${limitArg ?? 'none'}`);
  }

  const placeIdMap = await resolvePlaceIds(goldForEval);

  const [
    allScores,
    totalPlaces,
    placesWithScores,
    linkageResult,
    inputCoverageResult,
    inputCoverageWithHighConfResult,
  ] = await Promise.all([
    db.place_tag_scores.findMany({ where: { version: tagVersion } }),
    db.entities.count(),
    db.place_tag_scores.count({ where: { version: tagVersion } }),
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT p.id)::bigint as count
      FROM places p
      INNER JOIN golden_records g ON g.google_place_id = p.google_place_id
      WHERE p.google_place_id IS NOT NULL
    `,
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT p.id)::bigint as count
      FROM places p
      INNER JOIN golden_records g ON g.google_place_id = p.google_place_id
      WHERE p.google_place_id IS NOT NULL
        AND (TRIM(COALESCE(g.description, '')) != '' OR TRIM(COALESCE(g.about_copy, '')) != '')
    `,
    db.$queryRaw<[{ count: bigint }]>(Prisma.sql`
      SELECT COUNT(DISTINCT p.id)::bigint as count
      FROM places p
      INNER JOIN golden_records g ON g.google_place_id = p.google_place_id
      INNER JOIN place_tag_scores pts ON pts.place_id = p.id AND pts.version = ${tagVersion}
      WHERE p.google_place_id IS NOT NULL
        AND (TRIM(COALESCE(g.description, '')) != '' OR TRIM(COALESCE(g.about_copy, '')) != '')
        AND pts.confidence >= 0.6
    `),
  ]);

  const linkageCount = Number(linkageResult[0]?.count ?? 0);
  const inputCoverageCount = Number(inputCoverageResult[0]?.count ?? 0);
  const inputCoverageWithHighConf = Number(inputCoverageWithHighConfResult[0]?.count ?? 0);

  const pipeline_coverage_pct = totalPlaces > 0 ? (placesWithScores / totalPlaces) * 100 : 0;
  const linkage_coverage_pct = totalPlaces > 0 ? (linkageCount / totalPlaces) * 100 : 0;
  const input_coverage_pct = totalPlaces > 0 ? (inputCoverageCount / totalPlaces) * 100 : 0;
  const high_confidence_pct =
    inputCoverageCount > 0 ? (inputCoverageWithHighConf / inputCoverageCount) * 100 : 0;
  const eligible = input_coverage_pct >= 60 && high_confidence_pct >= 60;

  const scoreByPlace = new Map<string, (typeof allScores)[0]>();
  for (const s of allScores) {
    scoreByPlace.set(s.place_id, s);
  }

  const metricsByTag = new Map<TagName, TagMetrics>();

  for (const tag of ['cozy', 'date_night', 'late_night', 'after_work', 'scene'] as TagName[]) {
    const col = TAG_COLUMNS[tag];
    const rows = goldForEval.filter((r) => r.tag === tag);
    const strongRows = rows.filter((r) => r.bucket === 'strong_yes' || r.bucket === 'strong_no');

    let tp = 0,
      fp = 0,
      fn = 0,
      support = 0;
    const confidences: number[] = [];

    for (const r of strongRows) {
      const ident = r.place_slug ?? r.place_id;
      const placeId = ident ? placeIdMap.get(`${ident}:${r.tag}`) : undefined;
      if (!placeId) continue;
      const rec = scoreByPlace.get(placeId);
      const pred = rec ? (rec[col as keyof typeof rec] as number) : null;
      if (pred != null) confidences.push(rec!.confidence ?? 0);

      if (pred == null) {
        if (r.label === 1) fn++;
        continue;
      }
      support++;
      const predPos = pred >= threshold ? 1 : 0;
      if (r.label === 1 && predPos === 1) tp++;
      else if (r.label === 0 && predPos === 1) fp++;
      else if (r.label === 1 && predPos === 0) fn++;
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const coverage = strongRows.length > 0 ? support / strongRows.length : 0;
    const sorted = [...confidences].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
    const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 0;

    metricsByTag.set(tag, {
      tag,
      precision,
      recall,
      f1,
      coverage,
      support,
      truePositives: tp,
      falsePositives: fp,
      falseNegatives: fn,
      confidenceDistribution: { p50, p90 },
      pipeline_coverage_pct,
      linkage_coverage_pct,
      input_coverage_pct,
      high_confidence_pct,
      eligible,
      stabilityPctShift20: null,
      stabilityPctShift25: null,
      stabilityPctShift30: null,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    goldPath,
    tagVersion,
    threshold,
    goldSetSanity,
    metrics: Object.fromEntries(metricsByTag),
    coverageGating: {
      totalPlaces,
      placesWithTagScores: placesWithScores,
      pipeline_coverage_pct,
      linkage_coverage_pct,
      input_coverage_pct,
      placesWithInputCoverageAndHighConfidence: inputCoverageWithHighConf,
      eligible,
    },
  };

  console.log(JSON.stringify(report, null, 2));

  console.log('\n--- Gold set sanity ---');
  for (const [tag, s] of Object.entries(goldSetSanity)) {
    console.log(`${tag}: label=0 (${s.label0}), label=1 (${s.label1})${s.insufficient ? ' [INSUFFICIENT for meaningful metrics]' : ''}`);
  }

  console.log('\n--- Stability thresholds ---');
  const m0 = metricsByTag.get('cozy')!;
  console.log('stabilityPctShift20:', m0.stabilityPctShift20 ?? 'N/A (no previous version)');
  console.log('stabilityPctShift25:', m0.stabilityPctShift25 ?? 'N/A (no previous version)');
  console.log('stabilityPctShift30:', m0.stabilityPctShift30 ?? 'N/A (no previous version)');
  console.log('\n--- Coverage metrics ---');
  const mc = metricsByTag.get('cozy')!;
  console.log('pipeline_coverage_pct:', mc.pipeline_coverage_pct.toFixed(1));
  console.log('linkage_coverage_pct:', mc.linkage_coverage_pct.toFixed(1));
  console.log('input_coverage_pct:', mc.input_coverage_pct.toFixed(1));
  console.log('\n--- Per-tag eligibility (input_coverage + confidence) ---');
  for (const tag of ['cozy', 'date_night', 'late_night', 'after_work', 'scene'] as TagName[]) {
    const m = metricsByTag.get(tag)!;
    console.log(`${tag}: input_coverage_pct=${m.input_coverage_pct.toFixed(1)}%, high_confidence_pct=${m.high_confidence_pct.toFixed(1)}%, eligible=${m.eligible}`);
  }

  const outPath = path.join(process.cwd(), 'tmp', `eval-tag-scores-${Date.now()}.json`);
  if (!fs.existsSync(path.dirname(outPath))) fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log('\nReport written:', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
