/**
 * Admin Intake API
 * POST /api/admin/intake — accept name / GPID / website / partial record,
 * dedup against entities, create CANDIDATE entities for new places.
 *
 * Accepts:
 *   JSON: { name?, googlePlaceId?, website?, instagram?, neighborhood?, source? }
 *   Multipart: { file: CSV, source? }
 *
 * At least one of name or website must be provided. When only website is given,
 * name is derived by fetching the page <title>.
 *
 * CSV columns: Name, Google Place ID, Website, Instagram Handle, Neighborhood
 *
 * Dedup order:
 *   1. GPID exact match → return existing
 *   2. Website URL domain match → return existing
 *   3. Slug exact match
 *   4. If website was provided but not matched above → skip fuzzy → create
 *      (website is a strong unique identifier; avoid false-ambiguous)
 *   5. Fuzzy name (Jaro-Winkler ≥ 0.90 on normalized names) → return match
 *   6. Partial match (0.70–0.90) → return ambiguous + candidates
 *   7. No match → create CANDIDATE entity
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jaroWinklerSimilarity, normalizeName } from '@/lib/similarity';
import slugify from 'slugify';
import { randomUUID } from 'crypto';

const AUTO_MATCH_THRESHOLD = 0.90;
const AMBIGUOUS_THRESHOLD = 0.70;

interface IntakeInput {
  name?: string; // optional if website provided — derived from page <title> when absent
  googlePlaceId?: string;
  website?: string;
  instagram?: string;
  neighborhood?: string;
  source?: string;
  forceCreate?: boolean; // skip fuzzy dedup — use when admin confirms it's a new distinct place
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract the bare domain for website matching (strips www., protocol, path) */
function websiteDomain(url: string): string {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

/** Fetch page <title> to derive a place name when only a website is provided */
async function fetchNameFromWebsite(url: string): Promise<string | null> {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const res = await fetch(normalized, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SaikoMaps/1.0)' },
      signal: AbortSignal.timeout(6000),
    });
    const html = await res.text();
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (match) {
      // Strip common suffixes like " | Restaurant Name" or " - City Guide"
      return match[1].trim().replace(/\s*[-|·–—|]\s*.+$/, '').trim() || null;
    }
  } catch {
    // timeout or network error — fall through to domain fallback
  }
  // Fallback: humanise the domain
  try {
    const domain = websiteDomain(url);
    return domain.split('.')[0].replace(/-/g, ' ');
  } catch {
    return null;
  }
}

type IntakeOutcome = 'created' | 'matched' | 'ambiguous';

interface IntakeResult {
  input: string;
  outcome: IntakeOutcome;
  entity?: { id: string; slug: string; name: string; status: string; googlePlaceId?: string | null };
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
  let { name, googlePlaceId, website, instagram, neighborhood, source, forceCreate } = input;

  // Resolve name when only website was provided
  if (!name?.trim() && website) {
    const derived = await fetchNameFromWebsite(website);
    name = derived || websiteDomain(website);
  }
  const resolvedName = name?.trim() || '';
  if (!resolvedName) {
    throw new Error('Could not determine a name — provide name or a reachable website URL');
  }

  const displayInput = resolvedName;

  // 1. GPID exact match
  if (googlePlaceId) {
    const byGpid = await db.entities.findUnique({
      where: { googlePlaceId },
      select: { id: true, slug: true, name: true, status: true, googlePlaceId: true },
    });
    if (byGpid) {
      return { input: displayInput, outcome: 'matched', entity: { ...byGpid, status: byGpid.status as string } };
    }
  }

  // 2. Website domain match — check if any entity already uses this website
  const websiteMatched = website ? await (async () => {
    const domain = websiteDomain(website);
    const all = await db.entities.findMany({
      where: { website: { not: null } },
      select: { id: true, slug: true, name: true, status: true, googlePlaceId: true, website: true },
    });
    return all.find((e) => e.website && websiteDomain(e.website) === domain) ?? null;
  })() : null;

  if (websiteMatched) {
    return {
      input: displayInput,
      outcome: 'matched',
      entity: { id: websiteMatched.id, slug: websiteMatched.slug, name: websiteMatched.name, status: websiteMatched.status as string, googlePlaceId: websiteMatched.googlePlaceId },
    };
  }

