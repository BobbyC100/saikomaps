/**
 * Admin Intake API
 * POST /api/admin/intake — accept name / GPID / partial record, dedup against entities,
 * create CANDIDATE entities for new places.
 *
 * Accepts:
 *   JSON: { name, googlePlaceId?, website?, instagram?, neighborhood?, source? }
 *   Multipart: { file: CSV, source? }
 *
 * CSV columns: Name, Google Place ID, Website, Instagram Handle, Neighborhood
 *
 * Dedup order:
 *   1. GPID exact match → return existing
 *   2. Slug exact match
 *   3. Fuzzy name (Jaro-Winkler ≥ 0.90 on normalized names) → return match
 *   4. Partial match (0.70–0.90) → return ambiguous + candidates
 *   5. No match → create CANDIDATE entity
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jaroWinklerSimilarity, normalizeName } from '@/lib/similarity';
import slugify from 'slugify';
import { randomUUID } from 'crypto';

const AUTO_MATCH_THRESHOLD = 0.90;
const AMBIGUOUS_THRESHOLD = 0.70;

interface IntakeInput {
  name: string;
  googlePlaceId?: string;
  website?: string;
  instagram?: string;
  neighborhood?: string;
  source?: string;
}

type IntakeOutcome = 'created' | 'matched' | 'ambiguous';

interface IntakeResult {
  input: string;
  outcome: IntakeOutcome;
  entity?: { id: string; slug: string; name: string; status: string };
  candidates?: Array<{ id: string; slug: string; name: string }>;
}

async function generateUniqueSlug(name: string, neighborhood?: string): Promise<string> {
  let base = slugify(name, { lower: true, strict: true });
  if (neighborhood) {
    base = `${base}-${slugify(neighborhood, { lower: true, strict: true })}`;
  }
  let slug = base;
  let counter = 2;
  while (true) {
    const existing = await db.entities.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

async function processOne(input: IntakeInput): Promise<IntakeResult> {
  const { name, googlePlaceId, website, instagram, neighborhood, source } = input;

  // 1. GPID exact match
  if (googlePlaceId) {
    const byGpid = await db.entities.findUnique({
      where: { googlePlaceId },
      select: { id: true, slug: true, name: true, status: true },
    });
    if (byGpid) {
      return {
        input: name,
        outcome: 'matched',
        entity: { ...byGpid, status: byGpid.status as string },
      };
    }
  }

  // 2. Slug exact match
  const candidateSlug = slugify(name, { lower: true, strict: true });
  const bySlug = await db.entities.findUnique({
    where: { slug: candidateSlug },
    select: { id: true, slug: true, name: true, status: true },
  });
  if (bySlug) {
    return {
      input: name,
      outcome: 'matched',
      entity: { ...bySlug, status: bySlug.status as string },
    };
  }

  // 3 & 4. Fuzzy name scan (load all names — acceptable at current LA-area scale)
  const allEntities = await db.entities.findMany({
    select: { id: true, slug: true, name: true, status: true },
  });

  const normalizedInput = normalizeName(name);
  let bestScore = 0;
  let bestMatch: (typeof allEntities)[0] | null = null;
  const nearMatches: Array<{ id: string; slug: string; name: string; score: number }> = [];

  for (const entity of allEntities) {
    const score = jaroWinklerSimilarity(normalizedInput, normalizeName(entity.name));
    if (score >= AUTO_MATCH_THRESHOLD) {
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entity;
      }
    } else if (score >= AMBIGUOUS_THRESHOLD) {
      nearMatches.push({ id: entity.id, slug: entity.slug, name: entity.name, score });
    }
  }

  if (bestMatch) {
    return {
      input: name,
      outcome: 'matched',
      entity: { id: bestMatch.id, slug: bestMatch.slug, name: bestMatch.name, status: bestMatch.status as string },
    };
  }

  if (nearMatches.length > 0) {
    return {
      input: name,
      outcome: 'ambiguous',
      candidates: nearMatches
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(({ id, slug, name: n }) => ({ id, slug, name: n })),
    };
  }

  // 5. New entity — create as CANDIDATE
  const slug = await generateUniqueSlug(name, neighborhood);
  const entity = await db.entities.create({
    data: {
      id: randomUUID(),
      slug,
      name,
      googlePlaceId: googlePlaceId || undefined,
      website: website || undefined,
      instagram: instagram || undefined,
      neighborhood: neighborhood || undefined,
      primary_vertical: 'EAT',
      status: 'CANDIDATE',
      editorialSources: source ? { sources: [source] } : undefined,
    },
    select: { id: true, slug: true, name: true, status: true },
  });

  return {
    input: name,
    outcome: 'created',
    entity: { ...entity, status: entity.status as string },
  };
}

function parseCSV(text: string): IntakeInput[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const inputs: IntakeInput[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    if (!values[0]) continue;
    const row: Record<string, string> = {};
    header.forEach((col, idx) => { row[col] = values[idx] || ''; });

    const name = row['Name'] || row['Place Name'] || row['name'] || '';
    if (!name) continue;

    inputs.push({
      name,
      googlePlaceId: row['Google Place ID'] || row['google_place_id'] || undefined,
      website: row['Website'] || row['website'] || undefined,
      instagram: row['Instagram Handle'] || row['Instagram'] || row['instagram'] || undefined,
      neighborhood: row['Neighborhood'] || row['neighborhood'] || undefined,
    });
  }

  return inputs;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let inputs: IntakeInput[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const source = (formData.get('source') as string) || undefined;
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      const text = await file.text();
      inputs = parseCSV(text).map((r) => ({ ...r, source }));
    } else {
      const body = await request.json();
      if (Array.isArray(body)) {
        inputs = body;
      } else {
        inputs = [body];
      }
    }

    if (inputs.length === 0) {
      return NextResponse.json({ error: 'No valid inputs' }, { status: 400 });
    }

    const results: IntakeResult[] = [];
    for (const input of inputs) {
      if (!input.name?.trim()) continue;
      const result = await processOne(input);
      results.push(result);
    }

    const summary = {
      total: results.length,
      created: results.filter((r) => r.outcome === 'created').length,
      matched: results.filter((r) => r.outcome === 'matched').length,
      ambiguous: results.filter((r) => r.outcome === 'ambiguous').length,
    };

    return NextResponse.json({ results, summary });
  } catch (error: any) {
    console.error('[Intake API] Error:', error);
    return NextResponse.json({ error: 'Intake failed', message: error.message }, { status: 500 });
  }
}
