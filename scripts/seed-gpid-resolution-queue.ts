#!/usr/bin/env npx ts-node
/**
 * Seed GPID Resolution Queue from dryrun CSV
 * Populates gpid_resolution_queue from data/logs/gpid_resolution_dryrun.csv
 * Only inserts unresolved rows: status = AMBIGUOUS | NO_MATCH | ERROR
 *
 * Usage:
 *   npx ts-node scripts/seed-gpid-resolution-queue.ts [path-to-csv]
 *
 * Default CSV: data/logs/gpid_resolution_dryrun.csv
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

const prisma = new PrismaClient();

const UNRESOLVED_STATUSES = ['AMBIGUOUS', 'NO_MATCH', 'ERROR'];

interface CandidateFromCsv {
  google_place_id?: string;
  name?: string;
  formatted_address?: string;
  lat?: number;
  lng?: number;
  types?: string[];
  business_status?: string;
}

interface CsvRow {
  db_id: string;
  db_name: string;
  clean_name: string;
  db_lat: string;
  db_lng: string;
  db_google_place_id: string;
  resolved_google_place_id: string;
  google_name: string;
  match_score: string;
  distance_meters: string;
  confidence: string;
  source: string;
  num_candidates: string;
  notes: string;
  status: string;
  reason: string;
  n_text_results: string;
  n_nearby_results: string;
  candidates_json?: string;
}

function parseCsv(content: string): CsvRow[] {
  const result = Papa.parse<CsvRow>(content, { header: true, skipEmptyLines: true });
  return result.data ?? [];
}

function mapResolverStatus(s: string): 'MATCH' | 'AMBIGUOUS' | 'NO_MATCH' | 'ERROR' {
  if (s === 'MATCH') return 'MATCH';
  if (s === 'AMBIGUOUS') return 'AMBIGUOUS';
  if (s === 'NO_MATCH') return 'NO_MATCH';
  return 'ERROR';
}

async function main() {
  const csvPath = process.argv[2] ?? path.join(process.cwd(), 'data/logs/gpid_resolution_dryrun.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(1);
  }
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(content);
  const unresolved = rows.filter((r) => UNRESOLVED_STATUSES.includes(r.status));
  console.log(`Total rows: ${rows.length}, Unresolved: ${unresolved.length}`);

  const runId = `seed-${new Date().toISOString().replace(/[:.]/g, '-')}`;

  let inserted = 0;
  let skipped = 0;

  for (const row of unresolved) {
    const placeId = row.db_id;
    const resolverStatus = mapResolverStatus(row.status);
    const reasonCode = row.reason || null;
    const similarityScore = row.match_score ? parseFloat(row.match_score) : null;
    const candidateGpid = row.resolved_google_place_id?.trim() || null;
    let candidatesJson: { candidates?: CandidateFromCsv[]; num_candidates: number; google_name?: string; n_text_results?: number; n_nearby_results?: number; notes?: string; source?: string } = {
      num_candidates: parseInt(row.num_candidates, 10) || 0,
      google_name: row.google_name || null,
      n_text_results: parseInt(row.n_text_results, 10) || 0,
      n_nearby_results: parseInt(row.n_nearby_results, 10) || 0,
      notes: row.notes || null,
      source: row.source || null,
    };
    if (row.candidates_json?.trim()) {
      try {
        const parsed = JSON.parse(row.candidates_json) as CandidateFromCsv[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          candidatesJson = { ...candidatesJson, candidates: parsed, num_candidates: parsed.length };
        }
      } catch {
        // keep legacy structure if parse fails
      }
    }

    try {
      const existing = await prisma.gpid_resolution_queue.findFirst({
        where: { entityId: placeId, human_status: 'PENDING' },
      });
      if (existing) {
        skipped++;
        continue;
      }

      await prisma.gpid_resolution_queue.create({
        data: {
          entityId: placeId,
          candidate_gpid: candidateGpid,
          resolver_status: resolverStatus,
          reason_code: reasonCode,
          similarity_score: similarityScore,
          candidates_json: candidatesJson,
          source_run_id: runId,
        },
      });
      inserted++;
    } catch (e) {
      console.error(`Failed to insert ${placeId}:`, e);
    }
  }

  console.log(`Inserted: ${inserted}, Skipped (already in queue): ${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