  // 2b. Instagram handle match
  if (instagram) {
    const cleanHandle = instagram.replace(/^@/, '').toLowerCase();
    const allWithIg = await db.entities.findMany({
      where: { instagram: { not: null } },
      select: { id: true, slug: true, name: true, status: true, googlePlaceId: true, instagram: true },
    });
    const igMatch = allWithIg.find(
      (e) => e.instagram && e.instagram.replace(/^@/, '').toLowerCase() === cleanHandle
    );
    if (igMatch) {
      return {
        input: displayInput,
        outcome: 'matched',
        entity: { id: igMatch.id, slug: igMatch.slug, name: igMatch.name, status: igMatch.status as string, googlePlaceId: igMatch.googlePlaceId },
      };
    }
  }

  // 3. Slug exact match
  const candidateSlug = slugify(resolvedName, { lower: true, strict: true });
  const bySlug = await db.entities.findUnique({
    where: { slug: candidateSlug },
    select: { id: true, slug: true, name: true, status: true, googlePlaceId: true },
  });
  if (bySlug) {
    return { input: displayInput, outcome: 'matched', entity: { ...bySlug, status: bySlug.status as string } };
  }

  // Helper: create a new CANDIDATE entity
  const createCandidate = async () => {
    const slug = await generateUniqueSlug(resolvedName, neighborhood);
    const entity = await db.entities.create({
      data: {
        id: randomUUID(),
        slug,
        name: resolvedName,
        googlePlaceId: googlePlaceId || undefined,
        website: website || undefined,
        instagram: instagram || undefined,
        neighborhood: neighborhood || undefined,
        primaryVertical: 'EAT',
        status: 'CANDIDATE',
        editorialSources: source ? { sources: [source] } : undefined,
      },
      select: { id: true, slug: true, name: true, status: true, googlePlaceId: true },
    });
    return { input: displayInput, outcome: 'created' as const, entity: { ...entity, status: entity.status as string } };
  };

  // 4. forceCreate — admin confirmed it's distinct, skip fuzzy
  if (forceCreate) return createCandidate();

  // 5. Website provided but not matched above — it's a unique signal; skip fuzzy
  //    to avoid false-ambiguous on name alone
  if (website) return createCandidate();

  // 5b. Instagram provided but not matched above — same rationale as website
  if (instagram) return createCandidate();

  // 6 & 7. Fuzzy name scan (only when no strong identifier to anchor on)
  const allEntities = await db.entities.findMany({
    select: { id: true, slug: true, name: true, status: true, googlePlaceId: true },
  });

  const normalizedInput = normalizeName(resolvedName);
  let bestScore = 0;
  let bestMatch: (typeof allEntities)[0] | null = null;
  const nearMatches: Array<{ id: string; slug: string; name: string; score: number }> = [];

  for (const entity of allEntities) {
    const score = jaroWinklerSimilarity(normalizedInput, normalizeName(entity.name));
    if (score >= AUTO_MATCH_THRESHOLD) {
      if (score > bestScore) { bestScore = score; bestMatch = entity; }
    } else if (score >= AMBIGUOUS_THRESHOLD) {
      nearMatches.push({ id: entity.id, slug: entity.slug, name: entity.name, score });
    }
  }

  if (bestMatch) {
    return {
      input: displayInput,
      outcome: 'matched',
      entity: { id: bestMatch.id, slug: bestMatch.slug, name: bestMatch.name, status: bestMatch.status as string, googlePlaceId: bestMatch.googlePlaceId },
    };
  }

  if (nearMatches.length > 0) {
    return {
      input: displayInput,
      outcome: 'ambiguous',
      candidates: nearMatches.sort((a, b) => b.score - a.score).slice(0, 5).map(({ id, slug, name: n }) => ({ id, slug, name: n })),
    };
  }

  return createCandidate();
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

    const name = row['Name'] || row['Place Name'] || row['name'] || row['place_name'] || row['place'] || row['Place'] || row['Title'] || row['title'] || row['Location'] || row['location'] || '';
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
      // Must have at least name or website
      if (!input.name?.trim() && !input.website?.trim()) continue;
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
